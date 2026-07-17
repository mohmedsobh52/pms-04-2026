import type { GlobalSuggestion, SuggestionCategory, SuggestionSeverity } from "@/contexts/GlobalSuggestionsContext";

export interface GenericItem {
  id?: string | number;
  item_number?: string;
  description?: string;
  description_ar?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  productivity?: number;
  daily_rent?: number;
  ai_productivity?: number;
  ai_rent?: number;
  category?: string;
}

type Draft = Omit<GlobalSuggestion, "id" | "createdAt">;

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** AI pricing/productivity suggestions from items where AI diverges from local. */
export function buildAiPricingSuggestions(items: GenericItem[], screen = "cost-analysis"): Draft[] {
  const out: Draft[] = [];
  for (const it of items) {
    const unit = Number(it.unit_price) || 0;
    const ai = Number((it as any).ai_unit_price ?? it.ai_rent) || 0;
    if (!unit || !ai) continue;
    const gap = ((ai - unit) / unit) * 100;
    if (Math.abs(gap) >= 15) {
      out.push({
        category: "ai-pricing",
        severity: Math.abs(gap) >= 40 ? "critical" : "warning",
        title: `فجوة سعرية ${gap > 0 ? "+" : ""}${gap.toFixed(0)}% في: ${it.description_ar || it.description || it.item_number}`,
        description: `السعر الحالي ${unit.toLocaleString()} — اقتراح AI ${ai.toLocaleString()}`,
        sourceScreen: screen,
        applyLabel: "تطبيق سعر AI",
        meta: { itemId: it.id ?? it.item_number, suggested: ai, current: unit },
      });
    }
  }
  return out;
}

/** Data-quality suggestions: zero/duplicate/outliers/units. */
export function buildDataQualitySuggestions(items: GenericItem[], screen = "cost-analysis"): Draft[] {
  const out: Draft[] = [];
  const prices = items.map((i) => Number(i.unit_price) || 0).filter((v) => v > 0);
  const med = median(prices);

  const zero = items.filter((i) => !Number(i.unit_price));
  if (zero.length) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: `${zero.length} بند بدون سعر وحدة`,
      description: "تحتوي على قيم صفرية — يوصى بمراجعتها أو تعبئتها بالسوق/الذكاء الاصطناعي.",
      sourceScreen: screen,
      applyLabel: "فتح شاشة التسعير",
      meta: { count: zero.length },
    });
  }

  const noUnit = items.filter((i) => !i.unit || String(i.unit).trim() === "");
  if (noUnit.length) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: `${noUnit.length} بند بدون وحدة قياس`,
      sourceScreen: screen,
      meta: { count: noUnit.length },
    });
  }

  const names = new Map<string, number>();
  items.forEach((i) => {
    const k = (i.description_ar || i.description || "").trim().toLowerCase();
    if (!k) return;
    names.set(k, (names.get(k) || 0) + 1);
  });
  const dupes = [...names.values()].filter((v) => v > 1).length;
  if (dupes > 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: `${dupes} وصف بند مكرر`,
      description: "قد يشير إلى بنود مكررة يمكن دمجها.",
      sourceScreen: screen,
    });
  }

  if (med > 0) {
    const outliers = items.filter((i) => (Number(i.unit_price) || 0) > med * 5);
    if (outliers.length) {
      out.push({
        category: "data-quality",
        severity: "critical",
        title: `${outliers.length} بند بسعر شاذ (> 5× الوسيط)`,
        description: `الوسيط الحالي: ${med.toLocaleString()}`,
        sourceScreen: screen,
        meta: { median: med, count: outliers.length },
      });
    }
  }

  return out;
}

/** Workflow / approvals suggestions. */
export function buildWorkflowSuggestions(input: {
  itemsCount: number;
  approvedCount?: number;
  pendingCount?: number;
  hasBaseline?: boolean;
  screen?: string;
}): Draft[] {
  const out: Draft[] = [];
  const screen = input.screen ?? "cost-analysis";

  if (input.itemsCount > 0 && !input.hasBaseline) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "لا يوجد Baseline معتمد لهذا التحليل",
      description: "يوصى بإنشاء نسخة معتمدة قبل بدء المراقبة عبر EVM.",
      sourceRoute: "/cost-control-evm",
      sourceScreen: screen,
      applyLabel: "الذهاب لمراقبة التكاليف",
    });
  }

  if ((input.pendingCount ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${input.pendingCount} عنصر بانتظار الموافقة`,
      sourceRoute: "/approvals",
      sourceScreen: screen,
      applyLabel: "فتح صندوق الموافقات",
    });
  }

  if (input.itemsCount >= 20 && (input.approvedCount ?? 0) === 0) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "لم يبدأ سير موافقة على أي بند",
      description: "ابدأ سير العمل لضمان الحوكمة والتوثيق.",
      sourceScreen: screen,
    });
  }

  return out;
}

/** Reports / export suggestions. */
export function buildReportsSuggestions(input: {
  itemsCount: number;
  lastExportAt?: string | null;
  totalValue?: number;
  screen?: string;
}): Draft[] {
  const out: Draft[] = [];
  const screen = input.screen ?? "cost-analysis";
  if (input.itemsCount === 0) return out;

  const daysSince = input.lastExportAt
    ? (Date.now() - new Date(input.lastExportAt).getTime()) / 86_400_000
    : Infinity;

  if (daysSince > 7) {
    out.push({
      category: "reports",
      severity: "info",
      title: "لم يُصدَّر تقرير منذ أكثر من أسبوع",
      description: "يوصى بتصدير ملخص PDF/Excel لأصحاب المصلحة.",
      sourceScreen: screen,
      applyLabel: "تصدير PDF",
    });
  }

  if ((input.totalValue ?? 0) > 0 && input.itemsCount >= 10) {
    out.push({
      category: "reports",
      severity: "info",
      title: "جاهز لتوليد ملخص تنفيذي",
      description: "بنودك كافية لإنشاء تقرير تنفيذي مختصر مع مؤشرات KPI.",
      sourceRoute: "/executive-summary",
      sourceScreen: screen,
      applyLabel: "فتح الملخص التنفيذي",
    });
  }

  return out;
}

/** Convenience: build all four categories for a cost-analysis screen. */
export function buildAllForCostAnalysis(items: GenericItem[], extras?: {
  hasBaseline?: boolean;
  pendingCount?: number;
  approvedCount?: number;
  lastExportAt?: string | null;
}): Draft[] {
  const total = items.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
  return [
    ...buildAiPricingSuggestions(items),
    ...buildDataQualitySuggestions(items),
    ...buildWorkflowSuggestions({
      itemsCount: items.length,
      hasBaseline: extras?.hasBaseline,
      pendingCount: extras?.pendingCount,
      approvedCount: extras?.approvedCount,
    }),
    ...buildReportsSuggestions({
      itemsCount: items.length,
      totalValue: total,
      lastExportAt: extras?.lastExportAt,
    }),
  ];
}

export const CATEGORY_META: Record<SuggestionCategory, { ar: string; en: string; color: string }> = {
  "ai-pricing": { ar: "أسعار وإنتاجية (AI)", en: "AI Pricing", color: "text-violet-600" },
  "data-quality": { ar: "جودة البيانات", en: "Data Quality", color: "text-amber-600" },
  workflow: { ar: "سير العمل والموافقات", en: "Workflow", color: "text-sky-600" },
  reports: { ar: "تقارير وتصدير", en: "Reports", color: "text-emerald-600" },
};

export const SEVERITY_META: Record<SuggestionSeverity, { ar: string; badge: string }> = {
  info: { ar: "معلومة", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  warning: { ar: "تنبيه", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  critical: { ar: "حرج", badge: "bg-destructive/15 text-destructive" },
  success: { ar: "إنجاز", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};
