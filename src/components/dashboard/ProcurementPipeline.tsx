import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Package, ChevronRight } from "lucide-react";

interface StageInfo {
  key: string;
  labelAr: string;
  labelEn: string;
  color: string;
}

const STAGES: StageInfo[] = [
  { key: "draft", labelAr: "مسودة", labelEn: "Draft", color: "bg-slate-500" },
  { key: "rfq", labelAr: "طلب عرض", labelEn: "RFQ", color: "bg-blue-500" },
  { key: "selected", labelAr: "اختيار مورد", labelEn: "Selected", color: "bg-indigo-500" },
  { key: "ordered", labelAr: "أمر شراء", labelEn: "Ordered", color: "bg-amber-500" },
  { key: "delivered", labelAr: "مُستلم", labelEn: "Delivered", color: "bg-emerald-500" },
];

/**
 * Procurement pipeline summary: counts items in each workflow stage and shows
 * a horizontal funnel-like bar with totals.
 */
export function ProcurementPipeline() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ status: string | null; estimated_cost: number | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("procurement_items")
        .select("status, estimated_cost")
        .eq("user_id", user.id);
      setRows(data || []);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    STAGES.forEach((s) => (counts[s.key] = { count: 0, value: 0 }));
    let total = 0;
    let totalValue = 0;
    rows.forEach((r) => {
      const status = (r.status || "draft").toLowerCase();
      const key = STAGES.find((s) => status.includes(s.key))?.key || "draft";
      counts[key].count += 1;
      counts[key].value += Number(r.estimated_cost) || 0;
      total += 1;
      totalValue += Number(r.estimated_cost) || 0;
    });
    return { counts, total, totalValue };
  }, [rows]);

  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          {isArabic ? "خط أنابيب المشتريات" : "Procurement Pipeline"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {stats.total} {isArabic ? "بند" : "items"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isArabic ? "لا توجد بنود مشتريات بعد" : "No procurement items yet"}
          </p>
        ) : (
          <>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {STAGES.map((s) => {
                const pct = (stats.counts[s.key].count / stats.total) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={s.key}
                    className={s.color}
                    style={{ width: `${pct}%` }}
                    title={`${isArabic ? s.labelAr : s.labelEn}: ${stats.counts[s.key].count}`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {STAGES.map((s) => {
                const c = stats.counts[s.key];
                return (
                  <div key={s.key} className="text-center">
                    <div className={`w-2 h-2 ${s.color} rounded-full mx-auto mb-1`} />
                    <p className="text-[10px] text-muted-foreground truncate">
                      {isArabic ? s.labelAr : s.labelEn}
                    </p>
                    <p className="text-sm font-bold">{c.count}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-muted-foreground">
                {isArabic ? "إجمالي القيمة المقدرة" : "Total estimated value"}
              </span>
              <span className="font-semibold">{fmt.format(stats.totalValue)} SAR</span>
            </div>
            <Link
              to="/procurement"
              className="flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              {isArabic ? "عرض المشتريات" : "View procurement"}
              <ChevronRight className="w-3 h-3" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
