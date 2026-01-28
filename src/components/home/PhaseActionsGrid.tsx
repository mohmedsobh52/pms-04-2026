import { Link } from "react-router-dom";
import { 
  Plus, 
  Zap, 
  FileUp, 
  Library, 
  DollarSign,
  Receipt, 
  FileText, 
  Users,
  Package,
  Calendar,
  BarChart3,
  Shield,
  TrendingUp,
  LayoutDashboard,
  Briefcase,
  Settings,
  Sparkles,
  Target,
  LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PhaseAction {
  icon: LucideIcon;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
  href: string;
  isNew?: boolean;
  pendingCount?: number;
  previewText?: { ar: string; en: string };
}

interface PhaseConfig {
  id: number;
  colorClass: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  actions: PhaseAction[];
}

const phaseConfigs: PhaseConfig[] = [
  {
    id: 1,
    colorClass: "text-cyan-500",
    bgGradient: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500/30 hover:border-cyan-500/60",
    glowColor: "186 100% 50%",
    actions: [
      { 
        icon: Plus, 
        label: { ar: "مشروع جديد", en: "New Project" }, 
        description: { ar: "إنشاء مشروع فارغ", en: "Create empty project" },
        href: "/projects/new",
        previewText: { ar: "ابدأ مشروع جديد من الصفر", en: "Start a new project from scratch" }
      },
      { 
        icon: Zap, 
        label: { ar: "الاستخراج السريع", en: "Fast Extraction" }, 
        description: { ar: "رفع ملفات متعددة", en: "Upload multiple files" },
        href: "/fast-extraction",
        isNew: true,
        previewText: { ar: "استخراج البيانات من ملفات متعددة بسرعة", en: "Quickly extract data from multiple files" }
      },
      { 
        icon: Briefcase, 
        label: { ar: "المشاريع", en: "Projects" }, 
        description: { ar: "جميع المشاريع", en: "All projects" },
        href: "/projects",
        previewText: { ar: "عرض وإدارة جميع المشاريع", en: "View and manage all projects" }
      }
    ]
  },
  {
    id: 2,
    colorClass: "text-blue-500",
    bgGradient: "from-blue-500 to-indigo-500",
    borderColor: "border-blue-500/30 hover:border-blue-500/60",
    glowColor: "217 91% 60%",
    actions: [
      { 
        icon: FileUp, 
        label: { ar: "تحليل BOQ", en: "Analyze BOQ" }, 
        description: { ar: "تحليل جدول الكميات", en: "Analyze bill of quantities" },
        href: "/projects?tab=analyze",
        previewText: { ar: "تحليل ذكي لجداول الكميات", en: "Smart analysis of bill of quantities" }
      },
      { 
        icon: Library, 
        label: { ar: "المكتبة", en: "Library" }, 
        description: { ar: "المواد والعمالة", en: "Materials & labor" },
        href: "/library",
        previewText: { ar: "قاعدة بيانات المواد والعمالة والمعدات", en: "Database of materials, labor & equipment" }
      },
      { 
        icon: DollarSign, 
        label: { ar: "أسعار المواد", en: "Material Prices" }, 
        description: { ar: "قاعدة بيانات الأسعار", en: "Price database" },
        href: "/material-prices",
        previewText: { ar: "تحديث أسعار المواد بشكل دوري", en: "Regularly updated material prices" }
      }
    ]
  },
  {
    id: 3,
    colorClass: "text-green-500",
    bgGradient: "from-green-500 to-emerald-500",
    borderColor: "border-green-500/30 hover:border-green-500/60",
    glowColor: "142 71% 45%",
    actions: [
      { 
        icon: Receipt, 
        label: { ar: "عروض الأسعار", en: "Quotations" }, 
        description: { ar: "إدارة العروض", en: "Manage quotations" },
        href: "/quotations",
        pendingCount: 3,
        previewText: { ar: "إدارة ومقارنة عروض الأسعار", en: "Manage and compare price quotations" }
      },
      { 
        icon: TrendingUp, 
        label: { ar: "التسعير التاريخي", en: "Historical Pricing" }, 
        description: { ar: "مقارنة الأسعار", en: "Price comparison" },
        href: "/historical-pricing",
        previewText: { ar: "تحليل الأسعار التاريخية للمشاريع", en: "Analyze historical pricing for projects" }
      },
      { 
        icon: BarChart3, 
        label: { ar: "تحليل التكاليف", en: "Cost Analysis" }, 
        description: { ar: "تفاصيل التكاليف", en: "Cost details" },
        href: "/cost-analysis",
        previewText: { ar: "تحليل مفصل لتكاليف المشروع", en: "Detailed analysis of project costs" }
      },
      { 
        icon: Target, 
        label: { ar: "دقة التسعير", en: "Pricing Accuracy" }, 
        description: { ar: "تتبع دقة الأسعار", en: "Track price accuracy" },
        href: "/pricing-accuracy",
        isNew: true,
        previewText: { ar: "مقارنة الأسعار المقترحة مع الأسعار النهائية المعتمدة", en: "Compare suggested prices with final approved prices" }
      }
    ]
  },
  {
    id: 4,
    colorClass: "text-orange-500",
    bgGradient: "from-orange-500 to-amber-500",
    borderColor: "border-orange-500/30 hover:border-orange-500/60",
    glowColor: "25 95% 53%",
    actions: [
      { 
        icon: FileText, 
        label: { ar: "العقود", en: "Contracts" }, 
        description: { ar: "إدارة العقود", en: "Manage contracts" },
        href: "/contracts",
        previewText: { ar: "إدارة العقود والاتفاقيات", en: "Manage contracts and agreements" }
      },
      { 
        icon: Users, 
        label: { ar: "مقاولي الباطن", en: "Subcontractors" }, 
        description: { ar: "إدارة المقاولين", en: "Manage subcontractors" },
        href: "/subcontractors",
        previewText: { ar: "إدارة مقاولي الباطن والموردين", en: "Manage subcontractors and suppliers" }
      },
      { 
        icon: Settings, 
        label: { ar: "القوالب", en: "Templates" }, 
        description: { ar: "قوالب العقود", en: "Contract templates" },
        href: "/templates",
        isNew: true,
        previewText: { ar: "قوالب FIDIC وعقود جاهزة", en: "FIDIC templates and ready contracts" }
      }
    ]
  },
  {
    id: 5,
    colorClass: "text-purple-500",
    bgGradient: "from-purple-500 to-violet-500",
    borderColor: "border-purple-500/30 hover:border-purple-500/60",
    glowColor: "262 83% 58%",
    actions: [
      { 
        icon: Package, 
        label: { ar: "المشتريات", en: "Procurement" }, 
        description: { ar: "إدارة المشتريات", en: "Manage procurement" },
        href: "/procurement",
        pendingCount: 5,
        previewText: { ar: "متابعة طلبات الشراء والتوريد", en: "Track purchase orders and supply" }
      },
      { 
        icon: Users, 
        label: { ar: "الموارد", en: "Resources" }, 
        description: { ar: "العمالة والمعدات", en: "Labor & equipment" },
        href: "/resources",
        previewText: { ar: "إدارة الموارد البشرية والمعدات", en: "Manage human resources and equipment" }
      },
      { 
        icon: Calendar, 
        label: { ar: "الجدول الزمني", en: "Calendar" }, 
        description: { ar: "تخطيط المهام", en: "Task planning" },
        href: "/calendar",
        previewText: { ar: "تخطيط وجدولة المهام", en: "Plan and schedule tasks" }
      }
    ]
  },
  {
    id: 6,
    colorClass: "text-rose-500",
    bgGradient: "from-rose-500 to-pink-500",
    borderColor: "border-rose-500/30 hover:border-rose-500/60",
    glowColor: "350 89% 60%",
    actions: [
      { 
        icon: LayoutDashboard, 
        label: { ar: "لوحة المعلومات", en: "Dashboard" }, 
        description: { ar: "نظرة عامة", en: "Overview" },
        href: "/dashboard",
        previewText: { ar: "نظرة شاملة على جميع المشاريع", en: "Comprehensive overview of all projects" }
      },
      { 
        icon: BarChart3, 
        label: { ar: "تقرير مراقبة التكاليف", en: "Cost Control Report" }, 
        description: { ar: "EVM وتحليل الأداء", en: "EVM & performance" },
        href: "/cost-control-report",
        isNew: true,
        previewText: { ar: "تحليل شامل للقيمة المكتسبة والأداء", en: "Comprehensive earned value and performance analysis" }
      },
      { 
        icon: Shield, 
        label: { ar: "إدارة المخاطر", en: "Risk Management" }, 
        description: { ar: "تتبع المخاطر", en: "Track risks" },
        href: "/risk",
        pendingCount: 2,
        previewText: { ar: "تحديد ومتابعة مخاطر المشروع", en: "Identify and track project risks" }
      }
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
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 animate-fade-in">
        {/* Phase indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "w-3 h-3 rounded-full bg-gradient-to-r",
            currentPhaseConfig.bgGradient,
            "animate-pulse shadow-lg"
          )} 
          style={{ boxShadow: `0 0 15px hsl(${currentPhaseConfig.glowColor} / 0.5)` }}
          />
          <p className="text-sm text-muted-foreground">
            {isArabic ? "الإجراءات المتاحة" : "Available Actions"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentPhaseConfig.actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <Tooltip key={action.href}>
                <TooltipTrigger asChild>
                  <Link 
                    to={action.href}
                    className="animate-scale-in block"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Card className={cn(
                      "group h-full transition-all duration-300 cursor-pointer border-2 relative overflow-hidden",
                      currentPhaseConfig.borderColor,
                      "hover:shadow-xl hover:-translate-y-1",
                      "bg-gradient-to-br from-card to-muted/20"
                    )}
                    style={{
                      '--hover-glow': `0 0 30px hsl(${currentPhaseConfig.glowColor} / 0.3)`
                    } as React.CSSProperties}
                    >
                      {/* New Badge */}
                      {action.isNew && (
                        <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-accent text-white text-[10px] px-2 py-0.5 shadow-lg animate-pulse">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {isArabic ? "جديد" : "New"}
                        </Badge>
                      )}
                      
                      {/* Pending Count Badge */}
                      {action.pendingCount && action.pendingCount > 0 && (
                        <Badge 
                          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[24px] h-6 flex items-center justify-center rounded-full shadow-lg animate-bounce"
                          style={{ animationDuration: '2s' }}
                        >
                          {action.pendingCount}
                        </Badge>
                      )}
                      
                      <CardContent className="p-6 flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          `bg-gradient-to-br ${currentPhaseConfig.bgGradient}`,
                          "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
                        )}
                        style={{
                          boxShadow: `0 4px 15px hsl(${currentPhaseConfig.glowColor} / 0.3)`
                        }}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {isArabic ? action.label.ar : action.label.en}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {isArabic ? action.description.ar : action.description.en}
                          </p>
                        </div>
                      </CardContent>
                      
                      {/* Hover Glow Effect */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                        style={{
                          background: `radial-gradient(circle at center, hsl(${currentPhaseConfig.glowColor} / 0.1) 0%, transparent 70%)`
                        }}
                      />
                    </Card>
                  </Link>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  className="max-w-[250px] bg-card/95 backdrop-blur-sm border-border/50"
                >
                  <div className="space-y-2 p-1">
                    <p className="font-semibold text-foreground">
                      {isArabic ? action.label.ar : action.label.en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? action.previewText?.ar : action.previewText?.en}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
