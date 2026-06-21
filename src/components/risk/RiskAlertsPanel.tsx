import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export function RiskAlertsPanel({ risks }: { risks: any[] }) {
  const critical = risks
    .map((r) => ({ ...r, _score: (Number(r.probability_score) || 0) * (Number(r.impact_score) || 0) || Number(r.risk_score) || 0 }))
    .filter((r) => r._score >= 15)
    .sort((a, b) => b._score - a._score);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> High-Risk Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {critical.length === 0 && <p className="text-sm text-muted-foreground">No high-risk items.</p>}
        <ul className="divide-y">
          {critical.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.risk_title ?? r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.category ?? "—"} · {r.status ?? ""}</div>
              </div>
              <Badge variant="destructive">Score {r._score}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
