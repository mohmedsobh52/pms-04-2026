// Statistical analyzer for cost rows + project-level insights.
// 100% deterministic (no AI calls) — meets "no hallucination" rule.

import { computeRow, round2 } from "./formulas";

export interface AnalyzerRow {
  id: string;
  name: string;
  dailyCost: number;
  productivity: number;
  quantity?: number | null;
  wastePct?: number | null;
  /** Optional grouping key for benchmarks (e.g. category/unit) */
  group?: string | null;
}

export type RiskLevel = "low" | "medium" | "high";

export interface RowAnalysis {
  id: string;
  unitCost: number | null;
  itemCost: number | null;
  wasteAdjustedItemCost: number | null;
  /** Z-score of unitCost vs peer group */
  unitCostZ: number;
  /** Z-score of productivity vs peer group */
  productivityZ: number;
  /** Anomaly = abs(unitCost % deviation from group median) > 20 */
  deviationPct: number;
  isAnomaly: boolean;
  risk: RiskLevel;
  /** Suggested productivity range (p25..p75 of peers) */
  suggestedProductivity: { min: number; max: number; median: number } | null;
  warnings: string[];
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function quantile(arr: number[], q: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}
function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

export function analyzeRows(rows: AnalyzerRow[]): RowAnalysis[] {
  // Group rows for peer benchmarks
  const groups = new Map<string, AnalyzerRow[]>();
  rows.forEach((r) => {
    const key = r.group || "__all__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });

  // Pre-compute group stats
  const groupStats = new Map<
    string,
    {
      unitCosts: number[];
      productivities: number[];
      medianUnit: number;
      meanUnit: number;
      sdUnit: number;
      medianProd: number;
      meanProd: number;
      sdProd: number;
      p25Prod: number;
      p75Prod: number;
    }
  >();
  groups.forEach((rs, key) => {
    const units = rs
      .map((r) => computeRow({ dailyCost: r.dailyCost, productivity: r.productivity }).unitCost)
      .filter((v): v is number => v != null && v > 0);
    const prods = rs.map((r) => Number(r.productivity) || 0).filter((v) => v > 0);
    groupStats.set(key, {
      unitCosts: units,
      productivities: prods,
      medianUnit: median(units),
      meanUnit: mean(units),
      sdUnit: stddev(units),
      medianProd: median(prods),
      meanProd: mean(prods),
      sdProd: stddev(prods),
      p25Prod: quantile(prods, 0.25),
      p75Prod: quantile(prods, 0.75),
    });
  });

  return rows.map((r) => {
    const cr = computeRow({
      dailyCost: r.dailyCost,
      productivity: r.productivity,
      quantity: r.quantity ?? null,
      wastePct: r.wastePct ?? null,
    });
    const gs = groupStats.get(r.group || "__all__")!;
    const unitCost = cr.unitCost ?? 0;
    const prod = Number(r.productivity) || 0;

    const unitZ = gs.sdUnit > 0 ? (unitCost - gs.meanUnit) / gs.sdUnit : 0;
    const prodZ = gs.sdProd > 0 ? (prod - gs.meanProd) / gs.sdProd : 0;

    const deviationPct =
      gs.medianUnit > 0 ? round2(((unitCost - gs.medianUnit) / gs.medianUnit) * 100) : 0;
    const isAnomaly = Math.abs(deviationPct) > 20;

    let risk: RiskLevel = "low";
    const wastePct = Number(r.wastePct) || 0;
    const score =
      (Math.abs(unitZ) >= 2 ? 2 : Math.abs(unitZ) >= 1 ? 1 : 0) +
      (Math.abs(prodZ) >= 2 ? 2 : Math.abs(prodZ) >= 1 ? 1 : 0) +
      (wastePct > 15 ? 2 : wastePct > 8 ? 1 : 0) +
      (isAnomaly ? 1 : 0);
    if (score >= 4) risk = "high";
    else if (score >= 2) risk = "medium";

    const suggestedProductivity =
      gs.productivities.length >= 3
        ? { min: round2(gs.p25Prod), max: round2(gs.p75Prod), median: round2(gs.medianProd) }
        : null;

    return {
      id: r.id,
      unitCost: cr.unitCost,
      itemCost: cr.itemCost,
      wasteAdjustedItemCost: cr.wasteAdjustedItemCost,
      unitCostZ: round2(unitZ),
      productivityZ: round2(prodZ),
      deviationPct,
      isAnomaly,
      risk,
      suggestedProductivity,
      warnings: cr.warnings,
    };
  });
}

// ---------- Project-level insights ----------

export interface ProjectScenario {
  label: "optimistic" | "realistic" | "pessimistic";
  costMultiplier: number;
  totalCost: number;
  delta: number;
  deltaPct: number;
}

export interface DataQuality {
  completenessPct: number;
  accuracyConfidencePct: number;
  anomalyDensityPct: number;
  warnings: string[];
}

export interface OptimizationAction {
  type: "high_cost_anomaly" | "merge_duplicates" | "remove_low_impact" | "improve_productivity";
  rowIds: string[];
  title: string;
  reason: string;
  estimatedSaving: number;
  confidence: number;
}

export interface ProjectInsights {
  totalSubtotal: number;
  totalWithWaste: number;
  scenarios: ProjectScenario[];
  topActions: OptimizationAction[];
  dataQuality: DataQuality;
}

export function buildProjectInsights(
  rows: AnalyzerRow[],
  analyses: RowAnalysis[],
  opts: { defaultWastePct?: number } = {},
): ProjectInsights {
  const defaultWaste = opts.defaultWastePct ?? 0;

  const totalSubtotal = round2(
    analyses.reduce((s, a) => s + (a.itemCost ?? a.unitCost ?? 0), 0),
  );
  const totalWithWaste = round2(
    analyses.reduce(
      (s, a, i) =>
        s +
        (a.wasteAdjustedItemCost ??
          ((a.itemCost ?? a.unitCost ?? 0) * (1 + (rows[i]?.wastePct ?? defaultWaste) / 100))),
      0,
    ),
  );

  // Scenarios — adjust to inflation/efficiency
  const realisticCost = totalWithWaste;
  const scenarios: ProjectScenario[] = [
    { label: "optimistic", costMultiplier: 0.92, totalCost: round2(realisticCost * 0.92), delta: 0, deltaPct: 0 },
    { label: "realistic", costMultiplier: 1.0, totalCost: round2(realisticCost), delta: 0, deltaPct: 0 },
    { label: "pessimistic", costMultiplier: 1.15, totalCost: round2(realisticCost * 1.15), delta: 0, deltaPct: 0 },
  ].map((s) => ({
    ...s,
    delta: round2(s.totalCost - realisticCost),
    deltaPct: round2((s.costMultiplier - 1) * 100),
  }));

  // Data quality
  const total = rows.length;
  const missingFields = rows.reduce((c, r) => {
    let m = 0;
    if (!r.name?.trim()) m++;
    if (!(Number(r.productivity) > 0)) m++;
    if (!(Number(r.dailyCost) > 0)) m++;
    return c + m;
  }, 0);
  const completenessPct = total ? round2(100 - (missingFields / (total * 3)) * 100) : 0;

  const anomalies = analyses.filter((a) => a.isAnomaly).length;
  const anomalyDensityPct = total ? round2((anomalies / total) * 100) : 0;

  const accuracyConfidencePct = round2(
    Math.max(0, Math.min(100, completenessPct - anomalyDensityPct * 0.5)),
  );

  const dqWarnings: string[] = [];
  if (completenessPct < 80) dqWarnings.push("missing_critical_fields");
  if (anomalyDensityPct > 15) dqWarnings.push("excessive_outliers");
  if (total < 5) dqWarnings.push("small_dataset");

  // Top actions
  const actions: OptimizationAction[] = [];

  // 1) High-cost anomalies > +20% deviation
  const highCost = analyses
    .filter((a) => a.deviationPct > 20 && (a.itemCost ?? a.unitCost ?? 0) > 0)
    .sort((a, b) => (b.itemCost ?? b.unitCost ?? 0) - (a.itemCost ?? a.unitCost ?? 0))
    .slice(0, 5);
  if (highCost.length) {
    const saving = round2(
      highCost.reduce((s, a) => {
        const peerCost = (a.unitCost ?? 0) / (1 + a.deviationPct / 100);
        const qtyish = (a.itemCost ?? 0) / (a.unitCost || 1);
        return s + ((a.unitCost ?? 0) - peerCost) * qtyish;
      }, 0),
    );
    actions.push({
      type: "high_cost_anomaly",
      rowIds: highCost.map((h) => h.id),
      title: `${highCost.length} عناصر بسعر أعلى من نظيراتها بنسبة >20%`,
      reason: "أسعار وحدة تتجاوز وسيط المجموعة بفارق كبير",
      estimatedSaving: saving,
      confidence: 78,
    });
  }

  // 2) Low-impact items (<1% of total)
  const lowImpact = analyses.filter(
    (a) => totalSubtotal > 0 && (a.itemCost ?? a.unitCost ?? 0) / totalSubtotal < 0.01,
  );
  if (lowImpact.length >= 3) {
    actions.push({
      type: "remove_low_impact",
      rowIds: lowImpact.map((l) => l.id),
      title: `دمج/إزالة ${lowImpact.length} بنود بأثر <1% من الإجمالي`,
      reason: "تبسيط هيكل التكلفة وتقليل الضوضاء الإدارية",
      estimatedSaving: 0,
      confidence: 65,
    });
  }

  // 3) Productivity improvement
  const underPerf = analyses.filter((a) => a.productivityZ <= -1);
  if (underPerf.length) {
    const saving = round2(
      underPerf.reduce((s, a) => {
        const target = a.suggestedProductivity?.median ?? 0;
        const cur = (a.unitCost ?? 0);
        if (!target || !cur) return s;
        // rough: if productivity raised to median, unitCost drops proportionally
        const peerUnit = cur * (1 + a.productivityZ * 0.1); // gentle
        const qtyish = (a.itemCost ?? 0) / (a.unitCost || 1);
        return s + Math.max(0, cur - peerUnit) * qtyish;
      }, 0),
    );
    actions.push({
      type: "improve_productivity",
      rowIds: underPerf.map((u) => u.id),
      title: `رفع إنتاجية ${underPerf.length} موارد دون أداء النظراء`,
      reason: "إنتاجية اليومية أدنى من وسيط المجموعة بانحراف معياري ≥ 1",
      estimatedSaving: saving,
      confidence: 60,
    });
  }

  return {
    totalSubtotal,
    totalWithWaste,
    scenarios,
    topActions: actions.slice(0, 3),
    dataQuality: { completenessPct, accuracyConfidencePct, anomalyDensityPct, warnings: dqWarnings },
  };
}

// ---------- Suggestions protocol ----------

export type SuggestionStatus = "pending" | "applied" | "ignored";

export interface Suggestion {
  id: string;
  rowId: string;
  field: "productivity" | "dailyCost" | "wastePct";
  currentValue: number;
  suggestedValue: number;
  reason: string;
  confidence: number;
  financialImpact: number; // estimated currency-unit impact (negative = saving)
  status: SuggestionStatus;
}

export function buildSuggestions(rows: AnalyzerRow[], analyses: RowAnalysis[]): Suggestion[] {
  const out: Suggestion[] = [];
  analyses.forEach((a) => {
    const row = rows.find((r) => r.id === a.id);
    if (!row) return;

    // Productivity suggestion
    if (a.suggestedProductivity && a.productivityZ <= -1) {
      const target = a.suggestedProductivity.median;
      if (target > 0 && row.productivity > 0 && target !== row.productivity) {
        const newUnit = row.dailyCost / target;
        const qtyish = (a.itemCost ?? 0) / (a.unitCost || 1);
        const impact = round2(((a.unitCost ?? 0) - newUnit) * qtyish * -1);
        out.push({
          id: `prod-${a.id}`,
          rowId: a.id,
          field: "productivity",
          currentValue: row.productivity,
          suggestedValue: round2(target),
          reason: "إنتاجية أدنى من وسيط المجموعة — رفعها يقلل تكلفة الوحدة",
          confidence: 70,
          financialImpact: impact,
          status: "pending",
        });
      }
    }

    // High-cost anomaly: suggest cap to peer median price/day
    if (a.deviationPct > 20 && a.unitCost && row.productivity > 0) {
      const peerUnit = a.unitCost / (1 + a.deviationPct / 100);
      const suggestedDaily = round2(peerUnit * row.productivity);
      if (suggestedDaily > 0 && suggestedDaily < row.dailyCost) {
        const qtyish = (a.itemCost ?? 0) / (a.unitCost || 1);
        const impact = round2(((a.unitCost ?? 0) - peerUnit) * qtyish * -1);
        out.push({
          id: `cost-${a.id}`,
          rowId: a.id,
          field: "dailyCost",
          currentValue: row.dailyCost,
          suggestedValue: suggestedDaily,
          reason: `سعر الوحدة يتجاوز وسيط المجموعة بنسبة ${a.deviationPct.toFixed(0)}%`,
          confidence: 75,
          financialImpact: impact,
          status: "pending",
        });
      }
    }

    // Waste over benchmark
    const w = Number(row.wastePct) || 0;
    if (w > 10) {
      out.push({
        id: `waste-${a.id}`,
        rowId: a.id,
        field: "wastePct",
        currentValue: w,
        suggestedValue: 8,
        reason: "نسبة الهالك أعلى من المعيار الصناعي (5–10%)",
        confidence: 65,
        financialImpact: round2((a.itemCost ?? 0) * ((w - 8) / 100) * -1),
        status: "pending",
      });
    }
  });
  return out;
}
