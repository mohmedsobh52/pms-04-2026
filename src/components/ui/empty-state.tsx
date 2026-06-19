import { ReactNode } from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, children }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/15 to-amber-400/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
          <Icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold font-display">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
      {action && (
        <Button onClick={action.onClick} className="mt-5 gap-2">
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
