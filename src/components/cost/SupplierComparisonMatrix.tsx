import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function SupplierComparisonMatrix({ projectId }: { projectId?: string }) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const q = supabase.from("price_quotations").select("*").order("created_at", { ascending: false });
      const { data } = projectId ? await q.eq("project_id", projectId) : await q;
      setQuotes(data ?? []);
      setLoading(false);
    })();
  }, [projectId]);

  const { items, suppliers, matrix, bestPerItem } = useMemo(() => {
    const itemSet = new Set<string>();
    const supSet = new Set<string>();
    const m: Record<string, Record<string, number>> = {};
    quotes.forEach((q: any) => {
      const item = q.item_description || q.item_code || "—";
      const sup = q.supplier_name || q.supplier_id || "Unknown";
      itemSet.add(item); supSet.add(sup);
      m[item] = m[item] ?? {};
      const p = Number(q.unit_price ?? q.total_price ?? 0);
      if (!m[item][sup] || p < m[item][sup]) m[item][sup] = p;
    });
    const items = [...itemSet];
    const suppliers = [...supSet];
    const bestPerItem: Record<string, string> = {};
    items.forEach((it) => {
      let bestSup = ""; let bestPrice = Infinity;
      suppliers.forEach((s) => { const p = m[it]?.[s]; if (p && p < bestPrice) { bestPrice = p; bestSup = s; } });
      bestPerItem[it] = bestSup;
    });
    return { items, suppliers, matrix: m, bestPerItem };
  }, [quotes]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Supplier Comparison Matrix</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">No quotations to compare yet.</p>}
        {items.length > 0 && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Item</TableHead>
              {suppliers.map((s) => <TableHead key={s} className="text-right">{s}</TableHead>)}
              <TableHead className="text-right">Best</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it}>
                  <TableCell className="font-medium max-w-xs truncate">{it}</TableCell>
                  {suppliers.map((s) => {
                    const p = matrix[it]?.[s];
                    const isBest = bestPerItem[it] === s && p != null;
                    return (
                      <TableCell key={s} className={`text-right tabular-nums ${isBest ? "font-semibold text-emerald-600" : ""}`}>
                        {p != null ? p.toFixed(2) : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right"><Badge variant="outline">{bestPerItem[it] || "—"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
