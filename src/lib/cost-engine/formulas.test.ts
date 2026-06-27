import { describe, it, expect } from "vitest";
import { computeRow, round2 } from "./formulas";

describe("cost-engine formulas", () => {
  it("rounds to 2 decimals", () => {
    expect(round2(2.34567)).toBe(2.35);
    expect(round2(1.234)).toBe(1.23);
    expect(round2(Number.NaN)).toBe(0);
  });

  it("computes unitCost = dailyCost / productivity", () => {
    const r = computeRow({ dailyCost: 1000, productivity: 50 });
    expect(r.unitCost).toBe(20);
  });

  it("flags zero productivity without throwing", () => {
    const r = computeRow({ dailyCost: 1000, productivity: 0 });
    expect(r.unitCost).toBeNull();
    expect(r.warnings).toContain("productivity_zero");
  });

  it("computes workingDays and itemCost when quantity given", () => {
    const r = computeRow({ dailyCost: 800, productivity: 40, quantity: 200 });
    expect(r.workingDays).toBe(5);
    expect(r.unitCost).toBe(20);
    expect(r.itemCost).toBe(4000);
  });

  it("applies waste percentage", () => {
    const r = computeRow({ dailyCost: 800, productivity: 40, quantity: 200, wastePct: 10 });
    expect(r.wasteAdjustedItemCost).toBe(4400);
  });

  it("warns on out-of-range waste and negative inputs", () => {
    const r = computeRow({ dailyCost: -1, productivity: -1, quantity: 10, wastePct: 150 });
    expect(r.warnings).toEqual(
      expect.arrayContaining(["waste_pct_out_of_range", "daily_cost_negative", "productivity_negative"]),
    );
  });
});
