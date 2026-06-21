import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

const PHASES = ["Draft", "Active", "Variations", "Closeout", "Warranty"] as const;

function phaseIndex(c: any): number {
  if (!c) return 0;
  const s = (c.status ?? "").toLowerCase();
  if (s === "draft") return 0;
  if (s === "closed" || s === "completed") return 3;
  if (s === "warranty") return 4;
  if (c.end_date && new Date(c.end_date) < new Date()) return 3;
  return 1;
}

export function ContractLifecycleTimeline({ contract }: { contract: any }) {
  const active = phaseIndex(contract);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Lifecycle</CardTitle></CardHeader>
      <CardContent>
        <ol className="flex items-center gap-2 overflow-x-auto">
          {PHASES.map((p, i) => (
            <li key={p} className="flex items-center gap-2 shrink-0">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                i <= active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"
              }`}>
                {i < active ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={`text-sm ${i <= active ? "" : "text-muted-foreground"}`}>{p}</span>
              {i < PHASES.length - 1 && <span className={`h-px w-8 ${i < active ? "bg-primary" : "bg-border"}`} />}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
