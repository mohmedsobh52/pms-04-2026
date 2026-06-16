import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronRight, Clock, CheckCircle2, XCircle } from "lucide-react";

interface Row {
  id: string;
  name: string;
  supplier_name: string | null;
  total_amount: number | null;
  currency: string | null;
  status: string | null;
  quotation_date: string | null;
}

export function QuotationsStatusWidget() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("price_quotations")
        .select("id,name,supplier_name,total_amount,currency,status,quotation_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const fmt = (n: number | null, c?: string | null) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: c === "USD" ? "USD" : "SAR",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const counts = {
    pending: rows.filter((r) => (r.status || "pending") === "pending").length,
    analyzed: rows.filter((r) => r.status === "analyzed" || r.status === "completed").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };
  const recent = rows.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {isArabic ? "حالة عروض الأسعار" : "Quotations Status"}
          </span>
          <Link to="/quotations" className="text-xs text-muted-foreground hover:text-primary flex items-center">
            {isArabic ? "الكل" : "All"} <ChevronRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <div className="text-lg font-bold">{counts.pending}</div>
                <div className="text-[10px] text-muted-foreground">{isArabic ? "قيد المراجعة" : "Pending"}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <div className="text-lg font-bold">{counts.analyzed}</div>
                <div className="text-[10px] text-muted-foreground">{isArabic ? "محللة" : "Analyzed"}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <XCircle className="h-4 w-4 mx-auto mb-1 text-destructive" />
                <div className="text-lg font-bold">{counts.rejected}</div>
                <div className="text-[10px] text-muted-foreground">{isArabic ? "مرفوضة" : "Rejected"}</div>
              </div>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                {isArabic ? "لا توجد عروض" : "No quotations"}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-xs rounded border px-2 py-1.5 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.supplier_name || r.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{r.name}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono">{fmt(r.total_amount, r.currency)}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {r.status || "pending"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
