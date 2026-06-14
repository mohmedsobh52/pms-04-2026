import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldAlert, ChevronRight } from "lucide-react";

interface RiskRow {
  id: string;
  risk_title: string;
  category: string | null;
  probability: string | null;
  impact: string | null;
  risk_score: number | null;
  status: string | null;
}

const levelOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const scoreFor = (r: RiskRow) => {
  if (typeof r.risk_score === "number") return r.risk_score;
  const p = levelOrder[(r.probability || "medium").toLowerCase()] || 2;
  const i = levelOrder[(r.impact || "medium").toLowerCase()] || 2;
  return p * i;
};

const severityColor = (score: number) => {
  if (score >= 12) return "bg-destructive/15 text-destructive border-destructive/30";
  if (score >= 8) return "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400";
  if (score >= 4) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400";
  return "bg-muted text-muted-foreground border-border";
};

export const TopRisksPanel = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("risks")
        .select("id,risk_title,category,probability,impact,risk_score,status")
        .eq("user_id", user.id)
        .neq("status", "closed")
        .limit(50);
      if (cancelled) return;
      const sorted = (data || [])
        .map((r) => ({ ...r, _s: scoreFor(r as RiskRow) }))
        .sort((a, b) => (b._s as number) - (a._s as number))
        .slice(0, 6);
      setRisks(sorted as RiskRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border/60">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-destructive" />
          {isArabic ? "أهم المخاطر" : "Top Risks"}
        </CardTitle>
        <Link
          to="/risks"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {isArabic ? "عرض الكل" : "View all"}
          <ChevronRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : risks.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {isArabic ? "لا توجد مخاطر مفتوحة" : "No open risks"}
          </div>
        ) : (
          risks.map((r) => {
            const s = scoreFor(r);
            return (
              <Link
                key={r.id}
                to="/risks"
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.risk_title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.category || (isArabic ? "عام" : "general")} •{" "}
                    {isArabic ? "حالة" : "status"}: {r.status || "—"}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${severityColor(s)}`}>
                  {s}
                </Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
