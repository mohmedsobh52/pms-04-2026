import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, TrendingDown, Scale, Loader2, DollarSign, Percent, Activity, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

interface Quotation {
  id: string;
  name: string;
  file_name: string;
  supplier_name?: string;
  quotation_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
}

interface QuotationItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuotationCostChartProps {
  items?: QuotationItem[];
  currency?: string;
  showComparison?: boolean;
}

const CHART_COLORS = [
  "hsl(16, 85%, 57%)",
  "hsl(260, 60%, 55%)",
  "hsl(145, 65%, 42%)",
  "hsl(210, 85%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(330, 70%, 55%)",
  "hsl(180, 70%, 45%)",
  "hsl(280, 70%, 60%)",
];

export function QuotationCostChart({ items, currency = "ر.س", showComparison = true }: QuotationCostChartProps) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<"bar" | "pie" | "radar" | "area">("bar");

  const t = {
    title: isArabic ? "لوحة مقارنة عروض الأسعار" : "Quotation Comparison Dashboard",
    subtitle: isArabic ? "تحليل بياني شامل للعروض" : "Comprehensive Visual Analysis",
    priceComparison: isArabic ? "مقارنة الأسعار" : "Price Comparison",
    categoryDist: isArabic ? "توزيع الفئات" : "Category Distribution",
    savingsPotential: isArabic ? "الوفر المحتمل" : "Potential Savings",
    avgPrice: isArabic ? "متوسط السعر" : "Average Price",
    lowestPrice: isArabic ? "أقل سعر" : "Lowest Price",
    highestPrice: isArabic ? "أعلى سعر" : "Highest Price",
    priceDiff: isArabic ? "فرق السعر" : "Price Difference",
    totalQuotations: isArabic ? "إجمالي العروض" : "Total Quotations",
    noData: isArabic ? "لا توجد بيانات كافية للمقارنة" : "Not enough data for comparison",
    bar: isArabic ? "أعمدة" : "Bar",
    pie: isArabic ? "دائري" : "Pie",
    radar: isArabic ? "راداري" : "Radar",
    area: isArabic ? "مساحي" : "Area",
    itemCostDist: isArabic ? "توزيع تكاليف البنود" : "Item Cost Distribution",
  };

  useEffect(() => {
    if (user && showComparison) {
      loadQuotations();
    } else {
      setIsLoading(false);
    }
  }, [user, showComparison]);

  const loadQuotations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('user_id', user.id)
        .not('total_amount', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics for quotations comparison
  const stats = useMemo(() => {
    if (quotations.length < 2) return null;

    const amounts = quotations.map(q => q.total_amount || 0).filter(a => a > 0);
    if (amounts.length < 2) return null;

    const lowest = Math.min(...amounts);
    const highest = Math.max(...amounts);
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const savings = highest - lowest;
    const savingsPercent = ((savings / highest) * 100).toFixed(1);

    return { lowest, highest, average, savings, savingsPercent, count: quotations.length };
  }, [quotations]);

  // Prepare chart data for quotation comparison
  const barChartData = useMemo(() => {
    return quotations
      .filter(q => q.total_amount && q.total_amount > 0)
      .sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0))
      .map((q, idx, arr) => ({
        name: q.supplier_name || q.name || `عرض ${idx + 1}`,
        amount: q.total_amount || 0,
        fill: idx === 0 ? "hsl(145, 65%, 42%)" : idx === arr.length - 1 ? "hsl(0, 75%, 55%)" : CHART_COLORS[idx % CHART_COLORS.length],
        isLowest: idx === 0,
        isHighest: idx === arr.length - 1,
      }));
  }, [quotations]);

  const pieChartData = useMemo(() => {
    return quotations
      .filter(q => q.total_amount && q.total_amount > 0)
      .map((q, idx) => ({
        name: q.supplier_name || q.name,
        value: q.total_amount || 0,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [quotations]);

  // Items chart data (for individual quotation analysis)
  const itemsChartData = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((item, idx) => ({
        name: item.description.length > 20 ? item.description.substring(0, 20) + '...' : item.description,
        value: item.total,
        fullName: item.description,
        fill: CHART_COLORS[idx % CHART_COLORS.length],
      }));
  }, [items]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <p className="font-semibold text-sm text-foreground mb-2">{data.fullName || data.name || label}</p>
          <p className="text-lg font-bold text-primary">
            {(data.amount || data.value)?.toLocaleString()} {currency}
          </p>
          {data.isLowest && <Badge variant="default" className="mt-2 bg-success">{t.lowestPrice}</Badge>}
          {data.isHighest && <Badge variant="destructive" className="mt-2">{t.highestPrice}</Badge>}
        </div>
      );
    }
    return null;
  };

  const chartTabs = [
    { id: "bar", label: t.bar, icon: <BarChart3 className="w-4 h-4" /> },
    { id: "pie", label: t.pie, icon: <PieChartIcon className="w-4 h-4" /> },
    { id: "radar", label: t.radar, icon: <Target className="w-4 h-4" /> },
    { id: "area", label: t.area, icon: <Activity className="w-4 h-4" /> },
  ] as const;

  // Show items-only chart if no comparison data
  if (!showComparison || !stats) {
    if (items && items.length > 0) {
      const totalValue = itemsChartData.reduce((sum, item) => sum + item.value, 0);
      return (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              {t.itemCostDist}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={itemsChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={100} dataKey="value" animationDuration={800}>
                    {itemsChartData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{isArabic ? "إجمالي التكاليف" : "Total Costs"}</span>
              <span className="font-bold text-lg text-primary">{totalValue.toLocaleString()} {currency}</span>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.lowestPrice}</p>
                <p className="text-xl font-bold text-success">{stats.lowest.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.highestPrice}</p>
                <p className="text-xl font-bold text-destructive">{stats.highest.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.avgPrice}</p>
                <p className="text-xl font-bold text-primary">{Math.round(stats.average).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                <Percent className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.savingsPotential}</p>
                <p className="text-lg font-bold text-accent">{stats.savings.toLocaleString()} ({stats.savingsPercent}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Card */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{t.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">{stats.count} {t.totalQuotations}</Badge>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {chartTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                  activeChart === tab.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl p-5 border border-border/50">
              <h4 className="font-semibold mb-4 text-center text-lg">{t.priceComparison}</h4>
              <ResponsiveContainer width="100%" height={350}>
                {activeChart === "bar" ? (
                  <BarChart data={barChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                    <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                      {barChartData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                ) : activeChart === "pie" ? (
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3} dataKey="value" animationDuration={800} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {pieChartData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                ) : activeChart === "radar" ? (
                  <RadarChart data={barChartData.map(q => ({ supplier: q.name, price: (q.amount / stats.highest) * 100, savings: ((stats.highest - q.amount) / stats.highest) * 100 }))}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="supplier" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Radar name="السعر" dataKey="price" stroke="hsl(16, 85%, 57%)" fill="hsl(16, 85%, 57%)" fillOpacity={0.5} />
                    <Radar name="الوفر" dataKey="savings" stroke="hsl(145, 65%, 42%)" fill="hsl(145, 65%, 42%)" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                ) : (
                  <AreaChart data={barChartData}>
                    <defs>
                      <linearGradient id="areaGradQuot" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(16, 85%, 57%)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(16, 85%, 57%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(16, 85%, 57%)" fill="url(#areaGradQuot)" strokeWidth={3} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl p-5 border border-border/50">
              <h4 className="font-semibold mb-4 text-center text-lg">{t.priceDiff}</h4>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={barChartData}>
                  <defs>
                    <linearGradient id="diffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(260, 60%, 55%)" />
                      <stop offset="100%" stopColor="hsl(280, 70%, 60%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-35} textAnchor="end" height={70} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="url(#diffGrad)" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="amount" stroke="hsl(16, 85%, 57%)" strokeWidth={3} dot={{ fill: "hsl(16, 85%, 57%)", r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-success/15 to-success/5 border border-success/20 text-center">
              <p className="text-3xl font-bold text-success">{stats.savingsPercent}%</p>
              <p className="text-sm text-muted-foreground mt-1">{isArabic ? "نسبة الوفر" : "Savings Rate"}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-center">
              <p className="text-3xl font-bold text-primary">{stats.count}</p>
              <p className="text-sm text-muted-foreground mt-1">{isArabic ? "عدد العروض" : "Quotations"}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 text-center">
              <p className="text-3xl font-bold text-accent">{stats.savings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">{isArabic ? "الوفر المحتمل" : "Max Savings"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
