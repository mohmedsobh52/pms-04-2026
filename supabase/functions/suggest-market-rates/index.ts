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

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000; // Increased timeout to 60 seconds

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Exponential backoff retry logic
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = MAX_RETRIES,
  initialDelayMs: number = INITIAL_DELAY_MS
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries}...`);
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's an abort error (timeout)
      if (lastError.name === 'AbortError') {
        console.error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        lastError = new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
      }
      
      // If not the last attempt, wait with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed after ${maxRetries} attempts`);
}

// Process items in batches to handle large BOQ files
async function processBatch(
  items: BOQItem[],
  location: string,
  apiKey: string,
  model: string = "google/gemini-2.5-flash"
): Promise<{ suggestions: MarketRateSuggestion[]; isAI: boolean }> {
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

  const response = await fetchWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
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
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  // Read response text first to handle empty/malformed responses
  const responseText = await response.text();
  console.log(`Response text length: ${responseText.length}`);
  
  if (!responseText || responseText.trim() === "") {
    console.error("Empty response from AI Gateway");
    throw new Error("Empty response from AI. Please try again.");
  }
  
  let aiResponse;
  try {
    aiResponse = JSON.parse(responseText);
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    console.error("Response preview:", responseText.slice(0, 500));
    throw new Error("Invalid response from AI. Please try again.");
  }

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

  return { suggestions, isAI: suggestions.length > 0 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, location = "Riyadh", model = "google/gemini-2.5-flash" }: { items: BOQItem[]; location: string; model?: string } = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing market rates for ${items.length} items in ${location} using model: ${model}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Process in batches of 15 items (reduced for better reliability)
    const BATCH_SIZE = 15;
    const allSuggestions: MarketRateSuggestion[] = [];
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);
    let aiSuccessCount = 0;
    let fallbackCount = 0;
    
    console.log(`Processing ${totalBatches} batches of ${BATCH_SIZE} items each`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batchItems.length} items)`);
      
      try {
        const batchResult = await processBatch(batchItems, location, LOVABLE_API_KEY, model);
        allSuggestions.push(...batchResult.suggestions);
        if (batchResult.isAI) {
          aiSuccessCount += batchResult.suggestions.length;
        }
        console.log(`Batch ${batchNumber} completed: ${batchResult.suggestions.length} suggestions (AI: ${batchResult.isAI})`);
      } catch (batchError) {
        console.error(`Batch ${batchNumber} failed:`, batchError);
        // Generate fallback suggestions for failed items
        const fallbackSuggestions = batchItems.map(item => ({
          item_number: item.item_number,
          description: item.description,
          current_price: item.unit_price || 0,
          suggested_min: (item.unit_price || 100) * 0.85,
          suggested_max: (item.unit_price || 100) * 1.15,
          suggested_avg: item.unit_price || 100,
          confidence: "Low" as const,
          trend: "Stable" as const,
          notes: "Fallback estimate - AI analysis unavailable",
          variance_percent: 0
        }));
        allSuggestions.push(...fallbackSuggestions);
        fallbackCount += fallbackSuggestions.length;
        console.log(`Batch ${batchNumber} using ${fallbackSuggestions.length} fallback suggestions`);
      }
      
      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
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
      batches_processed: totalBatches,
      model_used: model,
      data_source: {
        ai_count: aiSuccessCount,
        fallback_count: fallbackCount,
        ai_rate: items.length > 0 ? ((aiSuccessCount / items.length) * 100).toFixed(1) : "0"
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in suggest-market-rates:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again in a few minutes." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes("402")) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes("timed out")) {
        return new Response(JSON.stringify({ error: "Request timed out. Please try again with fewer items." }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
