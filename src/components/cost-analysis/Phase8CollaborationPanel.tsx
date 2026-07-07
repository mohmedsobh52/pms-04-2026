import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  MessageSquare,
  ShieldCheck,
  Bell,
  History,
  Send,
  CornerDownRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Play,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, ROLE_LABELS, type AppRole } from "@/hooks/useUserRoles";
import { useWorkflow, useWorkflowDefinitions } from "@/hooks/useWorkflow";
import { PERMISSIONS, ACTION_LABELS, can, type Action } from "@/lib/permissions-matrix";
import { Can } from "@/components/auth/Can";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  analysisKey: string; // stable label (e.g. projectName)
  projectId?: string | null;
}

interface LocalComment {
  id: string;
  parentId: string | null;
  author: string;
  text: string;
  mentions: string[];
  createdAt: string;
  resolved: boolean;
}

const ENTITY_TYPE = "cost_analysis";

/** Generate/retrieve a stable UUID for this analysis so workflow rows can attach. */
function getStableEntityId(key: string): string {
  const storageKey = `cost_analysis_entity_id::${key}`;
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, id!);
  }
  return id!;
}

const COMMENTS_KEY = "cost_analysis_comments";

function loadComments(entityId: string): LocalComment[] {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}") as Record<string, LocalComment[]>;
    return all[entityId] ?? [];
  } catch {
    return [];
  }
}
function saveComments(entityId: string, list: LocalComment[]) {
  const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}") as Record<string, LocalComment[]>;
  all[entityId] = list;
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
}

function parseMentions(text: string): string[] {
  const re = /@([\p{L}\w][\p{L}\w.-]{1,40})/gu;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

function renderWithMentions(text: string) {
  const parts = text.split(/(@[\p{L}\w][\p{L}\w.-]{1,40})/gu);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-primary font-medium">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  in_progress: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  rejected: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  cancelled: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

export function Phase8CollaborationPanel({ analysisKey, projectId }: Props) {
  const { user } = useAuth();
  const { roles, isAdmin } = useUserRoles();
  const entityId = useMemo(() => getStableEntityId(analysisKey || "default"), [analysisKey]);

  const { definitions } = useWorkflowDefinitions(ENTITY_TYPE);
  const {
    instance,
    definition,
    steps,
    approvals,
    currentStep,
    loading,
    startWorkflow,
    decideStep,
    cancelWorkflow,
    refresh,
  } = useWorkflow(ENTITY_TYPE, entityId);

  const [selectedDefId, setSelectedDefId] = useState<string>("");
  useEffect(() => {
    if (!selectedDefId && definitions.length > 0) setSelectedDefId(definitions[0].id);
  }, [definitions, selectedDefId]);

  // Comments
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  useEffect(() => {
    setComments(loadComments(entityId));
  }, [entityId]);

  // Load possible mention targets from user_roles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("user_roles")
          .select("user_id")
          .limit(50);
        if (!cancelled && data) {
          setTeamMembers(Array.from(new Set(data.map((r: any) => (r.user_id as string).slice(0, 8)))));
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = (next: LocalComment[]) => {
    setComments(next);
    saveComments(entityId, next);
  };

  const addComment = () => {
    const text = draft.trim();
    if (!text) return;
    const c: LocalComment = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      parentId: replyTo,
      author: user?.email?.split("@")[0] ?? "مستخدم",
      text,
      mentions: parseMentions(text),
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    persist([c, ...comments]);
    setDraft("");
    setReplyTo(null);
    if (c.mentions.length > 0) {
      toast.success(`تم إشعار ${c.mentions.length} مستخدم`);
    }
  };

  const toggleResolve = (id: string) => {
    persist(comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)));
  };

  const deleteComment = (id: string) => {
    persist(comments.filter((c) => c.id !== id && c.parentId !== id));
  };

  const visibleThreads = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId && (showResolved || !c.resolved));
    return roots.map((r) => ({
      root: r,
      replies: comments.filter((x) => x.parentId === r.id),
    }));
  }, [comments, showResolved]);

  const canApproveCurrent =
    !!currentStep &&
    (isAdmin ||
      currentStep.approver_user_id === user?.id ||
      (!!currentStep.approver_role && roles.includes(currentStep.approver_role as AppRole)));

  const handleStart = async () => {
    if (!selectedDefId) {
      toast.error("اختر تعريف سير العمل أولاً");
      return;
    }
    try {
      await startWorkflow(selectedDefId, projectId ?? null, { source: "cost_analysis_panel" });
      toast.success("تم بدء دورة الاعتماد");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل بدء دورة الاعتماد");
    }
  };

  const handleDecide = async (decision: "approved" | "rejected") => {
    if (!instance) return;
    try {
      await decideStep(instance.id, decision as any);
      toast.success(decision === "approved" ? "تم اعتماد الخطوة" : "تم رفض الطلب");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل تسجيل القرار");
    }
  };

  const handleCancel = async () => {
    if (!instance) return;
    try {
      await cancelWorkflow(instance.id, "ألغى المستخدم من لوحة التعاون");
      toast.info("تم إلغاء الدورة");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الإلغاء");
    }
  };

  const activeActions: Action[] = (Object.keys(ACTION_LABELS) as Action[]).filter((a) =>
    can(roles, a),
  );

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            التعاون والاعتماد
          </CardTitle>
          <div className="flex items-center gap-2">
            {instance && (
              <Badge variant="outline" className={STATUS_TONE[instance.status] ?? ""}>
                {STATUS_LABEL[instance.status] ?? instance.status}
              </Badge>
            )}
            {roles.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {roles.map((r) => ROLE_LABELS[r]?.ar ?? r).join(" · ")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="workflow" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> الاعتماد
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> تعليقات
              {comments.filter((c) => !c.resolved).length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-[10px]">
                  {comments.filter((c) => !c.resolved).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="perms" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> الصلاحيات
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> النشاط
            </TabsTrigger>
          </TabsList>

          {/* WORKFLOW */}
          <TabsContent value="workflow" className="space-y-4">
            {!instance ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  لم يتم بدء دورة اعتماد لهذا التحليل بعد.
                </p>
                <div className="flex items-center gap-2">
                  <Select value={selectedDefId} onValueChange={setSelectedDefId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="اختر دورة اعتماد" />
                    </SelectTrigger>
                    <SelectContent>
                      {definitions.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground">
                          لا توجد تعريفات — أنشئها من الإعدادات
                        </div>
                      ) : (
                        definitions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Can role={["admin", "pm", "cost_engineer"]}>
                    <Button onClick={handleStart} disabled={!selectedDefId || loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      بدء الاعتماد
                    </Button>
                  </Can>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {definition?.name ?? "دورة اعتماد"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {instance.current_step_order}/{steps.length} خطوة
                    </div>
                  </div>
                  {/* Steps timeline */}
                  <ol className="space-y-1.5">
                    {steps.map((s) => {
                      const done = s.step_order < instance.current_step_order || instance.status === "approved";
                      const active = s.step_order === instance.current_step_order && instance.status === "in_progress";
                      const rejected = instance.status === "rejected" && s.step_order === instance.current_step_order;
                      return (
                        <li key={s.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              rejected
                                ? "bg-rose-500 text-white"
                                : done
                                ? "bg-emerald-500 text-white"
                                : active
                                ? "bg-sky-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {rejected ? <X className="w-3 h-3" /> : done ? <Check className="w-3 h-3" /> : s.step_order}
                          </span>
                          <span className={active ? "font-medium" : "text-muted-foreground"}>
                            {s.name}
                          </span>
                          {s.approver_role && (
                            <Badge variant="outline" className="h-4 text-[10px]">
                              {ROLE_LABELS[s.approver_role as AppRole]?.ar ?? s.approver_role}
                            </Badge>
                          )}
                          {s.sla_hours && (
                            <span className="text-muted-foreground">· SLA {s.sla_hours}س</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {instance.status === "in_progress" && (
                  <div className="flex items-center gap-2">
                    {canApproveCurrent ? (
                      <>
                        <Button size="sm" onClick={() => handleDecide("approved")} className="gap-1">
                          <CheckCircle2 className="w-4 h-4" /> اعتماد الخطوة
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDecide("rejected")} className="gap-1">
                          <XCircle className="w-4 h-4" /> رفض
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        لا تملك صلاحية اتخاذ قرار في الخطوة الحالية.
                      </p>
                    )}
                    <div className="flex-1" />
                    <Can role="admin">
                      <Button size="sm" variant="ghost" onClick={handleCancel} className="gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> إلغاء الدورة
                      </Button>
                    </Can>
                  </div>
                )}

                <Button size="sm" variant="outline" onClick={refresh} className="gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> تحديث
                </Button>
              </div>
            )}
          </TabsContent>

          {/* COMMENTS */}
          <TabsContent value="comments" className="space-y-3">
            <div className="rounded-lg border p-3 space-y-2">
              <Textarea
                placeholder={replyTo ? "اكتب ردك... استخدم @ لذكر أحد" : "اكتب تعليق... استخدم @username لذكر أحد"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={addComment} disabled={!draft.trim()} className="gap-1">
                  <Send className="w-3.5 h-3.5" /> {replyTo ? "رد" : "إضافة"}
                </Button>
                {replyTo && (
                  <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                    إلغاء الرد
                  </Button>
                )}
                <div className="flex-1" />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="accent-primary"
                  />
                  إظهار المحلولة
                </label>
              </div>
              {teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                  <span>اقتراحات ذكر:</span>
                  {teamMembers.slice(0, 6).map((m) => (
                    <button
                      key={m}
                      className="hover:text-primary"
                      onClick={() => setDraft((d) => `${d}${d && !d.endsWith(" ") ? " " : ""}@${m} `)}
                    >
                      @{m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ScrollArea className="max-h-[420px]">
              {visibleThreads.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  لا توجد تعليقات بعد.
                </p>
              ) : (
                <ul className="space-y-3">
                  {visibleThreads.map(({ root, replies }) => (
                    <li key={root.id} className="border rounded-lg p-3 space-y-2">
                      <CommentRow
                        c={root}
                        onReply={() => setReplyTo(root.id)}
                        onResolve={() => toggleResolve(root.id)}
                        onDelete={() => deleteComment(root.id)}
                        canManage={isAdmin || root.author === (user?.email?.split("@")[0] ?? "")}
                      />
                      {replies.length > 0 && (
                        <ul className="space-y-2 ps-6 border-s-2 border-muted">
                          {replies.map((r) => (
                            <li key={r.id}>
                              <CommentRow
                                c={r}
                                isReply
                                onResolve={() => toggleResolve(r.id)}
                                onDelete={() => deleteComment(r.id)}
                                canManage={isAdmin || r.author === (user?.email?.split("@")[0] ?? "")}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>

          {/* PERMISSIONS */}
          <TabsContent value="perms" className="space-y-3">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">صلاحياتك الحالية</span>
                <Badge variant="outline" className="text-[10px]">
                  {activeActions.length}/{Object.keys(ACTION_LABELS).length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeActions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد صلاحيات مفعّلة لدورك.</p>
                ) : (
                  activeActions.map((a) => (
                    <Badge key={a} variant="secondary" className="text-[11px]">
                      {ACTION_LABELS[a].ar}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[1fr_repeat(8,minmax(64px,1fr))] text-[11px] bg-muted/50 border-b">
                <div className="p-2 font-medium">الإجراء</div>
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                  <div key={r} className="p-2 text-center font-medium truncate" title={ROLE_LABELS[r].ar}>
                    {ROLE_LABELS[r].ar.split(" ")[0]}
                  </div>
                ))}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {(Object.keys(ACTION_LABELS) as Action[]).map((a, i) => (
                  <div
                    key={a}
                    className={`grid grid-cols-[1fr_repeat(8,minmax(64px,1fr))] text-[11px] ${
                      i % 2 ? "bg-muted/20" : ""
                    }`}
                  >
                    <div className="p-2 truncate">{ACTION_LABELS[a].ar}</div>
                    {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                      <div key={r} className="p-2 text-center">
                        {PERMISSIONS[r]?.[a] ? (
                          <Check className="w-3 h-3 text-emerald-600 inline" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Bell className="w-3 h-3" /> الإشعارات تصلك تلقائياً في مركز الإشعارات أعلى الصفحة عند تغيير الحالة أو ذكرك في تعليق.
            </p>
          </TabsContent>

          {/* ACTIVITY */}
          <TabsContent value="activity" className="space-y-2">
            {approvals.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                لا يوجد سجل قرارات بعد.
              </p>
            ) : (
              <ol className="space-y-2">
                {approvals.map((a) => (
                  <li key={a.id} className="border rounded-lg p-2 text-xs flex items-start gap-2">
                    {a.decision === "approved" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          خطوة {a.step_order} — {a.decision === "approved" ? "معتمد" : "مرفوض"}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {a.decided_at ? new Date(a.decided_at).toLocaleString("ar") : ""}
                        </span>
                      </div>
                      {a.comment && <p className="text-muted-foreground mt-1">{a.comment}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CommentRow({
  c,
  isReply,
  onReply,
  onResolve,
  onDelete,
  canManage,
}: {
  c: LocalComment;
  isReply?: boolean;
  onReply?: () => void;
  onResolve: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 ${c.resolved ? "opacity-60" : ""}`}>
      {isReply && <CornerDownRight className="w-3.5 h-3.5 mt-1 text-muted-foreground" />}
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
        {c.author.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">{c.author}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(c.createdAt).toLocaleString("ar")}
          </span>
          {c.resolved && (
            <Badge variant="outline" className="h-4 text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
              محلول
            </Badge>
          )}
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
          {renderWithMentions(c.text)}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          {onReply && (
            <button className="hover:text-primary" onClick={onReply}>رد</button>
          )}
          <button className="hover:text-primary" onClick={onResolve}>
            {c.resolved ? "إعادة فتح" : "تحديد كمحلول"}
          </button>
          {canManage && (
            <button className="hover:text-rose-500" onClick={onDelete}>حذف</button>
          )}
        </div>
      </div>
    </div>
  );
}
