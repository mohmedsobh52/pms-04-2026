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

interface ProcurementAnalysis {
  boq_item_number: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  estimated_cost: number;
  lead_time_days: number;
  suggested_suppliers: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  order_date: string;
  delivery_date: string;
  ai_reasoning: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, projectStartDate, language = 'ar' } = await req.json();

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

    console.log(`Analyzing procurement for ${items.length} items...`);

    const isArabic = language === 'ar';
    const startDate = projectStartDate ? new Date(projectStartDate) : new Date();

    const systemPrompt = `You are an expert Construction Procurement Manager specializing in Saudi Arabia's construction market.

Your task is to analyze BOQ items and provide realistic procurement estimates including:
1. Lead Time (days) - based on material type, availability in Saudi market, and import requirements
2. Priority - based on critical path impact and material importance
3. Suggested Suppliers - real Saudi suppliers or types of suppliers
4. Order Date - when to place order to meet project schedule
5. Delivery Date - expected delivery based on lead time

## Saudi Market Knowledge:
- Ready-mix concrete: 1-3 days lead time
- Rebar/Steel: 7-14 days (local), 30-60 days (imported)
- Electrical equipment: 14-30 days
- HVAC equipment: 21-45 days
- Tiles/finishing: 14-21 days
- Structural steel: 21-45 days
- Plumbing fixtures: 7-14 days
- Windows/doors: 14-30 days
- Elevators: 60-90 days
- Specialized equipment: 45-90 days

## Saudi Suppliers (examples):
- Concrete: Saudi Ready Mix, ARCO, Al-Mada
- Steel: Hadeed, Al-Rajhi Steel, Saudi Iron & Steel
- Electrical: ABB Saudi, Schneider Electric, Al-Fanar
- Plumbing: Saudi Ceramics, RAK Ceramics, Al-Jazeera
- General: Al-Muhaidib, Binladin, Al-Khodari

## Priority Rules:
- Critical: Long lead time (>30 days) OR critical path item OR specialized equipment
- High: Lead time 14-30 days OR high-cost items (>10% of project)
- Medium: Standard materials, lead time 7-14 days
- Low: Readily available, lead time <7 days

Respond in ${isArabic ? 'Arabic' : 'English'}.`;

    const userPrompt = `Analyze the following BOQ items for procurement planning:

Project Start Date: ${startDate.toISOString().split('T')[0]}

BOQ ITEMS:
${items.map((item: BOQItem, idx: number) => `
[${idx + 1}] ${item.item_number}: ${item.description}
    Quantity: ${item.quantity} ${item.unit}
    Cost: ${item.total_price || item.quantity * (item.unit_price || 0)} SAR
    Category: ${item.category || 'General'}
`).join('\n')}

For each item, provide:
1. lead_time_days: Realistic lead time in Saudi market
2. priority: low/medium/high/critical based on importance
3. suggested_suppliers: 2-3 appropriate Saudi suppliers or supplier types
4. order_date: When to order (YYYY-MM-DD format)
5. delivery_date: Expected delivery (YYYY-MM-DD format)
6. ai_reasoning: Brief explanation of your estimates (in ${isArabic ? 'Arabic' : 'English'})

Return as JSON array with this structure:
{
  "procurement_analysis": [
    {
      "boq_item_number": "item number",
      "description": "description",
      "category": "category",
      "quantity": 0,
      "unit": "unit",
      "estimated_cost": 0,
      "lead_time_days": 14,
      "suggested_suppliers": ["supplier1", "supplier2"],
      "priority": "medium",
      "order_date": "YYYY-MM-DD",
      "delivery_date": "YYYY-MM-DD",
      "ai_reasoning": "explanation"
    }
  ]
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
      
      // Generate fallback data
      result = {
        procurement_analysis: items.map((item: BOQItem) => {
          const leadTime = getDefaultLeadTime(item.description, item.category);
          const priority = getPriorityFromLeadTime(leadTime, item.total_price);
          const orderDate = new Date(startDate);
          orderDate.setDate(orderDate.getDate() - leadTime - 7); // Order 7 days before needed
          const deliveryDate = new Date(orderDate);
          deliveryDate.setDate(deliveryDate.getDate() + leadTime);
          
          return {
            boq_item_number: item.item_number,
            description: item.description,
            category: item.category || 'General',
            quantity: item.quantity,
            unit: item.unit,
            estimated_cost: item.total_price || item.quantity * (item.unit_price || 0),
            lead_time_days: leadTime,
            suggested_suppliers: getDefaultSuppliers(item.description, item.category),
            priority,
            order_date: orderDate.toISOString().split('T')[0],
            delivery_date: deliveryDate.toISOString().split('T')[0],
            ai_reasoning: isArabic ? 'تقدير افتراضي بناءً على نوع المادة' : 'Default estimate based on material type'
          };
        })
      };
    }

    console.log(`Successfully analyzed ${result.procurement_analysis?.length || 0} items`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-procurement:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultLeadTime(description: string, category?: string): number {
  const desc = (description + ' ' + (category || '')).toLowerCase();
  
  if (desc.includes('خرسانة') || desc.includes('concrete')) return 3;
  if (desc.includes('حديد') || desc.includes('steel') || desc.includes('rebar')) return 14;
  if (desc.includes('كهرب') || desc.includes('electric')) return 21;
  if (desc.includes('تكييف') || desc.includes('hvac') || desc.includes('air')) return 30;
  if (desc.includes('مصعد') || desc.includes('elevator') || desc.includes('lift')) return 75;
  if (desc.includes('سباك') || desc.includes('plumbing') || desc.includes('صحي')) return 10;
  if (desc.includes('بلاط') || desc.includes('tiles') || desc.includes('ceramic')) return 14;
  if (desc.includes('نوافذ') || desc.includes('window') || desc.includes('أبواب') || desc.includes('door')) return 21;
  if (desc.includes('دهان') || desc.includes('paint')) return 5;
  if (desc.includes('عزل') || desc.includes('insulation') || desc.includes('waterproof')) return 10;
  
  return 14; // Default
}

function getPriorityFromLeadTime(leadTime: number, cost?: number): 'low' | 'medium' | 'high' | 'critical' {
  if (leadTime > 45) return 'critical';
  if (leadTime > 21 || (cost && cost > 100000)) return 'high';
  if (leadTime > 7) return 'medium';
  return 'low';
}

function getDefaultSuppliers(description: string, category?: string): string[] {
  const desc = (description + ' ' + (category || '')).toLowerCase();
  
  if (desc.includes('خرسانة') || desc.includes('concrete')) {
    return ['Saudi Ready Mix', 'ARCO', 'Al-Mada Concrete'];
  }
  if (desc.includes('حديد') || desc.includes('steel') || desc.includes('rebar')) {
    return ['Hadeed (SABIC)', 'Al-Rajhi Steel', 'Saudi Iron & Steel'];
  }
  if (desc.includes('كهرب') || desc.includes('electric')) {
    return ['Al-Fanar', 'ABB Saudi', 'Schneider Electric'];
  }
  if (desc.includes('تكييف') || desc.includes('hvac') || desc.includes('air')) {
    return ['Carrier Saudi', 'Trane Arabia', 'Zamil Air Conditioners'];
  }
  if (desc.includes('سباك') || desc.includes('plumbing') || desc.includes('صحي')) {
    return ['Saudi Ceramics', 'Ideal Standard Arabia', 'Grohe'];
  }
  if (desc.includes('بلاط') || desc.includes('tiles') || desc.includes('ceramic')) {
    return ['Saudi Ceramics', 'RAK Ceramics', 'Al-Jazeera Paints'];
  }
  
  return ['Al-Muhaidib', 'Binladin Materials', 'Local Suppliers'];
}
