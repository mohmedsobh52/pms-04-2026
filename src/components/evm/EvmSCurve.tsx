import { useEvmSnapshot } from "@/hooks/useEvmSnapshot";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import {
  AreaChart,
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  currency?: string;
  height?: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export function EvmSCurve({ projectId, currency = "SAR", height = 260 }: Props) {
  const { isArabic } = useLanguage();
  const { data, isLoading } = useEvmSnapshot(projectId);

  const series = (data?.series ?? []).map((p) => ({
    date: p.date,
    PV: Math.round(p.pv),
    EV: Math.round(p.ev),
    AC: Math.round(p.ac),
  }));

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {isArabic ? "منحنى S — PV / EV / AC" : "S-Curve — PV / EV / AC"}
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : series.length === 0 ? (
          <div
            className="flex items-center justify-center text-xs text-muted-foreground"
            style={{ height }}
          >
            {isArabic
              ? "لا توجد بيانات تقدم لرسم المنحنى"
              : "No progress data to plot the curve"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(v)} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => `${currency} ${fmt(Number(v))}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="PV"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted-foreground) / 0.15)"
                strokeWidth={2}
              />
              <Line type="monotone" dataKey="EV" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="AC" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
