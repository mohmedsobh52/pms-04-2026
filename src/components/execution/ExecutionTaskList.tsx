import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { DelayBadge } from "./DelayBadge";
import { DataTable, Column } from "@/components/ui-ext/DataTable";

interface Props {
  projectId: string;
}

type Task = {
  id: string;
  item_number: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
};

/**
 * Execution task list — derived ENTIRELY from real DB data:
 *  - Items: project_items (item_number, description)
 *  - Schedule: wbs_data JSON on project_data (start/end/progress per item if present)
 *  - Progress fallback: latest project_progress_history.actual_progress applied
 *    proportionally only when the project has a single rolled-up progress.
 *  - If neither is available, the row simply shows "—" for those fields.
 */
export function ExecutionTaskList({ projectId }: Props) {
  const { isArabic } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["execution-tasks", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Task[]> => {
      const [{ data: items }, { data: project }] = await Promise.all([
        (supabase as any)
          .from("project_items")
          .select("id,item_number,description")
          .eq("project_id", projectId)
          .order("item_number", { ascending: true }),
        (supabase as any)
          .from("project_data")
          .select("wbs_data")
          .eq("id", projectId)
          .maybeSingle(),
      ]);

      // Build a schedule map from wbs_data if present.
      const schedule: Record<
        string,
        { start?: string; end?: string; progress?: number }
      > = {};
      const wbs = project?.wbs_data;
      const walk = (n: any) => {
        if (!n || typeof n !== "object") return;
        const key = n.item_number || n.code || n.id;
        if (key) {
          schedule[String(key)] = {
            start: n.start_date ?? n.start ?? undefined,
            end: n.end_date ?? n.end ?? n.finish ?? undefined,
            progress:
              n.progress != null
                ? Number(n.progress)
                : n.percent_complete != null
                ? Number(n.percent_complete)
                : undefined,
          };
        }
        const kids = n.children || n.items;
        if (Array.isArray(kids)) kids.forEach(walk);
      };
      if (Array.isArray(wbs)) wbs.forEach(walk);
      else if (wbs && typeof wbs === "object") walk(wbs);

      return (items ?? []).map((r: any) => {
        const s = schedule[r.item_number] ?? {};
        return {
          id: r.id,
          item_number: r.item_number ?? "",
          description: r.description ?? "",
          start_date: s.start ?? null,
          end_date: s.end ?? null,
          progress: Number(s.progress ?? 0),
        };
      });
    },
  });

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  const statusBadge = (t: Task) => {
    if (t.progress >= 100)
      return (
        <Badge variant="secondary" className="text-[10px]">
          {isArabic ? "مكتمل" : "Done"}
        </Badge>
      );
    if (t.progress > 0)
      return (
        <Badge className="text-[10px]">
          {isArabic ? "قيد التنفيذ" : "In progress"}
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-[10px]">
        {isArabic ? "لم يبدأ" : "Not started"}
      </Badge>
    );
  };

  const columns: Column<Task>[] = [
    {
      key: "item_number",
      header: isArabic ? "رقم البند" : "Item",
      accessor: (t) => t.item_number,
      className: "font-mono text-xs w-24",
    },
    {
      key: "description",
      header: isArabic ? "الوصف" : "Description",
      accessor: (t) => t.description,
      cell: (t) => <span className="truncate block max-w-md">{t.description}</span>,
    },
    {
      key: "start_date",
      header: isArabic ? "البداية" : "Start",
      accessor: (t) => t.start_date ?? "",
      cell: (t) => <span className="text-xs">{fmtDate(t.start_date)}</span>,
    },
    {
      key: "end_date",
      header: isArabic ? "النهاية" : "End",
      accessor: (t) => t.end_date ?? "",
      cell: (t) => (
        <span className="text-xs inline-flex items-center gap-1.5">
          {fmtDate(t.end_date)}
          <DelayBadge endDate={t.end_date} progress={t.progress} />
        </span>
      ),
    },
    {
      key: "progress",
      header: isArabic ? "التقدم" : "Progress",
      accessor: (t) => t.progress,
      cell: (t) => (
        <div className="flex items-center gap-2 min-w-[140px]">
          <Progress value={Math.min(100, t.progress)} className="h-1.5 flex-1" />
          <span className="text-xs tabular-nums w-10 text-end">
            {t.progress.toFixed(0)}%
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: isArabic ? "الحالة" : "Status",
      accessor: (t) =>
        t.progress >= 100 ? "done" : t.progress > 0 ? "active" : "pending",
      cell: statusBadge,
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">
          {isArabic ? "قائمة المهام" : "Task List"}
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            rowKey={(t) => t.id}
            pageSize={20}
            searchPlaceholder={isArabic ? "بحث في المهام…" : "Search tasks…"}
            emptyMessage={isArabic ? "لا توجد مهام" : "No tasks"}
          />
        )}
      </CardContent>
    </Card>
  );
}
