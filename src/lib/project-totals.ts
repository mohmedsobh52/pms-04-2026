// Utilities for computing project value totals from BOQ items.
// Extracted for unit testing.

export interface RawItem {
  project_id?: string;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total_price?: number | string | null;
}

export interface ProjectTotals {
  count: number;
  total: number;
}

/**
 * Compute the line value of a BOQ item.
 * Uses total_price when present, else quantity * unit_price.
 */
export function computeLineValue(item: RawItem): number {
  const tp = Number(item.total_price) || 0;
  if (tp > 0) return tp;
  const qty = Number(item.quantity) || 0;
  const up = Number(item.unit_price) || 0;
  return qty * up;
}

/**
 * Aggregate project_items rows into per-project totals.
 */
export function aggregateProjectItems(rows: RawItem[]): Map<string, ProjectTotals> {
  const map = new Map<string, ProjectTotals>();
  for (const r of rows) {
    if (!r.project_id) continue;
    const cur = map.get(r.project_id) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += computeLineValue(r);
    map.set(r.project_id, cur);
  }
  return map;
}

/**
 * Resolve the best available total value for a project, preferring live
 * project_items, then analysis_data items, then summary total.
 * Returns 0 only when no source has data.
 */
export function resolveProjectTotal(opts: {
  liveTotal?: number;
  analysisItems?: RawItem[];
  summaryTotal?: number;
}): number {
  const live = Number(opts.liveTotal) || 0;
  if (live > 0) return live;
  const items = opts.analysisItems || [];
  const computed = items.reduce((s, it) => s + computeLineValue(it), 0);
  if (computed > 0) return computed;
  return Number(opts.summaryTotal) || 0;
}

/**
 * Format a monetary value with thousands separators and a currency suffix.
 * Uses arabic locale digits when isArabic=true.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = "SAR",
  isArabic: boolean = false,
): string {
  const n = Number(value) || 0;
  const locale = isArabic ? "ar-SA" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(n));
  return `${formatted} ${currency || "SAR"}`;
}
