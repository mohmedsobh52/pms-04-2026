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

const MAX_RETRIES = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, ai_provider, analysis_type, language = 'ar' } = await req.json();
    
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

    const systemPrompt = `You are an expert construction cost analyst specialized in analyzing PDF documents containing Bill of Quantities (BOQ) and construction cost data.

CRITICAL INSTRUCTIONS:
1. ANALYZE THE PDF CONTENT: The input may be in Arabic, English, or any other language - understand and analyze it regardless of language
2. DETECT LANGUAGE AUTOMATICALLY: Identify the language of the input document
3. OUTPUT LANGUAGE: ALL your output text MUST be in ${outputLanguage} ONLY
4. Do NOT mix languages in your response - translate everything to ${outputLanguage}
5. EXTRACT ALL DATA: Extract quantities, units, descriptions, prices, and any other relevant cost information from the document
6. HANDLE ANY FORMAT: Whether the PDF contains tables, lists, or plain text - extract all cost-related information accurately

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

    const userPrompt = `Please analyze this PDF document containing construction/BOQ data. The document may be in Arabic, English, or any other language.

DOCUMENT CONTENT:
${items.map((item: any, idx: number) => `
${idx + 1}. ${item.description || item.item_description || 'Item'}
   - Quantity: ${item.quantity || 1} ${item.unit || 'unit'}
   ${item.total_price ? `- Price: ${item.total_price} SAR` : ''}
`).join('\n')}

INSTRUCTIONS:
1. Understand the content regardless of its language
2. Extract all cost-related information (materials, labor, equipment, etc.)
3. Provide comprehensive cost breakdown for each item
4. ALL output text must be in ${outputLanguage} only
5. Respond with valid JSON only.`;

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

    // Fallback to Lovable AI with retry logic
    if (!response || !response.ok) {
      if (!LOVABLE_API_KEY) {
        throw new Error("No AI API keys configured");
      }

      console.log("Using Lovable AI (Gemini Flash with tool calling for reliable output)...");
      
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
          }
          
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              temperature: 0.05,
              max_tokens: 20000,
              tools: [{
                type: "function",
                function: {
                  name: "provide_cost_analysis",
                  description: `Provide detailed cost breakdown analysis for construction items. ALL text must be in ${outputLanguage}.`,
                  parameters: {
                    type: "object",
                    properties: {
                      cost_analysis: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            item_description: { type: "string", description: `Item description in ${outputLanguage}` },
                            materials: {
                              type: "object",
                              properties: {
                                items: { 
                                  type: "array", 
                                  items: { 
                                    type: "object",
                                    properties: {
                                      name: { type: "string", description: `Material name in ${outputLanguage}` },
                                      quantity: { type: "number" },
                                      unit: { type: "string" },
                                      unit_price: { type: "number" },
                                      total: { type: "number" }
                                    }
                                  } 
                                },
                                total: { type: "number" }
                              }
                            },
                            labor: {
                              type: "object",
                              properties: {
                                items: { 
                                  type: "array", 
                                  items: { 
                                    type: "object",
                                    properties: {
                                      role: { type: "string", description: `Labor role in ${outputLanguage}` },
                                      hours: { type: "number" },
                                      hourly_rate: { type: "number" },
                                      total: { type: "number" }
                                    }
                                  } 
                                },
                                total: { type: "number" }
                              }
                            },
                            equipment: {
                              type: "object",
                              properties: {
                                items: { 
                                  type: "array", 
                                  items: { 
                                    type: "object",
                                    properties: {
                                      name: { type: "string", description: `Equipment name in ${outputLanguage}` },
                                      duration: { type: "string", description: `Duration in ${outputLanguage}` },
                                      daily_rate: { type: "number" },
                                      total: { type: "number" }
                                    }
                                  } 
                                },
                                total: { type: "number" }
                              }
                            },
                            subcontractor: { type: "number" },
                            overhead: { type: "number" },
                            admin: { type: "number" },
                            insurance: { type: "number" },
                            contingency: { type: "number" },
                            profit_margin: { type: "number" },
                            profit_amount: { type: "number" },
                            total_direct: { type: "number" },
                            total_indirect: { type: "number" },
                            total_cost: { type: "number" },
                            unit_price: { type: "number" },
                            recommendations: { 
                              type: "array", 
                              items: { type: "string", description: `Recommendation in ${outputLanguage}` }
                            }
                          },
                          required: ["item_description", "total_cost", "materials", "labor", "equipment"]
                        }
                      },
                      summary: {
                        type: "object",
                        properties: {
                          total_materials: { type: "number" },
                          total_labor: { type: "number" },
                          total_equipment: { type: "number" },
                          total_subcontractor: { type: "number" },
                          total_direct_costs: { type: "number" },
                          total_indirect_costs: { type: "number" },
                          total_profit: { type: "number" },
                          grand_total: { type: "number" },
                          key_insights: { 
                            type: "array", 
                            items: { type: "string", description: `Insight in ${outputLanguage}` }
                          }
                        }
                      }
                    },
                    required: ["cost_analysis", "summary"]
                  }
                }
              }],
              tool_choice: { type: "function", function: { name: "provide_cost_analysis" } }
            }),
          });

          if (response.ok) {
            break;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`Attempt ${attempt} failed:`, lastError.message);
          if (attempt === MAX_RETRIES) {
            throw lastError;
          }
        }
      }
      providerUsed = 'lovable';
    }

    if (!response || !response.ok) {
      if (response?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response?.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response?.status || 'No response'}`);
    }

    const data = await response.json();
    
    console.log("AI response received, extracting result...");
    
    // Helper function to clean and extract JSON from content
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
        
        // Check if JSON looks incomplete (common signs)
        const openBraces = (jsonStr.match(/{/g) || []).length;
        const closeBraces = (jsonStr.match(/}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/]/g) || []).length;
        
        if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
          console.error("JSON appears incomplete - unmatched braces/brackets");
          throw new Error("Incomplete JSON response from AI - response was truncated");
        }
        
        // Clean common issues
        jsonStr = jsonStr
          .replace(/,\s*}/g, '}')  // Remove trailing commas before }
          .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
          .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters
          .replace(/:\s*,/g, ': null,')  // Replace empty values with null
          .replace(/:\s*}/g, ': null}');  // Replace empty values at end
        
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          console.error("JSON parsing failed. First 500 chars:", text.substring(0, 500));
          console.error("Last 200 chars:", text.substring(Math.max(0, text.length - 200)));
          throw new Error(`Could not parse AI response: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
        }
      }

      throw new Error("Could not find valid JSON in AI response");
    };
    
    // Extract result from response
    let result;
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      // Extract from tool call (preferred method for Lovable AI)
      console.log("Extracting from tool call arguments");
      const argsStr = data.choices[0].message.tool_calls[0].function.arguments;
      result = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr;
    } else if (data.choices?.[0]?.message?.content) {
      // Fallback to content parsing (for OpenAI and backward compatibility)
      console.log("Extracting from message content");
      const content = data.choices[0].message.content;
      result = extractAndParseJSON(content);
    } else {
      throw new Error("No response from AI (no tool call or content found)");
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