import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  isArabic?: boolean;
}

interface Row {
  id: string;
  warranty_type: string | null;
  description: string | null;
  end_date: string | null;
  bond_value: number | null;
  status: string | null;
  contract_id: string;
  contractName?: string;
  daysLeft: number;
}

/**
 * Cross-contract Active Warranties Tracker.
 * Lists active warranties sorted by soonest to expire with a level badge
 * (expired/urgent/soon/active) plus aggregate stats.
 */
export function ActiveWarrantiesTracker({ isArabic }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: warranties } = await supabase
        .from("contract_warranties")
        .select("id,contract_id,warranty_type,description,end_date,bond_value,status")
        .eq("user_id", user.id);

      const ids = Array.from(new Set((warranties || []).map((w: any) => w.contract_id))).filter(Boolean);
      let contractMap = new Map<string, string>();
      if (ids.length) {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id,contractor_name,contract_number")
          .in("id", ids);
        (contracts || []).forEach((c: any) => {
          contractMap.set(c.id, c.contractor_name || c.contract_number || c.id.slice(0, 6));
        });
      }

      if (!active) return;

      const now = new Date();
      const enriched: Row[] = (warranties || [])
        .map((w: any) => {
          const days = w.end_date ? differenceInDays(parseISO(w.end_date), now) : 9999;
          return {
            ...w,
            contractName: contractMap.get(w.contract_id),
            daysLeft: days,
          } as Row;
        })
        .sort((a, b) => a.daysLeft - b.daysLeft);

      setRows(enriched);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  const totalValue = rows.reduce((s, r) => s + (Number(r.bond_value) || 0), 0);
  const expired = rows.filter((r) => r.daysLeft < 0).length;
  const urgent = rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30).length;
  const active = rows.filter((r) => r.daysLeft > 30).length;

  const fmtMoney = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  const getLevel = (days: number) => {
    if (days < 0) return { variant: "destructive" as const, Icon: ShieldX, label: isArabic ? "منتهي" : "Expired" };
    if (days <= 30) return { variant: "destructive" as const, Icon: ShieldAlert, label: isArabic ? `${days} يوم` : `${days}d` };
    if (days <= 90) return { variant: "secondary" as const, Icon: ShieldAlert, label: isArabic ? `${days} يوم` : `${days}d` };
    return { variant: "outline" as const, Icon: ShieldCheck, label: isArabic ? `${days} يوم` : `${days}d` };
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          {isArabic ? "متابعة الضمانات النشطة" : "Active Warranties Tracker"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {rows.length} {isArabic ? "ضمان" : "warranties"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isArabic ? "لا توجد ضمانات مسجلة" : "No warranties recorded"}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              <Stat label={isArabic ? "نشط" : "Active"} value={active} color="hsl(142 71% 45%)" />
              <Stat label={isArabic ? "≤90 يوم" : "≤90d"} value={rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 90).length - urgent} color="hsl(38 92% 50%)" />
              <Stat label={isArabic ? "≤30 يوم" : "≤30d"} value={urgent} color="hsl(0 84% 60%)" />
              <Stat label={isArabic ? "منتهي" : "Expired"} value={expired} color="hsl(215 16% 55%)" />
            </div>

            <div className="text-xs text-muted-foreground flex items-center justify-between border-t border-border/40 pt-3">
              <span>{isArabic ? "إجمالي قيمة الضمانات" : "Total bond value"}</span>
              <span className="font-bold text-foreground">{fmtMoney.format(totalValue)}</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {rows.slice(0, 12).map((r) => {
                const lvl = getLevel(r.daysLeft);
                const Icon = lvl.Icon;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-border/30 hover:bg-muted/40"
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={{
                        color:
                          r.daysLeft < 0
                            ? "hsl(0 84% 60%)"
                            : r.daysLeft <= 30
                            ? "hsl(0 84% 60%)"
                            : r.daysLeft <= 90
                            ? "hsl(38 92% 50%)"
                            : "hsl(142 71% 45%)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {r.warranty_type || r.description || (isArabic ? "ضمان" : "Warranty")}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.contractName} {r.end_date ? `· ${r.end_date}` : ""}
                      </p>
                    </div>
                    {r.bond_value ? (
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums hidden sm:inline">
                        {fmtMoney.format(Number(r.bond_value))}
                      </span>
                    ) : null}
                    <Badge variant={lvl.variant} className="text-[10px] shrink-0">
                      {lvl.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-2 text-center">
      <p className="text-xl font-bold leading-tight" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
