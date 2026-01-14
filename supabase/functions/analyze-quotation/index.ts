import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

// Helper function to call AI with retry and fallback
async function callAIWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  let lastError: Error | null = null;

  // Try Lovable AI first
  if (LOVABLE_API_KEY) {
    try {
      console.log("Trying Lovable AI (gemini-2.5-flash)...");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 8000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log("Lovable AI response received successfully");
          return content;
        }
      } else {
        const errorText = await response.text();
        console.log("Lovable AI error:", response.status, errorText);
        
        if (response.status === 402) {
          console.log("Lovable AI credits exhausted, trying OpenAI fallback...");
        } else if (response.status === 429) {
          console.log("Lovable AI rate limited, trying OpenAI fallback...");
        }
        lastError = new Error(`Lovable AI: ${response.status}`);
      }
    } catch (err) {
      console.log("Lovable AI request failed:", err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Trying OpenAI (gpt-4o-mini) attempt ${attempt}...`);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 8000
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            console.log("OpenAI response received successfully");
            return content;
          }
        } else if (response.status === 429) {
          const waitTime = attempt * 2000;
          console.log(`OpenAI rate limited, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          const errorText = await response.text();
          console.log("OpenAI error:", response.status, errorText);
          lastError = new Error(`OpenAI: ${response.status}`);
          break;
        }
      } catch (err) {
        console.log("OpenAI request failed:", err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  // Both failed
  throw lastError || new Error("All AI providers unavailable");
}

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
    const { quotationText, quotationName, supplierName } = await req.json();

    if (!quotationText || quotationText.trim().length < 20) {
      return new Response(
        JSON.stringify({ 
          error: "النص قصير جداً للتحليل",
          errorEn: "Text too short for analysis",
          suggestion: "يرجى تقديم محتوى عرض السعر للتحليل"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing quotation:", quotationName, "from:", supplierName);
    console.log("Text length:", quotationText.length);

    const systemPrompt = `You are an expert quotation and procurement analyst. You will analyze price quotations that may contain Arabic text.

CRITICAL INSTRUCTIONS:
- Extract data ONLY from the provided text - do NOT invent or assume any data
- If information is not found, leave it empty or null
- Keep all numbers, quantities, and prices exactly as they appear in the original text
- Read Arabic text carefully and extract ALL items found
- If you find tables, extract each row as a separate item
- ALL text output should be in ENGLISH, translate Arabic descriptions to English

Your task:
1. Extract supplier information (name, address, phone, email)
2. Extract quotation information (date, quotation number, validity period, payment terms)
3. Extract ALL items/materials with:
   - Item number (if available)
   - Description (translate to English if in Arabic)
   - Unit (m³, m², kg, ton, piece, etc.)
   - Quantity (number only)
   - Unit price (number only)
   - Total (quantity × unit price)
4. Calculate totals (subtotal, tax, discounts, grand total)
5. Extract notes and terms (translate to English)

IMPORTANT: Extract data from the given text ONLY. Do NOT add data from your own knowledge.

Respond with JSON ONLY in the following structure:
{
  "supplier": {
    "name": "Supplier Name",
    "address": "Address",
    "phone": "Phone Number",
    "email": "Email"
  },
  "quotation_info": {
    "number": "Quotation Number",
    "date": "Date",
    "validity": "Validity Period",
    "payment_terms": "Payment Terms"
  },
  "items": [
    {
      "item_number": "Item Number",
      "description": "Description in English",
      "unit": "Unit",
      "quantity": 0,
      "unit_price": 0,
      "total": 0
    }
  ],
  "totals": {
    "subtotal": 0,
    "tax": 0,
    "tax_percentage": 0,
    "discount": 0,
    "grand_total": 0
  },
  "notes": ["Note 1", "Note 2"],
  "summary": "Brief summary of the quotation"
}`;

    const userPrompt = `Analyze the following price quotation:

Quotation Name: ${quotationName || 'Not specified'}
Supplier: ${supplierName || 'Not specified'}

========================
EXTRACTED TEXT FROM QUOTATION:
========================

${quotationText.substring(0, 15000)}

========================

Please analyze the above text carefully and extract ALL items, quantities, and prices found in it.
DO NOT invent any data - use ONLY what is present in the text.
Translate all Arabic text to English in your response.`;

    let content: string;
    try {
      content = await callAIWithFallback(systemPrompt, userPrompt);
    } catch (aiError) {
      console.error("All AI providers failed:", aiError);
      
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      
      // Check for specific error types
      if (errorMessage.includes("402") || errorMessage.includes("credit")) {
        return new Response(
          JSON.stringify({ 
            error: "نفد رصيد خدمة الذكاء الاصطناعي",
            errorEn: "AI service credits exhausted",
            suggestion: "يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني",
            canRetry: false
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        return new Response(
          JSON.stringify({ 
            error: "تم تجاوز حد الطلبات، يرجى الانتظار دقيقة ثم المحاولة مرة أخرى",
            errorEn: "Rate limit exceeded, please wait a minute and try again",
            suggestion: "انتظر قليلاً ثم أعد المحاولة",
            canRetry: true,
            retryAfter: 60
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw aiError;
    }

    console.log("AI response received, parsing...");

    // Try to parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a structured error with the raw content
      analysisResult = {
        raw_response: content,
        parse_error: true,
        supplier: { name: supplierName || "غير محدد" },
        items: [],
        totals: { grand_total: 0 },
        summary: "تعذر تحليل العرض بشكل كامل"
      };
    }

    console.log("Analysis complete:", {
      itemsCount: analysisResult.items?.length || 0,
      grandTotal: analysisResult.totals?.grand_total || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analyzed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-quotation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "حدث خطأ أثناء التحليل",
        errorEn: "An error occurred during analysis",
        suggestion: "يرجى المحاولة مرة أخرى",
        canRetry: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
