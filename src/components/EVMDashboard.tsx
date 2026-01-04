import { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  DollarSign,
  Calendar,
  Target,
  Gauge,
  Bell,
  Settings2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EVMDashboardProps {
  bac: number; // Budget at Completion
  actualProgress: number; // 0-100
  actualSpent: number; // Actual cost spent
  plannedProgress?: number; // Expected progress at current date (0-100)
  currency?: string;
  onThresholdsChange?: (thresholds: ThresholdSettings) => void;
}

interface ThresholdSettings {
  spiWarning: number;
  spiCritical: number;
  cpiWarning: number;
  cpiCritical: number;
  vacWarningPercent: number;
  enableNotifications: boolean;
}

const defaultThresholds: ThresholdSettings = {
  spiWarning: 0.95,
  spiCritical: 0.85,
  cpiWarning: 0.95,
  cpiCritical: 0.85,
  vacWarningPercent: 10,
  enableNotifications: true,
};

export function EVMDashboard({
  bac,
  actualProgress,
  actualSpent,
  plannedProgress = 50,
  currency = "SAR",
  onThresholdsChange,
}: EVMDashboardProps) {
  const { isArabic } = useLanguage();
  const [thresholds, setThresholds] = useState<ThresholdSettings>(defaultThresholds);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Calculate EVM Metrics
  const evmMetrics = useMemo(() => {
    const pv = bac * (plannedProgress / 100); // Planned Value (BCWS)
    const ev = bac * (actualProgress / 100); // Earned Value (BCWP)
    const ac = actualSpent; // Actual Cost (ACWP)

    const sv = ev - pv; // Schedule Variance
    const cv = ev - ac; // Cost Variance
    const spi = pv > 0 ? ev / pv : 1; // Schedule Performance Index
    const cpi = ac > 0 ? ev / ac : 1; // Cost Performance Index
    const eac = cpi > 0 ? bac / cpi : bac; // Estimate at Completion
    const etc = eac - ac; // Estimate to Complete
    const vac = bac - eac; // Variance at Completion
    const tcpi = (bac - ev) / (bac - ac); // To Complete Performance Index

    return { pv, ev, ac, sv, cv, spi, cpi, eac, etc, vac, tcpi };
  }, [bac, actualProgress, actualSpent, plannedProgress]);

  // Generate Warnings
  const warnings = useMemo(() => {
    const alerts: { type: "critical" | "warning" | "info"; message: string; metric: string }[] = [];

    if (evmMetrics.spi < thresholds.spiCritical) {
      alerts.push({
        type: "critical",
        message: isArabic 
          ? `تأخر حرج في الجدول الزمني! SPI = ${evmMetrics.spi.toFixed(2)}`
          : `Critical schedule delay! SPI = ${evmMetrics.spi.toFixed(2)}`,
        metric: "SPI",
      });
    } else if (evmMetrics.spi < thresholds.spiWarning) {
      alerts.push({
        type: "warning",
        message: isArabic 
          ? `تأخر في الجدول الزمني. SPI = ${evmMetrics.spi.toFixed(2)}`
          : `Schedule delay detected. SPI = ${evmMetrics.spi.toFixed(2)}`,
        metric: "SPI",
      });
    }

    if (evmMetrics.cpi < thresholds.cpiCritical) {
      alerts.push({
        type: "critical",
        message: isArabic 
          ? `تجاوز حرج في التكاليف! CPI = ${evmMetrics.cpi.toFixed(2)}`
          : `Critical cost overrun! CPI = ${evmMetrics.cpi.toFixed(2)}`,
        metric: "CPI",
      });
    } else if (evmMetrics.cpi < thresholds.cpiWarning) {
      alerts.push({
        type: "warning",
        message: isArabic 
          ? `تجاوز في التكاليف. CPI = ${evmMetrics.cpi.toFixed(2)}`
          : `Cost overrun detected. CPI = ${evmMetrics.cpi.toFixed(2)}`,
        metric: "CPI",
      });
    }

    const vacPercent = Math.abs(evmMetrics.vac / bac * 100);
    if (vacPercent > thresholds.vacWarningPercent && evmMetrics.vac < 0) {
      alerts.push({
        type: "warning",
        message: isArabic 
          ? `التكلفة المتوقعة ستتجاوز الميزانية بـ ${vacPercent.toFixed(1)}%`
          : `Projected cost will exceed budget by ${vacPercent.toFixed(1)}%`,
        metric: "VAC",
      });
    }

    if (evmMetrics.tcpi > 1.1) {
      alerts.push({
        type: "info",
        message: isArabic 
          ? `يتطلب تحسين الأداء بنسبة ${((evmMetrics.tcpi - 1) * 100).toFixed(0)}% للبقاء في الميزانية`
          : `Requires ${((evmMetrics.tcpi - 1) * 100).toFixed(0)}% performance improvement to stay on budget`,
        metric: "TCPI",
      });
    }

    return alerts;
  }, [evmMetrics, thresholds, isArabic, bac]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K ${currency}`;
    }
    return `${value.toFixed(0)} ${currency}`;
  };

  const getStatusIcon = (value: number, warningThreshold: number, criticalThreshold: number) => {
    if (value >= 1) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (value >= warningThreshold) return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (value: number, warningThreshold: number, criticalThreshold: number) => {
    if (value >= 1) return "text-green-600";
    if (value >= warningThreshold) return "text-amber-600";
    return "text-red-600";
  };

  const updateThreshold = (key: keyof ThresholdSettings, value: number | boolean) => {
    const newThresholds = { ...thresholds, [key]: value };
    setThresholds(newThresholds);
    onThresholdsChange?.(newThresholds);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Gauge className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {isArabic ? "لوحة مؤشرات EVM التفاعلية" : "Interactive EVM Dashboard"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "إدارة القيمة المكتسبة مع تحذيرات تلقائية" : "Earned Value Management with Auto Alerts"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {warnings.length > 0 && thresholds.enableNotifications && (
              <Badge variant="destructive" className="gap-1">
                <Bell className="w-3 h-3" />
                {warnings.length}
              </Badge>
            )}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {isArabic ? "إعدادات العتبات" : "Threshold Settings"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">
                      {isArabic ? "تفعيل التحذيرات" : "Enable Notifications"}
                    </Label>
                    <Switch
                      id="notifications"
                      checked={thresholds.enableNotifications}
                      onCheckedChange={(v) => updateThreshold("enableNotifications", v)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{isArabic ? "عتبة تحذير SPI" : "SPI Warning Threshold"}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[thresholds.spiWarning * 100]}
                        onValueChange={([v]) => updateThreshold("spiWarning", v / 100)}
                        min={80}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {(thresholds.spiWarning * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? "عتبة حرجة SPI" : "SPI Critical Threshold"}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[thresholds.spiCritical * 100]}
                        onValueChange={([v]) => updateThreshold("spiCritical", v / 100)}
                        min={70}
                        max={95}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {(thresholds.spiCritical * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? "عتبة تحذير CPI" : "CPI Warning Threshold"}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[thresholds.cpiWarning * 100]}
                        onValueChange={([v]) => updateThreshold("cpiWarning", v / 100)}
                        min={80}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {(thresholds.cpiWarning * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? "عتبة حرجة CPI" : "CPI Critical Threshold"}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[thresholds.cpiCritical * 100]}
                        onValueChange={([v]) => updateThreshold("cpiCritical", v / 100)}
                        min={70}
                        max={95}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {(thresholds.cpiCritical * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{isArabic ? "عتبة تحذير VAC %" : "VAC Warning Threshold %"}</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[thresholds.vacWarningPercent]}
                        onValueChange={([v]) => updateThreshold("vacWarningPercent", v)}
                        min={5}
                        max={30}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-12 text-sm text-muted-foreground">
                        {thresholds.vacWarningPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Warnings Panel */}
        {warnings.length > 0 && thresholds.enableNotifications && (
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  warning.type === "critical" && "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300",
                  warning.type === "warning" && "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
                  warning.type === "info" && "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                )}
              >
                {warning.type === "critical" && <XCircle className="w-5 h-5" />}
                {warning.type === "warning" && <AlertTriangle className="w-5 h-5" />}
                {warning.type === "info" && <Bell className="w-5 h-5" />}
                <span className="flex-1 text-sm">{warning.message}</span>
                <Badge variant="outline" className="text-xs">
                  {warning.metric}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* BAC */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-slate-600" />
                    <span className="text-xs text-muted-foreground">BAC</span>
                  </div>
                  <div className="text-xl font-bold text-slate-700 dark:text-slate-200">
                    {formatCurrency(bac)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isArabic ? "الميزانية الإجمالية" : "Budget at Completion"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isArabic ? "إجمالي الميزانية المخططة للمشروع" : "Total planned budget for the project"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* EV */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">EV</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency(evmMetrics.ev)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isArabic ? "القيمة المكتسبة" : "Earned Value"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isArabic ? "قيمة العمل المنجز فعلياً" : "Value of work actually completed"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* AC */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground">AC</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatCurrency(evmMetrics.ac)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isArabic ? "التكلفة الفعلية" : "Actual Cost"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isArabic ? "التكلفة الفعلية المصروفة" : "Actual cost spent to date"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* PV */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs text-muted-foreground">PV</span>
                  </div>
                  <div className="text-xl font-bold text-cyan-600">
                    {formatCurrency(evmMetrics.pv)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isArabic ? "القيمة المخططة" : "Planned Value"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isArabic ? "قيمة العمل المفترض إنجازه" : "Value of work planned to be done"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Performance Indices */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* SPI */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">SPI</span>
              {getStatusIcon(evmMetrics.spi, thresholds.spiWarning, thresholds.spiCritical)}
            </div>
            <div className={cn("text-2xl font-bold", getStatusColor(evmMetrics.spi, thresholds.spiWarning, thresholds.spiCritical))}>
              {evmMetrics.spi.toFixed(2)}
            </div>
            <Progress 
              value={Math.min(evmMetrics.spi * 100, 100)} 
              className="h-1.5 mt-2"
            />
            <span className="text-xs text-muted-foreground mt-1 block">
              {evmMetrics.spi >= 1 
                ? (isArabic ? "متقدم عن الجدول" : "Ahead of schedule")
                : (isArabic ? "متأخر عن الجدول" : "Behind schedule")}
            </span>
          </div>

          {/* CPI */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">CPI</span>
              {getStatusIcon(evmMetrics.cpi, thresholds.cpiWarning, thresholds.cpiCritical)}
            </div>
            <div className={cn("text-2xl font-bold", getStatusColor(evmMetrics.cpi, thresholds.cpiWarning, thresholds.cpiCritical))}>
              {evmMetrics.cpi.toFixed(2)}
            </div>
            <Progress 
              value={Math.min(evmMetrics.cpi * 100, 100)} 
              className="h-1.5 mt-2"
            />
            <span className="text-xs text-muted-foreground mt-1 block">
              {evmMetrics.cpi >= 1 
                ? (isArabic ? "تحت الميزانية" : "Under budget")
                : (isArabic ? "فوق الميزانية" : "Over budget")}
            </span>
          </div>

          {/* EAC */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">EAC</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-indigo-600">
              {formatCurrency(evmMetrics.eac)}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              {isArabic ? "التقدير عند الإكمال" : "Estimate at Completion"}
            </span>
          </div>

          {/* VAC */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">VAC</span>
              {evmMetrics.vac >= 0 
                ? <TrendingUp className="w-4 h-4 text-green-500" />
                : <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
            <div className={cn("text-xl font-bold", evmMetrics.vac >= 0 ? "text-green-600" : "text-red-600")}>
              {evmMetrics.vac >= 0 ? "+" : ""}{formatCurrency(evmMetrics.vac)}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">
              {isArabic ? "الفرق عند الإكمال" : "Variance at Completion"}
            </span>
          </div>
        </div>

        {/* Variances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isArabic ? "انحراف الجدول (SV)" : "Schedule Variance (SV)"}
              </span>
              {evmMetrics.sv >= 0 
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <XCircle className="w-4 h-4 text-red-500" />}
            </div>
            <div className={cn("text-lg font-bold", evmMetrics.sv >= 0 ? "text-green-600" : "text-red-600")}>
              {evmMetrics.sv >= 0 ? "+" : ""}{formatCurrency(evmMetrics.sv)}
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isArabic ? "انحراف التكلفة (CV)" : "Cost Variance (CV)"}
              </span>
              {evmMetrics.cv >= 0 
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <XCircle className="w-4 h-4 text-red-500" />}
            </div>
            <div className={cn("text-lg font-bold", evmMetrics.cv >= 0 ? "text-green-600" : "text-red-600")}>
              {evmMetrics.cv >= 0 ? "+" : ""}{formatCurrency(evmMetrics.cv)}
            </div>
          </div>
        </div>

        {/* TCPI Indicator */}
        <div className="p-4 rounded-lg border bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-slate-900/50 dark:to-zinc-900/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                {isArabic ? "مؤشر الأداء المطلوب (TCPI)" : "To Complete Performance Index (TCPI)"}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {evmMetrics.tcpi <= 1 
                  ? (isArabic ? "يمكن تحقيق الميزانية بالأداء الحالي" : "Budget achievable with current performance")
                  : (isArabic ? `يتطلب تحسين الأداء بنسبة ${((evmMetrics.tcpi - 1) * 100).toFixed(0)}%` : `Requires ${((evmMetrics.tcpi - 1) * 100).toFixed(0)}% performance improvement`)}
              </p>
            </div>
            <div className={cn(
              "text-2xl font-bold px-4 py-2 rounded-lg",
              evmMetrics.tcpi <= 1 ? "bg-green-100 text-green-700" : 
              evmMetrics.tcpi <= 1.1 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
            )}>
              {evmMetrics.tcpi.toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
