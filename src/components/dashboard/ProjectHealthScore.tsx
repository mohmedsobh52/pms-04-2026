import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Activity, FileSignature, Wallet, Truck, TrendingUp, AlertCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface Pillar {
  key: string;
  label: string;
  score: number; // 0..100
  detail: string;
  icon: any;
}

/**
 * Project Health Score: aggregates 4 pillars (contracts, payments, procurement,
 * pricing accuracy) into a single 0-100 score with weighted average.
 */
export function ProjectHealthScore() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState<Pillar[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const today = new Date();
      const horizon = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

      const [contracts, payments, procurement, items] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, end_date, status")
          .eq("user_id", user.id)
          .neq("status", "completed")
          .neq("status", "terminated"),
        supabase
          .from("contract_payments")
          .select("id, due_date, status")
          .eq("user_id", user.id)
          .neq("status", "paid")
          .neq("status", "cancelled"),
        supabase
          .from("procurement_items")
          .select("id, delivery_date, lead_time_days, status")
          .eq("user_id", user.id)
          .neq("status", "delivered"),
        supabase
          .from("project_items")
          .select("id, unit_price")
          .limit(2000),
      ]);

      const cTotal = contracts.data?.length || 0;
      const cAtRisk = (contracts.data || []).filter((c: any) => {
        if (!c.end_date) return false;
        const d = differenceInDays(parseISO(c.end_date), today);
        return d < 30;
      }).length;
      const cScore = cTotal === 0 ? 100 : Math.max(0, 100 - (cAtRisk / cTotal) * 100);

      const pTotal = payments.data?.length || 0;
      const pOverdue = (payments.data || []).filter((p: any) => {
        if (!p.due_date) return false;
        return differenceInDays(parseISO(p.due_date), today) < 0;
      }).length;
      const pScore = pTotal === 0 ? 100 : Math.max(0, 100 - (pOverdue / pTotal) * 150);

      const prTotal = procurement.data?.length || 0;
      const prAtRisk = (procurement.data || []).filter((pr: any) => {
        if (!pr.delivery_date) return false;
        const days = differenceInDays(parseISO(pr.delivery_date), today);
        const lead = pr.lead_time_days || 0;
        return days < 0 || days - lead < 0;
      }).length;
      const prScore = prTotal === 0 ? 100 : Math.max(0, 100 - (prAtRisk / prTotal) * 120);

      const iTotal = items.data?.length || 0;
      const iPriced = (items.data || []).filter((i: any) => Number(i.unit_price) > 0).length;
      const iScore = iTotal === 0 ? 100 : Math.round((iPriced / iTotal) * 100);

      setPillars([
        {
          key: "contracts",
          label: isArabic ? "العقود" : "Contracts",
          score: Math.round(cScore),
          detail: isArabic ? `${cAtRisk}/${cTotal} قيد الخطر` : `${cAtRisk}/${cTotal} at risk`,
          icon: FileSignature,
        },
        {
          key: "payments",
          label: isArabic ? "الدفعات" : "Payments",
          score: Math.round(pScore),
          detail: isArabic ? `${pOverdue}/${pTotal} متأخرة` : `${pOverdue}/${pTotal} overdue`,
          icon: Wallet,
        },
        {
          key: "procurement",
          label: isArabic ? "المشتريات" : "Procurement",
          score: Math.round(prScore),
          detail: isArabic ? `${prAtRisk}/${prTotal} قيد الخطر` : `${prAtRisk}/${prTotal} at risk`,
          icon: Truck,
        },
        {
          key: "pricing",
          label: isArabic ? "اكتمال التسعير" : "Pricing coverage",
          score: iScore,
          detail: isArabic ? `${iPriced}/${iTotal} مسعّر` : `${iPriced}/${iTotal} priced`,
          icon: TrendingUp,
        },
      ]);
      setLoading(false);
    })();
  }, [user, isArabic]);

  const overall = useMemo(() => {
    if (pillars.length === 0) return 0;
    const weights: Record<string, number> = { contracts: 0.25, payments: 0.3, procurement: 0.25, pricing: 0.2 };
    const sum = pillars.reduce((acc, p) => acc + p.score * (weights[p.key] || 0.25), 0);
    return Math.round(sum);
  }, [pillars]);

  const tone = overall >= 80
    ? { label: isArabic ? "ممتاز" : "Excellent", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" }
    : overall >= 60
    ? { label: isArabic ? "جيد" : "Good", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" }
    : overall >= 40
    ? { label: isArabic ? "تحت المراقبة" : "Watch", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" }
    : { label: isArabic ? "حرج" : "Critical", color: "text-red-600", bg: "bg-red-500/10 border-red-500/30" };

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          {isArabic ? "مؤشر صحة المشاريع" : "Project Health Score"}
          <Badge variant="outline" className={`ms-auto ${tone.color}`}>{tone.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-lg border p-4 flex items-center justify-between ${tone.bg}`}>
          <div>
            <p className="text-xs text-muted-foreground">{isArabic ? "النتيجة الإجمالية" : "Overall score"}</p>
            <p className={`text-4xl font-bold ${tone.color}`}>{overall}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
          {overall < 60 && <AlertCircle className={`w-8 h-8 ${tone.color}`} />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            const color = p.score >= 80 ? "text-emerald-600" : p.score >= 60 ? "text-blue-600" : p.score >= 40 ? "text-amber-600" : "text-red-600";
            return (
              <div key={p.key} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${color}`}>{p.score}</span>
                </div>
                <Progress value={p.score} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">{p.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
