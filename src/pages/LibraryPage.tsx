import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { LibraryDatabase } from "@/components/LibraryDatabase";
import { useLanguage } from "@/hooks/useLanguage";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, Library, Package, HardHat, Truck, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LibraryPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({ materials: 0, labor: 0, equipment: 0, avgMaterialPrice: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [m, l, e] = await Promise.all([
        supabase.from("material_prices").select("unit_price").eq("user_id", user.id),
        supabase.from("labor_rates").select("id").eq("user_id", user.id),
        supabase.from("equipment_rates").select("id").eq("user_id", user.id),
      ]);
      const prices = (m.data || []).map((r: any) => Number(r.unit_price) || 0).filter((p) => p > 0);
      const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      setStats({
        materials: m.data?.length || 0,
        labor: l.data?.length || 0,
        equipment: e.data?.length || 0,
        avgMaterialPrice: avg,
      });
    })();
  }, [user]);

  const cards = [
    { icon: Package, label: isArabic ? "المواد" : "Materials", value: String(stats.materials), color: "text-primary", bg: "bg-primary/10" },
    { icon: HardHat, label: isArabic ? "العمالة" : "Labor", value: String(stats.labor), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { icon: Truck, label: isArabic ? "المعدات" : "Equipment", value: String(stats.equipment), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { icon: DollarSign, label: isArabic ? "متوسط سعر المادة" : "Avg Material Price", value: `${stats.avgMaterialPrice.toLocaleString()} ${isArabic ? "ريال" : "SAR"}`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                {isArabic ? "المكتبة" : "Library"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6" />
            {isArabic ? "المكتبة" : "Library"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isArabic 
              ? "إدارة المواد وأسعار العمالة والمعدات"
              : "Manage materials, labor rates, and equipment prices"
            }
          </p>
        </div>

        {/* Quick Stats */}
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
        
        <LibraryDatabase />
      </div>
    </PageLayout>
  );
};

export default LibraryPage;
