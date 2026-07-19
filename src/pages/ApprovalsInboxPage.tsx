import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Inbox, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/AppShell";
import { ApprovalPanel } from "@/components/workflow/ApprovalPanel";
import type { Database } from "@/integrations/supabase/types";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildApprovalsSuggestions } from "@/lib/suggestion-generators";

type Instance = Database["public"]["Tables"]["workflow_instances"]["Row"];
type Step = Database["public"]["Tables"]["workflow_steps"]["Row"];
type Definition = Database["public"]["Tables"]["workflow_definitions"]["Row"];

interface Row {
  instance: Instance;
  step: Step | null;
  definition: Definition | null;
}

const ENTITY_LABEL: Record<string, string> = {
  procurement_item: "بند مشتريات",
  contract: "عقد",
  progress_certificate: "شهادة إنجاز",
  contract_variation: "تغيير عقد",
  risk: "مخاطرة",
};

export default function ApprovalsInboxPage() {
  const { user } = useAuth();
  const { roles, isAdmin } = useUserRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Fetch active instances visible to this user (RLS handles visibility)
    const { data: instances } = await supabase
      .from("workflow_instances")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("started_at", { ascending: false })
      .limit(100);

    const list = instances ?? [];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const defIds = Array.from(new Set(list.map((i) => i.definition_id)));
    const [defRes, stepRes] = await Promise.all([
      supabase.from("workflow_definitions").select("*").in("id", defIds),
      supabase.from("workflow_steps").select("*").in("definition_id", defIds),
    ]);
    const defMap = new Map((defRes.data ?? []).map((d) => [d.id, d]));
    const stepMap = new Map<string, Step>();
    (stepRes.data ?? []).forEach((s) => {
      stepMap.set(`${s.definition_id}:${s.step_order}`, s);
    });
    const out: Row[] = list.map((i) => ({
      instance: i,
      definition: defMap.get(i.definition_id) ?? null,
      step: stepMap.get(`${i.definition_id}:${i.current_step_order}`) ?? null,
    }));
    setRows(out);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Filter to those the current user can decide on
  const myRows = useMemo(() => {
    if (!user) return [];
    return rows.filter((r) => {
      const s = r.step;
      if (!s) return false;
      if (isAdmin) return true;
      if (s.approver_user_id === user.id) return true;
      if (s.approver_role && (roles as string[]).includes(s.approver_role)) return true;
      return false;
    });
  }, [rows, user, roles, isAdmin]);

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">صندوق الموافقات</h1>
        <p className="text-sm text-muted-foreground">سير الأعمال المعلّقة بانتظار قرارك</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">المهام المعلّقة ({myRows.length})</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
            </div>
          ) : myRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              لا توجد مهام موافقة معلّقة.
            </p>
          ) : (
            <ul className="space-y-2">
              {myRows.map((r) => {
                const isSelected = selected?.instance.id === r.instance.id;
                const overdue = r.instance.due_at && new Date(r.instance.due_at) < new Date();
                return (
                  <li key={r.instance.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className={`w-full text-start rounded-md border p-3 transition-colors hover:bg-muted/40 ${
                        isSelected ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-medium text-sm">{r.definition?.name ?? "—"}</div>
                        <Badge variant={overdue ? "destructive" : "secondary"}>
                          {overdue ? "متأخر" : "جارٍ"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ENTITY_LABEL[r.instance.entity_type] ?? r.instance.entity_type} ·{" "}
                        الخطوة {r.instance.current_step_order}
                        {r.step ? ` — ${r.step.name}` : ""}
                      </div>
                      {r.instance.due_at && (
                        <div className="text-xs text-muted-foreground">
                          الاستحقاق: {new Date(r.instance.due_at).toLocaleString()}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-3">
          {selected ? (
            <ApprovalPanel
              entityType={selected.instance.entity_type}
              entityId={selected.instance.entity_id}
              projectId={selected.instance.project_id}
              title={selected.definition?.name ?? "سير الموافقات"}
            />
          ) : (
            <Card className="p-6 text-sm text-muted-foreground text-center">
              اختر مهمة من القائمة لعرض تفاصيل سير العمل واتخاذ قرار.
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
