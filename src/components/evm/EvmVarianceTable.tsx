import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEvmSnapshot } from "@/hooks/useEvmSnapshot";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { DataTable, Column } from "@/components/ui-ext/DataTable";
import { Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  currency?: string;
}

type Row = {
  category: string;
  bac: number;
  ev: number;
  ac: number;
  cv: number;
  vacPct: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/**
 * Per-category variance breakdown. EV/AC are pro-rated using the project's
 * overall %complete and CPI from progress_history — no fabricated per-item data.
 */
export function EvmVarianceTable({ projectId, currency = "SAR" }: Props) {
  const { isArabic } = useLanguage();
  const evm = useEvmSnapshot(projectId);

  const { data, isLoading } = useQuery({
    queryKey: ["evm-variance", projectId, evm.data?.percentComplete, evm.data?.cpi],
    enabled: !!projectId && !!evm.data,
    queryFn: async (): Promise<Row[]> => {
      const { data: items } = await (supabase as any)
        .from("project_items")
        .select("category,total_price")
        .eq("project_id", projectId);

      const buckets = new Map<string, number>();
      (items ?? []).forEach((r: any) => {
        const key = r.category || (isArabic ? "غير مصنف" : "Uncategorized");
        buckets.set(key, (buckets.get(key) ?? 0) + (Number(r.total_price) || 0));
      });

      const pct = (evm.data?.percentComplete ?? 0) / 100;
      const cpi = evm.data?.cpi ?? null;

      const rows: Row[] = [];
      buckets.forEach((bac, category) => {
        const ev = bac * pct;
        const ac = cpi && cpi > 0 ? ev / cpi : 0;
        const cv = ev - ac;
        const eac = cpi && cpi > 0 ? bac / cpi : bac;
        const vacPct = bac > 0 ? ((bac - eac) / bac) * 100 : 0;
        rows.push({ category, bac, ev, ac, cv, vacPct });
      });

      return rows.sort((a, b) => b.bac - a.bac);
    },
  });

  const columns: Column<Row>[] = [
    { key: "category", header: isArabic ? "الفئة" : "Category", accessor: (r) => r.category },
    { key: "bac", header: "BAC", accessor: (r) => r.bac, cell: (r) => `${currency} ${fmt(r.bac)}`, align: "right" },
    { key: "ev", header: "EV", accessor: (r) => r.ev, cell: (r) => `${currency} ${fmt(r.ev)}`, align: "right" },
    { key: "ac", header: "AC", accessor: (r) => r.ac, cell: (r) => `${currency} ${fmt(r.ac)}`, align: "right" },
    {
      key: "cv",
      header: "CV",
      accessor: (r) => r.cv,
      align: "right",
      cell: (r) => (
        <span className={r.cv >= 0 ? "text-emerald-600" : "text-red-600"}>
          {currency} {fmt(r.cv)}
        </span>
      ),
    },
    {
      key: "vacPct",
      header: "VAC %",
      accessor: (r) => r.vacPct,
      align: "right",
      cell: (r) => (
        <span className={r.vacPct >= 0 ? "text-emerald-600" : "text-red-600"}>
          {r.vacPct.toFixed(1)}%
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {isArabic ? "تحليل الانحراف حسب الفئة" : "Variance Analysis by Category"}
        </h3>
        {isLoading || evm.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            rowKey={(r) => r.category}
            pageSize={10}
            searchable={false}
            emptyMessage={isArabic ? "لا توجد بيانات" : "No data"}
          />
        )}
      </CardContent>
    </Card>
  );
}
