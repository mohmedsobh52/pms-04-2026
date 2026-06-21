import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUpDown, ChevronDown, Download, Search, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface BulkAction<TData> {
  label: string;
  icon?: React.ReactNode;
  onClick: (rows: TData[]) => void | Promise<void>;
  variant?: "default" | "destructive";
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Optional storage key persists column visibility + sorting */
  storageKey?: string;
  /** Show global search input */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Enable row selection checkboxes */
  selectable?: boolean;
  bulkActions?: BulkAction<TData>[];
  /** Excel export. When omitted, button is hidden. */
  onExport?: (rows: TData[]) => void;
  /** Render a card per row on screens below md. When omitted, falls back to horizontal scroll. */
  mobileCard?: (row: TData) => React.ReactNode;
  /** When > threshold, switch to virtualized rendering. Default 200. */
  virtualizeThreshold?: number;
  /** Sticky header (default true) */
  stickyHeader?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  /** Show built-in pagination footer (default true) */
  pagination?: boolean;
  pageSize?: number;
}

function loadPersisted<T>(key: string | undefined, fallback: T): T {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`dt:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string | undefined, value: T) {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`dt:${key}`, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  storageKey,
  searchable = true,
  searchPlaceholder = "Search…",
  selectable = false,
  bulkActions,
  onExport,
  mobileCard,
  virtualizeThreshold = 200,
  stickyHeader = true,
  emptyState,
  className,
  pagination = true,
  pageSize = 25,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>(() =>
    loadPersisted(storageKey ? `${storageKey}:sort` : undefined, [] as SortingState),
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    loadPersisted(storageKey ? `${storageKey}:cols` : undefined, {} as VisibilityState),
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  React.useEffect(() => persist(storageKey ? `${storageKey}:sort` : undefined, sorting), [sorting, storageKey]);
  React.useEffect(
    () => persist(storageKey ? `${storageKey}:cols` : undefined, columnVisibility),
    [columnVisibility, storageKey],
  );

  const allColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!selectable) return columns;
    const selectCol: ColumnDef<TData, TValue> = {
      id: "__select__",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    };
    return [selectCol, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, columnVisibility, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    initialState: { pagination: { pageSize } },
    enableRowSelection: selectable,
  });

  const rows = table.getRowModel().rows;
  const shouldVirtualize = !pagination && rows.length > virtualizeThreshold;

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 12,
    enabled: shouldVirtualize,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const selectedCount = selectedRows.length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="ps-9"
              aria-label="Search table"
            />
          </div>
        )}

        {selectable && selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1">
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            {bulkActions.map((a, i) => (
              <Button
                key={i}
                size="sm"
                variant={a.variant === "destructive" ? "destructive" : "secondary"}
                onClick={() => a.onClick(selectedRows)}
              >
                {a.icon}
                <span className="ms-1">{a.label}</span>
              </Button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setRowSelection({})}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="ms-auto flex items-center gap-2">
          {onExport && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExport(table.getFilteredRowModel().rows.map((r) => r.original))}
            >
              <Download className="me-1 h-4 w-4" />
              Export
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label="Toggle columns">
                <Settings2 className="me-1 h-4 w-4" />
                Columns
                <ChevronDown className="ms-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    className="capitalize"
                  >
                    {String(col.columnDef.header ?? col.id)}
                  </DropdownMenuCheckboxItem>
                ))}
              {storageKey && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setColumnVisibility({});
                      setSorting([]);
                    }}
                  >
                    Reset view
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile card fallback */}
      {mobileCard && (
        <div className="md:hidden space-y-2">
          {rows.length === 0 ? (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              {emptyState ?? "No results"}
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-md border bg-card p-3">
                {mobileCard(row.original)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Desktop table */}
      <div
        ref={scrollRef}
        className={cn(
          "relative rounded-md border bg-card",
          mobileCard && "hidden md:block",
          shouldVirtualize ? "max-h-[70vh] overflow-auto" : "overflow-x-auto",
        )}
      >
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                          aria-label={`Sort by ${String(header.column.columnDef.header ?? header.id)}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center text-muted-foreground">
                  {emptyState ?? "No results"}
                </TableCell>
              </TableRow>
            ) : shouldVirtualize ? (
              <>
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} aria-hidden />
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = rows[vi.index];
                  return (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                <tr
                  style={{
                    height:
                      virtualizer.getTotalSize() -
                      (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  }}
                  aria-hidden
                />
              </>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{" "}
            of {table.getFilteredRowModel().rows.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ColumnDef } from "@tanstack/react-table";
