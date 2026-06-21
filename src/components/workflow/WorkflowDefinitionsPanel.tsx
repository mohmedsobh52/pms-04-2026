import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Edit3, Loader2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type WorkflowDefinition = Database["public"]["Tables"]["workflow_definitions"]["Row"];
type WorkflowStep = Database["public"]["Tables"]["workflow_steps"]["Row"];

const ENTITY_TYPES = [
  { value: "procurement_item", label: "بند مشتريات" },
  { value: "contract", label: "عقد" },
  { value: "progress_certificate", label: "شهادة إنجاز" },
  { value: "contract_variation", label: "تغيير عقد" },
  { value: "risk", label: "مخاطرة" },
] as const;

const ROLES = ["admin", "moderator", "user"] as const;

interface StepDraft {
  id?: string;
  step_order: number;
  name: string;
  approver_role: (typeof ROLES)[number] | null;
  sla_hours: number | null;
  allow_parallel: boolean;
}

/**
 * Admin-only panel: create / edit / delete workflow definitions + steps.
 * Mount inside an admin-gated route.
 */
export function WorkflowDefinitionsPanel() {
  const { toast } = useToast();
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [stepsByDef, setStepsByDef] = useState<Record<string, WorkflowStep[]>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkflowDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [defRes, stepRes] = await Promise.all([
      supabase.from("workflow_definitions").select("*").order("created_at", { ascending: false }),
      supabase.from("workflow_steps").select("*").order("step_order", { ascending: true }),
    ]);
    setDefs(defRes.data ?? []);
    const grouped: Record<string, WorkflowStep[]> = {};
    (stepRes.data ?? []).forEach((s) => {
      (grouped[s.definition_id] ||= []).push(s);
    });
    setStepsByDef(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (def: WorkflowDefinition) => {
    const { error } = await supabase
      .from("workflow_definitions")
      .update({ is_active: !def.is_active })
      .eq("id", def.id);
    if (error) {
      toast({ title: "تعذّر التحديث", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (def: WorkflowDefinition) => {
    if (!window.confirm(`حذف القالب "${def.name}"؟`)) return;
    const { error } = await supabase.from("workflow_definitions").delete().eq("id", def.id);
    if (error) {
      toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">قوالب سير العمل</h3>
          <p className="text-xs text-muted-foreground">إدارة مسارات الموافقات لكل وحدة.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 me-1" /> قالب جديد
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : defs.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد قوالب بعد.</p>
      ) : (
        <ul className="space-y-2">
          {defs.map((d) => {
            const steps = stepsByDef[d.id] ?? [];
            const entityLabel = ENTITY_TYPES.find((e) => e.value === d.entity_type)?.label ?? d.entity_type;
            return (
              <li key={d.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {entityLabel} · {steps.length} خطوة
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.is_active ? "default" : "secondary"}>
                      {d.is_active ? "نشط" : "متوقف"}
                    </Badge>
                    <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} aria-label="تفعيل/إيقاف" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(d);
                        setDialogOpen(true);
                      }}
                      aria-label="تعديل"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(d)} aria-label="حذف">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {steps.length > 0 && (
                  <ol className="mt-2 flex flex-wrap gap-1 text-xs">
                    {steps.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-full bg-muted px-2 py-0.5"
                      >
                        {s.step_order}. {s.name}
                        {s.approver_role ? ` (${s.approver_role})` : ""}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DefinitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        initialSteps={editing ? stepsByDef[editing.id] ?? [] : []}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </Card>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: WorkflowDefinition | null;
  initialSteps: WorkflowStep[];
  onSaved: () => void;
}

function DefinitionDialog({ open, onOpenChange, editing, initialSteps, onSaved }: DialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState<string>(ENTITY_TYPES[0].value);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setEntityType(editing?.entity_type ?? ENTITY_TYPES[0].value);
    setSteps(
      initialSteps.length
        ? initialSteps.map((s) => ({
            id: s.id,
            step_order: s.step_order,
            name: s.name,
            approver_role: (s.approver_role as any) ?? null,
            sla_hours: s.sla_hours,
            allow_parallel: s.allow_parallel,
          }))
        : [{ step_order: 1, name: "مراجعة أولية", approver_role: "moderator", sla_hours: 48, allow_parallel: false }],
    );
  }, [open, editing, initialSteps]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_order: prev.length + 1,
        name: "",
        approver_role: "moderator",
        sla_hours: null,
        allow_parallel: false,
      },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const validate = () => {
    if (!name.trim()) return "اسم القالب مطلوب";
    if (steps.length === 0) return "أضف خطوة واحدة على الأقل";
    for (const s of steps) {
      if (!s.name.trim()) return "اسم كل خطوة مطلوب";
      if (!s.approver_role) return "حدّد دور الموافقة لكل خطوة";
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let defId = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from("workflow_definitions")
          .update({ name, description, entity_type: entityType })
          .eq("id", editing.id);
        if (error) throw error;
        // Replace steps: simplest reliable approach
        const { error: delErr } = await supabase.from("workflow_steps").delete().eq("definition_id", editing.id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase
          .from("workflow_definitions")
          .insert({ name, description, entity_type: entityType })
          .select("id")
          .single();
        if (error) throw error;
        defId = data!.id;
      }
      const payload = steps.map((s, i) => ({
        definition_id: defId!,
        step_order: i + 1,
        name: s.name,
        approver_role: s.approver_role,
        sla_hours: s.sla_hours,
        allow_parallel: s.allow_parallel,
      }));
      const { error: insErr } = await supabase.from("workflow_steps").insert(payload);
      if (insErr) throw insErr;
      toast({ title: editing ? "تم التحديث" : "تم إنشاء القالب" });
      onSaved();
    } catch (e: any) {
      toast({ title: "تعذّر الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل قالب" : "قالب سير عمل جديد"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="wfd-name">الاسم</Label>
            <Input id="wfd-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wfd-desc">الوصف</Label>
            <Textarea id="wfd-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label>نوع الكيان</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>الخطوات</Label>
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="h-4 w-4 me-1" /> خطوة
              </Button>
            </div>
            <ul className="space-y-2">
              {steps.map((s, idx) => (
                <li key={idx} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-muted rounded-full w-6 h-6 inline-flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <Input
                      value={s.name}
                      onChange={(e) => updateStep(idx, { name: e.target.value })}
                      placeholder="اسم الخطوة"
                      className="flex-1"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeStep(idx)} aria-label="حذف الخطوة">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">دور الموافقة</Label>
                      <Select
                        value={s.approver_role ?? ""}
                        onValueChange={(v) => updateStep(idx, { approver_role: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">SLA (ساعات)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={s.sla_hours ?? ""}
                        onChange={(e) =>
                          updateStep(idx, { sla_hours: e.target.value ? Number(e.target.value) : null })
                        }
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
