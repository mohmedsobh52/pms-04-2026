import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Flame,
  Target,
  Lightbulb,
  Activity as ActivityIcon,
  Gauge,
  Clock,
  Zap,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

interface Activity {
  sn: number;
  activity: string;
  activityAr: string;
  discipline: string;
  pv: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac1: number;
  progress: number;
}

interface Totals {
  pv: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  bac: number;
  eac: number;
}

interface Props {
  activities: Activity[];
  totals: Totals;
  isArabic: boolean;
  onJumpToActivity?: (sn: number) => void;
}

const fmtMoney = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` :
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` :
  n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` :
  Math.round(n).toLocaleString();

export function CostControlEnhancements({ activities, totals, isArabic, onJumpToActivity }: Props) {
  // ---------------- 1. Health Score (0-100) ----------------
  const healthScore = useMemo(() => {
    if (activities.length === 0 || totals.bac === 0) return 0;
    const cpiScore = Math.min(totals.cpi, 1.2) / 1.2 * 50;
    const spiScore = Math.min(totals.spi, 1.2) / 1.2 * 50;
    return Math.max(0, Math.min(100, Math.round(cpiScore + spiScore)));
  }, [activities, totals]);

  const healthTone =
    healthScore >= 80 ? "emerald" :
    healthScore >= 60 ? "gold" :
    healthScore >= 40 ? "amber" : "rose";

  // ---------------- 2. Top Cost Drivers (worst CV) ----------------
  const topDrivers = useMemo(
    () =>
      [...activities]
        .filter((a) => a.cv < 0 && a.ac > 0)
        .sort((a, b) => a.cv - b.cv)
        .slice(0, 5),
    [activities],
  );

  // ---------------- 3. Schedule Risks (worst SPI) ----------------
  const scheduleRisks = useMemo(
    () =>
      [...activities]
        .filter((a) => a.spi > 0 && a.spi < 0.9 && a.progress < 100)
        .sort((a, b) => a.spi - b.spi)
        .slice(0, 5),
    [activities],
  );

  // ---------------- 4. Discipline performance ----------------
  const disciplineHeat = useMemo(() => {
    const map: Record<string, { name: string; cpi: number; spi: number; bac: number; ac: number; cv: number; count: number }> = {};
    activities.forEach((a) => {
      const k = a.discipline || "other";
      if (!map[k]) map[k] = { name: k, cpi: 0, spi: 0, bac: 0, ac: 0, cv: 0, count: 0 };
      map[k].bac += a.pv;
      map[k].ac += a.ac;
      map[k].cv += a.cv;
      map[k].cpi += a.cpi;
      map[k].spi += a.spi;
      map[k].count++;
    });
    return Object.values(map).map((d) => ({
      ...d,
      cpi: d.count ? d.cpi / d.count : 0,
      spi: d.count ? d.spi / d.count : 0,
    }));
  }, [activities]);

  // ---------------- 5. Burn-rate forecast ----------------
  const burnRate = useMemo(() => {
    if (totals.ev === 0 || totals.bac === 0) return { weeksToFinish: 0, dailyBurn: 0, projected: totals.eac };
    const completion = totals.ev / totals.bac;
    // Assume project started 90 days ago for a generic estimate (purely indicative)
    const days = 90;
    const dailyBurn = totals.ac / days;
    const remaining = totals.bac - totals.ev;
    const weeksToFinish = dailyBurn > 0 ? Math.round((remaining / dailyBurn) / 7) : 0;
    return { weeksToFinish, dailyBurn, completion, projected: totals.eac };
  }, [totals]);

  // ---------------- 6. AI-style recommendations ----------------
  const recommendations = useMemo(() => {
    const recs: { id: string; level: "critical" | "warning" | "info"; title: string; detail: string }[] = [];
    if (totals.cpi > 0 && totals.cpi < 0.85) {
      recs.push({
        id: "cpi-low",
        level: "critical",
        title: isArabic ? "تجاوز تكلفة كبير" : "Significant cost overrun",
        detail: isArabic
          ? `مؤشر التكلفة ${totals.cpi.toFixed(2)} — راجع البنود الأكثر تجاوزاً وأعد التفاوض مع الموردين.`
          : `CPI is ${totals.cpi.toFixed(2)}. Review top variance items and renegotiate with suppliers.`,
      });
    }
    if (totals.spi > 0 && totals.spi < 0.9) {
      recs.push({
        id: "spi-low",
        level: "warning",
        title: isArabic ? "تأخر زمني" : "Schedule slippage",
        detail: isArabic
          ? `مؤشر الجدول ${totals.spi.toFixed(2)} — أعد توزيع الموارد على الأنشطة الحرجة.`
          : `SPI is ${totals.spi.toFixed(2)}. Re-level resources on critical path activities.`,
      });
    }
    if (totals.eac > totals.bac * 1.1) {
      recs.push({
        id: "eac-high",
        level: "warning",
        title: isArabic ? "تجاوز الميزانية المتوقع" : "Projected budget overrun",
        detail: isArabic
          ? `التقدير عند الإكمال يفوق الميزانية بـ ${(((totals.eac - totals.bac) / totals.bac) * 100).toFixed(1)}%.`
          : `EAC exceeds BAC by ${(((totals.eac - totals.bac) / totals.bac) * 100).toFixed(1)}%.`,
      });
    }
    if (topDrivers.length >= 3) {
      recs.push({
        id: "top-drivers",
        level: "info",
        title: isArabic ? "تركيز التجاوز" : "Variance concentration",
        detail: isArabic
          ? `${topDrivers.length} أنشطة تمثل غالبية التجاوز. ركّز عمليات المراقبة عليها.`
          : `${topDrivers.length} activities drive most of the variance. Focus monitoring on them.`,
      });
    }
    if (recs.length === 0) {
      recs.push({
        id: "all-good",
        level: "info",
        title: isArabic ? "الأداء ضمن النطاق" : "Performance on track",
        detail: isArabic
          ? "لا توجد تنبيهات حرجة حالياً. استمر في تحديث نسب الإنجاز بانتظام."
          : "No critical alerts. Keep progress updates frequent.",
      });
    }
    return recs;
  }, [totals, topDrivers, isArabic]);

  if (activities.length === 0) {
    return (
      <Card className="p-6 mt-6">
        <EmptyState
          icon={Gauge}
          title={isArabic ? "لا توجد بيانات للتحليل" : "No data to analyze"}
          description={isArabic ? "اختر مشروعاً ليبدأ التحليل المتقدم" : "Select a project to start advanced analysis"}
        />
      </Card>
    );
  }

  const radialData = [{ name: "score", value: healthScore, fill: `hsl(var(--primary))` }];

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {isArabic ? "تحليلات متقدمة وتوصيات" : "Advanced Insights & Recommendations"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isArabic
              ? "نظرة ذكية على صحة المشروع، أهم المخاطر وأقوى الفرص للتحسين"
              : "Smart view of project health, top risks, and improvement opportunities"}
          </p>
        </div>
      </div>

      {/* Hero row: Health score + key stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              {isArabic ? "صحة المشروع" : "Project Health"}
            </p>
            <div className="h-32 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center -mt-24">
              <p className="text-3xl font-bold font-display tabular-nums">{healthScore}</p>
              <Badge
                variant="outline"
                className={
                  healthTone === "emerald" ? "border-emerald-500/40 text-emerald-600 mt-1" :
                  healthTone === "gold" ? "border-amber-400/40 text-amber-600 mt-1" :
                  healthTone === "amber" ? "border-amber-500/40 text-amber-600 mt-1" :
                  "border-rose-500/40 text-rose-600 mt-1"
                }
              >
                {healthScore >= 80
                  ? isArabic ? "ممتاز" : "Excellent"
                  : healthScore >= 60
                    ? isArabic ? "جيد" : "Good"
                    : healthScore >= 40
                      ? isArabic ? "يحتاج انتباه" : "Needs attention"
                      : isArabic ? "حرج" : "Critical"}
              </Badge>
            </div>
          </div>
        </Card>

        <StatCard
          tone={totals.cpi >= 1 ? "emerald" : totals.cpi >= 0.9 ? "amber" : "rose"}
          icon={totals.cpi >= 1 ? TrendingUp : TrendingDown}
          label={isArabic ? "كفاءة التكلفة (CPI)" : "Cost Efficiency (CPI)"}
          value={totals.cpi.toFixed(2)}
          hint={
            totals.cpi >= 1
              ? isArabic ? "أقل من الميزانية" : "Under budget"
              : isArabic ? "تجاوز الميزانية" : "Over budget"
          }
          trend={{ value: (totals.cpi - 1) * 100, positiveIsGood: true }}
        />

        <StatCard
          tone={totals.spi >= 1 ? "emerald" : totals.spi >= 0.9 ? "amber" : "rose"}
          icon={Clock}
          label={isArabic ? "كفاءة الجدول (SPI)" : "Schedule Efficiency (SPI)"}
          value={totals.spi.toFixed(2)}
          hint={
            totals.spi >= 1
              ? isArabic ? "في الوقت" : "On schedule"
              : isArabic ? "متأخر" : "Behind"
          }
          trend={{ value: (totals.spi - 1) * 100, positiveIsGood: true }}
        />

        <StatCard
          tone={totals.eac <= totals.bac ? "emerald" : "rose"}
          icon={Target}
          label={isArabic ? "التقدير عند الإكمال" : "Estimate at Completion"}
          value={fmtMoney(totals.eac)}
          hint={
            totals.bac > 0
              ? `${(((totals.eac - totals.bac) / totals.bac) * 100).toFixed(1)}% ${
                  isArabic ? "مقابل الميزانية" : "vs BAC"
                }`
              : ""
          }
        />
      </div>

      {/* Recommendations */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">{isArabic ? "توصيات ذكية" : "Smart Recommendations"}</h3>
          <Badge variant="secondary" className="ml-auto">{recommendations.length}</Badge>
        </div>
        <div className="space-y-2">
          {recommendations.map((r) => {
            const Icon =
              r.level === "critical" ? XCircle :
              r.level === "warning" ? AlertTriangle :
              r.id === "all-good" ? CheckCircle2 : Lightbulb;
            const tone =
              r.level === "critical" ? "bg-rose-500/10 text-rose-600 border-rose-500/30" :
              r.level === "warning" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
              r.id === "all-good" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
              "bg-sky-500/10 text-sky-600 border-sky-500/30";
            return (
              <div key={r.id} className={`flex gap-3 p-3 rounded-lg border ${tone}`}>
                <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top drivers + Schedule risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-rose-500" />
            <h3 className="font-semibold">{isArabic ? "أكبر مسببات تجاوز التكلفة" : "Top Cost Variance Drivers"}</h3>
          </div>
          {topDrivers.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={isArabic ? "لا يوجد تجاوز" : "No overruns"}
              description={isArabic ? "كل الأنشطة ضمن الميزانية" : "All activities within budget"}
              className="py-6"
            />
          ) : (
            <ul className="divide-y">
              {topDrivers.map((a) => (
                <li key={a.sn} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => onJumpToActivity?.(a.sn)}
                    className="min-w-0 text-start flex-1 hover:underline"
                  >
                    <p className="text-sm font-medium truncate">{isArabic ? a.activityAr || a.activity : a.activity}</p>
                    <p className="text-xs text-muted-foreground">CPI {a.cpi.toFixed(2)} · {a.discipline}</p>
                  </button>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold text-rose-600 tabular-nums">{fmtMoney(a.cv)}</p>
                    <p className="text-[10px] text-muted-foreground">{isArabic ? "تجاوز" : "variance"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">{isArabic ? "أعلى مخاطر الجدول الزمني" : "Top Schedule Risks"}</h3>
          </div>
          {scheduleRisks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={isArabic ? "الجدول مستقر" : "Schedule stable"}
              description={isArabic ? "لا توجد أنشطة متأخرة بشكل ملحوظ" : "No significantly late activities"}
              className="py-6"
            />
          ) : (
            <ul className="space-y-3">
              {scheduleRisks.map((a) => (
                <li key={a.sn} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onJumpToActivity?.(a.sn)}
                      className="text-sm font-medium truncate hover:underline text-start flex-1"
                    >
                      {isArabic ? a.activityAr || a.activity : a.activity}
                    </button>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 shrink-0">
                      SPI {a.spi.toFixed(2)}
                    </Badge>
                  </div>
                  <Progress value={a.progress} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground">
                    {a.progress.toFixed(0)}% {isArabic ? "إنجاز" : "complete"} · {a.discipline}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Discipline performance chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ActivityIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{isArabic ? "أداء التخصصات" : "Discipline Performance"}</h3>
        </div>
        {disciplineHeat.length === 0 ? (
          <EmptyState icon={ActivityIcon} title={isArabic ? "لا توجد بيانات" : "No data"} className="py-6" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disciplineHeat} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-20} textAnchor="end" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any, name: string) =>
                    name === "cpi" || name === "spi" ? Number(v).toFixed(2) : fmtMoney(Number(v))
                  }
                />
                <Bar dataKey="cpi" name={isArabic ? "CPI" : "CPI"} radius={[4, 4, 0, 0]}>
                  {disciplineHeat.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.cpi >= 1 ? "hsl(160 70% 45%)" : d.cpi >= 0.9 ? "hsl(38 90% 55%)" : "hsl(0 75% 60%)"}
                    />
                  ))}
                </Bar>
                <Bar dataKey="spi" name={isArabic ? "SPI" : "SPI"} radius={[4, 4, 0, 0]}>
                  {disciplineHeat.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.spi >= 1 ? "hsl(160 60% 55%)" : d.spi >= 0.9 ? "hsl(38 80% 65%)" : "hsl(0 65% 70%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Burn-rate */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">{isArabic ? "معدل الاستهلاك والإسقاط" : "Burn Rate & Projection"}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{isArabic ? "نسبة الإنجاز" : "Completion"}</p>
            <p className="text-2xl font-bold font-display tabular-nums">
              {totals.bac > 0 ? ((totals.ev / totals.bac) * 100).toFixed(1) : "0"}%
            </p>
            <Progress value={totals.bac > 0 ? (totals.ev / totals.bac) * 100 : 0} className="h-1.5 mt-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isArabic ? "متوسط الاستهلاك اليومي" : "Avg daily burn"}</p>
            <p className="text-2xl font-bold font-display tabular-nums">{fmtMoney(burnRate.dailyBurn)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{isArabic ? "تقديري" : "estimated"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isArabic ? "الأسابيع المتبقية" : "Weeks to finish"}</p>
            <p className="text-2xl font-bold font-display tabular-nums">{burnRate.weeksToFinish}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isArabic ? "بالمعدل الحالي" : "at current rate"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isArabic ? "الإسقاط النهائي" : "Projected total"}</p>
            <p className="text-2xl font-bold font-display tabular-nums">{fmtMoney(burnRate.projected)}</p>
            <p className={`text-[10px] mt-1 ${burnRate.projected > totals.bac ? "text-rose-600" : "text-emerald-600"}`}>
              {burnRate.projected > totals.bac
                ? `+${fmtMoney(burnRate.projected - totals.bac)} ${isArabic ? "فوق الميزانية" : "over BAC"}`
                : `${fmtMoney(totals.bac - burnRate.projected)} ${isArabic ? "تحت الميزانية" : "under BAC"}`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
