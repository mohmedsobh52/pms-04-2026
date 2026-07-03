import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Play, Square, RotateCcw, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, AlertTriangle, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import {
  analyzeRows,
  buildProjectInsights,
  buildSuggestions,
  type AnalyzerRow,
  type Suggestion,
} from "@/lib/cost-engine/analyzer";
import { toast } from "sonner";

interface PageRow {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
}

interface Props {
  /** Rows from the current page (manual table) */
  pageRows: PageRow[];
  /** Default waste percentage from page */
  wastePct: number;
  /** Currency label for display */
  currency?: string;
  /** Apply a suggestion to the underlying page row */
  onApply: (rowId: string, patch: { dailyProductivity?: number; dailyRent?: number }) => void;
}

type SourceMode = "page" | "boq";

export function SmartCostEnginePanel({ pageRows, wastePct, currency = "ريال", onApply }: Props) {
  const [source, setSource] = useState<SourceMode>("page");
  const [projectId, setProjectId] = useState<string | null>(null);
  const storageKey = `cost-engine-decisions:${source}:${projectId ?? "page"}`;
  const [ignored, setIgnored] = useState<Record<string, "applied" | "ignored">>(() => {
    try {
      const raw = localStorage.getItem(`cost-engine-decisions:page:page`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const qc = useQueryClient();

  // Phase 2 — Run controls
  type RunScope = "current" | "selected" | "all" | "modified" | "missing" | "reanalyze";
  type RunStatus =
    | "idle"
    | "preparing"
    | "analyzing"
    | "generating"
    | "completed"
    | "completed_with_warnings"
    | "failed";
  const [scope, setScope] = useState<RunScope>("all");
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(() => localStorage.getItem("cost-engine-last-run") || null);
  const [lastError, setLastError] = useState<string | null>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Projects list (for BOQ mode)
  const { data: projects } = useQuery({
    queryKey: ["cost-engine-projects"],
    enabled: source === "boq",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("id,name,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // BOQ items
  const { data: boqItems, isLoading: boqLoading } = useQuery({
    queryKey: ["cost-engine-boq", projectId],
    enabled: source === "boq" && !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_items")
        .select("id,description,category,quantity,unit_price")
        .eq("project_id", projectId!)
        .eq("is_section", false)
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Build analyzer rows
  const rows: AnalyzerRow[] = useMemo(() => {
    if (source === "page") {
      return pageRows.map((r) => ({
        id: r.id,
        name: r.name,
        dailyCost: Number(r.dailyRent) || 0,
        productivity: Number(r.dailyProductivity) || 0,
        quantity: null,
        wastePct,
        group: null,
      }));
    }
    return (boqItems ?? []).map((b: any) => ({
      id: b.id,
      name: b.description ?? "",
      dailyCost: Number(b.unit_price) || 0,
      productivity: 1, // BOQ rows: unit_price is already per-unit; use prod=1
      quantity: Number(b.quantity) || 0,
      wastePct: 0,
      group: b.category ?? null,
    }));
  }, [source, pageRows, boqItems, wastePct]);

  const analyses = useMemo(() => analyzeRows(rows), [rows]);
  const insights = useMemo(
    () => buildProjectInsights(rows, analyses, { defaultWastePct: wastePct }),
    [rows, analyses, wastePct],
  );
  const suggestions: Suggestion[] = useMemo(() => buildSuggestions(rows, analyses), [rows, analyses]);

  // Load persisted decisions when source/project changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setIgnored(raw ? JSON.parse(raw) : {});
    } catch {
      setIgnored({});
    }
  }, [storageKey]);

  // Persist decisions
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ignored));
    } catch {
      /* quota */
    }
  }, [ignored, storageKey]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

  const riskCount = analyses.reduce(
    (acc, a) => ({ ...acc, [a.risk]: (acc as any)[a.risk] + 1 }),
    { low: 0, medium: 0, high: 0 } as Record<string, number>,
  );

  const handleApply = async (s: Suggestion) => {
    if (source === "boq") {
      // Only "dailyCost" maps to BOQ unit_price (productivity is synthetic = 1)
      if (s.field !== "dailyCost") {
        toast.info("هذا الاقتراح غير قابل للتطبيق على بنود BOQ");
        setIgnored((p) => ({ ...p, [s.id]: "ignored" }));
        return;
      }
      const { error } = await supabase
        .from("project_items")
        .update({ unit_price: s.suggestedValue })
        .eq("id", s.rowId);
      if (error) {
        toast.error("فشل تحديث سعر البند: " + error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ["cost-engine-boq", projectId] });
      setIgnored((p) => ({ ...p, [s.id]: "applied" }));
      toast.success("تم تحديث سعر البند في قاعدة البيانات");
      return;
    }
    const patch =
      s.field === "productivity"
        ? { dailyProductivity: s.suggestedValue }
        : s.field === "dailyCost"
        ? { dailyRent: s.suggestedValue }
        : null;
    if (!patch) {
      toast.info("لا يمكن تطبيق هذا الاقتراح تلقائياً");
      setIgnored((p) => ({ ...p, [s.id]: "ignored" }));
      return;
    }
    onApply(s.rowId, patch);
    setIgnored((p) => ({ ...p, [s.id]: "applied" }));
    toast.success("تم تطبيق الاقتراح");
  };

  const exportSuggestionsCsv = () => {
    if (!suggestions.length) {
      toast.info("لا توجد اقتراحات للتصدير");
      return;
    }
    const header = ["row_id", "row_name", "field", "current", "suggested", "confidence", "financial_impact", "reason"];
    const lines = [header.join(",")];
    suggestions.forEach((s) => {
      const row = rows.find((r) => r.id === s.rowId);
      const cells = [
        s.rowId,
        `"${(row?.name || "").replace(/"/g, '""')}"`,
        s.field,
        s.currentValue,
        s.suggestedValue,
        s.confidence,
        s.financialImpact,
        `"${s.reason.replace(/"/g, '""')}"`,
      ];
      lines.push(cells.join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-engine-suggestions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SCOPE_LABELS: Record<RunScope, string> = {
    current: "البند الحالي",
    selected: "البنود المحددة",
    all: "جميع البنود",
    modified: "المعدلة فقط",
    missing: "الناقصة فقط",
    reanalyze: "إعادة تحليل كامل",
  };
  const STATUS_LABELS: Record<RunStatus, { label: string; tone: string }> = {
    idle: { label: "لم يبدأ", tone: "bg-muted text-foreground" },
    preparing: { label: "جاري تجهيز البيانات", tone: "bg-blue-500/10 text-blue-600" },
    analyzing: { label: "جاري التحليل", tone: "bg-blue-500/10 text-blue-600" },
    generating: { label: "جاري توليد الاقتراحات", tone: "bg-primary/10 text-primary" },
    completed: { label: "اكتمل التحليل", tone: "bg-emerald-500/10 text-emerald-700" },
    completed_with_warnings: { label: "اكتمل مع تحذيرات", tone: "bg-amber-500/10 text-amber-700" },
    failed: { label: "فشل التحليل", tone: "bg-red-500/10 text-red-700" },
  };

  const runAnalysis = async () => {
    cancelRef.current = { cancelled: false };
    setLastError(null);
    setRunLog([`[${new Date().toLocaleTimeString("ar")}] بدء التحليل — النطاق: ${SCOPE_LABELS[scope]}`]);
    const push = (l: string) => setRunLog((p) => [...p, `[${new Date().toLocaleTimeString("ar")}] ${l}`]);
    try {
      const steps: Array<{ status: RunStatus; from: number; to: number; msg: string }> = [
        { status: "preparing", from: 0, to: 20, msg: `تجهيز ${rows.length} بند` },
        { status: "analyzing", from: 20, to: 65, msg: "تنفيذ خوارزميات التحليل الإحصائي" },
        { status: "generating", from: 65, to: 95, msg: `توليد ${suggestions.length} اقتراح ذكي` },
      ];
      for (const step of steps) {
        if (cancelRef.current.cancelled) throw new Error("cancelled");
        setRunStatus(step.status);
        push(step.msg);
        const span = step.to - step.from;
        const ticks = 12;
        for (let i = 0; i <= ticks; i++) {
          if (cancelRef.current.cancelled) throw new Error("cancelled");
          setProgress(step.from + (span * i) / ticks);
          await new Promise((r) => setTimeout(r, 25));
        }
      }
      setProgress(100);
      const hasWarnings = insights.dataQuality.warnings.length > 0 || insights.dataQuality.anomalyDensityPct > 15;
      const final: RunStatus = hasWarnings ? "completed_with_warnings" : "completed";
      setRunStatus(final);
      push(`اكتمل — ${suggestions.length} اقتراح · ${insights.topActions.length} إجراء موصى به`);
      const ts = new Date().toISOString();
      setLastRunAt(ts);
      localStorage.setItem("cost-engine-last-run", ts);
      toast.success(hasWarnings ? "اكتمل التحليل مع تحذيرات" : "اكتمل التحليل بنجاح");
    } catch (err: any) {
      if (err?.message === "cancelled") {
        setRunStatus("idle");
        setProgress(0);
        push("تم إيقاف التحليل بواسطة المستخدم");
        toast.info("تم إيقاف التحليل");
      } else {
        setRunStatus("failed");
        setLastError(String(err?.message || err));
        push(`فشل: ${err?.message || err}`);
        toast.error("فشل التحليل");
      }
    }
  };

  const stopAnalysis = () => {
    cancelRef.current.cancelled = true;
  };

  const downloadRunLog = () => {
    const content = runLog.length ? runLog.join("\n") : "لا يوجد سجل تحليل بعد.";
    const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-engine-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRunning = ["preparing", "analyzing", "generating"].includes(runStatus);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            محرك التحليل الذكي (Cost Engine)
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={source} onValueChange={(v) => setSource(v as SourceMode)}>
              <SelectTrigger className="w-44 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">الصفحة الحالية</SelectItem>
                <SelectItem value="boq">بنود BOQ من مشروع</SelectItem>
              </SelectContent>
            </Select>
            {source === "boq" && (
              <Select value={projectId ?? ""} onValueChange={setProjectId}>
                <SelectTrigger className="w-56 h-8">
                  <SelectValue placeholder="اختر مشروع..." />
                </SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase 2 — Run controls */}
        <div className="rounded-lg border bg-background/60 p-3 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={scope} onValueChange={(v) => setScope(v as RunScope)} disabled={isRunning}>
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCOPE_LABELS) as RunScope[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {SCOPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className={STATUS_LABELS[runStatus].tone + " text-[11px]"}>
                {STATUS_LABELS[runStatus].label}
              </Badge>
              {lastRunAt && (
                <span className="text-[11px] text-muted-foreground">
                  آخر تحليل: {new Date(lastRunAt).toLocaleString("ar")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {!isRunning ? (
                <Button size="sm" className="h-8 gap-1" onClick={runAnalysis}>
                  <Play className="w-3.5 h-3.5" />
                  تشغيل التحليل الذكي
                </Button>
              ) : (
                <Button size="sm" variant="destructive" className="h-8 gap-1" onClick={stopAnalysis}>
                  <Square className="w-3.5 h-3.5" />
                  إيقاف
                </Button>
              )}
              {(runStatus === "failed" || runStatus === "completed_with_warnings") && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={runAnalysis}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  إعادة المحاولة
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1"
                onClick={downloadRunLog}
                disabled={runLog.length === 0}
                title="تنزيل سجل التحليل"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          {(isRunning || progress > 0) && (
            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{Math.round(progress)}%</span>
                <span>
                  {rows.length} بند · {suggestions.length} اقتراح · {insights.topActions.length} إجراء
                </span>
              </div>
            </div>
          )}
          {lastError && (
            <div className="text-[11px] rounded border border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-2 flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium">تفاصيل الخطأ</div>
                <div className="truncate" title={lastError}>{lastError}</div>
              </div>
            </div>
          )}
          {runLog.length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Info className="w-3 h-3" /> سجل التنفيذ ({runLog.length})
              </summary>
              <div className="mt-1.5 max-h-32 overflow-y-auto rounded bg-muted/40 p-1.5 space-y-0.5 font-mono">
                {runLog.slice(-30).map((l, i) => (
                  <div key={i} className="truncate">{l}</div>
                ))}
              </div>
            </details>
          )}
        </div>

        {source === "boq" && !projectId && (
          <p className="text-sm text-muted-foreground">اختر مشروعاً لتحليل بنوده.</p>
        )}
        {source === "boq" && boqLoading && (
          <p className="text-sm text-muted-foreground">جاري تحميل البنود...</p>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="عدد البنود" value={String(rows.length)} />
          <Kpi
            label="الإجمالي بعد الهالك"
            value={`${fmt(insights.totalWithWaste)} ${currency}`}
          />
          <Kpi
            label="جودة البيانات"
            value={`${insights.dataQuality.accuracyConfidencePct.toFixed(0)}%`}
          />
          <Kpi
            label="كثافة الشواذ"
            value={`${insights.dataQuality.anomalyDensityPct.toFixed(0)}%`}
            tone={insights.dataQuality.anomalyDensityPct > 15 ? "warn" : "ok"}
          />
        </div>

        {/* Data quality bars */}
        <div className="space-y-2">
          <QBar label="اكتمال البيانات" value={insights.dataQuality.completenessPct} />
          <QBar label="ثقة الدقة" value={insights.dataQuality.accuracyConfidencePct} />
        </div>

        {/* Risk distribution */}
        <div className="flex gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
            منخفض: {riskCount.low}
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            متوسط: {riskCount.medium}
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            مرتفع: {riskCount.high}
          </Badge>
        </div>

        <Tabs defaultValue="suggestions" className="mt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList>
              <TabsTrigger value="suggestions" className="gap-1">
                <Sparkles className="w-3 h-3" /> اقتراحات ({suggestions.length})
              </TabsTrigger>
              <TabsTrigger value="actions">
                أهم الإجراءات ({insights.topActions.length})
              </TabsTrigger>
              <TabsTrigger value="scenarios">سيناريوهات</TabsTrigger>
              <TabsTrigger value="quality">جودة البيانات</TabsTrigger>
            </TabsList>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportSuggestionsCsv}>
              <Download className="w-3 h-3 mr-1" /> تصدير CSV
            </Button>
          </div>


          <TabsContent value="suggestions" className="space-y-2 mt-3 max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد اقتراحات.</p>
            ) : (
              suggestions.map((s) => {
                const row = rows.find((r) => r.id === s.rowId);
                const status = ignored[s.id] ?? s.status;
                return (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 p-2 rounded-md border bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{row?.name || s.rowId}</div>
                      <div className="text-xs text-muted-foreground">{s.reason}</div>
                      <div className="text-xs mt-1 flex flex-wrap gap-2">
                        <span>الحقل: <b>{s.field}</b></span>
                        <span>الحالي: <b>{fmt(s.currentValue)}</b></span>
                        <span>المقترح: <b className="text-primary">{fmt(s.suggestedValue)}</b></span>
                        <span>الثقة: <b>{s.confidence}%</b></span>
                        <span>
                          الأثر المالي: <b className={s.financialImpact < 0 ? "text-emerald-600" : "text-red-600"}>
                            {fmt(s.financialImpact)} {currency}
                          </b>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {status === "pending" ? (
                        <>
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleApply(s)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> تطبيق
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setIgnored((p) => ({ ...p, [s.id]: "ignored" }))}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> تجاهل
                          </Button>
                        </>
                      ) : (
                        <Badge variant={status === "applied" ? "default" : "secondary"} className="text-xs">
                          {status === "applied" ? "تم التطبيق" : "تم التجاهل"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-2 mt-3">
            {insights.topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد إجراءات مقترحة حالياً.</p>
            ) : (
              insights.topActions.map((a, i) => (
                <div key={i} className="p-2 rounded-md border bg-background">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{a.title}</div>
                    <Badge variant="outline" className="text-xs">ثقة {a.confidence}%</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{a.reason}</div>
                  <div className="text-xs mt-1">
                    وفر تقديري:{" "}
                    <b className="text-emerald-600">{fmt(a.estimatedSaving)} {currency}</b> ·
                    عدد البنود: {a.rowIds.length}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-2 mt-3">
            {insights.scenarios.map((s) => (
              <div key={s.label} className="p-2 rounded-md border bg-background flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium capitalize">{s.label}</div>
                  <div className="text-xs text-muted-foreground">معامل {s.costMultiplier}×</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{fmt(s.totalCost)} {currency}</div>
                  <div className={`text-xs ${s.delta < 0 ? "text-emerald-600" : s.delta > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                    Δ {fmt(s.delta)} ({s.deltaPct >= 0 ? "+" : ""}{s.deltaPct}%)
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="quality" className="space-y-2 mt-3">
            <QBar label="الاكتمال" value={insights.dataQuality.completenessPct} />
            <QBar label="ثقة الدقة" value={insights.dataQuality.accuracyConfidencePct} />
            <QBar
              label="كثافة الشواذ (أقل = أفضل)"
              value={insights.dataQuality.anomalyDensityPct}
              invert
            />
            {insights.dataQuality.warnings.length > 0 && (
              <div className="text-xs text-amber-700 flex items-start gap-1 mt-2">
                <AlertTriangle className="w-3 h-3 mt-0.5" />
                <div>
                  {insights.dataQuality.warnings.map((w) => (
                    <div key={w}>• {warnLabel(w)}</div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="p-2 rounded-md border bg-background">
      <div className="text-[11px] text-muted-foreground truncate">{label}</div>
      <div className={`text-sm font-bold truncate ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}

function QBar({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = invert ? (pct > 15 ? "bg-red-500" : "bg-emerald-500") : pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function warnLabel(code: string): string {
  switch (code) {
    case "missing_critical_fields":
      return "حقول مفقودة في عدد من البنود";
    case "excessive_outliers":
      return "نسبة شواذ مرتفعة (>15%)";
    case "small_dataset":
      return "حجم البيانات صغير — الإحصاء قد لا يكون موثوقاً";
    default:
      return code;
  }
}
