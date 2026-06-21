import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Gauge, FileBarChart } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export function QuickActionsBar() {
  const { isArabic } = useLanguage();

  const actions = [
    {
      to: "/projects/new",
      icon: Plus,
      en: "New Project",
      ar: "مشروع جديد",
      variant: "default" as const,
    },
    {
      to: "/projects?tab=attachments&mode=extraction",
      icon: Upload,
      en: "Import BOQ",
      ar: "استيراد BOQ",
      variant: "outline" as const,
    },
    {
      to: "/cost-control-report",
      icon: Gauge,
      en: "Cost Control",
      ar: "متابعة التكلفة",
      variant: "outline" as const,
    },
    {
      to: "/projects?tab=reports",
      icon: FileBarChart,
      en: "Reports",
      ar: "التقارير",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Button key={a.to} asChild variant={a.variant} size="sm" className="gap-1.5">
            <Link to={a.to}>
              <Icon className="w-4 h-4" />
              <span>{isArabic ? a.ar : a.en}</span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
