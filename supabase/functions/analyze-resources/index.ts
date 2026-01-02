import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

interface ResourceAnalysis {
  type: 'labor' | 'equipment' | 'material';
  name: string;
  category: string;
  quantity: number;
  unit: string;
  rate_per_day: number;
  total_cost: number;
  start_date: string;
  end_date: string;
  utilization_percent: number;
  productivity_rate: number;
  ai_reasoning: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, projectStartDate, projectDuration = 180, language = 'ar' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided for analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing resources for ${items.length} items...`);

    const isArabic = language === 'ar';
    const startDate = projectStartDate ? new Date(projectStartDate) : new Date();

    const systemPrompt = `You are an expert Construction Resource Planner specializing in Saudi Arabia's construction industry.

Your task is to analyze BOQ items and estimate the required resources:
1. Labor - number of workers, skill level, daily rates
2. Equipment - machines needed, rental rates
3. Materials - already in BOQ, just need allocation

## Saudi Market Rates (Daily):
### Labor:
- General laborer: 80-120 SAR/day
- Skilled worker (mason, carpenter): 150-250 SAR/day
- Technician (electrical, HVAC): 200-350 SAR/day
- Foreman: 300-450 SAR/day
- Engineer: 500-800 SAR/day

### Equipment:
- Excavator (small): 800-1,200 SAR/day
- Excavator (large): 1,500-2,500 SAR/day
- Crane (mobile): 2,000-4,000 SAR/day
- Tower crane: 3,000-6,000 SAR/day
- Concrete pump: 1,500-2,500 SAR/day
- Forklift: 400-800 SAR/day
- Compactor: 300-500 SAR/day

## Productivity Standards (Saudi conditions):
- Concrete pouring: 15-25 m³/day per crew
- Rebar installation: 1.5-2.5 tons/day per crew
- Block work: 15-25 m²/day per mason
- Tile work: 10-20 m²/day per tiler
- Painting: 40-60 m²/day per painter
- Plastering: 15-25 m²/day per plasterer

## Utilization Guidelines:
- Equipment: 60-80% utilization is realistic
- Labor: 70-90% utilization is typical
- Peak periods may reach 95%

Respond in ${isArabic ? 'Arabic' : 'English'}.`;

    const userPrompt = `Analyze the following BOQ items and estimate required resources:

Project Start Date: ${startDate.toISOString().split('T')[0]}
Project Duration: ${projectDuration} days

BOQ ITEMS:
${items.map((item: BOQItem, idx: number) => `
[${idx + 1}] ${item.item_number}: ${item.description}
    Quantity: ${item.quantity} ${item.unit}
    Cost: ${item.total_price || item.quantity * (item.unit_price || 0)} SAR
    Category: ${item.category || 'General'}
`).join('\n')}

For each relevant item, estimate the required resources:

Return as JSON with this structure:
{
  "resource_analysis": [
    {
      "boq_item_number": "related BOQ item",
      "type": "labor|equipment|material",
      "name": "resource name in ${isArabic ? 'Arabic' : 'English'}",
      "category": "work category",
      "quantity": 0,
      "unit": "worker|unit|ton|m³",
      "rate_per_day": 0,
      "total_cost": 0,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "duration_days": 0,
      "utilization_percent": 80,
      "productivity_rate": 0,
      "ai_reasoning": "brief explanation"
    }
  ],
  "summary": {
    "total_labor_cost": 0,
    "total_equipment_cost": 0,
    "peak_workers": 0,
    "peak_equipment_units": 0
  }
}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
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
    let content = data.choices?.[0]?.message?.content || "";

    // Clean up response
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      
      // Generate deterministic fallback data based on BOQ items (no random values)
      const resources: ResourceAnalysis[] = [];
      let totalLaborCost = 0;
      let totalEquipmentCost = 0;
      let cumulativeDays = 0;
      
      items.forEach((item: BOQItem, index: number) => {
        const totalCost = item.total_price || item.quantity * (item.unit_price || 0);
        const category = item.category || 'General';
        const desc = item.description.toLowerCase();
        
        // Calculate deterministic values based on item properties
        const { laborRate, laborDays, laborCount, equipmentRate, equipDays, utilizationLabor, utilizationEquip, productivityLabor, productivityEquip } = 
          getResourceEstimates(desc, category, totalCost, item.quantity);
        
        // Labor resource
        const laborCost = totalCost * 0.35;
        const laborStart = new Date(startDate);
        laborStart.setDate(laborStart.getDate() + cumulativeDays);
        const laborEnd = new Date(laborStart);
        laborEnd.setDate(laborEnd.getDate() + laborDays);
        
        resources.push({
          type: 'labor',
          name: getResourceName(desc, category, 'labor', isArabic),
          category,
          quantity: laborCount,
          unit: isArabic ? 'عامل' : 'worker',
          rate_per_day: laborRate,
          total_cost: laborCost,
          start_date: laborStart.toISOString().split('T')[0],
          end_date: laborEnd.toISOString().split('T')[0],
          utilization_percent: utilizationLabor,
          productivity_rate: productivityLabor,
          ai_reasoning: isArabic 
            ? `تقدير بناءً على: الكمية ${item.quantity} ${item.unit}، التكلفة ${totalCost.toLocaleString()} ر.س` 
            : `Estimate based on: Qty ${item.quantity} ${item.unit}, Cost ${totalCost.toLocaleString()} SAR`
        });
        totalLaborCost += laborCost;
        
        // Equipment resource (for specific work types)
        if (needsEquipment(desc, totalCost)) {
          const equipCost = totalCost * 0.15;
          const equipStart = new Date(startDate);
          equipStart.setDate(equipStart.getDate() + cumulativeDays);
          const equipEnd = new Date(equipStart);
          equipEnd.setDate(equipEnd.getDate() + equipDays);
          
          resources.push({
            type: 'equipment',
            name: getResourceName(desc, category, 'equipment', isArabic),
            category,
            quantity: Math.max(1, Math.ceil(equipDays / 15)),
            unit: isArabic ? 'وحدة' : 'unit',
            rate_per_day: equipmentRate,
            total_cost: equipCost,
            start_date: equipStart.toISOString().split('T')[0],
            end_date: equipEnd.toISOString().split('T')[0],
            utilization_percent: utilizationEquip,
            productivity_rate: productivityEquip,
            ai_reasoning: isArabic 
              ? `معدات مطلوبة لـ: ${item.description.substring(0, 50)}` 
              : `Equipment required for: ${item.description.substring(0, 50)}`
          });
          totalEquipmentCost += equipCost;
        }
        
        cumulativeDays += Math.ceil(laborDays * 0.7); // Overlap activities
      });
      
      result = {
        resource_analysis: resources,
        summary: {
          total_labor_cost: totalLaborCost,
          total_equipment_cost: totalEquipmentCost,
          peak_workers: Math.max(...resources.filter(r => r.type === 'labor').map(r => r.quantity)),
          peak_equipment_units: Math.max(...resources.filter(r => r.type === 'equipment').map(r => r.quantity), 0)
        }
      };
    }

    console.log(`Successfully analyzed ${result.resource_analysis?.length || 0} resources`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-resources:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions for deterministic resource estimation

function getResourceEstimates(desc: string, category: string, cost: number, quantity: number) {
  const lowerDesc = (desc + ' ' + category).toLowerCase();
  
  // Determine work type and set fixed rates/durations
  if (lowerDesc.includes('خرسانة') || lowerDesc.includes('concrete')) {
    return {
      laborRate: 200, laborDays: Math.max(5, Math.ceil(quantity / 20)), laborCount: Math.max(4, Math.ceil(quantity / 50)),
      equipmentRate: 1800, equipDays: Math.max(3, Math.ceil(quantity / 25)),
      utilizationLabor: 85, utilizationEquip: 75, productivityLabor: 0.9, productivityEquip: 0.85
    };
  }
  if (lowerDesc.includes('حديد') || lowerDesc.includes('steel') || lowerDesc.includes('rebar')) {
    return {
      laborRate: 220, laborDays: Math.max(7, Math.ceil(quantity / 2)), laborCount: Math.max(3, Math.ceil(quantity / 10)),
      equipmentRate: 800, equipDays: Math.max(5, Math.ceil(quantity / 3)),
      utilizationLabor: 80, utilizationEquip: 70, productivityLabor: 0.85, productivityEquip: 0.8
    };
  }
  if (lowerDesc.includes('حفر') || lowerDesc.includes('excav') || lowerDesc.includes('ردم') || lowerDesc.includes('fill')) {
    return {
      laborRate: 150, laborDays: Math.max(3, Math.ceil(quantity / 100)), laborCount: Math.max(2, Math.ceil(quantity / 500)),
      equipmentRate: 2000, equipDays: Math.max(2, Math.ceil(quantity / 150)),
      utilizationLabor: 75, utilizationEquip: 80, productivityLabor: 0.8, productivityEquip: 0.85
    };
  }
  if (lowerDesc.includes('كهرب') || lowerDesc.includes('electric')) {
    return {
      laborRate: 280, laborDays: Math.max(10, Math.ceil(cost / 50000)), laborCount: Math.max(2, Math.ceil(cost / 100000)),
      equipmentRate: 500, equipDays: Math.max(5, Math.ceil(cost / 80000)),
      utilizationLabor: 85, utilizationEquip: 60, productivityLabor: 0.88, productivityEquip: 0.75
    };
  }
  if (lowerDesc.includes('تكييف') || lowerDesc.includes('hvac') || lowerDesc.includes('air')) {
    return {
      laborRate: 300, laborDays: Math.max(14, Math.ceil(cost / 40000)), laborCount: Math.max(3, Math.ceil(cost / 80000)),
      equipmentRate: 1500, equipDays: Math.max(7, Math.ceil(cost / 60000)),
      utilizationLabor: 82, utilizationEquip: 70, productivityLabor: 0.85, productivityEquip: 0.8
    };
  }
  if (lowerDesc.includes('سباك') || lowerDesc.includes('plumb') || lowerDesc.includes('صحي')) {
    return {
      laborRate: 200, laborDays: Math.max(7, Math.ceil(cost / 30000)), laborCount: Math.max(2, Math.ceil(cost / 60000)),
      equipmentRate: 400, equipDays: Math.max(3, Math.ceil(cost / 50000)),
      utilizationLabor: 80, utilizationEquip: 55, productivityLabor: 0.85, productivityEquip: 0.7
    };
  }
  if (lowerDesc.includes('بلاط') || lowerDesc.includes('tile') || lowerDesc.includes('رخام') || lowerDesc.includes('marble')) {
    return {
      laborRate: 180, laborDays: Math.max(10, Math.ceil(quantity / 15)), laborCount: Math.max(3, Math.ceil(quantity / 50)),
      equipmentRate: 300, equipDays: 2,
      utilizationLabor: 88, utilizationEquip: 40, productivityLabor: 0.9, productivityEquip: 0.5
    };
  }
  if (lowerDesc.includes('دهان') || lowerDesc.includes('paint')) {
    return {
      laborRate: 150, laborDays: Math.max(5, Math.ceil(quantity / 50)), laborCount: Math.max(2, Math.ceil(quantity / 200)),
      equipmentRate: 200, equipDays: 1,
      utilizationLabor: 90, utilizationEquip: 30, productivityLabor: 0.92, productivityEquip: 0.4
    };
  }
  
  // Default values based on cost
  const baseDays = Math.max(5, Math.ceil(cost / 40000));
  return {
    laborRate: 180, laborDays: baseDays, laborCount: Math.max(2, Math.ceil(baseDays / 5)),
    equipmentRate: 1000, equipDays: Math.max(3, Math.ceil(baseDays / 2)),
    utilizationLabor: 78, utilizationEquip: 65, productivityLabor: 0.82, productivityEquip: 0.75
  };
}

function getResourceName(desc: string, category: string, type: 'labor' | 'equipment', isArabic: boolean): string {
  const lowerDesc = (desc + ' ' + category).toLowerCase();
  
  if (type === 'labor') {
    if (lowerDesc.includes('خرسانة') || lowerDesc.includes('concrete')) return isArabic ? 'عمال صب خرسانة' : 'Concrete Workers';
    if (lowerDesc.includes('حديد') || lowerDesc.includes('steel')) return isArabic ? 'حدادين مسلح' : 'Rebar Workers';
    if (lowerDesc.includes('حفر') || lowerDesc.includes('excav')) return isArabic ? 'عمال حفر' : 'Excavation Workers';
    if (lowerDesc.includes('كهرب') || lowerDesc.includes('electric')) return isArabic ? 'فنيين كهرباء' : 'Electricians';
    if (lowerDesc.includes('تكييف') || lowerDesc.includes('hvac')) return isArabic ? 'فنيين تكييف' : 'HVAC Technicians';
    if (lowerDesc.includes('سباك') || lowerDesc.includes('plumb')) return isArabic ? 'سباكين' : 'Plumbers';
    if (lowerDesc.includes('بلاط') || lowerDesc.includes('tile')) return isArabic ? 'مبلطين' : 'Tile Workers';
    if (lowerDesc.includes('دهان') || lowerDesc.includes('paint')) return isArabic ? 'دهانين' : 'Painters';
    if (lowerDesc.includes('نجار') || lowerDesc.includes('carpent') || lowerDesc.includes('wood')) return isArabic ? 'نجارين' : 'Carpenters';
    return isArabic ? `عمال ${category}` : `${category} Workers`;
  } else {
    if (lowerDesc.includes('خرسانة') || lowerDesc.includes('concrete')) return isArabic ? 'مضخة خرسانة' : 'Concrete Pump';
    if (lowerDesc.includes('حفر') || lowerDesc.includes('excav')) return isArabic ? 'حفار' : 'Excavator';
    if (lowerDesc.includes('ردم') || lowerDesc.includes('fill')) return isArabic ? 'دحال' : 'Compactor';
    if (lowerDesc.includes('رفع') || lowerDesc.includes('crane') || lowerDesc.includes('lift')) return isArabic ? 'رافعة' : 'Crane';
    return isArabic ? `معدات ${category}` : `${category} Equipment`;
  }
}

function needsEquipment(desc: string, cost: number): boolean {
  const lowerDesc = desc.toLowerCase();
  const heavyWorkKeywords = ['خرسانة', 'concrete', 'حفر', 'excav', 'ردم', 'fill', 'رفع', 'crane', 'lift', 'حديد', 'steel'];
  
  // Needs equipment if heavy work or high cost
  return heavyWorkKeywords.some(kw => lowerDesc.includes(kw)) || cost > 50000;
}
