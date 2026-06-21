import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function PriceLibraryHistory({ projectId, limit = 50 }: { projectId?: string; limit?: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const q = supabase.from("pricing_history").select("*").order("created_at", { ascending: false }).limit(limit);
      const { data } = projectId ? await q.eq("project_id", projectId) : await q;
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [projectId, limit]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Price Library History</CardTitle></CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No price history recorded.</p>}
        <ul className="divide-y">
          {rows.map((r) => {
            const diff = (Number(r.new_price) || 0) - (Number(r.old_price) || 0);
            const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
            return (
              <li key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.item_description ?? r.item_code ?? "Item"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">{Number(r.old_price ?? 0).toFixed(2)}</span>
                  <Icon className={`h-3 w-3 ${diff > 0 ? "text-destructive" : diff < 0 ? "text-emerald-600" : ""}`} />
                  <span>{Number(r.new_price ?? 0).toFixed(2)}</span>
                  <Badge variant="outline" className="text-xs">{r.currency ?? "USD"}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
