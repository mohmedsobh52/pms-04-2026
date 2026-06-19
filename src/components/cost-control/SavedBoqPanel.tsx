import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Search, Download, Database } from "lucide-react";
import * as XLSX from "xlsx";

export interface SavedBoqItem {
  id: string;
  item_number?: string | null;
  description?: string | null;
  unit?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  category?: string | null;
}

interface Props {
  items: SavedBoqItem[];
  isArabic: boolean;
  projectName?: string | null;
}

export default function SavedBoqPanel({ items, isArabic, projectName }: Props) {
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(
      (i) =>
        (i.item_number || "").toLowerCase().includes(t) ||
        (i.description || "").toLowerCase().includes(t) ||
        (i.category || "").toLowerCase().includes(t)
    );
  }, [items, q]);

  const totals = useMemo(() => {
    let qty = 0, total = 0;
    filtered.forEach((i) => {
      qty += Number(i.quantity || 0);
      total += Number(i.total_price || (Number(i.quantity || 0) * Number(i.unit_price || 0)));
    });
    return { qty, total, count: filtered.length };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-EG" : "en-US", { maximumFractionDigits: 2 }).format(n || 0);

  const handleExport = () => {
    const rows = filtered.map((i, idx) => ({
      [isArabic ? "م" : "#"]: idx + 1,
      [isArabic ? "رقم البند" : "Item No"]: i.item_number ?? "",
      [isArabic ? "الوصف" : "Description"]: i.description ?? "",
      [isArabic ? "الوحدة" : "Unit"]: i.unit ?? "",
      [isArabic ? "الكمية" : "Qty"]: Number(i.quantity || 0),
      [isArabic ? "سعر الوحدة" : "Unit Price"]: Number(i.unit_price || 0),
      [isArabic ? "الإجمالي" : "Total"]:
        Number(i.total_price || Number(i.quantity || 0) * Number(i.unit_price || 0)),
      [isArabic ? "التصنيف" : "Category"]: i.category ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BOQ");
    XLSX.writeFile(wb, `${projectName || "project"}-boq.xlsx`);
  };

  if (!items || items.length === 0) return null;

  return (
    <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {isArabic ? "قائمة الكميات المحفوظة (BOQ)" : "Saved BOQ"}
            <Badge variant="outline" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              {items.length} {isArabic ? "بند" : "items"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder={isArabic ? "بحث..." : "Search..."}
                className="h-8 pl-8 w-48"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} className="h-8 gap-1">
              <Download className="h-3.5 w-3.5" />
              {isArabic ? "تصدير" : "Export"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[520px]">
          <Table>
            <TableHeader className="bg-muted/80 backdrop-blur-md sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-28">{isArabic ? "رقم البند" : "Item No"}</TableHead>
                <TableHead className="min-w-[260px]">{isArabic ? "الوصف" : "Description"}</TableHead>
                <TableHead className="w-20 text-center">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                <TableHead className="w-24 text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                <TableHead className="w-28 text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                <TableHead className="w-32 text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                <TableHead className="w-28 text-center">{isArabic ? "التصنيف" : "Category"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((i, idx) => {
                const qty = Number(i.quantity || 0);
                const up = Number(i.unit_price || 0);
                const tot = Number(i.total_price || qty * up);
                return (
                  <TableRow key={i.id} className="hover:bg-primary/5 even:bg-muted/20">
                    <TableCell className="text-center text-muted-foreground">
                      {(safePage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{i.item_number || "-"}</TableCell>
                    <TableCell className="text-sm">{i.description || "-"}</TableCell>
                    <TableCell className="text-center text-xs">{i.unit || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(qty)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(up)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(tot)}</TableCell>
                    <TableCell className="text-center">
                      {i.category ? (
                        <Badge variant="secondary" className="text-[10px]">{i.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t bg-muted/30 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {isArabic ? "عدد البنود:" : "Items:"} <strong className="text-foreground">{totals.count}</strong>
            </span>
            <span className="text-muted-foreground">
              {isArabic ? "إجمالي الكميات:" : "Total Qty:"} <strong className="text-foreground">{fmt(totals.qty)}</strong>
            </span>
            <span className="text-muted-foreground">
              {isArabic ? "إجمالي القيمة:" : "Total Value:"}{" "}
              <strong className="text-primary">{fmt(totals.total)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {isArabic ? "السابق" : "Prev"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {isArabic ? "التالي" : "Next"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
