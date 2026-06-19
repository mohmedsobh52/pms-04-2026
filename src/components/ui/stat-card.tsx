import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

type Tone = "emerald" | "gold" | "violet" | "rose" | "amber" | "sky";

const toneMap: Record<Tone, { ring: string; icon: string; glow: string }> = {
  emerald: { ring: "ring-emerald-500/20", icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", glow: "from-emerald-500/5" },
  gold:    { ring: "ring-amber-400/30",  icon: "bg-amber-400/10 text-amber-600 dark:text-amber-400",   glow: "from-amber-400/5" },
  violet:  { ring: "ring-violet-500/20", icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400", glow: "from-violet-500/5" },
  rose:    { ring: "ring-rose-500/20",   icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",       glow: "from-rose-500/5" },
  amber:   { ring: "ring-amber-500/20",  icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",    glow: "from-amber-500/5" },
  sky:     { ring: "ring-sky-500/20",    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",          glow: "from-sky-500/5" },
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
  trend?: { value: number; positiveIsGood?: boolean };
  onClick?: () => void;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, tone = "emerald", hint, trend, onClick, className }: StatCardProps) {
  const t = toneMap[tone];
  const trendPositive = trend ? trend.value >= 0 : false;
  const trendGood = trend ? (trend.positiveIsGood ?? true) === trendPositive : false;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden p-4 ring-1 transition-all hover:shadow-md hover:-translate-y-0.5",
        t.ring,
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", t.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold font-display tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-muted-foreground/80 truncate">{hint}</p>}
          {trend && (
            <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", trendGood ? "text-emerald-600" : "text-rose-600")}>
              {trendPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", t.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
