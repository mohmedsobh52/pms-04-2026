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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar as CalendarIcon, Download, Wallet, Activity, AlertTriangle, FileText, RotateCcw, ShieldCheck, ShieldAlert, ShieldX, Lightbulb, Camera, Trash2, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ReferenceLine, LineChart,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DistMode = "linear" | "scurve" | "front" | "back";
type EacMethod = "cpi" | "plan" | "composite" | "atypical";

interface Props {
  isArabic: boolean;
  startDate: string;
  endDate: string;
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

function monthsBetween(start: Date, end: Date) {
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
  const [eacMethod, setEacMethod] = useState<EacMethod>("cpi");
  const [monthFilter, setMonthFilter] = useState<string>("all");

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
        setEacMethod(j.eacMethod || "cpi");
      } else {
        setDataDate(""); setAcStr(""); setPctStr(""); setEacMethod("cpi");
      }
    } catch { /* noop */ }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ dataDate, ac: acStr, pct: pctStr, eacMethod }));
  }, [storageKey, dataDate, acStr, pctStr, eacMethod]);

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

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const hasAc = acStr.trim() !== "";
    const hasPct = pctStr.trim() !== "";
    const hasDate = dataDate.trim() !== "";

    if (!hasDate || !hasAc || !hasPct) {
      errors.push(isArabic
        ? "أكمل جميع مدخلات EVM (تاريخ المتابعة، AC، نسبة الإنجاز) لتفعيل الحسابات."
        : "Enter all EVM inputs (Data Date, AC, % Complete) to enable calculations.");
    }
    const pctNum = parseFloat(pctStr);
    if (hasPct) {
      if (isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
        errors.push(isArabic
          ? "نسبة الإنجاز يجب أن تكون بين 0 و 100."
          : "% Complete must be between 0 and 100.");
      }
    }
    const acNum = parseFloat(acStr);
    if (hasAc) {
      if (isNaN(acNum) || acNum < 0) {
        errors.push(isArabic ? "AC يجب أن تكون قيمة موجبة." : "AC must be a positive number.");
      } else if (totalValue > 0 && acNum > totalValue * 3) {
        warnings.push(isArabic
          ? "AC تتجاوز 3 أضعاف الموازنة — تحقق من القيمة."
          : "AC exceeds 3× the budget — please verify.");
      }
    }
    if (hasDate) {
      const dd = new Date(dataDate);
      if (isNaN(dd.getTime())) {
        errors.push(isArabic ? "تنسيق تاريخ المتابعة غير صحيح." : "Invalid Data Date format.");
      } else if (startDate && endDate) {
        const s = new Date(startDate), e = new Date(endDate);
        if (dd < s || dd > e) {
          warnings.push(isArabic
            ? "تاريخ المتابعة خارج فترة المشروع."
            : "Data Date is outside the project timeframe.");
        }
      }
    }
    if (hasPct && hasAc && totalValue > 0 && pctNum > 5 && acNum === 0) {
      warnings.push(isArabic
        ? "نسبة إنجاز > 0 مع AC = 0 — غير منطقي."
        : "Progress > 0 with AC = 0 — inconsistent.");
    }
    return { errors, warnings, valid: errors.length === 0 };
  }, [acStr, pctStr, dataDate, startDate, endDate, totalValue, isArabic]);

  // EVM calculations
  const evm = useMemo(() => {
    if (!data || !validation.valid) return null;
    const BAC = totalValue;
    let idx = -1;
    if (dataDate) {
      const dd = new Date(dataDate);
      if (!isNaN(dd.getTime())) {
        const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
        idx = data.rows.findIndex((r) => r.key === key);
        if (idx < 0) {
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
    let EAC = 0;
    if (eacMethod === "cpi") {
      EAC = CPI > 0 ? BAC / CPI : 0;
    } else if (eacMethod === "plan") {
      EAC = AC + (BAC - EV);
    } else if (eacMethod === "composite") {
      const denom = CPI * SPI;
      EAC = denom > 0 ? AC + (BAC - EV) / denom : 0;
    } else {
      EAC = CPI > 0 ? AC + (BAC - EV) / CPI : 0;
    }
    const ETC = Math.max(0, EAC - AC);
    const VAC = BAC - EAC;
    // TCPI: efficiency required to finish within BAC or EAC
    const TCPI_BAC = BAC - AC > 0 ? (BAC - EV) / (BAC - AC) : 0;
    const TCPI_EAC = EAC - AC > 0 ? (BAC - EV) / (EAC - AC) : 0;
    // Estimated finish date from SPI: stretch remaining months by 1/SPI
    let finishDate: string | null = null;
    if (SPI > 0 && data.rows[idx]) {
      const remainingMonths = (data.rows.length - 1 - idx) / SPI;
      const dd = new Date(dataDate || endDate);
      const f = new Date(dd.getFullYear(), dd.getMonth() + Math.round(remainingMonths), 1);
      finishDate = f.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return { BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI_BAC, TCPI_EAC, finishDate, idx, pct: pctNum, dataMonth: data.rows[idx]?.label };
  }, [data, dataDate, acStr, pctStr, totalValue, startDate, endDate, eacMethod, validation.valid]);


  // Monthly EVM rows (PV/EV/AC/CPI/SPI/ETC per month)
  const evmRows = useMemo(() => {
    if (!data) return [];
    const plannedRemainingTotal = evm
      ? data.rows.slice(evm.idx + 1).reduce((a, b) => a + b.monthly, 0)
      : 0;
    return data.rows.map((r, i) => {
      let ev = 0, ac = 0, cpi = 0, spi = 0, etc = 0, etcCurve: number | null = null;
      if (evm) {
        if (i <= evm.idx) {
          const step = evm.idx + 1;
          ev = (evm.EV * (i + 1)) / step;
          ac = (evm.AC * (i + 1)) / step;
          cpi = ac > 0 ? ev / ac : 0;
          spi = r.cumulative > 0 ? ev / r.cumulative : 0;
          etcCurve = i === evm.idx ? evm.AC : null;
        } else if (plannedRemainingTotal > 0) {
          const remainPlanned = data.rows.slice(evm.idx + 1, i + 1)
            .reduce((a, b) => a + b.monthly, 0);
          const projected = evm.AC + (evm.ETC * remainPlanned) / plannedRemainingTotal;
          etc = projected;
          etcCurve = projected;
          cpi = evm.CPI;
          spi = evm.SPI;
        }
      }
      return {
        i, label: r.label, key: r.key, monthly: r.monthly, pv: r.cumulative,
        ev, ac, cpi, spi, etc, etcCurve,
      };
    });
  }, [data, evm]);

  const chartData = useMemo(() => evmRows.map((r) => ({
    label: r.label, monthly: r.monthly, pv: r.pv,
    ev: r.ev > 0 ? r.ev : null,
    ac: r.ac > 0 ? r.ac : null,
    etc: r.etcCurve,
  })), [evmRows]);

  const filteredEvmRows = useMemo(() => {
    if (monthFilter === "all") return evmRows;
    return evmRows.filter((r) => r.key === monthFilter);
  }, [evmRows, monthFilter]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-EG" : "en-US", { maximumFractionDigits: 0 }).format(n || 0);

  const cur = currency || (isArabic ? "ج.م" : "EGP");

  // Overall project health from CPI & SPI
  const health = useMemo(() => {
    if (!evm) return null;
    const cpi = evm.CPI, spi = evm.SPI;
    if (cpi === 0 && spi === 0) return null;
    const cost = cpi >= 1 ? "good" : cpi >= 0.9 ? "warn" : "bad";
    const sched = spi >= 1 ? "good" : spi >= 0.9 ? "warn" : "bad";
    const score = [cost, sched];
    const level = score.includes("bad") ? "bad" : score.includes("warn") ? "warn" : "good";
    const labelMap = {
      good: isArabic ? "ضمن الأهداف" : "On Target",
      warn: isArabic ? "يحتاج متابعة" : "Needs Attention",
      bad:  isArabic ? "خارج المسار" : "Off Track",
    } as const;
    return { level, label: labelMap[level], cost, sched };
  }, [evm, isArabic]);

  // Auto recommendations based on indicators
  const recommendations = useMemo(() => {
    if (!evm) return [];
    const recs: string[] = [];
    if (evm.CPI > 0 && evm.CPI < 0.95) {
      recs.push(isArabic
        ? `تجاوز في التكلفة: CPI = ${evm.CPI.toFixed(2)}. راجع بنود الصرف وأعد تقدير EAC.`
        : `Cost overrun: CPI = ${evm.CPI.toFixed(2)}. Review spending and re-estimate EAC.`);
    }
    if (evm.SPI > 0 && evm.SPI < 0.95) {
      recs.push(isArabic
        ? `تأخر في الجدول: SPI = ${evm.SPI.toFixed(2)}. أضف موارد على المسار الحرج أو أعد ترتيب الأنشطة.`
        : `Schedule slippage: SPI = ${evm.SPI.toFixed(2)}. Add resources on critical path or re-sequence.`);
    }
    if (evm.VAC < 0) {
      recs.push(isArabic
        ? `تجاوز متوقع للموازنة بمقدار ${fmt(Math.abs(evm.VAC))} ${cur}. اطلب موافقة على تغيير الموازنة أو خفّض النطاق.`
        : `Forecast over budget by ${fmt(Math.abs(evm.VAC))} ${cur}. Request budget change or descope.`);
    }
    if (evm.TCPI_BAC > 1.1) {
      recs.push(isArabic
        ? `TCPI→BAC = ${evm.TCPI_BAC.toFixed(2)} (صعب التحقيق). يُنصح بالتحوّل إلى EAC كهدف جديد.`
        : `TCPI→BAC = ${evm.TCPI_BAC.toFixed(2)} (hard to achieve). Consider switching to EAC as the new target.`);
    }
    if (evm.CPI >= 1 && evm.SPI >= 1 && evm.VAC >= 0) {
      recs.push(isArabic
        ? "الأداء جيد — حافظ على نمط التنفيذ الحالي وراقب المخاطر الناشئة."
        : "Healthy performance — maintain execution pattern and monitor emerging risks.");
    }
    return recs;
  }, [evm, isArabic, cur]);

  const handleResetEvm = () => {
    setDataDate(""); setAcStr(""); setPctStr(""); setEacMethod("cpi");
  };


  const handleExport = () => {
    if (!data) return;
    const rows = data.rows.map((r, i) => ({
      "#": i + 1,
      Month: r.label,
      "Weight %": Number(r.pct.toFixed(2)),
      Monthly: Math.round(r.monthly),
      "Cumulative (PV)": Math.round(r.cumulative),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CashFlow");
    if (evm) {
      const evmSum = [
        { Metric: "BAC", Value: Math.round(evm.BAC) },
        { Metric: "PV",  Value: Math.round(evm.PV) },
        { Metric: "EV",  Value: Math.round(evm.EV) },
        { Metric: "AC",  Value: Math.round(evm.AC) },
        { Metric: "CV",  Value: Math.round(evm.CV) },
        { Metric: "SV",  Value: Math.round(evm.SV) },
        { Metric: "CPI", Value: Number(evm.CPI.toFixed(3)) },
        { Metric: "SPI", Value: Number(evm.SPI.toFixed(3)) },
        { Metric: `EAC (${eacMethod})`, Value: Math.round(evm.EAC) },
        { Metric: "ETC", Value: Math.round(evm.ETC) },
        { Metric: "VAC", Value: Math.round(evm.VAC) },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evmSum), "EVM");
      const monthly = evmRows.map((r) => ({
        Month: r.label,
        Monthly: Math.round(r.monthly),
        PV: Math.round(r.pv),
        EV: Math.round(r.ev),
        AC: Math.round(r.ac),
        CPI: Number(r.cpi.toFixed(3)),
        SPI: Number(r.spi.toFixed(3)),
        ETC: Math.round(r.etc),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly), "EVM-Monthly");
    }
    XLSX.writeFile(wb, `${projectName || "project"}-cashflow.xlsx`);
  };

  const handleExportPdf = () => {
    if (!data || !evm) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const title = `${projectName || "Project"} — Cash Flow & EVM`;
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} → ${endDate}  |  BAC: ${fmt(evm.BAC)} ${cur}  |  Data Date: ${dataDate}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["Metric", "Value"]],
      body: [
        ["BAC", `${fmt(evm.BAC)} ${cur}`],
        ["PV", `${fmt(evm.PV)} ${cur}`],
        ["EV", `${fmt(evm.EV)} ${cur}`],
        ["AC", `${fmt(evm.AC)} ${cur}`],
        ["CV (EV-AC)", `${fmt(evm.CV)} ${cur}`],
        ["SV (EV-PV)", `${fmt(evm.SV)} ${cur}`],
        ["CPI", evm.CPI.toFixed(3)],
        ["SPI", evm.SPI.toFixed(3)],
        [`EAC (${eacMethod})`, `${fmt(evm.EAC)} ${cur}`],
        ["ETC", `${fmt(evm.ETC)} ${cur}`],
        ["VAC", `${fmt(evm.VAC)} ${cur}`],
        ["TCPI → BAC", evm.TCPI_BAC > 0 ? evm.TCPI_BAC.toFixed(3) : "-"],
        ["TCPI → EAC", evm.TCPI_EAC > 0 ? evm.TCPI_EAC.toFixed(3) : "-"],
        ["Forecast Finish", evm.finishDate || "-"],
        ["Health", health?.label || "-"],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 122, 87] },
      tableWidth: 90,
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Month", "Monthly", "PV", "EV", "AC", "CPI", "SPI", "ETC"]],
      body: evmRows.map((r) => [
        r.label,
        fmt(r.monthly),
        fmt(r.pv),
        fmt(r.ev),
        fmt(r.ac),
        r.cpi ? r.cpi.toFixed(2) : "-",
        r.spi ? r.spi.toFixed(2) : "-",
        fmt(r.etc),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 122, 87] },
    });

    if (recommendations.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [["Recommendations"]],
        body: recommendations.map((r) => [r]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [180, 83, 9] },
      });
    }

    doc.save(`${projectName || "project"}-evm.pdf`);
  };

  const kpiClass = (good: boolean) => good ? "text-emerald-600" : "text-rose-600";


  const eacLabel = (m: EacMethod) => {
    if (m === "cpi") return isArabic ? "BAC / CPI (الأكثر شيوعًا)" : "BAC / CPI (typical)";
    if (m === "plan") return isArabic ? "AC + (BAC − EV) — حسب الخطة" : "AC + (BAC − EV) — at plan";
    if (m === "composite") return isArabic ? "AC + (BAC − EV)/(CPI×SPI) — مركّب" : "AC + (BAC − EV)/(CPI×SPI) — composite";
    return isArabic ? "AC + (BAC − EV)/CPI — أداء حالي" : "AC + (BAC − EV)/CPI — current perf.";
  };

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
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs text-muted-foreground">
              {isArabic ? "التوزيع:" : "Distribution:"}
            </Label>
            <Select value={mode} onValueChange={(v) => setMode(v as DistMode)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">{isArabic ? "خطي" : "Linear"}</SelectItem>
                <SelectItem value="scurve">{isArabic ? "منحنى S" : "S-Curve"}</SelectItem>
                <SelectItem value="front">{isArabic ? "مُحمَّل مقدمًا" : "Front-loaded"}</SelectItem>
                <SelectItem value="back">{isArabic ? "مُحمَّل مؤخرًا" : "Back-loaded"}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExport} disabled={!data}>
              <Download className="h-3.5 w-3.5" />
              {isArabic ? "Excel" : "Excel"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportPdf} disabled={!evm}>
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={handleResetEvm}
              disabled={!dataDate && !acStr && !pctStr}
              title={isArabic ? "إعادة ضبط مدخلات EVM" : "Reset EVM inputs"}>
              <RotateCcw className="h-3.5 w-3.5" />
              {isArabic ? "تصفير" : "Reset"}
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
                  {isArabic ? "مدخلات EVM" : "EVM Inputs"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "تاريخ المتابعة" : "Data Date"}
                  </Label>
                  <Input type="text" placeholder="yyyy-mm-dd" value={dataDate}
                    onChange={(e) => setDataDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "AC التكلفة الفعلية" : "Actual Cost (AC)"}
                  </Label>
                  <Input type="number" inputMode="decimal" placeholder="0" value={acStr}
                    onChange={(e) => setAcStr(e.target.value)} className="h-8 text-sm tabular-nums" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "نسبة الإنجاز %" : "% Complete"}
                  </Label>
                  <Input type="number" min={0} max={100} inputMode="decimal" placeholder="0" value={pctStr}
                    onChange={(e) => setPctStr(e.target.value)} className="h-8 text-sm tabular-nums" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isArabic ? "طريقة EAC" : "EAC Method"}
                  </Label>
                  <Select value={eacMethod} onValueChange={(v) => setEacMethod(v as EacMethod)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpi">{eacLabel("cpi")}</SelectItem>
                      <SelectItem value="plan">{eacLabel("plan")}</SelectItem>
                      <SelectItem value="atypical">{eacLabel("atypical")}</SelectItem>
                      <SelectItem value="composite">{eacLabel("composite")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Validation alerts */}
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{isArabic ? "بيانات غير مكتملة" : "Incomplete data"}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ps-5 text-sm">
                    {validation.errors.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{isArabic ? "تحذير" : "Warning"}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ps-5 text-sm">
                    {validation.warnings.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">BAC</div>
                <div className="text-base font-bold text-emerald-600 tabular-nums">{fmt(totalValue)} {cur}</div>
              </div>
              <div className="rounded-lg border bg-blue-500/5 border-blue-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">PV @ DD</div>
                <div className="text-base font-bold text-blue-600 tabular-nums">{fmt(evm?.PV || 0)} {cur}</div>
              </div>
              <div className="rounded-lg border bg-amber-500/5 border-amber-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">EV</div>
                <div className="text-base font-bold text-amber-600 tabular-nums">{fmt(evm?.EV || 0)} {cur}</div>
              </div>
              <div className="rounded-lg border bg-violet-500/5 border-violet-500/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AC</div>
                <div className="text-base font-bold text-violet-600 tabular-nums">{fmt(evm?.AC || 0)} {cur}</div>
              </div>
            </div>

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
                <div className="rounded-md border p-2" title={eacLabel(eacMethod)}>
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

            {evm && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-rose-500/5 border-rose-500/30 p-3" title={isArabic ? "الكفاءة المطلوبة لإنهاء المشروع ضمن BAC" : "Efficiency required to finish within BAC"}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">TCPI → BAC</div>
                  <div className={`text-base font-bold tabular-nums ${kpiClass(evm.TCPI_BAC > 0 && evm.TCPI_BAC <= 1.1)}`}>
                    {evm.TCPI_BAC > 0 ? evm.TCPI_BAC.toFixed(3) : "-"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {evm.TCPI_BAC > 1.1
                      ? (isArabic ? "صعب التحقيق" : "Hard to achieve")
                      : evm.TCPI_BAC > 1
                        ? (isArabic ? "يحتاج تحسين أداء" : "Needs improvement")
                        : (isArabic ? "قابل للتحقيق" : "Achievable")}
                  </div>
                </div>
                <div className="rounded-lg border bg-orange-500/5 border-orange-500/30 p-3" title={isArabic ? "الكفاءة المطلوبة لإنهاء المشروع ضمن EAC" : "Efficiency required to finish within EAC"}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">TCPI → EAC</div>
                  <div className={`text-base font-bold tabular-nums ${kpiClass(evm.TCPI_EAC > 0 && evm.TCPI_EAC <= 1.1)}`}>
                    {evm.TCPI_EAC > 0 ? evm.TCPI_EAC.toFixed(3) : "-"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isArabic ? "بناءً على التوقّع الحالي" : "Based on current forecast"}
                  </div>
                </div>
                <div className="rounded-lg border bg-teal-500/5 border-teal-500/30 p-3" title={isArabic ? "تاريخ الإنجاز المتوقع وفق SPI الحالي" : "Forecast finish date based on SPI"}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {isArabic ? "تاريخ الإنجاز المتوقع" : "Forecast Finish"}
                  </div>
                  <div className="text-base font-bold tabular-nums text-teal-600">
                    {evm.finishDate || "-"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isArabic ? "وفق SPI الحالي" : "Per current SPI"}
                  </div>
                </div>
              </div>
            )}

            {/* Project Health Banner */}
            {health && (
              <div className={`rounded-lg border p-3 flex items-center gap-3 ${
                health.level === "good"
                  ? "bg-emerald-500/10 border-emerald-500/40"
                  : health.level === "warn"
                    ? "bg-amber-500/10 border-amber-500/40"
                    : "bg-rose-500/10 border-rose-500/40"
              }`}>
                {health.level === "good" ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> :
                 health.level === "warn" ? <ShieldAlert className="h-5 w-5 text-amber-600" /> :
                 <ShieldX className="h-5 w-5 text-rose-600" />}
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {isArabic ? "حالة المشروع: " : "Project Health: "}{health.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isArabic ? "التكلفة" : "Cost"}: <span className={kpiClass(health.cost === "good")}>
                      {health.cost === "good" ? (isArabic ? "جيد" : "Good") : health.cost === "warn" ? (isArabic ? "متوسط" : "Warn") : (isArabic ? "ضعيف" : "Poor")}
                    </span>
                    {" • "}
                    {isArabic ? "الجدول" : "Schedule"}: <span className={kpiClass(health.sched === "good")}>
                      {health.sched === "good" ? (isArabic ? "جيد" : "Good") : health.sched === "warn" ? (isArabic ? "متوسط" : "Warn") : (isArabic ? "ضعيف" : "Poor")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Auto Recommendations */}
            {recommendations.length > 0 && (
              <div className="rounded-lg border bg-amber-500/5 border-amber-500/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold">
                    {isArabic ? "توصيات تلقائية" : "Auto Recommendations"}
                  </span>
                </div>
                <ul className="list-disc ps-5 space-y-1 text-sm text-foreground/90">
                  {recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
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
                    stroke="hsl(217 91% 60%)" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  {evm && evm.EV > 0 && (
                    <Line yAxisId="right" type="monotone" dataKey="ev"
                      name={isArabic ? "EV المكتسب" : "EV (Earned)"}
                      stroke="hsl(38 92% 50%)" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                  )}
                  {evm && evm.AC > 0 && (
                    <Line yAxisId="right" type="monotone" dataKey="ac"
                      name={isArabic ? "AC الفعلي" : "AC (Actual)"}
                      stroke="hsl(262 83% 58%)" strokeWidth={2.5} strokeDasharray="5 4"
                      dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls />
                  )}
                  {evm && evm.ETC > 0 && (
                    <Line yAxisId="right" type="monotone" dataKey="etc"
                      name={isArabic ? "ETC المتوقع" : "ETC (Forecast)"}
                      stroke="hsl(0 72% 51%)" strokeWidth={2.5} strokeDasharray="2 3"
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

            {/* Monthly EVM table with filter */}
            {evm && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {isArabic ? "جدول EVM الشهري" : "Monthly EVM Breakdown"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">
                      {isArabic ? "تصفية:" : "Filter:"}
                    </Label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isArabic ? "كل الأشهر" : "All months"}</SelectItem>
                        {evmRows.map((r) => (
                          <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[320px] border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/80 backdrop-blur sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-28">{isArabic ? "الشهر" : "Month"}</TableHead>
                        <TableHead className="text-right">{isArabic ? "صرف" : "Monthly"}</TableHead>
                        <TableHead className="text-right">PV</TableHead>
                        <TableHead className="text-right">EV</TableHead>
                        <TableHead className="text-right">AC</TableHead>
                        <TableHead className="text-right">CPI</TableHead>
                        <TableHead className="text-right">SPI</TableHead>
                        <TableHead className="text-right">ETC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvmRows.map((r) => (
                        <TableRow key={r.key} className={`even:bg-muted/20 ${r.i === evm.idx ? "bg-destructive/10" : ""}`}>
                          <TableCell className="font-medium text-sm">{r.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.monthly)}</TableCell>
                          <TableCell className="text-right tabular-nums text-blue-600">{fmt(r.pv)}</TableCell>
                          <TableCell className="text-right tabular-nums text-amber-600">{r.ev > 0 ? fmt(r.ev) : "-"}</TableCell>
                          <TableCell className="text-right tabular-nums text-violet-600">{r.ac > 0 ? fmt(r.ac) : "-"}</TableCell>
                          <TableCell className={`text-right tabular-nums ${r.cpi ? kpiClass(r.cpi >= 1) : ""}`}>{r.cpi ? r.cpi.toFixed(2) : "-"}</TableCell>
                          <TableCell className={`text-right tabular-nums ${r.spi ? kpiClass(r.spi >= 1) : ""}`}>{r.spi ? r.spi.toFixed(2) : "-"}</TableCell>
                          <TableCell className="text-right tabular-nums text-rose-600">{r.etc > 0 ? fmt(r.etc) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
