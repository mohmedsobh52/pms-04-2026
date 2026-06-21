import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  History,
  FileText,
  Edit3,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  projectId: string;
}

type Activity = {
  id: string;
  ts: string;
  kind: "audit" | "progress" | "certificate";
  label: string;
  detail?: string;
};

const KIND_ICONS = {
  audit: Edit3,
  progress: CheckCircle2,
  certificate: FileText,
} as const;

/**
 * Project activity feed — pulls from real tables only:
 *  - analysis_audit_logs (BOQ edits, AI runs, etc.)
 *  - project_progress_history (progress updates)
 *  - progress_certificates (issued certificates)
 */
export function ProjectActivityFeed({ projectId }: Props) {
  const { isArabic } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["project-activity", projectId],
    enabled: !!projectId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Activity[]> => {
      const out: Activity[] = [];

      const [{ data: audits }, { data: progress }, { data: certs }] =
        await Promise.all([
          (supabase as any)
            .from("analysis_audit_logs")
            .select("id,action,item_number,status,created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(30),
          (supabase as any)
            .from("project_progress_history")
            .select("id,record_date,actual_progress,notes,created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(15),
          (supabase as any)
            .from("progress_certificates")
            .select("id,certificate_number,status,net_amount,created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(15),
        ]);

      (audits ?? []).forEach((a: any) =>
        out.push({
          id: `a-${a.id}`,
          ts: a.created_at,
          kind: "audit",
          label: `${a.action}${a.item_number ? ` · ${a.item_number}` : ""}`,
          detail: a.status,
        })
      );
      (progress ?? []).forEach((p: any) =>
        out.push({
          id: `p-${p.id}`,
          ts: p.created_at,
          kind: "progress",
          label: isArabic
            ? `تحديث التقدم: ${Number(p.actual_progress ?? 0).toFixed(1)}%`
            : `Progress update: ${Number(p.actual_progress ?? 0).toFixed(1)}%`,
          detail: p.notes ?? undefined,
        })
      );
      (certs ?? []).forEach((c: any) =>
        out.push({
          id: `c-${c.id}`,
          ts: c.created_at,
          kind: "certificate",
          label: isArabic
            ? `مستخلص رقم ${c.certificate_number}`
            : `Certificate #${c.certificate_number}`,
          detail: c.status,
        })
      );

      return out.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 50);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        <History className="w-6 h-6 mx-auto mb-2 opacity-60" />
        {isArabic ? "لا يوجد نشاط بعد" : "No activity yet"}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {isArabic ? "سجل النشاط" : "Activity Log"}
        </h3>
        <span className="ms-auto text-[11px] text-muted-foreground">
          {data.length} {isArabic ? "حدث" : "events"}
        </span>
      </div>
      <ScrollArea className="max-h-[60vh]">
        <ul className="divide-y divide-border">
          {data.map((a) => {
            const Icon = KIND_ICONS[a.kind];
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{a.label}</p>
                  {a.detail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {a.detail}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(a.ts), {
                    addSuffix: true,
                    locale: isArabic ? ar : enUS,
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
