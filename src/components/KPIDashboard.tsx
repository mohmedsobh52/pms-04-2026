import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

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

interface KPIDashboardProps {
  data: KPIData;
  title?: string;
}

export function KPIDashboard({ data, title = "Project Overview" }: KPIDashboardProps) {
  const { t, isArabic } = useLanguage();
  const currency = data.currency || "SAR";

  const kpis = [
    {
      label: "Total Value",
      labelAr: "القيمة الإجمالية",
      value: `${currency} ${data.totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: data.variancePercentage > 0 ? "up" : data.variancePercentage < 0 ? "down" : null,
      trendValue: data.variancePercentage !== 0 ? `${Math.abs(data.variancePercentage).toFixed(1)}%` : null,
    },
    {
      label: "Total Items",
      labelAr: "عدد البنود",
      value: data.itemCount.toLocaleString(),
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "High Risk Items",
      labelAr: "بنود عالية المخاطر",
      value: data.highRiskCount.toLocaleString(),
      icon: AlertTriangle,
      color: data.highRiskCount > 0 ? "text-destructive" : "text-success",
      bgColor: data.highRiskCount > 0 ? "bg-destructive/10" : "bg-success/10",
    },
    {
      label: "Completed",
      labelAr: "مكتمل",
      value: data.completedItems.toLocaleString(),
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      subtext: `${((data.completedItems / Math.max(data.itemCount, 1)) * 100).toFixed(0)}%`,
    },
    {
      label: "Pending",
      labelAr: "قيد الانتظار",
      value: data.pendingItems.toLocaleString(),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Avg Unit Price",
      labelAr: "متوسط سعر الوحدة",
      value: `${currency} ${data.avgUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      icon: BarChart3,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {title}
        </h3>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className="kpi-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                {kpi.trend && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    kpi.trend === "up" ? "text-destructive" : "text-success"
                  }`}>
                    {kpi.trend === "up" ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {kpi.trendValue}
                  </div>
                )}
              </div>
              
              <div className="mt-3">
                <p className="text-2xl font-bold">{kpi.value}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground mt-1">
                    {isArabic ? kpi.labelAr : kpi.label}
                  </p>
                  {kpi.subtext && (
                    <span className="text-xs font-medium text-success">{kpi.subtext}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
