import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Hourglass,
  ShoppingCart,
  Truck,
  PackageCheck,
  AlertOctagon,
  GitBranch,
} from "lucide-react";

interface Props {
  isArabic?: boolean;
}

type Status = "pending" | "ordered" | "in_transit" | "delivered" | "delayed";

const STAGES: { key: Status; icon: any; color: string; arLabel: string; enLabel: string }[] = [
  { key: "pending", icon: Hourglass, color: "hsl(215 16% 55%)", arLabel: "بانتظار الطلب", enLabel: "Pending" },
  { key: "ordered", icon: ShoppingCart, color: "hsl(38 92% 50%)", arLabel: "تم الطلب", enLabel: "Ordered" },
  { key: "in_transit", icon: Truck, color: "hsl(199 89% 48%)", arLabel: "قيد الشحن", enLabel: "In transit" },
  { key: "delivered", icon: PackageCheck, color: "hsl(142 71% 45%)", arLabel: "تم التسليم", enLabel: "Delivered" },
  { key: "delayed", icon: AlertOctagon, color: "hsl(0 84% 60%)", arLabel: "متأخر", enLabel: "Delayed" },
];

/**
 * Visualizes the procurement pipeline: counts per status with a horizontal
 * proportional bar so the user sees where items are stuck.
 */
export function ProcurementWorkflowStatus({ isArabic }: Props) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<Status, number>>({
    pending: 0,
    ordered: 0,
    in_transit: 0,
    delivered: 0,
    delayed: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("procurement_items")
        .select("status")
        .eq("user_id", user.id);

      if (!active) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const c: Record<Status, number> = {
        pending: 0,
        ordered: 0,
        in_transit: 0,
        delivered: 0,
        delayed: 0,
      };
      data.forEach((r: any) => {
        const s = (r.status || "pending") as Status;
        if (s in c) c[s] += 1;
      });
      setCounts(c);
      setTotal(data.length);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <Skeleton className="h-32 rounded-xl" />;
  if (total === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          {isArabic ? "مسار طلبات الشراء" : "Procurement Pipeline"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {isArabic ? `${total} بند` : `${total} items`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Proportional bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          {STAGES.map((s) => {
            const pct = total > 0 ? (counts[s.key] / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={s.key}
                className="h-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: s.color }}
                title={`${isArabic ? s.arLabel : s.enLabel}: ${counts[s.key]}`}
              />
            );
          })}
        </div>

        {/* Stage tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STAGES.map((s) => {
            const Icon = s.icon;
            const n = counts[s.key];
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div
                key={s.key}
                className="rounded-lg border border-border/40 bg-card/50 p-2.5 flex items-center gap-2"
              >
                <div
                  className="p-1.5 rounded-md shrink-0"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight">{n}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {isArabic ? s.arLabel : s.enLabel} · {pct}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
