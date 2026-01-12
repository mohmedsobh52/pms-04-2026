import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import LZString from "https://esm.sh/lz-string@1.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Strong exponential backoff schedule: 30s, 60s, 120s, 120s, 120s
const getBackoffDelay = (attempt: number): number => {
  const delays = [30000, 60000, 120000, 120000, 120000];
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { jobId, resume = false } = await req.json();
    
    console.log(`[Job ${jobId}] Starting processing (resume=${resume})`);
    
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`[Job ${jobId}] Not found:`, jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow resuming failed or stale processing jobs
    const isStaleProcessing = job.status === 'processing' && 
      job.updated_at && 
      (Date.now() - new Date(job.updated_at).getTime()) > 5 * 60 * 1000; // 5 min stale

    const canProcess = job.status === 'pending' || 
      (resume && (job.status === 'failed' || isStaleProcessing));

    if (!canProcess) {
      console.log(`[Job ${jobId}] Cannot process: status=${job.status}, stale=${isStaleProcessing}`);
      return new Response(
        JSON.stringify({ error: 'Job is not pending or resumable', status: job.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

      return new Response(
        JSON.stringify({ error: 'Invalid input text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!apiKey) {
      console.error(`[Job ${jobId}] LOVABLE_API_KEY not configured`);
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          error_message: 'LOVABLE_API_KEY غير مكوّن / LOVABLE_API_KEY is not configured',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxAttemptsPerChunk = 5; // Strong retry: 5 attempts per chunk

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
        ? `أنت مهندس كميات محترف تقوم بتحليل مستندات جداول الكميات (BOQ).

أرجع كائن JSON بهذا الهيكل:
{
  "items": [
    {
      "itemNumber": "رقم البند",
      "description": "الوصف",
      "unit": "الوحدة (م، م²، م³، كجم، عدد، طن، مقطوعية)",
      "quantity": رقم,
      "unitPrice": رقم,
      "totalPrice": رقم,
      "category": "التصنيف"
    }
  ],
  "summary": {
    "totalItems": رقم,
    "totalValue": رقم,
    "currency": "العملة",
    "categories": ["التصنيفات"]
  }
}

مهم:
- استخرج جميع البنود بتفاصيلها
- احسب المجاميع إذا لم تكن موجودة
- حدد التصنيفات بناءً على أنواع الأعمال
- هذه القطعة ${i + 1} من ${chunks.length}`
        : `You are an expert quantity surveyor and construction cost analyst. Analyze the Bill of Quantities (BOQ) text and extract structured data.

Return a JSON object with this structure:
{
  "items": [
    {
      "itemNumber": "string",
      "description": "string",
      "unit": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "string"
    }
  ],
  "summary": {
    "totalItems": number,
    "totalValue": number,
    "currency": "string",
    "categories": ["string"]
  }
}

Important:
- Extract ALL line items with their details
- Calculate totals if not provided
- Identify categories based on work types
- Handle both Arabic and English text
- This is chunk ${i + 1} of ${chunks.length}`;

      // Call AI for analysis with strong backoff on 429/timeouts
      let parsedResult: any = null;
      let lastErrText = '';
      let lastErrStatus = 0;

      for (let attempt = 1; attempt <= maxAttemptsPerChunk; attempt++) {
        const stepMsg = isArabic
          ? `طلب AI (قطعة ${i + 1}/${chunks.length}) - محاولة ${attempt}/${maxAttemptsPerChunk}`
          : `AI request (chunk ${i + 1}/${chunks.length}) - attempt ${attempt}/${maxAttemptsPerChunk}`;

        await supabase
          .from('analysis_jobs')
          .update({ current_step: stepMsg })
          .eq('id', jobId);

        console.log(`[Job ${jobId}] Chunk ${i + 1}, attempt ${attempt}/${maxAttemptsPerChunk}`);

        try {
          const controller = new AbortController();
          const timeoutMs = isArabic ? 180000 : 120000; // 180s for Arabic, 120s otherwise
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
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

            console.warn(`[Job ${jobId}] Chunk ${i + 1} attempt ${attempt} failed: ${response.status}`);

            // 429: strong backoff and retry
            if (response.status === 429 && attempt < maxAttemptsPerChunk) {
              const delay = getBackoffDelay(attempt);
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
              console.log(`[Job ${jobId}] Chunk ${i + 1} parsed successfully: ${parsedResult?.items?.length || 0} items`);
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
        const cooldown = isArabic ? 2000 : 1000;
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
            ? 'فشل تحليل جميع القطع. يرجى المحاولة مرة أخرى.'
            : 'All chunks failed to analyze. Please try again.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: 'All chunks failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ success: true, result: mergedResult }),
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
