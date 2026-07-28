import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Loader2,
  Save,
  RefreshCw,
  ShieldAlert,
  Brain,
  Download,
  Filter,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  BookmarkPlus,
  BarChart3,
  Copy,
  ShieldCheck,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { RiskDetailsDialog, type EditableRisk } from "./RiskDetailsDialog";

type AiRisk = EditableRisk;

const scoreTone = (s: number) =>
  s >= 15
    ? "bg-red-500/15 text-red-600 border-red-500/40"
    : s >= 8
      ? "bg-amber-500/15 text-amber-600 border-amber-500/40"
      : "bg-emerald-500/15 text-emerald-600 border-emerald-500/40";

const severityOf = (s: number): "high" | "med" | "low" =>
  s >= 15 ? "high" : s >= 8 ? "med" : "low";

type Preset = {
  name: string;
  search: string;
  severity: "all" | "high" | "med" | "low";
  category: string;
  sortBy: "severity_desc" | "severity_asc" | "date_desc" | "date_asc" | "category";
  reviewFilter: "all" | "pending" | "reviewed" | "needs_review";
};

const PRESETS_KEY = "ai_risk_filter_presets_v1";

export function ProjectRiskAnalyzer({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<AiRisk[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<Preset["severity"]>("all");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<Preset["sortBy"]>("severity_desc");
  const [reviewFilter, setReviewFilter] = useState<Preset["reviewFilter"]>("all");

  // presets
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  // details dialog
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // duplicate detection: existing saved risk titles for the selected project
  const [existingTitles, setExistingTitles] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const normalize = (s: string) =>
    (s || "").toLowerCase().replace(/\s+/g, " ").trim();

  const loadExisting = async (pid: string) => {
    if (!user || !pid) return;
    const { data } = await supabase
      .from("risks")
      .select("title")
      .eq("user_id", user.id)
      .eq("project_id", pid);
    setExistingTitles(
      new Set(((data ?? []) as any[]).map((r) => normalize(r.title))),
    );
  };


  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("saved_projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      setProjects((data ?? []) as any);
    })();
  }, [user]);

  const runAnalysis = async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    setRisks([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-project-risks",
        { body: { projectId: pid, language: "ar" } },
      );
      if (error) throw error;
      const now = new Date().toISOString();
      const out = ((data?.risks ?? []) as AiRisk[]).map((r) => ({
        ...r,
        review_status: "pending" as const,
        review_comment: "",
        references: "",
        generated_at: now,
      }));
      setRisks(out);
      setSelected(new Set(out.map((_, i) => i)));
      toast.success(`تم توليد ${out.length} مخاطرة بواسطة الذكاء الاصطناعي`);
    } catch (e: any) {
      toast.error(e?.message || "فشل تحليل المخاطر");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (pid: string) => {
    setProjectId(pid);
    setProjectName(projects.find((p) => p.id === pid)?.name || "");
    loadExisting(pid);
    runAnalysis(pid); // auto re-run on project change
  };


  const toggle = (i: number) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const updateRisk = (idx: number, patch: Partial<AiRisk>) => {
    setRisks((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const cycleReview = (idx: number) => {
    setRisks((rs) =>
      rs.map((r, i) => {
        if (i !== idx) return r;
        const cur = r.review_status ?? "pending";
        const next =
          cur === "pending" ? "needs_review" : cur === "needs_review" ? "reviewed" : "pending";
        return { ...r, review_status: next };
      }),
    );
  };

  const bulkSetReview = (status: AiRisk["review_status"]) => {
    if (selected.size === 0) return;
    setRisks((rs) =>
      rs.map((r, i) => (selected.has(i) ? { ...r, review_status: status } : r)),
    );
    toast.success(`تم تحديث ${selected.size} مخاطرة`);
  };

  const isDuplicate = (r: AiRisk) => existingTitles.has(normalize(r.risk_title));

  const saveSelected = async () => {
    if (!user || !projectId || selected.size === 0) return;
    setSaving(true);
    const chosen = Array.from(selected).map((i) => risks[i]);
    const toInsert = skipDuplicates ? chosen.filter((r) => !isDuplicate(r)) : chosen;
    const skipped = chosen.length - toInsert.length;
    if (toInsert.length === 0) {
      setSaving(false);
      toast.info("جميع المخاطر المحددة موجودة مسبقاً — تم التخطي");
      return;
    }
    const rows = toInsert.map((r) => ({
      user_id: user.id,
      project_id: projectId,
      risk_title: r.risk_title,
      risk_description: r.risk_description,
      category: r.category,
      probability_score: r.probability_score,
      impact_score: r.impact_score,
      risk_score: r.risk_score,
      probability:
        r.probability_score >= 4 ? "high" : r.probability_score <= 2 ? "low" : "medium",
      impact: r.impact_score >= 4 ? "high" : r.impact_score <= 2 ? "low" : "medium",
      mitigation_strategy: r.mitigation_strategy,
      contingency_plan: r.contingency_plan,
      risk_owner: r.risk_owner,
      status: "identified",
    }));
    const { error } = await supabase.from("risks").insert(rows);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      skipped > 0
        ? `تم حفظ ${rows.length} مخاطرة (تم تخطي ${skipped} مكررة)`
        : `تم حفظ ${rows.length} مخاطرة في سجل المخاطر`,
    );
    // Refresh existing titles so newly saved rows are treated as duplicates
    await loadExisting(projectId);
    setRisks([]);
    setSelected(new Set());
    onSaved?.();
  };

  const printReport = () => {
    if (!risks.length) return;
    const rowsHtml = filteredIdx
      .map(({ r }) => {
        const tone =
          r.risk_score >= 15
            ? "background:#fee2e2;color:#b91c1c"
            : r.risk_score >= 8
              ? "background:#fef3c7;color:#b45309"
              : "background:#dcfce7;color:#166534";
        return `<tr>
          <td>${escapeHtml(r.risk_title)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td style="text-align:center">${r.probability_score}×${r.impact_score}</td>
          <td style="text-align:center;font-weight:bold;${tone}">${r.risk_score}</td>
          <td>${escapeHtml(r.mitigation_strategy)}</td>
          <td>${escapeHtml(r.contingency_plan || "")}</td>
        </tr>`;
      })
      .join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>تقرير المخاطر - ${escapeHtml(projectName)}</title>
      <style>
        body{font-family:Tajawal,Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 8px}
        .meta{font-size:12px;color:#555;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px;text-align:right;vertical-align:top}
        th{background:#f5f5f5}
      </style></head><body>
      <h1>تقرير تحليل المخاطر - ${escapeHtml(projectName)}</h1>
      <div class="meta">تم التوليد بواسطة الذكاء الاصطناعي • ${new Date().toLocaleString("ar")} • ${filteredIdx.length} مخاطرة</div>
      <table><thead><tr>
        <th>المخاطرة</th><th>الفئة</th><th>P×I</th><th>الخطورة</th><th>خطة التخفيف</th><th>خطة الطوارئ</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };


  const summary = useMemo(() => {
    if (!risks.length) return null;
    const high = risks.filter((r) => r.risk_score >= 15).length;
    const med = risks.filter((r) => r.risk_score >= 8 && r.risk_score < 15).length;
    const low = risks.filter((r) => r.risk_score < 8).length;
    const reviewed = risks.filter((r) => r.review_status === "reviewed").length;
    const needs = risks.filter((r) => r.review_status === "needs_review").length;
    return {
      high,
      med,
      low,
      reviewed,
      needs,
      avg: Math.round(risks.reduce((s, r) => s + r.risk_score, 0) / risks.length),
    };
  }, [risks]);

  const categories = useMemo(
    () => Array.from(new Set(risks.map((r) => r.category).filter(Boolean))),
    [risks],
  );

  // Category × Severity matrix
  const categoryDist = useMemo(() => {
    const map = new Map<
      string,
      { total: number; high: number; med: number; low: number }
    >();
    for (const r of risks) {
      const key = r.category || "غير مصنف";
      const bucket = map.get(key) ?? { total: 0, high: 0, med: 0, low: 0 };
      bucket.total += 1;
      bucket[severityOf(r.risk_score)] += 1;
      map.set(key, bucket);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [risks]);

  const maxCatTotal = Math.max(1, ...categoryDist.map((c) => c.total));

  const filteredIdx = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = risks.map((r, i) => ({ r, i }));
    list = list.filter(({ r }) => {
      if (category !== "all" && r.category !== category) return false;
      if (severity === "high" && r.risk_score < 15) return false;
      if (severity === "med" && (r.risk_score < 8 || r.risk_score >= 15)) return false;
      if (severity === "low" && r.risk_score >= 8) return false;
      if (
        reviewFilter !== "all" &&
        (r.review_status ?? "pending") !== reviewFilter
      )
        return false;
      if (
        q &&
        !`${r.risk_title} ${r.risk_description} ${r.risk_owner} ${r.category}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sortBy) {
        case "severity_asc":
          return a.r.risk_score - b.r.risk_score;
        case "date_desc":
          return (b.r.generated_at ?? "").localeCompare(a.r.generated_at ?? "");
        case "date_asc":
          return (a.r.generated_at ?? "").localeCompare(b.r.generated_at ?? "");
        case "category":
          return (a.r.category ?? "").localeCompare(b.r.category ?? "", "ar");
        case "severity_desc":
        default:
          return b.r.risk_score - a.r.risk_score;
      }
    });
    return list;
  }, [risks, search, severity, category, reviewFilter, sortBy]);

  const exportCsv = () => {
    if (!risks.length) return;
    const headers = [
      "العنوان",
      "الوصف",
      "الفئة",
      "الاحتمال",
      "التأثير",
      "الخطورة",
      "خطة التخفيف",
      "خطة الطوارئ",
      "المسؤول",
      "حالة المراجعة",
      "تعليق المراجعة",
      "المراجع",
    ];
    const rows = filteredIdx.map(({ r }) =>
      [
        r.risk_title,
        r.risk_description,
        r.category,
        r.probability_score,
        r.impact_score,
        r.risk_score,
        r.mitigation_strategy,
        r.contingency_plan,
        r.risk_owner,
        r.review_status ?? "pending",
        r.review_comment ?? "",
        r.references ?? "",
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-risks-${projectName || projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير المخاطر إلى CSV");
  };

  const currentFilterSnapshot = (): Omit<Preset, "name"> => ({
    search,
    severity,
    category,
    sortBy,
    reviewFilter,
  });

  const saveCurrentPreset = () => {
    const name = window.prompt("اسم الفلتر:");
    if (!name?.trim()) return;
    const next = [
      ...presets.filter((p) => p.name !== name.trim()),
      { name: name.trim(), ...currentFilterSnapshot() },
    ];
    setPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    toast.success("تم حفظ الفلتر");
  };

  const applyPreset = (name: string) => {
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    setSearch(p.search);
    setSeverity(p.severity);
    setCategory(p.category);
    setSortBy(p.sortBy);
    setReviewFilter(p.reviewFilter);
    toast.success(`تم تطبيق الفلتر «${name}»`);
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          تحليل المخاطر بالذكاء الاصطناعي
          <Badge variant="outline" className="ms-2 text-[10px] gap-1">
            <Sparkles className="w-3 h-3" />
            Gemini
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          اختر مشروعاً محفوظاً ليقوم البرنامج تلقائياً بتحليل بنوده وتوليد سجل
          مخاطر شامل قابل للحفظ والمراجعة.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectId} onValueChange={handleSelect} disabled={loading}>
            <SelectTrigger className="h-9 flex-1 min-w-[240px]">
              <SelectValue placeholder="اختر مشروعاً محفوظاً…" />
            </SelectTrigger>
            <SelectContent>
              {projects.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  لا توجد مشاريع محفوظة
                </div>
              )}
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runAnalysis(projectId)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ms-1">تحديث التحليل</span>
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            جارٍ تحليل «{projectName}» وتوليد سجل المخاطر…
          </div>
        )}

        {!loading && risks.length > 0 && summary && (
          <>
            {/* Totals strip */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
              <div className="p-2 rounded-md bg-red-500/10">
                <div className="text-[10px] text-muted-foreground">عالية</div>
                <div className="text-lg font-bold text-red-600">{summary.high}</div>
              </div>
              <div className="p-2 rounded-md bg-amber-500/10">
                <div className="text-[10px] text-muted-foreground">متوسطة</div>
                <div className="text-lg font-bold text-amber-600">{summary.med}</div>
              </div>
              <div className="p-2 rounded-md bg-emerald-500/10">
                <div className="text-[10px] text-muted-foreground">منخفضة</div>
                <div className="text-lg font-bold text-emerald-600">{summary.low}</div>
              </div>
              <div className="p-2 rounded-md bg-primary/10">
                <div className="text-[10px] text-muted-foreground">متوسط</div>
                <div className="text-lg font-bold text-primary">{summary.avg}</div>
              </div>
              <div className="p-2 rounded-md bg-emerald-500/10">
                <div className="text-[10px] text-muted-foreground">تمت المراجعة</div>
                <div className="text-lg font-bold text-emerald-700">
                  {summary.reviewed}
                </div>
              </div>
              <div className="p-2 rounded-md bg-amber-500/10">
                <div className="text-[10px] text-muted-foreground">مطلوب مراجعة</div>
                <div className="text-lg font-bold text-amber-700">
                  {summary.needs}
                </div>
              </div>
            </div>

            {/* Category × Severity distribution */}
            <div className="rounded-md border p-3 bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                توزيع المخاطر حسب الفئة والخطورة
              </div>
              <div className="space-y-1.5">
                {categoryDist.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-[11px]">
                    <div className="w-28 truncate text-muted-foreground">
                      {c.name}
                    </div>
                    <div className="flex-1 h-4 rounded overflow-hidden bg-muted/60 flex">
                      <div
                        className="bg-red-500"
                        style={{ width: `${(c.high / maxCatTotal) * 100}%` }}
                        title={`عالية: ${c.high}`}
                      />
                      <div
                        className="bg-amber-500"
                        style={{ width: `${(c.med / maxCatTotal) * 100}%` }}
                        title={`متوسطة: ${c.med}`}
                      />
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${(c.low / maxCatTotal) * 100}%` }}
                        title={`منخفضة: ${c.low}`}
                      />
                    </div>
                    <div className="w-8 text-left font-mono font-semibold">
                      {c.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[180px]">
                <Filter className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث في المخاطر…"
                  className="h-8 pe-7 text-xs"
                />
              </div>
              <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الخطورات</SelectItem>
                  <SelectItem value="high">عالية (≥15)</SelectItem>
                  <SelectItem value="med">متوسطة (8–14)</SelectItem>
                  <SelectItem value="low">منخفضة (&lt;8)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reviewFilter} onValueChange={(v: any) => setReviewFilter(v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل حالات المراجعة</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="needs_review">مطلوب مراجعة</SelectItem>
                  <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="severity_desc">الأعلى خطورة أولاً</SelectItem>
                  <SelectItem value="severity_asc">الأقل خطورة أولاً</SelectItem>
                  <SelectItem value="date_desc">الأحدث توليداً</SelectItem>
                  <SelectItem value="date_asc">الأقدم توليداً</SelectItem>
                  <SelectItem value="category">حسب الفئة</SelectItem>
                </SelectContent>
              </Select>

              {/* Presets */}
              <Select
                value=""
                onValueChange={(v) => {
                  if (v === "__save__") saveCurrentPreset();
                  else if (v.startsWith("__del__:")) deletePreset(v.replace("__del__:", ""));
                  else applyPreset(v);
                }}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="ms-1">الفلاتر المحفوظة</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__save__">
                    <span className="flex items-center gap-1">
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      حفظ الفلتر الحالي…
                    </span>
                  </SelectItem>
                  {presets.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground">
                      لا توجد فلاتر محفوظة
                    </div>
                  )}
                  {presets.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                  {presets.length > 0 && (
                    <div className="border-t mt-1 pt-1">
                      {presets.map((p) => (
                        <SelectItem
                          key={`del-${p.name}`}
                          value={`__del__:${p.name}`}
                          className="text-red-600"
                        >
                          حذف: {p.name}
                        </SelectItem>
                      ))}
                    </div>
                  )}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={exportCsv} className="h-8">
                <Download className="w-3.5 h-3.5" />
                <span className="ms-1 text-xs">CSV</span>
              </Button>
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-hidden max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={
                          filteredIdx.length > 0 &&
                          filteredIdx.every(({ i }) => selected.has(i))
                        }
                        onCheckedChange={() => {
                          const allSel = filteredIdx.every(({ i }) => selected.has(i));
                          setSelected((s) => {
                            const n = new Set(s);
                            filteredIdx.forEach(({ i }) =>
                              allSel ? n.delete(i) : n.add(i),
                            );
                            return n;
                          });
                        }}
                      />
                    </TableHead>
                    <TableHead className="text-right">المخاطرة</TableHead>
                    <TableHead className="text-right">الفئة</TableHead>
                    <TableHead className="text-right">P×I</TableHead>
                    <TableHead className="text-right">الخطورة</TableHead>
                    <TableHead className="text-right">المراجعة</TableHead>
                    <TableHead className="text-right w-16">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIdx.map(({ r, i }) => {
                    const status = r.review_status ?? "pending";
                    return (
                      <TableRow key={i} className="align-top">
                        <TableCell>
                          <Checkbox
                            checked={selected.has(i)}
                            onCheckedChange={() => toggle(i)}
                          />
                        </TableCell>
                        <TableCell className="max-w-md">
                          <button
                            type="button"
                            className="text-xs font-medium text-right hover:underline"
                            onClick={() => setEditingIdx(i)}
                          >
                            {r.risk_title}
                          </button>
                          <div className="text-[10px] text-muted-foreground line-clamp-2">
                            {r.risk_description}
                          </div>
                          <div className="text-[10px] text-primary/80 mt-1">
                            <ShieldAlert className="w-3 h-3 inline ms-1" />
                            {r.mitigation_strategy}
                          </div>
                          {r.review_comment && (
                            <div className="text-[10px] text-amber-700 mt-1">
                              💬 {r.review_comment}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {r.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono whitespace-nowrap">
                          {r.probability_score} × {r.impact_score}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-bold ${scoreTone(r.risk_score)}`}
                          >
                            {r.risk_score}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => cycleReview(i)}
                            className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded border hover:bg-muted/50"
                            title="اضغط للتبديل"
                          >
                            {status === "reviewed" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">تمت المراجعة</span>
                              </>
                            ) : status === "needs_review" ? (
                              <>
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span className="text-amber-700">مطلوب مراجعة</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">قيد الانتظار</span>
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingIdx(i)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredIdx.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                        لا توجد نتائج مطابقة للتصفية
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {selected.size} من {risks.length} محددة ({filteredIdx.length} ظاهرة)
              </div>
              <Button
                onClick={saveSelected}
                disabled={saving || selected.size === 0}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="ms-1">حفظ المخاطر المحددة</span>
              </Button>
            </div>
          </>
        )}

        {!loading && risks.length === 0 && projectId && (
          <div className="text-center text-xs text-muted-foreground py-6">
            لم يتم توليد مخاطر بعد.
          </div>
        )}
      </CardContent>

      <RiskDetailsDialog
        open={editingIdx !== null}
        onOpenChange={(v) => !v && setEditingIdx(null)}
        risk={editingIdx !== null ? risks[editingIdx] : null}
        onSave={(r) => {
          if (editingIdx !== null) {
            updateRisk(editingIdx, r);
            toast.success("تم حفظ تعديلات المخاطرة");
          }
        }}
      />
    </Card>
  );
}
