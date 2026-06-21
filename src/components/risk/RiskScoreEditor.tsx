import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RiskScoreEditor({ risk, onSaved }: { risk: any; onSaved?: () => void }) {
  const [p, setP] = useState<number>(risk?.probability_score ?? 3);
  const [i, setI] = useState<number>(risk?.impact_score ?? 3);
  const score = p * i;
  const level = score >= 15 ? "Critical" : score >= 9 ? "High" : score >= 5 ? "Medium" : "Low";
  const variant: any = score >= 15 ? "destructive" : score >= 9 ? "secondary" : "outline";

  const save = async () => {
    await supabase.from("risks").update({ probability_score: p, impact_score: i, risk_score: score }).eq("id", risk.id);
    onSaved?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Risk Score</span>
          <Badge variant={variant}>{level} · {score}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1"><span>Probability</span><span className="tabular-nums">{p}/5</span></div>
          <Slider value={[p]} min={1} max={5} step={1} onValueChange={(v) => setP(v[0])} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1"><span>Impact</span><span className="tabular-nums">{i}/5</span></div>
          <Slider value={[i]} min={1} max={5} step={1} onValueChange={(v) => setI(v[0])} />
        </div>
        <Button onClick={save} size="sm" className="w-full">Save</Button>
      </CardContent>
    </Card>
  );
}
