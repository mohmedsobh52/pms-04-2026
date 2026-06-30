import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Save, GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { deriveTotals } from "@/lib/cost-analysis/derive-totals";

interface CostRow {
  name: string;
  costPerUnit: number;
  dailyProductivity: number;
  dailyRent: number;
}

interface Props {
  items: CostRow[];
  wastePct: number;
  adminPct: number;
  taxPct: number;
  currency: string;
}

interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  wastePct: number;
  adminPct: number;
  taxPct: number;
  rentDeltaPct: number;
  productivityDeltaPct: number;
  grandTotal: number;
  itemsCount: number;
}

const SCENARIOS_KEY = "cost_analysis_scenarios_v1";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function applyDeltas(
  items: CostRow[],
  rentDeltaPct: number,
  productivityDeltaPct: number,
): CostRow[] {
  return items.map((it) => {
    const rent = it.dailyRent * (1 + rentDeltaPct / 100);
    const prod = it.dailyProductivity * (1 + productivityDeltaPct / 100);
    const cost = prod > 0 ? rent / prod : it.costPerUnit;
    return { ...it, dailyRent: rent, dailyProductivity: prod, costPerUnit: cost };
  });
}

export function SensitivityScenarios({ items, wastePct, adminPct, taxPct, currency }: Props) {
  const [rentDelta, setRentDelta] = useState(0);
  const [prodDelta, setProdDelta] = useState(0);
  const [wasteOverride, setWasteOverride] = useState<number>(wastePct);
  const [adminOverride, setAdminOverride] = useState<number>(adminPct);
  const [taxOverride, setTaxOverride] = useState<number>(taxPct);
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    try {
      const raw = localStorage.getItem(SCENARIOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [scenarioName, setScenarioName] = useState("");

  useEffect(() => {
    setWasteOverride(wastePct);
  }, [wastePct]);
  useEffect(() => {
    setAdminOverride(adminPct);
  }, [adminPct]);
  useEffect(() => {
    setTaxOverride(taxPct);
  }, [taxPct]);

  // Baseline totals (no deltas, original overrides)
  const baseline = useMemo(
    () => deriveTotals(items, { wastePct, adminPct, taxPct }),
    [items, wastePct, adminPct, taxPct],
  );

  // Live "what-if" totals
  const whatIf = useMemo(() => {
    const adjusted = applyDeltas(items, rentDelta, prodDelta);
    return deriveTotals(adjusted, {
      wastePct: wasteOverride,
      adminPct: adminOverride,
      taxPct: taxOverride,
    });
  }, [items, rentDelta, prodDelta, wasteOverride, adminOverride, taxOverride]);

  const diff = whatIf.grandTotal - baseline.grandTotal;
  const diffPct = baseline.grandTotal > 0 ? (diff / baseline.grandTotal) * 100 : 0;

  // One-variable tornado: shift each lever ±10% and measure impact
  const tornado = useMemo(() => {
    const step = 10;
    const measure = (overrides: {
      rent?: number;
      prod?: number;
      waste?: number;
      admin?: number;
      tax?: number;
    }) => {
      const adjusted = applyDeltas(items, overrides.rent ?? 0, overrides.prod ?? 0);
      return deriveTotals(adjusted, {
        wastePct: overrides.waste ?? wastePct,
        adminPct: overrides.admin ?? adminPct,
        taxPct: overrides.tax ?? taxPct,
      }).grandTotal;
    };
    const base = baseline.grandTotal;
    const levers = [
      {
        key: "rent",
        label: `إيجار يومي ±${step}%`,
        low: measure({ rent: -step }),
        high: measure({ rent: step }),
      },
      {
        key: "prod",
        label: `إنتاجية ±${step}%`,
        low: measure({ prod: -step }),
        high: measure({ prod: step }),
      },
      {
        key: "waste",
        label: `هالك ±${step}%`,
        low: measure({ waste: Math.max(0, wastePct - step) }),
        high: measure({ waste: wastePct + step }),
      },
      {
        key: "admin",
        label: `إداري ±${step}%`,
        low: measure({ admin: Math.max(0, adminPct - step) }),
        high: measure({ admin: adminPct + step }),
      },
      {
        key: "tax",
        label: `ضريبة ±${step}%`,
        low: measure({ tax: Math.max(0, taxPct - step) }),
        high: measure({ tax: taxPct + step }),
      },
    ].map((l) => ({
      ...l,
      lowDiff: l.low - base,
      highDiff: l.high - base,
      range: Math.abs(l.high - l.low),
    }));
    levers.sort((a, b) => b.range - a.range);
    const maxRange = levers[0]?.range || 1;
    return { levers, maxRange, base };
  }, [items, baseline.grandTotal, wastePct, adminPct, taxPct]);

  const persistScenarios = (next: Scenario[]) => {
    setScenarios(next);
    try {
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next));
    } catch {}
  };

  const saveScenario = () => {
    const name = scenarioName.trim() || `سيناريو ${scenarios.length + 1}`;
    const s: Scenario = {
      id: `sc_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      wastePct: wasteOverride,
      adminPct: adminOverride,
      taxPct: taxOverride,
      rentDeltaPct: rentDelta,
      productivityDeltaPct: prodDelta,
      grandTotal: whatIf.grandTotal,
      itemsCount: items.length,
    };
    persistScenarios([s, ...scenarios].slice(0, 12));
    setScenarioName("");
    toast.success("تم حفظ السيناريو");
  };

  const removeScenario = (id: string) => {
    persistScenarios(scenarios.filter((s) => s.id !== id));
  };

  const reset = () => {
    setRentDelta(0);
    setProdDelta(0);
    setWasteOverride(wastePct);
    setAdminOverride(adminPct);
    setTaxOverride(taxPct);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          تحليل الحساسية والسيناريوهات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="whatif">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
            <TabsTrigger value="whatif" className="text-xs">ماذا لو</TabsTrigger>
            <TabsTrigger value="tornado" className="text-xs">تورنادو</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">
              السيناريوهات ({scenarios.length})
            </TabsTrigger>
          </TabsList>

          {/* What-If */}
          <TabsContent value="whatif" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">تغيير الإيجار اليومي</Label>
                    <Badge variant="outline" className="text-xs font-mono">
                      {rentDelta >= 0 ? "+" : ""}
                      {rentDelta}%
                    </Badge>
                  </div>
                  <Slider
                    value={[rentDelta]}
                    onValueChange={([v]) => setRentDelta(v)}
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">تغيير الإنتاجية</Label>
                    <Badge variant="outline" className="text-xs font-mono">
                      {prodDelta >= 0 ? "+" : ""}
                      {prodDelta}%
                    </Badge>
                  </div>
                  <Slider
                    value={[prodDelta]}
                    onValueChange={([v]) => setProdDelta(v)}
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">هالك %</Label>
                  <Input
                    type="number"
                    value={wasteOverride}
                    onChange={(e) => setWasteOverride(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">إداري %</Label>
                  <Input
                    type="number"
                    value={adminOverride}
                    onChange={(e) => setAdminOverride(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">ضريبة %</Label>
                  <Input
                    type="number"
                    value={taxOverride}
                    onChange={(e) => setTaxOverride(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-md border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">الإجمالي الأساسي</p>
                <p className="font-mono font-bold text-sm">
                  {fmt(baseline.grandTotal)} {currency}
                </p>
              </div>
              <div className="p-3 rounded-md border border-primary/30 bg-primary/5">
                <p className="text-xs text-muted-foreground">إجمالي ماذا لو</p>
                <p className="font-mono font-bold text-sm text-primary">
                  {fmt(whatIf.grandTotal)} {currency}
                </p>
              </div>
              <div
                className={`p-3 rounded-md border ${
                  diff >= 0
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
              >
                <p className="text-xs text-muted-foreground">الفرق</p>
                <p
                  className={`font-mono font-bold text-sm flex items-center gap-1 ${
                    diff >= 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {diff >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {fmt(diff)} ({diffPct.toFixed(1)}%)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <Input
                placeholder="اسم السيناريو"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="h-8 max-w-xs text-sm"
              />
              <Button size="sm" onClick={saveScenario} className="h-8">
                <Save className="w-3.5 h-3.5 ml-1" />
                حفظ كسيناريو
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} className="h-8">
                إعادة ضبط
              </Button>
            </div>
          </TabsContent>

          {/* Tornado */}
          <TabsContent value="tornado" className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              تأثير تغيير كل عامل بمقدار ±10% على الإجمالي. الأعرض = الأكثر حساسية.
            </p>
            {tornado.levers.map((l) => {
              const lowWidth = (Math.abs(l.lowDiff) / tornado.maxRange) * 100;
              const highWidth = (Math.abs(l.highDiff) / tornado.maxRange) * 100;
              return (
                <div key={l.key} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{l.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {fmt(l.range)} {currency}
                    </span>
                  </div>
                  <div className="flex items-center h-5 rounded overflow-hidden bg-muted/40">
                    <div className="flex-1 flex justify-end">
                      <div
                        className="h-full bg-emerald-500/60 flex items-center justify-end px-1 text-[10px] text-white font-mono"
                        style={{ width: `${lowWidth}%` }}
                      >
                        {l.lowDiff !== 0 && fmt(l.lowDiff)}
                      </div>
                    </div>
                    <div className="w-px h-full bg-border" />
                    <div className="flex-1">
                      <div
                        className="h-full bg-red-500/60 flex items-center px-1 text-[10px] text-white font-mono"
                        style={{ width: `${highWidth}%` }}
                      >
                        {l.highDiff !== 0 && `+${fmt(l.highDiff)}`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Scenarios */}
          <TabsContent value="scenarios">
            {scenarios.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                لا توجد سيناريوهات محفوظة. استخدم تبويب "ماذا لو" لإضافة سيناريو.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">الاسم</TableHead>
                      <TableHead className="text-xs text-center">إيجار%</TableHead>
                      <TableHead className="text-xs text-center">إنتاجية%</TableHead>
                      <TableHead className="text-xs text-center">هالك</TableHead>
                      <TableHead className="text-xs text-center">إداري</TableHead>
                      <TableHead className="text-xs text-center">ضريبة</TableHead>
                      <TableHead className="text-xs text-right">الإجمالي</TableHead>
                      <TableHead className="text-xs text-right">vs أساسي</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/30">
                      <TableCell className="text-xs font-bold">الأساسي الحالي</TableCell>
                      <TableCell className="text-center text-xs">0</TableCell>
                      <TableCell className="text-center text-xs">0</TableCell>
                      <TableCell className="text-center text-xs">{wastePct}</TableCell>
                      <TableCell className="text-center text-xs">{adminPct}</TableCell>
                      <TableCell className="text-center text-xs">{taxPct}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmt(baseline.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right text-xs">—</TableCell>
                      <TableCell />
                    </TableRow>
                    {scenarios.map((s) => {
                      const d = s.grandTotal - baseline.grandTotal;
                      const dp =
                        baseline.grandTotal > 0 ? (d / baseline.grandTotal) * 100 : 0;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-medium">{s.name}</TableCell>
                          <TableCell className="text-center text-xs">{s.rentDeltaPct}</TableCell>
                          <TableCell className="text-center text-xs">
                            {s.productivityDeltaPct}
                          </TableCell>
                          <TableCell className="text-center text-xs">{s.wastePct}</TableCell>
                          <TableCell className="text-center text-xs">{s.adminPct}</TableCell>
                          <TableCell className="text-center text-xs">{s.taxPct}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {fmt(s.grandTotal)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs ${
                              d >= 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {d >= 0 ? "+" : ""}
                            {fmt(d)} ({dp.toFixed(1)}%)
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => removeScenario(s.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
