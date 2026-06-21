import { useEvmSnapshot } from "@/hooks/useEvmSnapshot";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  currency?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/**
 * Compact EVM summary — six cells (BAC, PV, EV, AC, CPI, SPI) + EAC/VAC.
 * Data: useEvmSnapshot — real DB only.
 */
export function EvmSummaryCard({ projectId, currency = "SAR" }: Props) {
  const { isArabic } = useLanguage();
  const { data, isLoading } = useEvmSnapshot(projectId);

  const cells = [
    { label: "BAC", value: data?.bac != null ? `${currency} ${fmt(data.bac)}` : "—", tone: "muted" as const },
    { label: "PV", value: data?.hasData ? `${currency} ${fmt(data.pv)}` : "—", tone: "muted" as const },
    { label: "EV", value: data?.hasData ? `${currency} ${fmt(data.ev)}` : "—", tone: "primary" as const },
    { label: "AC", value: data?.hasData ? `${currency} ${fmt(data.ac)}` : "—", tone: "muted" as const },
    {
      label: "CPI",
      value: data?.cpi != null ? data.cpi.toFixed(2) : "—",
      tone: (data?.cpi == null
        ? "muted"
        : data.cpi >= 1
        ? "good"
        : data.cpi >= 0.9
        ? "warn"
        : "bad") as const,
    },
    {
      label: "SPI",
      value: data?.spi != null ? data.spi.toFixed(2) : "—",
      tone: (data?.spi == null
        ? "muted"
        : data.spi >= 1
        ? "good"
        : data.spi >= 0.9
        ? "warn"
        : "bad") as const,
    },
    { label: "EAC", value: data?.eac != null ? `${currency} ${fmt(data.eac)}` : "—", tone: "muted" as const },
    {
      label: "VAC",
      value: data?.vac != null ? `${currency} ${fmt(data.vac)}` : "—",
      tone: (data?.vac == null ? "muted" : data.vac >= 0 ? "good" : "bad") as const,
    },
  ];

  const toneClass = {
    muted: "text-foreground",
    primary: "text-primary",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {isArabic ? "ملخص EVM" : "EVM Summary"}
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {cells.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-background/50 p-2.5">
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              {isLoading ? (
                <Skeleton className="h-6 w-16 mt-1" />
              ) : (
                <p className={cn("text-base font-bold tabular-nums truncate", toneClass[c.tone])}>
                  {c.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
