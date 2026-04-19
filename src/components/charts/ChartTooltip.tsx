import * as React from "react";

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  formatter?: (value: any, name?: string) => React.ReactNode;
  labelFormatter?: (label: any) => React.ReactNode;
}

/**
 * Glassmorphism tooltip used across all Recharts charts in the app.
 * Uses semantic design tokens for consistent theming.
 */
export const ChartTooltip = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs animate-fade-in">
      {label !== undefined && label !== "" && (
        <p className="font-semibold text-foreground mb-1">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: entry.color || entry.payload?.color || entry.fill }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};
