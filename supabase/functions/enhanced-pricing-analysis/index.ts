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

// Reference prices for Saudi Arabia construction market (2024-2025) in SAR
const REFERENCE_PRICES = {
  // Earthwork
  "excavation_normal": { min: 8, max: 18, unit: "m³", description: "Normal soil excavation" },
  "excavation_rock": { min: 45, max: 120, unit: "m³", description: "Rock excavation" },
  "backfill_compacted": { min: 12, max: 25, unit: "m³", description: "Compacted backfill" },
  "earthwork_general": { min: 10, max: 30, unit: "m³", description: "General earthwork" },
  
  // Concrete Work
  "concrete_plain": { min: 350, max: 500, unit: "m³", description: "Plain concrete" },
  "concrete_reinforced": { min: 450, max: 750, unit: "m³", description: "Reinforced concrete" },
  "concrete_foundation": { min: 500, max: 850, unit: "m³", description: "Foundation concrete" },
  "concrete_slab": { min: 400, max: 650, unit: "m³", description: "Slab concrete" },
  "concrete_column": { min: 600, max: 950, unit: "m³", description: "Column concrete" },
  "concrete_beam": { min: 550, max: 900, unit: "m³", description: "Beam concrete" },
  
  // Reinforcement
  "rebar": { min: 3500, max: 5500, unit: "ton", description: "Steel reinforcement" },
  "rebar_kg": { min: 3.5, max: 5.5, unit: "kg", description: "Steel reinforcement per kg" },
  
  // Formwork
  "formwork_regular": { min: 80, max: 150, unit: "m²", description: "Regular formwork" },
  "formwork_fair_faced": { min: 120, max: 220, unit: "m²", description: "Fair-faced formwork" },
  
  // Blockwork & Masonry
  "block_20cm": { min: 45, max: 85, unit: "m²", description: "20cm hollow block" },
  "block_15cm": { min: 35, max: 65, unit: "m²", description: "15cm hollow block" },
  "block_10cm": { min: 30, max: 55, unit: "m²", description: "10cm hollow block" },
  "brick_work": { min: 120, max: 200, unit: "m²", description: "Brick masonry" },
  
  // Plastering
  "plaster_internal": { min: 25, max: 55, unit: "m²", description: "Internal plastering" },
  "plaster_external": { min: 35, max: 75, unit: "m²", description: "External plastering" },
  
  // Painting
  "paint_internal": { min: 18, max: 40, unit: "m²", description: "Internal painting" },
  "paint_external": { min: 25, max: 55, unit: "m²", description: "External painting" },
  
  // Flooring
  "tile_ceramic": { min: 80, max: 180, unit: "m²", description: "Ceramic tiles" },
  "tile_porcelain": { min: 120, max: 280, unit: "m²", description: "Porcelain tiles" },
  "marble_flooring": { min: 250, max: 600, unit: "m²", description: "Marble flooring" },
  "granite_flooring": { min: 280, max: 650, unit: "m²", description: "Granite flooring" },
  "epoxy_flooring": { min: 80, max: 180, unit: "m²", description: "Epoxy flooring" },
  
  // Waterproofing
  "waterproof_membrane": { min: 45, max: 120, unit: "m²", description: "Waterproofing membrane" },
  "insulation_thermal": { min: 35, max: 90, unit: "m²", description: "Thermal insulation" },
  
  // Doors & Windows
  "door_wooden": { min: 800, max: 2500, unit: "no", description: "Wooden door" },
  "door_steel": { min: 1200, max: 3500, unit: "no", description: "Steel door" },
  "window_aluminum": { min: 350, max: 750, unit: "m²", description: "Aluminum window" },
  "window_upvc": { min: 400, max: 900, unit: "m²", description: "UPVC window" },
  
  // MEP
  "pipe_pvc": { min: 15, max: 45, unit: "m", description: "PVC pipe" },
  "pipe_steel": { min: 80, max: 200, unit: "m", description: "Steel pipe" },
  "electrical_point": { min: 80, max: 180, unit: "point", description: "Electrical point" },
  "ac_split": { min: 2500, max: 6000, unit: "no", description: "Split AC unit" },
  
  // Structural Steel
  "steel_structure": { min: 8000, max: 15000, unit: "ton", description: "Structural steel" },
  "steel_cladding": { min: 120, max: 280, unit: "m²", description: "Steel cladding" },
  
  // Roads
  "asphalt": { min: 35, max: 85, unit: "m²", description: "Asphalt paving" },
  "interlock": { min: 80, max: 180, unit: "m²", description: "Interlock paving" },
  "curb_stone": { min: 45, max: 120, unit: "m", description: "Curb stone" },
};

// Analyzer configurations with detailed prompts
const ANALYZERS = [
  {
    id: "construction_expert",
    name: "Construction Expert",
    nameAr: "خبير البناء",
    systemPrompt: `You are a senior construction cost estimator with 25+ years experience in Saudi Arabia.

CRITICAL: You MUST provide realistic Saudi market prices. Use these reference ranges (SAR):

EARTHWORK:
- Normal excavation: 8-18 SAR/m³
- Rock excavation: 45-120 SAR/m³  
- Backfill compacted: 12-25 SAR/m³

CONCRETE WORK:
- Plain concrete: 350-500 SAR/m³
- Reinforced concrete: 450-750 SAR/m³
- Foundation concrete: 500-850 SAR/m³

REINFORCEMENT:
- Steel rebar: 3,500-5,500 SAR/ton
- Steel rebar: 3.5-5.5 SAR/kg

BLOCKWORK:
- 20cm block: 45-85 SAR/m²
- 15cm block: 35-65 SAR/m²

FINISHES:
- Internal plaster: 25-55 SAR/m²
- Ceramic tiles: 80-180 SAR/m²
- Painting: 18-40 SAR/m²

Your price MUST fall within these ranges based on:
- Riyadh: Base price
- Jeddah: +5-10%
- Dammam/Eastern: +3-8%
- Remote areas: +15-25%

Include: 10-15% contractor profit, 5% contingency`,
    weight: 0.30
  },
  {
    id: "market_analyst",
    name: "Market Analyst",
    nameAr: "محلل السوق",
    systemPrompt: `You are a construction market analyst for Saudi Arabia with access to current 2024-2025 pricing data.

CRITICAL REFERENCE PRICES (SAR) - Your estimates MUST align with these:

MATERIALS COST (Supply only, 2024-2025):
- Cement: 15-20 SAR/bag (50kg)
- Ready-mix concrete: 280-380 SAR/m³
- Steel rebar: 2,800-4,200 SAR/ton
- Hollow blocks 20cm: 3-5 SAR/piece
- Sand: 40-80 SAR/m³
- Aggregate: 50-100 SAR/m³

INSTALLED UNIT RATES (Material + Labor + Equipment):
- Excavation: 8-18 SAR/m³
- Reinforced concrete complete: 450-750 SAR/m³
- Block wall 20cm: 45-85 SAR/m²
- Plaster: 25-55 SAR/m²
- Tiles: 80-180 SAR/m²

LABOR RATES (2024):
- Unskilled: 80-120 SAR/day
- Skilled: 150-250 SAR/day
- Foreman: 250-400 SAR/day

Vision 2030 projects: Add 10-20% premium
Government contracts: Standard rates
Private sector: -5 to +15% variance`,
    weight: 0.30
  },
  {
    id: "quantity_surveyor",
    name: "Quantity Surveyor",
    nameAr: "مهندس كميات",
    systemPrompt: `You are a certified quantity surveyor (RICS/AACE) practicing in Saudi Arabia.

CRITICAL: Calculate unit rates using this breakdown methodology:

EXAMPLE - Reinforced Concrete (per m³):
- Ready-mix concrete: 320 SAR
- Reinforcement (80kg avg): 320 SAR  
- Formwork (amortized): 80 SAR
- Labor (placement): 100 SAR
- Equipment: 40 SAR
- Subtotal: 860 SAR
- Overhead 10%: 86 SAR
- Profit 12%: 113 SAR
- TOTAL: ~1,059 SAR/m³ (high-end)

EXAMPLE - Block Wall 20cm (per m²):
- Blocks (12.5 pcs): 45 SAR
- Mortar: 8 SAR
- Labor: 15 SAR
- Scaffold: 5 SAR
- Overhead & Profit: 12 SAR
- TOTAL: ~85 SAR/m² (high-end)

PRODUCTIVITY RATES:
- Concrete placement: 15-25 m³/day/crew
- Block laying: 25-40 m²/day/mason
- Plastering: 15-25 m²/day
- Tiling: 8-15 m²/day

Apply 3-5% wastage for materials.
Your prices MUST be buildable from these components.`,
    weight: 0.25
  },
  {
    id: "database_comparator",
    name: "Historical Database",
    nameAr: "قاعدة بيانات تاريخية",
    systemPrompt: `You are an AI with access to Saudi construction project databases.

VERIFIED PROJECT PRICES (2023-2025 actual bids):

INFRASTRUCTURE PROJECTS:
- Road excavation: 10-15 SAR/m³
- Subbase: 25-45 SAR/m³
- Asphalt 5cm: 35-55 SAR/m²
- Curb stone: 50-90 SAR/m

BUILDING PROJECTS:
- Reinforced concrete (foundation): 550-750 SAR/m³
- Reinforced concrete (superstructure): 480-680 SAR/m³
- Hollow block wall 20cm: 55-75 SAR/m²
- Internal plaster: 30-45 SAR/m²
- External plaster: 40-60 SAR/m²
- Ceramic floor tiles: 100-160 SAR/m²
- Paint 3 coats: 22-35 SAR/m²

INDUSTRIAL PROJECTS:
- Steel structure: 9,000-13,000 SAR/ton
- Metal cladding: 140-220 SAR/m²
- Epoxy flooring: 90-150 SAR/m²

Your estimates should match these verified ranges.
Confidence should be 85%+ if within range, lower if outside.`,
    weight: 0.15
  }
];

// Location price adjustments
const LOCATION_FACTORS: Record<string, number> = {
  "Riyadh": 1.0,
  "Jeddah": 1.08,
  "Dammam": 1.05,
  "Makkah": 1.12,
  "Madinah": 1.10,
  "Neom": 1.35,
  "Jubail": 1.08,
  "Yanbu": 1.12,
  "Abha": 1.15,
  "Tabuk": 1.18,
};

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

// Match description to reference price category
function matchToReferencePrice(description: string, unit: string): { category: string; ref: any } | null {
  const desc = description.toLowerCase();
  const unitLower = unit.toLowerCase();
  
  // Earthwork
  if (desc.includes("excavat") || desc.includes("حفر")) {
    if (desc.includes("rock") || desc.includes("صخر")) {
      return { category: "excavation_rock", ref: REFERENCE_PRICES.excavation_rock };
    }
    return { category: "excavation_normal", ref: REFERENCE_PRICES.excavation_normal };
  }
  if (desc.includes("backfill") || desc.includes("ردم")) {
    return { category: "backfill_compacted", ref: REFERENCE_PRICES.backfill_compacted };
  }
  
  // Concrete
  if (desc.includes("concrete") || desc.includes("خرسان")) {
    if (desc.includes("foundation") || desc.includes("أساس")) {
      return { category: "concrete_foundation", ref: REFERENCE_PRICES.concrete_foundation };
    }
    if (desc.includes("column") || desc.includes("عمود")) {
      return { category: "concrete_column", ref: REFERENCE_PRICES.concrete_column };
    }
    if (desc.includes("beam") || desc.includes("كمر")) {
      return { category: "concrete_beam", ref: REFERENCE_PRICES.concrete_beam };
    }
    if (desc.includes("slab") || desc.includes("بلاط") || desc.includes("سقف")) {
      return { category: "concrete_slab", ref: REFERENCE_PRICES.concrete_slab };
    }
    if (desc.includes("reinforc") || desc.includes("مسلح")) {
      return { category: "concrete_reinforced", ref: REFERENCE_PRICES.concrete_reinforced };
    }
    return { category: "concrete_plain", ref: REFERENCE_PRICES.concrete_plain };
  }
  
  // Reinforcement
  if (desc.includes("rebar") || desc.includes("reinforcement") || desc.includes("حديد تسليح") || desc.includes("تسليح")) {
    if (unitLower.includes("kg") || unitLower.includes("كجم")) {
      return { category: "rebar_kg", ref: REFERENCE_PRICES.rebar_kg };
    }
    return { category: "rebar", ref: REFERENCE_PRICES.rebar };
  }
  
  // Blockwork
  if (desc.includes("block") || desc.includes("بلوك")) {
    if (desc.includes("20") || desc.includes("٢٠")) {
      return { category: "block_20cm", ref: REFERENCE_PRICES.block_20cm };
    }
    if (desc.includes("15") || desc.includes("١٥")) {
      return { category: "block_15cm", ref: REFERENCE_PRICES.block_15cm };
    }
    if (desc.includes("10") || desc.includes("١٠")) {
      return { category: "block_10cm", ref: REFERENCE_PRICES.block_10cm };
    }
    return { category: "block_20cm", ref: REFERENCE_PRICES.block_20cm };
  }
  
  // Plaster
  if (desc.includes("plaster") || desc.includes("لياسة") || desc.includes("بياض")) {
    if (desc.includes("external") || desc.includes("خارج")) {
      return { category: "plaster_external", ref: REFERENCE_PRICES.plaster_external };
    }
    return { category: "plaster_internal", ref: REFERENCE_PRICES.plaster_internal };
  }
  
  // Paint
  if (desc.includes("paint") || desc.includes("دهان")) {
    if (desc.includes("external") || desc.includes("خارج")) {
      return { category: "paint_external", ref: REFERENCE_PRICES.paint_external };
    }
    return { category: "paint_internal", ref: REFERENCE_PRICES.paint_internal };
  }
  
  // Tiles
  if (desc.includes("tile") || desc.includes("بلاط") || desc.includes("سيراميك")) {
    if (desc.includes("porcelain") || desc.includes("بورسلين")) {
      return { category: "tile_porcelain", ref: REFERENCE_PRICES.tile_porcelain };
    }
    if (desc.includes("marble") || desc.includes("رخام")) {
      return { category: "marble_flooring", ref: REFERENCE_PRICES.marble_flooring };
    }
    if (desc.includes("granite") || desc.includes("جرانيت")) {
      return { category: "granite_flooring", ref: REFERENCE_PRICES.granite_flooring };
    }
    return { category: "tile_ceramic", ref: REFERENCE_PRICES.tile_ceramic };
  }
  
  // Formwork
  if (desc.includes("formwork") || desc.includes("شدة") || desc.includes("قوالب")) {
    if (desc.includes("fair") || desc.includes("ظاهر")) {
      return { category: "formwork_fair_faced", ref: REFERENCE_PRICES.formwork_fair_faced };
    }
    return { category: "formwork_regular", ref: REFERENCE_PRICES.formwork_regular };
  }
  
  // Waterproofing
  if (desc.includes("waterproof") || desc.includes("عزل مائي")) {
    return { category: "waterproof_membrane", ref: REFERENCE_PRICES.waterproof_membrane };
  }
  if (desc.includes("insulation") || desc.includes("عزل حراري")) {
    return { category: "insulation_thermal", ref: REFERENCE_PRICES.insulation_thermal };
  }
  
  // Asphalt
  if (desc.includes("asphalt") || desc.includes("أسفلت")) {
    return { category: "asphalt", ref: REFERENCE_PRICES.asphalt };
  }
  if (desc.includes("interlock")) {
    return { category: "interlock", ref: REFERENCE_PRICES.interlock };
  }
  
  return null;
}

async function runAnalyzer(
  analyzer: typeof ANALYZERS[0],
  items: BOQItem[],
  location: string,
  apiKey: string,
  model: string
): Promise<{ analyzerId: string; results: any[] }> {
  const locationFactor = LOCATION_FACTORS[location] || 1.0;
  
  // Enrich items with reference prices
  const itemsSummary = items.map(item => {
    const ref = matchToReferencePrice(item.description, item.unit);
    return {
      item_number: item.item_number,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      current_price: item.unit_price || 0,
      reference_range: ref ? {
        category: ref.category,
        min: Math.round(ref.ref.min * locationFactor),
        max: Math.round(ref.ref.max * locationFactor),
        note: ref.ref.description
      } : null
    };
  });

  const userPrompt = `CRITICAL: Analyze these BOQ items for ${location}, Saudi Arabia.
  
Location factor: ${locationFactor} (applied to base Riyadh prices)

Items with reference price ranges where available:
${JSON.stringify(itemsSummary, null, 2)}

IMPORTANT INSTRUCTIONS:
1. If a reference_range is provided, your suggested_price MUST be within that range
2. If no reference, estimate based on similar items in Saudi market
3. Prices are in SAR per unit
4. Include all costs: material, labor, equipment, overhead, profit
5. Be REALISTIC - these are construction tender prices

For each item, return:
- item_number: exactly as provided
- suggested_price: realistic SAR per unit (MUST be within reference range if provided)
- confidence: 0-100 (higher if within reference range)
- reasoning: brief explanation with cost breakdown`;

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
  customWeights?: Record<string, number>,
  location?: string
): EnhancedPricingSuggestion[] {
  const locationFactor = LOCATION_FACTORS[location || "Riyadh"] || 1.0;
  
  return items.map(item => {
    const itemResults: { analyzer: typeof ANALYZERS[0]; result: any }[] = [];
    const ref = matchToReferencePrice(item.description, item.unit);
    
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
      let price = result.suggested_price || item.unit_price || 0;
      let confidence = result.confidence || 50;
      
      // Validate against reference range and adjust confidence
      if (ref) {
        const refMin = ref.ref.min * locationFactor;
        const refMax = ref.ref.max * locationFactor;
        
        if (price < refMin) {
          // Price too low, adjust upward
          price = refMin + (refMax - refMin) * 0.3;
          confidence = Math.max(40, confidence - 20);
        } else if (price > refMax * 1.5) {
          // Price way too high, adjust downward
          price = refMax;
          confidence = Math.max(40, confidence - 30);
        } else if (price > refMax) {
          // Price slightly high, minor adjustment
          price = refMax * 0.95;
          confidence = Math.max(50, confidence - 10);
        } else {
          // Within range, boost confidence
          confidence = Math.min(95, confidence + 10);
        }
      }
      
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
        suggested_price: Math.round(price * 100) / 100,
        confidence: confidence,
        methodology: result.reasoning || "AI-based analysis",
        source: analyzer.id
      });
    }

    // If we have a reference but no AI results, use reference midpoint
    let finalPrice: number;
    if (totalWeight > 0) {
      finalPrice = weightedSum / totalWeight;
    } else if (ref) {
      finalPrice = ((ref.ref.min + ref.ref.max) / 2) * locationFactor;
    } else {
      finalPrice = item.unit_price || 0;
    }
    
    // Final validation against reference
    if (ref) {
      const refMin = ref.ref.min * locationFactor;
      const refMax = ref.ref.max * locationFactor;
      finalPrice = Math.max(refMin, Math.min(refMax, finalPrice));
    }
    
    const minPrice = ref ? ref.ref.min * locationFactor : (prices.length > 0 ? Math.min(...prices) : finalPrice * 0.85);
    const maxPrice = ref ? ref.ref.max * locationFactor : (prices.length > 0 ? Math.max(...prices) : finalPrice * 1.15);

    // Calculate consensus score (how much analyzers agree)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : finalPrice;
    const variance = prices.length > 0 
      ? prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const consensusScore = Math.max(0, Math.min(100, 100 - (stdDev / (avgPrice || 1)) * 100));

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
      const batchSuggestions = aggregateResults(batchItems, analyzerResults, weights, location);
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
