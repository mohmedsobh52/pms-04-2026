import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight, Gavel, Download, Paperclip, Trash2, Upload, MessageSquare,
  History, ThumbsUp, ThumbsDown, UserPlus, RefreshCw, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import {
  Claim, ClaimAttachment, ClaimEvent, CLAIM_STATUSES, CLAIM_TYPES, CLAIM_PRIORITIES,
  CLOSED_STATUSES, STATUS_TRANSITIONS, claimAgeDays, claimLabel, claimSla, claimStatusClass,
  slaClass, slaText, buildClaimsCsv, downloadCsv, logClaimEvent,
} from "@/lib/claims";
import { ClaimAuditTrail } from "@/components/claims/ClaimAuditTrail";

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [projectName, setProjectName] = useState("");
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [attachments, setAttachments] = useState<ClaimAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");
  const [assignee, setAssignee] = useState("");
  const [uploading, setUploading] = useState(false);

  const label = (list: typeof CLAIM_STATUSES, v: string) => claimLabel(list, v, isArabic);
  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n || 0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [claimRes, evRes, attRes] = await Promise.all([
      supabase.from("claims").select("*").eq("id", id).maybeSingle(),
      (supabase.from("claim_events") as any).select("*").eq("claim_id", id).order("created_at", { ascending: false }),
      (supabase.from("claim_attachments") as any).select("*").eq("claim_id", id).order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    if (claimRes.error || !claimRes.data) {
      toast.error(isArabic ? "تعذر تحميل المطالبة" : "Claim not found");
      return;
    }
    const c = claimRes.data as unknown as Claim;
    setClaim(c);
    setAssignee(c.assignee || "");
    setDecision(c.decision_notes || "");
    setEvents((evRes.data || []) as ClaimEvent[]);
    setAttachments((attRes.data || []) as ClaimAttachment[]);
    if (c.project_id) {
      const { data } = await supabase.from("saved_projects").select("name").eq("id", c.project_id).maybeSingle();
      setProjectName((data as { name?: string } | null)?.name || "");
    }
  }, [id, isArabic]);

  useEffect(() => { load(); }, [load]);

  const sla = useMemo(() => (claim ? claimSla(claim) : null), [claim]);

  const refreshEvents = async () => {
    if (!id) return;
    const { data } = await (supabase.from("claim_events") as any)
      .select("*").eq("claim_id", id).order("created_at", { ascending: false });
    setEvents((data || []) as ClaimEvent[]);
  };

  const changeStatus = async (to: string) => {
    if (!claim || !user) return;
    const patch: Record<string, any> = { status: to };
    if (["approved", "partially_approved", "rejected"].includes(to)) {
      patch.decided_at = new Date().toISOString();
      patch.decided_by = user.id;
      if (decision.trim()) patch.decision_notes = decision.trim();
      if (to === "approved" && !Number(claim.approved_amount)) patch.approved_amount = Number(claim.claimed_amount || 0);
      if (to === "rejected") patch.approved_amount = 0;
    }
    if (to === "closed" && !claim.resolved_date) patch.resolved_date = new Date().toISOString().slice(0, 10);
    if (to === "submitted" && !claim.submitted_date) patch.submitted_date = new Date().toISOString().slice(0, 10);

    const { error } = await (supabase.from("claims") as any).update(patch).eq("id", claim.id);
    if (error) { toast.error(error.message); return; }
    await logClaimEvent({
      claim_id: claim.id, user_id: user.id, event_type: "status_change",
      from_status: claim.status, to_status: to, body: decision.trim() || null,
    });
    setClaim({ ...claim, ...patch } as Claim);
    toast.success(isArabic ? "تم تحديث الحالة" : "Status updated");
    refreshEvents();
  };

  const saveAssignee = async () => {
    if (!claim || !user) return;
    const value = assignee.trim() || null;
    const { error } = await (supabase.from("claims") as any).update({ assignee: value }).eq("id", claim.id);
    if (error) { toast.error(error.message); return; }
    await logClaimEvent({
      claim_id: claim.id, user_id: user.id, event_type: "assignment",
      body: value ? (isArabic ? `تم الإسناد إلى ${value}` : `Assigned to ${value}`) : (isArabic ? "تم إلغاء الإسناد" : "Unassigned"),
    });
    setClaim({ ...claim, assignee: value });
    toast.success(isArabic ? "تم الإسناد" : "Assigned");
    refreshEvents();
  };

  const addNote = async () => {
    if (!claim || !user || !note.trim()) return;
    const err = await logClaimEvent({
      claim_id: claim.id, user_id: user.id, event_type: "note", body: note.trim(),
    });
    if (err) { toast.error(err.message); return; }
    setNote("");
    toast.success(isArabic ? "تمت إضافة الملاحظة" : "Note added");
    refreshEvents();
  };

  const upload = async (file: File) => {
    if (!claim || !user) return;
    setUploading(true);
    const path = `${user.id}/claims/${claim.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-files").upload(path, file);
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { error } = await (supabase.from("claim_attachments") as any).insert({
      claim_id: claim.id, user_id: user.id, file_name: file.name, file_path: path,
      file_size: file.size, file_type: file.type,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    await logClaimEvent({
      claim_id: claim.id, user_id: user.id, event_type: "attachment",
      body: isArabic ? `تم رفع الملف ${file.name}` : `Uploaded ${file.name}`,
    });
    toast.success(isArabic ? "تم رفع الملف" : "File uploaded");
    load();
  };

  const downloadAttachment = async (a: ClaimAttachment) => {
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(a.file_path, 300);
    if (error || !data) { toast.error(isArabic ? "تعذر فتح الملف" : "Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const removeAttachment = async (a: ClaimAttachment) => {
    await supabase.storage.from("project-files").remove([a.file_path]);
    const { error } = await (supabase.from("claim_attachments") as any).delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    setAttachments((p) => p.filter((x) => x.id !== a.id));
    toast.success(isArabic ? "تم الحذف" : "Deleted");
  };

  const exportOne = () => {
    if (!claim) return;
    const csv = buildClaimsCsv([claim], { isArabic, projectName: () => projectName });
    downloadCsv(csv, `claim-${claim.claim_number}.csv`);
  };

  if (loading) {
    return <PageLayout><div className="py-16 text-center text-muted-foreground">{isArabic ? "جاري التحميل..." : "Loading..."}</div></PageLayout>;
  }
  if (!claim) {
    return (
      <PageLayout>
        <div className="py-16 text-center space-y-3">
          <p className="text-muted-foreground">{isArabic ? "المطالبة غير موجودة" : "Claim not found"}</p>
          <Button onClick={() => navigate("/claims")}>{isArabic ? "عودة للمطالبات" : "Back to claims"}</Button>
        </div>
      </PageLayout>
    );
  }

  const claimed = Number(claim.claimed_amount || 0);
  const approved = Number(claim.approved_amount || 0);
  const recovery = claimed ? (approved / claimed) * 100 : 0;
  const age = claimAgeDays(claim);

  const infoRow = (k: string, v: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{k}</span>
      <span className="text-sm font-medium text-end">{v || "—"}</span>
    </div>
  );

  return (
    <PageLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/claims")}>
              <ArrowRight className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
            </Button>
            <div className="p-2.5 rounded-xl bg-primary/10"><Gavel className="h-6 w-6 text-primary" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{claim.claim_number} — {claim.title}</h1>
                <Badge variant="outline" className={claimStatusClass(claim.status)}>{label(CLAIM_STATUSES, claim.status)}</Badge>
                {sla && <Badge variant="outline" className={slaClass(sla.level)}>{slaText(sla, isArabic)}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {label(CLAIM_TYPES, claim.claim_type)} · {label(CLAIM_PRIORITIES, claim.priority)}
                {claim.counterparty ? ` · ${claim.counterparty}` : ""}
                {claim.project_id ? " · " : ""}
                {claim.project_id && (
                  <Link to={`/projects/${claim.project_id}`} className="text-primary hover:underline">
                    {projectName || (isArabic ? "المشروع" : "Project")}
                  </Link>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />{isArabic ? "تحديث" : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportOne} className="gap-1.5">
              <Download className="h-4 w-4" />CSV
            </Button>
          </div>
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{isArabic ? "المطالب به" : "Claimed"}</p>
            <p className="text-xl font-bold">{fmt(claimed)} <span className="text-xs font-normal">{claim.currency}</span></p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{isArabic ? "المعتمد" : "Approved"}</p>
            <p className="text-xl font-bold text-success">{fmt(approved)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{isArabic ? "الفرق" : "Variance"}</p>
            <p className="text-xl font-bold">{fmt(approved - claimed)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{isArabic ? "نسبة التحصيل" : "Recovery"}</p>
            <p className="text-xl font-bold">{recovery.toFixed(0)}%</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{isArabic ? "تمديد المدة" : "EOT days"}</p>
            <p className="text-xl font-bold">{claim.time_extension_days || 0}</p>
          </CardContent></Card>
        </div>

        {/* Workflow actions */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{isArabic ? "إجراءات سير العمل" : "Workflow actions"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {!CLOSED_STATUSES.includes(claim.status) && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={() => changeStatus("approved")}>
                    <ThumbsUp className="h-4 w-4" />{isArabic ? "اعتماد" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => changeStatus("partially_approved")}>
                    {isArabic ? "اعتماد جزئي" : "Partially approve"}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => changeStatus("rejected")}>
                    <ThumbsDown className="h-4 w-4" />{isArabic ? "رفض" : "Decline"}
                  </Button>
                </>
              )}
              {(STATUS_TRANSITIONS[claim.status] || []).length > 0 && (
                <Select onValueChange={(v) => changeStatus(v)}>
                  <SelectTrigger className="w-[220px] h-9">
                    <SelectValue placeholder={isArabic ? "نقل إلى حالة أخرى" : "Move to status"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(STATUS_TRANSITIONS[claim.status] || []).map((s) => (
                      <SelectItem key={s} value={s}>{label(CLAIM_STATUSES, s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isArabic ? "ملاحظات القرار" : "Decision notes"}</Label>
                <Textarea rows={2} value={decision} onChange={(e) => setDecision(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{isArabic ? "الإسناد لعضو فريق" : "Assign to team member"}</Label>
                <div className="flex gap-2">
                  <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
                  <Button variant="outline" onClick={saveAssignee} className="gap-1.5">
                    <UserPlus className="h-4 w-4" />{isArabic ? "إسناد" : "Assign"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">{isArabic ? "التفاصيل" : "Details"}</TabsTrigger>
            <TabsTrigger value="history">{isArabic ? "السجل" : "History"}</TabsTrigger>
            <TabsTrigger value="notes">{isArabic ? "الملاحظات" : "Notes"}</TabsTrigger>
            <TabsTrigger value="files">{isArabic ? "المرفقات" : "Attachments"}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{isArabic ? "الجدول الزمني" : "Timeline"}</CardTitle></CardHeader>
                <CardContent>
                  {infoRow(isArabic ? "تاريخ الإنشاء" : "Created", claim.created_at?.slice(0, 10))}
                  {infoRow(isArabic ? "تاريخ التقديم" : "Submitted", claim.submitted_date)}
                  {infoRow(isArabic ? "موعد الرد" : "Response due", claim.response_due_date)}
                  {infoRow(isArabic ? "تاريخ القرار" : "Decided at", claim.decided_at?.slice(0, 10))}
                  {infoRow(isArabic ? "تاريخ الإغلاق" : "Resolved", claim.resolved_date)}
                  {infoRow(isArabic ? "عمر المطالبة" : "Age", age !== null ? `${age} ${isArabic ? "يوم" : "days"}` : "")}
                  {infoRow(isArabic ? "حالة الاستحقاق" : "SLA", sla ? slaText(sla, isArabic) : "")}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{isArabic ? "البيانات التعاقدية والمالية" : "Contractual & financial"}</CardTitle></CardHeader>
                <CardContent>
                  {infoRow(isArabic ? "الطرف الآخر" : "Counterparty", claim.counterparty)}
                  {infoRow(isArabic ? "بند العقد" : "Contract clause", claim.contract_clause)}
                  {infoRow(isArabic ? "مرجع الإشعار" : "Notice reference", claim.notice_reference)}
                  {infoRow(isArabic ? "المسؤول" : "Assignee", claim.assignee)}
                  {infoRow(isArabic ? "العملة" : "Currency", claim.currency)}
                  {infoRow(isArabic ? "السبب الجذري" : "Root cause", claim.root_cause)}
                  {infoRow(isArabic ? "ملاحظات القرار" : "Decision notes", claim.decision_notes)}
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">{isArabic ? "الوصف والأدلة" : "Description & evidence"}</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">{isArabic ? "الوصف" : "Description"}</p>
                    <p className="whitespace-pre-wrap">{claim.description || "—"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-1">{isArabic ? "المستندات والأدلة" : "Evidence notes"}</p>
                    <p className="whitespace-pre-wrap">{claim.evidence_notes || "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />{isArabic ? "سجل التدقيق الكامل" : "Full audit trail"}
              </CardTitle></CardHeader>
              <CardContent>
                <ClaimAuditTrail events={events} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />{isArabic ? "الملاحظات" : "Notes"}
              </CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder={isArabic ? "اكتب ملاحظة..." : "Write a note..."}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button onClick={addNote} disabled={!note.trim()}>{isArabic ? "إضافة" : "Add"}</Button>
                </div>
                {events.filter((e) => e.event_type === "note").length === 0 && (
                  <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد ملاحظات" : "No notes yet"}</p>
                )}
                {events.filter((e) => e.event_type === "note").map((e) => (
                  <div key={e.id} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString(isArabic ? "ar-SA" : "en-US")}
                    </p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{e.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4" />{isArabic ? "المرفقات" : "Attachments"}
              </CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
                  />
                  <Button variant="outline" disabled={uploading} className="gap-1.5">
                    <Upload className="h-4 w-4" />{uploading ? (isArabic ? "جاري الرفع..." : "Uploading...") : (isArabic ? "رفع" : "Upload")}
                  </Button>
                </div>
                {attachments.length === 0 && (
                  <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد مرفقات" : "No attachments"}</p>
                )}
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{a.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.file_size ? `${Math.round(a.file_size / 1024)} KB · ` : ""}
                        {new Date(a.created_at).toLocaleDateString(isArabic ? "ar-SA" : "en-US")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => downloadAttachment(a)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeAttachment(a)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
