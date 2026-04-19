import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { MaterialPriceDatabase } from "@/components/MaterialPriceDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ShieldCheck, Layers, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MaterialPricesPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, verified: 0, categories: 0, avgPrice: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("material_prices")
        .select("unit_price, category, is_verified")
        .eq("user_id", user.id);
      if (!data) return;
      const prices = data.map((r: any) => Number(r.unit_price) || 0).filter((p) => p > 0);
      const cats = new Set(data.map((r: any) => r.category).filter(Boolean));
      const verified = data.filter((r: any) => r.is_verified).length;
      const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      setStats({ total: data.length, verified, categories: cats.size, avgPrice: avg });
    })();
  }, [user]);

  const cards = [
    { icon: Package, label: isArabic ? "إجمالي الأسعار" : "Total Prices", value: String(stats.total), color: "text-primary", bg: "bg-primary/10" },
    { icon: ShieldCheck, label: isArabic ? "موثقة" : "Verified", value: String(stats.verified), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Layers, label: isArabic ? "الفئات" : "Categories", value: String(stats.categories), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { icon: DollarSign, label: isArabic ? "متوسط السعر" : "Avg Price", value: `${stats.avgPrice.toLocaleString()} ${isArabic ? "ريال" : "SAR"}`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {isArabic ? "قاعدة بيانات الأسعار" : "Price Database"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isArabic 
              ? "إدارة أسعار المواد والموردين - إضافة يدوي، استيراد Excel، وبحث ذكي من الإنترنت"
              : "Manage material prices and suppliers - manual entry, Excel import, and smart web search"
            }
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    <p className={`text-base font-bold ${s.color} truncate`}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <MaterialPriceDatabase />
      </div>
    </PageLayout>
  );
};

export default MaterialPricesPage;
