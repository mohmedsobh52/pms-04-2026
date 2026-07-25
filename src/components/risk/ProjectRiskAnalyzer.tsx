import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Loader2,
  Save,
  RefreshCw,
  ShieldAlert,
  Brain,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

type AiRisk = {
  risk_title: string;
  risk_description: string;
  category: string;
  probability_score: number;
  impact_score: number;
  risk_score: number;
  mitigation_strategy: string;
  contingency_plan: string;
  risk_owner: string;
};

const scoreTone = (s: number) =>
  s >= 15
    ? "bg-red-500/15 text-red-600 border-red-500/40"
    : s >= 8
      ? "bg-amber-500/15 text-amber-600 border-amber-500/40"
      : "bg-emerald-500/15 text-emerald-600 border-emerald-500/40";

export function ProjectRiskAnalyzer({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<AiRisk[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("saved_projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      setProjects((data ?? []) as any);
    })();
  }, [user]);

  const runAnalysis = async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    setRisks([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-project-risks",
        { body: { projectId: pid, language: "ar" } },
      );
      if (error) throw error;
      const out = (data?.risks ?? []) as AiRisk[];
      setRisks(out);
      setSelected(new Set(out.map((_, i) => i)));
      toast.success(`تم توليد ${out.length} مخاطرة بواسطة الذكاء الاصطناعي`);
    } catch (e: any) {
      toast.error(e?.message || "فشل تحليل المخاطر");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (pid: string) => {
    setProjectId(pid);
    setProjectName(projects.find((p) => p.id === pid)?.name || "");
    runAnalysis(pid);
  };

  const toggle = (i: number) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === risks.length) setSelected(new Set());
    else setSelected(new Set(risks.map((_, i) => i)));
  };

  const saveSelected = async () => {
    if (!user || !projectId || selected.size === 0) return;
    setSaving(true);
    const rows = Array.from(selected).map((i) => {
      const r = risks[i];
      return {
        user_id: user.id,
        project_id: projectId,
        risk_title: r.risk_title,
        risk_description: r.risk_description,
        category: r.category,
        probability_score: r.probability_score,
        impact_score: r.impact_score,
        risk_score: r.risk_score,
        probability:
          r.probability_score >= 4 ? "high" : r.probability_score <= 2 ? "low" : "medium",
        impact: r.impact_score >= 4 ? "high" : r.impact_score <= 2 ? "low" : "medium",
        mitigation_strategy: r.mitigation_strategy,
        contingency_plan: r.contingency_plan,
        risk_owner: r.risk_owner,
        status: "identified",
      };
    });
    const { error } = await supabase.from("risks").insert(rows);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`تم حفظ ${rows.length} مخاطرة في سجل المخاطر`);
    setRisks([]);
    setSelected(new Set());
    onSaved?.();
  };

  const summary = useMemo(() => {
    if (!risks.length) return null;
    const high = risks.filter((r) => r.risk_score >= 15).length;
    const med = risks.filter((r) => r.risk_score >= 8 && r.risk_score < 15).length;
    const low = risks.filter((r) => r.risk_score < 8).length;
    return { high, med, low, avg: Math.round(risks.reduce((s, r) => s + r.risk_score, 0) / risks.length) };
  }, [risks]);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          تحليل المخاطر بالذكاء الاصطناعي
          <Badge variant="outline" className="ms-2 text-[10px] gap-1">
            <Sparkles className="w-3 h-3" />
            Gemini
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          اختر مشروعاً محفوظاً ليقوم البرنامج تلقائياً بتحليل بنوده وتوليد سجل
          مخاطر شامل قابل للحفظ.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectId} onValueChange={handleSelect} disabled={loading}>
            <SelectTrigger className="h-9 flex-1 min-w-[240px]">
              <SelectValue placeholder="اختر مشروعاً محفوظاً…" />
            </SelectTrigger>
            <SelectContent>
              {projects.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  لا توجد مشاريع محفوظة
                </div>
              )}
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runAnalysis(projectId)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ms-1">إعادة التحليل</span>
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            جارٍ تحليل «{projectName}» وتوليد سجل المخاطر…
          </div>
        )}

        {!loading && risks.length > 0 && summary && (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-md bg-red-500/10">
                <div className="text-[10px] text-muted-foreground">عالية</div>
                <div className="text-lg font-bold text-red-600">{summary.high}</div>
              </div>
              <div className="p-2 rounded-md bg-amber-500/10">
                <div className="text-[10px] text-muted-foreground">متوسطة</div>
                <div className="text-lg font-bold text-amber-600">{summary.med}</div>
              </div>
              <div className="p-2 rounded-md bg-emerald-500/10">
                <div className="text-[10px] text-muted-foreground">منخفضة</div>
                <div className="text-lg font-bold text-emerald-600">{summary.low}</div>
              </div>
              <div className="p-2 rounded-md bg-primary/10">
                <div className="text-[10px] text-muted-foreground">متوسط</div>
                <div className="text-lg font-bold text-primary">{summary.avg}</div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={selected.size === risks.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="text-right">المخاطرة</TableHead>
                    <TableHead className="text-right">الفئة</TableHead>
                    <TableHead className="text-right">P×I</TableHead>
                    <TableHead className="text-right">الخطورة</TableHead>
                    <TableHead className="text-right">المسؤول</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((r, i) => (
                    <TableRow key={i} className="align-top">
                      <TableCell>
                        <Checkbox
                          checked={selected.has(i)}
                          onCheckedChange={() => toggle(i)}
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-xs font-medium">{r.risk_title}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-2">
                          {r.risk_description}
                        </div>
                        <div className="text-[10px] text-primary/80 mt-1">
                          <ShieldAlert className="w-3 h-3 inline ms-1" />
                          {r.mitigation_strategy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono whitespace-nowrap">
                        {r.probability_score} × {r.impact_score}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold ${scoreTone(r.risk_score)}`}
                        >
                          {r.risk_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {r.risk_owner}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {selected.size} من {risks.length} محددة
              </div>
              <Button
                onClick={saveSelected}
                disabled={saving || selected.size === 0}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="ms-1">حفظ المخاطر المحددة</span>
              </Button>
            </div>
          </>
        )}

        {!loading && risks.length === 0 && projectId && (
          <div className="text-center text-xs text-muted-foreground py-6">
            لم يتم توليد مخاطر بعد.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
