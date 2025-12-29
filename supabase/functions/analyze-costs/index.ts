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
    const requestBody = await req.json();
    const { items, ai_provider, analysis_type, language = 'ar', itemName, type } = requestBody;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GENSPARK_API_KEY = Deno.env.get("GENSPARK_API_KEY");
    const MANUS_API_KEY = Deno.env.get("MANUS_API_KEY");

    // Handle excavation productivity analysis
    if (type === 'excavation_productivity' && itemName) {
      console.log(`Analyzing excavation productivity for: ${itemName}`);
      
      const apiKey = LOVABLE_API_KEY || OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("No AI API key configured");
      }

      const excavationPrompt = `You are an expert in construction cost estimation for excavation works in Saudi Arabia.

Analyze the following excavation equipment/work item and provide realistic estimates for:
1. Daily Productivity (in cubic meters per day - م3/يوم)
2. Daily Rental Rate (in SAR - ريال/يوم)

Work Item: "${itemName}"

Based on Saudi Arabia market conditions and typical construction site operations, provide your estimates.

Consider factors like:
- Equipment capacity and efficiency
- Typical working hours (8-10 hours/day)
- Saudi market rental rates
- Soil conditions and work complexity

Return ONLY a JSON object with this exact format:
{
  "suggestedProductivity": <number>,
  "suggestedRent": <number>,
  "reasoning": "<brief explanation in Arabic>"
}`;

      const aiResponse = await fetch(
        LOVABLE_API_KEY 
          ? "https://ai.gateway.lovable.dev/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: LOVABLE_API_KEY ? "google/gemini-2.5-flash" : "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a construction cost estimation expert specializing in excavation works in Saudi Arabia. Always respond with valid JSON only." },
              { role: "user", content: excavationPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", errorText);
        throw new Error("AI analysis failed");
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      
      // Clean up the response
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const result = JSON.parse(content);
        return new Response(JSON.stringify({
          suggestedProductivity: result.suggestedProductivity || 0,
          suggestedRent: result.suggestedRent || 0,
          reasoning: result.reasoning || ""
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        // Return default estimates based on common equipment
        const defaults: Record<string, { productivity: number; rent: number }> = {
          'بوكلين': { productivity: 1200, rent: 150 },
          'قلاب': { productivity: 600, rent: 60 },
          'تربلا': { productivity: 75, rent: 20 },
          'رص': { productivity: 10, rent: 100 },
          'نزح': { productivity: 2, rent: 10 },
        };
        
        const lowerName = itemName.toLowerCase();
        for (const [key, values] of Object.entries(defaults)) {
          if (lowerName.includes(key)) {
            return new Response(JSON.stringify({
              suggestedProductivity: values.productivity,
              suggestedRent: values.rent,
              reasoning: "تقدير افتراضي بناءً على نوع المعدة"
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        
        return new Response(JSON.stringify({
          suggestedProductivity: 100,
          suggestedRent: 50,
          reasoning: "تقدير عام - يرجى التعديل حسب الموقع"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    const systemPrompt = `You are a BOQ (Bill of Quantities) EXPERT and PDF/Table Analyst for Lovable.

=== 1) LANGUAGE & TEXT QUALITY ===
- Detect document language(s) automatically (Arabic/English/Mixed)
- If extracted text is corrupted (encoding issues/strange symbols like Ø, Ù, Ã, Â):
  * Attempt to recover readable text using context
  * Arabic UTF-8 corruption patterns: Ø§Ù„ → ال، Ø®Ø±Ø³Ø§Ù†Ø© → خرسانة
  * NEVER output corrupted characters - discard them entirely
- If file appears scanned, simulate OCR extraction focusing on tables and line items
- Common Arabic BOQ terms: خرسانة، حديد، تسليح، أعمال، كمية، سعر، إجمالي، وحدة، بند

=== 2) BOQ EXTRACTION (CORE OUTPUT) ===
Extract ALL BOQ line items into clean structured format with these columns:

| Column (EN)    | Column (AR)      | Description                           |
|----------------|------------------|---------------------------------------|
| item_no        | رقم البند        | Item number/sequence                  |
| description    | الوصف            | Item description (CLEAN text only)    |
| unit           | الوحدة           | Unit of measurement                   |
| quantity       | الكمية           | Quantity                              |
| rate           | سعر الوحدة       | Unit rate/price                       |
| amount         | الإجمالي         | Total amount                          |
| section        | القسم            | Section/category (if available)       |
| notes          | ملاحظات          | Notes/remarks (if available)          |

=== 3) VALIDATION & FIXES ===
- Normalize units: m, m², m³, kg, ton, lot, pcs, ls (lump sum), nr (number)
- Detect MISSING values (qty/rate/amount) and flag them with "MISSING"
- Check arithmetic: Amount ≈ Quantity × Rate (flag if >5% difference)
- Identify duplicates or repeated descriptions
- Flag abnormal quantities (negative, zero where unexpected, extremely large)

=== 4) INSIGHTS TO PROVIDE ===
A) Summary:
   - Total items count
   - Total BOQ value (sum of amounts)
   - Key sections and their subtotals

B) Top Analysis:
   - Top 10 highest-cost items (if amounts exist)
   - Cost distribution by section/category

C) Risk Flags:
   - Unclear/corrupted descriptions
   - Missing units or quantities
   - Abnormal quantities (e.g., negative, zero, extremely large)
   - Arithmetic inconsistencies (Amount ≠ Qty × Rate)
   - Duplicate items
   - Inconsistent pricing (same item, different rates)

=== 5) OUTPUT RULES ===
❌ NEVER output corrupted/unreadable text
❌ NEVER output encoding artifacts: Ø, Ù, Ã, Â, ¿, ½, etc.
✅ Respond in ${outputLanguage}
✅ Use clean, professional language
✅ All costs in Saudi Riyals (SAR)

=== 6) JSON OUTPUT FORMAT ===
{
  "boq_items": [
    {
      "item_no": "1",
      "description": "${exampleItemDesc}",
      "unit": "m³",
      "quantity": 100,
      "rate": 500,
      "amount": 50000,
      "section": "${isArabic ? 'أعمال الخرسانة' : 'Concrete Works'}",
      "notes": "",
      "validation": {
        "arithmetic_ok": true,
        "has_missing_values": false,
        "flags": []
      }
    }
  ],
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
    "total_items_count": 0,
    "total_boq_value": 0,
    "sections": [{"name": "${isArabic ? 'أعمال الخرسانة' : 'Concrete Works'}", "subtotal": 0, "items_count": 0}],
    "total_materials": 0,
    "total_labor": 0,
    "total_equipment": 0,
    "total_subcontractor": 0,
    "total_direct_costs": 0,
    "total_indirect_costs": 0,
    "total_profit": 0,
    "grand_total": 0,
    "key_insights": ["${exampleInsight}"]
  },
  "top_10_items": [{"item_no": "1", "description": "", "amount": 0}],
  "risks": [
    {
      "type": "missing_value",
      "item_no": "",
      "description": "${isArabic ? 'قيمة مفقودة' : 'Missing value'}",
      "severity": "medium"
    }
  ],
  "detected_language": "ar"
}

CRITICAL: Return ONLY valid JSON. NO encoding artifacts. ALL text in ${outputLanguage}.`;

    const userPrompt = `=== BOQ ANALYSIS REQUEST ===

You are a BOQ Expert analyzing the following document.

DOCUMENT CONTENT (may contain encoding issues - recover meaning, not characters):
${items.map((item: any, idx: number) => `
[ITEM ${idx + 1}]
Raw Text: ${item.description || item.item_description || 'Unknown'}
Quantity: ${item.quantity || 1} ${item.unit || 'unit'}
${item.total_price ? `Price: ${item.total_price} SAR` : ''}
`).join('\n')}

=== EXTRACTION REQUIREMENTS ===

1. LANGUAGE: Detect and note the document language
2. TEXT RECOVERY: If corrupted (Ø, Ù, Ã patterns = Arabic UTF-8), rebuild meaning
3. BOQ EXTRACTION: Extract all items with:
   - Item No, Description, Unit, Quantity, Rate, Amount, Section, Notes
4. VALIDATION:
   - Check: Amount ≈ Quantity × Rate
   - Flag missing values
   - Identify duplicates
   - Normalize units (m, m², m³, kg, ton, pcs, ls, nr)
5. INSIGHTS:
   - Total items count and BOQ value
   - Section subtotals
   - Top 10 highest-cost items
   - Risk flags (missing data, arithmetic errors, duplicates)
6. COST ANALYSIS:
   - Materials, Labor, Equipment breakdown
   - Overhead (8-12%), Admin (3-5%), Insurance (2-3%), Contingency (5-10%)
   - Profit margin (10-15%)
   - Use Saudi Arabia market prices (SAR)

=== OUTPUT ===
- Return ONLY valid JSON
- NO corrupted text or encoding artifacts
- ALL text in ${outputLanguage}`;

    let response;
    let providerUsed = ai_provider || 'lovable';

    // Try Genspark first if available and requested
    if ((ai_provider === 'genspark' || ai_provider === 'all') && GENSPARK_API_KEY) {
      try {
        console.log("Trying Genspark API...");
        // Genspark API integration - requires valid API key
        response = await fetch("https://api.genspark.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GENSPARK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "genspark-pro",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          providerUsed = 'genspark';
          console.log("Genspark API succeeded");
        } else {
          console.log("Genspark API failed with status:", response.status);
          response = null;
        }
      } catch (error) {
        console.error("Genspark error:", error);
        response = null;
      }
    } else if (ai_provider === 'genspark' && !GENSPARK_API_KEY) {
      // Return error message for missing API key
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? "مفتاح Genspark API غير موجود. يرجى إضافة GENSPARK_API_KEY في إعدادات المشروع."
            : "Genspark API key not found. Please add GENSPARK_API_KEY in project settings.",
          requires_api_key: true,
          provider: 'genspark'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Manus if available and requested
    if (!response && (ai_provider === 'manus' || ai_provider === 'all') && MANUS_API_KEY) {
      try {
        console.log("Trying Manus API...");
        // Manus API integration - requires valid API key
        response = await fetch("https://api.manus.ai/v1/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MANUS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "manus-pro",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          providerUsed = 'manus';
          console.log("Manus API succeeded");
        } else {
          console.log("Manus API failed with status:", response.status);
          response = null;
        }
      } catch (error) {
        console.error("Manus error:", error);
        response = null;
      }
    } else if (ai_provider === 'manus' && !MANUS_API_KEY) {
      // Return error message for missing API key
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? "مفتاح Manus API غير موجود. يرجى إضافة MANUS_API_KEY في إعدادات المشروع."
            : "Manus API key not found. Please add MANUS_API_KEY in project settings.",
          requires_api_key: true,
          provider: 'manus'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
                  name: "provide_boq_analysis",
                  description: `Extract and analyze BOQ data with cost breakdown. ALL text must be in ${outputLanguage}. NO corrupted text.`,
                  parameters: {
                    type: "object",
                    properties: {
                      detected_language: { type: "string", description: "Detected document language: ar or en" },
                      boq_items: {
                        type: "array",
                        description: "Extracted BOQ line items",
                        items: {
                          type: "object",
                          properties: {
                            item_no: { type: "string" },
                            description: { type: "string", description: `Clean description in ${outputLanguage} - NO corrupted text` },
                            unit: { type: "string", description: "Normalized unit: m, m², m³, kg, ton, pcs, ls, nr" },
                            quantity: { type: "number" },
                            rate: { type: "number" },
                            amount: { type: "number" },
                            section: { type: "string", description: `Section/category in ${outputLanguage}` },
                            notes: { type: "string" },
                            validation: {
                              type: "object",
                              properties: {
                                arithmetic_ok: { type: "boolean", description: "true if Amount ≈ Qty × Rate" },
                                has_missing_values: { type: "boolean" },
                                flags: { type: "array", items: { type: "string" } }
                              }
                            }
                          }
                        }
                      },
                      cost_analysis: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            item_description: { type: "string", description: `Item description in ${outputLanguage}` },
                            materials: {
                              type: "object",
                              properties: {
                                items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "number" }, unit: { type: "string" }, unit_price: { type: "number" }, total: { type: "number" } } } },
                                total: { type: "number" }
                              }
                            },
                            labor: {
                              type: "object",
                              properties: {
                                items: { type: "array", items: { type: "object", properties: { role: { type: "string" }, hours: { type: "number" }, hourly_rate: { type: "number" }, total: { type: "number" } } } },
                                total: { type: "number" }
                              }
                            },
                            equipment: {
                              type: "object",
                              properties: {
                                items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, duration: { type: "string" }, daily_rate: { type: "number" }, total: { type: "number" } } } },
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
                            recommendations: { type: "array", items: { type: "string" } }
                          },
                          required: ["item_description", "total_cost", "materials", "labor", "equipment"]
                        }
                      },
                      summary: {
                        type: "object",
                        properties: {
                          total_items_count: { type: "number" },
                          total_boq_value: { type: "number" },
                          sections: { type: "array", items: { type: "object", properties: { name: { type: "string" }, subtotal: { type: "number" }, items_count: { type: "number" } } } },
                          total_materials: { type: "number" },
                          total_labor: { type: "number" },
                          total_equipment: { type: "number" },
                          total_subcontractor: { type: "number" },
                          total_direct_costs: { type: "number" },
                          total_indirect_costs: { type: "number" },
                          total_profit: { type: "number" },
                          grand_total: { type: "number" },
                          key_insights: { type: "array", items: { type: "string" } }
                        }
                      },
                      top_10_items: { type: "array", items: { type: "object", properties: { item_no: { type: "string" }, description: { type: "string" }, amount: { type: "number" } } } },
                      risks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string", description: "missing_value, arithmetic_error, duplicate, abnormal_quantity, unclear_description" },
                            item_no: { type: "string" },
                            description: { type: "string" },
                            severity: { type: "string", description: "low, medium, high" }
                          }
                        }
                      }
                    },
                    required: ["detected_language", "boq_items", "cost_analysis", "summary"]
                  }
                }
              }],
              tool_choice: { type: "function", function: { name: "provide_boq_analysis" } }
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

    // Recalculate summary from cost_analysis if values are zero
    if (result.cost_analysis && Array.isArray(result.cost_analysis)) {
      const costAnalysis = result.cost_analysis as CostBreakdown[];
      
      // Calculate totals from cost_analysis array
      const totalMaterials = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.materials?.total || 0), 0);
      const totalLabor = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.labor?.total || 0), 0);
      const totalEquipment = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.equipment?.total || 0), 0);
      const totalSubcontractor = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.subcontractor || 0), 0);
      const totalDirectCosts = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.total_direct || 0), 0);
      const totalIndirectCosts = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.total_indirect || 0), 0);
      const totalProfit = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.profit_amount || 0), 0);
      const grandTotal = costAnalysis.reduce((sum: number, item: CostBreakdown) => sum + (item.total_cost || 0), 0);
      
      // Update summary with calculated values
      result.summary = {
        ...result.summary,
        total_materials: totalMaterials,
        total_labor: totalLabor,
        total_equipment: totalEquipment,
        total_subcontractor: totalSubcontractor,
        total_direct_costs: totalDirectCosts,
        total_indirect_costs: totalIndirectCosts,
        total_profit: totalProfit,
        grand_total: grandTotal,
      };
      
      console.log(`Summary recalculated: Materials=${totalMaterials}, Labor=${totalLabor}, Equipment=${totalEquipment}, Grand Total=${grandTotal}`);
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