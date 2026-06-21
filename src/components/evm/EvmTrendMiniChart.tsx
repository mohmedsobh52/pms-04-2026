import { useEvmSnapshot } from "@/hooks/useEvmSnapshot";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  height?: number;
}

export function EvmTrendMiniChart({ projectId, height = 220 }: Props) {
  const { isArabic } = useLanguage();
  const { data, isLoading } = useEvmSnapshot(projectId);

  const series = (data?.series ?? []).map((p) => ({
    date: p.date,
    CPI: p.cpi,
    SPI: p.spi,
  }));

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {isArabic ? "اتجاه CPI / SPI" : "CPI / SPI Trend"}
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
            {isArabic ? "لا توجد بيانات بعد" : "No data yet"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" />
              <Line type="monotone" dataKey="CPI" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="SPI" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
