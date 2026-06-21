import { Link } from "react-router-dom";
import { useEvmSnapshot } from "@/hooks/useEvmSnapshot";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gauge, TrendingUp, DollarSign, Activity, Info } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  projectId: string;
  currency?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

function tone(value: number | null, kind: "ratio" | "variance"): string {
  if (value == null) return "text-muted-foreground";
  if (kind === "ratio") {
    if (value >= 1) return "text-emerald-600 dark:text-emerald-400";
    if (value >= 0.9) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }
  if (value >= 0) return "text-emerald-600 dark:text-emerald-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Compact KPI strip mounted above the project tabs. All values come from
 * useEvmSnapshot (real progress_history + project_items). When no data
 * exists, shows "—" with a tooltip — never fabricates values.
 */
export function ProjectKpiStrip({ projectId, currency = "SAR" }: Props) {
  const { isArabic } = useLanguage();
  const { data, isLoading } = useEvmSnapshot(projectId);

  const cards = [
    {
      label: isArabic ? "CPI" : "CPI",
      hint: isArabic ? "مؤشر أداء التكلفة" : "Cost Performance Index",
      value: data?.cpi != null ? data.cpi.toFixed(2) : "—",
      raw: data?.cpi ?? null,
      kind: "ratio" as const,
      icon: Gauge,
    },
    {
      label: isArabic ? "SPI" : "SPI",
      hint: isArabic ? "مؤشر أداء الجدول" : "Schedule Performance Index",
      value: data?.spi != null ? data.spi.toFixed(2) : "—",
      raw: data?.spi ?? null,
      kind: "ratio" as const,
      icon: TrendingUp,
    },
    {
      label: isArabic ? "انحراف التكلفة" : "Cost Variance",
      hint: isArabic ? "EV - AC" : "EV − AC",
      value: data?.hasData ? `${currency} ${fmt(data.cv)}` : "—",
      raw: data?.hasData ? data.cv : null,
      kind: "variance" as const,
      icon: DollarSign,
    },
    {
      label: isArabic ? "نسبة الإنجاز" : "Progress",
      hint: isArabic ? "EV / BAC" : "EV / BAC",
      value: data?.hasData ? `${data.percentComplete.toFixed(1)}%` : "—",
      raw: data?.hasData ? 1 : null,
      kind: "ratio" as const,
      icon: Activity,
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={`/projects/${projectId}/cost-control`}
              className="group rounded-xl border border-border bg-card/70 backdrop-blur-sm p-3 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5" />
                  {c.label}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {c.hint}
                    {!data?.hasData && (
                      <div className="mt-1 text-muted-foreground">
                        {isArabic
                          ? "لا توجد بيانات تقدم مسجلة بعد"
                          : "No progress history recorded yet"}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className={cn("text-xl font-bold tabular-nums", tone(c.raw, c.kind))}>
                  {c.value}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
