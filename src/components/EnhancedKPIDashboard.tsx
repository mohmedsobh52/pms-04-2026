import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  Clock,
  BarChart3,
  Percent,
  Target,
  Activity,
  Layers
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface KPIData {
  totalValue: number;
  itemCount: number;
  highRiskCount: number;
  variancePercentage: number;
  completedItems: number;
  pendingItems: number;
  avgUnitPrice: number;
  currency?: string;
}

interface EnhancedKPIDashboardProps {
  data: KPIData;
  title?: string;
  projectName?: string;
}

export function EnhancedKPIDashboard({ data, title, projectName }: EnhancedKPIDashboardProps) {
  const { isArabic } = useLanguage();
  const currency = data.currency || "SAR";
  const completionRate = Math.round((data.completedItems / Math.max(data.itemCount, 1)) * 100);
  const riskRate = Math.round((data.highRiskCount / Math.max(data.itemCount, 1)) * 100);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      {projectName && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{projectName}</h2>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "مؤشرات الأداء الرئيسية للمشروع" : "Project Key Performance Indicators"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {data.itemCount} {isArabic ? "بند" : "items"}
          </Badge>
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              {data.variancePercentage !== 0 && (
                <Badge 
                  variant={data.variancePercentage > 0 ? "destructive" : "default"}
                  className="gap-1"
                >
                  {data.variancePercentage > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(data.variancePercentage).toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(data.totalValue)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {currency} - {isArabic ? "القيمة الإجمالية" : "Total Value"}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isArabic ? "متوسط البند" : "Avg/Item"}</span>
                <span className="font-medium">{formatCurrency(data.avgUnitPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                {completionRate}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight">{data.completedItems}</p>
                <span className="text-muted-foreground">/ {data.itemCount}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "البنود المكتملة" : "Completed Items"}
              </p>
            </div>
            <div className="mt-4">
              <Progress value={completionRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{isArabic ? "البداية" : "Start"}</span>
                <span>{isArabic ? "النهاية" : "End"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Card */}
        <Card className={cn(
          "relative overflow-hidden group hover:shadow-lg transition-all duration-300",
          data.highRiskCount > 0 && "border-destructive/30"
        )}>
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
            data.highRiskCount > 0 
              ? "bg-gradient-to-br from-destructive/10 to-destructive/5" 
              : "bg-gradient-to-br from-green-500/10 to-green-500/5"
          )} />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className={cn(
                "p-3 rounded-xl transition-colors",
                data.highRiskCount > 0 
                  ? "bg-destructive/10 group-hover:bg-destructive/20" 
                  : "bg-green-500/10 group-hover:bg-green-500/20"
              )}>
                {data.highRiskCount > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                )}
              </div>
              {riskRate > 0 && (
                <Badge variant="destructive">{riskRate}%</Badge>
              )}
            </div>
            <div className="mt-4">
              <p className={cn(
                "text-3xl font-bold tracking-tight",
                data.highRiskCount > 0 ? "text-destructive" : "text-green-600"
              )}>
                {data.highRiskCount}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "بنود عالية المخاطر" : "High Risk Items"}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Activity className={cn(
                  "w-4 h-4",
                  data.highRiskCount > 0 ? "text-destructive" : "text-green-600"
                )} />
                <span className="text-sm">
                  {data.highRiskCount > 0 
                    ? (isArabic ? "يحتاج مراجعة" : "Needs review")
                    : (isArabic ? "حالة جيدة" : "Good status")
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Card */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                {100 - completionRate}%
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold tracking-tight text-amber-600">
                {data.pendingItems}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? "قيد الانتظار" : "Pending Items"}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isArabic ? "تقدير الإنجاز" : "Est. Complete"}</span>
                <span className="font-medium">
                  {data.pendingItems > 0 ? (isArabic ? "قيد التنفيذ" : "In Progress") : (isArabic ? "مكتمل" : "Done")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Bar */}
      <Card className="bg-gradient-to-r from-muted/50 via-background to-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">{isArabic ? "مكتمل" : "Completed"}: {data.completedItems}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm">{isArabic ? "معلق" : "Pending"}: {data.pendingItems}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-sm">{isArabic ? "مخاطر" : "Risk"}: {data.highRiskCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isArabic ? "آخر تحديث: الآن" : "Last updated: Now"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
