import { Link } from "react-router-dom";
import { 
  Plus, Zap, FileUp, Library, DollarSign, Receipt, FileText, Users,
  Package, Calendar, BarChart3, Shield, TrendingUp, LayoutDashboard,
  Briefcase, Settings, Sparkles, Target, LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface PhaseAction {
  icon: LucideIcon;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
  href: string;
  isNew?: boolean;
  pendingCount?: number;
}

interface PhaseConfig {
  id: number;
  bgGradient: string;
  borderColor: string;
  actions: PhaseAction[];
}

const phaseConfigs: PhaseConfig[] = [
  {
    id: 1, bgGradient: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500/20 hover:border-cyan-500/50",
    actions: [
      { icon: Plus, label: { ar: "مشروع جديد", en: "New Project" }, description: { ar: "إنشاء مشروع فارغ", en: "Create empty project" }, href: "/projects/new" },
      { icon: Zap, label: { ar: "الاستخراج السريع", en: "Fast Extraction" }, description: { ar: "رفع ملفات متعددة", en: "Upload multiple files" }, href: "/fast-extraction", isNew: true },
      { icon: Briefcase, label: { ar: "المشاريع", en: "Projects" }, description: { ar: "جميع المشاريع", en: "All projects" }, href: "/projects" }
    ]
  },
  {
    id: 2, bgGradient: "from-blue-500 to-indigo-500",
    borderColor: "border-blue-500/20 hover:border-blue-500/50",
    actions: [
      { icon: FileUp, label: { ar: "تحليل BOQ", en: "Analyze BOQ" }, description: { ar: "تحليل جدول الكميات", en: "Analyze bill of quantities" }, href: "/projects?tab=analyze" },
      { icon: Library, label: { ar: "المكتبة", en: "Library" }, description: { ar: "المواد والعمالة", en: "Materials & labor" }, href: "/library" },
      { icon: DollarSign, label: { ar: "أسعار المواد", en: "Material Prices" }, description: { ar: "قاعدة بيانات الأسعار", en: "Price database" }, href: "/material-prices" }
    ]
  },
  {
    id: 3, bgGradient: "from-green-500 to-emerald-500",
    borderColor: "border-green-500/20 hover:border-green-500/50",
    actions: [
      { icon: Receipt, label: { ar: "عروض الأسعار", en: "Quotations" }, description: { ar: "إدارة العروض", en: "Manage quotations" }, href: "/quotations", pendingCount: 3 },
      { icon: TrendingUp, label: { ar: "التسعير التاريخي", en: "Historical Pricing" }, description: { ar: "مقارنة الأسعار", en: "Price comparison" }, href: "/historical-pricing" },
      { icon: BarChart3, label: { ar: "تحليل التكاليف", en: "Cost Analysis" }, description: { ar: "تفاصيل التكاليف", en: "Cost details" }, href: "/cost-analysis" },
      { icon: Target, label: { ar: "دقة التسعير", en: "Pricing Accuracy" }, description: { ar: "تتبع دقة الأسعار", en: "Track price accuracy" }, href: "/pricing-accuracy", isNew: true }
    ]
  },
  {
    id: 4, bgGradient: "from-orange-500 to-amber-500",
    borderColor: "border-orange-500/20 hover:border-orange-500/50",
    actions: [
      { icon: FileText, label: { ar: "العقود", en: "Contracts" }, description: { ar: "إدارة العقود", en: "Manage contracts" }, href: "/contracts" },
      { icon: Users, label: { ar: "مقاولي الباطن", en: "Subcontractors" }, description: { ar: "إدارة المقاولين", en: "Manage subcontractors" }, href: "/subcontractors" },
      { icon: Settings, label: { ar: "القوالب", en: "Templates" }, description: { ar: "قوالب العقود", en: "Contract templates" }, href: "/templates", isNew: true },
      { icon: FileText, label: { ar: "المستخلصات", en: "Progress Certificates" }, description: { ar: "مستخلصات المقاولين", en: "Contractor invoices" }, href: "/progress-certificates", isNew: true }
    ]
  },
  {
    id: 5, bgGradient: "from-purple-500 to-violet-500",
    borderColor: "border-purple-500/20 hover:border-purple-500/50",
    actions: [
      { icon: Package, label: { ar: "المشتريات", en: "Procurement" }, description: { ar: "إدارة المشتريات", en: "Manage procurement" }, href: "/procurement", pendingCount: 5 },
      { icon: Users, label: { ar: "الموارد", en: "Resources" }, description: { ar: "العمالة والمعدات", en: "Labor & equipment" }, href: "/resources" },
      { icon: Calendar, label: { ar: "الجدول الزمني", en: "Calendar" }, description: { ar: "تخطيط المهام", en: "Task planning" }, href: "/calendar" }
    ]
  },
  {
    id: 6, bgGradient: "from-rose-500 to-pink-500",
    borderColor: "border-rose-500/20 hover:border-rose-500/50",
    actions: [
      { icon: LayoutDashboard, label: { ar: "لوحة المعلومات", en: "Dashboard" }, description: { ar: "نظرة عامة", en: "Overview" }, href: "/dashboard" },
      { icon: BarChart3, label: { ar: "تقرير مراقبة التكاليف", en: "Cost Control Report" }, description: { ar: "EVM وتحليل الأداء", en: "EVM & performance" }, href: "/cost-control-report", isNew: true },
      { icon: Shield, label: { ar: "إدارة المخاطر", en: "Risk Management" }, description: { ar: "تتبع المخاطر", en: "Track risks" }, href: "/risk", pendingCount: 2 }
    ]
  }
];

interface PhaseActionsGridProps {
  activePhase: number;
}

export function PhaseActionsGrid({ activePhase }: PhaseActionsGridProps) {
  const { isArabic } = useLanguage();
  const currentPhaseConfig = phaseConfigs.find(p => p.id === activePhase);
  if (!currentPhaseConfig) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-2.5 h-2.5 rounded-full bg-gradient-to-r", currentPhaseConfig.bgGradient)} />
        <p className="text-sm text-muted-foreground">
          {isArabic ? "الإجراءات المتاحة" : "Available Actions"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentPhaseConfig.actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href} className="block pointer-events-auto relative z-10">
              <Card className={cn(
                "group h-full transition-all duration-200 cursor-pointer border",
                currentPhaseConfig.borderColor,
                "hover:shadow-md hover:-translate-y-0.5"
              )}>
                {action.isNew && (
                  <Badge className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
                    <Sparkles className="w-3 h-3 mr-0.5" />
                    {isArabic ? "جديد" : "New"}
                  </Badge>
                )}
                {action.pendingCount && action.pendingCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs min-w-[22px] h-5 flex items-center justify-center rounded-full">
                    {action.pendingCount}
                  </Badge>
                )}
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    `bg-gradient-to-br ${currentPhaseConfig.bgGradient}`,
                    "group-hover:scale-105 transition-transform duration-200"
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {isArabic ? action.label.ar : action.label.en}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {isArabic ? action.description.ar : action.description.en}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
