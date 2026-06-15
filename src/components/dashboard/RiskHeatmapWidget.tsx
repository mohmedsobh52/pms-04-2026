import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, ChevronRight } from "lucide-react";

/**
 * Compact 5x5 risk heatmap (probability x impact) for the main dashboard.
 * Links to the full Risk page for drill-down.
 */
export function RiskHeatmapWidget() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: 5 }, () => Array(5).fill(0))
  );
  const [total, setTotal] = useState(0);
  const [high, setHigh] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("risks")
        .select("probability, impact, risk_score, status")
        .eq("user_id", user.id)
        .neq("status", "closed")
        .limit(1000);

      const g = Array.from({ length: 5 }, () => Array(5).fill(0));
      let h = 0;
      (data || []).forEach((r: any) => {
        const p = Math.min(5, Math.max(1, Number(r.probability) || 1));
        const i = Math.min(5, Math.max(1, Number(r.impact) || 1));
        g[5 - p][i - 1] += 1;
        if ((Number(r.risk_score) || p * i) >= 15) h += 1;
      });
      setGrid(g);
      setTotal(data?.length || 0);
      setHigh(h);
      setLoading(false);
    })();
  }, [user]);

  const cellColor = (p: number, i: number) => {
    const score = p * i;
    if (score >= 15) return "bg-destructive/80 text-destructive-foreground";
    if (score >= 9) return "bg-orange-500/70 text-white";
    if (score >= 5) return "bg-yellow-400/70 text-foreground";
    return "bg-emerald-500/40 text-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          {isArabic ? "خريطة المخاطر" : "Risk Heatmap"}
          <div className="ms-auto flex items-center gap-2">
            <Badge variant="outline">{total}</Badge>
            {high > 0 && (
              <Badge variant="destructive">
                {high} {isArabic ? "عالية" : "high"}
              </Badge>
            )}
            <Link to="/risks" className="text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-col justify-between text-[10px] text-muted-foreground py-1">
              <span>{isArabic ? "احتمال↑" : "Prob ↑"}</span>
              <span>5</span>
              <span>1</span>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-1">
                {grid.map((row, rIdx) =>
                  row.map((count, cIdx) => {
                    const p = 5 - rIdx;
                    const i = cIdx + 1;
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`aspect-square rounded flex items-center justify-center text-xs font-semibold ${cellColor(
                          p,
                          i
                        )}`}
                        title={`P${p} × I${i} = ${count}`}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>1</span>
                <span>{isArabic ? "الأثر →" : "Impact →"}</span>
                <span>5</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
