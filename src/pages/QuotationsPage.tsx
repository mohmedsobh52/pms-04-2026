import { useEffect, useState } from "react";
import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { ColorLegend } from "@/components/ui/color-code";
import { FileText, CheckCircle2, Clock, Users, DollarSign, TrendingUp, Award, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const QuotationsPage = () => {
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    suppliers: 0,
    totalValue: 0,
    avgValue: 0,
    topSupplier: "—",
    latestDate: "—",
    currency: "SAR",
  });

  const [topSuppliers, setTopSuppliers] = useState<Array<{ name: string; count: number; value: number }>>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Array<{ key: string; label: string; count: number; color: string }>>([]);

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase
        .from("price_quotations")
        .select("status, supplier_name, total_amount, currency, quotation_date, created_at")
        .order("created_at", { ascending: false });
      if (!data) return;
      const suppliers = new Set(data.map((q) => q.supplier_name).filter(Boolean));
      const totalValue = data.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
      const counts: Record<string, { count: number; value: number }> = {};
      data.forEach((q) => {
        if (q.supplier_name) {
          if (!counts[q.supplier_name]) counts[q.supplier_name] = { count: 0, value: 0 };
          counts[q.supplier_name].count++;
          counts[q.supplier_name].value += Number(q.total_amount) || 0;
        }
      });
      const ranked = Object.entries(counts)
        .map(([name, v]) => ({ name, count: v.count, value: v.value }))
        .sort((a, b) => b.count - a.count);
      const top = ranked[0];
      const latest = data[0]?.quotation_date || data[0]?.created_at;
      setStats({
        total: data.length,
        approved: data.filter((q) => q.status === "approved").length,
        pending: data.filter((q) => q.status === "pending" || !q.status).length,
        suppliers: suppliers.size,
        totalValue,
        avgValue: data.length ? Math.round(totalValue / data.length) : 0,
        topSupplier: top ? top.name : "—",
        latestDate: latest ? new Date(latest).toLocaleDateString(isArabic ? "ar-SA" : "en-US") : "—",
        currency: data[0]?.currency || "SAR",
      });
      setTopSuppliers(ranked.slice(0, 5));
      const sCounts: Record<string, number> = {};
      data.forEach((q) => { const s = q.status || "pending"; sCounts[s] = (sCounts[s] || 0) + 1; });
      const sMeta: Record<string, { label: string; color: string }> = {
        approved: { label: isArabic ? "معتمدة" : "Approved", color: "bg-emerald-500" },
        pending: { label: isArabic ? "قيد المراجعة" : "Pending", color: "bg-amber-500" },
        rejected: { label: isArabic ? "مرفوضة" : "Rejected", color: "bg-red-500" },
        draft: { label: isArabic ? "مسودة" : "Draft", color: "bg-muted-foreground" },
      };
      setStatusBreakdown(Object.entries(sCounts).map(([k, count]) => ({
        key: k, label: sMeta[k]?.label || k, count, color: sMeta[k]?.color || "bg-primary",
      })));
    };
    loadStats();
  }, [isArabic]);

  const statCards = [
    {
      icon: FileText,
      label: isArabic ? "إجمالي العروض" : "Total Quotations",
      value: stats.total.toString(),
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: CheckCircle2,
      label: isArabic ? "معتمدة" : "Approved",
      value: stats.approved.toString(),
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Clock,
      label: isArabic ? "قيد المراجعة" : "Pending",
      value: stats.pending.toString(),
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Users,
      label: isArabic ? "موردون" : "Suppliers",
      value: stats.suppliers.toString(),
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      icon: DollarSign,
      label: isArabic ? "القيمة الإجمالية" : "Total Value",
      value: `${stats.totalValue.toLocaleString()} ${stats.currency}`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: TrendingUp,
      label: isArabic ? "متوسط قيمة العرض" : "Avg Quote Value",
      value: `${stats.avgValue.toLocaleString()} ${stats.currency}`,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      icon: Award,
      label: isArabic ? "أكثر مورد نشاطاً" : "Top Supplier",
      value: stats.topSupplier,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      icon: Calendar,
      label: isArabic ? "أحدث عرض" : "Latest Quote",
      value: stats.latestDate,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10",
    },
  ];

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-4">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                      <p className={`text-base font-bold ${stat.color} truncate`}>{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {(topSuppliers.length > 0 || statusBreakdown.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-amber-500" />
                    {isArabic ? "أعلى 5 موردين (عدد العروض)" : "Top 5 Suppliers (by quotes)"}
                  </h3>
                  <div className="space-y-2">
                    {topSuppliers.map((s) => (
                      <div key={s.name} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                        <span className="text-sm truncate flex-1">{s.name}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">{s.value.toLocaleString()} {stats.currency}</span>
                          <span className="font-bold">{s.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {isArabic ? "توزيع الحالات" : "Status Breakdown"}
                  </h3>
                  <div className="space-y-2">
                    {statusBreakdown.map((s) => {
                      const total = statusBreakdown.reduce((a, b) => a + b.count, 0) || 1;
                      const pct = (s.count / total) * 100;
                      return (
                        <div key={s.key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{s.label}</span>
                            <span className="font-semibold">{s.count} ({Math.round(pct)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${s.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <ColorLegend type="status" isArabic={isArabic} className="mb-2" />

          <Tabs defaultValue="upload" className="space-y-4">
            <TabsList className="tabs-navigation-safe">
              <TabsTrigger value="upload">
                {isArabic ? "رفع عروض الأسعار" : "Upload Quotations"}
              </TabsTrigger>
              <TabsTrigger value="compare">
                {isArabic ? "مقارنة العروض" : "Compare Quotations"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <QuotationUpload />
            </TabsContent>
            <TabsContent value="compare">
              <QuotationComparison />
            </TabsContent>
          </Tabs>
        </div>
      </ErrorBoundary>
    </PageLayout>
  );
};

export default QuotationsPage;
