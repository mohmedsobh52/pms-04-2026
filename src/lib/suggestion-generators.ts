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

/** Risk-module suggestions. */
export function buildRiskSuggestions(risks: any[]): Draft[] {
  const out: Draft[] = [];
  const screen = "risk";
  if (!risks?.length) return out;

  const high = risks.filter((r) => {
    const s = Number(r.risk_score) || (Number(r.probability_score) || 0) * (Number(r.impact_score) || 0);
    return s >= 15 && r.status !== "mitigated" && r.status !== "closed";
  });
  if (high.length) {
    out.push({
      category: "workflow",
      severity: "critical",
      title: `${high.length} مخاطر عالية بدون معالجة`,
      description: "يوصى بإضافة خطط استجابة فورية.",
      sourceScreen: screen,
      sourceRoute: "/risk",
      applyLabel: "فتح إدارة المخاطر",
    });
  }

  const now = Date.now();
  const dueSoon = risks.filter((r) => {
    if (!r.review_date) return false;
    const t = new Date(r.review_date).getTime();
    return t >= now && t <= now + 14 * 86_400_000;
  });
  if (dueSoon.length) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${dueSoon.length} مخاطر مستحقة المراجعة خلال 14 يوماً`,
      sourceScreen: screen,
      sourceRoute: "/risk",
    });
  }

  const noOwner = risks.filter((r) => !r.owner && !r.assigned_to);
  if (noOwner.length >= 3) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: `${noOwner.length} مخاطر بدون مسؤول مُعيَّن`,
      sourceScreen: screen,
    });
  }

  return out;
}

/** Contracts-module suggestions. */
export function buildContractsSuggestions(stats: {
  expiringContracts?: number;
  overdueContracts?: number;
  duePayments?: number;
  duePaymentsAmount?: number;
  upcomingMilestones?: number;
  totalContracts?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "contracts";

  if ((stats.overdueContracts ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "critical",
      title: `${stats.overdueContracts} عقد متأخر عن تاريخ الانتهاء`,
      sourceScreen: screen,
      sourceRoute: "/contracts",
      applyLabel: "فتح العقود",
    });
  }
  if ((stats.expiringContracts ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${stats.expiringContracts} عقد ينتهي خلال 30 يوماً`,
      sourceScreen: screen,
      sourceRoute: "/contracts",
    });
  }
  if ((stats.duePayments ?? 0) > 0) {
    out.push({
      category: "reports",
      severity: "warning",
      title: `${stats.duePayments} دفعة مستحقة قريباً`,
      description: (stats.duePaymentsAmount ?? 0) > 0
        ? `إجمالي المستحق: ${stats.duePaymentsAmount!.toLocaleString()}`
        : undefined,
      sourceScreen: screen,
      sourceRoute: "/contracts",
    });
  }
  if ((stats.upcomingMilestones ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "info",
      title: `${stats.upcomingMilestones} معالم قادمة خلال 30 يوماً`,
      sourceScreen: screen,
      sourceRoute: "/contracts",
    });
  }
  return out;
}

/** Procurement-module suggestions. */
export function buildProcurementSuggestions(input: {
  partnersCount: number;
  contractsCount: number;
  offersCount: number;
  contractsValue: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "procurement";

  if (input.partnersCount === 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "لا يوجد موردون مسجلون",
      description: "أضف الموردين لمقارنة الأسعار والحصول على أفضل العروض.",
      sourceScreen: screen,
      sourceRoute: "/procurement",
      applyLabel: "إضافة موردين",
    });
  }
  if (input.partnersCount > 0 && input.offersCount === 0) {
    out.push({
      category: "ai-pricing",
      severity: "info",
      title: "لم يتم طلب أي عرض سعر بعد",
      description: "أرسل طلبات عروض لمقارنة أسعار الموردين تلقائياً.",
      sourceScreen: screen,
      sourceRoute: "/quotations",
      applyLabel: "فتح عروض الأسعار",
    });
  }
  if (input.contractsCount >= 5 && input.contractsValue > 0) {
    out.push({
      category: "reports",
      severity: "info",
      title: "جاهز لتقرير تحليل موردين",
      description: `${input.contractsCount} عقد بإجمالي ${input.contractsValue.toLocaleString()}`,
      sourceScreen: screen,
    });
  }
  return out;
}

/** Approvals-inbox suggestions. */
export function buildApprovalsSuggestions(input: {
  pendingCount: number;
  myPendingCount: number;
  oldestPendingDays?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "approvals";
  if (input.myPendingCount > 0) {
    out.push({
      category: "workflow",
      severity: input.myPendingCount >= 5 ? "critical" : "warning",
      title: `${input.myPendingCount} طلب موافقة بانتظار قرارك`,
      sourceScreen: screen,
      sourceRoute: "/approvals",
      applyLabel: "فتح صندوق الموافقات",
    });
  }
  if ((input.oldestPendingDays ?? 0) >= 7) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `طلبات موافقة معلّقة منذ ${input.oldestPendingDays} يوم`,
      description: "قد يؤثر التأخر على الجدول الزمني للمشروع.",
      sourceScreen: screen,
      sourceRoute: "/approvals",
    });
  }
  return out;
}

/** Material-prices suggestions. */
export function buildMaterialPricesSuggestions(input: {
  total: number;
  verified: number;
  expiringCount: number;
  expiredCount: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "material-prices";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "قاعدة بيانات الأسعار فارغة",
      description: "استورد أسعاراً من Excel أو ابحث في السوق للبدء.",
      sourceScreen: screen,
      sourceRoute: "/material-prices",
    });
    return out;
  }
  if (input.expiredCount > 0) {
    out.push({
      category: "data-quality",
      severity: "critical",
      title: `${input.expiredCount} سعر منتهي الصلاحية`,
      sourceScreen: screen,
      sourceRoute: "/material-prices",
      applyLabel: "تحديث الأسعار",
    });
  }
  if (input.expiringCount > 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: `${input.expiringCount} سعر ينتهي خلال 30 يوماً`,
      sourceScreen: screen,
      sourceRoute: "/material-prices",
    });
  }
  const verifiedPct = input.total > 0 ? (input.verified / input.total) * 100 : 0;
  if (input.total >= 20 && verifiedPct < 50) {
    out.push({
      category: "ai-pricing",
      severity: "info",
      title: `فقط ${verifiedPct.toFixed(0)}% من الأسعار موثّقة`,
      description: "راجع الأسعار لضمان دقة تقديرات المشاريع.",
      sourceScreen: screen,
    });
  }
  return out;
}

/** Quotations-module suggestions. */
export function buildQuotationsSuggestions(input: {
  total: number;
  approved: number;
  pending: number;
  suppliers: number;
  totalValue?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "quotations";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "لا توجد عروض أسعار مسجّلة بعد",
      description: "ارفع عرض سعر أو أنشئ طلب عروض لبدء المقارنة.",
      sourceScreen: screen,
      sourceRoute: "/quotations",
      applyLabel: "رفع عرض سعر",
    });
    return out;
  }
  if (input.pending > 0) {
    out.push({
      category: "workflow",
      severity: input.pending >= 5 ? "warning" : "info",
      title: `${input.pending} عرض سعر بانتظار المراجعة`,
      sourceScreen: screen,
      sourceRoute: "/quotations",
    });
  }
  if (input.suppliers < 3 && input.total >= 3) {
    out.push({
      category: "ai-pricing",
      severity: "info",
      title: `عدد الموردين محدود (${input.suppliers})`,
      description: "يوصى بالحصول على 3 عروض على الأقل لكل بند.",
      sourceScreen: screen,
    });
  }
  if (input.approved === 0 && input.total >= 3) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: "لا يوجد عرض معتمَد",
      description: "اعتمد أفضل عرض لتفعيل مسار التعاقد.",
      sourceScreen: screen,
      sourceRoute: "/quotations",
    });
  }
  return out;
}

/** Certificates (progress-billing) suggestions. */
export function buildCertificatesSuggestions(input: {
  total: number;
  draft: number;
  approved: number;
  totalNet?: number;
  overdueReviewDays?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "certificates";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لم يتم إصدار مستخلصات بعد",
      description: "ابدأ بإنشاء مستخلص أول لتتبع الإنجاز المالي.",
      sourceScreen: screen,
      sourceRoute: "/progress-certificates",
      applyLabel: "إنشاء مستخلص",
    });
    return out;
  }
  if (input.draft > 0) {
    out.push({
      category: "workflow",
      severity: input.draft >= 3 ? "warning" : "info",
      title: `${input.draft} مستخلص في وضع المسودة`,
      description: "أرسله للاعتماد لتحديث التدفق النقدي.",
      sourceScreen: screen,
      sourceRoute: "/progress-certificates",
    });
  }
  if (input.total >= 2) {
    out.push({
      category: "reports",
      severity: "info",
      title: "جاهز لعرض منحنى S المقارن",
      description: "قارن الإنجاز الفعلي مع المخطط.",
      sourceScreen: screen,
      sourceRoute: "/certificates-compare",
      applyLabel: "فتح المقارنة",
    });
  }
  return out;
}

/** Resources / scheduling suggestions. */
export function buildResourcesSuggestions(input: {
  total: number;
  overallocated?: number;
  unassigned?: number;
  utilizationAvg?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "resources";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لم تُضف موارد بعد",
      description: "أضف عمالة/معدات/مواد لتفعيل تحليل التحميل.",
      sourceScreen: screen,
      sourceRoute: "/resources",
    });
    return out;
  }
  if ((input.overallocated ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "critical",
      title: `${input.overallocated} مورد بحمل زائد (>100%)`,
      description: "شغّل الموازنة التلقائية لإعادة التوزيع.",
      sourceScreen: screen,
      sourceRoute: "/resources",
      applyLabel: "موازنة الموارد",
    });
  }
  if ((input.unassigned ?? 0) >= 3) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: `${input.unassigned} مورد بدون ربط ببند`,
      sourceScreen: screen,
    });
  }
  if ((input.utilizationAvg ?? 0) > 0 && (input.utilizationAvg ?? 0) < 40) {
    out.push({
      category: "reports",
      severity: "info",
      title: `متوسط استغلال الموارد منخفض (${(input.utilizationAvg ?? 0).toFixed(0)}%)`,
      description: "راجع الجدول الزمني لتقليل الفترات الخاملة.",
      sourceScreen: screen,
    });
  }
  return out;
}

/** Attachments / documents suggestions. */
export function buildAttachmentsSuggestions(input: {
  total: number;
  expiringSoon?: number;
  expired?: number;
  missingCategory?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "attachments";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لم يتم رفع مرفقات بعد",
      description: "ارفع العقود والرسومات والشهادات لأرشفة مركزية.",
      sourceScreen: screen,
      sourceRoute: "/attachments",
    });
    return out;
  }
  if ((input.expired ?? 0) > 0) {
    out.push({
      category: "data-quality",
      severity: "critical",
      title: `${input.expired} مستند منتهي الصلاحية`,
      sourceScreen: screen,
      sourceRoute: "/attachments",
    });
  }
  if ((input.expiringSoon ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${input.expiringSoon} مستند ينتهي خلال 30 يوماً`,
      sourceScreen: screen,
      sourceRoute: "/attachments",
    });
  }
  if ((input.missingCategory ?? 0) >= 5) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: `${input.missingCategory} مستند بدون تصنيف`,
      sourceScreen: screen,
    });
  }
  return out;
}

/** Subcontractors suggestions. */
export function buildSubcontractorsSuggestions(input: {
  total: number;
  active?: number;
  expiringContracts?: number;
  lowRating?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "subcontractors";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا يوجد مقاولون من الباطن مسجّلون",
      sourceScreen: screen,
      sourceRoute: "/subcontractors",
    });
    return out;
  }
  if ((input.expiringContracts ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${input.expiringContracts} عقد باطن ينتهي قريباً`,
      sourceScreen: screen,
      sourceRoute: "/subcontractors",
    });
  }
  if ((input.lowRating ?? 0) > 0) {
    out.push({
      category: "reports",
      severity: "info",
      title: `${input.lowRating} مقاول بتقييم منخفض (<3)`,
      description: "راجع الأداء قبل التجديد.",
      sourceScreen: screen,
    });
  }
  return out;
}

/** Reports-module suggestions. */
export function buildReportsHubSuggestions(input: {
  totalReports?: number;
  scheduledReports?: number;
  lastGeneratedDaysAgo?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "reports";
  if ((input.scheduledReports ?? 0) === 0) {
    out.push({
      category: "reports",
      severity: "info",
      title: "لم تجدول أي تقرير دوري",
      description: "فعّل جدولة أسبوعية/شهرية لأصحاب المصلحة.",
      sourceScreen: screen,
      sourceRoute: "/reports",
    });
  }
  if ((input.lastGeneratedDaysAgo ?? 0) > 14) {
    out.push({
      category: "reports",
      severity: "warning",
      title: `آخر تقرير منذ ${input.lastGeneratedDaysAgo} يوماً`,
      sourceScreen: screen,
      sourceRoute: "/reports",
    });
  }
  return out;
}

/** Calendar suggestions — overdue/upcoming/no milestones. */
export function buildCalendarSuggestions(input: {
  overdue?: number;
  upcoming?: number;
  projects?: number;
  contracts?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "calendar";
  if ((input.overdue ?? 0) > 0) {
    out.push({
      category: "workflow",
      severity: (input.overdue ?? 0) >= 5 ? "critical" : "warning",
      title: `${input.overdue} عنصر متأخر عن موعده`,
      description: "راجع المشاريع/العقود المتأخرة وحدّث خطة الإنجاز.",
      sourceScreen: screen,
      sourceRoute: "/calendar",
    });
  }
  if ((input.upcoming ?? 0) >= 10) {
    out.push({
      category: "workflow",
      severity: "info",
      title: `${input.upcoming} استحقاق خلال 30 يوماً`,
      description: "خطّط للموارد وتأكد من جاهزية الفرق للتسليم.",
      sourceScreen: screen,
      sourceRoute: "/calendar",
    });
  }
  if ((input.projects ?? 0) === 0 && (input.contracts ?? 0) === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا توجد تواريخ مسجّلة",
      description: "أضف تواريخ بداية/نهاية للمشاريع والعقود لتفعيل التقويم.",
      sourceScreen: screen,
      sourceRoute: "/calendar",
    });
  }
  return out;
}

/** Dashboard suggestions — highlight empty state / health. */
export function buildDashboardSuggestions(input: {
  projects?: number;
  activeProjects?: number;
  totalValue?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "dashboard";
  if ((input.projects ?? 0) === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا توجد مشاريع بعد",
      description: "ابدأ بإنشاء مشروع جديد أو استيراد BOQ.",
      sourceScreen: screen,
      sourceRoute: "/new-project",
    });
  }
  if ((input.projects ?? 0) > 0 && (input.activeProjects ?? 0) === 0) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: "لا توجد مشاريع نشطة حالياً",
      description: "فعّل أو حدّث حالة المشاريع لمتابعتها.",
      sourceScreen: screen,
      sourceRoute: "/projects",
    });
  }
  return out;
}

/** Library suggestions — empty catalog / stale pricing. */
export function buildLibrarySuggestions(input: {
  materials?: number;
  labor?: number;
  equipment?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "library";
  const total = (input.materials ?? 0) + (input.labor ?? 0) + (input.equipment ?? 0);
  if (total === 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "المكتبة فارغة",
      description: "أضف مواد/عمالة/معدات لبناء قاعدة تسعير موثوقة.",
      sourceScreen: screen,
      sourceRoute: "/library",
    });
  }
  if ((input.materials ?? 0) > 0 && (input.labor ?? 0) === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا توجد معدلات عمالة مسجّلة",
      sourceScreen: screen,
      sourceRoute: "/library",
    });
  }
  if ((input.materials ?? 0) > 0 && (input.equipment ?? 0) === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا توجد معدلات معدات مسجّلة",
      sourceScreen: screen,
      sourceRoute: "/library",
    });
  }
  return out;
}

/** Templates suggestions — usage / publishing / emptiness. */
export function buildTemplatesSuggestions(input: {
  total?: number;
  totalUsage?: number;
  publicCount?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "templates";
  if ((input.total ?? 0) === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا توجد قوالب بعد",
      description: "احفظ تحليلاتك المتكررة كقوالب لتسريع المشاريع القادمة.",
      sourceScreen: screen,
      sourceRoute: "/templates",
    });
    return out;
  }
  if ((input.totalUsage ?? 0) === 0) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "لم تُستخدم أي قالب بعد",
      description: "طبّق قالباً على مشروع جديد لتوفير الوقت.",
      sourceScreen: screen,
      sourceRoute: "/templates",
    });
  }
  if ((input.total ?? 0) >= 5 && (input.publicCount ?? 0) === 0) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "لا توجد قوالب عامة",
      description: "شارك بعض القوالب مع الفريق لتعظيم الاستفادة.",
      sourceScreen: screen,
      sourceRoute: "/templates",
    });
  }
  return out;
}

/** Pricing-accuracy suggestions. */
export function buildPricingAccuracySuggestions(input: {
  total: number;
  approved: number;
  avgAccuracy: number;
  avgDeviation: number;
  highConfidence: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "pricing-accuracy";
  if (input.total === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا يوجد سجل تسعير بعد",
      description: "استخدم التسعير الذكي على البنود لبناء قاعدة دقة قابلة للقياس.",
      sourceScreen: screen,
      sourceRoute: "/pricing-accuracy",
    });
    return out;
  }
  if (input.avgAccuracy > 0 && input.avgAccuracy < 70) {
    out.push({
      category: "ai-pricing",
      severity: "warning",
      title: `متوسط دقة التسعير منخفض (${input.avgAccuracy}%)`,
      description: "راجع مصادر الأسعار وحدّث المكتبة والأسعار السوقية.",
      sourceScreen: screen,
      sourceRoute: "/pricing-accuracy",
    });
  }
  if (input.avgDeviation >= 20) {
    out.push({
      category: "ai-pricing",
      severity: "critical",
      title: `انحراف عالٍ بين المُقترح والنهائي (${input.avgDeviation}%)`,
      description: "افحص بنود القمم في قائمة الانحرافات.",
      sourceScreen: screen,
      sourceRoute: "/pricing-accuracy",
    });
  }
  const highPct = input.total > 0 ? (input.highConfidence / input.total) * 100 : 0;
  if (input.total >= 20 && highPct < 40) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: `فقط ${highPct.toFixed(0)}% من التسعيرات بثقة عالية`,
      description: "أضف مراجع ومصادر لرفع مستوى الثقة.",
      sourceScreen: screen,
    });
  }
  return out;
}

/** Historical-pricing suggestions. */
export function buildHistoricalPricingSuggestions(input: {
  totalFiles: number;
  verifiedFiles: number;
  totalItems: number;
  oldestYears?: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "historical-pricing";
  if (input.totalFiles === 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "لا يوجد مرجع تسعير تاريخي",
      description: "ارفع مشاريع سابقة لمقارنة الأسعار وضبط تقديراتك.",
      sourceScreen: screen,
      sourceRoute: "/historical-pricing",
      applyLabel: "رفع ملف تاريخي",
    });
    return out;
  }
  const verifiedPct = (input.verifiedFiles / input.totalFiles) * 100;
  if (input.totalFiles >= 3 && verifiedPct < 50) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: `فقط ${verifiedPct.toFixed(0)}% من المراجع التاريخية مُوثَّقة`,
      description: "راجع وأكّد المشاريع لرفع جودة المقارنة.",
      sourceScreen: screen,
    });
  }
  if ((input.oldestYears ?? 0) >= 3) {
    out.push({
      category: "ai-pricing",
      severity: "info",
      title: `بعض الأسعار المرجعية أقدم من ${input.oldestYears} سنوات`,
      description: "طبّق تعديل تضخم/سوق قبل الاعتماد عليها.",
      sourceScreen: screen,
    });
  }
  if (input.totalItems >= 100) {
    out.push({
      category: "reports",
      severity: "info",
      title: "قاعدة تاريخية غنية جاهزة للتحليل",
      description: `${input.totalItems} بند مرجعي متاح — أنشئ تقرير اتجاهات أسعار.`,
      sourceScreen: screen,
      sourceRoute: "/historical-pricing",
    });
  }
  return out;
}

/** Executive-summary suggestions. */
export function buildExecutiveSummarySuggestions(input: {
  projects: number;
  contractsValue: number;
  certifiedValue: number;
  openRisks: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "executive-summary";
  if (input.projects === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "لا توجد مشاريع لعرضها في الملخص التنفيذي",
      sourceScreen: screen,
      sourceRoute: "/new-project",
    });
    return out;
  }
  if (input.openRisks >= 5) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${input.openRisks} مخاطر مفتوحة تستدعي متابعة تنفيذية`,
      sourceScreen: screen,
      sourceRoute: "/risk",
    });
  }
  if (input.contractsValue > 0 && input.certifiedValue / input.contractsValue < 0.2 && input.projects >= 2) {
    out.push({
      category: "reports",
      severity: "info",
      title: "نسبة الاستخلاص منخفضة مقارنة بالعقود",
      description: `المُستخلَص ${input.certifiedValue.toLocaleString()} من عقود ${input.contractsValue.toLocaleString()}`,
      sourceScreen: screen,
      sourceRoute: "/progress-certificates",
    });
  }
  out.push({
    category: "reports",
    severity: "info",
    title: "تصدير الملخص التنفيذي كملف PDF",
    description: "شارك المؤشرات مع الإدارة العليا في نقرة واحدة.",
    sourceScreen: screen,
    sourceRoute: "/executive-summary",
    applyLabel: "طباعة PDF",
  });
  return out;
}

/** Projects-compare suggestions. */
export function buildProjectsCompareSuggestions(input: {
  total: number;
  selected: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "projects-compare";
  if (input.total < 2) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "أنشئ مشروعين على الأقل لتفعيل المقارنة",
      sourceScreen: screen,
      sourceRoute: "/new-project",
    });
    return out;
  }
  if (input.selected < 2) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "اختر مشروعين للمقارنة الفورية",
      description: `${input.total} مشروع متاح — قارن الأداء والقيم.`,
      sourceScreen: screen,
      sourceRoute: "/projects-compare",
    });
  }
  if (input.total >= 5) {
    out.push({
      category: "reports",
      severity: "info",
      title: "قاعدة مشاريع غنية — أنشئ تقرير Portfolio",
      sourceScreen: screen,
      sourceRoute: "/executive-summary",
    });
  }
  return out;
}

/** Fast-extraction suggestions. */
export function buildFastExtractionSuggestions(input: {
  filesCount: number;
  readyCount: number;
  drawingsCount: number;
  step: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "fast-extraction";
  if (input.filesCount === 0) {
    out.push({
      category: "data-quality",
      severity: "info",
      title: "ابدأ برفع ملفات BOQ أو مخططات لاستخراج تلقائي",
      sourceScreen: screen,
      sourceRoute: "/fast-extraction",
    });
    return out;
  }
  if (input.readyCount < input.filesCount) {
    out.push({
      category: "workflow",
      severity: "warning",
      title: `${input.filesCount - input.readyCount} ملف لم يكتمل رفعه بعد`,
      sourceScreen: screen,
    });
  }
  if (input.drawingsCount > 0 && input.step < 3) {
    out.push({
      category: "ai-pricing",
      severity: "info",
      title: `${input.drawingsCount} مخطط جاهز لاستخراج الكميات بالذكاء الاصطناعي`,
      sourceScreen: screen,
    });
  }
  if (input.readyCount >= 1 && input.step >= 4) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "الاستخراج مكتمل — اربط البيانات بمشروع",
      sourceScreen: screen,
      sourceRoute: "/new-project",
    });
  }
  return out;
}

/** Tender-summary suggestions. */
export function buildTenderSummarySuggestions(input: {
  contractValue: number;
  profitMargin: number;
  contingency: number;
  riskLevel?: string;
  itemsCount: number;
}): Draft[] {
  const out: Draft[] = [];
  const screen = "tender-summary";
  if (input.itemsCount === 0) return out;
  if (input.contractValue === 0) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "لم يُحدَّد قيمة العقد المستهدفة",
      description: "أدخل قيمة العقد لحساب هامش الربح والاحتياطي.",
      sourceScreen: screen,
    });
  }
  if (input.profitMargin > 0 && input.profitMargin < 5) {
    out.push({
      category: "reports",
      severity: "warning",
      title: `هامش ربح منخفض (${input.profitMargin}%)`,
      description: "الحد الآمن عادةً ≥ 8% — راجع التسعير أو التكاليف غير المباشرة.",
      sourceScreen: screen,
    });
  }
  if (input.contingency > 0 && input.contingency < 3) {
    out.push({
      category: "workflow",
      severity: "info",
      title: `احتياطي طوارئ منخفض (${input.contingency}%)`,
      description: "زد الاحتياطي عند وجود مخاطر جدولة أو تضخم.",
      sourceScreen: screen,
    });
  }
  if (input.riskLevel === "high" || input.riskLevel === "very_high") {
    out.push({
      category: "workflow",
      severity: "critical",
      title: "مستوى المخاطر مرتفع — راجع خطط الاستجابة",
      sourceScreen: screen,
      sourceRoute: "/risk",
    });
  }
  return out;
}

export function buildTechnicalProposalSuggestions(input: {
  historyCount: number;
  hasCurrent: boolean;
  sectionsSelected: number;
  totalSections: number;
  hasClient: boolean;
  hasScope: boolean;
}, screen = "technical-proposal"): Draft[] {
  const out: Draft[] = [];
  if (input.historyCount === 0) {
    out.push({
      category: "workflow",
      severity: "info",
      title: "لا توجد عروض فنية محفوظة",
      description: "ابدأ بإنشاء عرض فني جديد لتوليد مكتبة قابلة لإعادة الاستخدام.",
      sourceScreen: screen,
      sourceRoute: "/technical-proposal",
    });
  }
  if (input.hasCurrent && (!input.hasClient || !input.hasScope)) {
    out.push({
      category: "data-quality",
      severity: "warning",
      title: "بيانات العرض غير مكتملة",
      description: "أضف اسم العميل ونطاق الأعمال قبل توليد المستند.",
      sourceScreen: screen,
    });
  }
  if (input.sectionsSelected < Math.ceil(input.totalSections * 0.5)) {
    out.push({
      category: "reports",
      severity: "info",
      title: `عدد أقسام محدودة (${input.sectionsSelected}/${input.totalSections})`,
      description: "اختر أقسامًا إضافية لتقديم عرض أشمل واحترافي.",
      sourceScreen: screen,
    });
  }
  return out;
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
