import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
  category?: string;
}

interface P6Activity {
  activity_id: string;
  activity_name: string;
  wbs_code: string;
  wbs_name: string;
  wbs_level: number;
  duration: number;
  original_duration: number;
  start_date: string;
  finish_date: string;
  predecessors: string[];
  predecessor_types: string[];
  lag_days: number[];
  cost: number;
  cost_weight_percent: number;
  resource_names: string[];
  resource_units: number[];
  activity_codes: {
    phase: string;
    area: string;
    trade: string;
    discipline: string;
  };
  calendar: string;
  constraint_type: string;
  constraint_date: string | null;
}

interface WBSElement {
  wbs_code: string;
  wbs_name: string;
  level: number;
  parent_code: string | null;
  total_cost: number;
  weight_percent: number;
}

interface P6ExportResult {
  project_info: {
    project_id: string;
    project_name: string;
    project_type: string;
    total_contract_value: number;
    currency: string;
    calendar_type: string;
    work_days_per_week: number;
    start_date: string;
    finish_date: string;
    total_duration: number;
  };
  wbs_structure: WBSElement[];
  activities: P6Activity[];
  summary: {
    total_activities: number;
    total_wbs_elements: number;
    total_cost: number;
    cost_weight_validation: number;
    critical_path_activities: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      boq_items, 
      project_name,
      project_type,
      total_contract_value,
      currency,
      calendar_type,
      start_date 
    } = await req.json();

    if (!boq_items || boq_items.length === 0) {
      throw new Error("BOQ items are required for P6 export generation");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating P6 export structure...");
    console.log("BOQ items count:", boq_items.length);
    console.log("Project type:", project_type);
    console.log("TCV:", total_contract_value, currency);

    const systemPrompt = `You are a Primavera P6 Planning & Cost Control Expert with deep knowledge of construction scheduling standards.

Your task is to convert BOQ items into a Primavera P6-ready schedule structure with proper WBS hierarchy, activity IDs, durations, relationships, and cost loading.

CRITICAL RULES:

1. WBS HIERARCHY (Levels 1-4):
   - Level 1: Project phases (Mobilization, Main Works, Testing, Handover)
   - Level 2: Major work packages (Substructure, Superstructure, MEP, Finishes)
   - Level 3: Trade disciplines (Concrete, Steel, Masonry, Electrical, Plumbing)
   - Level 4: Work areas or zones

2. ACTIVITY ID STANDARDS:
   - Format: A####  (e.g., A1010, A1020, A1030)
   - Increment by 10 to allow insertions
   - Group by WBS element

3. DURATION ASSIGNMENT:
   - Base on BOQ quantities and construction productivity norms
   - Typical rates: Concrete 50m³/day, Rebar 2 tons/day, Blockwork 30m²/day
   - Minimum duration: 1 day, Maximum per activity: 30 days

4. RELATIONSHIPS (Default FS with lag where needed):
   - FS (Finish-to-Start): Default relationship
   - SS (Start-to-Start): For parallel activities
   - Lag: In days, for curing time, drying, etc.

5. COST DISTRIBUTION:
   - Distribute total contract value across activities
   - Sum of all cost weights MUST equal 100%
   - Higher weights for major cost drivers (concrete, steel, MEP)

6. ACTIVITY CODES:
   - Phase: Mobilization/Main/Testing/Handover
   - Area: Zone A, Zone B, Common Areas, etc.
   - Trade: Civil, Structural, Electrical, Mechanical, Plumbing, Finishes
   - Discipline: Substructure, Superstructure, MEP, Architecture

7. RESOURCES:
   - Include labor categories: Skilled, Unskilled, Supervisor
   - Include equipment as needed: Crane, Excavator, Concrete Pump

Return a JSON object with this EXACT structure:
{
  "wbs_structure": [
    {"wbs_code": "1", "wbs_name": "string", "level": 1, "parent_code": null, "total_cost": number, "weight_percent": number}
  ],
  "activities": [
    {
      "activity_id": "A1010",
      "activity_name": "string",
      "wbs_code": "1.1.1",
      "wbs_name": "string",
      "wbs_level": 3,
      "duration": number,
      "start_offset_days": number,
      "predecessors": ["A1000"],
      "predecessor_types": ["FS"],
      "lag_days": [0],
      "cost": number,
      "cost_weight_percent": number,
      "resource_names": ["Skilled Labor", "Concrete Pump"],
      "resource_units": [10, 1],
      "activity_codes": {"phase": "Main", "area": "Zone A", "trade": "Civil", "discipline": "Substructure"},
      "calendar": "6-day",
      "constraint_type": "ASAP",
      "constraint_date": null
    }
  ],
  "critical_path": ["A1010", "A1020", "A1030"]
}`;

    const boqText = boq_items.map((item: BOQItem) => 
      `${item.item_number}: ${item.description} | ${item.quantity} ${item.unit} | ${item.total_price || item.unit_price || 0}`
    ).join("\n");

    const userPrompt = `Create a Primavera P6-ready schedule from these BOQ items:

PROJECT DETAILS:
- Project Name: ${project_name || 'Construction Project'}
- Project Type: ${project_type || 'Commercial'}
- Total Contract Value (TCV): ${total_contract_value || 'Based on BOQ totals'} ${currency || 'SAR'}
- Calendar: ${calendar_type || '6-day week'}
- Project Start: ${start_date || new Date().toISOString().split('T')[0]}

BOQ ITEMS:
${boqText.slice(0, 12000)}

Generate a complete P6 schedule with:
1. 4-level WBS hierarchy
2. All activities with Primavera-standard IDs
3. Realistic durations based on quantities
4. FS relationships with appropriate lags
5. Cost loading that sums to 100% of TCV
6. Activity codes for filtering
7. Resource assignments`;

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
      throw new Error("Failed to parse P6 structure");
    }

    // Process and validate the data
    const projectStart = new Date(start_date || new Date().toISOString().split('T')[0]);
    const calendarWorkDays = calendar_type === '5-day' ? 5 : 6;
    
    const wbsStructure: WBSElement[] = parsedData.wbs_structure || [];
    const activities: P6Activity[] = [];
    
    let totalCostWeight = 0;
    let maxFinishDays = 0;

    // Calculate dates and validate
    for (const act of (parsedData.activities || [])) {
      const startOffsetDays = act.start_offset_days || 0;
      const actStartDate = new Date(projectStart);
      actStartDate.setDate(actStartDate.getDate() + startOffsetDays);
      
      const actFinishDate = new Date(actStartDate);
      actFinishDate.setDate(actFinishDate.getDate() + (act.duration || 1) - 1);
      
      const finishDays = startOffsetDays + (act.duration || 1);
      if (finishDays > maxFinishDays) maxFinishDays = finishDays;

      totalCostWeight += act.cost_weight_percent || 0;

      activities.push({
        activity_id: act.activity_id,
        activity_name: act.activity_name,
        wbs_code: act.wbs_code,
        wbs_name: act.wbs_name || '',
        wbs_level: act.wbs_level || 3,
        duration: act.duration || 1,
        original_duration: act.duration || 1,
        start_date: actStartDate.toISOString().split('T')[0],
        finish_date: actFinishDate.toISOString().split('T')[0],
        predecessors: act.predecessors || [],
        predecessor_types: act.predecessor_types || ['FS'],
        lag_days: act.lag_days || [0],
        cost: act.cost || 0,
        cost_weight_percent: act.cost_weight_percent || 0,
        resource_names: act.resource_names || [],
        resource_units: act.resource_units || [],
        activity_codes: act.activity_codes || { phase: 'Main', area: 'General', trade: 'General', discipline: 'General' },
        calendar: act.calendar || `${calendarWorkDays}-day`,
        constraint_type: act.constraint_type || 'ASAP',
        constraint_date: act.constraint_date || null,
      });
    }

    // Calculate project finish date
    const projectFinish = new Date(projectStart);
    projectFinish.setDate(projectFinish.getDate() + maxFinishDays);

    const tcv = total_contract_value || boq_items.reduce((sum: number, item: BOQItem) => 
      sum + (item.total_price || (item.quantity * (item.unit_price || 0))), 0
    );

    const result: P6ExportResult = {
      project_info: {
        project_id: `PRJ-${Date.now().toString(36).toUpperCase()}`,
        project_name: project_name || 'Construction Project',
        project_type: project_type || 'Commercial',
        total_contract_value: tcv,
        currency: currency || 'SAR',
        calendar_type: calendar_type || '6-day',
        work_days_per_week: calendarWorkDays,
        start_date: projectStart.toISOString().split('T')[0],
        finish_date: projectFinish.toISOString().split('T')[0],
        total_duration: maxFinishDays,
      },
      wbs_structure: wbsStructure,
      activities: activities,
      summary: {
        total_activities: activities.length,
        total_wbs_elements: wbsStructure.length,
        total_cost: tcv,
        cost_weight_validation: Math.round(totalCostWeight * 100) / 100,
        critical_path_activities: parsedData.critical_path || [],
      },
    };

    console.log("P6 export generated:", {
      activities: activities.length,
      wbs: wbsStructure.length,
      duration: maxFinishDays,
      costWeightSum: totalCostWeight,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("P6 export generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Please ensure BOQ data is valid and try again."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
