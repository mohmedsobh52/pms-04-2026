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
      
      // Generate fallback data based on BOQ items
      const resources: ResourceAnalysis[] = [];
      let totalLaborCost = 0;
      let totalEquipmentCost = 0;
      
      items.forEach((item: BOQItem, index: number) => {
        const totalCost = item.total_price || item.quantity * (item.unit_price || 0);
        const category = item.category || 'General';
        
        // Labor resource
        const laborCost = totalCost * 0.35;
        const laborDays = Math.max(7, Math.ceil(laborCost / 500));
        const laborStart = new Date(startDate);
        laborStart.setDate(laborStart.getDate() + index * 5);
        const laborEnd = new Date(laborStart);
        laborEnd.setDate(laborEnd.getDate() + laborDays);
        
        resources.push({
          type: 'labor',
          name: isArabic ? `عمال ${category}` : `${category} Workers`,
          category,
          quantity: Math.max(2, Math.ceil(laborDays / 10)),
          unit: isArabic ? 'عامل' : 'worker',
          rate_per_day: 180,
          total_cost: laborCost,
          start_date: laborStart.toISOString().split('T')[0],
          end_date: laborEnd.toISOString().split('T')[0],
          utilization_percent: 75 + Math.random() * 15,
          productivity_rate: 0.8 + Math.random() * 0.2,
          ai_reasoning: isArabic ? 'تقدير بناءً على تكلفة البند' : 'Estimated based on item cost'
        });
        totalLaborCost += laborCost;
        
        // Equipment resource (for larger items)
        if (totalCost > 50000 || item.description.toLowerCase().includes('خرسانة') || 
            item.description.toLowerCase().includes('حفر') || item.description.toLowerCase().includes('concrete')) {
          const equipCost = totalCost * 0.15;
          const equipDays = Math.max(3, Math.ceil(equipCost / 1500));
          const equipStart = new Date(startDate);
          equipStart.setDate(equipStart.getDate() + index * 3);
          const equipEnd = new Date(equipStart);
          equipEnd.setDate(equipEnd.getDate() + equipDays);
          
          resources.push({
            type: 'equipment',
            name: isArabic ? `معدات ${category}` : `${category} Equipment`,
            category,
            quantity: Math.max(1, Math.ceil(equipDays / 15)),
            unit: isArabic ? 'وحدة' : 'unit',
            rate_per_day: 1200,
            total_cost: equipCost,
            start_date: equipStart.toISOString().split('T')[0],
            end_date: equipEnd.toISOString().split('T')[0],
            utilization_percent: 65 + Math.random() * 20,
            productivity_rate: 0.7 + Math.random() * 0.25,
            ai_reasoning: isArabic ? 'تقدير المعدات للأعمال الكبيرة' : 'Equipment estimate for large works'
          });
          totalEquipmentCost += equipCost;
        }
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
