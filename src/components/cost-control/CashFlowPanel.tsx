import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Calendar as CalendarIcon, Download, Wallet } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
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
}

// Generate weights per month based on mode
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
  // S-curve: logistic-like centered around middle
  const arr = Array.from({ length: n }, (_, i) => {
    const x = (i + 0.5) / n; // 0..1
    // bell shape (derivative of logistic)
    const k = 10;
    const e = Math.exp(-k * (x - 0.5));
    return (k * e) / Math.pow(1 + e, 2);
  });
  const s = arr.reduce((a, b) => a + b, 0);
  return arr.map((v) => v / s);
}

function monthsBetween(start: Date, end: Date): { label: string; year: number; month: number }[] {
  const out: { label: string; year: number; month: number }[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= last) {
    out.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export default function CashFlowPanel({
  isArabic, startDate, endDate, totalValue, currency, projectName,
}: Props) {
  const [mode, setMode] = useState<DistMode>("scurve");

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
      [isArabic ? "التراكمي" : "Cumulative"]: Math.round(r.cumulative),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CashFlow");
    XLSX.writeFile(wb, `${projectName || "project"}-cashflow.xlsx`);
  };

  return (
    <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            {isArabic ? "التدفق النقدي للمشروع" : "Project Cash Flow"}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isArabic ? "إجمالي القيمة" : "Total Value"}
                </div>
                <div className="text-base font-bold text-emerald-600 tabular-nums">
                  {fmt(totalValue)} {cur}
                </div>
              </div>
              <div className="rounded-lg border bg-blue-500/5 border-blue-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isArabic ? "متوسط شهري" : "Avg / Month"}
                </div>
                <div className="text-base font-bold text-blue-600 tabular-nums">
                  {fmt(totalValue / data.totalMonths)} {cur}
                </div>
              </div>
              <div className="rounded-lg border bg-amber-500/5 border-amber-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isArabic ? "عدد الأشهر" : "Months"}
                </div>
                <div className="text-base font-bold text-amber-600 tabular-nums">
                  {data.totalMonths}
                </div>
              </div>
              <div className="rounded-lg border bg-violet-500/5 border-violet-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isArabic ? "أعلى شهر" : "Peak Month"}
                </div>
                <div className="text-base font-bold text-violet-600 tabular-nums">
                  {fmt(Math.max(...data.rows.map((r) => r.monthly)))} {cur}
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.rows} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
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
                    fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative"
                    name={isArabic ? "التراكمي" : "Cumulative"}
                    stroke="hsl(var(--chart-2, 220 70% 50%))" strokeWidth={2.5}
                    dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
                    <TableHead className="w-32 text-right">{isArabic ? "التراكمي" : "Cumulative"}</TableHead>
                    <TableHead className="w-24 text-right">{isArabic ? "نسبة إنجاز" : "% Done"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r, i) => (
                    <TableRow key={i} className="even:bg-muted/20">
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
