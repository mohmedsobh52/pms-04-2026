import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SubcontractorPayments({ contractorName }: { contractorName?: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      if (!contractorName) { setRows([]); return; }
      const { data: contracts } = await supabase.from("contracts").select("id").eq("contractor_name", contractorName);
      const ids = (contracts ?? []).map((c) => c.id);
      if (ids.length === 0) { setRows([]); return; }
      const { data } = await supabase.from("contract_payments").select("*").in("contract_id", ids).order("due_date", { ascending: false });
      setRows(data ?? []);
    })();
  }, [contractorName]);

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div className="border rounded p-2"><div className="text-xs text-muted-foreground">Total</div><div className="tabular-nums font-medium">{total.toFixed(2)}</div></div>
          <div className="border rounded p-2"><div className="text-xs text-muted-foreground">Paid</div><div className="tabular-nums font-medium">{paid.toFixed(2)}</div></div>
        </div>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
        <ul className="divide-y">
          {rows.map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">#{p.payment_number} · <span className="tabular-nums">{Number(p.amount).toFixed(2)}</span></div>
                <div className="text-xs text-muted-foreground">Due {p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</div>
              </div>
              <Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status ?? "pending"}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
