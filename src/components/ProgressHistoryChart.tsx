import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useProgressHistory } from "@/hooks/useProgressHistory";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { LazyChart } from "@/components/charts/LazyChart";

interface ProgressHistoryChartProps {
  projectId?: string;
}

export function ProgressHistoryChart({ projectId }: ProgressHistoryChartProps) {
  const { isArabic } = useLanguage();
  const { history, loading } = useProgressHistory(projectId);

  const chartData = useMemo(() => {
    if (!history.length) return [];
    
    return [...history]
      .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime())
      .map((record) => ({
        date: format(new Date(record.record_date), "MMM dd", {
          locale: isArabic ? ar : enUS,
        }),
        fullDate: format(new Date(record.record_date), "PPP", {
          locale: isArabic ? ar : enUS,
        }),
        actualProgress: record.actual_progress,
        plannedProgress: record.planned_progress,
        actualSpent: record.actual_spent_percentage,
        spi: record.spi ? record.spi * 100 : null,
        cpi: record.cpi ? record.cpi * 100 : null,
      }));
  }, [history, isArabic]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="w-8 h-8 animate-pulse mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {isArabic
              ? "لا توجد بيانات تقدم لعرضها"
              : "No progress data to display"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <CardTitle>
              {isArabic ? "تتبع التقدم عبر الزمن" : "Progress Tracking Over Time"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "مقارنة التقدم الفعلي مقابل المخطط"
                : "Compare actual vs planned progress"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="h-80">
          <LazyChart minHeight={320}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.fullDate) {
                    return payload[0].payload.fullDate;
                  }
                  return "";
                }}
                formatter={(value: number, name: string) => {
                  const nameMap: Record<string, string> = {
                    actualProgress: isArabic ? "التقدم الفعلي" : "Actual Progress",
                    plannedProgress: isArabic ? "التقدم المخطط" : "Planned Progress",
                    actualSpent: isArabic ? "الإنفاق الفعلي" : "Actual Spent",
                    spi: "SPI",
                    cpi: "CPI",
                  };
                  return [`${value?.toFixed(1)}%`, nameMap[name] || name];
                }}
              />
              <Legend
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    actualProgress: isArabic ? "التقدم الفعلي" : "Actual Progress",
                    plannedProgress: isArabic ? "التقدم المخطط" : "Planned Progress",
                    actualSpent: isArabic ? "الإنفاق الفعلي" : "Actual Spent",
                  };
                  return labels[value] || value;
                }}
              />
              <ReferenceLine y={100} stroke="#888" strokeDasharray="5 5" />
              <Line
                type="monotone"
                dataKey="actualProgress"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="plannedProgress"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#94a3b8", r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="actualSpent"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: "#f97316", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "آخر تقدم" : "Latest Progress"}
            </div>
            <div className="text-lg font-bold text-primary">
              {chartData[chartData.length - 1]?.actualProgress?.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "آخر إنفاق" : "Latest Spent"}
            </div>
            <div className="text-lg font-bold text-orange-600">
              {chartData[chartData.length - 1]?.actualSpent?.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "عدد السجلات" : "Records"}
            </div>
            <div className="text-lg font-bold">{chartData.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {isArabic ? "الفرق" : "Variance"}
            </div>
            <div
              className={`text-lg font-bold ${
                (chartData[chartData.length - 1]?.actualProgress || 0) >=
                (chartData[chartData.length - 1]?.plannedProgress || 0)
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(
                (chartData[chartData.length - 1]?.actualProgress || 0) -
                (chartData[chartData.length - 1]?.plannedProgress || 0)
              ).toFixed(1)}
              %
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
