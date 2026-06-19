import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Download, Wallet, Activity } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ReferenceLine,
} from "recharts";
import * as XLSX from "xlsx";

type DistMode = "linear" | "scurve" | "front" | "back";

interface Props {
  isArabic: boolean;
  startDate: string;     // yyyy-mm-dd
  endDate: string;       // yyyy-mm-dd
  totalValue: number;
  currency?: string | null;
  projectName?: string | null;
  projectId?: string | null;
}

function weightsFor(mode: DistMode, n: number): number[] {
  if (n <= 0) return [];
  if (mode === "linear") return new Array(n).fill(1 / n);
  if (mode === "front") {
    const arr = Array.from({ length: n }, (_, i) => n - i);
    const s = arr.reduce((a, b) => a + b, 0);
    return arr.map((v) => v / s);
  }
  if (mode === "back") {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    const s = arr.reduce((a, b) => a + b, 0);
    return arr.map((v) => v / s);
  }
  const arr = Array.from({ length: n }, (_, i) => {
    const x = (i + 0.5) / n;
    const k = 10;
    const e = Math.exp(-k * (x - 0.5));
    return (k * e) / Math.pow(1 + e, 2);
  });
  const s = arr.reduce((a, b) => a + b, 0);
  return arr.map((v) => v / s);
}

function monthsBetween(start: Date, end: Date): { label: string; year: number; month: number; key: string }[] {
  const out: { label: string; year: number; month: number; key: string }[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= last) {
    out.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export default function CashFlowPanel({
  isArabic, startDate, endDate, totalValue, currency, projectName, projectId,
}: Props) {
  const [mode, setMode] = useState<DistMode>("scurve");

  // EVM inputs (persisted per project)
  const storageKey = projectId ? `cc:evm:${projectId}` : null;
  const [dataDate, setDataDate] = useState<string>("");
  const [acStr, setAcStr] = useState<string>("");
  const [pctStr, setPctStr] = useState<string>("");

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const j = JSON.parse(raw);
        setDataDate(j.dataDate || "");
        setAcStr(j.ac ?? "");
        setPctStr(j.pct ?? "");
      } else {
        setDataDate(""); setAcStr(""); setPctStr("");
      }
    } catch { /* noop */ }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ dataDate, ac: acStr, pct: pctStr }));
  }, [storageKey, dataDate, acStr, pctStr]);

  const data = useMemo(() => {
    if (!startDate || !endDate || !totalValue || totalValue <= 0) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return null;
    const months = monthsBetween(s, e);
    if (months.length === 0) return null;
    const w = weightsFor(mode, months.length);
    let cum = 0;
    const rows = months.map((m, i) => {
      const monthly = totalValue * w[i];
      cum += monthly;
      return { ...m, monthly, cumulative: cum, pct: w[i] * 100 };
    });
    return { rows, totalMonths: months.length };
  }, [startDate, endDate, totalValue, mode]);

  // EVM calculations
  const evm = useMemo(() => {
    if (!data) return null;
    const BAC = totalValue;
    // resolve data date -> month index
    let idx = -1;
    if (dataDate) {
      const dd = new Date(dataDate);
      if (!isNaN(dd.getTime())) {
        const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
        idx = data.rows.findIndex((r) => r.key === key);
        if (idx < 0) {
          // fallback: nearest within range
          if (dd < new Date(startDate)) idx = 0;
          else if (dd > new Date(endDate)) idx = data.rows.length - 1;
        }
      }
    }
    if (idx < 0) idx = Math.floor(data.rows.length / 2);
    const PV = data.rows[idx]?.cumulative || 0;
    const pctNum = Math.max(0, Math.min(100, parseFloat(pctStr) || 0));
    const EV = (pctNum / 100) * BAC;
    const AC = Math.max(0, parseFloat(acStr) || 0);
    const CV = EV - AC;
    const SV = EV - PV;
    const CPI = AC > 0 ? EV / AC : 0;
    const SPI = PV > 0 ? EV / PV : 0;
    const EAC = CPI > 0 ? BAC / CPI : 0;
    const ETC = Math.max(0, EAC - AC);
    const VAC = BAC - EAC;
    return { BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC, idx, pct: pctNum, dataMonth: data.rows[idx]?.label };
  }, [data, dataDate, acStr, pctStr, totalValue, startDate, endDate]);

  // Chart data extended with PV/EV/AC overlays
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.rows.map((r, i) => {
      const row: any = { ...r, pv: r.cumulative };
      if (evm) {
        if (i <= evm.idx) {
          // EV linearly distributed across months up to data date based on pct progress
          row.ev = (evm.EV * (i + 1)) / (evm.idx + 1);
          row.ac = (evm.AC * (i + 1)) / (evm.idx + 1);
        }
      }
      return row;
    });
  }, [data, evm]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-EG" : "en-US", { maximumFractionDigits: 0 }).format(n || 0);

  const cur = currency || (isArabic ? "ج.م" : "EGP");

  const handleExport = () => {
    if (!data) return;
    const rows = data.rows.map((r, i) => ({
      [isArabic ? "م" : "#"]: i + 1,
      [isArabic ? "الشهر" : "Month"]: r.label,
      [isArabic ? "النسبة %" : "Weight %"]: Number(r.pct.toFixed(2)),
      [isArabic ? "الصرف الشهري" : "Monthly"]: Math.round(r.monthly),
      [isArabic ? "التراكمي (PV)" : "Cumulative (PV)"]: Math.round(r.cumulative),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CashFlow");
    if (evm) {
      const evmRows = [
        { Metric: "BAC", Value: Math.round(evm.BAC) },
        { Metric: "PV",  Value: Math.round(evm.PV) },
        { Metric: "EV",  Value: Math.round(evm.EV) },
        { Metric: "AC",  Value: Math.round(evm.AC) },
        { Metric: "CV (EV-AC)", Value: Math.round(evm.CV) },
        { Metric: "SV (EV-PV)", Value: Math.round(evm.SV) },
        { Metric: "CPI", Value: Number(evm.CPI.toFixed(3)) },
        { Metric: "SPI", Value: Number(evm.SPI.toFixed(3)) },
        { Metric: "EAC", Value: Math.round(evm.EAC) },
        { Metric: "ETC", Value: Math.round(evm.ETC) },
        { Metric: "VAC", Value: Math.round(evm.VAC) },
      ];
      const ws2 = XLSX.utils.json_to_sheet(evmRows);
      XLSX.utils.book_append_sheet(wb, ws2, "EVM");
    }
    XLSX.writeFile(wb, `${projectName || "project"}-cashflow.xlsx`);
  };

  const kpiClass = (good: boolean) =>
    good ? "text-emerald-600" : "text-rose-600";

  return (
    <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            {isArabic ? "التدفق النقدي + EVM" : "Cash Flow + EVM"}
            {data && (
              <Badge variant="outline" className="text-xs">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {data.totalMonths} {isArabic ? "شهر" : "months"}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">
              {isArabic ? "نوع التوزيع:" : "Distribution:"}
            </Label>
            <Select value={mode} onValueChange={(v) => setMode(v as DistMode)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">{isArabic ? "خطي" : "Linear"}</SelectItem>
                <SelectItem value="scurve">{isArabic ? "منحنى S" : "S-Curve"}</SelectItem>
                <SelectItem value="front">{isArabic ? "مُحمَّل مقدمًا" : "Front-loaded"}</SelectItem>
                <SelectItem value="back">{isArabic ? "مُحمَّل مؤخرًا" : "Back-loaded"}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport} disabled={!data}>
              <Download className="h-3.5 w-3.5" />
              {isArabic ? "تصدير" : "Export"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!data ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {isArabic
              ? "أدخل تاريخ البداية، تاريخ النهاية، وقيمة المشروع لعرض التدفق النقدي."
              : "Enter start date, end date, and project value to view cash flow."}
          </div>
        ) : (
          <>
            {/* EVM Inputs */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {isArabic ? "مدخلات EVM (إدارة القيمة المكتسبة)" : "EVM Inputs"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "تاريخ المتابعة (Data Date)" : "Data Date"}
                  </Label>
                  <Input
                    type="text"
                    placeholder="yyyy-mm-dd"
                    value={dataDate}
                    onChange={(e) => setDataDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "التكلفة الفعلية (AC)" : "Actual Cost (AC)"}
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={acStr}
                    onChange={(e) => setAcStr(e.target.value)}
                    className="h-8 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "نسبة الإنجاز % (لحساب EV)" : "% Complete (for EV)"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    inputMode="decimal"
                    placeholder="0"
                    value={pctStr}
                    onChange={(e) => setPctStr(e.target.value)}
                    className="h-8 text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isArabic ? "BAC إجمالي الموازنة" : "BAC"}
                </div>
                <div className="text-base font-bold text-emerald-600 tabular-nums">
                  {fmt(totalValue)} {cur}
                </div>
              </div>
              <div className="rounded-lg border bg-blue-500/5 border-blue-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isArabic ? "PV حتى تاريخ المتابعة" : "PV @ Data Date"}
                </div>
                <div className="text-base font-bold text-blue-600 tabular-nums">
                  {fmt(evm?.PV || 0)} {cur}
                </div>
              </div>
              <div className="rounded-lg border bg-amber-500/5 border-amber-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  EV ({isArabic ? "القيمة المكتسبة" : "Earned"})
                </div>
                <div className="text-base font-bold text-amber-600 tabular-nums">
                  {fmt(evm?.EV || 0)} {cur}
                </div>
              </div>
              <div className="rounded-lg border bg-violet-500/5 border-violet-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  AC ({isArabic ? "التكلفة الفعلية" : "Actual Cost"})
                </div>
                <div className="text-base font-bold text-violet-600 tabular-nums">
                  {fmt(evm?.AC || 0)} {cur}
                </div>
              </div>
            </div>

            {/* EVM Metrics */}
            {evm && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">CV</div>
                  <div className={`text-sm font-bold tabular-nums ${kpiClass(evm.CV >= 0)}`}>{fmt(evm.CV)}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">SV</div>
                  <div className={`text-sm font-bold tabular-nums ${kpiClass(evm.SV >= 0)}`}>{fmt(evm.SV)}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">CPI</div>
                  <div className={`text-sm font-bold tabular-nums ${kpiClass(evm.CPI >= 1)}`}>{evm.CPI.toFixed(2)}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">SPI</div>
                  <div className={`text-sm font-bold tabular-nums ${kpiClass(evm.SPI >= 1)}`}>{evm.SPI.toFixed(2)}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">EAC</div>
                  <div className="text-sm font-bold tabular-nums">{fmt(evm.EAC)}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">ETC</div>
                  <div className="text-sm font-bold tabular-nums">{fmt(evm.ETC)}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">VAC</div>
                  <div className={`text-sm font-bold tabular-nums ${kpiClass(evm.VAC >= 0)}`}>{fmt(evm.VAC)}</div>
                </div>
              </div>
            )}

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => fmt(Number(v))} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(Number(v))} />
                  <RTooltip
                    formatter={(value: any, name: any) => [`${fmt(Number(value))} ${cur}`, name]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="monthly"
                    name={isArabic ? "صرف شهري" : "Monthly"}
                    fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.55} />
                  <Line yAxisId="right" type="monotone" dataKey="pv"
                    name={isArabic ? "PV المخطط" : "PV (Planned)"}
                    stroke="hsl(217 91% 60%)" strokeWidth={2.5}
                    dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  {evm && evm.EV > 0 && (
                    <Line yAxisId="right" type="monotone" dataKey="ev"
                      name={isArabic ? "EV المكتسب" : "EV (Earned)"}
                      stroke="hsl(38 92% 50%)" strokeWidth={2.5}
                      dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                  )}
                  {evm && evm.AC > 0 && (
                    <Line yAxisId="right" type="monotone" dataKey="ac"
                      name={isArabic ? "AC الفعلي" : "AC (Actual)"}
                      stroke="hsl(262 83% 58%)" strokeWidth={2.5} strokeDasharray="5 4"
                      dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                  )}
                  {evm && evm.dataMonth && (
                    <ReferenceLine yAxisId="right" x={evm.dataMonth}
                      stroke="hsl(var(--destructive))" strokeDasharray="3 3"
                      label={{ value: isArabic ? "تاريخ المتابعة" : "Data Date", position: "top", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto max-h-[320px] border rounded-lg">
              <Table>
                <TableHeader className="bg-muted/80 backdrop-blur sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-28">{isArabic ? "الشهر" : "Month"}</TableHead>
                    <TableHead className="w-24 text-right">{isArabic ? "النسبة %" : "Weight %"}</TableHead>
                    <TableHead className="w-32 text-right">{isArabic ? "صرف شهري" : "Monthly"}</TableHead>
                    <TableHead className="w-32 text-right">PV</TableHead>
                    <TableHead className="w-24 text-right">{isArabic ? "نسبة إنجاز" : "% Done"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={i} className={`even:bg-muted/20 ${evm && i === evm.idx ? "bg-destructive/10" : ""}`}>
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.pct.toFixed(2)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.monthly)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-primary">{fmt(r.cumulative)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {((r.cumulative / totalValue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
