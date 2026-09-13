import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, RefreshCw, Download, ExternalLink, MoreHorizontal, Gavel,
  DollarSign, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import {
  Claim, CLAIM_STATUSES, CLAIM_TYPES, CLOSED_STATUSES, STATUS_TRANSITIONS,
  claimLabel, claimStatusClass, claimSla, slaClass, slaText,
  buildClaimsCsv, downloadCsv, logClaimEvent,
} from "@/lib/claims";

interface Props {
  projectId: string;
  projectName?: string;
  currency?: string;
}

const emptyForm = {
  claim_number: "",
  title: "",
  description: "",
  claim_type: "variation",
  claimed_amount: "",
  time_extension_days: "",
  counterparty: "",
  response_due_date: "",
};

export function ProjectClaimsLedger({ projectId, projectName, currency = "SAR" }: Props) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fmt = useCallback(
    (n: number) =>
      new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n || 0),
    [isArabic, currency],
  );

  const load = useCallback(async () => {
    if (!user) { setClaims([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase.from("claims") as any)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setClaims((data ?? []) as Claim[]);
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? claims : claims.filter((c) => c.status === statusFilter)),
    [claims, statusFilter],
  );

  const summary = useMemo(() => {
    const open = claims.filter((c) => !CLOSED_STATUSES.includes(c.status));
    return {
      count: claims.length,
      claimed: claims.reduce((s, c) => s + Number(c.claimed_amount || 0), 0),
      approved: claims.reduce((s, c) => s + Number(c.approved_amount || 0), 0),
      exposure: open.reduce((s, c) => s + Number(c.claimed_amount || 0), 0),
      openCount: open.length,
      eot: claims.reduce((s, c) => s + Number(c.time_extension_days || 0), 0),
      overdue: claims.filter((c) => claimSla(c).level === "overdue").length,
    };
  }, [claims]);

  const createClaim = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast.error(isArabic ? "العنوان مطلوب" : "Title is required");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      project_id: projectId,
      claim_number: form.claim_number.trim() || `VO-${String(claims.length + 1).padStart(4, "0")}`,
      title: form.title.trim(),
      description: form.description.trim() || null,
      claim_type: form.claim_type,
      status: "draft",
      priority: "medium",
      currency,
      claimed_amount: Number(form.claimed_amount) || 0,
      approved_amount: 0,
      time_extension_days: Number(form.time_extension_days) || 0,
      counterparty: form.counterparty.trim() || null,
      response_due_date: form.response_due_date || null,
    };
    const { data, error } = await (supabase.from("claims") as any)
      .insert(payload).select("id").maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data?.id) {
      await logClaimEvent({
        claim_id: data.id, user_id: user.id, event_type: "created",
        to_status: "draft", body: isArabic ? "تم إنشاء السجل" : "Ledger entry created",
      });
    }
    toast.success(isArabic ? "تمت الإضافة" : "Created");
    setForm(emptyForm);
    setOpen(false);
    load();
  };

  const changeStatus = async (c: Claim, next: string) => {
    if (!user) return;
    const patch: Record<string, unknown> = { status: next };
    if (next === "submitted" && !c.submitted_date) {
      patch.submitted_date = new Date().toISOString().slice(0, 10);
    }
    if (CLOSED_STATUSES.includes(next)) {
      patch.decided_at = new Date().toISOString();
      patch.resolved_date = new Date().toISOString().slice(0, 10);
    }
    const { error } = await (supabase.from("claims") as any).update(patch).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await logClaimEvent({
      claim_id: c.id, user_id: user.id, event_type: "status_change",
      from_status: c.status, to_status: next,
    });
    toast.success(isArabic ? "تم تحديث الحالة" : "Status updated");
    load();
  };

  const exportCsv = () => {
    const csv = buildClaimsCsv(filtered, {
      isArabic,
      projectName: () => projectName ?? "",
    });
    downloadCsv(csv, `project-claims-${projectId}.csv`);
  };

  const kpis = [
    { icon: Gavel, label: isArabic ? "عدد السجلات" : "Entries", value: String(summary.count), tone: "text-primary" },
    { icon: DollarSign, label: isArabic ? "إجمالي المطالب به" : "Total claimed", value: fmt(summary.claimed), tone: "text-primary" },
    { icon: CheckCircle2, label: isArabic ? "المعتمد" : "Approved", value: fmt(summary.approved), tone: "text-success" },
    { icon: AlertTriangle, label: isArabic ? "التعرض المفتوح" : "Open exposure", value: fmt(summary.exposure), tone: "text-warning" },
    { icon: Clock, label: isArabic ? "تمديد المدة (يوم)" : "Time extension (days)", value: String(summary.eot), tone: "text-accent" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <k.icon className={`w-3.5 h-3.5 ${k.tone}`} />
                {k.label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            {isArabic ? "سجل أوامر التغيير والمطالبات" : "Change orders & claims ledger"}
            {summary.overdue > 0 && (
              <Badge variant="destructive">
                {summary.overdue} {isArabic ? "متأخرة" : "overdue"}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All statuses"}</SelectItem>
                {CLAIM_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5 me-1" />{isArabic ? "تحديث" : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="w-3.5 h-3.5 me-1" />CSV
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/claims?project=${projectId}`}>
                <ExternalLink className="w-3.5 h-3.5 me-1" />{isArabic ? "الشاشة الكاملة" : "Full screen"}
              </Link>
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-3.5 h-3.5 me-1" />{isArabic ? "سجل جديد" : "New entry"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {isArabic ? "جارٍ التحميل…" : "Loading…"}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {isArabic ? "لا توجد سجلات لهذا المشروع." : "No entries for this project yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "الرقم" : "No."}</TableHead>
                    <TableHead>{isArabic ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead className="text-end">{isArabic ? "المطالب به" : "Claimed"}</TableHead>
                    <TableHead className="text-end">{isArabic ? "المعتمد" : "Approved"}</TableHead>
                    <TableHead>{isArabic ? "الاستحقاق" : "Due"}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const sla = claimSla(c);
                    const next = STATUS_TRANSITIONS[c.status] ?? [];
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.claim_number}</TableCell>
                        <TableCell className="max-w-[280px] truncate">
                          <Link to={`/claims/${c.id}`} className="hover:underline">{c.title}</Link>
                        </TableCell>
                        <TableCell>{claimLabel(CLAIM_TYPES, c.claim_type, isArabic)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={claimStatusClass(c.status)}>
                            {claimLabel(CLAIM_STATUSES, c.status, isArabic)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end tabular-nums">{fmt(Number(c.claimed_amount || 0))}</TableCell>
                        <TableCell className="text-end tabular-nums">{fmt(Number(c.approved_amount || 0))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={slaClass(sla.level)}>
                            {slaText(sla, isArabic)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/claims/${c.id}`}>{isArabic ? "فتح التفاصيل" : "Open details"}</Link>
                              </DropdownMenuItem>
                              {next.length > 0 && (
                                <>
                                  <DropdownMenuLabel className="text-xs">
                                    {isArabic ? "نقل الحالة" : "Move status"}
                                  </DropdownMenuLabel>
                                  {next.map((n) => (
                                    <DropdownMenuItem key={n} onClick={() => changeStatus(c, n)}>
                                      {claimLabel(CLAIM_STATUSES, n, isArabic)}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isArabic ? "سجل أمر تغيير / مطالبة" : "New change order / claim"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isArabic ? "الرقم" : "Number"}</Label>
                <Input value={form.claim_number} placeholder="VO-0001"
                  onChange={(e) => setForm({ ...form, claim_number: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{isArabic ? "النوع" : "Type"}</Label>
                <Select value={form.claim_type} onValueChange={(v) => setForm({ ...form, claim_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLAIM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{isArabic ? t.ar : t.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{isArabic ? "العنوان" : "Title"}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{isArabic ? "الوصف" : "Description"}</Label>
              <Textarea rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isArabic ? "القيمة المطالب بها" : "Claimed amount"}</Label>
                <Input type="number" value={form.claimed_amount}
                  onChange={(e) => setForm({ ...form, claimed_amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{isArabic ? "تمديد المدة (يوم)" : "Time extension (days)"}</Label>
                <Input type="number" value={form.time_extension_days}
                  onChange={(e) => setForm({ ...form, time_extension_days: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isArabic ? "الطرف الآخر" : "Counterparty"}</Label>
                <Input value={form.counterparty}
                  onChange={(e) => setForm({ ...form, counterparty: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{isArabic ? "تاريخ الاستحقاق (yyyy-MM-dd)" : "Response due (yyyy-MM-dd)"}</Label>
                <Input placeholder="2026-01-31" value={form.response_due_date}
                  onChange={(e) => setForm({ ...form, response_due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={createClaim} disabled={saving}>{isArabic ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
