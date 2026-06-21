import { useState } from "react";
import { Check, X, Loader2, PlayCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useWorkflow, useWorkflowDefinitions } from "@/hooks/useWorkflow";
import { WorkflowStepper } from "./WorkflowStepper";

interface ApprovalPanelProps {
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  /** When the entity is not yet saved/persisted, panel only shows a hint. */
  title?: string;
}

const STATUS_LABEL: Record<string, { ar: string; tone: string }> = {
  pending: { ar: "بانتظار البدء", tone: "bg-muted" },
  in_progress: { ar: "قيد المراجعة", tone: "bg-primary/15 text-primary" },
  approved: { ar: "معتمد", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  rejected: { ar: "مرفوض", tone: "bg-destructive/15 text-destructive" },
  cancelled: { ar: "ملغي", tone: "bg-muted text-muted-foreground" },
};

export function ApprovalPanel({ entityType, entityId, projectId, title }: ApprovalPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const wf = useWorkflow(entityType, entityId);
  const { definitions } = useWorkflowDefinitions(entityType);

  const [pickedDefId, setPickedDefId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (!entityId) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">احفظ السجل أولاً لبدء سير الموافقات.</Card>
    );
  }

  const canDecide =
    !!wf.instance &&
    (wf.instance.status === "in_progress" || wf.instance.status === "pending") &&
    !!wf.currentStep &&
    (isAdmin ||
      wf.currentStep.approver_user_id === user?.id);
  // Note: role-based eligibility is enforced server-side too — UI hint only.

  const canCancel = !!wf.instance && (wf.instance.status === "in_progress" || wf.instance.status === "pending");

  const handleStart = async () => {
    if (!pickedDefId) return;
    setBusy(true);
    try {
      await wf.startWorkflow(pickedDefId, projectId ?? null);
      toast({ title: "بدأ سير العمل" });
    } catch (e: any) {
      toast({ title: "تعذّر بدء سير العمل", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDecide = async (decision: "approved" | "rejected") => {
    if (!wf.instance) return;
    setBusy(true);
    try {
      await wf.decideStep(wf.instance.id, decision, comment.trim() || undefined);
      setComment("");
      toast({ title: decision === "approved" ? "تمت الموافقة" : "تم الرفض" });
    } catch (e: any) {
      toast({ title: "فشلت العملية", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!wf.instance) return;
    const reason = window.prompt("سبب الإلغاء (اختياري):") ?? undefined;
    setBusy(true);
    try {
      await wf.cancelWorkflow(wf.instance.id, reason);
      toast({ title: "تم الإلغاء" });
    } catch (e: any) {
      toast({ title: "فشل الإلغاء", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold">{title ?? "سير الموافقات"}</h3>
          <p className="text-xs text-muted-foreground">{entityType}</p>
        </div>
        {wf.instance && (
          <Badge variant="secondary" className={STATUS_LABEL[wf.instance.status]?.tone}>
            {STATUS_LABEL[wf.instance.status]?.ar ?? wf.instance.status}
          </Badge>
        )}
      </div>

      {wf.loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      )}

      {!wf.instance && !wf.loading && (
        <div className="space-y-3">
          {definitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد قوالب سير عمل مفعّلة لهذا النوع. اطلب من المسؤول إنشاء قالب.
            </p>
          ) : (
            <>
              <Select value={pickedDefId} onValueChange={setPickedDefId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قالب الموافقة" />
                </SelectTrigger>
                <SelectContent>
                  {definitions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleStart} disabled={!pickedDefId || busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <PlayCircle className="h-4 w-4 me-2" />}
                بدء سير العمل
              </Button>
            </>
          )}
        </div>
      )}

      {wf.instance && (
        <>
          <WorkflowStepper instance={wf.instance} steps={wf.steps} approvals={wf.approvals} />

          {canDecide && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <label className="text-sm font-medium" htmlFor="wf-comment">تعليق (اختياري)</label>
              <Textarea
                id="wf-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="تعليق على القرار…"
              />
              <div className="flex gap-2">
                <Button onClick={() => handleDecide("approved")} disabled={busy} className="flex-1">
                  <Check className="h-4 w-4 me-2" /> اعتماد
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecide("rejected")}
                  disabled={busy}
                  className="flex-1"
                >
                  <X className="h-4 w-4 me-2" /> رفض
                </Button>
              </div>
            </div>
          )}

          {wf.approvals.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">سجل الموافقات</div>
              <ul className="text-xs space-y-1">
                {wf.approvals.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 border-b py-1 last:border-0">
                    <span>
                      الخطوة {a.step_order} —{" "}
                      <span className={a.decision === "approved" ? "text-emerald-600" : "text-destructive"}>
                        {a.decision === "approved" ? "اعتماد" : "رفض"}
                      </span>
                    </span>
                    <span className="text-muted-foreground">{new Date(a.decided_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canCancel && (
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={busy}>
              <Ban className="h-4 w-4 me-2" /> إلغاء سير العمل
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
