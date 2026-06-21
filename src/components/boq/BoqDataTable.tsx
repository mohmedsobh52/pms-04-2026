import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { DataTable, type ColumnDef } from "@/components/data-table/DataTable";

interface Props {
  projectId: string;
  currency?: string;
}

type Row = {
  id: string;
  item_number: string | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
};

const num = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export function BoqDataTable({ projectId, currency = "SAR" }: Props) {
  const { isArabic } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["boq-flat", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Row[]> => {
      const { data } = await (supabase as any)
        .from("project_items")
        .select("id,item_number,description,unit,quantity,unit_price,total_price,category")
        .eq("project_id", projectId)
        .order("item_number", { ascending: true });
      return (data ?? []) as Row[];
    },
  });

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        accessorKey: "item_number",
        header: isArabic ? "رقم البند" : "Item #",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.item_number ?? "—"}</span>
        ),
        size: 110,
      },
      {
        accessorKey: "description",
        header: isArabic ? "الوصف" : "Description",
        cell: ({ row }) => (
          <span className="block max-w-[480px] truncate" title={row.original.description ?? ""}>
            {row.original.description ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: isArabic ? "الفئة" : "Category",
        cell: ({ row }) =>
          row.original.category ? (
            <Badge variant="secondary" className="font-normal">
              {row.original.category}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 140,
      },
      {
        accessorKey: "unit",
        header: isArabic ? "الوحدة" : "Unit",
        size: 70,
      },
      {
        accessorKey: "quantity",
        header: isArabic ? "الكمية" : "Qty",
        cell: ({ row }) => (
          <span className="tabular-nums">{num(row.original.quantity)}</span>
        ),
        size: 90,
      },
      {
        accessorKey: "unit_price",
        header: isArabic ? "سعر الوحدة" : "Unit Price",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.unit_price == null ? "—" : `${currency} ${num(row.original.unit_price)}`}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: "total_price",
        header: isArabic ? "الإجمالي" : "Total",
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {row.original.total_price == null
              ? "—"
              : `${currency} ${num(row.original.total_price)}`}
          </span>
        ),
        size: 150,
      },
    ],
    [isArabic, currency],
  );

  const onExport = (rows: Row[]) => {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Item: r.item_number,
        Description: r.description,
        Category: r.category,
        Unit: r.unit,
        Quantity: r.quantity,
        UnitPrice: r.unit_price,
        Total: r.total_price,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "BOQ");
    XLSX.writeFile(wb, `BOQ-${projectId}.xlsx`);
  };

  return (
    <Card>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable<Row, unknown>
            columns={columns}
            data={data ?? []}
            storageKey={`boq-${projectId}`}
            searchPlaceholder={isArabic ? "بحث في البنود…" : "Search items…"}
            onExport={onExport}
            pagination={false}
            virtualizeThreshold={100}
            emptyState={isArabic ? "لا توجد بنود" : "No items"}
            mobileCard={(r) => (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{r.item_number}</span>
                  <span className="font-semibold tabular-nums">
                    {currency} {num(r.total_price)}
                  </span>
                </div>
                <div className="truncate">{r.description}</div>
                <div className="text-xs text-muted-foreground">
                  {num(r.quantity)} {r.unit ?? ""} × {num(r.unit_price)}
                </div>
              </div>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
