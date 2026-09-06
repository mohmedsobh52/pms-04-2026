import { Link, useLocation } from "react-router-dom";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

export const CLAIMS_SECTIONS = [
  { to: "/claims", ar: "المطالبات", en: "Claims" },
  { to: "/claims/reports", ar: "التقارير المالية", en: "Financial reports" },
  { to: "/claims/inventory", ar: "المخزون المالي", en: "Financial inventory" },
  { to: "/claims/monthly", ar: "التحليل الشهري", en: "Monthly analysis" },
  { to: "/claims/audit", ar: "سجل التدقيق", en: "Audit trail" },
  { to: "/approvals/reports", ar: "تقارير الاعتماد", en: "Approval reports" },
  { to: "/projects/baselines", ar: "خط الأساس", en: "Baselines" },
];

/** Section navigation bar shared by all claims / finance screens. */
export function ClaimsSectionNav() {
  const { isArabic } = useLanguage();
  const { pathname } = useLocation();
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
      {CLAIMS_SECTIONS.map((s) => {
        const active = pathname === s.to;
        return (
          <Button
            key={s.to}
            asChild
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className={cn("h-8 text-xs", active && "font-semibold text-primary")}
          >
            <Link to={s.to}>{isArabic ? s.ar : s.en}</Link>
          </Button>
        );
      })}
    </div>
  );
}

/** Unified header + section navigation used by all claims / finance report screens. */
export function ClaimsPageHeader({
  title,
  subtitle,
  actions,
  icon: Icon = Gavel,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: any;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <ClaimsSectionNav />
    </div>
  );
}
