import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BOQItem {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface ComparisonItem {
  itemCode: string;
  description: string;
  tender: {
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  } | null;
  budget: {
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  } | null;
  variance: {
    quantity: number;
    quantityPercent: number;
    rate: number;
    ratePercent: number;
    cost: number;
    costPercent: number;
  };
  status: 'Added' | 'Omitted' | 'Modified' | 'Matched';
  riskFlag: 'High Risk' | 'Opportunity' | 'Neutral';
  matchConfidence: number;
  recommendation: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface CategoryVariance {
  category: string;
  tenderAmount: number;
  budgetAmount: number;
  variance: number;
  variancePercent: number;
  itemCount: number;
}

interface ComparisonResult {
  summary: {
    tenderTotal: number;
    budgetTotal: number;
    totalVariance: number;
    totalVariancePercent: number;
    addedItemsCount: number;
    omittedItemsCount: number;
    modifiedItemsCount: number;
    matchedItemsCount: number;
    highRiskCount: number;
    opportunityCount: number;
  };
  comparisonItems: ComparisonItem[];
  categoryVariances: CategoryVariance[];
  highRiskItems: ComparisonItem[];
  opportunities: ComparisonItem[];
  addedItems: ComparisonItem[];
  omittedItems: ComparisonItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenderText, budgetText } = await req.json();

    if (!tenderText || !budgetText) {
      throw new Error("Both Tender and Budget BOQ texts are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting BOQ comparison analysis...");
    console.log("Tender text length:", tenderText.length);
    console.log("Budget text length:", budgetText.length);

    const systemPrompt = `You are a Commercial and Cost Control Specialist expert in BOQ comparison and variance analysis.

Your task is to:
1. Parse and extract BOQ items from both Tender BOQ and Budget BOQ texts
2. Match items using fuzzy matching on description, unit, and scope
3. Identify differences: Added items, Omitted items, Modified items, and Matched items
4. Calculate variances for quantity, rate, and cost
5. Flag commercial risks and opportunities

IMPORTANT RULES:
- Match items by semantic similarity of descriptions, not just exact match
- Consider unit compatibility (e.g., m³ vs cubic meter)
- An item is "Modified" if matched but has quantity or rate differences
- An item is "Matched" only if quantity, unit, and rate are identical or within 1% tolerance
- "Added" items exist in Tender but not in Budget
- "Omitted" items exist in Budget but not in Tender
- Flag items with >10% variance or high value (>50,000 SAR) as "High Risk"
- Flag items where Tender is lower than Budget as "Opportunity"

Return a JSON object with this EXACT structure:
{
  "tenderItems": [
    {"itemCode": "string", "description": "string", "unit": "string", "quantity": number, "rate": number, "amount": number, "category": "string"}
  ],
  "budgetItems": [
    {"itemCode": "string", "description": "string", "unit": "string", "quantity": number, "rate": number, "amount": number, "category": "string"}
  ],
  "matchedPairs": [
    {"tenderIndex": number, "budgetIndex": number, "confidence": number}
  ],
  "categories": ["string"]
}

Extract ALL items found in both documents. Parse numeric values carefully, handling Arabic/English number formats.`;

    const userPrompt = `Compare these two BOQ documents and extract structured data:

=== TENDER BOQ ===
${tenderText.slice(0, 15000)}

=== BUDGET BOQ ===
${budgetText.slice(0, 15000)}

Extract all items from both BOQs and identify matching pairs based on description similarity.`;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limits exceeded, please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    console.log("AI response received, parsing...");

    // Parse AI response
    let parsedData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse comparison results");
    }

    const tenderItems: BOQItem[] = parsedData.tenderItems || [];
    const budgetItems: BOQItem[] = parsedData.budgetItems || [];
    const matchedPairs = parsedData.matchedPairs || [];
    const categories = parsedData.categories || [];

    // Helper function to determine recommendation and priority
    const getRecommendationAndPriority = (
      status: string,
      riskFlag: string,
      costVariance: number,
      costVariancePercent: number,
      rateVariancePercent: number,
      qtyVariancePercent: number
    ): { recommendation: string; priority: 'Critical' | 'High' | 'Medium' | 'Low' } => {
      let recommendation = '';
      let priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';

      if (status === 'Added') {
        if (Math.abs(costVariance) > 100000) {
          recommendation = 'Critical scope addition - Verify necessity and negotiate terms';
          priority = 'Critical';
        } else if (Math.abs(costVariance) > 50000) {
          recommendation = 'Review scope addition - Assess impact on budget';
          priority = 'High';
        } else {
          recommendation = 'New scope item - Confirm requirement';
          priority = 'Medium';
        }
      } else if (status === 'Omitted') {
        if (Math.abs(costVariance) > 100000) {
          recommendation = 'Major scope exclusion - Verify intentional and impact';
          priority = 'Critical';
        } else if (Math.abs(costVariance) > 50000) {
          recommendation = 'Significant omission - Confirm scope exclusion is acceptable';
          priority = 'High';
        } else {
          recommendation = 'Scope exclusion - Verify with stakeholders';
          priority = 'Medium';
        }
      } else if (status === 'Matched') {
        recommendation = 'Accept - No action required';
        priority = 'Low';
      } else {
        // Modified items
        if (riskFlag === 'High Risk') {
          if (costVariancePercent > 20) {
            recommendation = 'Critical overrun - Immediate negotiation required';
            priority = 'Critical';
          } else if (Math.abs(rateVariancePercent) > Math.abs(qtyVariancePercent)) {
            recommendation = 'Negotiate rate - Rate variance driving cost impact';
            priority = 'High';
          } else {
            recommendation = 'Review quantity - Verify scope measurement';
            priority = 'High';
          }
        } else if (riskFlag === 'Opportunity') {
          recommendation = 'Lock in favorable rate - Cost saving opportunity';
          priority = 'Medium';
        } else {
          if (Math.abs(rateVariancePercent) > 5) {
            recommendation = 'Minor rate variance - Monitor';
            priority = 'Low';
          } else if (Math.abs(qtyVariancePercent) > 5) {
            recommendation = 'Minor quantity variance - Verify measurement';
            priority = 'Low';
          } else {
            recommendation = 'Accept - Within tolerance';
            priority = 'Low';
          }
        }
      }

      return { recommendation, priority };
    };

    // Build comparison items
    const comparisonItems: ComparisonItem[] = [];
    const usedTenderIndices = new Set<number>();
    const usedBudgetIndices = new Set<number>();

    // Process matched pairs
    for (const pair of matchedPairs) {
      const tenderItem = tenderItems[pair.tenderIndex];
      const budgetItem = budgetItems[pair.budgetIndex];
      
      if (!tenderItem || !budgetItem) continue;

      usedTenderIndices.add(pair.tenderIndex);
      usedBudgetIndices.add(pair.budgetIndex);

      const qtyVariance = tenderItem.quantity - budgetItem.quantity;
      const qtyVariancePercent = budgetItem.quantity > 0 ? (qtyVariance / budgetItem.quantity) * 100 : 0;
      const rateVariance = tenderItem.rate - budgetItem.rate;
      const rateVariancePercent = budgetItem.rate > 0 ? (rateVariance / budgetItem.rate) * 100 : 0;
      const costVariance = tenderItem.amount - budgetItem.amount;
      const costVariancePercent = budgetItem.amount > 0 ? (costVariance / budgetItem.amount) * 100 : 0;

      const isMatched = Math.abs(qtyVariancePercent) < 1 && Math.abs(rateVariancePercent) < 1;
      
      let riskFlag: 'High Risk' | 'Opportunity' | 'Neutral' = 'Neutral';
      if (Math.abs(costVariancePercent) > 10 || Math.abs(costVariance) > 50000) {
        riskFlag = costVariance > 0 ? 'High Risk' : 'Opportunity';
      }

      const status = isMatched ? 'Matched' : 'Modified';
      const { recommendation, priority } = getRecommendationAndPriority(
        status, riskFlag, costVariance, costVariancePercent, rateVariancePercent, qtyVariancePercent
      );

      comparisonItems.push({
        itemCode: tenderItem.itemCode || budgetItem.itemCode,
        description: tenderItem.description || budgetItem.description,
        tender: {
          quantity: tenderItem.quantity,
          unit: tenderItem.unit,
          rate: tenderItem.rate,
          amount: tenderItem.amount,
        },
        budget: {
          quantity: budgetItem.quantity,
          unit: budgetItem.unit,
          rate: budgetItem.rate,
          amount: budgetItem.amount,
        },
        variance: {
          quantity: qtyVariance,
          quantityPercent: qtyVariancePercent,
          rate: rateVariance,
          ratePercent: rateVariancePercent,
          cost: costVariance,
          costPercent: costVariancePercent,
        },
        status,
        riskFlag,
        matchConfidence: pair.confidence || 0.8,
        recommendation,
        priority,
      });
    }

    // Process added items (in Tender, not in Budget)
    tenderItems.forEach((item, index) => {
      if (!usedTenderIndices.has(index)) {
        const riskFlag: 'High Risk' | 'Opportunity' | 'Neutral' = item.amount > 50000 ? 'High Risk' : 'Neutral';
        const { recommendation, priority } = getRecommendationAndPriority(
          'Added', riskFlag, item.amount, 100, 100, 100
        );
        
        comparisonItems.push({
          itemCode: item.itemCode,
          description: item.description,
          tender: {
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          },
          budget: null,
          variance: {
            quantity: item.quantity,
            quantityPercent: 100,
            rate: item.rate,
            ratePercent: 100,
            cost: item.amount,
            costPercent: 100,
          },
          status: 'Added',
          riskFlag,
          matchConfidence: 0,
          recommendation,
          priority,
        });
      }
    });

    // Process omitted items (in Budget, not in Tender)
    budgetItems.forEach((item, index) => {
      if (!usedBudgetIndices.has(index)) {
        const riskFlag: 'High Risk' | 'Opportunity' | 'Neutral' = item.amount > 50000 ? 'Opportunity' : 'Neutral';
        const { recommendation, priority } = getRecommendationAndPriority(
          'Omitted', riskFlag, -item.amount, -100, -100, -100
        );
        
        comparisonItems.push({
          itemCode: item.itemCode,
          description: item.description,
          tender: null,
          budget: {
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          },
          variance: {
            quantity: -item.quantity,
            quantityPercent: -100,
            rate: -item.rate,
            ratePercent: -100,
            cost: -item.amount,
            costPercent: -100,
          },
          status: 'Omitted',
          riskFlag,
          matchConfidence: 0,
          recommendation,
          priority,
        });
      }
    });

    // Calculate summary
    const tenderTotal = tenderItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const budgetTotal = budgetItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalVariance = tenderTotal - budgetTotal;
    const totalVariancePercent = budgetTotal > 0 ? (totalVariance / budgetTotal) * 100 : 0;

    const addedItems = comparisonItems.filter(i => i.status === 'Added');
    const omittedItems = comparisonItems.filter(i => i.status === 'Omitted');
    const modifiedItems = comparisonItems.filter(i => i.status === 'Modified');
    const matchedItems = comparisonItems.filter(i => i.status === 'Matched');
    const highRiskItems = comparisonItems.filter(i => i.riskFlag === 'High Risk');
    const opportunities = comparisonItems.filter(i => i.riskFlag === 'Opportunity');

    // Calculate category variances
    const categoryMap = new Map<string, CategoryVariance>();
    
    for (const item of comparisonItems) {
      const category = extractCategory(item.description);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          tenderAmount: 0,
          budgetAmount: 0,
          variance: 0,
          variancePercent: 0,
          itemCount: 0,
        });
      }
      
      const cat = categoryMap.get(category)!;
      cat.tenderAmount += item.tender?.amount || 0;
      cat.budgetAmount += item.budget?.amount || 0;
      cat.itemCount++;
    }

    const categoryVariances: CategoryVariance[] = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      variance: cat.tenderAmount - cat.budgetAmount,
      variancePercent: cat.budgetAmount > 0 ? ((cat.tenderAmount - cat.budgetAmount) / cat.budgetAmount) * 100 : 0,
    }));

    const result: ComparisonResult = {
      summary: {
        tenderTotal,
        budgetTotal,
        totalVariance,
        totalVariancePercent,
        addedItemsCount: addedItems.length,
        omittedItemsCount: omittedItems.length,
        modifiedItemsCount: modifiedItems.length,
        matchedItemsCount: matchedItems.length,
        highRiskCount: highRiskItems.length,
        opportunityCount: opportunities.length,
      },
      comparisonItems,
      categoryVariances,
      highRiskItems,
      opportunities,
      addedItems,
      omittedItems,
    };

    console.log("Comparison complete:", {
      tenderItems: tenderItems.length,
      budgetItems: budgetItems.length,
      matched: matchedItems.length,
      added: addedItems.length,
      omitted: omittedItems.length,
      modified: modifiedItems.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("BOQ comparison error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Please ensure both BOQ files are uploaded correctly and contain valid data."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('excavat') || lowerDesc.includes('حفر') || lowerDesc.includes('earth')) {
    return 'Earthworks';
  }
  if (lowerDesc.includes('concrete') || lowerDesc.includes('خرسان')) {
    return 'Concrete Works';
  }
  if (lowerDesc.includes('steel') || lowerDesc.includes('reinforc') || lowerDesc.includes('حديد') || lowerDesc.includes('تسليح')) {
    return 'Steel & Reinforcement';
  }
  if (lowerDesc.includes('block') || lowerDesc.includes('brick') || lowerDesc.includes('masonry') || lowerDesc.includes('بناء') || lowerDesc.includes('طوب')) {
    return 'Masonry';
  }
  if (lowerDesc.includes('plaster') || lowerDesc.includes('paint') || lowerDesc.includes('finish') || lowerDesc.includes('تشطيب') || lowerDesc.includes('دهان')) {
    return 'Finishes';
  }
  if (lowerDesc.includes('electric') || lowerDesc.includes('كهرب')) {
    return 'Electrical';
  }
  if (lowerDesc.includes('plumb') || lowerDesc.includes('sanitary') || lowerDesc.includes('صحي') || lowerDesc.includes('سباكة')) {
    return 'Plumbing';
  }
  if (lowerDesc.includes('hvac') || lowerDesc.includes('air') || lowerDesc.includes('تكييف')) {
    return 'HVAC';
  }
  if (lowerDesc.includes('door') || lowerDesc.includes('window') || lowerDesc.includes('باب') || lowerDesc.includes('نافذ')) {
    return 'Doors & Windows';
  }
  if (lowerDesc.includes('roof') || lowerDesc.includes('سقف')) {
    return 'Roofing';
  }
  if (lowerDesc.includes('prelim') || lowerDesc.includes('general') || lowerDesc.includes('أعمال عامة')) {
    return 'Preliminaries';
  }
  
  return 'General';
}
