import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Plus, RefreshCw, Search, Trash2, Wallet } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { fmtMoney, rowsCsv } from "@/lib/claims-finance";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";
import {
  PayrollEntry, PAYROLL_TYPES, payrollTypeLabel, loadPayroll, currentMonthKey,
} from "@/lib/payroll";

const emptyForm = () => ({
  counterparty: "",
  entry_type: "contractor_payment",
  project_id: "none",
  period_month: currentMonthKey(),
  gross_amount: "",
  paid_amount: "",
  paid_date: "",
  currency: "SAR",
  notes: "",
});

export default function PayrollPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const load = async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [rows, projRes] = await Promise.all([
        loadPayroll(),
        supabase.from("saved_projects").select("id,name").order("updated_at", { ascending: false }),
      ]);
      setEntries(rows);
      setProjects((projRes.data ?? []) as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const names = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const months = useMemo(
    () => Array.from(new Set(entries.map((e) => e.period_month))).sort().reverse(),
    [entries],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.entry_type !== typeFilter) return false;
      if (projectFilter !== "all" && (e.project_id ?? "none") !== projectFilter) return false;
      if (monthFilter !== "all" && e.period_month !== monthFilter) return false;
      if (!q) return true;
      return [e.counterparty, e.notes, e.project_id ? names.get(e.project_id) : ""]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [entries, search, typeFilter, projectFilter, monthFilter, names]);

  const totals = useMemo(() => rows.reduce((a, e) => ({
    gross: a.gross + Number(e.gross_amount || 0),
    paid: a.paid + Number(e.paid_amount || 0),
    salaries: a.salaries + (e.entry_type === "salary" ? Number(e.paid_amount || 0) : 0),
    contractor: a.contractor + (e.entry_type !== "salary" ? Number(e.paid_amount || 0) : 0),
  }), { gross: 0, paid: 0, salaries: 0, contractor: 0 }), [rows]);

  const save = async () => {
    if (!form.counterparty.trim()) {
      toast.error(isArabic ? "أدخل اسم المقاول أو الموظف" : "Enter contractor / employee name");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.period_month)) {
      toast.error(isArabic ? "صيغة الشهر يجب أن تكون yyyy-MM" : "Month must be yyyy-MM");
      return;
    }
    const payload = {
      counterparty: form.counterparty.trim(),
      entry_type: form.entry_type,
      project_id: form.project_id === "none" ? null : form.project_id,
      period_month: form.period_month,
      gross_amount: Number(form.gross_amount || 0),
      paid_amount: Number(form.paid_amount || 0),
      paid_date: form.paid_date || null,
      currency: form.currency || "SAR",
      notes: form.notes || null,
    };
    const { error } = await (supabase.from("payroll_entries") as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(isArabic ? "تمت الإضافة" : "Saved");
    setOpen(false);
    setForm(emptyForm());
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from("payroll_entries") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const exportCsv = () => {
    downloadCsv(rowsCsv(rows.map((e) => ({
      [isArabic ? "الشهر" : "Month"]: e.period_month,
      [isArabic ? "المقاول/الموظف" : "Contractor / Employee"]: e.counterparty,
      [isArabic ? "النوع" : "Type"]: payrollTypeLabel(e.entry_type, isArabic),
      [isArabic ? "المشروع" : "Project"]: e.project_id ? names.get(e.project_id) ?? "—" : "—",
      [isArabic ? "المستحق" : "Gross"]: Number(e.gross_amount || 0),
      [isArabic ? "المدفوع" : "Paid"]: Number(e.paid_amount || 0),
      [isArabic ? "المتبقي" : "Outstanding"]: Math.max(0, Number(e.gross_amount || 0) - Number(e.paid_amount || 0)),
      [isArabic ? "تاريخ الدفع" : "Paid date"]: e.paid_date ?? "",
      [isArabic ? "ملاحظات" : "Notes"]: e.notes ?? "",
    }))), `payroll-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={Wallet}
        title={isArabic ? "المرتبات ودفعات المقاولين" : "Payroll & contractor payments"}
        subtitle={isArabic ? "تسجيل المستحقات والمدفوعات الشهرية لكل مقاول أو موظف" : "Record monthly dues and payments per contractor or employee"}
        actions={<>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 me-1" />{isArabic ? "إضافة" : "Add"}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{isArabic ? "سجل مرتب / دفعة" : "New payroll / payment entry"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>{isArabic ? "المقاول / الموظف" : "Contractor / Employee"}</Label>
                  <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{isArabic ? "النوع" : "Type"}</Label>
                  <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYROLL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{isArabic ? t.ar : t.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{isArabic ? "الشهر (yyyy-MM)" : "Month (yyyy-MM)"}</Label>
                  <Input value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} placeholder="2026-09" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>{isArabic ? "المشروع" : "Project"}</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isArabic ? "بدون مشروع" : "No project"}</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{isArabic ? "المستحق" : "Gross due"}</Label>
                  <Input type="number" value={form.gross_amount} onChange={(e) => setForm({ ...form, gross_amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{isArabic ? "المدفوع" : "Paid"}</Label>
                  <Input type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{isArabic ? "تاريخ الدفع (yyyy-MM-dd)" : "Paid date (yyyy-MM-dd)"}</Label>
                  <Input value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} placeholder="2026-09-30" />
                </div>
                <div className="space-y-1">
                  <Label>{isArabic ? "العملة" : "Currency"}</Label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
                <Button onClick={save}>{isArabic ? "حفظ" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label={isArabic ? "إجمالي المستحق" : "Total due"} value={fmtMoney(totals.gross)} tone="primary" />
        <KpiCard label={isArabic ? "إجمالي المدفوع" : "Total paid"} value={fmtMoney(totals.paid)} tone="success" />
        <KpiCard label={isArabic ? "دفعات المقاولين" : "Contractor payments"} value={fmtMoney(totals.contractor)} />
        <KpiCard
          label={isArabic ? "المتبقي" : "Outstanding"}
          value={fmtMoney(Math.max(0, totals.gross - totals.paid))}
          tone={totals.gross - totals.paid > 0 ? "warning" : "success"}
          hint={isArabic ? `رواتب مدفوعة: ${fmtMoney(totals.salaries)}` : `Salaries paid: ${fmtMoney(totals.salaries)}`}
        />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{isArabic ? "السجلات" : "Entries"} ({rows.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-48" placeholder={isArabic ? "بحث..." : "Search..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الأنواع" : "All types"}</SelectItem>
                {PAYROLL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{isArabic ? t.ar : t.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
                <SelectItem value="none">{isArabic ? "بدون مشروع" : "No project"}</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الشهور" : "All months"}</SelectItem>
                {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "الشهر" : "Month"}</TableHead>
                  <TableHead>{isArabic ? "المقاول/الموظف" : "Contractor / Employee"}</TableHead>
                  <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "المستحق" : "Due"}</TableHead>
                  <TableHead>{isArabic ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{isArabic ? "المتبقي" : "Outstanding"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </TableCell></TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد سجلات" : "No entries"}
                  </TableCell></TableRow>
                )}
                {!loading && rows.map((e) => {
                  const rest = Math.max(0, Number(e.gross_amount || 0) - Number(e.paid_amount || 0));
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums">{e.period_month}</TableCell>
                      <TableCell className="font-medium">{e.counterparty}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payrollTypeLabel(e.entry_type, isArabic)}</Badge>
                      </TableCell>
                      <TableCell>{e.project_id ? names.get(e.project_id) ?? "—" : "—"}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(Number(e.gross_amount || 0), e.currency)}</TableCell>
                      <TableCell className="tabular-nums text-success">{fmtMoney(Number(e.paid_amount || 0), e.currency)}</TableCell>
                      <TableCell className={`tabular-nums ${rest > 0 ? "text-warning" : ""}`}>{fmtMoney(rest, e.currency)}</TableCell>
                      <TableCell className="text-end">
                        <Button size="icon" variant="ghost" onClick={() => remove(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
