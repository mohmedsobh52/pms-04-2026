import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuspenseFallback, ErrorState, EmptyState } from "@/components/ui/loading-states";
import {
  Package,
  Users,
  Wrench,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

interface MaterialRow {
  category: string | null;
  unit_price: number | null;
  supplier_name: string | null;
  created_at: string;
}
interface LaborRow {
  category: string | null;
  unit_rate: number | null;
}
interface EquipmentRow {
  category: string | null;
  rental_rate: number | null;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 66%))",
  "hsl(var(--chart-5, 27 87% 67%))",
  "hsl(217 91% 60%)",
  "hsl(280 87% 65%)",
  "hsl(340 82% 52%)",
];

const ResourcesDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [labor, setLabor] = useState<LaborRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [m, l, e] = await Promise.all([
        supabase
          .from("material_prices")
          .select("category, unit_price, supplier_name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("labor_rates")
          .select("category, unit_rate")
          .eq("user_id", user.id)
          .limit(1000),
        supabase
          .from("equipment_rates")
          .select("category, rental_rate")
          .eq("user_id", user.id)
          .limit(1000),
      ]);
      if (m.error) throw m.error;
      if (l.error) throw l.error;
      if (e.error) throw e.error;
      setMaterials((m.data as MaterialRow[]) || []);
      setLabor((l.data as LaborRow[]) || []);
      setEquipment((e.data as EquipmentRow[]) || []);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const counters = useMemo(() => {
    const matValue = materials.reduce((s, r) => s + (Number(r.unit_price) || 0), 0);
    const labValue = labor.reduce((s, r) => s + (Number(r.unit_rate) || 0), 0);
    const eqValue = equipment.reduce((s, r) => s + (Number(r.rental_rate) || 0), 0);
    return {
      materialsCount: materials.length,
      laborCount: labor.length,
      equipmentCount: equipment.length,
      avgMaterial: materials.length ? matValue / materials.length : 0,
      avgLabor: labor.length ? labValue / labor.length : 0,
      avgEquipment: equipment.length ? eqValue / equipment.length : 0,
    };
  }, [materials, labor, equipment]);

  // Pie: distribution by category (combined materials + labor + equipment)
  const categoryPie = useMemo(() => {
    const map = new Map<string, number>();
    const add = (cat: string | null) => {
      const k = cat || (isArabic ? "غير مصنف" : "Uncategorized");
      map.set(k, (map.get(k) || 0) + 1);
    };
    materials.forEach((r) => add(r.category));
    labor.forEach((r) => add(r.category));
    equipment.forEach((r) => add(r.category));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [materials, labor, equipment, isArabic]);

  // Bar: top 10 suppliers by material count
  const supplierBar = useMemo(() => {
    const map = new Map<string, number>();
    materials.forEach((r) => {
      if (!r.supplier_name) return;
      map.set(r.supplier_name, (map.get(r.supplier_name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 18) + "…" : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [materials]);

  // Line: monthly avg material price
  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    materials.forEach((r) => {
      if (!r.unit_price || !r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key) || { sum: 0, count: 0 };
      b.sum += Number(r.unit_price);
      b.count += 1;
      buckets.set(key, b);
    });
    return Array.from(buckets.entries())
      .map(([month, { sum, count }]) => ({ month, avg: Math.round(sum / count) }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // last 12 months
  }, [materials]);

  if (!user) {
    return (
      <PageLayout>
        <EmptyState
          icon={<Building2 className="w-12 h-12" />}
          title={isArabic ? "تسجيل الدخول مطلوب" : "Login required"}
          message={isArabic ? "سجّل الدخول لرؤية لوحة الموارد" : "Sign in to view the resources dashboard"}
          action={<Button onClick={() => navigate("/auth")}>{isArabic ? "تسجيل الدخول" : "Sign in"}</Button>}
        />
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <SuspenseFallback label={isArabic ? "جاري تحميل لوحة الموارد..." : "Loading resources dashboard..."} size="lg" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <ErrorState
          isArabic={isArabic}
          message={error}
          onRetry={fetchAll}
        />
      </PageLayout>
    );
  }

  const cards = [
    {
      icon: Package,
      label: isArabic ? "المواد" : "Materials",
      value: counters.materialsCount,
      sub: `${isArabic ? "م.السعر" : "Avg"}: ${Math.round(counters.avgMaterial).toLocaleString()} SAR`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      to: "/material-prices",
    },
    {
      icon: Users,
      label: isArabic ? "العمالة" : "Labor",
      value: counters.laborCount,
      sub: `${isArabic ? "م.الأجر" : "Avg"}: ${Math.round(counters.avgLabor).toLocaleString()} SAR`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      to: "/library",
    },
    {
      icon: Wrench,
      label: isArabic ? "المعدات" : "Equipment",
      value: counters.equipmentCount,
      sub: `${isArabic ? "م.الإيجار" : "Avg"}: ${Math.round(counters.avgEquipment).toLocaleString()} SAR`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      to: "/library",
    },
  ];

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              {isArabic ? "لوحة الموارد" : "Resources Dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic
                ? "ملخص شامل للمواد والعمالة والمعدات مع مخططات تحليلية"
                : "Comprehensive summary of materials, labor, and equipment with analytics"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {isArabic ? "تحديث" : "Refresh"}
          </Button>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <Card
                key={i}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(c.to)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-7 h-7 ${c.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className={`text-3xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pie chart: Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {isArabic ? "توزيع الفئات (الكل)" : "Categories Distribution (All)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryPie.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {isArabic ? "لا توجد بيانات" : "No data"}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(e: any) => `${e.name} (${e.value})`}
                      labelLine={false}
                    >
                      {categoryPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar chart: Top suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {isArabic ? "أعلى 10 موردين (مواد)" : "Top 10 Suppliers (Materials)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplierBar.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {isArabic ? "لا توجد بيانات موردين" : "No supplier data"}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={supplierBar} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line chart: Monthly trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {isArabic ? "تطور متوسط أسعار المواد (آخر 12 شهر)" : "Material Avg Price Trend (Last 12 months)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {isArabic ? "لا توجد بيانات تاريخية" : "No historical data"}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name={isArabic ? "متوسط السعر" : "Avg price"}
                    stroke="url(#lineGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ResourcesDashboardPage;
