import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  rows?: number;
  showStats?: boolean;
  showTabs?: boolean;
  className?: string;
}

/**
 * Unified page-level skeleton matching the typical PageLayout structure:
 * optional stat cards row, optional tabs row, then content rows.
 */
export function PageSkeleton({
  rows = 5,
  showStats = true,
  showTabs = true,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-4 animate-in fade-in", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4 rounded-lg border border-dashed border-border bg-card/30",
        className,
      )}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
