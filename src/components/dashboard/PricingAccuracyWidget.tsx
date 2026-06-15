import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  confidence: string | null;
  suggested_price: number | null;
  final_price: number | null;
  deviation_percent: number | null;
}

export function PricingAccuracyWidget() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("pricing_history")
        .select("id, confidence, suggested_price, final_price, deviation_percent")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const high = rows.filter((r) => (r.confidence || "").toLowerCase() === "high").length;
    const med = rows.filter((r) => (r.confidence || "").toLowerCase() === "medium").length;
    const low = rows.filter((r) => (r.confidence || "").toLowerCase() === "low").length;

    let beat = 0, at = 0, below = 0;
    rows.forEach((r) => {
      const d = Number(r.deviation_percent ?? 0);
      if (d < -3) below++;
      else if (d > 3) beat++;
      else at++;
    });

    const avgConfidence = rows.length
      ? Math.round(((high * 100 + med * 60 + low * 30) / rows.length))
      : 0;

    return { high, med, low, beat, at, below, avgConfidence, total: rows.length };
  }, [rows]);

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          {isArabic ? "دقة التسعير" : "Pricing Accuracy"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {stats.total} {isArabic ? "بند" : "items"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">{isArabic ? "متوسط الثقة" : "Avg confidence"}</span>
            <span className="font-semibold">{stats.avgConfidence}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-600"
              style={{ width: `${stats.avgConfidence}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <div className="text-[10px] text-muted-foreground">{isArabic ? "ثقة عالية" : "High"}</div>
            <p className="text-lg font-bold text-emerald-600">{stats.high}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
            <div className="text-[10px] text-muted-foreground">{isArabic ? "متوسطة" : "Medium"}</div>
            <p className="text-lg font-bold text-amber-600">{stats.med}</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5">
            <div className="text-[10px] text-muted-foreground">{isArabic ? "منخفضة" : "Low"}</div>
            <p className="text-lg font-bold text-red-600">{stats.low}</p>
          </div>
        </div>

        <div className="border-t pt-2">
          <p className="text-xs text-muted-foreground mb-1.5">
            {isArabic ? "مقارنة بالسوق" : "Market comparison"}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1 p-1.5 rounded bg-emerald-500/5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600">{stats.below}</span>
              <span className="text-[10px] text-muted-foreground">{isArabic ? "أقل" : "Below"}</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-1.5 rounded bg-muted/40">
              <Minus className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">{stats.at}</span>
              <span className="text-[10px] text-muted-foreground">{isArabic ? "موافق" : "At"}</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-1.5 rounded bg-red-500/5">
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-semibold text-red-600">{stats.beat}</span>
              <span className="text-[10px] text-muted-foreground">{isArabic ? "أعلى" : "Above"}</span>
            </div>
          </div>
        </div>

        <Link
          to="/pricing-accuracy"
          className="flex items-center justify-between text-xs text-primary hover:underline pt-1"
        >
          <span>{isArabic ? "عرض تحليل التسعير الكامل" : "View full pricing analysis"}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
