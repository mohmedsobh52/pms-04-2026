import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, Wallet } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { differenceInCalendarWeeks, parseISO, startOfWeek, addWeeks, format } from "date-fns";

/**
 * 12-week cash outflow forecast: stacks contract payments + procurement spend
 * by week to give a forward-looking liquidity view.
 */
export function CashOutflowForecast() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [procurement, setProcurement] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const today = new Date();
      const horizon = addWeeks(today, 12).toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      const [p, pr] = await Promise.all([
        supabase
          .from("contract_payments")
          .select("amount, due_date, status")
          .eq("user_id", user.id)
          .neq("status", "paid")
          .neq("status", "cancelled")
          .gte("due_date", todayStr)
          .lte("due_date", horizon),
        supabase
          .from("procurement_items")
          .select("estimated_cost, quantity, unit_price, delivery_date, status")
          .eq("user_id", user.id)
          .neq("status", "delivered")
          .gte("delivery_date", todayStr)
          .lte("delivery_date", horizon),
      ]);

      setPayments(p.data || []);
      setProcurement(pr.data || []);
      setLoading(false);
    })();
  }, [user]);

  const data = useMemo(() => {
    const today = startOfWeek(new Date(), { weekStartsOn: 6 });
    const weeks: { week: string; payments: number; procurement: number; total: number }[] = [];
    for (let i = 0; i < 12; i++) {
      weeks.push({
        week: format(addWeeks(today, i), "MM/dd"),
        payments: 0,
        procurement: 0,
        total: 0,
      });
    }

    payments.forEach((p: any) => {
      const w = differenceInCalendarWeeks(parseISO(p.due_date), today, { weekStartsOn: 6 });
      if (w >= 0 && w < 12) weeks[w].payments += Number(p.amount) || 0;
    });

    procurement.forEach((pr: any) => {
      const w = differenceInCalendarWeeks(parseISO(pr.delivery_date), today, { weekStartsOn: 6 });
      if (w >= 0 && w < 12) {
        const cost = Number(pr.estimated_cost) || (Number(pr.quantity) || 0) * (Number(pr.unit_price) || 0);
        weeks[w].procurement += cost;
      }
    });

    weeks.forEach((w) => (w.total = w.payments + w.procurement));
    return weeks;
  }, [payments, procurement]);

  const total = useMemo(() => data.reduce((s, w) => s + w.total, 0), [data]);
  const peak = useMemo(() => data.reduce((m, w) => (w.total > m.total ? w : m), data[0] || { week: "-", total: 0, payments: 0, procurement: 0 }), [data]);
  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-72 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          {isArabic ? "توقعات التدفق النقدي الخارج (12 أسبوع)" : "Cash Outflow Forecast (12 weeks)"}
          <Badge variant="outline" className="ms-auto">
            <Wallet className="w-3 h-3 me-1" />
            {fmt.format(total)} {isArabic ? "ر.س" : "SAR"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border p-2.5">
            <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي 12 أسبوع" : "12-week total"}</p>
            <p className="text-lg font-bold">{fmt.format(total)}</p>
          </div>
          <div className="rounded-md border p-2.5">
            <p className="text-xs text-muted-foreground">{isArabic ? "ذروة الأسبوع" : "Peak week"}</p>
            <p className="text-lg font-bold">{peak?.week} · {fmt.format(peak?.total || 0)}</p>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => fmt.format(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="payments" stackId="a" fill="hsl(var(--primary))" name={isArabic ? "دفعات عقود" : "Contract payments"} />
              <Bar dataKey="procurement" stackId="a" fill="hsl(var(--accent))" name={isArabic ? "مشتريات" : "Procurement"} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
