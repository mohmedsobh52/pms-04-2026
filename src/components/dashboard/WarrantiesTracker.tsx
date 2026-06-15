import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

interface Warranty {
  id: string;
  warranty_type: string;
  end_date: string | null;
  bond_value: number | null;
  status: string;
}

export function WarrantiesTracker() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Warranty[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("contract_warranties")
        .select("id, warranty_type, end_date, bond_value, status")
        .eq("user_id", user.id)
        .neq("status", "released")
        .neq("status", "expired")
        .not("end_date", "is", null)
        .order("end_date", { ascending: true })
        .limit(6);
      setRows((data as Warranty[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => {
    const today = new Date();
    let active = 0, soon = 0, expired = 0, value = 0;
    rows.forEach((w) => {
      if (!w.end_date) return;
      const d = differenceInDays(parseISO(w.end_date), today);
      if (d < 0) expired++;
      else if (d <= 60) soon++;
      else active++;
      value += Number(w.bond_value || 0);
    });
    return { active, soon, expired, value };
  }, [rows]);

  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {isArabic ? "متابعة الضمانات" : "Warranties Tracker"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {rows.length} {isArabic ? "ضمان" : "items"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <div className="text-xs text-muted-foreground">{isArabic ? "نشط" : "Active"}</div>
            <p className="text-lg font-bold text-emerald-600">{totals.active}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
            <div className="text-xs text-muted-foreground">{isArabic ? "قريب الانتهاء" : "Expiring"}</div>
            <p className="text-lg font-bold text-amber-600">{totals.soon}</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5">
            <div className="text-xs text-muted-foreground">{isArabic ? "منتهٍ" : "Expired"}</div>
            <p className="text-lg font-bold text-red-600">{totals.expired}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex justify-between border-t pt-2">
          <span>{isArabic ? "إجمالي قيمة السندات" : "Total bond value"}</span>
          <span className="font-semibold text-foreground">{fmt.format(totals.value)} SAR</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            {isArabic ? "لا توجد ضمانات نشطة" : "No active warranties"}
          </p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((w) => {
              const days = w.end_date ? differenceInDays(parseISO(w.end_date), new Date()) : 0;
              const color = days < 0 ? "text-red-600" : days <= 60 ? "text-amber-600" : "text-emerald-600";
              return (
                <Link
                  key={w.id}
                  to="/contracts"
                  className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{w.warranty_type}</p>
                    <p className={`text-[11px] ${color}`}>
                      {days < 0
                        ? (isArabic ? `منتهٍ منذ ${Math.abs(days)}ي` : `${Math.abs(days)}d ago`)
                        : (isArabic ? `${days} يوم متبقي` : `${days}d left`)}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
