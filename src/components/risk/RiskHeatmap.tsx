import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function cellColor(score: number) {
  if (score >= 15) return "bg-red-500/80 text-white";
  if (score >= 9) return "bg-orange-400/80 text-white";
  if (score >= 5) return "bg-amber-300/80 text-amber-950";
  return "bg-emerald-400/70 text-emerald-950";
}

export function RiskHeatmap({ risks }: { risks: any[] }) {
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.forEach((r) => {
    const p = Number(r.probability_score) || 0;
    const i = Number(r.impact_score) || 0;
    if (p >= 1 && p <= 5 && i >= 1 && i <= 5) grid[5 - p][i - 1] += 1;
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Risk Heatmap (Probability × Impact)</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1 text-xs">
          <div></div>
          {[1,2,3,4,5].map((i) => <div key={i} className="text-center text-muted-foreground">I{i}</div>)}
          {grid.map((row, rIdx) => {
            const p = 5 - rIdx;
            return (
              <div key={p} className="contents">
                <div className="text-muted-foreground self-center">P{p}</div>
                {row.map((count, cIdx) => {
                  const score = p * (cIdx + 1);
                  return (
                    <div key={cIdx} className={`aspect-square rounded flex items-center justify-center font-medium ${cellColor(score)}`}>
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
