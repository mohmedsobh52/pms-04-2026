import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CostBreakdown {
  item_description: string;
  materials: {
    items: Array<{ name: string; quantity: number; unit: string; unit_price: number; total: number }>;
    total: number;
  };
  labor: {
    items: Array<{ role: string; hours: number; hourly_rate: number; total: number }>;
    total: number;
  };
  equipment: {
    items: Array<{ name: string; duration: string; daily_rate: number; total: number }>;
    total: number;
  };
  subcontractor: number;
  overhead: number;
  admin: number;
  insurance: number;
  contingency: number;
  profit_margin: number;
  profit_amount: number;
  total_direct: number;
  total_indirect: number;
  total_cost: number;
  unit_price: number;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, ai_provider, analysis_type, language = 'en' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GENSPARK_API_KEY = Deno.env.get("GENSPARK_API_KEY");
    const MANUS_API_KEY = Deno.env.get("MANUS_API_KEY");

    const isArabic = language === 'ar';
    const outputLanguage = isArabic ? 'Arabic' : 'English';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: isArabic ? "يجب توفير قائمة البنود للتحليل" : "Please provide a list of items to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing costs for ${items.length} items using ${ai_provider} in ${outputLanguage}...`);

    // Build examples based on language selection
    const exampleMaterialName = isArabic ? 'خرسانة جاهزة' : 'Ready Mix Concrete';
    const exampleLaborRole = isArabic ? 'نجار' : 'Carpenter';
    const exampleEquipmentName = isArabic ? 'رافعة شوكية' : 'Forklift';
    const exampleDuration = isArabic ? '5 أيام' : '5 days';
    const exampleItemDesc = isArabic ? 'أعمال الخرسانة المسلحة' : 'Reinforced Concrete Works';
    const exampleRecommendation = isArabic ? 'يُنصح بالتفاوض على أسعار المواد' : 'Consider negotiating material prices';
    const exampleInsight = isArabic ? 'تكاليف المواد تشكل النسبة الأكبر' : 'Material costs represent the largest portion';

    const systemPrompt = `You are an expert construction cost analyst. Analyze the provided items and provide a comprehensive cost breakdown.

CRITICAL LANGUAGE INSTRUCTION:
- The input text may be in Arabic or English - understand it regardless of language
- ALL your output text MUST be in ${outputLanguage} ONLY
- Do NOT mix languages in your response
- Translate any Arabic input to ${outputLanguage} in your output

OTHER INSTRUCTIONS:
1. Extract quantities, units, and descriptions accurately
2. Use market prices from Saudi Arabia/Gulf region
3. Calculate ALL costs in Saudi Riyals (SAR)

The analysis should include:

1. Direct Costs:
   - Materials: List required materials with quantities and prices
   - Labor: Types of labor required, work hours, and wages
   - Equipment: Required equipment, duration, and costs
   - Subcontractors

2. Indirect Costs:
   - Overhead: typically 8-12% of direct costs
   - Administrative: typically 3-5%
   - Insurance: typically 2-3%
   - Contingency: typically 5-10%

3. Profit Margin: typically 10-15%

Return JSON in the following format (ALL text values must be in ${outputLanguage}):
{
  "cost_analysis": [
    {
      "item_description": "${exampleItemDesc}",
      "materials": {
        "items": [{"name": "${exampleMaterialName}", "quantity": 100, "unit": "m³", "unit_price": 500, "total": 50000}],
        "total": 50000
      },
      "labor": {
        "items": [{"role": "${exampleLaborRole}", "hours": 40, "hourly_rate": 50, "total": 2000}],
        "total": 2000
      },
      "equipment": {
        "items": [{"name": "${exampleEquipmentName}", "duration": "${exampleDuration}", "daily_rate": 1000, "total": 5000}],
        "total": 5000
      },
      "subcontractor": 0,
      "overhead": 5700,
      "admin": 2850,
      "insurance": 1710,
      "contingency": 2850,
      "profit_margin": 10,
      "profit_amount": 7011,
      "total_direct": 57000,
      "total_indirect": 13110,
      "total_cost": 77121,
      "unit_price": 771.21,
      "recommendations": ["${exampleRecommendation}"]
    }
  ],
  "summary": {
    "total_materials": 0,
    "total_labor": 0,
    "total_equipment": 0,
    "total_subcontractor": 0,
    "total_direct_costs": 0,
    "total_indirect_costs": 0,
    "total_profit": 0,
    "grand_total": 0,
    "key_insights": ["${exampleInsight}"]
  }
}

Use current market prices from Saudi Arabia/Gulf region. All costs in SAR.
CRITICAL: Return ONLY valid JSON. No explanatory text before or after. ALL text values must be in ${outputLanguage} only.`;

    const userPrompt = `Analyze detailed costs for the following construction items:

${items.map((item: any, idx: number) => `
${idx + 1}. Description: ${item.description || item.item_description}
   - Quantity: ${item.quantity || 1} ${item.unit || 'unit'}
   ${item.total_price ? `- Proposed Total Price: ${item.total_price} SAR` : ''}
`).join('\n')}

Provide comprehensive cost breakdown for each item. ALL text in response must be in ${outputLanguage}.
Respond with valid JSON only.`;

    let response;
    let providerUsed = ai_provider || 'lovable';

    // Try Genspark first if available and requested
    if ((ai_provider === 'genspark' || ai_provider === 'all') && GENSPARK_API_KEY) {
      try {
        console.log("Trying Genspark API...");
        // Placeholder for Genspark API - implement when API details are available
        console.log("Genspark not yet implemented, falling back...");
        response = null;
      } catch (error) {
        console.error("Genspark error:", error);
        response = null;
      }
    }

    // Try Manus if available and requested
    if (!response && (ai_provider === 'manus' || ai_provider === 'all') && MANUS_API_KEY) {
      try {
        console.log("Trying Manus API...");
        // Placeholder for Manus API - implement when API details are available
        console.log("Manus not yet implemented, falling back...");
        response = null;
      } catch (error) {
        console.error("Manus error:", error);
        response = null;
      }
    }

    // Try OpenAI if available and requested
    if (!response && (ai_provider === 'openai' || ai_provider === 'all') && OPENAI_API_KEY) {
      try {
        console.log("Trying OpenAI API...");
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });

        if (response.ok) {
          providerUsed = 'openai';
          console.log("OpenAI API succeeded");
        } else {
          console.log("OpenAI API failed, falling back to Lovable AI");
          response = null;
        }
      } catch (error) {
        console.error("OpenAI error:", error);
        response = null;
      }
    }

    // Fallback to Lovable AI
    if (!response || !response.ok) {
      if (!LOVABLE_API_KEY) {
        throw new Error("No AI API keys configured");
      }

      console.log("Using Lovable AI (Gemini Pro for better Arabic support)...");
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 8000,
          response_format: { type: "json_object" },
        }),
      });
      providerUsed = 'lovable';
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing...");

    // Helper function to clean and extract JSON
    const extractAndParseJSON = (text: string): any => {
      // First, try to parse directly
      try {
        return JSON.parse(text);
      } catch (e) {
        // Continue with extraction attempts
      }

      // Try to extract from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (e) {
          // Continue with other methods
        }
      }

      // Find the first { and last } and try to parse
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonStr = text.slice(jsonStart, jsonEnd + 1);
        
        // Clean common issues
        jsonStr = jsonStr
          .replace(/,\s*}/g, '}')  // Remove trailing commas before }
          .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
          .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters
          .replace(/\n\s*\n/g, '\n')  // Remove empty lines
          .replace(/"\s*\n\s*"/g, '", "')  // Fix broken string arrays
          .replace(/}\s*{/g, '},{')  // Fix missing commas between objects
          .replace(/]\s*\[/g, '],[')  // Fix missing commas between arrays
          .replace(/:\s*,/g, ': null,')  // Replace empty values with null
          .replace(/:\s*}/g, ': null}');  // Replace empty values at end
        
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error("JSON parsing failed after cleaning, raw content:", text.substring(0, 500));
          throw new Error(`Could not parse AI response: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
        }
      }

      throw new Error("Could not find valid JSON in AI response");
    };

    let result;
    try {
      result = extractAndParseJSON(content);
      console.log("Successfully parsed AI response");
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw e;
    }

    console.log(`Cost analysis complete using ${providerUsed}`);

    return new Response(
      JSON.stringify({
        ...result,
        ai_provider: providerUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-costs function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});