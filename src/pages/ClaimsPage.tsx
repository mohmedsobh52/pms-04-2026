import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Gavel, Plus, Search, Download, Pencil, Trash2, RefreshCw, MoreHorizontal,
  DollarSign, Clock, CheckCircle2, AlertTriangle, Star, Save, X, ExternalLink,
  ThumbsUp, ThumbsDown, UserPlus, Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildClaimsSuggestions } from "@/lib/suggestion-generators";
import {
import { ClaimsSectionNav } from "@/components/claims/ClaimsNav";
  Claim, CLAIM_STATUSES, CLAIM_TYPES, CLAIM_PRIORITIES, CLOSED_STATUSES,
  STATUS_TRANSITIONS, claimLabel, claimStatusClass, claimSla, slaClass, slaText, claimAgeDays,
  buildClaimsCsv, downloadCsv, logClaimEvent,
} from "@/lib/claims";

const FILTER_KEY = "claims_filters_v2";
const VIEWS_KEY = "claims_saved_views_v1";

interface Filters {
  search: string;
  statusFilter: string;
  typeFilter: string;
  projectFilter: string;
  priorityFilter: string;
  contractorFilter: string;
  assigneeFilter: string;
  slaFilter: string;
  openOnly: boolean;
}

const defaultFilters: Filters = {
  search: "",
  statusFilter: "all",
  typeFilter: "all",
  projectFilter: "all",
  priorityFilter: "all",
  contractorFilter: "all",
  assigneeFilter: "all",
  slaFilter: "all",
  openOnly: false,
};

interface SavedView extends Filters { id: string; name: string }

const emptyForm = {
  claim_number: "",
  title: "",
  description: "",
  claim_type: "cost",
  status: "draft",
  priority: "medium",
  claimed_amount: "0",
  approved_amount: "0",
  time_extension_days: "0",
  currency: "SAR",
  submitted_date: "",
  response_due_date: "",
  resolved_date: "",
  counterparty: "",
  notice_reference: "",
  contract_clause: "",
  project_id: "",
  assignee: "",
  root_cause: "",
  evidence_notes: "",
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { replaceBySource } = useGlobalSuggestions();
  const navigate = useNavigate();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [views, setViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Claim | null>(null);
  const [assignValue, setAssignValue] = useState("");

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const label = (list: typeof CLAIM_STATUSES, v: string) => claimLabel(list, v, isArabic);

  // restore filters + views
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_KEY);
      if (raw) setFilters({ ...defaultFilters, ...JSON.parse(raw) });
      const rv = localStorage.getItem(VIEWS_KEY);
      if (rv) setViews(JSON.parse(rv));
    } catch { /* ignore */ }
    const pid = new URLSearchParams(window.location.search).get("project");
    if (pid) setFilters((f) => ({ ...f, projectFilter: pid }));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters]);

  useEffect(() => {
    if (!user) { setProjects([]); return; }
    (async () => {
      const { data } = await supabase
        .from("saved_projects").select("id, name")
        .order("created_at", { ascending: false }).limit(500);
      setProjects((data ?? []) as { id: string; name: string }[]);
    })();
  }, [user]);

  const load = useCallback(async () => {
    if (!user) { setClaims([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("claims").select("*")
      .order("created_at", { ascending: false }).limit(500);
    setLoading(false);
    if (error) { toast.error(isArabic ? "تعذر تحميل المطالبات" : "Failed to load claims"); return; }
    setClaims((data || []) as unknown as Claim[]);
  }, [user, isArabic]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    replaceBySource("claims-page", buildClaimsSuggestions(claims));
  }, [claims, replaceBySource]);

  const contractors = useMemo(
    () => Array.from(new Set(claims.map((c) => c.counterparty).filter(Boolean) as string[])).sort(),
    [claims],
  );
  const assignees = useMemo(
    () => Array.from(new Set(claims.map((c) => c.assignee).filter(Boolean) as string[])).sort(),
    [claims],
  );

  const filtered = useMemo(() => {
    const f = filters;
    const q = f.search.trim().toLowerCase();
    return claims.filter((c) => {
      if (f.statusFilter !== "all" && c.status !== f.statusFilter) return false;
      if (f.typeFilter !== "all" && c.claim_type !== f.typeFilter) return false;
      if (f.priorityFilter !== "all" && c.priority !== f.priorityFilter) return false;
      if (f.contractorFilter === "none" && c.counterparty) return false;
      if (f.contractorFilter !== "all" && f.contractorFilter !== "none" && c.counterparty !== f.contractorFilter) return false;
      if (f.assigneeFilter === "none" && c.assignee) return false;
      if (f.assigneeFilter !== "all" && f.assigneeFilter !== "none" && c.assignee !== f.assigneeFilter) return false;
      if (f.projectFilter === "none" && c.project_id) return false;
      if (f.projectFilter !== "all" && f.projectFilter !== "none" && c.project_id !== f.projectFilter) return false;
      if (f.openOnly && CLOSED_STATUSES.includes(c.status)) return false;
      if (f.slaFilter !== "all" && claimSla(c).level !== f.slaFilter) return false;
      if (!q) return true;
      return [c.claim_number, c.title, c.counterparty, c.notice_reference, c.assignee, c.root_cause]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [claims, filters]);

  const kpis = useMemo(() => {
    const claimed = filtered.reduce((s, c) => s + Number(c.claimed_amount || 0), 0);
    const approved = filtered.reduce((s, c) => s + Number(c.approved_amount || 0), 0);
    const open = filtered.filter((c) => !CLOSED_STATUSES.includes(c.status)).length;
    const eot = filtered.reduce((s, c) => s + Number(c.time_extension_days || 0), 0);
    const levels = filtered.map((c) => claimSla(c).level);
    const byStatus = Object.fromEntries(CLAIM_STATUSES.map((s) => [s.value, 0]));
    filtered.forEach((c) => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });
    const cycles = filtered
      .filter((c) => c.submitted_date && c.resolved_date)
      .map((c) =>
        Math.round(
          (new Date(`${c.resolved_date}T00:00:00`).getTime()
            - new Date(`${c.submitted_date}T00:00:00`).getTime()) / 86400000,
        ),
      );
    const ages = filtered
      .filter((c) => !CLOSED_STATUSES.includes(c.status))
      .map((c) => claimAgeDays(c))
      .filter((a): a is number => a !== null);
    return {
      claimed, approved, open, eot,
      overdue: levels.filter((l) => l === "overdue").length,
      dueSoon: levels.filter((l) => l === "due_soon").length,
      missing: levels.filter((l) => l === "missing").length,
      recovery: claimed ? (approved / claimed) * 100 : 0,
      byStatus,
      avgCycle: cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null,
      avgAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null,
    };
  }, [filtered]);

  // SLA notification once per session
  useEffect(() => {
    if (loading || !claims.length) return;
    const key = "claims_sla_notified";
    if (sessionStorage.getItem(key)) return;
    const overdue = claims.filter((c) => claimSla(c).level === "overdue").length;
    const soon = claims.filter((c) => claimSla(c).level === "due_soon").length;
    if (overdue || soon) {
      sessionStorage.setItem(key, "1");
      toast.warning(
        isArabic
          ? `تنبيه استحقاقات: ${overdue} مطالبة متأخرة و${soon} تقترب من موعد الرد`
          : `SLA alert: ${overdue} overdue and ${soon} approaching response due`,
        { duration: 6000 },
      );
    }
  }, [loading, claims, isArabic]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n || 0);

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name || "";

  const openNew = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      project_id: !["all", "none"].includes(filters.projectFilter) ? filters.projectFilter : "",
      claim_number: `CLM-${String(claims.length + 1).padStart(4, "0")}`,
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Claim) => {
    setEditingId(c.id);
    setForm({
      claim_number: c.claim_number || "",
      title: c.title || "",
      description: c.description || "",
      claim_type: c.claim_type || "cost",
      status: c.status || "draft",
      priority: c.priority || "medium",
      claimed_amount: String(c.claimed_amount ?? 0),
      approved_amount: String(c.approved_amount ?? 0),
      time_extension_days: String(c.time_extension_days ?? 0),
      currency: c.currency || "SAR",
      submitted_date: c.submitted_date || "",
      response_due_date: c.response_due_date || "",
      resolved_date: c.resolved_date || "",
      counterparty: c.counterparty || "",
      notice_reference: c.notice_reference || "",
      contract_clause: c.contract_clause || "",
      project_id: c.project_id || "",
      assignee: c.assignee || "",
      root_cause: c.root_cause || "",
      evidence_notes: c.evidence_notes || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.claim_number.trim()) {
      toast.error(isArabic ? "رقم المطالبة والعنوان مطلوبان" : "Claim number and title are required");
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      user_id: user.id,
      claim_number: form.claim_number.trim(),
      title: form.title.trim(),
      description: form.description || null,
      claim_type: form.claim_type,
      status: form.status,
      priority: form.priority,
      claimed_amount: Number(form.claimed_amount) || 0,
      approved_amount: Number(form.approved_amount) || 0,
      time_extension_days: Number(form.time_extension_days) || 0,
      currency: form.currency,
      submitted_date: form.submitted_date || null,
      response_due_date: form.response_due_date || null,
      resolved_date: form.resolved_date || null,
      counterparty: form.counterparty || null,
      notice_reference: form.notice_reference || null,
      contract_clause: form.contract_clause || null,
      project_id: form.project_id || null,
      assignee: form.assignee || null,
      root_cause: form.root_cause || null,
      evidence_notes: form.evidence_notes || null,
    };

    const res = editingId
      ? await (supabase.from("claims") as any).update(payload).eq("id", editingId).select("id").maybeSingle()
      : await (supabase.from("claims") as any).insert(payload).select("id").maybeSingle();
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    const id = editingId || res.data?.id;
    if (id) {
      await logClaimEvent({
        claim_id: id, user_id: user.id,
        event_type: editingId ? "updated" : "created",
        to_status: payload.status,
        body: editingId
          ? (isArabic ? "تم تعديل بيانات المطالبة" : "Claim details updated")
          : (isArabic ? "تم إنشاء المطالبة" : "Claim created"),
      });
    }
    toast.success(isArabic ? "تم الحفظ" : "Saved");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(isArabic ? "تم الحذف" : "Deleted");
    setClaims((p) => p.filter((c) => c.id !== id));
  };

  const changeStatus = async (c: Claim, to: string, note?: string) => {
    if (!user) return;
    const patch: Record<string, any> = { status: to };
    if (["approved", "partially_approved", "rejected"].includes(to)) {
      patch.decided_at = new Date().toISOString();
      patch.decided_by = user.id;
      if (to === "approved" && !Number(c.approved_amount)) patch.approved_amount = Number(c.claimed_amount || 0);
      if (to === "rejected") patch.approved_amount = 0;
    }
    if (to === "closed" && !c.resolved_date) patch.resolved_date = new Date().toISOString().slice(0, 10);
    if (to === "submitted" && !c.submitted_date) patch.submitted_date = new Date().toISOString().slice(0, 10);
    if (note) patch.decision_notes = note;

    const { error } = await (supabase.from("claims") as any).update(patch).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await logClaimEvent({
      claim_id: c.id, user_id: user.id, event_type: "status_change",
      from_status: c.status, to_status: to, body: note || null,
    });
    toast.success(isArabic ? "تم تحديث الحالة" : "Status updated");
    setClaims((p) => p.map((x) => (x.id === c.id ? { ...x, ...patch } as Claim : x)));
  };

  const applyAssign = async () => {
    if (!user || !assignTarget) return;
    const value = assignValue.trim() || null;
    const { error } = await (supabase.from("claims") as any).update({ assignee: value }).eq("id", assignTarget.id);
    if (error) { toast.error(error.message); return; }
    await logClaimEvent({
      claim_id: assignTarget.id, user_id: user.id, event_type: "assignment",
      body: value ? (isArabic ? `تم الإسناد إلى ${value}` : `Assigned to ${value}`) : (isArabic ? "تم إلغاء الإسناد" : "Unassigned"),
    });
    setClaims((p) => p.map((x) => (x.id === assignTarget.id ? { ...x, assignee: value } : x)));
    setAssignTarget(null);
    toast.success(isArabic ? "تم الإسناد" : "Assigned");
  };

  const exportCsv = () => {
    const csv = buildClaimsCsv(filtered, { isArabic, projectName });
    downloadCsv(csv, `claims-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? `تم تصدير ${filtered.length} مطالبة` : `Exported ${filtered.length} claims`);
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) { toast.error(isArabic ? "أدخل اسم العرض" : "Enter a view name"); return; }
    const next = [...views.filter((v) => v.name !== name), { ...filters, id: crypto.randomUUID(), name }];
    setViews(next);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    setViewName("");
    toast.success(isArabic ? "تم حفظ العرض" : "View saved");
  };

  const deleteView = (id: string) => {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
  };

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  const chips: { key: string; label: string; active: boolean; onClick: () => void }[] = [
    {
      key: "open", label: isArabic ? "المفتوحة" : "Open", active: filters.openOnly,
      onClick: () => set("openOnly", !filters.openOnly),
    },
    {
      key: "overdue", label: isArabic ? `متأخرة (${kpis.overdue})` : `Overdue (${kpis.overdue})`,
      active: filters.slaFilter === "overdue",
      onClick: () => set("slaFilter", filters.slaFilter === "overdue" ? "all" : "overdue"),
    },
    {
      key: "due_soon", label: isArabic ? `قريبة الاستحقاق (${kpis.dueSoon})` : `Due soon (${kpis.dueSoon})`,
      active: filters.slaFilter === "due_soon",
      onClick: () => set("slaFilter", filters.slaFilter === "due_soon" ? "all" : "due_soon"),
    },
    {
      key: "missing", label: isArabic ? `بدون موعد رد (${kpis.missing})` : `No due date (${kpis.missing})`,
      active: filters.slaFilter === "missing",
      onClick: () => set("slaFilter", filters.slaFilter === "missing" ? "all" : "missing"),
    },
    {
      key: "critical", label: isArabic ? "حرجة" : "Critical",
      active: filters.priorityFilter === "critical",
      onClick: () => set("priorityFilter", filters.priorityFilter === "critical" ? "all" : "critical"),
    },
    {
      key: "unassigned", label: isArabic ? "غير مسندة" : "Unassigned",
      active: filters.assigneeFilter === "none",
      onClick: () => set("assigneeFilter", filters.assigneeFilter === "none" ? "all" : "none"),
    },
  ];

  return (
    <PageLayout>
      <div className="space-y-4">
        <ClaimsSectionNav />
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{isArabic ? "المطالبات" : "Claims"}</h1>
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? "تسجيل ومتابعة المطالبات المالية وتمديد المدة حتى الإغلاق"
                  : "Track cost and time-extension claims through to settlement"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(kpis.overdue > 0 || kpis.dueSoon > 0) && (
              <Badge variant="outline" className={slaClass(kpis.overdue ? "overdue" : "due_soon")}>
                <Bell className="h-3.5 w-3.5 me-1" />
                {isArabic ? `${kpis.overdue} متأخرة / ${kpis.dueSoon} قريبة` : `${kpis.overdue} overdue / ${kpis.dueSoon} due soon`}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />{isArabic ? "تحديث" : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
              <Download className="h-4 w-4" />CSV
            </Button>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" />{isArabic ? "مطالبة جديدة" : "New claim"}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">{isArabic ? "إجمالي المطالب به" : "Total claimed"}</p>
              <p className="text-2xl font-bold">{fmt(kpis.claimed)}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
            <div><p className="text-sm text-muted-foreground">{isArabic ? "المعتمد" : "Approved"}</p>
              <p className="text-2xl font-bold">{fmt(kpis.approved)}</p>
              <p className="text-xs text-muted-foreground">{kpis.recovery.toFixed(0)}% {isArabic ? "نسبة التحصيل" : "recovery"}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
            <div><p className="text-sm text-muted-foreground">{isArabic ? "مطالبات مفتوحة" : "Open claims"}</p>
              <p className="text-2xl font-bold">{kpis.open}</p>
              <p className="text-xs text-muted-foreground">{kpis.eot} {isArabic ? "يوم تمديد" : "EOT days"}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-sm text-muted-foreground">{isArabic ? "متأخرة الرد" : "Overdue response"}</p>
              <p className="text-2xl font-bold">{kpis.overdue}</p>
              <p className="text-xs text-muted-foreground">
                {kpis.dueSoon} {isArabic ? "قريبة الاستحقاق" : "due soon"}
              </p></div>
          </div></CardContent></Card>
        </div>

        {/* Status distribution + timing */}
        {filtered.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{isArabic ? "توزيع الحالات" : "Status distribution"}</span>
                <span>
                  {kpis.avgAge !== null && `${isArabic ? "متوسط العمر المفتوح" : "Avg open age"}: ${kpis.avgAge} ${isArabic ? "يوم" : "d"}`}
                  {kpis.avgAge !== null && kpis.avgCycle !== null && " · "}
                  {kpis.avgCycle !== null && `${isArabic ? "متوسط زمن الإغلاق" : "Avg cycle"}: ${kpis.avgCycle} ${isArabic ? "يوم" : "d"}`}
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {CLAIM_STATUSES.filter((s) => kpis.byStatus[s.value] > 0).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    title={`${claimLabel(CLAIM_STATUSES, s.value, isArabic)}: ${kpis.byStatus[s.value]}`}
                    onClick={() => set("statusFilter", filters.statusFilter === s.value ? "all" : s.value)}
                    className={`${claimStatusClass(s.value)} border-0 bg-current transition-all hover:opacity-80`}
                    style={{ width: `${(kpis.byStatus[s.value] / filtered.length) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CLAIM_STATUSES.filter((s) => kpis.byStatus[s.value] > 0).map((s) => (
                  <Badge
                    key={s.value}
                    variant="outline"
                    className={`cursor-pointer ${claimStatusClass(s.value)} ${filters.statusFilter === s.value ? "ring-2 ring-ring" : ""}`}
                    onClick={() => set("statusFilter", filters.statusFilter === s.value ? "all" : s.value)}
                  >
                    {claimLabel(CLAIM_STATUSES, s.value, isArabic)} · {kpis.byStatus[s.value]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="ps-9"
                  placeholder={isArabic ? "بحث برقم المطالبة أو العنوان أو الطرف الآخر أو المسؤول..." : "Search number, title, contractor, assignee..."}
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                />
              </div>
              <Select value={filters.statusFilter} onValueChange={(v) => set("statusFilter", v)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل الحالات" : "All statuses"}</SelectItem>
                  {CLAIM_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.typeFilter} onValueChange={(v) => set("typeFilter", v)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل الأنواع" : "All types"}</SelectItem>
                  {CLAIM_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.projectFilter} onValueChange={(v) => set("projectFilter", v)}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
                  <SelectItem value="none">{isArabic ? "بدون مشروع" : "Unlinked"}</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.contractorFilter} onValueChange={(v) => set("contractorFilter", v)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل المقاولين" : "All contractors"}</SelectItem>
                  <SelectItem value="none">{isArabic ? "بدون طرف محدد" : "No contractor"}</SelectItem>
                  {contractors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.priorityFilter} onValueChange={(v) => set("priorityFilter", v)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل الأولويات" : "All priorities"}</SelectItem>
                  {CLAIM_PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.assigneeFilter} onValueChange={(v) => set("assigneeFilter", v)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل المسؤولين" : "All assignees"}</SelectItem>
                  <SelectItem value="none">{isArabic ? "غير مسندة" : "Unassigned"}</SelectItem>
                  {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="secondary">{filtered.length} {isArabic ? "نتيجة" : "results"}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setFilters({ ...defaultFilters })} className="gap-1.5">
                <X className="h-4 w-4" />{isArabic ? "مسح" : "Clear"}
              </Button>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((ch) => (
                <Button
                  key={ch.key}
                  size="sm"
                  variant={ch.active ? "default" : "outline"}
                  className="h-7 rounded-full text-xs"
                  onClick={ch.onClick}
                >
                  {ch.label}
                </Button>
              ))}
            </div>

            {/* Saved views */}
            <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />{isArabic ? "العروض المحفوظة" : "Saved views"}
              </span>
              {views.length === 0 && (
                <span className="text-xs text-muted-foreground">{isArabic ? "لا يوجد" : "None yet"}</span>
              )}
              {views.map((v) => (
                <span key={v.id} className="inline-flex items-center">
                  <Button
                    size="sm" variant="secondary" className="h-7 rounded-full text-xs"
                    onClick={() => setFilters({ ...defaultFilters, ...v })}
                  >
                    {v.name}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteView(v.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              ))}
              <div className="flex items-center gap-1.5 ms-auto">
                <Input
                  className="h-7 w-[160px] text-xs"
                  placeholder={isArabic ? "اسم العرض" : "View name"}
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                />
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={saveView}>
                  <Save className="h-3.5 w-3.5" />{isArabic ? "حفظ العرض" : "Save view"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{isArabic ? "سجل المطالبات" : "Claims register"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "الرقم" : "No."}</TableHead>
                    <TableHead>{isArabic ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                    <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isArabic ? "الأولوية" : "Priority"}</TableHead>
                    <TableHead>{isArabic ? "المسؤول" : "Assignee"}</TableHead>
                    <TableHead>{isArabic ? "المطالب به" : "Claimed"}</TableHead>
                    <TableHead>{isArabic ? "المعتمد" : "Approved"}</TableHead>
                    <TableHead>{isArabic ? "تمديد (يوم)" : "EOT (d)"}</TableHead>
                    <TableHead>{isArabic ? "الاستحقاق" : "SLA"}</TableHead>
                    <TableHead className="text-end">{isArabic ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      {isArabic ? "جاري التحميل..." : "Loading..."}
                    </TableCell></TableRow>
                  )}
                  {!loading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      {isArabic ? "لا توجد مطالبات مطابقة" : "No matching claims"}
                    </TableCell></TableRow>
                  )}
                  {filtered.map((c) => {
                    const sla = claimSla(c);
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/claims/${c.id}`)}>
                        <TableCell className="font-medium">{c.claim_number}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={c.title}>{c.title}</TableCell>
                        <TableCell className="max-w-[160px] truncate" onClick={(e) => e.stopPropagation()}>
                          {c.project_id ? (
                            <Link to={`/projects/${c.project_id}`} className="text-primary hover:underline">
                              {projectName(c.project_id) || (isArabic ? "مشروع" : "Project")}
                            </Link>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{label(CLAIM_TYPES, c.claim_type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={claimStatusClass(c.status)}>{label(CLAIM_STATUSES, c.status)}</Badge>
                        </TableCell>
                        <TableCell>{label(CLAIM_PRIORITIES, c.priority)}</TableCell>
                        <TableCell className="max-w-[140px] truncate">
                          {c.assignee || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{fmt(Number(c.claimed_amount))}</TableCell>
                        <TableCell>{fmt(Number(c.approved_amount))}</TableCell>
                        <TableCell>{c.time_extension_days || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={slaClass(sla.level)}>{slaText(sla, isArabic)}</Badge>
                        </TableCell>
                        <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>{isArabic ? "الإجراءات" : "Actions"}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigate(`/claims/${c.id}`)}>
                                  <ExternalLink className="h-4 w-4 me-2" />{isArabic ? "فتح التفاصيل" : "Open details"}
                                </DropdownMenuItem>
                                {!CLOSED_STATUSES.includes(c.status) && (
                                  <>
                                    <DropdownMenuItem onClick={() => changeStatus(c, "approved")}>
                                      <ThumbsUp className="h-4 w-4 me-2 text-success" />{isArabic ? "اعتماد" : "Approve"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => changeStatus(c, "rejected")}>
                                      <ThumbsDown className="h-4 w-4 me-2 text-destructive" />{isArabic ? "رفض" : "Decline"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(STATUS_TRANSITIONS[c.status] || []).length > 0 && <DropdownMenuSeparator />}
                                {(STATUS_TRANSITIONS[c.status] || []).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => changeStatus(c, s)}>
                                    {isArabic ? "نقل إلى: " : "Move to: "}{label(CLAIM_STATUSES, s)}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setAssignTarget(c); setAssignValue(c.assignee || ""); }}>
                                  <UserPlus className="h-4 w-4 me-2" />{isArabic ? "إسناد" : "Assign"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(c)}>
                                  <Pencil className="h-4 w-4 me-2" />{isArabic ? "تعديل" : "Edit"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => remove(c.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 me-2" />{isArabic ? "حذف" : "Delete"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isArabic ? "إسناد المطالبة" : "Assign claim"}</DialogTitle>
            <DialogDescription>
              {isArabic ? "أدخل اسم عضو الفريق المسؤول عن المتابعة" : "Enter the team member responsible for this claim"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{isArabic ? "المسؤول" : "Assignee"}</Label>
            <Input value={assignValue} onChange={(e) => setAssignValue(e.target.value)} list="claims-assignees" />
            <datalist id="claims-assignees">
              {assignees.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={applyAssign}>{isArabic ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? (isArabic ? "تعديل المطالبة" : "Edit claim") : (isArabic ? "مطالبة جديدة" : "New claim")}
            </DialogTitle>
            <DialogDescription>
              {isArabic ? "أدخل بيانات المطالبة والمستندات المرجعية" : "Enter claim details and reference documents"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isArabic ? "رقم المطالبة" : "Claim number"}</Label>
              <Input {...field("claim_number")} />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "الطرف الآخر" : "Counterparty"}</Label>
              <Input {...field("counterparty")} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{isArabic ? "العنوان" : "Title"}</Label>
              <Input {...field("title")} />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "النوع" : "Type"}</Label>
              <Select value={form.claim_type} onValueChange={(v) => setForm((f) => ({ ...f, claim_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLAIM_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLAIM_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "الأولوية" : "Priority"}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLAIM_PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "المسؤول" : "Assignee"}</Label>
              <Input {...field("assignee")} list="claims-assignees" />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "المشروع المرتبط" : "Linked project"}</Label>
              <Select
                value={form.project_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, project_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isArabic ? "بدون مشروع" : "No project"}</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "العملة" : "Currency"}</Label>
              <Input {...field("currency")} />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "المبلغ المطالب به" : "Claimed amount"}</Label>
              <Input type="number" {...field("claimed_amount")} />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "المبلغ المعتمد" : "Approved amount"}</Label>
              <Input type="number" {...field("approved_amount")} />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "تمديد المدة (يوم)" : "Time extension (days)"}</Label>
              <Input type="number" {...field("time_extension_days")} />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "بند العقد" : "Contract clause"}</Label>
              <Input {...field("contract_clause")} placeholder="20.1" />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "تاريخ التقديم (yyyy-MM-dd)" : "Submitted date (yyyy-MM-dd)"}</Label>
              <Input {...field("submitted_date")} placeholder="2026-01-15" />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "موعد الرد (yyyy-MM-dd)" : "Response due (yyyy-MM-dd)"}</Label>
              <Input {...field("response_due_date")} placeholder="2026-02-15" />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "تاريخ الإغلاق (yyyy-MM-dd)" : "Resolved date (yyyy-MM-dd)"}</Label>
              <Input {...field("resolved_date")} placeholder="2026-03-01" />
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "مرجع الإشعار" : "Notice reference"}</Label>
              <Input {...field("notice_reference")} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{isArabic ? "السبب الجذري" : "Root cause"}</Label>
              <Input {...field("root_cause")} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{isArabic ? "الوصف" : "Description"}</Label>
              <Textarea rows={3} {...field("description")} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{isArabic ? "المستندات والأدلة" : "Evidence notes"}</Label>
              <Textarea rows={2} {...field("evidence_notes")} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={save} disabled={saving}>{isArabic ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
