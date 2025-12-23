import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Link2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  AlertCircle,
  Lightbulb,
  Calendar,
  DollarSign,
  Clock,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend
} from "recharts";

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

interface RelatedBOQItem {
  item_number: string;
  description: string;
  cost: number;
}

interface CostLoadedActivity {
  activity_id: string;
  activity_name: string;
  trade_category: string;
  related_boq_items: RelatedBOQItem[];
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

interface MisalignmentRisk {
  risk_type: string;
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
}

interface ScheduleIntegrationProps {
  items: BOQItem[];
  wbsData?: WBSItem[];
  currency?: string;
}

export function ScheduleIntegration({ items, wbsData, currency = "SAR" }: ScheduleIntegrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScheduleIntegrationResult | null>(null);
  const [activeSection, setActiveSection] = useState<"schedule" | "scurve" | "cashflow" | "orphans" | "risks">("schedule");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedRows(newSet);
  };

  const analyzeIntegration = async () => {
    if (!items || items.length === 0) {
      toast.error("No BOQ items available for analysis");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-schedule-integration", {
        body: { 
          boq_items: items,
          wbs_data: wbsData
        }
      });

      if (error) throw error;
      
      setResult(data);
      toast.success("Cost-loaded schedule analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze schedule integration");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "";
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-red-500";
      case "elevated":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Calendar className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Cost-Loaded Project Schedule</h3>
          <p className="text-muted-foreground max-w-md">
            Convert your BOQ into a cost-loaded schedule with activity durations, dates, predecessors, and S-curve analysis.
          </p>
        </div>
        <Button 
          onClick={analyzeIntegration} 
          disabled={isLoading}
          size="lg"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Building Cost-Loaded Schedule...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Generate Cost-Loaded Schedule
            </>
          )}
        </Button>
      </div>
    );
  }

  const { integration_summary } = result;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Integration Score</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-primary">{integration_summary.integration_score}%</span>
          </div>
          <Progress value={integration_summary.integration_score} className="mt-2 h-2" />
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">Project Duration</span>
          </div>
          <span className="text-3xl font-bold text-blue-600">{integration_summary.total_project_duration}</span>
          <span className="text-sm text-muted-foreground ml-2">days</span>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Scheduled Cost</span>
          </div>
          <span className="text-2xl font-bold text-green-600">{integration_summary.scheduled_cost.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground ml-1">{currency}</span>
        </div>

        <div className={cn(
          "p-4 rounded-xl border",
          Math.abs(integration_summary.variance_percent) < 1 
            ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
            : "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className={cn(
              "w-5 h-5",
              Math.abs(integration_summary.variance_percent) < 1 ? "text-green-500" : "text-yellow-500"
            )} />
            <span className="text-sm text-muted-foreground">Cost Variance</span>
          </div>
          <span className={cn(
            "text-2xl font-bold",
            Math.abs(integration_summary.variance_percent) < 1 ? "text-green-600" : "text-yellow-600"
          )}>
            {integration_summary.variance_percent > 0 ? "+" : ""}{integration_summary.variance_percent.toFixed(2)}%
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            {integration_summary.cost_variance.toLocaleString()} {currency}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-muted-foreground">Activities</span>
          </div>
          <span className="text-3xl font-bold text-purple-600">{integration_summary.total_schedule_activities}</span>
          <p className="text-xs text-muted-foreground mt-1">
            {integration_summary.linked_boq_items} BOQ items linked
          </p>
        </div>
      </div>

      {/* Project Dates */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <span className="text-sm text-muted-foreground">Project Start:</span>
            <span className="ml-2 font-semibold">{integration_summary.project_start_date}</span>
          </div>
        </div>
        <div className="h-px flex-1 bg-border mx-4 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background px-3 text-sm text-muted-foreground">
              {integration_summary.total_project_duration} days
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Project Finish:</span>
            <span className="ml-2 font-semibold">{integration_summary.project_finish_date}</span>
          </div>
          <Calendar className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "schedule", label: "Cost-Loaded Schedule", icon: <Calendar className="w-4 h-4" /> },
          { id: "scurve", label: "S-Curve", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "cashflow", label: "Cash Flow", icon: <DollarSign className="w-4 h-4" /> },
          { id: "orphans", label: `Orphan Items (${result.orphan_boq_items.length})`, icon: <AlertCircle className="w-4 h-4" /> },
          { id: "risks", label: `Risks (${result.misalignment_risks.length})`, icon: <AlertTriangle className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeSection === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={analyzeIntegration} disabled={isLoading} className="ml-auto gap-2">
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Cost-Loaded Schedule Table */}
      {activeSection === "schedule" && (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Activity ID</span>
                      <span className="text-xs font-normal text-muted-foreground">رقم النشاط</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex flex-col">
                      <span>Activity Name</span>
                      <span className="text-xs font-normal text-muted-foreground">اسم النشاط</span>
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Related BOQ Items</span>
                      <span className="text-xs font-normal text-muted-foreground">بنود جدول الكميات</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Duration (Days)</span>
                      <span className="text-xs font-normal text-muted-foreground">المدة (أيام)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Activity Cost</span>
                      <span className="text-xs font-normal text-muted-foreground">تكلفة النشاط</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Cost Weight (%)</span>
                      <span className="text-xs font-normal text-muted-foreground">الوزن التكلفة</span>
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Start / Finish</span>
                      <span className="text-xs font-normal text-muted-foreground">البداية / النهاية</span>
                    </div>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Predecessors</span>
                      <span className="text-xs font-normal text-muted-foreground">الأنشطة السابقة</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.cost_loaded_schedule.map((activity, idx) => (
                  <>
                    <TableRow 
                      key={idx} 
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => toggleRow(idx)}
                    >
                      <TableCell>
                        {expandedRows.has(idx) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {activity.activity_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{activity.activity_name}</span>
                          <p className="text-xs text-muted-foreground">{activity.trade_category}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{activity.related_boq_items.length} items</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{activity.duration_days}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {activity.activity_cost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <Progress value={activity.cost_weight_percent} className="h-2 w-16" />
                          <span className="text-sm font-medium">{activity.cost_weight_percent.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="text-green-600">{activity.start_date}</p>
                          <p className="text-red-600">{activity.finish_date}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.predecessors.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {activity.predecessors.map((pred, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                {pred}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(idx) && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/20 p-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Related BOQ Items:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {activity.related_boq_items.map((boqItem, i) => (
                                  <div key={i} className="p-2 bg-background rounded border text-sm">
                                    <div className="flex justify-between items-start">
                                      <span className="font-mono text-xs text-primary">{boqItem.item_number}</span>
                                      <span className="font-semibold text-xs">{boqItem.cost.toLocaleString()} {currency}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{boqItem.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-6 text-sm">
                              <div>
                                <span className="text-muted-foreground">Daily Cost Rate:</span>
                                <span className="ml-2 font-semibold">{activity.daily_cost_rate.toLocaleString()} {currency}/day</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Duration:</span>
                                <span className="ml-2 font-semibold">{activity.duration_days} days</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* S-Curve Chart */}
      {activeSection === "scurve" && result.s_curve_data && (
        <div className="space-y-6">
          <div className="border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Planned Cost S-Curve</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.s_curve_data.filter((_, i) => i % Math.ceil(result.s_curve_data.length / 50) === 0)}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day_number" 
                    tickFormatter={(value) => `Day ${value}`}
                    className="text-xs"
                  />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    className="text-xs"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "Cumulative Cost") return `${value.toLocaleString()} ${currency}`;
                      if (name === "Progress (%)") return `${value.toFixed(1)}%`;
                      return value;
                    }}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="planned_cumulative_cost" 
                    name="Cumulative Cost"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorCost)"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="planned_cumulative_percent" 
                    name="Progress (%)"
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Cost Distribution */}
          <div className="border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Cost Distribution</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.s_curve_data.filter((_, i) => i % Math.ceil(result.s_curve_data.length / 30) === 0)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day_number" 
                    tickFormatter={(value) => `D${value}`}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} ${currency}`}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Bar 
                    dataKey="planned_daily_cost" 
                    name="Daily Cost"
                    fill="hsl(var(--primary))" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow */}
      {activeSection === "cashflow" && result.cost_flow_monthly && (
        <div className="space-y-6">
          <div className="border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Cash Flow Projection</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.cost_flow_monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    className="text-xs"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => `${value.toLocaleString()} ${currency}`}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="planned_cost" 
                    name="Monthly Cost"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cumulative_cost" 
                    name="Cumulative"
                    stroke="hsl(var(--success))" 
                    strokeWidth={3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Details Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Monthly Cost</TableHead>
                  <TableHead className="text-right">Cumulative Cost</TableHead>
                  <TableHead className="text-center">Active Activities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.cost_flow_monthly.map((period, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{period.period}</TableCell>
                    <TableCell className="text-right font-mono">
                      {period.planned_cost.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {period.cumulative_cost.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {period.activities_active.slice(0, 3).map((act, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">
                            {act}
                          </span>
                        ))}
                        {period.activities_active.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{period.activities_active.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Orphan BOQ Items */}
      {activeSection === "orphans" && (
        <div className="border rounded-xl overflow-hidden">
          {result.orphan_boq_items.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">All BOQ items are linked!</p>
              <p className="text-muted-foreground">No orphan items found in the analysis.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Cost ({currency})</TableHead>
                  <TableHead>Suggested Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.orphan_boq_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{item.item_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{item.cost.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs">
                        {item.suggested_activity}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Misalignment Risks */}
      {activeSection === "risks" && (
        <div className="space-y-4">
          {/* Cost Concentration */}
          {result.cost_concentration.length > 0 && (
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Cost Concentration Analysis
              </h3>
              <div className="space-y-3">
                {result.cost_concentration.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="w-40 text-sm truncate">{item.activity}</span>
                    <Progress 
                      value={item.percentage} 
                      className={cn(
                        "flex-1 h-3",
                        item.risk_level === "high" && "[&>div]:bg-red-500",
                        item.risk_level === "elevated" && "[&>div]:bg-yellow-500",
                        item.risk_level === "normal" && "[&>div]:bg-green-500"
                      )}
                    />
                    <span className={cn("font-bold w-16 text-right", getRiskLevelColor(item.risk_level))}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.misalignment_risks.length === 0 ? (
            <div className="p-8 text-center border rounded-xl">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">No Misalignment Risks Detected</p>
              <p className="text-muted-foreground">The BOQ and schedule are well aligned.</p>
            </div>
          ) : (
            result.misalignment_risks.map((risk, idx) => (
              <div key={idx} className="p-4 border rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn(
                      "w-5 h-5",
                      risk.severity === "high" && "text-red-500",
                      risk.severity === "medium" && "text-yellow-500",
                      risk.severity === "low" && "text-blue-500"
                    )} />
                    <span className="font-medium capitalize">{risk.risk_type.replace(/_/g, " ")}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium capitalize",
                    getSeverityColor(risk.severity)
                  )}>
                    {risk.severity} severity
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{risk.description}</p>
                {risk.affected_items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {risk.affected_items.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                  <span className="text-sm">{risk.recommendation}</span>
                </div>
              </div>
            ))
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="mt-6 p-4 border rounded-xl bg-gradient-to-br from-primary/5 to-transparent">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                      {idx + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
