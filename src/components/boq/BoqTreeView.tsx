import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  currency?: string;
}

type Item = {
  id: string;
  item_number: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

type Node = {
  key: string;
  segments: string[];
  label: string;
  item?: Item;
  children: Map<string, Node>;
  total: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

function buildTree(items: Item[]): Node {
  const root: Node = { key: "", segments: [], label: "root", children: new Map(), total: 0 };
  for (const it of items) {
    if (!it.item_number) continue;
    const segs = it.item_number.split(/[.\-/]/).filter(Boolean);
    let cur = root;
    segs.forEach((s, i) => {
      const k = segs.slice(0, i + 1).join(".");
      let child = cur.children.get(k);
      if (!child) {
        child = {
          key: k,
          segments: segs.slice(0, i + 1),
          label: i === segs.length - 1 ? it.description || k : k,
          children: new Map(),
          total: 0,
        };
        cur.children.set(k, child);
      }
      if (i === segs.length - 1) child.item = it;
      cur = child;
    });
  }
  // sum totals
  const sum = (n: Node): number => {
    if (n.item) n.total = Number(n.item.total_price) || 0;
    n.children.forEach((c) => (n.total += sum(c)));
    return n.total;
  };
  root.children.forEach((c) => sum(c));
  return root;
}

function NodeRow({
  node,
  depth,
  q,
  currency,
}: {
  node: Node;
  depth: number;
  q: string;
  currency: string;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.size > 0;
  const visible =
    !q ||
    node.label.toLowerCase().includes(q.toLowerCase()) ||
    node.key.toLowerCase().includes(q.toLowerCase()) ||
    Array.from(node.children.values()).some((c) =>
      [c.label, c.key].join(" ").toLowerCase().includes(q.toLowerCase())
    );
  if (!visible) return null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 border-b border-border/50 hover:bg-muted/40 text-sm",
          depth === 0 && "font-semibold bg-muted/30"
        )}
        style={{ paddingInlineStart: 8 + depth * 18 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-5 h-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-5 inline-block shrink-0" />
        )}
        <span className="font-mono text-xs text-muted-foreground shrink-0 w-20 truncate">
          {node.key}
        </span>
        <span className="flex-1 truncate">{node.label}</span>
        {node.item?.quantity != null && (
          <span className="text-xs text-muted-foreground tabular-nums w-20 text-end shrink-0">
            {fmt(Number(node.item.quantity))} {node.item.unit ?? ""}
          </span>
        )}
        <span className="text-sm font-semibold tabular-nums w-28 text-end shrink-0">
          {currency} {fmt(node.total)}
        </span>
      </div>
      {open &&
        hasChildren &&
        Array.from(node.children.values())
          .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
          .map((c) => <NodeRow key={c.key} node={c} depth={depth + 1} q={q} currency={currency} />)}
    </>
  );
}

/**
 * Hierarchical BOQ tree derived from project_items.item_number segments.
 * Aggregates total_price up the hierarchy. No mock data.
 */
export function BoqTreeView({ projectId, currency = "SAR" }: Props) {
  const { isArabic } = useLanguage();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["boq-tree", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Item[]> => {
      const { data } = await (supabase as any)
        .from("project_items")
        .select("id,item_number,description,unit,quantity,unit_price,total_price")
        .eq("project_id", projectId)
        .order("item_number", { ascending: true });
      return (data ?? []) as Item[];
    },
  });

  const tree = useMemo(() => (data ? buildTree(data) : null), [data]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold">
            {isArabic ? "هيكل BOQ الهرمي" : "BOQ Hierarchy"}
          </h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isArabic ? "بحث…" : "Search…"}
              className="ps-8 h-8 text-xs"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !tree || tree.children.size === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {isArabic ? "لا توجد بنود" : "No items"}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden max-h-[60vh] overflow-y-auto">
            {Array.from(tree.children.values())
              .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
              .map((n) => (
                <NodeRow key={n.key} node={n} depth={0} q={q} currency={currency} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
