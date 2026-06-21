import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, FastForward } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logFinancialAction } from "@/lib/financial-audit";
import { DataTable, type ColumnDef, type BulkAction } from "@/components/data-table/DataTable";

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

type Item = {
  id: string;
  project_id: string | null;
  description: string | null;
  boq_item_number: string | null;
  quantity: number | null;
  unit: string | null;
  status: string;
  created_at: string;
};

async function advanceOne(item: Item) {
  const idx = STAGES.findIndex((s) => s.key === item.status);
  const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
  if (!next || next.key === item.status) return;
  const { error } = await supabase.from("procurement_items").update({ status: next.key }).eq("id", item.id);
  if (error) throw error;
  await logFinancialAction({
    entity_type: "procurement_item", entity_id: item.id, action: "advance",
    project_id: item.project_id ?? undefined,
    before: { status: item.status }, after: { status: next.key },
  });
}

export function ProcurementWorkflow({ projectId }: { projectId?: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["procurement-items", projectId ?? "all"],
    queryFn: async (): Promise<Item[]> => {
      let q = supabase
        .from("procurement_items")
        .select("id,project_id,description,boq_item_number,quantity,unit,status,created_at")
        .order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q;
      return (data ?? []) as Item[];
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["procurement-items"] });

  const advance = async (it: Item) => {
    try {
      await advanceOne(it);
      const next = STAGES[Math.min(STAGES.findIndex((s) => s.key === it.status) + 1, STAGES.length - 1)];
      toast({ title: "Stage advanced", description: `${it.description ?? "Item"} → ${next.label}` });
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
    {
      accessorKey: "boq_item_number",
      header: "BOQ #",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.boq_item_number ?? "—"}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="block max-w-[360px] truncate" title={row.original.description ?? ""}>
          {row.original.description ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => (
        <span className="tabular-nums text-xs">
          {row.original.quantity ?? "—"} {row.original.unit ?? ""}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: "status",
      header: "Stage",
      cell: ({ row }) => {
        const s = STAGES.find((x) => x.key === row.original.status);
        return <Badge>{s?.label ?? row.original.status}</Badge>;
      },
      size: 130,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const idx = STAGES.findIndex((s) => s.key === row.original.status);
        const done = idx === STAGES.length - 1;
        return (
          <Button size="sm" variant="outline" onClick={() => advance(row.original)} disabled={done}>
            {done ? <Check className="h-3 w-3" /> : "Advance"}
          </Button>
        );
      },
      size: 110,
    },
  ], []);

  const bulkActions: BulkAction<Item>[] = [
    {
      label: "Advance all",
      icon: <FastForward className="h-3 w-3" />,
      onClick: async (rows) => {
        setBusy(true);
        try {
          let ok = 0, fail = 0;
          for (const r of rows) {
            try { await advanceOne(r); ok++; } catch { fail++; }
          }
          toast({ title: `Advanced ${ok}`, description: fail ? `${fail} failed` : undefined });
          refresh();
        } finally { setBusy(false); }
      },
    },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Procurement Workflow</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
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

        <DataTable<Item, unknown>
          columns={columns}
          data={items}
          storageKey={`procurement-${projectId ?? "all"}`}
          selectable
          bulkActions={bulkActions}
          searchPlaceholder="Search items…"
          pagination
          pageSize={25}
          emptyState={isLoading ? "Loading…" : "No procurement items."}
        />
        {busy && <p className="text-xs text-muted-foreground">Processing…</p>}
      </CardContent>
    </Card>
  );
}
