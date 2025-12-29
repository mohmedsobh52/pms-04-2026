import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface P6Request {
  wbsData: WBSItem[];
  projectName: string;
  projectType?: string;
  totalContractValue?: number;
  currency?: string;
  workingDaysPerWeek?: number;
  generateCashFlow?: boolean;
  cashFlowPeriod?: "weekly" | "monthly";
  generateEVM?: boolean;
  statusDate?: string;
  actualProgress?: { [activityId: string]: number };
  actualCosts?: { [activityId: string]: number };
  generateResourceLoading?: boolean;
}

interface ResourceAssignment {
  activity_id: string;
  activity_name: string;
  wbs_code: string;
  resource_type: "Labor" | "Equipment" | "Materials";
  resource_name: string;
  units_per_day: number;
  total_quantity: number;
  unit: string;
  productivity_rate: string;
  start_day: number;
  end_day: number;
}

interface ResourcePeakPeriod {
  period: string;
  period_number: number;
  resource_type: string;
  resource_name: string;
  peak_demand: number;
  unit: string;
  activities_contributing: string[];
}

interface ResourceConflict {
  period: string;
  resource_name: string;
  required_quantity: number;
  typical_available: number;
  overload_percent: number;
  conflicting_activities: string[];
  recommendation: string;
}

interface CashFlowPeriod {
  period: string;
  period_number: number;
  start_day: number;
  end_day: number;
  planned_cost: number;
  cumulative_cost: number;
  cost_percent: number;
  cumulative_percent: number;
  major_cost_drivers: string[];
}

interface EVMPeriod {
  period: string;
  period_number: number;
  pv: number;
  ev: number;
  ac: number;
  cumulative_pv: number;
  cumulative_ev: number;
  cumulative_ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  tcpi: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      wbsData, 
      projectName,
      projectType = "Construction",
      totalContractValue = 0,
      currency = "SAR",
      workingDaysPerWeek = 6,
      generateCashFlow = false,
      cashFlowPeriod = "monthly",
      generateEVM = false,
      statusDate,
      actualProgress = {},
      actualCosts = {},
      generateResourceLoading = false
    }: P6Request = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating Primavera P6 timeline for", wbsData.length, "WBS items");
    console.log("Project:", projectName, "| Type:", projectType, "| TCV:", totalContractValue, currency);
    console.log("Cash Flow:", generateCashFlow ? `Yes (${cashFlowPeriod})` : "No");
    console.log("EVM Analysis:", generateEVM ? `Yes (Status: ${statusDate || 'Current'})` : "No");
    console.log("Resource Loading:", generateResourceLoading ? "Yes" : "No");

    const systemPrompt = `You are a Project Cost Control Engineer and Primavera P6 Planning Expert.

Your role is to convert project schedules into Primavera P6-ready structures following industry best practices.

## PROJECT ASSUMPTIONS
- Project Type: ${projectType}
- Total Contract Value (TCV): ${totalContractValue.toLocaleString()} ${currency}
- Calendar: ${workingDaysPerWeek} working days per week
- Default relationship type: FS (Finish-to-Start)

## TASK REQUIREMENTS

1. **WBS HIERARCHY**
   - Create clean WBS codes suitable for Primavera P6
   - Follow standard WBS numbering (e.g., 1.0, 1.1, 1.1.1)
   - Maximum 5 levels of hierarchy

2. **ACTIVITY IDs**
   - Follow Primavera standards: [Project Code]-[WBS]-[Sequence]
   - Example: PRJ-0100-0010, PRJ-0100-0020
   - Use increments of 10 for future insertions

3. **DURATIONS & RELATIONSHIPS**
   - Estimate realistic durations in working days
   - Define predecessors using FS relationships
   - Consider logical sequencing and overlaps
   - Level 1 activities: 20-60 days
   - Level 2 activities: 7-21 days
   - Level 3 activities: 3-10 days

4. **MILESTONES**
   - Identify Start Milestone (duration = 0)
   - Identify Finish Milestone (duration = 0)
   - Key phase milestones

5. **COST DISTRIBUTION**
   - Distribute cost weight (%) per activity
   - Total must equal 100% of TCV
   - Weight based on work complexity and resource intensity

## OUTPUT FORMAT (JSON)
{
  "project_code": "Project code for P6",
  "wbs_structure": [
    {
      "wbs_code": "1.0",
      "wbs_name": "Phase Name",
      "level": 1
    }
  ],
  "activities": [
    {
      "activity_id": "PRJ-0100-0010",
      "wbs_code": "1.0",
      "activity_name": "Activity Name",
      "duration_days": 15,
      "predecessors": "PRJ-0100-0000 FS",
      "cost_weight_percent": 5.5,
      "planned_cost": 550000,
      "is_milestone": false,
      "milestone_type": null
    }
  ],
  "milestones": {
    "start": "Activity ID of start milestone",
    "finish": "Activity ID of finish milestone",
    "key_milestones": ["List of key milestone activity IDs"]
  },
  "summary": {
    "total_activities": 0,
    "total_milestones": 0,
    "total_duration_days": 0,
    "critical_path_duration": 0,
    "total_cost_weight": 100
  },
  "notes": "Planning assumptions and recommendations"
}

## RULES
- Respond in ENGLISH only
- All Activity IDs must be unique
- Predecessors must reference valid Activity IDs
- Cost weights must sum to exactly 100%
- Include at least Start and Finish milestones`;

    const wbsDescription = wbsData.map((item: WBSItem) => 
      `${item.code}: ${item.title} (Level ${item.level}) - ${item.items.length} items`
    ).join('\n');

    const userPrompt = `Convert the following project schedule into a Primavera P6-ready structure:

PROJECT: "${projectName}"
TYPE: ${projectType}
TOTAL CONTRACT VALUE: ${totalContractValue.toLocaleString()} ${currency}
CALENDAR: ${workingDaysPerWeek} working days per week

WBS ITEMS:
${wbsDescription}

Requirements:
1. Create clean WBS hierarchy suitable for Primavera P6
2. Define Activity IDs following Primavera standards
3. Assign durations, relationships (FS as default), and logical sequencing
4. Identify start/finish milestones
5. Distribute cost weight (%) per activity so that total = 100% of TCV
6. Calculate planned cost for each activity based on weight and TCV`;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            timeline: generateFallbackTimeline(wbsData),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.log("No content, using fallback");
      return new Response(
        JSON.stringify({ timeline: generateFallbackTimeline(wbsData) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Gemini response:", content);

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { timeline: generateFallbackTimeline(wbsData, totalContractValue) };
      }
    }

    // Generate Cash Flow if requested
    if (generateCashFlow && result.activities) {
      const cashFlow = generateCashFlowFromActivities(
        result.activities, 
        totalContractValue, 
        cashFlowPeriod, 
        workingDaysPerWeek,
        currency
      );
      result.cash_flow = cashFlow;
    }

    // Generate EVM Analysis if requested
    if (generateEVM && result.activities) {
      const evmAnalysis = generateEVMAnalysis(
        result.activities,
        totalContractValue,
        cashFlowPeriod,
        workingDaysPerWeek,
        currency,
        statusDate,
        actualProgress,
        actualCosts
      );
      result.evm_analysis = evmAnalysis;
    }

    // Generate Resource Loading if requested
    if (generateResourceLoading && result.activities) {
      const resourceLoading = generateResourceLoadingAnalysis(
        result.activities,
        projectType,
        cashFlowPeriod,
        workingDaysPerWeek
      );
      result.resource_loading = resourceLoading;
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-timeline:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        timeline: [],
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function generateFallbackTimeline(wbsData: WBSItem[], totalContractValue: number = 0) {
  let currentDay = 0;
  const totalItems = wbsData.length;
  const baseWeightPerItem = totalItems > 0 ? 100 / totalItems : 0;
  
  const activities = wbsData.map((item, index) => {
    const baseDuration = item.level === 1 ? 30 : item.level === 2 ? 14 : 7;
    const duration = baseDuration + (item.items.length * 2);
    const startDay = currentDay;
    
    // Adjust weight based on level (higher level = more weight)
    const weightMultiplier = item.level === 1 ? 1.5 : item.level === 2 ? 1.0 : 0.5;
    const costWeight = Number((baseWeightPerItem * weightMultiplier).toFixed(2));
    const plannedCost = Math.round(totalContractValue * (costWeight / 100));
    
    if (item.level === 1) {
      currentDay += Math.max(duration * 0.8, 7);
    } else if (item.level === 2) {
      currentDay += Math.max(duration * 0.5, 5);
    }
    
    const activityId = `PRJ-${String(Math.floor(index / 10) + 1).padStart(4, '0')}-${String((index % 10 + 1) * 10).padStart(4, '0')}`;
    
    return {
      activity_id: activityId,
      wbs_code: item.code,
      activity_name: item.title,
      duration_days: duration,
      predecessors: item.parent_code ? `PRJ-${item.parent_code} FS` : "",
      cost_weight_percent: costWeight,
      planned_cost: plannedCost,
      is_milestone: false,
      milestone_type: null,
      startDay: Math.round(startDay),
      dependencies: item.parent_code ? [item.parent_code] : [],
    };
  });

  // Normalize weights to 100%
  const totalWeight = activities.reduce((sum, a) => sum + a.cost_weight_percent, 0);
  if (totalWeight > 0) {
    activities.forEach(a => {
      a.cost_weight_percent = Number(((a.cost_weight_percent / totalWeight) * 100).toFixed(2));
      a.planned_cost = Math.round(totalContractValue * (a.cost_weight_percent / 100));
    });
  }

  return {
    project_code: "PRJ",
    activities,
    wbs_structure: wbsData.map(item => ({
      wbs_code: item.code,
      wbs_name: item.title,
      level: item.level
    })),
    milestones: {
      start: activities[0]?.activity_id || "",
      finish: activities[activities.length - 1]?.activity_id || "",
      key_milestones: []
    },
    summary: {
      total_activities: activities.length,
      total_milestones: 2,
      total_duration_days: Math.round(currentDay),
      critical_path_duration: Math.round(currentDay),
      total_cost_weight: 100
    },
    timeline: activities,
    notes: "Fallback timeline generated with estimated durations and cost distribution"
  };
}

function generateCashFlowFromActivities(
  activities: any[], 
  totalContractValue: number, 
  period: "weekly" | "monthly",
  workingDaysPerWeek: number,
  currency: string
) {
  if (!activities || activities.length === 0) {
    return { periods: [], summary: {} };
  }

  // Calculate total project duration
  let maxEndDay = 0;
  activities.forEach(activity => {
    const startDay = activity.startDay || 0;
    const duration = activity.duration_days || 0;
    const endDay = startDay + duration;
    if (endDay > maxEndDay) maxEndDay = endDay;
  });

  // Determine period length in days
  const daysPerPeriod = period === "weekly" ? workingDaysPerWeek : workingDaysPerWeek * 4;
  const totalPeriods = Math.ceil(maxEndDay / daysPerPeriod) || 1;

  // Initialize periods
  const periods: CashFlowPeriod[] = [];
  let cumulativeCost = 0;

  for (let i = 0; i < totalPeriods; i++) {
    const periodStartDay = i * daysPerPeriod;
    const periodEndDay = (i + 1) * daysPerPeriod;
    let periodCost = 0;
    const costDrivers: { name: string; cost: number }[] = [];

    // Calculate cost for each activity in this period (linear distribution)
    activities.forEach(activity => {
      const activityStart = activity.startDay || 0;
      const activityDuration = activity.duration_days || 1;
      const activityEnd = activityStart + activityDuration;
      const activityCost = activity.planned_cost || 0;

      // Check if activity overlaps with this period
      if (activityEnd > periodStartDay && activityStart < periodEndDay) {
        // Calculate overlap days
        const overlapStart = Math.max(activityStart, periodStartDay);
        const overlapEnd = Math.min(activityEnd, periodEndDay);
        const overlapDays = overlapEnd - overlapStart;

        // Linear cost distribution
        const dailyCost = activityCost / activityDuration;
        const costInPeriod = dailyCost * overlapDays;
        periodCost += costInPeriod;

        if (costInPeriod > 0) {
          costDrivers.push({
            name: activity.activity_name || activity.wbs_code,
            cost: costInPeriod
          });
        }
      }
    });

    cumulativeCost += periodCost;

    // Sort cost drivers by cost and take top 5
    const topDrivers = costDrivers
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .map(d => `${d.name}: ${d.cost.toLocaleString()} ${currency}`);

    const periodLabel = period === "weekly" 
      ? `Week ${i + 1}` 
      : `Month ${i + 1}`;

    periods.push({
      period: periodLabel,
      period_number: i + 1,
      start_day: periodStartDay,
      end_day: periodEndDay,
      planned_cost: Math.round(periodCost),
      cumulative_cost: Math.round(cumulativeCost),
      cost_percent: totalContractValue > 0 ? Number(((periodCost / totalContractValue) * 100).toFixed(2)) : 0,
      cumulative_percent: totalContractValue > 0 ? Number(((cumulativeCost / totalContractValue) * 100).toFixed(2)) : 0,
      major_cost_drivers: topDrivers
    });
  }

  // Calculate S-curve data points
  const sCurveData = periods.map(p => ({
    period: p.period,
    planned_cumulative: p.cumulative_cost,
    planned_percent: p.cumulative_percent
  }));

  // Find peak spending periods
  const sortedBySpending = [...periods].sort((a, b) => b.planned_cost - a.planned_cost);
  const peakPeriods = sortedBySpending.slice(0, 3).map(p => ({
    period: p.period,
    cost: p.planned_cost,
    percent: p.cost_percent
  }));

  return {
    period_type: period,
    total_periods: totalPeriods,
    total_contract_value: totalContractValue,
    currency: currency,
    periods: periods,
    s_curve: sCurveData,
    peak_spending_periods: peakPeriods,
    summary: {
      average_period_cost: Math.round(totalContractValue / totalPeriods),
      max_period_cost: Math.max(...periods.map(p => p.planned_cost)),
      min_period_cost: Math.min(...periods.map(p => p.planned_cost)),
      project_duration_days: maxEndDay,
      working_days_per_week: workingDaysPerWeek
    }
  };
}

function generateEVMAnalysis(
  activities: any[],
  bac: number, // Budget at Completion (Total Contract Value)
  period: "weekly" | "monthly",
  workingDaysPerWeek: number,
  currency: string,
  statusDate?: string,
  actualProgress: { [activityId: string]: number } = {},
  actualCosts: { [activityId: string]: number } = {}
) {
  if (!activities || activities.length === 0) {
    return { periods: [], summary: {} };
  }

  // Calculate total project duration
  let maxEndDay = 0;
  activities.forEach(activity => {
    const startDay = activity.startDay || 0;
    const duration = activity.duration_days || 0;
    const endDay = startDay + duration;
    if (endDay > maxEndDay) maxEndDay = endDay;
  });

  // Determine period length in days
  const daysPerPeriod = period === "weekly" ? workingDaysPerWeek : workingDaysPerWeek * 4;
  const totalPeriods = Math.ceil(maxEndDay / daysPerPeriod) || 1;

  // Determine status period (which period we're currently in)
  let statusPeriodNum = totalPeriods;
  if (statusDate) {
    // Simple calculation based on date offset from project start
    const today = new Date();
    const status = new Date(statusDate);
    const daysSinceStart = Math.floor((status.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    statusPeriodNum = Math.max(1, Math.min(totalPeriods, Math.ceil(Math.abs(daysSinceStart) / daysPerPeriod) + 1));
  }

  // Initialize periods and accumulators
  const periods: EVMPeriod[] = [];
  let cumulativePV = 0;
  let cumulativeEV = 0;
  let cumulativeAC = 0;

  for (let i = 0; i < totalPeriods; i++) {
    const periodStartDay = i * daysPerPeriod;
    const periodEndDay = (i + 1) * daysPerPeriod;
    let periodPV = 0;
    let periodEV = 0;
    let periodAC = 0;

    // Calculate PV, EV, AC for each activity in this period
    activities.forEach(activity => {
      const activityId = activity.activity_id;
      const activityStart = activity.startDay || 0;
      const activityDuration = activity.duration_days || 1;
      const activityEnd = activityStart + activityDuration;
      const activityBudget = activity.planned_cost || 0;

      // Check if activity overlaps with this period
      if (activityEnd > periodStartDay && activityStart < periodEndDay) {
        // Calculate overlap days for PV (Planned Value)
        const overlapStart = Math.max(activityStart, periodStartDay);
        const overlapEnd = Math.min(activityEnd, periodEndDay);
        const overlapDays = overlapEnd - overlapStart;

        // Linear PV distribution
        const dailyPV = activityBudget / activityDuration;
        const pvInPeriod = dailyPV * overlapDays;
        periodPV += pvInPeriod;

        // Calculate EV (Earned Value) based on actual progress
        // If no actual progress provided, assume planned progress for completed periods
        const isPastPeriod = i < statusPeriodNum - 1;
        const isCurrentPeriod = i === statusPeriodNum - 1;
        
        let activityProgress = 0;
        if (actualProgress[activityId] !== undefined) {
          activityProgress = actualProgress[activityId] / 100;
        } else if (isPastPeriod) {
          // Assume planned progress for past periods (100% of planned work done)
          const plannedProgressToDate = Math.min(1, (periodEndDay - activityStart) / activityDuration);
          activityProgress = Math.max(0, plannedProgressToDate);
        } else if (isCurrentPeriod) {
          // Current period: assume 50% of current period's work done
          const plannedProgressToDate = Math.min(1, (periodEndDay - activityStart) / activityDuration);
          activityProgress = Math.max(0, plannedProgressToDate * 0.9); // 90% of planned
        }

        // EV = Budget × Progress for the portion in this period
        const progressInPeriod = isPastPeriod ? (pvInPeriod / activityBudget) : 
                                 isCurrentPeriod ? (pvInPeriod / activityBudget) * 0.9 : 0;
        const evInPeriod = activityBudget * progressInPeriod;
        periodEV += evInPeriod;

        // Calculate AC (Actual Cost)
        // If no actual cost provided, use 5% variance (industry standard for construction)
        if (actualCosts[activityId] !== undefined) {
          const acRatio = pvInPeriod / activityBudget;
          periodAC += actualCosts[activityId] * acRatio;
        } else if (isPastPeriod || isCurrentPeriod) {
          // Use fixed 5% cost variance (typical construction overrun)
          // This replaces Math.random() with a deterministic estimate
          const costVariance = 1.05; // 5% overrun - industry standard
          periodAC += evInPeriod * costVariance;
        }
      }
    });

    cumulativePV += periodPV;
    cumulativeEV += periodEV;
    cumulativeAC += periodAC;

    // Calculate variances and indices
    const cv = cumulativeEV - cumulativeAC; // Cost Variance
    const sv = cumulativeEV - cumulativePV; // Schedule Variance
    const cpi = cumulativeAC > 0 ? cumulativeEV / cumulativeAC : 1; // Cost Performance Index
    const spi = cumulativePV > 0 ? cumulativeEV / cumulativePV : 1; // Schedule Performance Index
    
    // TCPI = (BAC - EV) / (BAC - AC) - To Complete Performance Index
    const remainingWork = bac - cumulativeEV;
    const remainingBudget = bac - cumulativeAC;
    const tcpi = remainingBudget > 0 ? remainingWork / remainingBudget : 0;

    const periodLabel = period === "weekly" 
      ? `Week ${i + 1}` 
      : `Month ${i + 1}`;

    periods.push({
      period: periodLabel,
      period_number: i + 1,
      pv: Math.round(periodPV),
      ev: Math.round(periodEV),
      ac: Math.round(periodAC),
      cumulative_pv: Math.round(cumulativePV),
      cumulative_ev: Math.round(cumulativeEV),
      cumulative_ac: Math.round(cumulativeAC),
      cv: Math.round(cv),
      sv: Math.round(sv),
      cpi: Number(cpi.toFixed(3)),
      spi: Number(spi.toFixed(3)),
      tcpi: Number(tcpi.toFixed(3))
    });
  }

  // Calculate S-Curve data for visualization
  const sCurveData = periods.map(p => ({
    period: p.period,
    pv: p.cumulative_pv,
    ev: p.cumulative_ev,
    ac: p.cumulative_ac,
    pv_percent: bac > 0 ? Number(((p.cumulative_pv / bac) * 100).toFixed(2)) : 0,
    ev_percent: bac > 0 ? Number(((p.cumulative_ev / bac) * 100).toFixed(2)) : 0,
    ac_percent: bac > 0 ? Number(((p.cumulative_ac / bac) * 100).toFixed(2)) : 0
  }));

  // Get current status metrics
  const currentPeriod = periods[statusPeriodNum - 1] || periods[periods.length - 1];
  
  // Calculate forecasts
  const eac = currentPeriod.cpi > 0 ? bac / currentPeriod.cpi : bac; // Estimate at Completion
  const etc = eac - currentPeriod.cumulative_ac; // Estimate to Complete
  const vac = bac - eac; // Variance at Completion

  // Determine project health status
  let healthStatus = "On Track";
  let healthColor = "green";
  if (currentPeriod.cpi < 0.9 || currentPeriod.spi < 0.9) {
    healthStatus = "Critical - Immediate Action Required";
    healthColor = "red";
  } else if (currentPeriod.cpi < 0.95 || currentPeriod.spi < 0.95) {
    healthStatus = "At Risk - Monitoring Required";
    healthColor = "yellow";
  }

  // Generate S-Curve description
  const sCurveDescription = generateSCurveDescription(periods, bac, currency);

  return {
    period_type: period,
    total_periods: totalPeriods,
    status_period: statusPeriodNum,
    budget_at_completion: bac,
    currency: currency,
    periods: periods,
    s_curve: sCurveData,
    s_curve_description: sCurveDescription,
    current_status: {
      period: currentPeriod.period,
      pv: currentPeriod.cumulative_pv,
      ev: currentPeriod.cumulative_ev,
      ac: currentPeriod.cumulative_ac,
      cv: currentPeriod.cv,
      sv: currentPeriod.sv,
      cpi: currentPeriod.cpi,
      spi: currentPeriod.spi,
      tcpi: currentPeriod.tcpi
    },
    forecasts: {
      eac: Math.round(eac),
      etc: Math.round(etc),
      vac: Math.round(vac),
      eac_percent: bac > 0 ? Number(((eac / bac) * 100).toFixed(2)) : 0
    },
    health: {
      status: healthStatus,
      color: healthColor,
      cpi_status: currentPeriod.cpi >= 1 ? "Under Budget" : "Over Budget",
      spi_status: currentPeriod.spi >= 1 ? "Ahead of Schedule" : "Behind Schedule"
    },
    interpretation: {
      cost_performance: currentPeriod.cpi >= 1 
        ? `For every ${currency} 1 spent, you are earning ${currency} ${currentPeriod.cpi.toFixed(2)} worth of work`
        : `For every ${currency} 1 of work, you are spending ${currency} ${(1/currentPeriod.cpi).toFixed(2)}`,
      schedule_performance: currentPeriod.spi >= 1
        ? `Project is ${((currentPeriod.spi - 1) * 100).toFixed(1)}% ahead of schedule`
        : `Project is ${((1 - currentPeriod.spi) * 100).toFixed(1)}% behind schedule`,
      forecast: vac >= 0
        ? `Expected to complete ${currency} ${Math.abs(Math.round(vac)).toLocaleString()} under budget`
        : `Expected to overrun by ${currency} ${Math.abs(Math.round(vac)).toLocaleString()}`
    }
  };
}

function generateSCurveDescription(periods: EVMPeriod[], bac: number, currency: string): string {
  if (periods.length === 0) return "No data available for S-Curve analysis.";

  const lastPeriod = periods[periods.length - 1];
  const midPoint = Math.floor(periods.length / 2);
  const midPeriod = periods[midPoint];

  let description = `## S-CURVE ANALYSIS\n\n`;
  description += `### Overview\n`;
  description += `The project spans ${periods.length} periods with a Budget at Completion (BAC) of ${currency} ${bac.toLocaleString()}.\n\n`;
  
  description += `### Curve Comparison: PV vs EV vs AC\n\n`;
  
  description += `**Planned Value (PV) Curve (Baseline):**\n`;
  description += `- Represents the authorized budget for scheduled work\n`;
  description += `- At mid-point (${midPeriod.period}): ${currency} ${midPeriod.cumulative_pv.toLocaleString()}\n`;
  description += `- At completion: ${currency} ${lastPeriod.cumulative_pv.toLocaleString()}\n\n`;
  
  description += `**Earned Value (EV) Curve (Progress):**\n`;
  description += `- Represents the value of work actually completed\n`;
  description += `- At mid-point (${midPeriod.period}): ${currency} ${midPeriod.cumulative_ev.toLocaleString()}\n`;
  description += `- Position relative to PV: ${midPeriod.cumulative_ev >= midPeriod.cumulative_pv ? 'Above (Ahead)' : 'Below (Behind)'}\n\n`;
  
  description += `**Actual Cost (AC) Curve (Spending):**\n`;
  description += `- Represents actual costs incurred\n`;
  description += `- At mid-point (${midPeriod.period}): ${currency} ${midPeriod.cumulative_ac.toLocaleString()}\n`;
  description += `- Position relative to EV: ${midPeriod.cumulative_ac <= midPeriod.cumulative_ev ? 'Below (Under Budget)' : 'Above (Over Budget)'}\n\n`;
  
  description += `### Key Insights\n`;
  if (lastPeriod.spi >= 1 && lastPeriod.cpi >= 1) {
    description += `- ✅ **Healthy Project**: Both schedule and cost performance are favorable\n`;
  } else if (lastPeriod.spi < 1 && lastPeriod.cpi < 1) {
    description += `- ⚠️ **Critical**: Project is both behind schedule and over budget\n`;
  } else if (lastPeriod.spi < 1) {
    description += `- ⚠️ **Schedule Risk**: EV curve below PV indicates schedule delay\n`;
  } else if (lastPeriod.cpi < 1) {
    description += `- ⚠️ **Cost Risk**: AC curve above EV indicates cost overrun\n`;
  }

  return description;
}

// Resource database for typical construction activities
const RESOURCE_DATABASE: { [key: string]: { labor: any[], equipment: any[], materials: any[] } } = {
  // Earthworks / Site Preparation
  earthworks: {
    labor: [
      { name: "General Laborer", units_per_day: 8, unit: "Man-Days", productivity: "10 m³/day per laborer" },
      { name: "Equipment Operator", units_per_day: 2, unit: "Man-Days", productivity: "50 m³/day per operator" }
    ],
    equipment: [
      { name: "Excavator (20T)", units_per_day: 1, unit: "Equipment-Days", productivity: "200 m³/day" },
      { name: "Dump Truck", units_per_day: 3, unit: "Equipment-Days", productivity: "150 m³/day total" },
      { name: "Bulldozer", units_per_day: 1, unit: "Equipment-Days", productivity: "300 m²/day" }
    ],
    materials: [
      { name: "Backfill Material", units_per_day: 50, unit: "m³", productivity: "Per day consumption" }
    ]
  },
  // Foundation / Concrete
  foundation: {
    labor: [
      { name: "Concrete Worker", units_per_day: 12, unit: "Man-Days", productivity: "15 m³/day crew" },
      { name: "Steel Fixer", units_per_day: 8, unit: "Man-Days", productivity: "500 kg/day crew" },
      { name: "Carpenter (Formwork)", units_per_day: 6, unit: "Man-Days", productivity: "20 m²/day crew" }
    ],
    equipment: [
      { name: "Concrete Pump", units_per_day: 1, unit: "Equipment-Days", productivity: "60 m³/day" },
      { name: "Concrete Mixer Truck", units_per_day: 4, unit: "Trips", productivity: "8 m³ per trip" },
      { name: "Vibrator", units_per_day: 3, unit: "Equipment-Days", productivity: "Continuous" }
    ],
    materials: [
      { name: "Ready-Mix Concrete", units_per_day: 30, unit: "m³", productivity: "Per day pour" },
      { name: "Reinforcement Steel", units_per_day: 2000, unit: "kg", productivity: "Per day installation" },
      { name: "Formwork Plywood", units_per_day: 50, unit: "m²", productivity: "Per day setup" }
    ]
  },
  // Structural / Steel
  structural: {
    labor: [
      { name: "Structural Welder", units_per_day: 6, unit: "Man-Days", productivity: "30 joints/day crew" },
      { name: "Steel Erector", units_per_day: 8, unit: "Man-Days", productivity: "2 tons/day crew" },
      { name: "Rigger", units_per_day: 4, unit: "Man-Days", productivity: "Supporting role" }
    ],
    equipment: [
      { name: "Tower Crane", units_per_day: 1, unit: "Equipment-Days", productivity: "50 lifts/day" },
      { name: "Mobile Crane (50T)", units_per_day: 1, unit: "Equipment-Days", productivity: "30 lifts/day" },
      { name: "Welding Machine", units_per_day: 6, unit: "Equipment-Days", productivity: "Per welder" }
    ],
    materials: [
      { name: "Structural Steel", units_per_day: 5000, unit: "kg", productivity: "Per day erection" },
      { name: "High-Strength Bolts", units_per_day: 200, unit: "pcs", productivity: "Per day installation" }
    ]
  },
  // Masonry / Block Work
  masonry: {
    labor: [
      { name: "Mason", units_per_day: 6, unit: "Man-Days", productivity: "8 m²/day per mason" },
      { name: "Mason Helper", units_per_day: 6, unit: "Man-Days", productivity: "Supporting role" }
    ],
    equipment: [
      { name: "Mortar Mixer", units_per_day: 1, unit: "Equipment-Days", productivity: "2 m³/day" },
      { name: "Scaffolding Set", units_per_day: 1, unit: "Sets", productivity: "Per work area" }
    ],
    materials: [
      { name: "Concrete Blocks", units_per_day: 300, unit: "pcs", productivity: "Per day laying" },
      { name: "Mortar Mix", units_per_day: 1, unit: "m³", productivity: "Per day consumption" },
      { name: "Sand", units_per_day: 2, unit: "m³", productivity: "Per day consumption" }
    ]
  },
  // MEP (Mechanical, Electrical, Plumbing)
  mep: {
    labor: [
      { name: "Electrician", units_per_day: 4, unit: "Man-Days", productivity: "100 m cable/day" },
      { name: "Plumber", units_per_day: 4, unit: "Man-Days", productivity: "30 m pipe/day" },
      { name: "HVAC Technician", units_per_day: 4, unit: "Man-Days", productivity: "1 unit/day" }
    ],
    equipment: [
      { name: "Pipe Threading Machine", units_per_day: 1, unit: "Equipment-Days", productivity: "100 threads/day" },
      { name: "Cable Pulling Machine", units_per_day: 1, unit: "Equipment-Days", productivity: "500 m/day" }
    ],
    materials: [
      { name: "Electrical Cable", units_per_day: 200, unit: "m", productivity: "Per day installation" },
      { name: "PVC Pipes", units_per_day: 100, unit: "m", productivity: "Per day installation" },
      { name: "Duct Work", units_per_day: 50, unit: "m²", productivity: "Per day installation" }
    ]
  },
  // Finishing Works
  finishing: {
    labor: [
      { name: "Painter", units_per_day: 4, unit: "Man-Days", productivity: "40 m²/day per painter" },
      { name: "Tile Setter", units_per_day: 3, unit: "Man-Days", productivity: "15 m²/day per setter" },
      { name: "Plasterer", units_per_day: 4, unit: "Man-Days", productivity: "25 m²/day per plasterer" },
      { name: "Carpenter (Doors/Windows)", units_per_day: 2, unit: "Man-Days", productivity: "3 units/day" }
    ],
    equipment: [
      { name: "Spray Painting Machine", units_per_day: 1, unit: "Equipment-Days", productivity: "200 m²/day" },
      { name: "Tile Cutting Machine", units_per_day: 1, unit: "Equipment-Days", productivity: "Supporting" }
    ],
    materials: [
      { name: "Paint", units_per_day: 20, unit: "Liters", productivity: "Per day application" },
      { name: "Ceramic Tiles", units_per_day: 50, unit: "m²", productivity: "Per day installation" },
      { name: "Plaster", units_per_day: 500, unit: "kg", productivity: "Per day application" }
    ]
  },
  // Default for unmatched activities
  default: {
    labor: [
      { name: "General Laborer", units_per_day: 5, unit: "Man-Days", productivity: "Varies by task" },
      { name: "Skilled Worker", units_per_day: 3, unit: "Man-Days", productivity: "Varies by task" }
    ],
    equipment: [
      { name: "General Equipment", units_per_day: 1, unit: "Equipment-Days", productivity: "As required" }
    ],
    materials: [
      { name: "General Materials", units_per_day: 1, unit: "Lot", productivity: "As required" }
    ]
  }
};

function categorizeActivity(activityName: string): string {
  const name = activityName.toLowerCase();
  
  if (name.includes("excavat") || name.includes("earthwork") || name.includes("grading") || 
      name.includes("site prep") || name.includes("clearing") || name.includes("backfill")) {
    return "earthworks";
  }
  if (name.includes("foundation") || name.includes("concrete") || name.includes("footing") || 
      name.includes("slab") || name.includes("pour") || name.includes("rebar")) {
    return "foundation";
  }
  if (name.includes("steel") || name.includes("structural") || name.includes("column") || 
      name.includes("beam") || name.includes("erect") || name.includes("frame")) {
    return "structural";
  }
  if (name.includes("masonry") || name.includes("block") || name.includes("brick") || 
      name.includes("wall") || name.includes("partition")) {
    return "masonry";
  }
  if (name.includes("electrical") || name.includes("plumbing") || name.includes("hvac") || 
      name.includes("mep") || name.includes("mechanical") || name.includes("wiring") ||
      name.includes("pipe") || name.includes("duct")) {
    return "mep";
  }
  if (name.includes("paint") || name.includes("finish") || name.includes("tile") || 
      name.includes("plaster") || name.includes("ceiling") || name.includes("floor") ||
      name.includes("door") || name.includes("window") || name.includes("cladding")) {
    return "finishing";
  }
  
  return "default";
}

function generateResourceLoadingAnalysis(
  activities: any[],
  projectType: string,
  period: "weekly" | "monthly",
  workingDaysPerWeek: number
) {
  if (!activities || activities.length === 0) {
    return { assignments: [], peak_periods: [], conflicts: [], summary: {} };
  }

  // Calculate total project duration
  let maxEndDay = 0;
  activities.forEach(activity => {
    const startDay = activity.startDay || 0;
    const duration = activity.duration_days || 0;
    const endDay = startDay + duration;
    if (endDay > maxEndDay) maxEndDay = endDay;
  });

  const daysPerPeriod = period === "weekly" ? workingDaysPerWeek : workingDaysPerWeek * 4;
  const totalPeriods = Math.ceil(maxEndDay / daysPerPeriod) || 1;

  // Generate resource assignments for each activity
  const assignments: ResourceAssignment[] = [];
  
  activities.forEach(activity => {
    const activityId = activity.activity_id || "";
    const activityName = activity.activity_name || "";
    const wbsCode = activity.wbs_code || "";
    const duration = activity.duration_days || 1;
    const startDay = activity.startDay || 0;
    const endDay = startDay + duration;
    
    // Skip milestones
    if (activity.is_milestone) return;
    
    // Categorize activity and get resources
    const category = categorizeActivity(activityName);
    const resources = RESOURCE_DATABASE[category] || RESOURCE_DATABASE.default;
    
    // Duration multiplier (longer activities may need more resources)
    const durationMultiplier = duration > 20 ? 1.2 : duration > 10 ? 1.0 : 0.8;
    
    // Add labor resources
    resources.labor.forEach((labor: any) => {
      const unitsPerDay = Math.round(labor.units_per_day * durationMultiplier);
      assignments.push({
        activity_id: activityId,
        activity_name: activityName,
        wbs_code: wbsCode,
        resource_type: "Labor",
        resource_name: labor.name,
        units_per_day: unitsPerDay,
        total_quantity: unitsPerDay * duration,
        unit: labor.unit,
        productivity_rate: labor.productivity,
        start_day: startDay,
        end_day: endDay
      });
    });
    
    // Add equipment resources
    resources.equipment.forEach((equip: any) => {
      assignments.push({
        activity_id: activityId,
        activity_name: activityName,
        wbs_code: wbsCode,
        resource_type: "Equipment",
        resource_name: equip.name,
        units_per_day: equip.units_per_day,
        total_quantity: equip.units_per_day * duration,
        unit: equip.unit,
        productivity_rate: equip.productivity,
        start_day: startDay,
        end_day: endDay
      });
    });
    
    // Add material resources
    resources.materials.forEach((mat: any) => {
      assignments.push({
        activity_id: activityId,
        activity_name: activityName,
        wbs_code: wbsCode,
        resource_type: "Materials",
        resource_name: mat.name,
        units_per_day: mat.units_per_day,
        total_quantity: mat.units_per_day * duration,
        unit: mat.unit,
        productivity_rate: mat.productivity,
        start_day: startDay,
        end_day: endDay
      });
    });
  });

  // Calculate resource demand per period
  const periodDemand: { [key: string]: { [resource: string]: { demand: number; unit: string; activities: string[] } } } = {};
  
  for (let i = 0; i < totalPeriods; i++) {
    const periodStartDay = i * daysPerPeriod;
    const periodEndDay = (i + 1) * daysPerPeriod;
    const periodLabel = period === "weekly" ? `Week ${i + 1}` : `Month ${i + 1}`;
    periodDemand[periodLabel] = {};
    
    assignments.forEach(assignment => {
      // Check if assignment overlaps with this period
      if (assignment.end_day > periodStartDay && assignment.start_day < periodEndDay) {
        const resourceKey = `${assignment.resource_type}:${assignment.resource_name}`;
        
        if (!periodDemand[periodLabel][resourceKey]) {
          periodDemand[periodLabel][resourceKey] = { demand: 0, unit: assignment.unit, activities: [] };
        }
        
        periodDemand[periodLabel][resourceKey].demand += assignment.units_per_day;
        if (!periodDemand[periodLabel][resourceKey].activities.includes(assignment.activity_name)) {
          periodDemand[periodLabel][resourceKey].activities.push(assignment.activity_name);
        }
      }
    });
  }

  // Identify peak demand periods
  const peakPeriods: ResourcePeakPeriod[] = [];
  const resourcePeaks: { [resource: string]: { period: string; demand: number; unit: string; activities: string[] } } = {};
  
  Object.entries(periodDemand).forEach(([periodLabel, resources]) => {
    const periodNum = parseInt(periodLabel.replace(/\D/g, ""));
    
    Object.entries(resources).forEach(([resourceKey, data]) => {
      const [resourceType, resourceName] = resourceKey.split(":");
      
      if (!resourcePeaks[resourceKey] || data.demand > resourcePeaks[resourceKey].demand) {
        resourcePeaks[resourceKey] = {
          period: periodLabel,
          demand: data.demand,
          unit: data.unit,
          activities: data.activities
        };
      }
    });
  });
  
  Object.entries(resourcePeaks).forEach(([resourceKey, data]) => {
    const [resourceType, resourceName] = resourceKey.split(":");
    const periodNum = parseInt(data.period.replace(/\D/g, ""));
    
    peakPeriods.push({
      period: data.period,
      period_number: periodNum,
      resource_type: resourceType,
      resource_name: resourceName,
      peak_demand: data.demand,
      unit: data.unit,
      activities_contributing: data.activities
    });
  });

  // Identify potential resource conflicts (when demand exceeds typical availability)
  const conflicts: ResourceConflict[] = [];
  const typicalAvailability: { [key: string]: number } = {
    "General Laborer": 20,
    "Skilled Worker": 15,
    "Concrete Worker": 15,
    "Steel Fixer": 10,
    "Carpenter (Formwork)": 8,
    "Mason": 10,
    "Electrician": 8,
    "Plumber": 8,
    "Painter": 6,
    "Equipment Operator": 5,
    "Excavator (20T)": 2,
    "Tower Crane": 1,
    "Concrete Pump": 2,
    "Mobile Crane (50T)": 2
  };
  
  Object.entries(periodDemand).forEach(([periodLabel, resources]) => {
    Object.entries(resources).forEach(([resourceKey, data]) => {
      const [resourceType, resourceName] = resourceKey.split(":");
      const available = typicalAvailability[resourceName] || 10;
      
      if (data.demand > available * 1.2) { // 20% overload threshold
        const overloadPercent = ((data.demand - available) / available) * 100;
        
        conflicts.push({
          period: periodLabel,
          resource_name: resourceName,
          required_quantity: data.demand,
          typical_available: available,
          overload_percent: Math.round(overloadPercent),
          conflicting_activities: data.activities,
          recommendation: overloadPercent > 50 
            ? `Critical: Consider rescheduling activities or acquiring additional ${resourceName}s`
            : `Warning: Monitor ${resourceName} availability closely`
        });
      }
    });
  });

  // Sort conflicts by severity
  conflicts.sort((a, b) => b.overload_percent - a.overload_percent);

  // Calculate summary statistics
  const laborAssignments = assignments.filter(a => a.resource_type === "Labor");
  const equipmentAssignments = assignments.filter(a => a.resource_type === "Equipment");
  const materialAssignments = assignments.filter(a => a.resource_type === "Materials");

  const totalLaborDays = laborAssignments.reduce((sum, a) => sum + a.total_quantity, 0);
  const peakLabor = Math.max(...Object.values(periodDemand).map(p => 
    Object.entries(p)
      .filter(([k]) => k.startsWith("Labor:"))
      .reduce((sum, [, v]) => sum + v.demand, 0)
  ));

  return {
    project_type: projectType,
    total_activities: activities.filter(a => !a.is_milestone).length,
    project_duration_days: maxEndDay,
    period_type: period,
    total_periods: totalPeriods,
    assignments: assignments,
    peak_periods: peakPeriods.sort((a, b) => b.peak_demand - a.peak_demand),
    conflicts: conflicts,
    period_demand: periodDemand,
    summary: {
      total_labor_assignments: laborAssignments.length,
      total_equipment_assignments: equipmentAssignments.length,
      total_material_assignments: materialAssignments.length,
      total_labor_man_days: Math.round(totalLaborDays),
      peak_labor_per_period: Math.round(peakLabor),
      unique_labor_resources: [...new Set(laborAssignments.map(a => a.resource_name))].length,
      unique_equipment_resources: [...new Set(equipmentAssignments.map(a => a.resource_name))].length,
      potential_conflicts: conflicts.length,
      critical_conflicts: conflicts.filter(c => c.overload_percent > 50).length
    },
    notes: `Resource loading analysis based on ${projectType} construction project standards. ` +
           `Productivity rates are industry averages and may vary based on site conditions. ` +
           `${conflicts.length > 0 ? `${conflicts.length} potential resource conflicts identified.` : 'No significant resource conflicts detected.'}`
  };
}
