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
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

// Enhanced interfaces for cost-loaded schedule
interface CostLoadedActivity {
  activity_id: string;
  activity_name: string;
  trade_category: string;
  related_boq_items: {
    item_number: string;
    description: string;
    cost: number;
  }[];
  duration_days: number;
  activity_cost: number;
  cost_weight_percent: number;
  start_date: string;
  finish_date: string;
  predecessors: string[];
  daily_cost_rate: number;
}

interface SCurveDataPoint {
  date: string;
  day_number: number;
  planned_daily_cost: number;
  planned_cumulative_cost: number;
  planned_cumulative_percent: number;
}

interface CostFlowPeriod {
  period: string;
  period_start: string;
  period_end: string;
  planned_cost: number;
  cumulative_cost: number;
  activities_active: string[];
}

// EVM Interfaces
interface EVMDataPoint {
  date: string;
  day_number: number;
  bcws: number; // Budgeted Cost of Work Scheduled (Planned Value)
  bcwp: number; // Budgeted Cost of Work Performed (Earned Value)
  acwp: number; // Actual Cost of Work Performed (Actual Cost)
  spi: number;  // Schedule Performance Index
  cpi: number;  // Cost Performance Index
  sv: number;   // Schedule Variance
  cv: number;   // Cost Variance
  etc: number;  // Estimate to Complete
  eac: number;  // Estimate at Completion
  vac: number;  // Variance at Completion
}

interface EVMSummary {
  data_date: string;
  percent_complete_planned: number;
  percent_complete_actual: number;
  bac: number;  // Budget at Completion
  bcws: number;
  bcwp: number;
  acwp: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
  tcpi: number; // To Complete Performance Index
  etc: number;
  eac: number;
  vac: number;
  performance_status: "ahead_under" | "ahead_over" | "behind_under" | "behind_over" | "on_track";
}

interface MisalignmentRisk {
  risk_type: "scope_gap" | "cost_concentration" | "timeline_imbalance" | "unlinked_cost" | "orphan_boq" | "front_loaded" | "back_loaded";
  severity: "low" | "medium" | "high";
  description: string;
  affected_items: string[];
  recommendation: string;
}

interface CostConcentration {
  activity: string;
  cost: number;
  percentage: number;
  risk_level: "normal" | "elevated" | "high";
}

interface OrphanBOQItem {
  item_number: string;
  description: string;
  quantity: number;
  cost: number;
  suggested_activity: string;
}

interface ScheduleIntegrationResult {
  integration_summary: {
    total_schedule_activities: number;
    fully_linked_activities: number;
    partially_linked_activities: number;
    not_linked_activities: number;
    total_boq_items: number;
    linked_boq_items: number;
    orphan_boq_items: number;
    total_boq_cost: number;
    scheduled_cost: number;
    cost_variance: number;
    variance_percent: number;
    total_project_duration: number;
    project_start_date: string;
    project_finish_date: string;
    integration_score: number;
  };
  cost_loaded_schedule: CostLoadedActivity[];
  orphan_boq_items: OrphanBOQItem[];
  cost_concentration: CostConcentration[];
  s_curve_data: SCurveDataPoint[];
  cost_flow_monthly: CostFlowPeriod[];
  misalignment_risks: MisalignmentRisk[];
  recommendations: string[];
  evm_summary: EVMSummary;
  evm_data: EVMDataPoint[];
}

// Tool definition for structured output
const scheduleIntegrationTool = {
  type: "function",
  function: {
    name: "submit_cost_loaded_schedule",
    description: "Submit the cost-loaded project schedule analysis result with S-curve data",
    parameters: {
      type: "object",
      properties: {
        cost_loaded_schedule: {
          type: "array",
          description: "Cost-loaded schedule activities in construction sequence order",
          items: {
            type: "object",
            properties: {
              activity_id: { type: "string", description: "Activity ID (e.g., ACT-001, ACT-002)" },
              activity_name: { type: "string", description: "Activity name" },
              trade_category: { type: "string", description: "Construction trade category" },
              related_boq_items: { 
                type: "array", 
                items: {
                  type: "object",
                  properties: {
                    item_number: { type: "string" },
                    description: { type: "string" },
                    cost: { type: "number" }
                  },
                  required: ["item_number", "description", "cost"]
                }
              },
              duration_days: { type: "number", description: "Activity duration in days" },
              activity_cost: { type: "number", description: "Total cost for this activity" },
              predecessors: { type: "array", items: { type: "string" }, description: "Predecessor activity IDs (FS relationships)" }
            },
            required: ["activity_id", "activity_name", "trade_category", "related_boq_items", "duration_days", "activity_cost", "predecessors"]
          }
        },
        orphan_boq_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_number: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              cost: { type: "number" },
              suggested_activity: { type: "string" }
            },
            required: ["item_number", "description", "quantity", "cost", "suggested_activity"]
          }
        },
        misalignment_risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk_type: { type: "string", enum: ["scope_gap", "cost_concentration", "timeline_imbalance", "unlinked_cost", "orphan_boq", "front_loaded", "back_loaded"] },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              description: { type: "string" },
              affected_items: { type: "array", items: { type: "string" } },
              recommendation: { type: "string" }
            },
            required: ["risk_type", "severity", "description", "affected_items", "recommendation"]
          }
        },
        recommendations: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["cost_loaded_schedule", "orphan_boq_items", "misalignment_risks", "recommendations"]
    }
  }
};

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boq_items, wbs_data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!boq_items || !Array.isArray(boq_items) || boq_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "BOQ items are required for schedule integration analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting Cost-Loaded Schedule Analysis...`);
    console.log(`BOQ Items: ${boq_items.length}, WBS Items: ${wbs_data?.length || 0}`);

    const totalBOQCost = boq_items.reduce((sum: number, item: BOQItem) => sum + (item.total_price || 0), 0);

    const systemPrompt = `You are a Planning and Cost Control Engineer specializing in construction project management.

## YOUR ROLE
Convert the uploaded BOQ into a Cost-Loaded Project Schedule following standard construction sequencing and best practices.

## CONSTRUCTION TRADES (13 Standard Categories)
Group BOQ items under these logical construction activities in sequence:
1. Preliminaries & General Requirements
2. Site Preparation & Mobilization
3. Earthworks & Excavation
4. Foundations & Substructure
5. Structural Concrete Works
6. Structural Steel Works
7. Masonry & Blockwork
8. Roofing & Waterproofing
9. MEP - Plumbing & Drainage
10. MEP - Electrical & Low Current
11. MEP - HVAC & Mechanical
12. Doors, Windows & Glazing
13. Interior Finishes (Flooring, Walls, Ceilings)
14. External Works & Landscaping

## ANALYSIS REQUIREMENTS

### 1. Group BOQ Items by Trade
- Analyze each BOQ item description
- Assign to the most appropriate trade category
- Multiple items can belong to one trade

### 2. Create Cost-Loaded Activities
For each trade with BOQ items, create an activity with:
- Activity ID (format: ACT-001, ACT-002, etc.)
- Activity Name (trade-based)
- Related BOQ Items (list with item codes and costs)
- Duration (estimate realistic duration in days based on scope)
- Activity Cost (sum of related BOQ costs)
- Predecessors (use FS relationships, follow construction sequence)

### 3. Duration Estimation Guidelines
- Preliminaries: 10-20% of total duration, starts Day 1
- Site Prep: 5-10% of duration
- Earthworks: 5-15% of duration
- Foundations: 10-15% of duration
- Structure: 15-25% of duration
- MEP rough-in: can overlap with structure
- Finishes: 15-25% of duration
- External Works: can run parallel to finishes

### 4. Predecessor Logic (FS - Finish-to-Start)
- Earthworks follows Site Prep
- Foundations follow Earthworks
- Structure follows Foundations
- Roofing follows Structure
- MEP rough-in can start during Structure (partial overlap)
- Finishes follow MEP rough-in
- External Works can parallel Finishes

### 5. Identify Orphan BOQ Items
Items that cannot be clearly categorized should be flagged with suggested activity.

### 6. Flag Risks
- Front-loaded cost (>40% in first 30% of duration)
- Back-loaded cost (>40% in last 30% of duration)
- Cost concentration (any activity >25% of total)
- Timeline imbalance

## INPUT DATA
- Total BOQ Items: ${boq_items.length}
- Total BOQ Cost: ${totalBOQCost.toLocaleString()} SAR

## ASSUMPTIONS
- Linear cost distribution across each activity duration
- Finish-to-Start (FS) relationships only
- Standard construction sequencing
- Working days only (no weekends considered in duration)`;

    const userPrompt = `Analyze the following BOQ items and create a Cost-Loaded Project Schedule:

## BOQ ITEMS
${JSON.stringify(boq_items.slice(0, 80), null, 2)}
${boq_items.length > 80 ? `\n... and ${boq_items.length - 80} more items` : ''}

${wbs_data ? `## WBS STRUCTURE
${JSON.stringify(wbs_data.slice(0, 20), null, 2)}` : ''}

Create a comprehensive cost-loaded schedule using the submit_cost_loaded_schedule function.
Ensure all BOQ costs are distributed across activities and verify the total matches ${totalBOQCost.toLocaleString()} SAR.`;

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
        tools: [scheduleIntegrationTool],
        tool_choice: { type: "function", function: { name: "submit_cost_loaded_schedule" } },
        temperature: 0.3,
        max_tokens: 12000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    let analysisResult: any;

    if (aiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = aiResponse.choices[0].message.tool_calls[0].function.arguments;
      analysisResult = typeof args === "string" ? JSON.parse(args) : args;
    } else if (aiResponse.choices?.[0]?.message?.content) {
      const content = aiResponse.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      }
    }

    if (!analysisResult) {
      throw new Error("Failed to parse AI response");
    }

    // Process the cost-loaded schedule
    const costLoadedSchedule = analysisResult.cost_loaded_schedule || [];
    const orphanItems = analysisResult.orphan_boq_items || [];
    
    // Calculate dates based on predecessors and durations
    const projectStartDate = new Date();
    projectStartDate.setHours(0, 0, 0, 0);
    
    const activityDates: Record<string, { start: Date; finish: Date }> = {};
    
    // Process activities in order, calculating dates
    const processedSchedule: CostLoadedActivity[] = costLoadedSchedule.map((activity: any, idx: number) => {
      let startDate: Date;
      
      if (activity.predecessors && activity.predecessors.length > 0) {
        // Find the latest finish date among predecessors
        let latestFinish = projectStartDate;
        for (const predId of activity.predecessors) {
          if (activityDates[predId] && activityDates[predId].finish > latestFinish) {
            latestFinish = activityDates[predId].finish;
          }
        }
        startDate = addDays(latestFinish, 1);
      } else {
        startDate = projectStartDate;
      }
      
      const finishDate = addDays(startDate, Math.max(1, activity.duration_days - 1));
      
      activityDates[activity.activity_id] = { start: startDate, finish: finishDate };
      
      const activityCost = activity.activity_cost || 0;
      const costWeight = totalBOQCost > 0 ? (activityCost / totalBOQCost) * 100 : 0;
      const dailyCostRate = activity.duration_days > 0 ? activityCost / activity.duration_days : 0;
      
      return {
        activity_id: activity.activity_id,
        activity_name: activity.activity_name,
        trade_category: activity.trade_category,
        related_boq_items: activity.related_boq_items || [],
        duration_days: activity.duration_days,
        activity_cost: activityCost,
        cost_weight_percent: Math.round(costWeight * 100) / 100,
        start_date: formatDate(startDate),
        finish_date: formatDate(finishDate),
        predecessors: activity.predecessors || [],
        daily_cost_rate: Math.round(dailyCostRate * 100) / 100
      };
    });

    // Calculate total project duration
    let projectFinishDate = projectStartDate;
    Object.values(activityDates).forEach((dates) => {
      if (dates.finish > projectFinishDate) {
        projectFinishDate = dates.finish;
      }
    });
    
    const totalProjectDuration = Math.ceil((projectFinishDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Generate S-Curve data
    const sCurveData: SCurveDataPoint[] = [];
    let cumulativeCost = 0;
    
    for (let day = 0; day <= totalProjectDuration; day++) {
      const currentDate = addDays(projectStartDate, day);
      let dailyCost = 0;
      
      processedSchedule.forEach((activity) => {
        const actStart = new Date(activity.start_date);
        const actFinish = new Date(activity.finish_date);
        
        if (currentDate >= actStart && currentDate <= actFinish) {
          dailyCost += activity.daily_cost_rate;
        }
      });
      
      cumulativeCost += dailyCost;
      
      sCurveData.push({
        date: formatDate(currentDate),
        day_number: day + 1,
        planned_daily_cost: Math.round(dailyCost),
        planned_cumulative_cost: Math.round(cumulativeCost),
        planned_cumulative_percent: totalBOQCost > 0 ? Math.round((cumulativeCost / totalBOQCost) * 10000) / 100 : 0
      });
    }

    // Generate monthly cost flow
    const costFlowMonthly: CostFlowPeriod[] = [];
    let currentMonth = new Date(projectStartDate);
    currentMonth.setDate(1);
    
    while (currentMonth <= projectFinishDate) {
      const monthStart = new Date(currentMonth);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      let monthCost = 0;
      const activeActivities: string[] = [];
      
      processedSchedule.forEach((activity) => {
        const actStart = new Date(activity.start_date);
        const actFinish = new Date(activity.finish_date);
        
        // Check if activity overlaps with this month
        if (actStart <= monthEnd && actFinish >= monthStart) {
          // Calculate the overlap days
          const overlapStart = actStart > monthStart ? actStart : monthStart;
          const overlapEnd = actFinish < monthEnd ? actFinish : monthEnd;
          const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          monthCost += activity.daily_cost_rate * overlapDays;
          activeActivities.push(activity.activity_id);
        }
      });
      
      const periodData = costFlowMonthly.length > 0 ? costFlowMonthly[costFlowMonthly.length - 1].cumulative_cost : 0;
      
      costFlowMonthly.push({
        period: `${currentMonth.toLocaleString('default', { month: 'short' })} ${currentMonth.getFullYear()}`,
        period_start: formatDate(monthStart),
        period_end: formatDate(monthEnd),
        planned_cost: Math.round(monthCost),
        cumulative_cost: Math.round(periodData + monthCost),
        activities_active: activeActivities
      });
      
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Calculate cost concentration
    const costConcentration: CostConcentration[] = processedSchedule
      .filter((a) => a.activity_cost > 0)
      .map((activity) => {
        const riskLevel: "normal" | "elevated" | "high" = 
          activity.cost_weight_percent > 25 ? "high" : 
          activity.cost_weight_percent > 15 ? "elevated" : "normal";
        return {
          activity: activity.activity_name,
          cost: activity.activity_cost,
          percentage: activity.cost_weight_percent,
          risk_level: riskLevel
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate summary metrics
    const scheduledCost = processedSchedule.reduce((sum, a) => sum + a.activity_cost, 0);
    const costVariance = totalBOQCost - scheduledCost;
    const variancePercent = totalBOQCost > 0 ? (costVariance / totalBOQCost) * 100 : 0;

    const fullyLinked = processedSchedule.filter((a) => a.related_boq_items.length > 0).length;
    const linkedBOQItems = processedSchedule.reduce((sum, a) => sum + a.related_boq_items.length, 0);

    const integrationScore = Math.min(100, Math.round(
      (fullyLinked / Math.max(processedSchedule.length, 1)) * 50 +
      (scheduledCost / Math.max(totalBOQCost, 1)) * 50
    ));

    // ============ EARNED VALUE MANAGEMENT (EVM) CALCULATIONS ============
    const bac = scheduledCost; // Budget at Completion
    const dataDate = new Date(); // Current date as data date
    dataDate.setHours(0, 0, 0, 0);
    
    // Calculate days elapsed from project start to data date
    const daysElapsed = Math.max(0, Math.ceil((dataDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Simulate progress - in real scenario this would come from actual progress data
    // For simulation: assume actual progress is slightly behind schedule with some cost overrun
    const simulatedProgressFactor = 0.92; // 92% of planned progress
    const simulatedCostFactor = 1.08; // 8% cost overrun
    
    // Generate EVM data points for each day
    const evmData: EVMDataPoint[] = [];
    
    for (let day = 0; day <= totalProjectDuration; day++) {
      const currentDate = addDays(projectStartDate, day);
      const sCurvePoint = sCurveData[day] || sCurveData[sCurveData.length - 1];
      
      // BCWS = Planned cumulative cost at this date
      const bcws = sCurvePoint?.planned_cumulative_cost || 0;
      
      // Simulate BCWP and ACWP based on whether we're before or after data date
      let bcwp: number;
      let acwp: number;
      
      if (day <= daysElapsed) {
        // Past or current - show simulated actual performance
        bcwp = Math.round(bcws * simulatedProgressFactor);
        acwp = Math.round(bcwp * simulatedCostFactor);
      } else {
        // Future - project based on current performance
        bcwp = 0; // Not yet earned
        acwp = 0; // Not yet spent
      }
      
      // Calculate EVM metrics
      const sv = bcwp - bcws; // Schedule Variance
      const cv = bcwp - acwp; // Cost Variance
      const spi = bcws > 0 ? Math.round((bcwp / bcws) * 100) / 100 : 1; // Schedule Performance Index
      const cpi = acwp > 0 ? Math.round((bcwp / acwp) * 100) / 100 : 1; // Cost Performance Index
      
      // EAC using CPI method: EAC = BAC / CPI
      const eac = cpi > 0 ? Math.round(bac / cpi) : bac;
      
      // ETC = EAC - ACWP
      const etc = Math.max(0, eac - acwp);
      
      // VAC = BAC - EAC
      const vac = bac - eac;
      
      evmData.push({
        date: formatDate(currentDate),
        day_number: day + 1,
        bcws: Math.round(bcws),
        bcwp: Math.round(bcwp),
        acwp: Math.round(acwp),
        spi,
        cpi,
        sv: Math.round(sv),
        cv: Math.round(cv),
        etc: Math.round(etc),
        eac: Math.round(eac),
        vac: Math.round(vac)
      });
    }
    
    // Get current EVM status (at data date)
    const currentDayIndex = Math.min(daysElapsed, evmData.length - 1);
    const currentEVM = evmData[currentDayIndex] || evmData[evmData.length - 1];
    
    // Calculate TCPI (To Complete Performance Index)
    const remainingWork = bac - currentEVM.bcwp;
    const remainingBudget = bac - currentEVM.acwp;
    const tcpi = remainingBudget > 0 ? Math.round((remainingWork / remainingBudget) * 100) / 100 : 1;
    
    // Determine performance status
    let performanceStatus: "ahead_under" | "ahead_over" | "behind_under" | "behind_over" | "on_track";
    if (currentEVM.spi >= 0.95 && currentEVM.spi <= 1.05 && currentEVM.cpi >= 0.95 && currentEVM.cpi <= 1.05) {
      performanceStatus = "on_track";
    } else if (currentEVM.spi >= 1.0 && currentEVM.cpi >= 1.0) {
      performanceStatus = "ahead_under";
    } else if (currentEVM.spi >= 1.0 && currentEVM.cpi < 1.0) {
      performanceStatus = "ahead_over";
    } else if (currentEVM.spi < 1.0 && currentEVM.cpi >= 1.0) {
      performanceStatus = "behind_under";
    } else {
      performanceStatus = "behind_over";
    }
    
    const percentCompletePlanned = bac > 0 ? Math.round((currentEVM.bcws / bac) * 10000) / 100 : 0;
    const percentCompleteActual = bac > 0 ? Math.round((currentEVM.bcwp / bac) * 10000) / 100 : 0;
    
    const evmSummary: EVMSummary = {
      data_date: formatDate(dataDate),
      percent_complete_planned: percentCompletePlanned,
      percent_complete_actual: percentCompleteActual,
      bac,
      bcws: currentEVM.bcws,
      bcwp: currentEVM.bcwp,
      acwp: currentEVM.acwp,
      sv: currentEVM.sv,
      cv: currentEVM.cv,
      spi: currentEVM.spi,
      cpi: currentEVM.cpi,
      tcpi,
      etc: currentEVM.etc,
      eac: currentEVM.eac,
      vac: currentEVM.vac,
      performance_status: performanceStatus
    };

    console.log("EVM Analysis complete:", {
      spi: currentEVM.spi,
      cpi: currentEVM.cpi,
      status: performanceStatus
    });

    const result: ScheduleIntegrationResult = {
      integration_summary: {
        total_schedule_activities: processedSchedule.length,
        fully_linked_activities: fullyLinked,
        partially_linked_activities: processedSchedule.filter((a) => a.related_boq_items.length === 0).length,
        not_linked_activities: 0,
        total_boq_items: boq_items.length,
        linked_boq_items: linkedBOQItems,
        orphan_boq_items: orphanItems.length,
        total_boq_cost: totalBOQCost,
        scheduled_cost: scheduledCost,
        cost_variance: Math.round(costVariance),
        variance_percent: Math.round(variancePercent * 100) / 100,
        total_project_duration: totalProjectDuration,
        project_start_date: formatDate(projectStartDate),
        project_finish_date: formatDate(projectFinishDate),
        integration_score: integrationScore
      },
      cost_loaded_schedule: processedSchedule,
      orphan_boq_items: orphanItems,
      cost_concentration: costConcentration,
      s_curve_data: sCurveData,
      cost_flow_monthly: costFlowMonthly,
      misalignment_risks: analysisResult.misalignment_risks || [],
      recommendations: analysisResult.recommendations || [],
      evm_summary: evmSummary,
      evm_data: evmData
    };

    console.log("Cost-loaded schedule analysis complete");
    console.log(`Activities: ${processedSchedule.length}, Duration: ${totalProjectDuration} days`);
    console.log(`Scheduled Cost: ${scheduledCost}, BOQ Total: ${totalBOQCost}, Variance: ${costVariance}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in schedule integration analysis:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: "Failed to complete cost-loaded schedule analysis"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
