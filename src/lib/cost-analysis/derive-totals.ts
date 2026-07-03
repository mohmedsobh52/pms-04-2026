/**
 * Central cost-analysis totals deriver.
 * Single source of truth shared by the table, KPI grid, charts and Cost Engine.
 */
export interface DeriveItemInput {
  costPerUnit: number;
  dailyProductivity?: number;
  dailyRent?: number;
  name?: string;
}

export interface DeriveOptions {
  wastePct: number;
  adminPct: number;
  taxPct?: number;
}

export interface DerivedTotals {
  itemsCount: number;
  directs: number;
  wasteAmount: number;
  adminAmount: number;
  preTax: number;
  taxAmount: number;
  grandTotal: number;
  avgUnitCost: number;
  completenessPct: number;
  filledItems: number;
  missingItems: number;
  reviewItems: number;
  avgConfidencePct: number;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function deriveTotals(items: DeriveItemInput[], opts: DeriveOptions): DerivedTotals {
  const itemsCount = items.length;
  const directs = items.reduce((s, i) => s + (Number(i.costPerUnit) || 0), 0);
  const waste = directs * ((opts.wastePct || 0) / 100);
  const admin = directs * ((opts.adminPct || 0) / 100);
  const preTax = directs + waste + admin;
  const tax = preTax * ((opts.taxPct || 0) / 100);
  const grand = preTax + tax;

  let filled = 0;
  let review = 0;
  let confSum = 0;
  for (const i of items) {
    const hasName = (i.name || "").trim().length > 0;
    const hasProd = (Number(i.dailyProductivity) || 0) > 0;
    const hasRent = (Number(i.dailyRent) || 0) > 0;
    const hasCost = (Number(i.costPerUnit) || 0) > 0;
    const score = (hasName ? 1 : 0) + (hasProd ? 1 : 0) + (hasRent ? 1 : 0) + (hasCost ? 1 : 0);
    confSum += (score / 4) * 100;
    if (hasName && hasProd && hasRent) filled += 1;
    else if (hasName && !hasCost) review += 1;
    else if (hasName && (!hasProd || !hasRent)) review += 1;
  }
  const completeness = itemsCount === 0 ? 0 : (filled / itemsCount) * 100;
  const avg = itemsCount === 0 ? 0 : directs / itemsCount;
  const avgConf = itemsCount === 0 ? 0 : confSum / itemsCount;

  return {
    itemsCount,
    directs: round2(directs),
    wasteAmount: round2(waste),
    adminAmount: round2(admin),
    preTax: round2(preTax),
    taxAmount: round2(tax),
    grandTotal: round2(grand),
    avgUnitCost: round2(avg),
    completenessPct: round2(completeness),
    filledItems: filled,
    missingItems: itemsCount - filled,
    reviewItems: review,
    avgConfidencePct: round2(avgConf),
  };
}
