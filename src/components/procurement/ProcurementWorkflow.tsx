import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight } from "lucide-react";
import { logFinancialAction } from "@/lib/financial-audit";
import { toast } from "@/hooks/use-toast";

const STAGES = [
  { key: "requested", label: "Request" },
  { key: "approved", label: "Approval" },
  { key: "rfq_sent", label: "RFQ" },
  { key: "compared", label: "Comparison" },
  { key: "po_issued", label: "PO" },
  { key: "delivered", label: "Delivery" },
  { key: "invoiced", label: "Invoice" },
  { key: "paid", label: "Payment" },
] as const;

type StageKey = typeof STAGES[number]["key"];

export function ProcurementWorkflow({ projectId }: { projectId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const q = supabase.from("procurement_items").select("*").order("created_at", { ascending: false });
    const { data } = projectId ? await q.eq("project_id", projectId) : await q;
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [projectId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);

  const advance = async (item: any) => {
    const idx = STAGES.findIndex((s) => s.key === item.status);
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    if (!next || next.key === item.status) return;
    const { error } = await supabase.from("procurement_items").update({ status: next.key }).eq("id", item.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await logFinancialAction({
      entity_type: "procurement_item", entity_id: item.id, action: "advance",
      project_id: item.project_id, before: { status: item.status }, after: { status: next.key },
    });
    toast({ title: "Stage advanced", description: `${item.description ?? "Item"} → ${next.label}` });
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Procurement Workflow</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="gap-2">
                <span>{s.label}</span>
                <span className="text-xs opacity-70">{counts[s.key] ?? 0}</span>
              </Badge>
              {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">No procurement items.</p>}
        <ul className="divide-y">
          {items.slice(0, 25).map((it) => {
            const idx = STAGES.findIndex((s) => s.key === it.status);
            const stage = STAGES[idx] ?? { key: it.status, label: it.status };
            const done = idx === STAGES.length - 1;
            return (
              <li key={it.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.description ?? it.boq_item_number}</div>
                  <div className="text-xs text-muted-foreground">Qty {it.quantity ?? "—"} · {it.unit ?? ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{stage.label}</Badge>
                  <Button size="sm" variant="outline" onClick={() => advance(it)} disabled={done}>
                    {done ? <Check className="h-3 w-3" /> : "Advance"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
