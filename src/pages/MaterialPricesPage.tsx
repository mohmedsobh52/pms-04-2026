import { useEffect, useState, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
const MaterialPriceDatabase = lazy(() =>
  import("@/components/MaterialPriceDatabase").then((m) => ({ default: m.MaterialPriceDatabase }))
);
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ColorLegend } from "@/components/ui/color-code";
import { Package, ShieldCheck, Layers, DollarSign, Building2, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SupplierAgg { name: string; count: number; total: number; }

const MaterialPricesPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, verified: 0, categories: 0, avgPrice: 0 });
  const [topSuppliers, setTopSuppliers] = useState<SupplierAgg[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("material_prices")
        .select("unit_price, category, is_verified, supplier_name, valid_until")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!data) return;
      const prices = data.map((r: any) => Number(r.unit_price) || 0).filter((p) => p > 0);
      const cats = new Set(data.map((r: any) => r.category).filter(Boolean));
      const verified = data.filter((r: any) => r.is_verified).length;
      const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      setStats({ total: data.length, verified, categories: cats.size, avgPrice: avg });

      // Top suppliers
      const supMap = new Map<string, { count: number; total: number }>();
      data.forEach((r: any) => {
        const name = r.supplier_name?.trim();
        if (!name) return;
        const cur = supMap.get(name) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(r.unit_price) || 0;
        supMap.set(name, cur);
      });
      setTopSuppliers(
        Array.from(supMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([name, v]) => ({ name, count: v.count, total: v.total }))
      );

      // Expiring / expired
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000);
      let expSoon = 0;
      let exp = 0;
      data.forEach((r: any) => {
        if (!r.valid_until) return;
        const d = new Date(r.valid_until);
        if (d < now) exp += 1;
        else if (d <= in30) expSoon += 1;
      });
      setExpiringCount(expSoon);
      setExpiredCount(exp);
    })();
  }, [user]);

  const cards = [
    { icon: Package, label: isArabic ? "إجمالي الأسعار" : "Total Prices", value: String(stats.total), color: "text-primary", bg: "bg-primary/10" },
    { icon: ShieldCheck, label: isArabic ? "موثقة" : "Verified", value: String(stats.verified), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Layers, label: isArabic ? "الفئات" : "Categories", value: String(stats.categories), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { icon: DollarSign, label: isArabic ? "متوسط السعر" : "Avg Price", value: `${stats.avgPrice.toLocaleString()} ${isArabic ? "ريال" : "SAR"}`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  ];

  const verifyPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;
  const maxSupCount = Math.max(1, ...topSuppliers.map((s) => s.count));

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

        <ColorLegend type="category" isArabic={isArabic} />

        {/* Insights row */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top suppliers */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  {isArabic ? "أعلى الموردين" : "Top Suppliers"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isArabic ? "لا توجد بيانات موردين" : "No supplier data"}
                  </p>
                ) : (
                  topSuppliers.map((s) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate flex-1">{s.name}</span>
                        <Badge variant="outline" className="ms-2">
                          {s.count} {isArabic ? "بند" : "items"}
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${(s.count / maxSupCount) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Verification + Expiry alerts */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    {isArabic ? "نسبة التحقق" : "Verification Rate"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-emerald-600">{verifyPct}%</span>
                    <span className="text-xs text-muted-foreground">
                      {stats.verified} / {stats.total}
                    </span>
                  </div>
                  <Progress value={verifyPct} className="h-2" />
                </CardContent>
              </Card>

              <Card className={expiredCount > 0 ? "border-red-500/30" : expiringCount > 0 ? "border-amber-500/30" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${expiredCount > 0 ? "text-red-600" : "text-amber-600"}`} />
                    {isArabic ? "صلاحية الأسعار" : "Price Validity"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isArabic ? "منتهية" : "Expired"}</span>
                    <span className="font-bold text-red-600">{expiredCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isArabic ? "تنتهي خلال 30 يوم" : "Expiring in 30d"}</span>
                    <span className="font-bold text-amber-600">{expiringCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          <MaterialPriceDatabase />
        </Suspense>
      </div>
    </PageLayout>
  );
};

export default MaterialPricesPage;
