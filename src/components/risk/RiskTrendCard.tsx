import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface RiskRow {
  id: string;
  risk_score?: number | string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  risks: RiskRow[];
}

/**
 * Sparkline of "active high-severity risks" over the last 30 days
 * plus a delta vs previous 30-day window.
 */
export function RiskTrendCard({ risks }: Props) {
  const { isArabic } = useLanguage();

  const { series, current, previous } = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets: number[] = Array(days).fill(0);
    const start = today.getTime() - (days - 1) * 86_400_000;

    risks.forEach((r) => {
      const score = Number(r.risk_score) || 0;
      if (score < 8) return; // medium+ only
      const t = new Date(r.created_at || r.updated_at || Date.now()).getTime();
      if (isNaN(t)) return;
      // count as "active" from creation until mitigated/closed for each day
      const activeUntil = r.status === "mitigated" || r.status === "closed"
        ? new Date(r.updated_at || Date.now()).getTime()
        : today.getTime() + 86_400_000;
      for (let i = 0; i < days; i++) {
        const dayStart = start + i * 86_400_000;
        if (t <= dayStart + 86_400_000 && activeUntil >= dayStart) buckets[i] += 1;
      }
    });

    const cur = buckets.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const prev = buckets.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
    return { series: buckets, current: cur, previous: prev };
  }, [risks]);

  const delta = current - previous;
  const pct = previous > 0 ? (delta / previous) * 100 : 0;
  const Icon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const tone =
    delta > 0.5
      ? "text-red-600 dark:text-red-400"
      : delta < -0.5
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground";

  const max = Math.max(1, ...series);
  const w = 240;
  const h = 50;
  const step = w / (series.length - 1 || 1);
  const points = series
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`w-4 h-4 ${tone}`} />
          {isArabic ? "اتجاه المخاطر النشطة (30 يوم)" : "Active Risk Trend (30d)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold">{current.toFixed(1)}</p>
            <p className="text-[11px] text-muted-foreground">
              {isArabic ? "متوسط آخر 7 أيام" : "avg last 7 days"}
            </p>
            <p className={`text-xs font-semibold mt-1 ${tone}`}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} ({pct >= 0 ? "+" : ""}
              {pct.toFixed(0)}%){" "}
              <span className="text-muted-foreground font-normal">
                {isArabic ? "مقابل الأسبوع السابق" : "vs prior week"}
              </span>
            </p>
          </div>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="flex-1 h-14 overflow-visible"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              points={points}
            />
            <polyline
              fill="hsl(var(--primary) / 0.12)"
              stroke="none"
              points={`0,${h} ${points} ${w},${h}`}
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
