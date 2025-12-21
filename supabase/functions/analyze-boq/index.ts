import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  analysis_type: string;
  items: Array<{
    item_number: string;
    description: string;
    unit: string;
    quantity: number;
    unit_price?: number;
    total_price?: number;
    category?: string;
    notes?: string;
  }>;
  wbs?: Array<{
    code: string;
    title: string;
    level: number;
    parent_code?: string;
    items: string[];
  }>;
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, analysis_type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate that text is readable
    if (!text || typeof text !== "string" || text.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "النص المُدخل قصير جداً أو غير صالح",
          suggestion: "يرجى إدخال نص BOQ يدوياً أو استخدام ملف PDF يحتوي على نص قابل للتحديد"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if text contains too many invalid characters (binary data)
    const invalidCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    const invalidRatio = invalidCharCount / text.length;
    
    if (invalidRatio > 0.1) {
      console.log(`Text appears to be binary data. Invalid char ratio: ${invalidRatio}`);
      return new Response(
        JSON.stringify({ 
          error: "لا يمكن قراءة محتوى الملف",
          suggestion: "يبدو أن ملف PDF يحتوي على صور أو نص غير قابل للتحديد. يرجى إدخال النص يدوياً."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting ${analysis_type} analysis with ${text.length} characters...`);

    let systemPrompt = "";
    let userPrompt = "";

    switch (analysis_type) {
      case "extract_items":
        systemPrompt = `You are a BOQ (Bill of Quantities) expert. Extract all items from the provided document text. 
Return ONLY a valid JSON object (no markdown, no code blocks, no explanation) with this structure:
{
  "analysis_type": "extract_items",
  "items": [
    {
      "item_number": "string",
      "description": "string",
      "unit": "string (e.g., m, m², m³, kg, pcs, etc.)",
      "quantity": number,
      "unit_price": number or null,
      "total_price": number or null,
      "category": "string (e.g., Civil Works, Electrical, Plumbing, etc.)",
      "notes": "string or null"
    }
  ],
  "summary": {
    "total_items": number,
    "total_value": number or null,
    "categories": ["array of unique categories"],
    "currency": "string or null"
  }
}
Be thorough and extract ALL items you can find. Parse quantities and prices as numbers. Return ONLY valid JSON.`;
        userPrompt = `Extract all BOQ items from this document:\n\n${text.slice(0, 15000)}`;
        break;

      case "create_wbs":
        systemPrompt = `You are a project management expert specializing in Work Breakdown Structure (WBS) creation.
Analyze the BOQ text and create a hierarchical WBS structure.
Return ONLY a valid JSON object (no markdown, no code blocks, no explanation) with this structure:
{
  "analysis_type": "create_wbs",
  "wbs": [
    {
      "code": "string (e.g., 1, 1.1, 1.1.1)",
      "title": "string",
      "level": number (1, 2, or 3),
      "parent_code": "string or null",
      "items": ["array of related item numbers"]
    }
  ]
}
Create a logical hierarchy grouping related work items together. Return ONLY valid JSON.`;
        userPrompt = `Create a WBS structure from this BOQ:\n\n${text.slice(0, 15000)}`;
        break;

      default:
        systemPrompt = `You are a document analysis expert. Analyze the provided text and extract structured information.
Return ONLY a valid JSON object with relevant analysis results.`;
        userPrompt = `Analyze this document:\n\n${text.slice(0, 15000)}`;
    }

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing...");
    console.log("Full AI response:", content);

    // Extract JSON from response with improved handling
    let result: AnalysisResult;
    try {
      // Try to parse directly first
      result = JSON.parse(content);
      console.log("Successfully parsed JSON directly");
    } catch (directParseError) {
      console.log("Direct parse failed, trying extraction methods...");
      
      try {
        // Try to extract JSON from markdown code block
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          console.log("Found JSON in markdown code block");
          result = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try to find JSON object in the response by matching braces
          const jsonStart = content.indexOf("{");
          const jsonEnd = content.lastIndexOf("}");
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonStr = content.slice(jsonStart, jsonEnd + 1);
            console.log("Extracted JSON string:", jsonStr.slice(0, 200));
            
            try {
              result = JSON.parse(jsonStr);
              console.log("Successfully parsed extracted JSON");
            } catch (parseError) {
              console.error("Failed to parse extracted JSON:", parseError);
              console.error("Extracted string:", jsonStr);
              throw new Error(`فشل تحليل استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.`);
            }
          } else {
            console.error("Could not find JSON structure in response");
            console.error("Response content:", content);
            throw new Error(`الاستجابة لا تحتوي على JSON صالح. يرجى المحاولة مرة أخرى.`);
          }
        }
      } catch (extractError) {
        console.error("All JSON extraction methods failed");
        console.error("Original error:", directParseError);
        console.error("Extraction error:", extractError);
        console.error("Full response:", content);
        throw new Error(`تعذر معالجة استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.`);
      }
    }

    console.log(`Analysis complete: ${result.items?.length || result.wbs?.length || 0} items found`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-boq function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
