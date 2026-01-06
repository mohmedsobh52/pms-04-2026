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

interface EnhancedPricingSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  // Multi-analyzer results
  analyzers: {
    name: string;
    nameAr: string;
    suggested_price: number;
    confidence: number;
    methodology: string;
    source: string;
  }[];
  // Aggregated results
  final_suggested_price: number;
  price_range: { min: number; max: number };
  overall_confidence: number;
  consensus_score: number; // How much analyzers agree
  recommendation: string;
  recommendation_ar: string;
}

// Analyzer configurations
const ANALYZERS = [
  {
    id: "construction_expert",
    name: "Construction Expert",
    nameAr: "خبير البناء",
    systemPrompt: `You are a senior construction cost estimator with 20+ years experience in Saudi Arabia.
    Focus on:
    - Material costs based on current Saudi market (2024-2025)
    - Labor costs for different skill levels
    - Equipment rental rates
    - Regional price variations within KSA
    - Standard markup and profit margins (10-15%)
    Provide precise estimates based on your expertise.`,
    weight: 0.35
  },
  {
    id: "market_analyst",
    name: "Market Analyst",
    nameAr: "محلل السوق",
    systemPrompt: `You are a construction market analyst specializing in Saudi Arabian market trends.
    Focus on:
    - Current market conditions and supply/demand
    - Price trends for materials (steel, cement, aggregates)
    - Import costs and local manufacturing
    - Government projects vs private sector pricing
    - Vision 2030 impact on construction costs
    Analyze based on market dynamics.`,
    weight: 0.30
  },
  {
    id: "quantity_surveyor",
    name: "Quantity Surveyor",
    nameAr: "مهندس كميات",
    systemPrompt: `You are a certified quantity surveyor with expertise in BOQ pricing.
    Focus on:
    - Accurate quantity calculations
    - Unit rate breakdown (labor, material, equipment)
    - Wastage factors and contingencies
    - Productivity rates for different work types
    - Standard method of measurement
    Provide detailed cost breakdowns.`,
    weight: 0.25
  },
  {
    id: "risk_assessor",
    name: "Risk Assessor",
    nameAr: "مقيّم المخاطر",
    systemPrompt: `You are a construction risk analyst focusing on cost uncertainties.
    Focus on:
    - Price volatility risks
    - Supply chain disruptions
    - Currency fluctuations
    - Regulatory compliance costs
    - Safety and quality requirements
    Adjust prices considering risk factors.`,
    weight: 0.10
  }
];

const REQUEST_TIMEOUT_MS = 45000;

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

async function runAnalyzer(
  analyzer: typeof ANALYZERS[0],
  items: BOQItem[],
  location: string,
  apiKey: string,
  model: string
): Promise<{ analyzerId: string; results: any[] }> {
  const itemsSummary = items.map(item => ({
    item_number: item.item_number,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    current_price: item.unit_price || 0,
  }));

  const userPrompt = `Analyze these BOQ items for ${location}, Saudi Arabia. Provide accurate pricing.

Items:
${JSON.stringify(itemsSummary, null, 2)}

For each item, return:
- item_number
- suggested_price (SAR per unit)
- confidence (0-100)
- reasoning (brief explanation)`;

  try {
    const response = await fetchWithTimeout(
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
            { role: "system", content: analyzer.systemPrompt },
            { role: "user", content: userPrompt }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_prices",
                description: "Submit pricing analysis results",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item_number: { type: "string" },
                          suggested_price: { type: "number" },
                          confidence: { type: "number" },
                          reasoning: { type: "string" }
                        },
                        required: ["item_number", "suggested_price", "confidence"]
                      }
                    }
                  },
                  required: ["items"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "submit_prices" } }
        }),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error(`Analyzer ${analyzer.id} failed:`, response.status);
      return { analyzerId: analyzer.id, results: [] };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return { analyzerId: analyzer.id, results: parsed.items || [] };
    }

    return { analyzerId: analyzer.id, results: [] };
  } catch (error) {
    console.error(`Analyzer ${analyzer.id} error:`, error);
    return { analyzerId: analyzer.id, results: [] };
  }
}

function aggregateResults(
  items: BOQItem[],
  analyzerResults: { analyzerId: string; results: any[] }[],
  customWeights?: Record<string, number>
): EnhancedPricingSuggestion[] {
  return items.map(item => {
    const itemResults: { analyzer: typeof ANALYZERS[0]; result: any }[] = [];
    
    for (const ar of analyzerResults) {
      const analyzer = ANALYZERS.find(a => a.id === ar.analyzerId);
      const result = ar.results.find(r => r.item_number === item.item_number);
      if (analyzer && result) {
        itemResults.push({ analyzer, result });
      }
    }

    // Calculate weighted average using custom weights if provided
    let weightedSum = 0;
    let totalWeight = 0;
    const prices: number[] = [];
    const analyzersData: EnhancedPricingSuggestion['analyzers'] = [];

    for (const { analyzer, result } of itemResults) {
      const price = result.suggested_price || item.unit_price || 0;
      const confidence = result.confidence || 50;
      
      // Use custom weight if provided, otherwise use default
      const baseWeight = customWeights && customWeights[analyzer.id] !== undefined 
        ? customWeights[analyzer.id] 
        : analyzer.weight;
      
      const weight = baseWeight * (confidence / 100);
      
      weightedSum += price * weight;
      totalWeight += weight;
      prices.push(price);

      analyzersData.push({
        name: analyzer.name,
        nameAr: analyzer.nameAr,
        suggested_price: price,
        confidence: confidence,
        methodology: result.reasoning || "AI-based analysis",
        source: analyzer.id
      });
    }

    const finalPrice = totalWeight > 0 ? weightedSum / totalWeight : item.unit_price || 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : finalPrice * 0.85;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : finalPrice * 1.15;

    // Calculate consensus score (how much analyzers agree)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : finalPrice;
    const variance = prices.length > 0 
      ? prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const consensusScore = Math.max(0, Math.min(100, 100 - (stdDev / avgPrice) * 100));

    // Calculate overall confidence
    const avgConfidence = itemResults.length > 0
      ? itemResults.reduce((sum, { result }) => sum + (result.confidence || 50), 0) / itemResults.length
      : 50;

    // Generate recommendation
    const currentPrice = item.unit_price || 0;
    const variance_percent = currentPrice > 0 
      ? ((finalPrice - currentPrice) / currentPrice) * 100 
      : 0;

    let recommendation = "";
    let recommendation_ar = "";

    if (Math.abs(variance_percent) <= 5) {
      recommendation = "Price is well-aligned with market rates";
      recommendation_ar = "السعر متوافق مع أسعار السوق";
    } else if (variance_percent > 20) {
      recommendation = `Price is ${variance_percent.toFixed(1)}% above market. Consider reducing to ${finalPrice.toFixed(2)} SAR`;
      recommendation_ar = `السعر أعلى من السوق بـ ${variance_percent.toFixed(1)}%. يُنصح بتخفيضه إلى ${finalPrice.toFixed(2)} ر.س`;
    } else if (variance_percent < -20) {
      recommendation = `Price is ${Math.abs(variance_percent).toFixed(1)}% below market. May need review for profitability`;
      recommendation_ar = `السعر أقل من السوق بـ ${Math.abs(variance_percent).toFixed(1)}%. يحتاج مراجعة للربحية`;
    } else if (variance_percent > 0) {
      recommendation = `Price is slightly above market by ${variance_percent.toFixed(1)}%`;
      recommendation_ar = `السعر أعلى قليلاً من السوق بـ ${variance_percent.toFixed(1)}%`;
    } else {
      recommendation = `Price is slightly below market by ${Math.abs(variance_percent).toFixed(1)}%`;
      recommendation_ar = `السعر أقل قليلاً من السوق بـ ${Math.abs(variance_percent).toFixed(1)}%`;
    }

    return {
      item_number: item.item_number,
      description: item.description,
      current_price: currentPrice,
      analyzers: analyzersData,
      final_suggested_price: Math.round(finalPrice * 100) / 100,
      price_range: {
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100
      },
      overall_confidence: Math.round(avgConfidence),
      consensus_score: Math.round(consensusScore),
      recommendation,
      recommendation_ar
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      items, 
      location = "Riyadh",
      model = "google/gemini-2.5-flash",
      analyzers = ["construction_expert", "market_analyst", "quantity_surveyor", "risk_assessor"],
      weights
    }: { 
      items: BOQItem[]; 
      location: string;
      model?: string;
      analyzers?: string[];
      weights?: Record<string, number>;
    } = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Enhanced pricing analysis: ${items.length} items, ${analyzers.length} analyzers, location: ${location}`);

    // Filter active analyzers
    const activeAnalyzers = ANALYZERS.filter(a => analyzers.includes(a.id));

    // Process in batches of 10 items
    const BATCH_SIZE = 10;
    const allSuggestions: EnhancedPricingSuggestion[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batchItems = items.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);

      // Run all analyzers in parallel for this batch
      const analyzerPromises = activeAnalyzers.map(analyzer => 
        runAnalyzer(analyzer, batchItems, location, LOVABLE_API_KEY, model)
      );

      const analyzerResults = await Promise.all(analyzerPromises);
      
      // Aggregate results for this batch with custom weights
      const batchSuggestions = aggregateResults(batchItems, analyzerResults, weights);
      allSuggestions.push(...batchSuggestions);

      // Small delay between batches
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate summary statistics
    const avgConfidence = allSuggestions.length > 0
      ? allSuggestions.reduce((sum, s) => sum + s.overall_confidence, 0) / allSuggestions.length
      : 0;
    const avgConsensus = allSuggestions.length > 0
      ? allSuggestions.reduce((sum, s) => sum + s.consensus_score, 0) / allSuggestions.length
      : 0;

    console.log(`Analysis complete: ${allSuggestions.length} items, avg confidence: ${avgConfidence.toFixed(1)}%, avg consensus: ${avgConsensus.toFixed(1)}%`);

    return new Response(JSON.stringify({
      suggestions: allSuggestions,
      summary: {
        total_items: items.length,
        analyzed_items: allSuggestions.length,
        analyzers_used: activeAnalyzers.map(a => ({ id: a.id, name: a.name, nameAr: a.nameAr })),
        average_confidence: Math.round(avgConfidence),
        average_consensus: Math.round(avgConsensus),
        location,
        model_used: model,
        analyzed_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Enhanced pricing analysis error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes("402")) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
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
