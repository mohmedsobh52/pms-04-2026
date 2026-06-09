import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface CertLite {
  id: string;
  certificate_number: number;
  period_to: string | null;
  current_work_done: number;
}

interface Props {
  certificates: CertLite[];
  contractValue?: number | null;
  isArabic?: boolean;
}

export function SCurveChart({ certificates, contractValue, isArabic }: Props) {
  const data = useMemo(() => {
    const sorted = [...certificates]
      .filter(c => c.period_to)
      .sort((a, b) => (a.period_to || "").localeCompare(b.period_to || ""));
    let cum = 0;
    return sorted.map(c => {
      cum += Number(c.current_work_done) || 0;
      return {
        date: c.period_to,
        label: `#${c.certificate_number}`,
        cumulative: Math.round(cum * 100) / 100,
        pct: contractValue ? Math.round((cum / contractValue) * 10000) / 100 : null,
      };
    });
  }, [certificates, contractValue]);

  const lastPct = data.length ? data[data.length - 1].pct : 0;
  const overBudget = (lastPct ?? 0) > 95;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {isArabic ? "منحنى التقدم التراكمي (S-Curve)" : "Cumulative Progress (S-Curve)"}
          </span>
          {contractValue ? (
            <Badge variant={overBudget ? "destructive" : "secondary"}>
              {isArabic ? `الإنجاز: ${lastPct ?? 0}%` : `Progress: ${lastPct ?? 0}%`}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {isArabic ? "لا توجد بيانات كافية لرسم المنحنى" : "Not enough data to render the curve"}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => new Intl.NumberFormat().format(v)} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: any, name: string) => name === "cumulative" ? [new Intl.NumberFormat().format(v), isArabic ? "تراكمي" : "Cumulative"] : v}
                labelFormatter={(l, p) => `${l} • ${p?.[0]?.payload?.date || ""}`}
              />
              <Legend />
              {contractValue ? (
                <ReferenceLine y={contractValue} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: isArabic ? "قيمة العقد" : "Contract", position: "right", fill: "hsl(var(--destructive))", fontSize: 11 }} />
              ) : null}
              <Line type="monotone" dataKey="cumulative" name={isArabic ? "تراكمي" : "Cumulative"} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
