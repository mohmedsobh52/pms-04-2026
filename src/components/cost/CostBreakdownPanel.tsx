import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CostRow {
  general_labor?: number; equipment_operator?: number; overhead?: number; admin?: number;
  insurance?: number; contingency?: number; profit_margin?: number;
  materials?: number; equipment?: number; subcontractor?: number;
}

const GROUPS: Array<{ key: keyof CostRow; label: string; group: string }> = [
  { key: "materials", label: "Materials", group: "Direct" },
  { key: "general_labor", label: "Labor", group: "Direct" },
  { key: "equipment", label: "Equipment", group: "Direct" },
  { key: "equipment_operator", label: "Operator", group: "Direct" },
  { key: "subcontractor", label: "Subcontractor", group: "Direct" },
  { key: "overhead", label: "Overhead", group: "Indirect" },
  { key: "admin", label: "Admin", group: "Indirect" },
  { key: "insurance", label: "Insurance", group: "Indirect" },
  { key: "contingency", label: "Contingency", group: "Risk" },
  { key: "profit_margin", label: "Profit", group: "Margin" },
];

export function CostBreakdownPanel({ cost, currency = "USD", title }: { cost: CostRow | null | undefined; currency?: string; title?: string }) {
  const safe = cost ?? {};
  const total = GROUPS.reduce((s, g) => s + (Number(safe[g.key]) || 0), 0) || 1;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title ?? "Cost Breakdown"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {GROUPS.map((g) => {
          const v = Number(safe[g.key]) || 0;
          const pct = (v / total) * 100;
          return (
            <div key={g.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{g.label} <span className="opacity-60">({g.group})</span></span>
                <span className="tabular-nums">{v.toFixed(2)} {currency} · {pct.toFixed(1)}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
        <div className="flex justify-between pt-2 border-t font-medium text-sm">
          <span>Total</span><span className="tabular-nums">{total.toFixed(2)} {currency}</span>
        </div>
      </CardContent>
    </Card>
  );
}
