import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface MarketRateSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  suggested_min: number;
  suggested_max: number;
  suggested_avg: number;
  confidence: "High" | "Medium" | "Low";
  trend: "Increasing" | "Stable" | "Decreasing";
  variance_percent: number;
  notes: string;
}

// Process items in batches to handle large BOQ files
async function processBatch(
  items: BOQItem[],
  location: string,
  apiKey: string
): Promise<MarketRateSuggestion[]> {
  // Prepare items summary for AI
  const itemsSummary = items.map(item => ({
    item_number: item.item_number,
    description: item.description,
    unit: item.unit,
    current_price: item.unit_price || 0,
  }));

  const systemPrompt = `You are an expert construction cost estimator in Saudi Arabia with deep knowledge of current market rates for construction materials, labor, and services in ${location}.

Analyze each BOQ item and provide market rate suggestions based on:
1. Current material prices in Saudi Arabia
2. Labor costs in ${location}
3. Recent market trends (post-2024)
4. Regional variations within KSA

For each item, you must provide:
- suggested_min: Lower bound of market rate range
- suggested_max: Upper bound of market rate range
- suggested_avg: Average/recommended rate
- confidence: "High" (well-known items), "Medium" (moderate certainty), "Low" (uncommon/specialized)
- trend: "Increasing" (prices rising), "Stable" (no significant change), "Decreasing" (prices falling)
- notes: Brief explanation of the estimate basis`;

  const userPrompt = `Analyze these BOQ items and suggest current market rates for ${location}, Saudi Arabia. Current prices are in SAR.

Items to analyze:
${JSON.stringify(itemsSummary, null, 2)}

Return a JSON array of suggestions with this structure for each item:
{
  "item_number": "string",
  "description": "string",
  "current_price": number,
  "suggested_min": number,
  "suggested_max": number,
  "suggested_avg": number,
  "confidence": "High" | "Medium" | "Low",
  "trend": "Increasing" | "Stable" | "Decreasing",
  "notes": "brief explanation"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_market_rates",
            description: "Return market rate suggestions for BOQ items",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item_number: { type: "string" },
                      description: { type: "string" },
                      current_price: { type: "number" },
                      suggested_min: { type: "number" },
                      suggested_max: { type: "number" },
                      suggested_avg: { type: "number" },
                      confidence: { type: "string", enum: ["High", "Medium", "Low"] },
                      trend: { type: "string", enum: ["Increasing", "Stable", "Decreasing"] },
                      notes: { type: "string" }
                    },
                    required: ["item_number", "suggested_min", "suggested_max", "suggested_avg", "confidence", "trend"]
                  }
                }
              },
              required: ["suggestions"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "suggest_market_rates" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  let suggestions: MarketRateSuggestion[] = [];

  // Try to extract from tool calls
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      suggestions = parsed.suggestions || [];
    } catch (e) {
      console.error("Error parsing tool call arguments:", e);
    }
  }

  // If no tool calls, try content
  if (suggestions.length === 0) {
    const content = aiResponse.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Error parsing content JSON:", e);
      }
    }
  }

  return suggestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, location = "Riyadh" }: { items: BOQItem[]; location: string } = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing market rates for ${items.length} items in ${location}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Process in batches of 25 items to handle large BOQ files
    const BATCH_SIZE = 25;
    const allSuggestions: MarketRateSuggestion[] = [];
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);
    
    console.log(`Processing ${totalBatches} batches of ${BATCH_SIZE} items each`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batchItems.length} items)`);
      
      try {
        const batchSuggestions = await processBatch(batchItems, location, LOVABLE_API_KEY);
        allSuggestions.push(...batchSuggestions);
        console.log(`Batch ${batchNumber} completed: ${batchSuggestions.length} suggestions`);
      } catch (batchError) {
        console.error(`Batch ${batchNumber} failed:`, batchError);
        // Continue with next batch even if one fails
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate variance percentages
    const suggestionsWithVariance = allSuggestions.map(s => ({
      ...s,
      variance_percent: s.current_price > 0 
        ? Math.round(((s.suggested_avg - s.current_price) / s.current_price) * 100)
        : 0
    }));

    console.log(`Generated ${suggestionsWithVariance.length} market rate suggestions out of ${items.length} items`);

    return new Response(JSON.stringify({ 
      suggestions: suggestionsWithVariance,
      location,
      analyzed_at: new Date().toISOString(),
      total_items: items.length,
      analyzed_items: suggestionsWithVariance.length,
      batches_processed: totalBatches
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in suggest-market-rates:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes("402")) {
        return new Response(JSON.stringify({ error: "AI credits exhausted, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
