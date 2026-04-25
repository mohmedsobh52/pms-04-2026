import { AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ProjectValidationStatus = "idle" | "checking" | "missing" | "ready" | "forbidden";

interface ProjectStatusPanelProps {
  status: ProjectValidationStatus;
  message?: string;
  table?: string | null;
  ref?: string | null;
  isArabic: boolean;
}

const STATUS_LABELS = {
  idle: { ar: "لم يتم اختيار مشروع", en: "No project selected" },
  checking: { ar: "جارٍ التحقق...", en: "Validating..." },
  missing: { ar: "غير موجود", en: "Not found" },
  forbidden: { ar: "غير مصرّح", en: "Forbidden" },
  ready: { ar: "تم التحقق وجاهز", en: "Verified & ready" },
} as const;

const STATUS_VARIANTS: Record<ProjectValidationStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  checking: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  missing: "bg-destructive/15 text-destructive border-destructive/30",
  forbidden: "bg-destructive/15 text-destructive border-destructive/30",
  ready: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};

export function ProjectStatusBadge({ status, isArabic }: { status: ProjectValidationStatus; isArabic: boolean }) {
  const label = STATUS_LABELS[status][isArabic ? "ar" : "en"];
  const Icon =
    status === "ready" ? CheckCircle2 :
    status === "checking" ? Loader2 :
    status === "idle" ? HelpCircle :
    AlertTriangle;
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 border ${STATUS_VARIANTS[status]}`}
    >
      <Icon className={`w-3.5 h-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
      {label}
    </Badge>
  );
}

export function ProjectStatusPanel({
  status,
  message,
  table,
  ref,
  isArabic,
}: ProjectStatusPanelProps) {
  if (status === "idle" || status === "ready" || status === "checking") return null;

  // Per-table fix steps
  const stepsByTable: Record<string, { ar: string[]; en: string[]; link?: { to: string; ar: string; en: string } }> = {
    saved_projects: {
      ar: [
        "افتح شاشة المشاريع وأنشئ المشروع من جديد بنفس حسابك.",
        "تأكد من أن جلسة تسجيل الدخول لا تزال صالحة.",
        "عُد إلى صفحة خطة التنفيذ واختر المشروع المُنشأ.",
      ],
      en: [
        "Open the Projects screen and recreate the project under your account.",
        "Confirm that your sign-in session is still valid.",
        "Return to the Execution Plan page and select the new project.",
      ],
      link: { to: "/projects", ar: "اذهب إلى المشاريع", en: "Go to Projects" },
    },
    project_data: {
      ar: [
        "هذا المشروع من النظام القديم؛ افتح الإعدادات لترحيل البيانات.",
        "تحقق من أن المشروع مرتبط بحسابك الحالي.",
      ],
      en: [
        "This is a legacy project; open settings to migrate the data.",
        "Verify the project is linked to your current account.",
      ],
      link: { to: "/settings", ar: "اذهب إلى الإعدادات", en: "Go to Settings" },
    },
    project_items: {
      ar: [
        "تأكد أن المشروع المالك لك يظهر في قائمة المشاريع.",
        "سجّل الخروج ثم الدخول لتحديث الجلسة.",
        "أعد محاولة رفع البنود من شاشة تفاصيل المشروع.",
      ],
      en: [
        "Make sure the owning project appears in the projects list.",
        "Sign out and back in to refresh your session.",
        "Retry uploading items from the Project Details screen.",
      ],
      link: { to: "/projects", ar: "اذهب إلى المشاريع", en: "Go to Projects" },
    },
  };

  const steps = (table && stepsByTable[table]) || {
    ar: [
      "تحقق من تسجيل الدخول والاتصال بالإنترنت.",
      "أعد تحميل الصفحة ثم حاول مجدداً.",
    ],
    en: [
      "Check that you are signed in and online.",
      "Reload the page and try again.",
    ],
    link: undefined,
  };

  const list = isArabic ? steps.ar : steps.en;

  return (
    <div
      className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold text-destructive text-sm">
            {isArabic ? "تعذّر التحقق من المشروع" : "Project validation failed"}
          </h4>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
          {table && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">
                {isArabic ? "الجدول المتأثر: " : "Affected table: "}
              </span>
              <code className="px-1 py-0.5 rounded bg-muted">{table}</code>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-background/60 p-3 border border-border">
        <p className="text-xs font-medium text-foreground mb-2">
          {isArabic ? "الخطوات المقترحة للإصلاح:" : "Suggested fix steps:"}
        </p>
        <ol className="list-decimal space-y-1 text-xs text-muted-foreground ps-5">
          {list.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {steps.link && (
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link to={steps.link.to}>
                {isArabic ? steps.link.ar : steps.link.en}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {ref && (
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold">
            {isArabic ? "رقم مرجعي للدعم: " : "Support reference: "}
          </span>
          <code className="px-1.5 py-0.5 rounded bg-muted font-mono">{ref}</code>
        </p>
      )}
    </div>
  );
}
