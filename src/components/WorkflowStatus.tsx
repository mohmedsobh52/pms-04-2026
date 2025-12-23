import { CheckCircle2, Circle, Loader2, XCircle, FileText, Brain, GitMerge, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

export type StepStatus = "pending" | "processing" | "complete" | "error";

export interface WorkflowStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  status: StepStatus;
  icon: React.ReactNode;
}

interface WorkflowStatusProps {
  steps: WorkflowStep[];
}

export function WorkflowStatus({ steps }: WorkflowStatusProps) {
  const { t } = useLanguage();
  
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-lg font-semibold mb-6">{t('processingStatus')}</h3>
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
                step.status === "complete" && "opacity-70"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  step.status === "pending" && "bg-muted",
                  step.status === "processing" && "bg-primary/10",
                  step.status === "complete" && "bg-success/10",
                  step.status === "error" && "bg-destructive/10"
                )}
              >
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-foreground">{t(step.titleKey as any)}</h4>
                  {getStatusIcon(step.status)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t(step.descriptionKey as any)}</p>
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
  },
  {
    id: "extract",
    titleKey: "extractText",
    descriptionKey: "extractTextDesc",
    status: "pending",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: "analyze",
    titleKey: "aiAnalysis",
    descriptionKey: "aiAnalysisDesc",
    status: "pending",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    id: "wbs",
    titleKey: "createWBS",
    descriptionKey: "createWBSDesc",
    status: "pending",
    icon: <GitMerge className="w-5 h-5" />,
  },
  {
    id: "export",
    titleKey: "exportResults",
    descriptionKey: "exportResultsDesc",
    status: "pending",
    icon: <Download className="w-5 h-5" />,
  },
];
