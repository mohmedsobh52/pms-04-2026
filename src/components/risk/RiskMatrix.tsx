import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

export function RiskMatrix({ risks }: { risks: any[] }) {
  const data = risks
    .filter((r) => r.probability_score && r.impact_score)
    .map((r) => ({
      x: Number(r.impact_score), y: Number(r.probability_score),
      z: (Number(r.probability_score) * Number(r.impact_score)),
      name: r.risk_title ?? r.title ?? "Risk",
    }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Probability / Impact Matrix</CardTitle></CardHeader>
      <CardContent style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Impact" domain={[0, 6]} ticks={[1,2,3,4,5]} />
            <YAxis type="number" dataKey="y" name="Probability" domain={[0, 6]} ticks={[1,2,3,4,5]} />
            <ZAxis type="number" dataKey="z" range={[60, 300]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill="hsl(var(--primary))" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
