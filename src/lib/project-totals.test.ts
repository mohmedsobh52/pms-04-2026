import { describe, it, expect } from "vitest";
import {
  computeLineValue,
  aggregateProjectItems,
  resolveProjectTotal,
  formatCurrency,
} from "./project-totals";

describe("computeLineValue", () => {
  it("uses total_price when > 0", () => {
    expect(computeLineValue({ total_price: 500, quantity: 10, unit_price: 5 })).toBe(500);
  });

  it("falls back to quantity * unit_price when total_price is 0", () => {
    expect(computeLineValue({ total_price: 0, quantity: 10, unit_price: 5 })).toBe(50);
  });

  it("handles string numeric values", () => {
    expect(computeLineValue({ quantity: "4" as any, unit_price: "2.5" as any })).toBe(10);
  });

  it("returns 0 when nothing is set", () => {
    expect(computeLineValue({})).toBe(0);
  });
});

describe("aggregateProjectItems", () => {
  it("sums totals per project_id", () => {
    const rows = [
      { project_id: "a", total_price: 100 },
      { project_id: "a", quantity: 2, unit_price: 50 },
      { project_id: "b", total_price: 999 },
    ];
    const map = aggregateProjectItems(rows);
    expect(map.get("a")).toEqual({ count: 2, total: 200 });
    expect(map.get("b")).toEqual({ count: 1, total: 999 });
  });

  it("ignores rows without project_id", () => {
    const map = aggregateProjectItems([{ total_price: 100 } as any]);
    expect(map.size).toBe(0);
  });
});

describe("resolveProjectTotal", () => {
  it("prefers live total from project_items", () => {
    const total = resolveProjectTotal({
      liveTotal: 5000,
      analysisItems: [{ total_price: 1 }],
      summaryTotal: 999,
    });
    expect(total).toBe(5000);
  });

  it("falls back to analysis items when live is 0", () => {
    const total = resolveProjectTotal({
      liveTotal: 0,
      analysisItems: [
        { quantity: 10, unit_price: 5 },
        { total_price: 200 },
      ],
      summaryTotal: 999,
    });
    expect(total).toBe(250);
  });

  it("falls back to summary total when nothing else", () => {
    const total = resolveProjectTotal({
      liveTotal: 0,
      analysisItems: [],
      summaryTotal: 1234,
    });
    expect(total).toBe(1234);
  });

  it("simulates the original bug: analysis_data shows 0 but project_items has the real total", () => {
    // This is the exact scenario where the projects page used to show 0 SAR
    // even though project_items had ~493M SAR worth of priced items.
    const analysisItemsAllZero = Array.from({ length: 60 }, () => ({
      quantity: 100,
      unit_price: 0,
      total_price: 0,
    }));
    const liveRows = Array.from({ length: 56 }, (_, i) => ({
      project_id: "p1",
      total_price: 1_000_000 + i,
    }));
    const live = aggregateProjectItems(liveRows);
    const total = resolveProjectTotal({
      liveTotal: live.get("p1")?.total || 0,
      analysisItems: analysisItemsAllZero,
      summaryTotal: 0,
    });
    expect(total).toBeGreaterThan(0);
    expect(total).toBe(liveRows.reduce((s, r) => s + r.total_price, 0));
  });
});

describe("formatCurrency", () => {
  it("adds thousands separators and currency suffix (en)", () => {
    expect(formatCurrency(1234567, "SAR", false)).toBe("1,234,567 SAR");
  });

  it("rounds decimals", () => {
    expect(formatCurrency(1234.7, "SAR", false)).toBe("1,235 SAR");
  });

  it("handles null/undefined safely", () => {
    expect(formatCurrency(null, "SAR", false)).toBe("0 SAR");
    expect(formatCurrency(undefined, undefined as any, false)).toBe("0 SAR");
  });
});
