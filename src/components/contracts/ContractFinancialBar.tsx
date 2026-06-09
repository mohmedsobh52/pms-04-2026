import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { computeContractFinancials } from "@/lib/contract-alerts";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface Props {
  contractId: string;
  contractValue: number;
  isArabic?: boolean;
  compact?: boolean;
}

export function ContractFinancialBar({ contractId, contractValue, isArabic, compact }: Props) {
  const [stats, setStats] = useState({ totalNet: 0, spentPct: 0, overrun: false, certificatesCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("progress_certificates")
        .select("net_amount, current_work_done")
        .eq("contract_id", contractId);
      if (!active) return;
      const fin = computeContractFinancials(contractValue, data || []);
      setStats(fin);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [contractId, contractValue]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

  const pct = Math.min(100, stats.spentPct);
  const color = stats.overrun ? "bg-destructive" : stats.spentPct > 90 ? "bg-orange-500" : stats.spentPct > 70 ? "bg-amber-500" : "bg-primary";

  if (loading) return <div className="h-2 w-full bg-muted rounded animate-pulse" />;

  return (
    <div className="space-y-1.5">
      {!compact && (
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {isArabic ? "نسبة الصرف" : "Spent"}
          </span>
          <span className="font-semibold">
            {fmt(stats.totalNet)} / {fmt(contractValue)} ({stats.spentPct.toFixed(1)}%)
          </span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{isArabic ? `${stats.certificatesCount} مستخلص` : `${stats.certificatesCount} certificates`}</span>
        {stats.overrun && (
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
            <AlertTriangle className="h-3 w-3" />
            {isArabic ? "تجاوز قيمة العقد" : "Over budget"}
          </Badge>
        )}
      </div>
    </div>
  );
}
