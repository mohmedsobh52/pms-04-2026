import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function ContractExpiryAlerts() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const horizon = new Date(); horizon.setDate(horizon.getDate() + 90);
      const { data } = await supabase.from("contracts")
        .select("id,contract_number,contract_title,contractor_name,end_date,status,contract_value,currency")
        .lte("end_date", horizon.toISOString())
        .neq("status", "closed")
        .order("end_date", { ascending: true });
      setRows(data ?? []);
    })();
  }, []);

  const bucket = (days: number) => days < 0 ? { label: "Expired", icon: AlertTriangle, variant: "destructive" as const }
    : days <= 30 ? { label: `${days}d left`, icon: AlertTriangle, variant: "destructive" as const }
    : days <= 60 ? { label: `${days}d left`, icon: Clock, variant: "secondary" as const }
    : { label: `${days}d left`, icon: CheckCircle2, variant: "outline" as const };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Expiry Alerts (90 days)</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No contracts expiring soon.</p>}
        <ul className="divide-y">
          {rows.map((c) => {
            const days = Math.floor((new Date(c.end_date).getTime() - Date.now()) / 86400000);
            const b = bucket(days);
            const Icon = b.icon;
            return (
              <li key={c.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.contract_title || c.contract_number}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.contractor_name} · ends {new Date(c.end_date).toLocaleDateString()}</div>
                </div>
                <Badge variant={b.variant} className="gap-1"><Icon className="h-3 w-3" />{b.label}</Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
