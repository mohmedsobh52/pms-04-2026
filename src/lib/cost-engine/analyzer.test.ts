import { describe, it, expect } from "vitest";
import { analyzeRows, buildProjectInsights, buildSuggestions, type AnalyzerRow } from "./analyzer";

const baseRows: AnalyzerRow[] = [
  { id: "a", name: "A", dailyCost: 1000, productivity: 50, quantity: 100, wastePct: 5, group: "g1" },
  { id: "b", name: "B", dailyCost: 1000, productivity: 50, quantity: 100, wastePct: 5, group: "g1" },
  { id: "c", name: "C", dailyCost: 1000, productivity: 50, quantity: 100, wastePct: 5, group: "g1" },
  // outlier: unit cost 60 vs peer 20 → +200% deviation
  { id: "d", name: "D", dailyCost: 3000, productivity: 50, quantity: 100, wastePct: 5, group: "g1" },
];

describe("analyzer.analyzeRows", () => {
  it("flags outlier as anomaly and high risk", () => {
    const out = analyzeRows(baseRows);
    const outlier = out.find((r) => r.id === "d")!;
    expect(outlier.isAnomaly).toBe(true);
    expect(outlier.deviationPct).toBeGreaterThan(20);
    expect(outlier.risk).toBe("high");
  });

  it("keeps in-line rows as low risk", () => {
    const out = analyzeRows(baseRows);
    expect(out.find((r) => r.id === "a")!.risk).toBe("low");
  });
});

describe("analyzer.buildProjectInsights", () => {
  it("produces 3 scenarios and totals", () => {
    const analyses = analyzeRows(baseRows);
    const ins = buildProjectInsights(baseRows, analyses);
    expect(ins.scenarios).toHaveLength(3);
    expect(ins.totalWithWaste).toBeGreaterThan(ins.totalSubtotal - 1);
    expect(ins.dataQuality.completenessPct).toBeGreaterThan(0);
  });
});

describe("analyzer.buildSuggestions", () => {
  it("suggests a dailyCost cap for outliers", () => {
    const analyses = analyzeRows(baseRows);
    const sugs = buildSuggestions(baseRows, analyses);
    const costSug = sugs.find((s) => s.rowId === "d" && s.field === "dailyCost");
    expect(costSug).toBeDefined();
    expect(costSug!.suggestedValue).toBeLessThan(3000);
  });
});
