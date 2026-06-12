import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Wallet, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format, parseISO, startOfMonth, addMonths, isBefore } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string | null;
}

/**
 * 6-month forward cash-flow forecast based on contract_payments.
 * Splits by status: paid / pending / overdue.
 */
export function CashFlowForecast() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const horizon = addMonths(new Date(), 6).toISOString().slice(0, 10);
      const past = addMonths(new Date(), -1).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("contract_payments")
        .select("id, contract_id, amount, due_date, payment_date, status")
        .eq("user_id", user.id)
        .gte("due_date", past)
        .lte("due_date", horizon)
        .order("due_date", { ascending: true });
      setPayments((data as Payment[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const { chartData, totals } = useMemo(() => {
    const now = new Date();
    const buckets = new Map<string, { month: string; paid: number; pending: number; overdue: number }>();
    for (let i = 0; i < 7; i++) {
      const d = startOfMonth(addMonths(now, i - 1));
      const key = format(d, "yyyy-MM");
      buckets.set(key, {
        month: format(d, "MMM yyyy", { locale: isArabic ? ar : enUS }),
        paid: 0,
        pending: 0,
        overdue: 0,
      });
    }
    let paid = 0, pending = 0, overdue = 0;
    payments.forEach((p) => {
      const due = parseISO(p.due_date);
      const key = format(startOfMonth(due), "yyyy-MM");
      const b = buckets.get(key);
      if (!b) return;
      const amt = Number(p.amount) || 0;
      const isPaid = p.status === "paid" || !!p.payment_date;
      const isOverdue = !isPaid && isBefore(due, now);
      if (isPaid) { b.paid += amt; paid += amt; }
      else if (isOverdue) { b.overdue += amt; overdue += amt; }
      else { b.pending += amt; pending += amt; }
    });
    return {
      chartData: Array.from(buckets.values()),
      totals: { paid, pending, overdue },
    };
  }, [payments, isArabic]);

  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          {isArabic ? "توقعات التدفق النقدي (6 أشهر)" : "Cash Flow Forecast (6 months)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isArabic ? "لا توجد دفعات مجدولة" : "No scheduled payments"}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {isArabic ? "مدفوع" : "Paid"}
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt.format(totals.paid)}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {isArabic ? "مستحق" : "Pending"}
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt.format(totals.pending)}</p>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  {isArabic ? "متأخر" : "Overdue"}
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt.format(totals.overdue)}</p>
                {totals.overdue > 0 && (
                  <Badge variant="destructive" className="text-[10px] mt-1">
                    {isArabic ? "يحتاج إجراء" : "Action needed"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => fmt.format(v)} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card) / 0.95)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt.format(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="paid" stackId="a" fill="hsl(142 71% 45%)"
                    name={isArabic ? "مدفوع" : "Paid"} />
                  <Bar dataKey="pending" stackId="a" fill="hsl(38 92% 50%)"
                    name={isArabic ? "مستحق" : "Pending"} />
                  <Bar dataKey="overdue" stackId="a" fill="hsl(0 84% 60%)"
                    name={isArabic ? "متأخر" : "Overdue"} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
