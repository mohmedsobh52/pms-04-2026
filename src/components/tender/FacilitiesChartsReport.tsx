import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CalendarX, TrendingUp, Building2, Package, BarChart3, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { differenceInDays, addMonths, format } from "date-fns";
import type { Facility } from "./FacilitiesTab";

interface FacilitiesChartsReportProps {
  facilities: Facility[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const FACILITY_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  office: { ar: "مكاتب", en: "Offices" },
  accommodation: { ar: "سكن العمال", en: "Workers Accommodation" },
  toilets: { ar: "دورات مياه", en: "Toilets" },
  generator: { ar: "مولد كهربائي", en: "Generator" },
  vehicle: { ar: "مركبة", en: "Vehicle" },
  storage: { ar: "مخازن", en: "Storage" },
  equipment: { ar: "معدات", en: "Equipment" },
  heavy_equipment: { ar: "معدات ثقيلة", en: "Heavy Equipment" },
  communications: { ar: "اتصالات", en: "Communications" },
  utilities: { ar: "مرافق", en: "Utilities" },
  other: { ar: "أخرى", en: "Other" },
};

export function FacilitiesChartsReport({ facilities, open, onOpenChange }: FacilitiesChartsReportProps) {
  const { isArabic } = useLanguage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  // Cost distribution by facility type
  const costByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    facilities.forEach(f => {
      const current = typeMap.get(f.facilityType) || 0;
      typeMap.set(f.facilityType, current + f.total);
    });
    
    return Array.from(typeMap.entries())
      .map(([type, value]) => ({
        name: isArabic 
          ? (FACILITY_TYPE_LABELS[type]?.ar || type)
          : (FACILITY_TYPE_LABELS[type]?.en || type),
        value,
        type,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [facilities, isArabic]);

  // Rent vs Purchase comparison
  const rentVsPurchase = useMemo(() => {
    const rentTotal = facilities.filter(f => f.type === "rent").reduce((sum, f) => sum + f.total, 0);
    const purchaseTotal = facilities.filter(f => f.type === "purchase").reduce((sum, f) => sum + f.total, 0);
    
    return [
      { name: isArabic ? "إيجار" : "Rent", value: rentTotal, fill: "#3b82f6" },
      { name: isArabic ? "شراء" : "Purchase", value: purchaseTotal, fill: "#10b981" },
    ];
  }, [facilities, isArabic]);

  // Monthly cost trend (for rentals)
  const monthlyCostTrend = useMemo(() => {
    const rentals = facilities.filter(f => f.type === "rent" && f.startDate);
    if (rentals.length === 0) return [];

    // Get date range
    const today = new Date();
    const months: { month: string; cost: number }[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(today, i);
      const monthStr = format(monthDate, "MMM yy");
      
      let monthlyCost = 0;
      rentals.forEach(rental => {
        const startDate = new Date(rental.startDate);
        const endDate = addMonths(startDate, rental.duration);
        
        if (monthDate >= startDate && monthDate <= endDate) {
          monthlyCost += rental.monthlyCost || (rental.unitCost * rental.quantity);
        }
      });
      
      months.push({ month: monthStr, cost: monthlyCost });
    }
    
    return months;
  }, [facilities]);

  // Expiring contracts (within 60 days)
  const expiringContracts = useMemo(() => {
    const today = new Date();
    return facilities
      .filter(f => f.type === "rent" && f.startDate)
      .map(f => {
        const endDate = addMonths(new Date(f.startDate), f.duration);
        const daysLeft = differenceInDays(endDate, today);
        return { ...f, endDate, daysLeft };
      })
      .filter(f => f.daysLeft <= 60 && f.daysLeft >= -30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [facilities]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const statusMap = new Map<string, number>();
    facilities.forEach(f => {
      const status = f.status || "active";
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    
    const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
      active: { ar: "نشط", en: "Active", color: "#10b981" },
      pending: { ar: "معلق", en: "Pending", color: "#f59e0b" },
      expired: { ar: "منتهي", en: "Expired", color: "#ef4444" },
    };
    
    return Array.from(statusMap.entries()).map(([status, count]) => ({
      name: isArabic ? statusLabels[status]?.ar : statusLabels[status]?.en || status,
      value: count,
      fill: statusLabels[status]?.color || "#6b7280",
    }));
  }, [facilities, isArabic]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalCost = facilities.reduce((sum, f) => sum + f.total, 0);
    const totalInstallation = facilities.reduce((sum, f) => sum + (f.installationCost || 0), 0);
    const totalMonthly = facilities
      .filter(f => f.type === "rent")
      .reduce((sum, f) => sum + (f.monthlyCost || f.unitCost * f.quantity), 0);
    const rentCount = facilities.filter(f => f.type === "rent").length;
    const purchaseCount = facilities.filter(f => f.type === "purchase").length;
    
    return { totalCost, totalInstallation, totalMonthly, rentCount, purchaseCount };
  }, [facilities]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {isArabic ? "تقارير ورسوم بيانية للمرافق" : "Facilities Reports & Charts"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 space-y-6">
            {/* Expiring Contracts Alert */}
            {expiringContracts.length > 0 && (
              <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
                <CalendarX className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800 dark:text-orange-200">
                  {isArabic ? "عقود تنتهي قريباً" : "Contracts Expiring Soon"}
                </AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  <div className="mt-2 space-y-2">
                    {expiringContracts.map(c => (
                      <div key={c.id} className="flex items-center justify-between">
                        <span>{isArabic ? c.name : c.nameEn}</span>
                        <Badge variant={c.daysLeft <= 7 ? "destructive" : c.daysLeft <= 30 ? "outline" : "secondary"}>
                          {c.daysLeft < 0 
                            ? (isArabic ? `منتهي منذ ${Math.abs(c.daysLeft)} يوم` : `Expired ${Math.abs(c.daysLeft)} days ago`)
                            : (isArabic ? `${c.daysLeft} يوم متبقي` : `${c.daysLeft} days left`)
                          }
                        </Badge>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">SAR {formatCurrency(summaryStats.totalCost)}</div>
                  <div className="text-sm text-muted-foreground">{isArabic ? "الإجمالي" : "Total Cost"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">SAR {formatCurrency(summaryStats.totalMonthly)}</div>
                  <div className="text-sm text-muted-foreground">{isArabic ? "شهرياً" : "Monthly"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">SAR {formatCurrency(summaryStats.totalInstallation)}</div>
                  <div className="text-sm text-muted-foreground">{isArabic ? "تركيب" : "Installation"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{summaryStats.rentCount}</div>
                  <div className="text-sm text-muted-foreground">{isArabic ? "إيجارات" : "Rentals"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{summaryStats.purchaseCount}</div>
                  <div className="text-sm text-muted-foreground">{isArabic ? "مشتريات" : "Purchases"}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Cost Distribution by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4" />
                    {isArabic ? "توزيع التكاليف حسب النوع" : "Cost Distribution by Type"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie 
                          data={costByType} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {costByType.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `SAR ${formatCurrency(Number(value))}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد بيانات" : "No data available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rent vs Purchase */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="w-4 h-4" />
                    {isArabic ? "إيجار مقابل شراء" : "Rent vs Purchase"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={rentVsPurchase} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `${formatCurrency(v)}`} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip formatter={(value) => `SAR ${formatCurrency(Number(value))}`} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {rentVsPurchase.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Cost Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    {isArabic ? "توقع التكاليف الشهرية" : "Monthly Cost Forecast"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyCostTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={monthlyCostTrend}>
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(value) => `SAR ${formatCurrency(Number(value))}`} />
                        <Line 
                          type="monotone" 
                          dataKey="cost" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد إيجارات" : "No rentals available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "توزيع الحالات" : "Status Distribution"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie 
                        data={statusDistribution} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50}
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Rental Timeline */}
            {facilities.filter(f => f.type === "rent" && f.startDate).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "الجدول الزمني للإيجارات" : "Rental Timeline"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {facilities
                      .filter(f => f.type === "rent" && f.startDate)
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((rental, index) => {
                        const startDate = new Date(rental.startDate);
                        const endDate = addMonths(startDate, rental.duration);
                        const today = new Date();
                        const totalDays = differenceInDays(endDate, startDate);
                        const elapsedDays = Math.max(0, differenceInDays(today, startDate));
                        const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                        
                        return (
                          <div key={rental.id} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-medium truncate" title={isArabic ? rental.name : rental.nameEn}>
                              {isArabic ? rental.name : rental.nameEn}
                            </div>
                            <div className="flex-1 relative h-6 bg-muted rounded overflow-hidden">
                              <div 
                                className="absolute h-full bg-primary/70 rounded-l transition-all"
                                style={{ width: `${progress}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                                {progress.toFixed(0)}%
                              </div>
                            </div>
                            <div className="w-40 text-xs text-muted-foreground text-right">
                              {format(startDate, 'dd/MM/yy')} → {format(endDate, 'dd/MM/yy')}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
