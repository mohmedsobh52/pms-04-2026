import { useCallback } from "react";
import { 
  Rocket, 
  BarChart3, 
  DollarSign, 
  FileText, 
  Settings, 
  TrendingUp,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface LifecyclePhase {
  id: number;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  icon: LucideIcon;
  colorClass: string;
  bgGradient: string;
  progressColor: string;
}

const lifecyclePhases: LifecyclePhase[] = [
  {
    id: 1,
    name: { ar: "البدء", en: "Initiation" },
    description: { ar: "إنشاء مشروع جديد أو استيراد ملفات", en: "Create new project or import files" },
    icon: Rocket,
    colorClass: "text-cyan-500",
    bgGradient: "from-cyan-500 to-blue-500",
    progressColor: "#06b6d4"
  },
  {
    id: 2,
    name: { ar: "التحليل", en: "Analysis" },
    description: { ar: "تحليل BOQ والمكتبة والمواد", en: "BOQ analysis, library & materials" },
    icon: BarChart3,
    colorClass: "text-blue-500",
    bgGradient: "from-blue-500 to-indigo-500",
    progressColor: "#3b82f6"
  },
  {
    id: 3,
    name: { ar: "التسعير", en: "Pricing" },
    description: { ar: "عروض الأسعار والتسعير المفصل", en: "Quotations & detailed pricing" },
    icon: DollarSign,
    colorClass: "text-green-500",
    bgGradient: "from-green-500 to-emerald-500",
    progressColor: "#22c55e"
  },
  {
    id: 4,
    name: { ar: "التعاقد", en: "Contracting" },
    description: { ar: "العقود ومقاولي الباطن", en: "Contracts & subcontractors" },
    icon: FileText,
    colorClass: "text-orange-500",
    bgGradient: "from-orange-500 to-amber-500",
    progressColor: "#f97316"
  },
  {
    id: 5,
    name: { ar: "التنفيذ", en: "Execution" },
    description: { ar: "المشتريات والموارد والجدولة", en: "Procurement, resources & scheduling" },
    icon: Settings,
    colorClass: "text-purple-500",
    bgGradient: "from-purple-500 to-violet-500",
    progressColor: "#a855f7"
  },
  {
    id: 6,
    name: { ar: "المراقبة", en: "Monitoring" },
    description: { ar: "التقارير والمخاطر ولوحات المعلومات", en: "Reports, risks & dashboards" },
    icon: TrendingUp,
    colorClass: "text-rose-500",
    bgGradient: "from-rose-500 to-pink-500",
    progressColor: "#f43f5e"
  }
];

interface LifecycleFlowProps {
  activePhase: number;
  onPhaseChange: (phaseId: number) => void;
  projectProgress?: number;
}

export function LifecycleFlow({ activePhase, onPhaseChange, projectProgress = 0 }: LifecycleFlowProps) {
  const { isArabic } = useLanguage();

  const handlePhaseClick = useCallback((phaseId: number) => {
    onPhaseChange(phaseId);
  }, [onPhaseChange]);

  return (
    <div className="relative py-4 space-y-6">
      {/* Phase Nodes */}
      <div className="flex flex-wrap md:flex-nowrap justify-between gap-4 relative z-10">
        {lifecyclePhases.map((phase) => {
          const Icon = phase.icon;
          const isActive = activePhase === phase.id;
          const isPast = activePhase > phase.id;
          
          return (
            <div 
              key={phase.id}
              className="flex flex-col items-center gap-3 cursor-pointer group flex-1 min-w-[120px]"
              onClick={() => handlePhaseClick(phase.id)}
            >
              {/* Phase Circle */}
              <div 
                className={cn(
                  "relative w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center",
                  `bg-gradient-to-br ${phase.bgGradient}`,
                  "transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-lg",
                  isActive && "ring-3 ring-white/40 scale-110 shadow-lg",
                  isPast && "opacity-60 hover:opacity-80",
                  !isActive && !isPast && "opacity-70 hover:opacity-100"
                )}
              >
                <Icon className={cn(
                  "w-6 h-6 md:w-7 md:h-7 text-white transition-transform duration-300",
                  "group-hover:scale-110"
                )} />
                
                {/* Phase Number */}
                <div className={cn(
                  "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                  isActive ? "bg-white text-foreground shadow-sm" : "bg-background/80 text-muted-foreground"
                )}>
                  {phase.id}
                </div>
              </div>
              
              {/* Phase Label */}
              <div className="text-center">
                <p className={cn(
                  "text-xs font-semibold transition-colors duration-200",
                  isActive ? "text-foreground" : "text-muted-foreground",
                  "group-hover:text-foreground"
                )}>
                  {isArabic ? phase.name.ar : phase.name.en}
                </p>
                <p className={cn(
                  "text-[10px] max-w-[110px] mt-0.5 transition-opacity duration-200",
                  isActive ? "text-muted-foreground" : "opacity-0 group-hover:opacity-60"
                )}>
                  {isArabic ? phase.description.ar : phase.description.en}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isArabic ? "تقدم المشروع" : "Project Progress"}
          </span>
          <span className="font-bold text-primary">{projectProgress}%</span>
        </div>
        
        <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden border border-border/30">
          {/* Fill */}
          <div 
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{ 
              width: `${projectProgress}%`,
              background: `linear-gradient(90deg, ${lifecyclePhases.slice(0, activePhase).map(p => p.progressColor).join(', ')})`
            }}
          />
          
          {/* Phase Markers */}
          <div className="absolute inset-y-0 inset-x-2 flex justify-between items-center">
            {lifecyclePhases.map((phase, i) => {
              const markerPosition = ((i) / (lifecyclePhases.length - 1)) * 100;
              const isPassed = projectProgress >= markerPosition;
              return (
                <div 
                  key={phase.id}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300 z-10",
                    isPassed ? "bg-white shadow-sm" : "bg-muted-foreground/30"
                  )}
                />
              );
            })}
          </div>
        </div>
        
        {/* Phase Labels */}
        <div className="flex justify-between px-1">
          {lifecyclePhases.map((phase) => (
            <span 
              key={phase.id} 
              className="text-[9px] md:text-[10px] text-center max-w-[50px] md:max-w-[70px] text-muted-foreground/60"
            >
              {isArabic ? phase.name.ar : phase.name.en}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export { lifecyclePhases };
export type { LifecyclePhase };
