import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, ChevronRight, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface PaymentRow {
  id: string;
  contract_id: string | null;
  amount: number | null;
  due_date: string | null;
  status: string | null;
  description?: string | null;
  payment_number?: number | null;
}

export function OverduePaymentsPanel() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [totalOverdue, setTotalOverdue] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("contract_payments")
        .select("id, contract_id, amount, due_date, status, description, payment_number")
        .eq("user_id", user.id)
        .neq("status", "paid")
        .neq("status", "cancelled")
        .order("due_date", { ascending: true })
        .limit(50);

      const today = new Date();
      const overdue = (data || []).filter(
        (p) => p.due_date && differenceInDays(today, parseISO(p.due_date)) > 0
      );
      const sum = overdue.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      setTotalOverdue(sum);
      setRows(overdue.slice(0, 6));
      setLoading(false);
    })();
  }, [user]);

  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          {isArabic ? "دفعات متأخرة" : "Overdue Payments"}
          {rows.length > 0 && (
            <Badge variant="destructive" className="ms-auto">
              {fmt.format(totalOverdue)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isArabic ? "لا توجد دفعات متأخرة" : "No overdue payments"}
          </p>
        ) : (
          rows.map((p) => {
            const days = p.due_date
              ? differenceInDays(new Date(), parseISO(p.due_date))
              : 0;
            return (
              <Link
                key={p.id}
                to={p.contract_id ? `/contracts/${p.contract_id}` : "/contracts"}
                className="flex items-center justify-between gap-3 rounded-md border p-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.description ||
                        (isArabic
                          ? `دفعة #${p.payment_number ?? ""}`
                          : `Payment #${p.payment_number ?? ""}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmt.format(Number(p.amount || 0))} •{" "}
                      {isArabic ? `متأخرة ${days} يوم` : `${days}d overdue`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
