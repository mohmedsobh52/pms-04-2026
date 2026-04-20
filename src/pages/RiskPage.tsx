import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
const RiskManagement = lazy(() =>
  import("@/components/RiskManagement").then((m) => ({ default: m.RiskManagement }))
);
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity, Clock, Layers } from "lucide-react";
import { ColorLegend } from "@/components/ui/color-code";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

const RiskPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({ total: 0, high: 0, mitigated: 0, avgScore: 0, dueSoon: 0 });
  const [byCategory, setByCategory] = useState<Array<{ name: string; count: number }>>([]);
  const [byStatus, setByStatus] = useState<Array<{ name: string; count: number; color: string }>>([]);
  const [heatmap, setHeatmap] = useState<number[][]>(() => Array.from({length:5},()=>Array(5).fill(0)));
  const [topRisks, setTopRisks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("risks")
        .select("id, title, description, risk_score, probability, impact, status, category, review_date")
        .eq("user_id", user.id)
        .limit(500)
        .order("created_at", { ascending: false });
      if (!data) return;
      const scores = data.map((r: any) => Number(r.risk_score) || 0);
      const high = data.filter((r: any) => (Number(r.risk_score) || 0) >= 15).length;
      const mitigated = data.filter((r: any) => r.status === "mitigated" || r.status === "closed").length;
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      const now = Date.now();
      const in14 = now + 14 * 24 * 60 * 60 * 1000;
      const dueSoon = data.filter((r: any) => {
        if (!r.review_date) return false;
        const t = new Date(r.review_date).getTime();
        return t >= now && t <= in14;
      }).length;

      const catCounts: Record<string, number> = {};
      data.forEach((r: any) => {
        const c = r.category || (isArabic ? "غير محدد" : "Uncategorized");
        catCounts[c] = (catCounts[c] || 0) + 1;
      });
      const cats = Object.entries(catCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const statusMap: Record<string, { label: string; color: string }> = {
        open: { label: isArabic ? "مفتوحة" : "Open", color: "bg-red-500" },
        in_progress: { label: isArabic ? "قيد المعالجة" : "In Progress", color: "bg-amber-500" },
        mitigated: { label: isArabic ? "تمت معالجتها" : "Mitigated", color: "bg-emerald-500" },
        closed: { label: isArabic ? "مغلقة" : "Closed", color: "bg-blue-500" },
      };
      const statCounts: Record<string, number> = {};
      data.forEach((r: any) => {
        const s = r.status || "open";
        statCounts[s] = (statCounts[s] || 0) + 1;
      });
      const stArr = Object.entries(statCounts).map(([k, count]) => ({
        name: statusMap[k]?.label || k,
        count,
        color: statusMap[k]?.color || "bg-muted",
      }));

      setStats({ total: data.length, high, mitigated, avgScore: avg, dueSoon });
      setByCategory(cats);
      setByStatus(stArr);

      // Heatmap 5x5 (probability rows × impact cols, 1..5)
      const hm = Array.from({ length: 5 }, () => Array(5).fill(0));
      data.forEach((r: any) => {
        const p = Math.min(5, Math.max(1, Math.round(Number(r.probability) || 0)));
        const i = Math.min(5, Math.max(1, Math.round(Number(r.impact) || 0)));
        if (p && i) hm[5 - p][i - 1] += 1;
      });
      setHeatmap(hm);

      // Top risks
      setTopRisks(
        [...data]
          .filter((r: any) => r.status !== "closed" && r.status !== "mitigated")
          .sort((a: any, b: any) => (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0))
          .slice(0, 5)
      );
    })();
  }, [user, isArabic]);

  const cards = [
    { icon: ShieldAlert, label: isArabic ? "إجمالي المخاطر" : "Total Risks", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
    { icon: AlertTriangle, label: isArabic ? "مخاطر عالية" : "High Risks", value: stats.high, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
    { icon: ShieldCheck, label: isArabic ? "تمت معالجتها" : "Mitigated", value: stats.mitigated, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Activity, label: isArabic ? "متوسط الخطورة" : "Avg Score", value: stats.avgScore, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { icon: Clock, label: isArabic ? "تحتاج مراجعة (14 يوم)" : "Due for Review (14d)", value: stats.dueSoon, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  ];

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));
  const totalStatus = byStatus.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {isArabic ? "المخاطر حسب الفئة" : "Risks by Category"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {byCategory.length === 0 && (
                <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
              )}
              {byCategory.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate">{c.name}</span>
                    <span className="font-semibold">{c.count}</span>
                  </div>
                  <Progress value={(c.count / maxCat) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {isArabic ? "توزيع الحالات" : "Status Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byStatus.length === 0 && (
                <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
              )}
              {byStatus.length > 0 && (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {byStatus.map((s, i) => (
                      <div key={i} className={s.color} style={{ width: `${(s.count / totalStatus) * 100}%` }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {byStatus.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded ${s.color}`} />
                        <span className="truncate">{s.name}</span>
                        <span className="font-semibold ms-auto">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                {isArabic ? "مصفوفة المخاطر (احتمال × تأثير)" : "Risk Heatmap (Probability × Impact)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 text-[10px]">
                <div className="flex flex-col justify-between py-1 pe-1 text-muted-foreground">
                  {[5,4,3,2,1].map((n)=>(<span key={n} className="h-8 flex items-center">{n}</span>))}
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-5 gap-1">
                    {heatmap.map((row, ri) => row.map((v, ci) => {
                      const score = (5 - ri) * (ci + 1);
                      const bg = score >= 15 ? "bg-red-500/80" : score >= 8 ? "bg-amber-500/70" : score >= 4 ? "bg-yellow-400/60" : "bg-emerald-500/60";
                      return (
                        <div key={`${ri}-${ci}`} className={`h-8 rounded ${bg} flex items-center justify-center text-[11px] font-bold text-white`}>
                          {v > 0 ? v : ""}
                        </div>
                      );
                    }))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-1 text-center text-muted-foreground">
                    {[1,2,3,4,5].map((n)=>(<span key={n}>{n}</span>))}
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground mt-1">
                    {isArabic ? "التأثير →" : "Impact →"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                {isArabic ? "أعلى المخاطر النشطة" : "Top Active Risks"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topRisks.length === 0 && (
                <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد مخاطر نشطة" : "No active risks"}</p>
              )}
              {topRisks.map((r: any) => {
                const sc = Number(r.risk_score) || 0;
                const sev = sc >= 15 ? "destructive" : sc >= 8 ? "default" : "secondary";
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 border border-border/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title || r.description}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.category || (isArabic ? "غير محدد" : "Uncategorized")}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${sc >= 15 ? "bg-red-500/15 text-red-600" : sc >= 8 ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                      {sc}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <ColorLegend type="priority" isArabic={isArabic} />
        <RiskManagement />
      </div>
    </PageLayout>
  );
};

export default RiskPage;
