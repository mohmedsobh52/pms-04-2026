import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import LZString from "https://esm.sh/lz-string@1.5.0";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

function decompressFromBase64(input: string): string {
  if (!input) return '';
  try {
    return LZString.decompressFromBase64(input) || '';
  } catch (e) {
    console.error('Decompression failed:', e);
    return '';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Generate jitter for backoff (±10%)
const jitter = (baseMs: number) => {
  const variance = baseMs * 0.1;
  return baseMs + (Math.random() * variance * 2 - variance);
};

// STRONG exponential backoff for Job Queue: 15s, 30s, 60s, 90s, 120s
// Longer waits in background since user isn't actively waiting
const getBackoffDelay = (attempt: number): number => {
  const delays = [15000, 30000, 60000, 90000, 120000];
  const baseDelay = delays[Math.min(attempt - 1, delays.length - 1)];
  return jitter(baseDelay);
};

// Detect if text is primarily Arabic
const isArabicText = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const arabicCount = (text.match(arabicPattern) || []).length;
  return arabicCount > text.length * 0.3;
};

// Split text respecting Arabic punctuation
const splitIntoChunks = (text: string, chunkSize: number = 30000, overlapSize: number = 500): string[] => {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;
  const isArabic = isArabicText(text);

  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const searchStart = end - 300;
      const searchEnd = Math.min(end + 300, text.length);
      const searchRange = text.slice(searchStart, searchEnd);
      
      // Try to break at natural boundaries
      // Priority: newline > period/semicolon > Arabic punctuation
      const newlineIndex = searchRange.lastIndexOf('\n');
      if (newlineIndex !== -1) {
        end = searchStart + newlineIndex + 1;
      } else {
        const periodIndex = searchRange.lastIndexOf('.');
        const arabicSemiIndex = searchRange.lastIndexOf('؛');
        const arabicCommaIndex = searchRange.lastIndexOf('،');
        
        const bestBreak = Math.max(
          periodIndex,
          isArabic ? Math.max(arabicSemiIndex, arabicCommaIndex) : -1
        );
        
        if (bestBreak !== -1) {
          end = searchStart + bestBreak + 1;
        }
      }
    }

    chunks.push(text.slice(start, end));
    start = end - overlapSize;
    if (start >= text.length) break;
  }

  return chunks;
};

const getSupabaseAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Backend configuration missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

async function processJobInBackground(jobId: string, resume: boolean) {
  const supabase = getSupabaseAdminClient();

  console.log(`[Job ${jobId}] Starting processing (resume=${resume})`);

  // Get the job
  const { data: job, error: jobError } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error(`[Job ${jobId}] Not found:`, jobError);
    throw new Error('Job not found');
  }

  // Allow resuming failed or stale processing jobs
  const isStaleProcessing = job.status === 'processing' &&
    job.updated_at &&
    (Date.now() - new Date(job.updated_at).getTime()) > 5 * 60 * 1000; // 5 min stale

  const canProcess = job.status === 'pending' ||
    (resume && (job.status === 'failed' || isStaleProcessing));

  if (!canProcess) {
    console.log(`[Job ${jobId}] Cannot process: status=${job.status}, stale=${isStaleProcessing}`);
    return;
  }

  // Determine starting point for resume
  const resumeFromChunk = resume && job.processed_chunks ? job.processed_chunks : 0;
  const existingResults = resume && job.chunk_results ? (job.chunk_results as any[]) : [];

  console.log(`[Job ${jobId}] Resuming from chunk ${resumeFromChunk}, existing results: ${existingResults.length}`);

  // Update job to processing
  await supabase
    .from('analysis_jobs')
    .update({
      status: 'processing',
      started_at: job.started_at || new Date().toISOString(),
      current_step: resumeFromChunk > 0
        ? `استئناف من القطعة ${resumeFromChunk}... / Resuming from chunk ${resumeFromChunk}...`
        : 'جاري فك الضغط... / Decompressing input...',
      progress_percentage: 5,
      error_message: null, // Clear previous error on retry
    })
    .eq('id', jobId);

  // Decompress input text
  let inputText = '';
  if (job.input_text_compressed) {
    inputText = decompressFromBase64(job.input_text_compressed);
  }

  if (!inputText || inputText.length < 50) {
    console.error(`[Job ${jobId}] Invalid input text (length: ${inputText?.length || 0})`);
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: 'النص المدخل غير صالح أو فارغ / Invalid or empty input text',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw new Error('Invalid input text');
  }

  const isArabic = isArabicText(inputText);
  console.log(`[Job ${jobId}] Text length: ${inputText.length}, Arabic: ${isArabic}`);

  // Split into chunks with improved Arabic-aware splitting
  const CHUNK_SIZE = isArabic ? 25000 : 30000; // Smaller chunks for Arabic
  const chunks = splitIntoChunks(inputText, CHUNK_SIZE, 500);

  console.log(`[Job ${jobId}] Split into ${chunks.length} chunks`);

  await supabase
    .from('analysis_jobs')
    .update({
      total_chunks: chunks.length,
      current_step: `معالجة ${chunks.length} قطعة... / Processing ${chunks.length} chunks...`,
      progress_percentage: 10,
    })
    .eq('id', jobId);

  // Process each chunk
  const results: any[] = [...existingResults];
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const openAIKey = Deno.env.get('OPENAI_API_KEY');

  if (!lovableKey && !openAIKey) {
    console.error(`[Job ${jobId}] No AI keys configured (LOVABLE_API_KEY / OPENAI_API_KEY)`);
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: 'لا يوجد مفتاح AI متاح / No AI key configured',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    throw new Error('No AI key configured');
  }

  const maxAttemptsPerChunk = 6; // Strong retry: 6 attempts per chunk with longer backoff

  for (let i = resumeFromChunk; i < chunks.length; i++) {
    const chunk = chunks[i];

    const progressPercent = 10 + Math.round(((i + 1) / chunks.length) * 80);

    console.log(`[Job ${jobId}] Processing chunk ${i + 1}/${chunks.length}`);

    await supabase
      .from('analysis_jobs')
      .update({
        processed_chunks: i,
        current_step: `معالجة القطعة ${i + 1} من ${chunks.length}... / Processing chunk ${i + 1} of ${chunks.length}...`,
        progress_percentage: progressPercent,
      })
      .eq('id', jobId);

    const systemPrompt = isArabic
      ? `أنت مهندس كميات خبير. استخرج بيانات BOQ كـ JSON:
{
  "items": [{
    "itemNumber": "رقم البند",
    "description": "الوصف",
    "unit": "الوحدة",
    "quantity": رقم,
    "unitPrice": رقم,
    "totalPrice": رقم,
    "category": "التصنيف"
  }],
  "summary": {
    "totalItems": رقم,
    "totalValue": رقم,
    "currency": "SAR"
  }
}

**التصنيفات:** أعمال الموقع، الأساسات، الخرسانة، الحديد، البناء، الكهرباء، السباكة، التكييف، التشطيبات، أو عامة.
هذه القطعة ${i + 1} من ${chunks.length}.`
      : `Expert QS: Extract BOQ as JSON:
{
  "items": [{"itemNumber","description","unit","quantity","unitPrice","totalPrice","category"}],
  "summary": {"totalItems","totalValue","currency"}
}

Categories: Site Work, Foundations, Concrete, Steel, Masonry, Electrical, Plumbing, HVAC, Finishes, or General.
Chunk ${i + 1}/${chunks.length}.`;

    // Call AI for analysis with strong backoff on 429/timeouts
    // Fallback to OpenAI if Lovable AI credits exhausted (402)
    let parsedResult: any = null;
    let lastErrText = '';
    let lastErrStatus = 0;
    let useOpenAI = false;

    for (let attempt = 1; attempt <= maxAttemptsPerChunk; attempt++) {
      const providerName = useOpenAI ? 'OpenAI' : 'Lovable AI';
      const stepMsg = isArabic
        ? `طلب ${providerName} (قطعة ${i + 1}/${chunks.length}) - محاولة ${attempt}/${maxAttemptsPerChunk}`
        : `${providerName} request (chunk ${i + 1}/${chunks.length}) - attempt ${attempt}/${maxAttemptsPerChunk}`;

      await supabase
        .from('analysis_jobs')
        .update({ current_step: stepMsg })
        .eq('id', jobId);

      console.log(`[Job ${jobId}] Chunk ${i + 1}, attempt ${attempt}/${maxAttemptsPerChunk} (${providerName})`);

      try {
        const controller = new AbortController();
        const timeoutMs = isArabic ? 180000 : 120000; // 180s for Arabic, 120s otherwise
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Choose endpoint and headers based on provider
        const endpoint = useOpenAI
          ? 'https://api.openai.com/v1/chat/completions'
          : 'https://ai.gateway.lovable.dev/v1/chat/completions';

        const authKey = useOpenAI ? openAIKey : lovableKey;
        if (!authKey) {
          lastErrText = useOpenAI
            ? 'OPENAI_API_KEY is not configured'
            : 'LOVABLE_API_KEY is not configured';
          lastErrStatus = 500;
          clearTimeout(timeoutId);
          break;
        }

        const model = useOpenAI ? 'gpt-4o-mini' : 'google/gemini-2.5-flash';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze this BOQ section:\n\n${chunk}` },
            ],
            temperature: 0.3,
            max_tokens: 8000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastErrText = await response.text();
          lastErrStatus = response.status;

          console.warn(`[Job ${jobId}] Chunk ${i + 1} attempt ${attempt} failed: ${response.status} (${providerName})`);

          // 402 Payment Required from Lovable AI: Switch to OpenAI immediately
          if (response.status === 402 && !useOpenAI && !!openAIKey) {
            console.log(`[Job ${jobId}] Lovable AI credits exhausted, switching to OpenAI`);
            useOpenAI = true;
            // Don't count this as an attempt, retry immediately with OpenAI
            attempt--;
            continue;
          }

          // 429: strong backoff and retry
          if (response.status === 429 && attempt < maxAttemptsPerChunk) {
            const headerRetryAfter = response.headers.get('retry-after');
            const headerDelayMs = headerRetryAfter ? Number(headerRetryAfter) * 1000 : NaN;
            const delay = Number.isFinite(headerDelayMs) && headerDelayMs > 0
              ? headerDelayMs
              : getBackoffDelay(attempt);

            const waitMsg = isArabic
              ? `تجاوز الحد (429). انتظار ${Math.round(delay / 1000)} ثانية...`
              : `Rate limited (429). Waiting ${Math.round(delay / 1000)}s...`;

            console.log(`[Job ${jobId}] ${waitMsg}`);

            await supabase
              .from('analysis_jobs')
              .update({ current_step: waitMsg })
              .eq('id', jobId);

            await sleep(delay);
            continue;
          }

          // 5xx: shorter backoff
          if (response.status >= 500 && attempt < maxAttemptsPerChunk) {
            const delay = Math.min(5000 * attempt, 30000);
            console.log(`[Job ${jobId}] Server error, waiting ${delay}ms...`);
            await sleep(delay);
            continue;
          }

          console.error(`[Job ${jobId}] Chunk ${i} failed:`, response.status, lastErrText.slice(0, 200));
          break;
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || '';

        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            console.log(`[Job ${jobId}] Chunk ${i + 1} parsed successfully (${providerName}): ${parsedResult?.items?.length || 0} items`);
            break;
          }
        } catch (parseErr) {
          console.error(`[Job ${jobId}] Failed to parse chunk ${i} result:`, parseErr);
          if (attempt < 2) continue;
        }

        break;
      } catch (chunkError: any) {
        lastErrText = chunkError?.message || String(chunkError);

        if (chunkError?.name === 'AbortError') {
          console.warn(`[Job ${jobId}] Chunk ${i + 1} timeout (attempt ${attempt})`);
          if (attempt < maxAttemptsPerChunk) {
            const delay = getBackoffDelay(attempt);
            await sleep(delay);
            continue;
          }
        }

        if (attempt < maxAttemptsPerChunk) {
          const delay = Math.min(5000 * attempt, 30000);
          await sleep(delay);
          continue;
        }

        console.error(`[Job ${jobId}] Error processing chunk ${i}:`, chunkError);
      }
    }

    if (parsedResult) {
      results.push(parsedResult);
    } else {
      console.warn(`[Job ${jobId}] Chunk ${i + 1} produced no result (status: ${lastErrStatus})`);

      // If we are still on Lovable AI and hit 402 and have no OpenAI key, fail fast with clear message
      if (lastErrStatus === 402 && !openAIKey) {
        await supabase
          .from('analysis_jobs')
          .update({
            status: 'failed',
            error_message: isArabic
              ? 'انتهى رصيد AI. الرجاء إضافة رصيد/تمويل أو تفعيل مزود بديل.'
              : 'AI credits exhausted. Please add credits/funding or enable a fallback provider.',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        throw new Error('AI credits exhausted');
      }
    }

    // Update chunk results - save progress for potential resume
    await supabase
      .from('analysis_jobs')
      .update({
        processed_chunks: i + 1,
        chunk_results: results,
      })
      .eq('id', jobId);

    if (!parsedResult && lastErrText) {
      const skipMsg = isArabic
        ? `تم تخطي القطعة ${i + 1} بسبب خطأ: ${lastErrText.slice(0, 100)}`
        : `Chunk ${i + 1} skipped due to error: ${lastErrText.slice(0, 100)}`;

      await supabase
        .from('analysis_jobs')
        .update({ current_step: skipMsg })
        .eq('id', jobId);
    }

    // Cooldown between chunks to avoid rate limits
    if (i < chunks.length - 1) {
      const cooldown = isArabic ? 2500 : 1500;
      await sleep(cooldown);
    }
  }

  // Check if we got any results
  if (results.length === 0) {
    console.error(`[Job ${jobId}] No results after processing all chunks`);
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: isArabic
          ? 'فشل تحليل جميع القطع (قد يكون بسبب 402/429). حاول لاحقاً أو قلّل حجم الملف.'
          : 'All chunks failed (possibly due to 402/429). Try later or reduce file size.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw new Error('All chunks failed');
  }

  // Merge results
  const mergeMsg = isArabic ? 'جاري دمج النتائج...' : 'Merging results...';
  await supabase
    .from('analysis_jobs')
    .update({
      current_step: mergeMsg,
      progress_percentage: 95,
    })
    .eq('id', jobId);

  console.log(`[Job ${jobId}] Merging ${results.length} result sets`);

  // Merge all items with deduplication
  const allItems: any[] = [];
  const seenItems = new Set<string>();

  for (const result of results) {
    if (result?.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        const key = `${item.itemNumber || ''}-${(item.description || '').slice(0, 50)}`;
        if (!seenItems.has(key) && (item.itemNumber || item.description)) {
          seenItems.add(key);
          allItems.push(item);
        }
      }
    }
  }

  const mergedResult = {
    items: allItems,
    summary: {
      totalItems: allItems.length,
      totalValue: allItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0),
      categories: [...new Set(allItems.map(item => item.category).filter(Boolean))],
      currency: results[0]?.summary?.currency || 'SAR',
    },
    analysisDate: new Date().toISOString(),
    chunksProcessed: chunks.length,
    successfulChunks: results.length,
  };

  console.log(`[Job ${jobId}] Merged: ${allItems.length} items, total value: ${mergedResult.summary.totalValue}`);

  // Update job as completed
  const completeMsg = isArabic ? 'اكتمل التحليل' : 'Analysis Complete';
  await supabase
    .from('analysis_jobs')
    .update({
      status: 'completed',
      result_data: mergedResult,
      progress_percentage: 100,
      current_step: completeMsg,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  console.log(`[Job ${jobId}] Completed successfully`);

  return mergedResult;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log(`Authenticated user: ${userId}`);

  try {
    const { jobId, resume = false } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const work = processJobInBackground(jobId, !!resume);

    // Avoid Edge Function request timeouts (~30s) by running in background.
    const waitUntil = (globalThis as any)?.EdgeRuntime?.waitUntil;
    if (typeof waitUntil === 'function') {
      waitUntil(work);
      return new Response(
        JSON.stringify({ started: true, jobId }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback (non-edge environments): wait for completion
    const result = await work;
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Job processing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

