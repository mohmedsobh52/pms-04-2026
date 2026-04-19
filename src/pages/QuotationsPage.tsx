import { useEffect, useState } from "react";
import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const QuotationsPage = () => {
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    suppliers: 0,
    totalValue: 0,
    currency: "SAR",
  });

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase
        .from("price_quotations")
        .select("status, supplier_name, total_amount, currency");
      if (!data) return;
      const suppliers = new Set(data.map((q) => q.supplier_name).filter(Boolean));
      setStats({
        total: data.length,
        approved: data.filter((q) => q.status === "approved").length,
        pending: data.filter((q) => q.status === "pending" || !q.status).length,
        suppliers: suppliers.size,
        totalValue: data.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0),
        currency: data[0]?.currency || "SAR",
      });
    };
    loadStats();
  }, []);

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
