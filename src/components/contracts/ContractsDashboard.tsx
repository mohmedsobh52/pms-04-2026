import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { TrendingUp, DollarSign, FileText, Users, BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { EmptyState } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

interface Contract {
  id: string;
  contract_title: string;
  contract_value: number | null;
  status: string | null;
  contract_type: string | null;
  contractor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

// Semantic HSL tokens — kept consistent with the rest of the app
const STATUS_COLORS: Record<string, string> = {
  active: "hsl(142 71% 45%)",
  draft: "hsl(215 16% 55%)",
  pending: "hsl(38 92% 50%)",
  completed: "hsl(220 70% 50%)",
  terminated: "hsl(0 84% 60%)",
  suspended: "hsl(262 83% 58%)",
};

const TYPE_PALETTE = [
  "hsl(220 70% 50%)",
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(262 83% 58%)",
  "hsl(330 81% 60%)",
];

// Custom glassmorphism tooltip
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color || entry.payload?.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ContractsDashboard = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    try {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user?.id);
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = useMemo(() => Object.entries(
    contracts.reduce((acc, c) => {
      const s = c.status || "draft";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: isArabic ? getStatusArabic(name) : capitalize(name),
    value,
    color: STATUS_COLORS[name] || "hsl(215 16% 55%)",
  })), [contracts, isArabic]);

  const typeData = useMemo(() => Object.entries(
    contracts.reduce((acc, c) => {
      const t = c.contract_type || "other";
      acc[t] = (acc[t] || 0) + (c.contract_value || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value], index) => ({
    name: isArabic ? getTypeArabic(name) : formatTypeName(name),
    value,
    color: TYPE_PALETTE[index % TYPE_PALETTE.length],
  })), [contracts, isArabic]);

  const timelineData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), 11 - i));
    const next = startOfMonth(subMonths(new Date(), 10 - i));
    const monthContracts = contracts.filter(c => {
      const d = new Date(c.created_at);
      return d >= date && d < next;
    });
    return {
      month: format(date, "MMM", { locale: isArabic ? ar : enUS }),
      contracts: monthContracts.length,
      value: monthContracts.reduce((s, c) => s + (c.contract_value || 0), 0) / 1_000_000,
    };
  }), [contracts, isArabic]);

  const topContractors = useMemo(() => Object.entries(
    contracts.reduce((acc, c) => {
      const name = c.contractor_name || (isArabic ? "غير محدد" : "Unknown");
      acc[name] = (acc[name] || 0) + (c.contract_value || 0);
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value: value / 1_000_000 })), [contracts, isArabic]);

  const totalValue = contracts.reduce((s, c) => s + (c.contract_value || 0), 0);
  const activeContracts = contracts.filter(c => c.status === "active").length;
  const completedContracts = contracts.filter(c => c.status === "completed").length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency", currency: "SAR", notation: "compact", maximumFractionDigits: 1,
    }).format(value);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const noData = contracts.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} value={contracts.length}
          label={isArabic ? "إجمالي العقود" : "Total Contracts"}
          color="blue" />
        <StatCard icon={TrendingUp} value={activeContracts}
          label={isArabic ? "عقود نشطة" : "Active Contracts"}
          color="green" />
        <StatCard icon={Users} value={completedContracts}
          label={isArabic ? "عقود مكتملة" : "Completed"}
          color="purple" />
        <StatCard icon={DollarSign} value={formatCurrency(totalValue)}
          label={isArabic ? "إجمالي القيمة" : "Total Value"}
          color="cyan" small />
      </div>

      {noData ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={BarChart3}
              title={isArabic ? "لا توجد بيانات للعرض" : "No data to display"}
              description={isArabic
                ? "أضف عقدًا واحدًا على الأقل لعرض الرسوم البيانية والتحليلات"
                : "Add at least one contract to see charts and analytics here"}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard title={isArabic ? "توزيع العقود حسب الحالة" : "Contracts by Status"}>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <defs>
                      {statusData.map((entry, i) => (
                        <radialGradient key={i} id={`status-grad-${i}`}>
                          <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                        </radialGradient>
                      ))}
                    </defs>
                    <Pie
                      data={statusData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                      isAnimationActive
                      animationDuration={800}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={`url(#status-grad-${i})`} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <NoSeries isArabic={isArabic} />}
            </ChartCard>

            <ChartCard title={isArabic ? "قيم العقود حسب النوع" : "Contract Values by Type"}>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <defs>
                      {typeData.map((entry, i) => (
                        <linearGradient key={i} id={`type-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={0.6} />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={900}>
                      {typeData.map((_, i) => (
                        <Cell key={i} fill={`url(#type-grad-${i})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoSeries isArabic={isArabic} />}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            <ChartCard title={isArabic ? "تطور العقود (آخر 12 شهر)" : "Contract Trends (Last 12 Months)"}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={timelineData} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="cnt-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(220 70% 50%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(220 70% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="val-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="left" type="monotone" dataKey="contracts"
                    stroke="hsl(220 70% 50%)" strokeWidth={2.5}
                    fill="url(#cnt-grad)"
                    name={isArabic ? "عدد العقود" : "Contracts"}
                    isAnimationActive animationDuration={900} />
                  <Area yAxisId="right" type="monotone" dataKey="value"
                    stroke="hsl(142 71% 45%)" strokeWidth={2.5}
                    fill="url(#val-grad)"
                    name={isArabic ? "القيمة (مليون)" : "Value (M)"}
                    isAnimationActive animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={isArabic ? "أعلى 5 مقاولين" : "Top 5 Contractors"}>
              {topContractors.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topContractors} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="top-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}M`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      content={<ChartTooltip formatter={(v: number) => `${v.toFixed(2)}M SAR`} />} />
                    <Bar dataKey="value" fill="url(#top-grad)" radius={[0, 6, 6, 0]}
                      isAnimationActive animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <NoSeries isArabic={isArabic} />}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};

// ---------- helpers ----------
const COLOR_MAP: Record<string, { bg: string; ring: string; text: string }> = {
  blue:   { bg: "from-blue-500/10 to-blue-600/5",     ring: "border-blue-500/20",   text: "text-blue-600" },
  green:  { bg: "from-green-500/10 to-green-600/5",   ring: "border-green-500/20",  text: "text-green-600" },
  purple: { bg: "from-purple-500/10 to-purple-600/5", ring: "border-purple-500/20", text: "text-purple-600" },
  cyan:   { bg: "from-cyan-500/10 to-cyan-600/5",     ring: "border-cyan-500/20",   text: "text-cyan-600" },
};

function StatCard({ icon: Icon, value, label, color, small }: any) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <Card className={`bg-gradient-to-br ${c.bg} ${c.ring} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-background/40 backdrop-blur-sm`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
          <div className="min-w-0">
            <p className={`${small ? "text-lg" : "text-2xl"} font-bold truncate`}>{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

function NoSeries({ isArabic }: { isArabic: boolean }) {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="w-10 h-10 opacity-40" />
      <p className="text-sm">{isArabic ? "لا توجد بيانات" : "No data available"}</p>
    </div>
  );
}

function getStatusArabic(status: string): string {
  const map: Record<string, string> = {
    active: "نشط", draft: "مسودة", pending: "معلق",
    completed: "مكتمل", terminated: "منتهي", suspended: "موقف",
  };
  return map[status] || status;
}

function getTypeArabic(type: string): string {
  const map: Record<string, string> = {
    fidic_red: "فيديك الأحمر", fidic_yellow: "فيديك الأصفر",
    fidic_silver: "فيديك الفضي", fidic_green: "فيديك الأخضر",
    fidic_pink: "فيديك الوردي", lump_sum: "مقطوعة",
    unit_price: "أسعار الوحدات", cost_plus: "التكلفة زائد", other: "أخرى",
  };
  return map[type] || type;
}

function formatTypeName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
