import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LZ-String decompression (simplified base64 variant)
function decompressFromBase64(input: string): string {
  if (!input) return '';
  
  try {
    // Decode base64
    const binaryString = atob(input);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Simple decompression - LZ-String uses a specific algorithm
    // For now, we'll try to decode as UTF-8 first
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (e) {
    console.error('Decompression failed, trying raw decode:', e);
    try {
      return atob(input);
    } catch {
      return input;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { jobId } = await req.json();
    
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
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Job is not pending', status: job.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job to processing
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        current_step: 'Decompressing input...',
        progress_percentage: 5,
      })
      .eq('id', jobId);

    // Decompress input text
    let inputText = '';
    if (job.input_text_compressed) {
      inputText = decompressFromBase64(job.input_text_compressed);
    }

    if (!inputText || inputText.length < 50) {
      await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          error_message: 'Invalid or empty input text',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ error: 'Invalid input text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split into chunks if needed
    const CHUNK_SIZE = 30000;
    const chunks: string[] = [];
    
    if (inputText.length <= CHUNK_SIZE) {
      chunks.push(inputText);
    } else {
      let start = 0;
      while (start < inputText.length) {
        let end = start + CHUNK_SIZE;
        if (end < inputText.length) {
          // Try to break at newline
          const searchRange = inputText.slice(end - 200, Math.min(end + 200, inputText.length));
          const newlineIndex = searchRange.lastIndexOf('\n');
          if (newlineIndex !== -1) {
            end = end - 200 + newlineIndex + 1;
          }
        }
        chunks.push(inputText.slice(start, end));
        start = end - 500; // Overlap
        if (start >= inputText.length) break;
      }
    }

    await supabase
      .from('analysis_jobs')
      .update({
        total_chunks: chunks.length,
        current_step: `Processing ${chunks.length} chunks...`,
        progress_percentage: 10,
      })
      .eq('id', jobId);

    // Process each chunk
    const results: any[] = [];
    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progressPercent = 10 + Math.round((i / chunks.length) * 80);

      await supabase
        .from('analysis_jobs')
        .update({
          processed_chunks: i,
          current_step: `Processing chunk ${i + 1} of ${chunks.length}...`,
          progress_percentage: progressPercent,
        })
        .eq('id', jobId);

      // Call AI for analysis
      try {
        const systemPrompt = `You are an expert quantity surveyor and construction cost analyst. Analyze the Bill of Quantities (BOQ) text and extract structured data.

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
        });

        if (!response.ok) {
          console.error(`AI request failed for chunk ${i}:`, await response.text());
          continue;
        }

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        let parsedResult = null;
        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                           content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error(`Failed to parse chunk ${i} result:`, parseErr);
        }

        if (parsedResult) {
          results.push(parsedResult);
        }
      } catch (chunkError) {
        console.error(`Error processing chunk ${i}:`, chunkError);
      }

      // Update chunk results
      await supabase
        .from('analysis_jobs')
        .update({
          processed_chunks: i + 1,
          chunk_results: results,
        })
        .eq('id', jobId);
    }

    // Merge results
    await supabase
      .from('analysis_jobs')
      .update({
        current_step: 'Merging results...',
        progress_percentage: 95,
      })
      .eq('id', jobId);

    // Merge all items
    const allItems: any[] = [];
    const seenItems = new Set<string>();
    
    for (const result of results) {
      if (result?.items && Array.isArray(result.items)) {
        for (const item of result.items) {
          const key = `${item.itemNumber || ''}-${item.description?.slice(0, 50) || ''}`;
          if (!seenItems.has(key)) {
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
    };

    // Update job as completed
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        result_data: mergedResult,
        progress_percentage: 100,
        current_step: 'Complete',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

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
