import { useEffect, useMemo, useState } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Gavel, Plus, Search, Download, Pencil, Trash2, RefreshCw,
  DollarSign, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildClaimsSuggestions } from "@/lib/suggestion-generators";

interface Claim {
  id: string;
  claim_number: string;
  title: string;
  description: string | null;
  claim_type: string;
  status: string;
  priority: string;
  claimed_amount: number;
  approved_amount: number;
  time_extension_days: number;
  currency: string;
  submitted_date: string | null;
  response_due_date: string | null;
  resolved_date: string | null;
  counterparty: string | null;
  notice_reference: string | null;
  contract_clause: string | null;
  root_cause: string | null;
  evidence_notes: string | null;
  contract_id: string | null;
}

const STATUSES = [
  { value: "draft", ar: "مسودة", en: "Draft" },
  { value: "submitted", ar: "مقدمة", en: "Submitted" },
  { value: "under_review", ar: "قيد المراجعة", en: "Under review" },
  { value: "negotiation", ar: "تفاوض", en: "Negotiation" },
  { value: "approved", ar: "معتمدة", en: "Approved" },
  { value: "partially_approved", ar: "معتمدة جزئياً", en: "Partially approved" },
  { value: "rejected", ar: "مرفوضة", en: "Rejected" },
  { value: "closed", ar: "مغلقة", en: "Closed" },
];

const TYPES = [
  { value: "cost", ar: "مطالبة مالية", en: "Cost" },
  { value: "eot", ar: "تمديد مدة", en: "Time extension (EOT)" },
  { value: "variation", ar: "أمر تغييري", en: "Variation" },
  { value: "acceleration", ar: "تسريع الأعمال", en: "Acceleration" },
  { value: "disruption", ar: "تعطيل الأعمال", en: "Disruption" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const PRIORITIES = [
  { value: "low", ar: "منخفضة", en: "Low" },
  { value: "medium", ar: "متوسطة", en: "Medium" },
  { value: "high", ar: "عالية", en: "High" },
  { value: "critical", ar: "حرجة", en: "Critical" },
];

const statusVariant = (s: string) => {
  if (s === "approved" || s === "closed") return "bg-success/10 text-success border-success/20";
  if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "partially_approved") return "bg-accent/10 text-accent border-accent/20";
  if (s === "draft") return "bg-muted text-muted-foreground border-border";
  return "bg-warning/10 text-warning border-warning/20";
};

const FILTER_KEY = "claims_filters_v1";

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
  root_cause: "",
  evidence_notes: "",
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { replaceBySource } = useGlobalSuggestions();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const label = (list: typeof STATUSES, v: string) =>
    (list.find((x) => x.value === v) || { ar: v, en: v })[isArabic ? "ar" : "en"];

  // restore filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_KEY);
      if (raw) {
        const f = JSON.parse(raw);
        setSearch(f.search || "");
        setStatusFilter(f.statusFilter || "all");
        setTypeFilter(f.typeFilter || "all");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ search, statusFilter, typeFilter }));
    } catch { /* ignore */ }
  }, [search, statusFilter, typeFilter]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast.error(isArabic ? "تعذر تحميل المطالبات" : "Failed to load claims");
      return;
    }
    setClaims((data || []) as unknown as Claim[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    replaceBySource("claims-page", buildClaimsSuggestions(claims));
  }, [claims, replaceBySource]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.claim_type !== typeFilter) return false;
      if (!q) return true;
      return [c.claim_number, c.title, c.counterparty, c.notice_reference]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [claims, search, statusFilter, typeFilter]);

  const kpis = useMemo(() => {
    const claimed = filtered.reduce((s, c) => s + Number(c.claimed_amount || 0), 0);
    const approved = filtered.reduce((s, c) => s + Number(c.approved_amount || 0), 0);
    const open = filtered.filter((c) => !["approved", "rejected", "closed"].includes(c.status)).length;
    const eot = filtered.reduce((s, c) => s + Number(c.time_extension_days || 0), 0);
    const overdue = filtered.filter(
      (c) => c.response_due_date && new Date(c.response_due_date).getTime() < Date.now()
        && !["approved", "rejected", "closed"].includes(c.status),
    ).length;
    return { claimed, approved, open, eot, overdue, recovery: claimed ? (approved / claimed) * 100 : 0 };
  }, [filtered]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n || 0);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, claim_number: `CLM-${String(claims.length + 1).padStart(4, "0")}` });
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
      root_cause: form.root_cause || null,
      evidence_notes: form.evidence_notes || null,
    };

    const { error } = editingId
      ? await (supabase.from("claims") as any).update(payload).eq("id", editingId)
      : await (supabase.from("claims") as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
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

  const exportCsv = () => {
    const headers = [
      "claim_number", "title", "claim_type", "status", "priority",
      "claimed_amount", "approved_amount", "time_extension_days", "currency",
      "submitted_date", "response_due_date", "resolved_date", "counterparty", "notice_reference",
    ];
    const rows = filtered.map((c) => headers.map((h) => `"${String((c as any)[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <PageLayout>
      <div className="space-y-4">
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
              <p className="text-2xl font-bold">{kpis.overdue}</p></div>
          </div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="ps-9"
                  placeholder={isArabic ? "بحث برقم المطالبة أو العنوان أو الطرف الآخر..." : "Search number, title, counterparty..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل الحالات" : "All statuses"}</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل الأنواع" : "All types"}</SelectItem>
                  {TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="secondary">{filtered.length} {isArabic ? "نتيجة" : "results"}</Badge>
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
                    <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isArabic ? "الأولوية" : "Priority"}</TableHead>
                    <TableHead>{isArabic ? "المطالب به" : "Claimed"}</TableHead>
                    <TableHead>{isArabic ? "المعتمد" : "Approved"}</TableHead>
                    <TableHead>{isArabic ? "تمديد (يوم)" : "EOT (d)"}</TableHead>
                    <TableHead>{isArabic ? "موعد الرد" : "Response due"}</TableHead>
                    <TableHead className="text-end">{isArabic ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {isArabic ? "جاري التحميل..." : "Loading..."}
                    </TableCell></TableRow>
                  )}
                  {!loading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {isArabic ? "لا توجد مطالبات — ابدأ بإضافة مطالبة جديدة" : "No claims yet — create your first claim"}
                    </TableCell></TableRow>
                  )}
                  {filtered.map((c) => {
                    const overdue = c.response_due_date
                      && new Date(c.response_due_date).getTime() < Date.now()
                      && !["approved", "rejected", "closed"].includes(c.status);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.claim_number}</TableCell>
                        <TableCell className="max-w-[280px] truncate" title={c.title}>{c.title}</TableCell>
                        <TableCell>{label(TYPES, c.claim_type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusVariant(c.status)}>{label(STATUSES, c.status)}</Badge>
                        </TableCell>
                        <TableCell>{label(PRIORITIES, c.priority)}</TableCell>
                        <TableCell>{fmt(Number(c.claimed_amount))}</TableCell>
                        <TableCell>{fmt(Number(c.approved_amount))}</TableCell>
                        <TableCell>{c.time_extension_days || 0}</TableCell>
                        <TableCell className={overdue ? "text-destructive font-medium" : ""}>
                          {c.response_due_date || "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

      {/* Dialog */}
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
                <SelectContent>{TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{isArabic ? "الأولوية" : "Priority"}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>)}</SelectContent>
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
