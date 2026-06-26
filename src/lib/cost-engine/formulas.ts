// Deterministic cost-engine formulas.
// All inputs validated; division by zero returns warning.
// Rounded to 2 decimal places. Numbers in JS are double-precision —
// we use Math.round(x*100)/100 to stabilise display values.

export interface RowInputs {
  /** Cost per day (rent/labor/equipment combined) */
  dailyCost: number;
  /** Output produced per day in the unit of measure */
  productivity: number;
  /** Total quantity required (optional) */
  quantity?: number | null;
  /** Waste percentage 0-100 (optional) */
  wastePct?: number | null;
}

export interface RowResult {
  unitCost: number | null;
  workingDays: number | null;
  itemCost: number | null;
  wasteAdjustedItemCost: number | null;
  warnings: string[];
}

export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function computeRow(inp: RowInputs): RowResult {
  const warnings: string[] = [];
  const daily = Number(inp.dailyCost) || 0;
  const prod = Number(inp.productivity) || 0;
  const qty = inp.quantity == null ? null : Number(inp.quantity) || 0;
  const wastePct = inp.wastePct == null ? 0 : Number(inp.wastePct) || 0;

  let unitCost: number | null = null;
  if (prod <= 0) warnings.push("productivity_zero");
  else unitCost = round2(daily / prod);

  let workingDays: number | null = null;
  if (qty != null && qty > 0) {
    if (prod <= 0) warnings.push("workingdays_zero_productivity");
    else workingDays = round2(qty / prod);
  }

  let itemCost: number | null = null;
  if (unitCost != null && qty != null && qty > 0) {
    itemCost = round2(unitCost * qty);
  }

  let wasteAdjusted: number | null = null;
  if (itemCost != null) {
    wasteAdjusted = round2(itemCost * (1 + wastePct / 100));
  }

  if (wastePct < 0 || wastePct > 100) warnings.push("waste_pct_out_of_range");
  if (daily < 0) warnings.push("daily_cost_negative");
  if (prod < 0) warnings.push("productivity_negative");

  return { unitCost, workingDays, itemCost, wasteAdjustedItemCost: wasteAdjusted, warnings };
}
