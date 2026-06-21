import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  /** Semantic token name from index.css, e.g. "primary", "accent", "status-active" */
  token?: string;
  to?: string;
  loading?: boolean;
  trend?: { value: number; label?: string };
}

export function DashboardKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  token = "primary",
  to,
  loading,
  trend,
}: Props) {
  const body = (
    <div
      className={cn(
        "group relative h-full rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 md:p-5",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `hsl(var(--${token}) / 0.12)` }}
        >
          <Icon className="w-5 h-5" style={{ color: `hsl(var(--${token}))` }} />
        </div>
        {trend && (
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              trend.value >= 0
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className="text-2xl md:text-3xl font-bold text-foreground tabular-nums">
          {value}
        </p>
      )}
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
