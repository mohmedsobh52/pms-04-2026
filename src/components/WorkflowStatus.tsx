import { CheckCircle2, Circle, Loader2, XCircle, FileText, Brain, GitMerge, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Progress } from "@/components/ui/progress";

export type StepStatus = "pending" | "processing" | "complete" | "error" | "queued";

export interface WorkflowStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  status: StepStatus;
  icon: React.ReactNode;
  progress?: number; // 0-100
  statusMessage?: string; // Dynamic status message (e.g., "Waiting 59s...")
}

interface WorkflowStatusProps {
  steps: WorkflowStep[];
}

export function WorkflowStatus({ steps }: WorkflowStatusProps) {
  const { t, isArabic } = useLanguage();
  
  // Calculate overall progress
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const processingStep = steps.find(s => s.status === 'processing' || s.status === 'queued');
  const processingProgress = processingStep?.progress || 0;
  
  // Overall progress: completed steps + partial progress of current step
  const overallProgress = Math.round(
    ((completedSteps + (processingProgress / 100)) / steps.length) * 100
  );
  
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "queued":
        return <Clock className="w-5 h-5 text-warning animate-pulse" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">{t('processingStatus')}</h3>
        <span className="text-sm font-medium text-primary">{overallProgress}%</span>
      </div>
      
      {/* Overall Progress Bar */}
      <div className="mb-6">
        <Progress value={overallProgress} className="h-2" />
      </div>
      
      <div className="space-y-1">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute right-[23px] rtl:right-[23px] ltr:left-[23px] top-12 w-0.5 h-8",
                  step.status === "complete" ? "bg-success" : "bg-border"
                )}
              />
            )}
            <div
              className={cn(
                "flex items-start gap-4 p-3 rounded-xl transition-all duration-300",
                step.status === "processing" && "bg-primary/5 border border-primary/20",
                step.status === "queued" && "bg-warning/5 border border-warning/20",
                step.status === "complete" && "opacity-70"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  step.status === "pending" && "bg-muted",
                  step.status === "processing" && "bg-primary/10",
                  step.status === "queued" && "bg-warning/10",
                  step.status === "complete" && "bg-success/10",
                  step.status === "error" && "bg-destructive/10"
                )}
              >
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-foreground">{t(step.titleKey as any)}</h4>
                  <div className="flex items-center gap-2">
                    {step.status === 'processing' && step.progress !== undefined && (
                      <span className="text-xs font-medium text-primary">{step.progress}%</span>
                    )}
                    {getStatusIcon(step.status)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t(step.descriptionKey as any)}</p>
                
                {/* Dynamic status message (e.g., rate limit wait) */}
                {(step.status === 'processing' || step.status === 'queued') && step.statusMessage && (
                  <p className="text-xs text-warning font-medium mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                    {step.statusMessage}
                  </p>
                )}
                
                {/* Show "Queued" default message if no statusMessage */}
                {step.status === 'queued' && !step.statusMessage && (
                  <p className="text-xs text-warning font-medium mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                    {isArabic ? 'في قائمة الانتظار...' : 'Queued...'}
                  </p>
                )}
                
                {/* Individual step progress bar */}
                {step.status === 'processing' && step.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-1.5" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const defaultWorkflowSteps: WorkflowStep[] = [
  {
    id: "upload",
    titleKey: "uploadPDF",
    descriptionKey: "uploadPDFDesc",
    status: "pending",
    icon: <FileText className="w-5 h-5" />,
    progress: 0,
  },
  {
    id: "extract",
    titleKey: "extractText",
    descriptionKey: "extractTextDesc",
    status: "pending",
    icon: <FileText className="w-5 h-5" />,
    progress: 0,
  },
  {
    id: "analyze",
    titleKey: "aiAnalysis",
    descriptionKey: "aiAnalysisDesc",
    status: "pending",
    icon: <Brain className="w-5 h-5" />,
    progress: 0,
  },
  {
    id: "wbs",
    titleKey: "createWBS",
    descriptionKey: "createWBSDesc",
    status: "pending",
    icon: <GitMerge className="w-5 h-5" />,
    progress: 0,
  },
  {
    id: "export",
    titleKey: "exportResults",
    descriptionKey: "exportResultsDesc",
    status: "pending",
    icon: <Download className="w-5 h-5" />,
    progress: 0,
  },
];
