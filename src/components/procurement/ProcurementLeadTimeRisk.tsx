import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Truck, Clock, CheckCircle2, PackageX } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface Item {
  id: string;
  boq_item_number: string;
  description: string | null;
  delivery_date: string | null;
  order_date: string | null;
  lead_time_days: number | null;
  status: string | null;
  priority: string | null;
  estimated_cost: number | null;
  quantity: number | null;
}

interface Props { isArabic?: boolean }

/**
 * Procurement Lead-Time Risk panel: flags items at risk of late delivery.
 * Risk score = (lead_time required) vs (days until delivery_date) for non-delivered items.
 */
export function ProcurementLeadTimeRisk({ isArabic }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("procurement_items")
        .select("id, boq_item_number, description, delivery_date, order_date, lead_time_days, status, priority, estimated_cost, quantity")
        .eq("user_id", user.id)
        .neq("status", "delivered")
        .not("delivery_date", "is", null)
        .limit(500);
      setItems((data as Item[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const analysis = useMemo(() => {
    const today = new Date();
    const enriched = items
      .map((i) => {
        const due = i.delivery_date ? parseISO(i.delivery_date) : null;
        if (!due) return null;
        const daysLeft = differenceInDays(due, today);
        const lead = i.lead_time_days || 0;
        const buffer = daysLeft - lead;
        let risk: "critical" | "high" | "medium" | "ok";
        if (daysLeft < 0) risk = "critical";
        else if (buffer < 0) risk = "high";
        else if (buffer < 7) risk = "medium";
        else risk = "ok";
        return { ...i, daysLeft, buffer, risk };
      })
      .filter(Boolean) as (Item & { daysLeft: number; buffer: number; risk: string })[];

    const critical = enriched.filter((e) => e.risk === "critical");
    const high = enriched.filter((e) => e.risk === "high");
    const medium = enriched.filter((e) => e.risk === "medium");
    const atRisk = [...critical, ...high, ...medium].sort((a, b) => a.daysLeft - b.daysLeft);

    return { total: enriched.length, critical, high, medium, atRisk: atRisk.slice(0, 10) };
  }, [items]);

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  if (analysis.total === 0) return null;

  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-600" />
          {isArabic ? "مخاطر مهل التوريد" : "Lead-Time Risk"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {analysis.atRisk.length}/{analysis.total} {isArabic ? "في خطر" : "at risk"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PackageX className="w-3.5 h-3.5 text-red-600" />
              {isArabic ? "متأخر" : "Overdue"}
            </div>
            <p className="text-lg font-bold tabular-nums">{analysis.critical.length}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {isArabic ? "غير كافي" : "Insufficient"}
            </div>
            <p className="text-lg font-bold tabular-nums">{analysis.high.length}</p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {isArabic ? "ضيق" : "Tight"}
            </div>
            <p className="text-lg font-bold tabular-nums">{analysis.medium.length}</p>
          </div>
        </div>

        {analysis.atRisk.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 p-3 rounded-md bg-emerald-500/5">
            <CheckCircle2 className="w-4 h-4" />
            {isArabic ? "جميع الطلبات ضمن المهل الزمنية الآمنة" : "All orders within safe lead-time window"}
          </div>
        ) : (
          <div className="space-y-1.5">
            {analysis.atRisk.map((i) => {
              const color =
                i.risk === "critical" ? "text-red-600 bg-red-500/5 border-red-500/30"
                : i.risk === "high" ? "text-amber-600 bg-amber-500/5 border-amber-500/30"
                : "text-blue-600 bg-blue-500/5 border-blue-500/30";
              const label =
                i.daysLeft < 0
                  ? (isArabic ? `متأخر ${Math.abs(i.daysLeft)}ي` : `${Math.abs(i.daysLeft)}d late`)
                  : (isArabic ? `${i.daysLeft}ي متبقي` : `${i.daysLeft}d left`);
              return (
                <div key={i.id} className={`flex items-center gap-2 p-2 rounded-md border ${color}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">
                      #{i.boq_item_number} · {i.description || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isArabic ? "مهلة" : "Lead"}: {i.lead_time_days || 0}{isArabic ? "ي" : "d"}
                      {i.estimated_cost ? ` · ${fmt.format(Number(i.estimated_cost))}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${color} border-0`}>
                    {label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
