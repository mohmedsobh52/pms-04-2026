import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calculator,
  Coins,
  Percent,
  Receipt,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PiggyBank,
  Gauge,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  Wallet,
} from "lucide-react";
import type { DerivedTotals } from "@/lib/cost-analysis/derive-totals";

interface Props {
  totals: DerivedTotals;
  currency: string;
  suggestionsCount?: number;
  expectedSaving?: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

export function CostKpiGrid({
  totals,
  currency,
  suggestionsCount = 0,
  expectedSaving = 0,
}: Props) {
  const savingPct = totals.grandTotal > 0 ? (expectedSaving / totals.grandTotal) * 100 : 0;

  const kpis: KpiDef[] = [
    {
      label: "عدد البنود",
      value: String(totals.itemsCount),
      icon: <Calculator className="w-4 h-4" />,
      tone: "primary",
      tip: "إجمالي عدد بنود التحليل الحالية. الحد المقبول: ≥ 1. الإجراء: أضف بنداً جديداً إذا كانت القائمة فارغة.",
    },
    {
      label: "متوسط تكلفة الوحدة",
      value: `${fmt(totals.avgUnitCost)} ${currency}`,
      icon: <Gauge className="w-4 h-4" />,
      tone: "neutral",
      tip: "الحساب: مجموع تكاليف الوحدة ÷ عدد البنود. يُستخدم لرصد تجانس الأسعار — القيم الشاذة تستدعي مراجعة.",
    },
    {
      label: "إجمالي التكلفة المباشرة",
      value: `${fmt(totals.directs)} ${currency}`,
      icon: <Coins className="w-4 h-4" />,
      tone: "info",
      tip: "مجموع تكلفة وحدة كل البنود (مواد + عمالة + معدات + نقل + مقاول باطن) قبل الهالك والمصاريف والضريبة.",
    },
    {
      label: "إجمالي الهالك",
      value: `${fmt(totals.wasteAmount)} ${currency}`,
      icon: <Percent className="w-4 h-4" />,
      tone: "warn",
      tip: "الحساب: نسبة الهالك × التكلفة المباشرة. الحد المقبول: 3–7% حسب النشاط. تحذير إذا > 10%.",
    },
    {
      label: "المصاريف غير المباشرة",
      value: `${fmt(totals.adminAmount)} ${currency}`,
      icon: <Receipt className="w-4 h-4" />,
      tone: "warn",
      tip: "الحساب: نسبة الإدارية × التكلفة المباشرة. تشمل الإشراف والإدارة والتأمين. الحد الطبيعي: 5–12%.",
    },
    {
      label: "قبل الضريبة",
      value: `${fmt(totals.preTax)} ${currency}`,
      icon: <TrendingUp className="w-4 h-4" />,
      tone: "info",
      tip: "المباشرة + الهالك + المصاريف غير المباشرة. يمثل صافي التكلفة قبل تطبيق أي ضريبة.",
    },
    {
      label: "قيمة الضريبة",
      value: `${fmt(totals.taxAmount)} ${currency}`,
      icon: <Receipt className="w-4 h-4" />,
      tone: "neutral",
      tip: "الحساب: نسبة الضريبة × المبلغ قبل الضريبة. النسبة مأخوذة من بيانات المشروع (شريط المعلومات العلوي).",
    },
    {
      label: "الإجمالي بعد الضريبة",
      value: `${fmt(totals.grandTotal)} ${currency}`,
      icon: <Sparkles className="w-4 h-4" />,
      tone: "success",
      tip: "التكلفة النهائية = قبل الضريبة + الضريبة. هذا هو الرقم المعتمد للعرض على العميل.",
    },
    {
      label: "متوسط تكلفة/بند",
      value: `${fmt(totals.itemsCount ? totals.grandTotal / totals.itemsCount : 0)} ${currency}`,
      icon: <Wallet className="w-4 h-4" />,
      tone: "neutral",
      tip: "الحساب: الإجمالي بعد الضريبة ÷ عدد البنود. يساعد على مقارنة المشاريع.",
    },
    {
      label: "البنود المكتملة",
      value: String(totals.filledItems),
      icon: <CheckCircle2 className="w-4 h-4" />,
      tone: "success",
      tip: "بنود تحتوي على اسم وإنتاجية يومية وإيجار يومي > 0. الحد المقبول: ≥ 80% من إجمالي البنود.",
    },
    {
      label: "البنود الناقصة",
      value: String(totals.missingItems),
      icon: <AlertCircle className="w-4 h-4" />,
      tone: totals.missingItems > 0 ? "warn" : "neutral",
      tip: "بنود تنقصها بيانات إلزامية (إنتاجية أو إيجار يومي). الإجراء: استكمل الحقول أو شغّل التحليل الذكي لملء الفجوات.",
    },
    {
      label: "تحتاج مراجعة",
      value: String(totals.reviewItems),
      icon: <ClipboardCheck className="w-4 h-4" />,
      tone: totals.reviewItems > 0 ? "warn" : "neutral",
      tip: "بنود لها اسم لكن بياناتها منقوصة أو غير متسقة (كمية صفر، تكلفة صفر، إلخ). راجع القيم يدوياً.",
    },
    {
      label: "متوسط الثقة",
      value: `${totals.avgConfidencePct.toFixed(0)}%`,
      icon: <ShieldCheck className="w-4 h-4" />,
      tone:
        totals.avgConfidencePct >= 80
          ? "success"
          : totals.avgConfidencePct >= 50
            ? "warn"
            : "neutral",
      tip: "الحساب: متوسط اكتمال حقول (الاسم/الإنتاجية/الإيجار/التكلفة) لكل بند. أقل من 50% يعني أن أغلب البيانات تقديرية.",
    },
    {
      label: "عدد الاقتراحات",
      value: String(suggestionsCount),
      icon: <Sparkles className="w-4 h-4" />,
      tone: suggestionsCount > 0 ? "info" : "neutral",
      tip: "الاقتراحات الذكية الحالية من محرك التحليل. اضغط على تبويب الاقتراحات لمراجعتها.",
    },
    {
      label: "التوفير المتوقع",
      value: `${fmt(expectedSaving)} ${currency}`,
      icon: <PiggyBank className="w-4 h-4" />,
      tone: expectedSaving > 0 ? "success" : "neutral",
      tip: "مجموع الأثر المالي الإيجابي للاقتراحات الحالية إذا تم تطبيقها كلها.",
    },
    {
      label: "نسبة التوفير",
      value: `${savingPct.toFixed(1)}%`,
      icon: <BarChart3 className="w-4 h-4" />,
      tone: savingPct >= 5 ? "success" : "neutral",
      tip: "الحساب: التوفير المتوقع ÷ الإجمالي بعد الضريبة. > 5% يمثل فرصة توفير مهمة.",
    },
    {
      label: "الاكتمال",
      value: `${totals.completenessPct.toFixed(0)}%`,
      icon: <Gauge className="w-4 h-4" />,
      tone:
        totals.completenessPct >= 80
          ? "success"
          : totals.completenessPct >= 50
            ? "warn"
            : "neutral",
      tip: "الحساب: البنود المكتملة ÷ إجمالي البنود. الحد المقبول لإرسال التحليل للمراجعة: ≥ 80%.",
    },
  ];



  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
      <Card className="p-3 mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium">نسبة اكتمال التحليل</span>
          <span className="tabular-nums text-muted-foreground">
            {totals.completenessPct.toFixed(0)}% ({totals.filledItems}/{totals.itemsCount})
          </span>
        </div>
        <Progress value={totals.completenessPct} className="h-2" />
      </Card>
    </TooltipProvider>
  );
}

type Tone = "primary" | "info" | "warn" | "success" | "neutral";
interface KpiDef {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: Tone;
  tip: string;
}

const TONE_CLASS: Record<Tone, { ring: string; icon: string; text: string }> = {
  primary: { ring: "border-primary/30 bg-primary/5", icon: "bg-primary/10 text-primary", text: "text-primary" },
  info: { ring: "border-blue-500/30 bg-blue-500/5", icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400", text: "text-blue-600 dark:text-blue-400" },
  warn: { ring: "border-amber-500/30 bg-amber-500/5", icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400", text: "text-amber-600 dark:text-amber-400" },
  success: { ring: "border-emerald-500/30 bg-emerald-500/5", icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", text: "text-emerald-600 dark:text-emerald-400" },
  neutral: { ring: "border-border bg-card", icon: "bg-muted text-muted-foreground", text: "text-foreground" },
};

function KpiCard({ label, value, icon, tone, tip }: KpiDef) {
  const c = TONE_CLASS[tone];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={`p-2.5 hover:shadow-md transition-shadow cursor-help ${c.ring}`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${c.icon}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground truncate leading-tight">{label}</div>
              <div className={`text-sm font-bold truncate ${c.text}`}>{value}</div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
