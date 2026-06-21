import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import { DelayBadge } from "./DelayBadge";

interface Props {
  projectId: string;
}

type Task = {
  id: string;
  item_number: string;
  description: string;
  start: Date;
  end: Date;
  progress: number;
};

/**
 * Lightweight Gantt-style timeline. Reads real schedule data from
 * project_data.wbs_data (start_date/end_date/progress per WBS node).
 * Renders zero rows when no scheduled tasks exist — no fabrication.
 */
export function ExecutionTimeline({ projectId }: Props) {
  const { isArabic } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["execution-timeline", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Task[]> => {
      const { data: project } = await (supabase as any)
        .from("project_data")
        .select("wbs_data")
        .eq("id", projectId)
        .maybeSingle();
      const wbs = project?.wbs_data;
      const tasks: Task[] = [];
      const walk = (n: any) => {
        if (!n || typeof n !== "object") return;
        const start = n.start_date ?? n.start;
        const end = n.end_date ?? n.end ?? n.finish;
        if (start && end) {
          const s = new Date(start);
          const e = new Date(end);
          if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
            tasks.push({
              id: String(n.id ?? n.item_number ?? n.code ?? Math.random()),
              item_number: String(n.item_number ?? n.code ?? ""),
              description: String(n.description ?? n.name ?? ""),
              start: s,
              end: e,
              progress: Number(n.progress ?? n.percent_complete ?? 0),
            });
          }
        }
        const kids = n.children || n.items;
        if (Array.isArray(kids)) kids.forEach(walk);
      };
      if (Array.isArray(wbs)) wbs.forEach(walk);
      else if (wbs && typeof wbs === "object") walk(wbs);
      return tasks.sort((a, b) => a.start.getTime() - b.start.getTime());
    },
  });

  const range = useMemo(() => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data.map((t) => t.start.getTime()));
    const max = Math.max(...data.map((t) => t.end.getTime()));
    return { min: new Date(min), max: new Date(max), spanDays: Math.max(1, differenceInDays(new Date(max), new Date(min))) };
  }, [data]);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {isArabic ? "الخط الزمني للتنفيذ" : "Execution Timeline"}
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 || !range ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {isArabic
              ? "لا توجد بيانات جدولة (تاريخ بداية/نهاية) في WBS"
              : "No schedule data (start/end dates) in WBS"}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-center text-[10px] text-muted-foreground border-b border-border pb-1.5 mb-1">
              <span className="w-48 shrink-0">{isArabic ? "المهمة" : "Task"}</span>
              <span className="flex-1 flex justify-between">
                <span>{range.min.toLocaleDateString()}</span>
                <span>{range.max.toLocaleDateString()}</span>
              </span>
            </div>
            {data.map((t) => {
              const offset = (differenceInDays(t.start, range.min) / range.spanDays) * 100;
              const width = Math.max(
                1,
                (differenceInDays(t.end, t.start) / range.spanDays) * 100
              );
              const pct = Math.min(100, Math.max(0, t.progress));
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2 text-xs py-1.5 hover:bg-muted/40 rounded"
                >
                  <div className="w-48 shrink-0 truncate flex items-center gap-1.5">
                    <span className="font-mono text-muted-foreground">{t.item_number}</span>
                    <span className="truncate">{t.description}</span>
                  </div>
                  <div className="flex-1 relative h-5 bg-muted/40 rounded">
                    <div
                      className="absolute top-0 h-full bg-primary/20 rounded"
                      style={{ insetInlineStart: `${offset}%`, width: `${width}%` }}
                    >
                      <div
                        className="h-full bg-primary rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-end tabular-nums shrink-0">
                    {pct.toFixed(0)}%
                  </div>
                  <DelayBadge endDate={t.end.toISOString()} progress={pct} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
