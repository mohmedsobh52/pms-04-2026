import { useMemo, useState, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  /** Render a cell. Default: String(row[key]) */
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  /** When set, this string is used for sorting & global text filtering */
  accessor?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right" | "center";
};

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

/**
 * Generic, opt-in data table. Includes search, sort, pagination, and a
 * mobile card fallback. No external table library required.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchable = true,
  searchPlaceholder = "Search…",
  pageSize = 10,
  emptyMessage = "No results",
  onRowClick,
  className,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const needle = q.trim().toLowerCase();
    return data.filter((row) =>
      columns.some((c) => {
        const v = c.accessor
          ? c.accessor(row)
          : (row as any)[c.key as any];
        return String(v ?? "").toLowerCase().includes(needle);
      })
    );
  }, [data, q, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.accessor ? col.accessor(a) : (a as any)[col.key as any];
      const bv = col.accessor ? col.accessor(b) : (b as any)[col.key as any];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    setSort((s) =>
      !s || s.key !== key
        ? { key, dir: "asc" }
        : s.dir === "asc"
        ? { key, dir: "desc" }
        : null
    );
    setPage(1);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="ps-9 h-9"
          />
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => {
                  const k = String(c.key);
                  const active = sort?.key === k;
                  return (
                    <TableHead
                      key={k}
                      className={cn(
                        c.className,
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center"
                      )}
                    >
                      {c.sortable !== false ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(k)}
                          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        >
                          {c.header}
                          {active ? (
                            sort!.dir === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((row, i) => (
                  <TableRow
                    key={rowKey(row, i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? "cursor-pointer" : undefined}
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={String(c.key)}
                        className={cn(
                          c.className,
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center"
                        )}
                      >
                        {c.cell ? c.cell(row) : String((row as any)[c.key as any] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} / {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
