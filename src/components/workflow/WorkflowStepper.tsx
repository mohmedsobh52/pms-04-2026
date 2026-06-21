import { Check, Circle, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowApproval, WorkflowInstance, WorkflowStep } from "@/hooks/useWorkflow";

interface Props {
  instance: WorkflowInstance | null;
  steps: WorkflowStep[];
  approvals: WorkflowApproval[];
  className?: string;
}

export function WorkflowStepper({ instance, steps, approvals, className }: Props) {
  if (!instance || steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">لا يوجد سير عمل مرتبط.</p>
    );
  }
  const rejected = instance.status === "rejected";
  const cancelled = instance.status === "cancelled";
  const completed = instance.status === "approved";

  return (
    <ol className={cn("flex flex-col md:flex-row md:items-stretch gap-3", className)}>
      {steps.map((step, idx) => {
        const approval = approvals.find((a) => a.step_order === step.step_order);
        const isCurrent = !completed && !rejected && !cancelled && step.step_order === instance.current_step_order;
        const isDone = approval?.decision === "approved" || (completed && step.step_order <= instance.current_step_order);
        const isRejected = approval?.decision === "rejected" || (rejected && isCurrent);
        return (
          <li key={step.id} className="flex-1 min-w-[160px]">
            <div
              className={cn(
                "rounded-lg border p-3 h-full flex items-start gap-3 transition-colors",
                isDone && "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30",
                isRejected && "border-destructive/40 bg-destructive/5",
                isCurrent && !isRejected && "border-primary bg-primary/5 ring-1 ring-primary/30",
                !isDone && !isCurrent && !isRejected && "border-border bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isDone && "bg-emerald-600 text-white",
                  isRejected && "bg-destructive text-destructive-foreground",
                  isCurrent && !isRejected && "bg-primary text-primary-foreground",
                  !isDone && !isCurrent && !isRejected && "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : isRejected ? <X className="h-3.5 w-3.5" /> : isCurrent ? <Clock className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">الخطوة {idx + 1}</div>
                <div className="font-medium text-sm truncate">{step.name}</div>
                {approval && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(approval.decided_at).toLocaleString()}
                  </div>
                )}
                {!approval && isCurrent && step.sla_hours && (
                  <div className="text-xs text-amber-600 mt-1">SLA: {step.sla_hours} ساعة</div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
