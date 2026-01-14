import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

serve(async (req) => {
  // Handle CORS preflight requests
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
    const { images, fileName } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing OCR for ${images.length} pages from file: ${fileName}`);

    const extractedPages: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each page image
    for (let i = 0; i < images.length; i++) {
      const imageBase64 = images[i];
      const pageNum = i + 1;

      console.log(`Processing page ${pageNum}/${images.length}`);

      try {
        const systemPrompt = `You are an expert OCR system specialized in extracting text from scanned documents, especially quotations, invoices, and BOQ (Bill of Quantities) documents. 
Your task is to:
1. Extract ALL text visible in the image with maximum accuracy
2. Preserve the original formatting and structure as much as possible
3. Identify and extract tables with their data - this is CRITICAL
4. Handle Arabic, English, and numeric text with special attention to numbers
5. For tables, format them clearly with columns separated by | characters
6. Include headers, item numbers, descriptions, quantities, units, and prices
7. For scanned/low-quality images, use context to infer unclear characters
8. Pay special attention to:
   - Item numbers (often in format like 31.1.1.1)
   - Quantities (numbers, may include decimals)
   - Units (m, m², m³, kg, ton, piece, etc.)
   - Prices (numbers, may include commas as thousand separators)

IMPORTANT:
- Extract text exactly as it appears
- Do not add interpretations or comments
- Preserve numbers exactly as shown - never guess or change them
- Format tables clearly for easy parsing
- If a character is unclear, mark it with [?] but try to infer from context first
- For Arabic text, maintain right-to-left reading order where appropriate`;

        const userPrompt = `Extract all text from this scanned document page (Page ${pageNum} of ${images.length}).
File: ${fileName || 'quotation'}

Extract the complete text content, preserving structure and tables. Format tables with | separators.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { 
                role: 'user', 
                content: [
                  { type: 'text', text: userPrompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` 
                    } 
                  }
                ]
              }
            ],
            max_tokens: 4096,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error for page ${pageNum}:`, response.status, errorText);
          
          if (response.status === 429) {
            extractedPages.push(`[Page ${pageNum}] Rate limit exceeded - please try again later`);
          } else if (response.status === 402) {
            extractedPages.push(`[Page ${pageNum}] API credits exhausted`);
          } else {
            extractedPages.push(`[Page ${pageNum}] Extraction failed`);
          }
          errorCount++;
          continue;
        }

        const data = await response.json();
        const extractedText = data.choices?.[0]?.message?.content || '';
        
        if (extractedText.trim()) {
          extractedPages.push(`--- Page ${pageNum} ---\n${extractedText}`);
          successCount++;
          console.log(`Successfully extracted text from page ${pageNum} (${extractedText.length} chars)`);
        } else {
          extractedPages.push(`[Page ${pageNum}] No text detected`);
          errorCount++;
        }

        // Small delay between pages to avoid rate limiting
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        extractedPages.push(`[Page ${pageNum}] Error: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    const combinedText = extractedPages.join('\n\n');

    console.log(`OCR completed: ${successCount} pages successful, ${errorCount} pages failed`);

    return new Response(
      JSON.stringify({
        success: true,
        text: combinedText,
        pageCount: images.length,
        successCount,
        errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
