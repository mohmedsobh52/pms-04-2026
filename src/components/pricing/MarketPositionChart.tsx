import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, Minus, TrendingUp, Gauge } from "lucide-react";

interface Props {
  isArabic?: boolean;
}

/**
 * Beat / At / Below market comparison based on pricing_history:
 * compares `final_price` vs `suggested_price` per record.
 *   below market   => final < suggested by >5%   (good for buyer)
 *   at market      => within ±5%
 *   above market   => final > suggested by >5%
 */
export function MarketPositionChart({ isArabic }: Props) {
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState({ below: 0, at: 0, above: 0 });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pricing_history")
        .select("suggested_price,final_price")
        .eq("user_id", user.id)
        .not("suggested_price", "is", null)
        .not("final_price", "is", null);
      if (!active) return;
      const b = { below: 0, at: 0, above: 0 };
      (data || []).forEach((r: any) => {
        const s = Number(r.suggested_price);
        const f = Number(r.final_price);
        if (!s || !f) return;
        const diff = ((f - s) / s) * 100;
        if (diff < -5) b.below += 1;
        else if (diff > 5) b.above += 1;
        else b.at += 1;
      });
      setBuckets(b);
      setTotal(b.below + b.at + b.above);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;

  const tiles = [
    {
      key: "below",
      label: isArabic ? "أقل من السوق" : "Below Market",
      value: buckets.below,
      icon: TrendingDown,
      color: "hsl(142 71% 45%)",
      hint: isArabic ? "فرصة تنافسية" : "Competitive edge",
    },
    {
      key: "at",
      label: isArabic ? "ضمن السوق" : "At Market",
      value: buckets.at,
      icon: Minus,
      color: "hsl(199 89% 48%)",
      hint: isArabic ? "تسعير عادل" : "Fair pricing",
    },
    {
      key: "above",
      label: isArabic ? "أعلى من السوق" : "Above Market",
      value: buckets.above,
      icon: TrendingUp,
      color: "hsl(0 84% 60%)",
      hint: isArabic ? "مراجعة مطلوبة" : "Review needed",
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          {isArabic ? "موقعك من السوق" : "Market Position"}
          <span className="ms-auto text-xs text-muted-foreground font-normal">
            {total} {isArabic ? "سجل" : "records"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isArabic ? "لا توجد بيانات كافية للمقارنة" : "Not enough data to compare"}
          </p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
              {tiles.map((t) => {
                const pct = (t.value / total) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={t.key}
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: t.color }}
                    title={`${t.label}: ${t.value}`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((t) => {
                const Icon = t.icon;
                const pct = total > 0 ? Math.round((t.value / total) * 100) : 0;
                return (
                  <div
                    key={t.key}
                    className="rounded-lg border border-border/40 bg-card/50 p-3 text-center"
                  >
                    <div
                      className="w-9 h-9 rounded-full mx-auto flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${t.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: t.color }} />
                    </div>
                    <p className="text-2xl font-bold leading-tight" style={{ color: t.color }}>
                      {pct}%
                    </p>
                    <p className="text-xs font-medium mt-1">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {t.value} · {t.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
