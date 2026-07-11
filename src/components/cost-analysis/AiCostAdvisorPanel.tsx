import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Clock,
  Undo2,
  Copy,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
}

export interface AiSuggestion {
  itemId: string;
  category:
    | "productivity"
    | "rent"
    | "waste"
    | "scope"
    | "risk"
    | "pricing_source"
    | "historical_price"
    | "material_alternative"
    | "unit_optimization"
    | "bulk_discount"
    | "quantity"
    | "supplier"
    | "schedule"
    | "quality"
    | "cash_flow"
    | "contract_terms"
    | "logistics"
    | "safety"
    | "data_quality"
    | "other";
  severity: "low" | "medium" | "high";
  title: string;
  rationale: string;
  suggestedProductivity?: number | null;
  suggestedRent?: number | null;
  estimatedSavingPct?: number | null;
}

type Decision = "pending" | "approved" | "rejected" | "postponed";

interface Stored {
  id: string;
  s: AiSuggestion;
  decision: Decision;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  previousPatch?: { dailyProductivity?: number; dailyRent?: number };
}

interface Props {
  items: Item[];
  currency: string;
  wastePct: number;
  adminPct: number;
  onApply: (
    itemId: string,
    patch: { dailyProductivity?: number; dailyRent?: number },
  ) => void;
  storageKey?: string;
}

const DEFAULT_KEY = "cost_ai_suggestions_v2";

const SEVERITY_STYLE: Record<AiSuggestion["severity"], string> = {
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const CAT_LABEL: Record<AiSuggestion["category"], string> = {
  productivity: "إنتاجية",
  rent: "إيجار",
  waste: "هالك",
  scope: "نطاق",
  risk: "مخاطرة",
  pricing_source: "مصدر سعر",
  historical_price: "سعر تاريخي",
  material_alternative: "بديل مادة",
  unit_optimization: "تحسين وحدة",
  bulk_discount: "خصم كمية",
  quantity: "كمية",
  supplier: "مورّد",
  schedule: "جدولة",
  quality: "جودة",
  cash_flow: "تدفق نقدي",
  contract_terms: "شروط تعاقدية",
  logistics: "لوجستيات",
  safety: "سلامة",
  data_quality: "جودة البيانات",
  other: "أخرى",
};

function makeId(s: AiSuggestion) {
  return `${s.itemId}::${s.category}::${s.title}`;
}

function firstToken(name: string) {
  return name.trim().toLowerCase().split(/\s+/)[0] || "";
}

function round2(value: number) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function median(values: number[]) {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function safeTarget(current: number, target: number) {
  if (!Number.isFinite(target) || target <= 0) return undefined;
  if (!Number.isFinite(current) || current <= 0) return round2(target);
  return round2(Math.min(current * 1.3, Math.max(current * 0.7, target)));
}

function pctSaving(current: number, target?: number) {
  if (!target || current <= 0 || target >= current) return null;
  return round2(((current - target) / current) * 100);
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function hasAny(name: string, words: string[]) {
  const n = normalizeName(name);
  return words.some((w) => n.includes(w));
}

function mergeSuggestions(list: AiSuggestion[]) {
  const map = new Map<string, AiSuggestion>();
  list.forEach((s) => {
    if (!s?.itemId || !s?.title) return;
    map.set(makeId(s), s);
  });
  return [...map.values()];
}

function buildDeterministicSuggestions(
  items: Item[],
  wastePct: number,
  adminPct: number,
  currency: string,
): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const costs = items.map((i) => i.costPerUnit).filter((v) => v > 0);
  const prods = items.map((i) => i.dailyProductivity).filter((v) => v > 0);
  const rents = items.map((i) => i.dailyRent).filter((v) => v > 0);
  const costMed = median(costs);
  const prodMed = median(prods);
  const rentMed = median(rents);
  const nameCounts = new Map<string, number>();
  const tokenGroups = new Map<string, Item[]>();

  items.forEach((i) => {
    const name = normalizeName(i.name);
    if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    const token = firstToken(i.name);
    if (token) tokenGroups.set(token, [...(tokenGroups.get(token) || []), i]);
  });

  const push = (s: AiSuggestion) => out.push(s);
  const topByCost = [...items].sort((a, b) => b.costPerUnit - a.costPerUnit).slice(0, 4);
  const topIds = new Set(topByCost.map((i) => i.id));

  items.forEach((item) => {
    if (!item.name.trim()) {
      push({ itemId: item.id, category: "data_quality", severity: "medium", title: "استكمال اسم البند قبل التسعير", rationale: "اسم البند الفارغ يمنع مطابقة الأسعار التاريخية وعروض الموردين بدقة." });
    }

    if (item.dailyProductivity <= 0) {
      push({ itemId: item.id, category: "productivity", severity: "high", title: "إضافة إنتاجية تقديرية للبند", rationale: "الإنتاجية صفرية؛ تكلفة الوحدة لن تكون موثوقة حتى يتم إدخال إنتاجية يومية قابلة للمراجعة.", suggestedProductivity: safeTarget(item.dailyProductivity, prodMed || 100) });
    }

    if (item.dailyRent <= 0 && rentMed > 0) {
      push({ itemId: item.id, category: "rent", severity: "medium", title: "استكمال إيجار/تكلفة المورد اليومية", rationale: `الإيجار صفر. وسيط البنود الحالية يقارب ${rentMed.toFixed(2)} ${currency} ويمكن استخدامه كنقطة بداية.`, suggestedRent: safeTarget(item.dailyRent, rentMed) });
    }

    if (item.dailyProductivity < 0 || item.dailyRent < 0 || item.costPerUnit < 0) {
      push({ itemId: item.id, category: "data_quality", severity: "high", title: "تصحيح قيمة سالبة", rationale: "وجود قيم سالبة في الإنتاجية أو الإيجار أو تكلفة الوحدة يسبب انحرافاً في الإجماليات والتقارير." });
    }

    if (prodMed > 0 && item.dailyProductivity > 0 && item.dailyProductivity < prodMed * 0.55) {
      const suggestedProductivity = safeTarget(item.dailyProductivity, prodMed);
      push({ itemId: item.id, category: "productivity", severity: "medium", title: "رفع الإنتاجية إلى مستوى البنود المشابهة", rationale: `الإنتاجية أقل بكثير من وسيط العينة (${prodMed.toFixed(2)}). راجع الطاقم أو طريقة التنفيذ.`, suggestedProductivity, estimatedSavingPct: pctSaving(item.costPerUnit, item.dailyRent / (suggestedProductivity || item.dailyProductivity)) });
    }

    if (costMed > 0 && item.costPerUnit > costMed * 1.75 && item.dailyProductivity > 0) {
      const targetRent = safeTarget(item.dailyRent, costMed * item.dailyProductivity);
      push({ itemId: item.id, category: "historical_price", severity: item.costPerUnit > costMed * 3 ? "high" : "medium", title: "مراجعة السعر مقابل الوسيط التاريخي/الداخلي", rationale: `تكلفة الوحدة أعلى من وسيط البنود (${costMed.toFixed(2)} ${currency})؛ اطلب سعر مورد أو مرجع تاريخي قبل الاعتماد.`, suggestedRent: targetRent, estimatedSavingPct: pctSaving(item.costPerUnit, targetRent ? targetRent / item.dailyProductivity : undefined) });
    }

    if (rentMed > 0 && item.dailyRent > rentMed * 1.6) {
      const suggestedRent = safeTarget(item.dailyRent, rentMed);
      push({ itemId: item.id, category: "supplier", severity: "medium", title: "طلب عرض مورد بديل", rationale: `الإيجار أعلى من وسيط العروض/البنود (${rentMed.toFixed(2)} ${currency}). قارن مع موردين اثنين على الأقل.`, suggestedRent, estimatedSavingPct: pctSaving(item.dailyRent, suggestedRent) });
    }

    const tokenGroup = tokenGroups.get(firstToken(item.name)) || [];
    if (tokenGroup.length >= 2 && item.costPerUnit > 0) {
      const groupMed = median(tokenGroup.map((i) => i.costPerUnit));
      if (groupMed > 0 && item.costPerUnit > groupMed * 1.45 && item.dailyProductivity > 0) {
        const suggestedRent = safeTarget(item.dailyRent, groupMed * item.dailyProductivity);
        push({ itemId: item.id, category: "unit_optimization", severity: "medium", title: "توحيد منطق تكلفة البنود المشابهة", rationale: `بنود تبدأ بنفس الوصف لها وسيط تكلفة ${groupMed.toFixed(2)} ${currency}. راجع الوحدة/المعادلة لهذا البند.`, suggestedRent, estimatedSavingPct: pctSaving(item.costPerUnit, suggestedRent ? suggestedRent / item.dailyProductivity : undefined) });
      }
    }

    if (nameCounts.get(normalizeName(item.name))! > 1) {
      push({ itemId: item.id, category: "scope", severity: "low", title: "دمج أو تمييز بند مكرر", rationale: "يوجد أكثر من بند بنفس الاسم؛ ميّز نطاق كل بند أو ادمجها لمنع تكرار التكلفة." });
    }

    if (costMed > 0 && item.costPerUnit > 0 && item.costPerUnit < costMed * 0.35) {
      push({ itemId: item.id, category: "quality", severity: "low", title: "مراجعة جودة/نطاق السعر المنخفض", rationale: "السعر أقل بكثير من الوسيط؛ تحقق من أن المواصفة، النقل، الاختبارات، والهامش مشمولة." });
    }

    if (topIds.has(item.id) && items.length >= 3) {
      push({ itemId: item.id, category: "bulk_discount", severity: "medium", title: "تجميع الكميات للحصول على خصم", rationale: "هذا البند ضمن أعلى البنود أثراً؛ اطلب تسعير كمية/مدة مجمّعة بدلاً من سعر يومي منفصل.", estimatedSavingPct: 5 });
    }

    if (hasAny(item.name, ["خرسانة", "concrete", "حديد", "rebar", "بلاط", "سيراميك", "tiles", "أسفلت", "asphalt"]) && (costMed === 0 || item.costPerUnit >= costMed)) {
      push({ itemId: item.id, category: "material_alternative", severity: "low", title: "فحص بديل مادة أو مواصفة مكافئة", rationale: "البند قابل غالباً للمقارنة بين مواصفات/مصادر مختلفة؛ اطلب بدائل معتمدة فنياً قبل تثبيت السعر.", estimatedSavingPct: 3 });
    }

    if (prodMed > 0 && rentMed > 0 && item.dailyProductivity > 0 && item.dailyProductivity < prodMed * 0.7 && item.dailyRent > rentMed) {
      const suggestedProductivity = safeTarget(item.dailyProductivity, prodMed);
      push({ itemId: item.id, category: "schedule", severity: "medium", title: "تقليل أثر مدة التنفيذ على الإيجار", rationale: "إنتاجية منخفضة مع إيجار أعلى من الوسيط؛ تحسين الجدولة أو مضاعفة الموارد قد يخفض أيام الإيجار.", suggestedProductivity, estimatedSavingPct: pctSaving(item.costPerUnit, item.dailyRent / (suggestedProductivity || item.dailyProductivity)) });
    }
  });

  if (wastePct > 12) {
    topByCost.forEach((item) => push({ itemId: item.id, category: "waste", severity: wastePct > 18 ? "high" : "medium", title: "خفض افتراض الهالك على البنود الأعلى أثراً", rationale: `الهالك الحالي ${wastePct}%. راجع القص/النقل/التخزين لهذا البند لأنه من الأعلى أثراً على الإجمالي.`, estimatedSavingPct: round2(Math.max(1, wastePct - 10)) }));
  }

  if (adminPct > 18 && topByCost[0]) {
    push({ itemId: topByCost[0].id, category: "contract_terms", severity: adminPct > 25 ? "high" : "medium", title: "مراجعة الإدارية والهامش قبل الاعتماد", rationale: `نسبة الإدارية/الهامش ${adminPct}%؛ اربطها بشروط الدفع والضمان والاحتجاز لتجنب تضخيم العرض.`, estimatedSavingPct: round2(Math.max(1, adminPct - 15)) });
  }

  if (items.length >= 6 && topByCost[0]) {
    push({ itemId: topByCost[0].id, category: "cash_flow", severity: "low", title: "ربط البند الأعلى أثراً بخطة الدفع", rationale: "رتّب دفعات المورد أو المعدة حسب تقدم التنفيذ حتى لا يضغط البند الأكبر على التدفق النقدي." });
  }

  return mergeSuggestions(out).slice(0, 48);
}

export function AiCostAdvisorPanel({
  items,
  currency,
  wastePct,
  adminPct,
  onApply,
  storageKey = DEFAULT_KEY,
}: Props) {
  const [stored, setStored] = useState<Stored[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Stored | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {}
  }, [stored, storageKey]);

  const persist = (next: Stored[]) => setStored(next);

  const fetchSuggestions = async () => {
    if (items.length === 0) {
      toast.error("لا توجد بنود لتحليلها");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cost-optimizer-ai", {
        body: { items, currency, wastePct, adminPct, language: "ar" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const list: AiSuggestion[] = data?.suggestions ?? [];
      if (list.length === 0) {
        toast.info("لم تُرجع المهمة أي اقتراحات");
        return;
      }
      const existingMap = new Map(stored.map((s) => [s.id, s]));
      const merged: Stored[] = list.map((s) => {
        const id = makeId(s);
        const prev = existingMap.get(id);
        return prev ? { ...prev, s } : { id, s, decision: "pending" as Decision };
      });
      const newIds = new Set(merged.map((m) => m.id));
      const kept = stored.filter((s) => s.decision !== "pending" && !newIds.has(s.id));
      persist([...merged, ...kept]);
      toast.success(`تم استلام ${list.length} اقتراح`);
    } catch (e) {
      console.error(e);
      toast.error("فشل توليد الاقتراحات");
    } finally {
      setLoading(false);
    }
  };

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const setDecision = (id: string, decision: Decision, patch?: Partial<Stored>) => {
    persist(
      stored.map((s) =>
        s.id === id
          ? { ...s, decision, decidedAt: new Date().toISOString(), ...patch }
          : s,
      ),
    );
  };

  const buildPatch = (s: AiSuggestion) => {
    const patch: { dailyProductivity?: number; dailyRent?: number } = {};
    if (typeof s.suggestedProductivity === "number")
      patch.dailyProductivity = s.suggestedProductivity;
    if (typeof s.suggestedRent === "number") patch.dailyRent = s.suggestedRent;
    return patch;
  };

  const applyAndApprove = (st: Stored) => {
    const patch = buildPatch(st.s);
    const item = itemMap.get(st.s.itemId);
    const previousPatch = item
      ? { dailyProductivity: item.dailyProductivity, dailyRent: item.dailyRent }
      : undefined;
    if (Object.keys(patch).length === 0) {
      toast.message("لا توجد قيم رقمية للتطبيق");
      setDecision(st.id, "approved");
      return;
    }
    onApply(st.s.itemId, patch);
    setDecision(st.id, "approved", { previousPatch });
    toast.success("تم التطبيق والموافقة");
  };

  const applyToSimilar = (st: Stored) => {
    const patch = buildPatch(st.s);
    if (Object.keys(patch).length === 0) {
      toast.info("لا توجد قيم رقمية لتطبيقها على المشابهة");
      return;
    }
    const src = itemMap.get(st.s.itemId);
    if (!src) return;
    const token = firstToken(src.name);
    const targets = items.filter((i) => i.id !== src.id && firstToken(i.name) === token);
    if (targets.length === 0) {
      toast.info("لا توجد بنود مشابهة");
      return;
    }
    targets.forEach((t) => onApply(t.id, patch));
    onApply(st.s.itemId, patch);
    setDecision(st.id, "approved");
    toast.success(`طُبِّق على ${targets.length + 1} بند مشابه`);
  };

  const postpone = (st: Stored) => {
    setDecision(st.id, "postponed");
    toast.message("تم التأجيل");
  };

  const undoDecision = (st: Stored) => {
    if (st.decision === "approved" && st.previousPatch) {
      onApply(st.s.itemId, st.previousPatch);
    }
    setDecision(st.id, "pending", { reason: undefined, previousPatch: undefined });
    toast.success("تم التراجع");
  };

  const openReject = (st: Stored) => {
    setRejectTarget(st);
    setRejectReason("");
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    setDecision(rejectTarget.id, "rejected", { reason: rejectReason.trim() || undefined });
    setRejectTarget(null);
    setRejectReason("");
  };

  const pending = stored.filter((s) => s.decision === "pending");
  const approved = stored.filter((s) => s.decision === "approved");
  const rejected = stored.filter((s) => s.decision === "rejected");
  const postponed = stored.filter((s) => s.decision === "postponed");

  const renderRow = (st: Stored, mode: "pending" | "postponed" | "done") => {
    const item = itemMap.get(st.s.itemId);
    return (
      <div
        key={st.id}
        className="p-3 rounded-md border border-border bg-card hover:bg-muted/30 transition"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLE[st.s.severity]}`}>
                {st.s.severity === "high" ? "عالي" : st.s.severity === "medium" ? "متوسط" : "منخفض"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {CAT_LABEL[st.s.category]}
              </Badge>
              {typeof st.s.estimatedSavingPct === "number" && st.s.estimatedSavingPct > 0 && (
                <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                  توفير ~{st.s.estimatedSavingPct.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium mt-1 truncate">{st.s.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {st.s.rationale}
            </p>
            {item && (
              <p className="text-[11px] text-muted-foreground mt-1">
                البند: <span className="font-medium text-foreground">{item.name}</span> ·
                تكلفة حالية:{" "}
                <span className="font-mono">
                  {item.costPerUnit.toFixed(2)} {currency}
                </span>
              </p>
            )}
            {(st.s.suggestedProductivity != null || st.s.suggestedRent != null) && (
              <div className="flex gap-2 mt-1 text-[11px]">
                {st.s.suggestedProductivity != null && (
                  <span className="font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    إنتاجية → {st.s.suggestedProductivity}
                  </span>
                )}
                {st.s.suggestedRent != null && (
                  <span className="font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    إيجار → {st.s.suggestedRent}
                  </span>
                )}
              </div>
            )}
            {st.reason && (
              <p className="text-[11px] mt-1 flex items-start gap-1 text-muted-foreground">
                <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                <span>سبب: {st.reason}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {mode === "pending" && (
              <>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => applyAndApprove(st)}>
                  <Check className="w-3 h-3 ml-1" />
                  موافقة وتطبيق
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => applyToSimilar(st)}
                >
                  <Copy className="w-3 h-3 ml-1" />
                  تطبيق على المشابهة
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => postpone(st)}
                >
                  <Clock className="w-3 h-3 ml-1" />
                  تأجيل
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={() => openReject(st)}
                >
                  <X className="w-3 h-3 ml-1" />
                  رفض بسبب
                </Button>
              </>
            )}
            {mode === "postponed" && (
              <>
                <Button size="sm" className="h-7 px-2 text-xs" onClick={() => applyAndApprove(st)}>
                  <Check className="w-3 h-3 ml-1" />
                  تطبيق الآن
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setDecision(st.id, "pending")}
                >
                  <ChevronRight className="w-3 h-3 ml-1" />
                  إرجاع
                </Button>
              </>
            )}
            {mode === "done" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => undoDecision(st)}
              >
                <Undo2 className="w-3 h-3 ml-1" />
                تراجع
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const emptyState = (msg: string) => (
    <p className="text-xs text-muted-foreground text-center py-6">{msg}</p>
  );

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              مستشار التكاليف الذكي
              <Badge variant="outline" className="text-[10px] gap-1">
                <ShieldCheck className="w-3 h-3" />
                يتطلب الموافقة
              </Badge>
            </CardTitle>
            <Button size="sm" onClick={fetchSuggestions} disabled={loading} className="h-8">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 ml-1" />
              )}
              توليد اقتراحات
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid grid-cols-4 w-full max-w-xl mb-3">
              <TabsTrigger value="pending" className="text-xs">
                قيد المراجعة ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="postponed" className="text-xs">
                مؤجلة ({postponed.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">
                معتمدة ({approved.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">
                مرفوضة ({rejected.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <ScrollArea className="max-h-[400px] pr-2">
                {pending.length === 0
                  ? emptyState('لا توجد اقتراحات قيد المراجعة. اضغط "توليد اقتراحات" للبدء.')
                  : <div className="space-y-2">{pending.map((s) => renderRow(s, "pending"))}</div>}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="postponed">
              <ScrollArea className="max-h-[400px] pr-2">
                {postponed.length === 0
                  ? emptyState("لا توجد اقتراحات مؤجلة.")
                  : <div className="space-y-2">{postponed.map((s) => renderRow(s, "postponed"))}</div>}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="approved">
              <ScrollArea className="max-h-[400px] pr-2">
                {approved.length === 0
                  ? emptyState("لا توجد اقتراحات معتمدة بعد.")
                  : <div className="space-y-2">{approved.map((s) => renderRow(s, "done"))}</div>}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rejected">
              <ScrollArea className="max-h-[400px] pr-2">
                {rejected.length === 0
                  ? emptyState("لا توجد اقتراحات مرفوضة.")
                  : <div className="space-y-2">{rejected.map((s) => renderRow(s, "done"))}</div>}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الاقتراح مع سبب</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">سبب الرفض (اختياري)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: السعر التاريخي غير مناسب للمنطقة"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
