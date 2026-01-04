import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Target, 
  AlertCircle,
  Download,
  Maximize2,
  Minimize2,
  Edit3,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
  ReferenceLine
} from "recharts";
import { format, addDays, differenceInDays } from "date-fns";

interface SCurveDataPoint {
  date: string;
  dayNumber: number;
  plannedDaily: number;
  plannedCumulative: number;
  plannedPercent: number;
  actualDaily?: number;
  actualCumulative?: number;
  actualPercent?: number;
  forecastDaily?: number;
  forecastCumulative?: number;
  forecastPercent?: number;
}

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface TimelineItem {
  code: string;
  title: string;
  level: number;
  startDay: number;
  duration: number;
  progress: number;
  isCritical?: boolean;
}

interface SCurveChartProps {
  boqItems?: BOQItem[];
  timelineItems?: TimelineItem[];
  projectStartDate?: Date;
  currency?: string;
  actualProgress?: number; // 0-100
  actualSpentPercentage?: number; // 0-100
  onProgressChange?: (progress: number, spent: number) => void;
  enableManualInput?: boolean;
}

export function SCurveChart({
  boqItems = [],
  timelineItems = [],
  projectStartDate = new Date(),
  currency = "SAR",
  actualProgress: initialProgress = 35,
  actualSpentPercentage: initialSpent = 40,
  onProgressChange,
  enableManualInput = true,
}: SCurveChartProps) {
  const { isArabic } = useLanguage();
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInputPanel, setShowInputPanel] = useState(false);
  
  // Local state for manual input
  const [actualProgress, setActualProgress] = useState(initialProgress);
  const [actualSpentPercentage, setActualSpentPercentage] = useState(initialSpent);
  
  // Handle progress change
  const handleProgressChange = (value: number) => {
    setActualProgress(value);
    onProgressChange?.(value, actualSpentPercentage);
  };
  
  // Handle spent change
  const handleSpentChange = (value: number) => {
    setActualSpentPercentage(value);
    onProgressChange?.(actualProgress, value);
  };

  // Calculate total project value
  const totalProjectValue = useMemo(() => {
    return boqItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [boqItems]);

  // Calculate project duration
  const projectDuration = useMemo(() => {
    if (timelineItems.length > 0) {
      return Math.max(...timelineItems.map(t => t.startDay + t.duration), 90);
    }
    return 180; // Default 6 months
  }, [timelineItems]);

  // Generate S-Curve data
  const scurveData = useMemo(() => {
    const data: SCurveDataPoint[] = [];
    const totalDays = projectDuration;
    const totalValue = totalProjectValue || 1000000;

    // Calculate actual spent amount
    const actualSpent = totalValue * (actualSpentPercentage / 100);
    const currentDay = Math.floor(totalDays * (actualProgress / 100));

    for (let day = 0; day <= totalDays; day += Math.max(1, Math.floor(totalDays / 30))) {
      const t = day / totalDays;
      
      // S-curve formula (sigmoid function) for planned
      const sCurveValue = 1 / (1 + Math.exp(-10 * (t - 0.5)));
      const plannedPercent = sCurveValue * 100;
      const plannedCumulative = totalValue * sCurveValue;
      
      // Daily planned cost (derivative approximation)
      const prevT = Math.max(0, (day - 1)) / totalDays;
      const prevSCurve = 1 / (1 + Math.exp(-10 * (prevT - 0.5)));
      const plannedDaily = totalValue * (sCurveValue - prevSCurve);

      const dataPoint: SCurveDataPoint = {
        date: format(addDays(projectStartDate, day), "yyyy-MM-dd"),
        dayNumber: day,
        plannedDaily: Math.max(0, plannedDaily),
        plannedCumulative,
        plannedPercent,
      };

      // Add actual data up to current progress
      if (day <= currentDay) {
        // Simulate actual with slight variance
        const varianceFactor = 1 + (Math.sin(day * 0.5) * 0.15);
        const actualPercent = plannedPercent * varianceFactor * (actualSpentPercentage / plannedPercent);
        const normalizedActualPercent = Math.min(actualSpentPercentage, actualPercent * (day / currentDay));
        
        dataPoint.actualPercent = normalizedActualPercent;
        dataPoint.actualCumulative = totalValue * (normalizedActualPercent / 100);
        dataPoint.actualDaily = day === 0 ? 0 : 
          (totalValue * (normalizedActualPercent - (data[data.length - 1]?.actualPercent || 0)) / 100);
      }

      // Add forecast data from current point onwards
      if (day >= currentDay) {
        const remainingPercent = 100 - actualSpentPercentage;
        const remainingDays = totalDays - currentDay;
        const progressRatio = (day - currentDay) / remainingDays;
        
        // Forecast follows S-curve pattern for remaining work
        const forecastPercent = actualSpentPercentage + remainingPercent * 
          (1 / (1 + Math.exp(-8 * (progressRatio - 0.5))));
        
        dataPoint.forecastPercent = forecastPercent;
        dataPoint.forecastCumulative = totalValue * (forecastPercent / 100);
      }

      data.push(dataPoint);
    }

    return data;
  }, [projectDuration, totalProjectValue, projectStartDate, actualProgress, actualSpentPercentage]);

  // Calculate EVM metrics
  const evmMetrics = useMemo(() => {
    const bac = totalProjectValue; // Budget at Completion
    const plannedPercentAtProgress = scurveData.find(d => d.dayNumber >= projectDuration * (actualProgress / 100))?.plannedPercent || 50;
    const bcws = bac * (plannedPercentAtProgress / 100); // Budgeted Cost of Work Scheduled
    const bcwp = bac * (actualProgress / 100); // Budgeted Cost of Work Performed (Earned Value)
    const acwp = bac * (actualSpentPercentage / 100); // Actual Cost of Work Performed

    const sv = bcwp - bcws; // Schedule Variance
    const cv = bcwp - acwp; // Cost Variance
    const spi = bcws > 0 ? bcwp / bcws : 1; // Schedule Performance Index
    const cpi = acwp > 0 ? bcwp / acwp : 1; // Cost Performance Index
    const eac = cpi > 0 ? bac / cpi : bac; // Estimate at Completion
    const etc = eac - acwp; // Estimate to Complete
    const vac = bac - eac; // Variance at Completion

    return { bac, bcws, bcwp, acwp, sv, cv, spi, cpi, eac, etc, vac };
  }, [totalProjectValue, scurveData, projectDuration, actualProgress, actualSpentPercentage]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ${currency}`;
    }
    return `${value.toFixed(0)} ${currency}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 text-sm">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="font-medium">
                {entry.name.includes('%') ? `${entry.value?.toFixed(1)}%` : formatCurrency(entry.value || 0)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartContent = ({ height = 400 }: { height?: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={scurveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => format(new Date(value), "MMM d")}
          className="text-muted-foreground"
        />
        <YAxis 
          yAxisId="percent"
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
          className="text-muted-foreground"
        />
        <YAxis 
          yAxisId="cost"
          orientation="right"
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => formatCurrency(value)}
          className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {/* Planned S-Curve */}
        <Area
          yAxisId="percent"
          type="monotone"
          dataKey="plannedPercent"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          fill="url(#plannedGradient)"
          name={isArabic ? "المخطط %" : "Planned %"}
        />
        
        {/* Actual S-Curve */}
        {showActual && (
          <Area
            yAxisId="percent"
            type="monotone"
            dataKey="actualPercent"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#actualGradient)"
            name={isArabic ? "الفعلي %" : "Actual %"}
            connectNulls
          />
        )}
        
        {/* Forecast S-Curve */}
        {showForecast && (
          <Line
            yAxisId="percent"
            type="monotone"
            dataKey="forecastPercent"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name={isArabic ? "التوقعات %" : "Forecast %"}
            connectNulls
          />
        )}

        {/* Reference line at current progress */}
        <ReferenceLine
          x={scurveData.find(d => d.dayNumber >= projectDuration * (actualProgress / 100))?.date}
          yAxisId="percent"
          stroke="#6366f1"
          strokeDasharray="3 3"
          label={{ value: isArabic ? "اليوم" : "Today", position: "top" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {isArabic ? "منحنى S - التدفق النقدي" : "S-Curve - Cash Flow Analysis"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "مقارنة بين التكاليف المخططة والفعلية والمتوقعة" : "Planned vs Actual vs Forecast Cost Comparison"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {enableManualInput && (
              <Button 
                variant={showInputPanel ? "secondary" : "outline"} 
                size="sm"
                onClick={() => setShowInputPanel(!showInputPanel)}
                className="gap-2"
              >
                <Edit3 className="w-4 h-4" />
                {isArabic ? "إدخال يدوي" : "Manual Input"}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="showActual"
                checked={showActual}
                onCheckedChange={setShowActual}
              />
              <Label htmlFor="showActual" className="text-sm">
                {isArabic ? "الفعلي" : "Actual"}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="showForecast"
                checked={showForecast}
                onCheckedChange={setShowForecast}
              />
              <Label htmlFor="showForecast" className="text-sm">
                {isArabic ? "التوقعات" : "Forecast"}
              </Label>
            </div>
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>
                    {isArabic ? "منحنى S - عرض موسع" : "S-Curve - Expanded View"}
                  </DialogTitle>
                </DialogHeader>
                <ChartContent height={500} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Manual Input Panel */}
        {showInputPanel && enableManualInput && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                {isArabic ? "إدخال التقدم الفعلي والتكاليف" : "Enter Actual Progress & Costs"}
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Actual Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{isArabic ? "التقدم الفعلي" : "Actual Progress"}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={actualProgress}
                      onChange={(e) => handleProgressChange(Number(e.target.value))}
                      className="w-20 h-8 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <Slider
                  value={[actualProgress]}
                  onValueChange={([v]) => handleProgressChange(v)}
                  min={0}
                  max={100}
                  step={1}
                  className="[&>span]:bg-indigo-500"
                />
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? "نسبة العمل المنجز فعلياً من إجمالي المشروع" 
                    : "Percentage of work actually completed"}
                </p>
              </div>

              {/* Actual Spent */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{isArabic ? "الإنفاق الفعلي" : "Actual Spent"}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={150}
                      value={actualSpentPercentage}
                      onChange={(e) => handleSpentChange(Number(e.target.value))}
                      className="w-20 h-8 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <Slider
                  value={[actualSpentPercentage]}
                  onValueChange={([v]) => handleSpentChange(v)}
                  min={0}
                  max={150}
                  step={1}
                  className="[&>span]:bg-emerald-500"
                />
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? "نسبة المصروفات الفعلية من الميزانية" 
                    : "Percentage of budget actually spent"}
                </p>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="flex items-center gap-4 pt-2 border-t border-indigo-200 dark:border-indigo-700">
              <div className="flex items-center gap-2 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  evmMetrics.spi >= 1 ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-muted-foreground">SPI:</span>
                <span className="font-medium">{evmMetrics.spi.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  evmMetrics.cpi >= 1 ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-muted-foreground">CPI:</span>
                <span className="font-medium">{evmMetrics.cpi.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{isArabic ? "التكلفة المتوقعة:" : "EAC:"}</span>
                <span className="font-medium">{formatCurrency(evmMetrics.eac)}</span>
              </div>
            </div>
          </div>
        )}

        {/* EVM Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "الميزانية الإجمالية (BAC)" : "Budget at Completion"}
            </div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(evmMetrics.bac)}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "القيمة المكتسبة (EV)" : "Earned Value"}
            </div>
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(evmMetrics.bcwp)}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "مؤشر الجدول (SPI)" : "Schedule Index"}
            </div>
            <div className={cn(
              "text-lg font-bold",
              evmMetrics.spi >= 1 ? "text-green-600" : "text-red-600"
            )}>
              {evmMetrics.spi.toFixed(2)}
            </div>
            <Badge variant={evmMetrics.spi >= 1 ? "default" : "destructive"} className="text-xs">
              {evmMetrics.spi >= 1 
                ? (isArabic ? "متقدم" : "Ahead") 
                : (isArabic ? "متأخر" : "Behind")}
            </Badge>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "مؤشر التكلفة (CPI)" : "Cost Index"}
            </div>
            <div className={cn(
              "text-lg font-bold",
              evmMetrics.cpi >= 1 ? "text-green-600" : "text-red-600"
            )}>
              {evmMetrics.cpi.toFixed(2)}
            </div>
            <Badge variant={evmMetrics.cpi >= 1 ? "default" : "destructive"} className="text-xs">
              {evmMetrics.cpi >= 1 
                ? (isArabic ? "تحت الميزانية" : "Under Budget") 
                : (isArabic ? "فوق الميزانية" : "Over Budget")}
            </Badge>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "التقدير عند الإكمال (EAC)" : "Estimate at Completion"}
            </div>
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(evmMetrics.eac)}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "الفرق عند الإكمال (VAC)" : "Variance at Completion"}
            </div>
            <div className={cn(
              "text-lg font-bold",
              evmMetrics.vac >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {evmMetrics.vac >= 0 ? "+" : ""}{formatCurrency(evmMetrics.vac)}
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{isArabic ? "التقدم الفعلي" : "Actual Progress"}</span>
              <span className="font-medium">{actualProgress}%</span>
            </div>
            <Progress value={actualProgress} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{isArabic ? "الإنفاق الفعلي" : "Actual Spent"}</span>
              <span className="font-medium">{actualSpentPercentage}%</span>
            </div>
            <Progress value={actualSpentPercentage} className="h-2 [&>div]:bg-emerald-500" />
          </div>
        </div>

        {/* S-Curve Chart */}
        <ChartContent height={400} />

        {/* Legend & Analysis */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
            <div className="w-4 h-1 rounded bg-primary"></div>
            <div>
              <p className="text-sm font-medium">{isArabic ? "المخطط" : "Planned"}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "التكلفة المخططة حسب الجدول الأصلي" : "Scheduled cost as per baseline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5">
            <div className="w-4 h-1 rounded bg-emerald-500"></div>
            <div>
              <p className="text-sm font-medium">{isArabic ? "الفعلي" : "Actual"}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "التكلفة الفعلية المصروفة" : "Actual cost incurred to date"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5">
            <div className="w-4 h-1 rounded bg-amber-500" style={{ borderStyle: 'dashed' }}></div>
            <div>
              <p className="text-sm font-medium">{isArabic ? "التوقعات" : "Forecast"}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "التكلفة المتوقعة للإكمال" : "Projected cost to completion"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
