import { useEffect, useState } from "react";
import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
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

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase
        .from("price_quotations")
        .select("status, supplier_name, total_amount, currency, quotation_date, created_at")
        .order("created_at", { ascending: false });
      if (!data) return;
      const suppliers = new Set(data.map((q) => q.supplier_name).filter(Boolean));
      const totalValue = data.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
      const counts: Record<string, number> = {};
      data.forEach((q) => {
        if (q.supplier_name) counts[q.supplier_name] = (counts[q.supplier_name] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const latest = data[0]?.quotation_date || data[0]?.created_at;
      setStats({
        total: data.length,
        approved: data.filter((q) => q.status === "approved").length,
        pending: data.filter((q) => q.status === "pending" || !q.status).length,
        suppliers: suppliers.size,
        totalValue,
        avgValue: data.length ? Math.round(totalValue / data.length) : 0,
        topSupplier: top ? top[0] : "—",
        latestDate: latest ? new Date(latest).toLocaleDateString(isArabic ? "ar-SA" : "en-US") : "—",
        currency: data[0]?.currency || "SAR",
      });
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
