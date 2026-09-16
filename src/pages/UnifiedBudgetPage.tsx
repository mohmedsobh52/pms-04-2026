import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, LayoutGrid, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { fmtMoney, rowsCsv, isOpenClaim, isReceived } from "@/lib/claims-finance";
import { loadPayroll } from "@/lib/payroll";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

type Row = {
  projectId: string;
  name: string;
  baseline: number;
  quantities: number;
  certified: number;
  claimsApproved: number;
  claimsOpen: number;
  claimsReceived: number;
  payrollPaid: number;
  payrollDue: number;
};

const varianceOf = (r: Row) => (r.baseline || r.quantities) - (r.certified + r.claimsApproved);

export default function UnifiedBudgetPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [counterparty, setCounterparty] = useState("all");
  const [counterparties, setCounterparties] = useState<string[]>([]);

  const load = async (cp: string) => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [projRes, itemsRes, baseRes, certRes, claimRes, payroll] = await Promise.all([
        supabase.from("saved_projects").select("id,name").order("updated_at", { ascending: false }),
        supabase.from("project_items").select("project_id,total_price,quantity,unit_price,is_section"),
        supabase.from("project_baselines").select("project_id,total_value,is_current,created_at"),
        supabase.from("progress_certificates").select("project_id,total_work_done,net_amount,status,contractor_name"),
        (supabase.from("claims") as any).select("project_id,claimed_amount,approved_amount,status,counterparty,response_due_date"),
        loadPayroll(),
      ]);
      const err = projRes.error || itemsRes.error || baseRes.error || certRes.error || claimRes.error;
      if (err) throw err;

      const names = new Set<string>();
      (claimRes.data ?? []).forEach((c: any) => c.counterparty && names.add(c.counterparty));
      (certRes.data ?? []).forEach((c: any) => c.contractor_name && names.add(c.contractor_name));
      payroll.forEach((p) => p.counterparty && names.add(p.counterparty));
      setCounterparties(Array.from(names).sort());

      const matchCp = (v?: string | null) => cp === "all" || (v ?? "") === cp;

      const quantities = new Map<string, number>();
      (itemsRes.data ?? []).forEach((it: any) => {
        if (it.is_section) return;
        const v = Number(it.total_price ?? Number(it.quantity || 0) * Number(it.unit_price || 0)) || 0;
        quantities.set(it.project_id, (quantities.get(it.project_id) ?? 0) + v);
      });

      const baseline = new Map<string, number>();
      (baseRes.data ?? []).forEach((b: any) => {
        if (!b.project_id) return;
        const prev = baseline.get(b.project_id);
        if (b.is_current || prev === undefined) baseline.set(b.project_id, Number(b.total_value || 0));
      });

      const certified = new Map<string, number>();
      (certRes.data ?? []).forEach((c: any) => {
        if (!c.project_id || !matchCp(c.contractor_name)) return;
        certified.set(c.project_id, Math.max(certified.get(c.project_id) ?? 0, Number(c.total_work_done || 0)));
      });

      const approved = new Map<string, number>();
      const open = new Map<string, number>();
      const received = new Map<string, number>();
      (claimRes.data ?? []).forEach((c: any) => {
        if (!c.project_id || !matchCp(c.counterparty)) return;
        approved.set(c.project_id, (approved.get(c.project_id) ?? 0) + Number(c.approved_amount || 0));
        if (isOpenClaim(c)) open.set(c.project_id, (open.get(c.project_id) ?? 0) + Number(c.claimed_amount || 0));
        if (isReceived(c)) received.set(c.project_id, (received.get(c.project_id) ?? 0) + Number(c.approved_amount || 0));
      });

      const payPaid = new Map<string, number>();
      const payDue = new Map<string, number>();
      payroll.forEach((p) => {
        if (!p.project_id || !matchCp(p.counterparty)) return;
        payPaid.set(p.project_id, (payPaid.get(p.project_id) ?? 0) + Number(p.paid_amount || 0));
        payDue.set(p.project_id, (payDue.get(p.project_id) ?? 0) + Number(p.gross_amount || 0));
      });

      setRows((projRes.data ?? []).map((p: any) => ({
        projectId: p.id,
        name: p.name,
        baseline: baseline.get(p.id) ?? 0,
        quantities: quantities.get(p.id) ?? 0,
        certified: certified.get(p.id) ?? 0,
        claimsApproved: approved.get(p.id) ?? 0,
        claimsOpen: open.get(p.id) ?? 0,
        claimsReceived: received.get(p.id) ?? 0,
        payrollPaid: payPaid.get(p.id) ?? 0,
        payrollDue: payDue.get(p.id) ?? 0,
      })));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(counterparty); /* eslint-disable-next-line */ }, [user, counterparty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (projectFilter !== "all" && r.projectId !== projectFilter) return false;
      return !q || r.name.toLowerCase().includes(q);
    });
  }, [rows, search, projectFilter]);

  const t = useMemo(() => filtered.reduce((a, r) => ({
    baseline: a.baseline + (r.baseline || r.quantities),
    quantities: a.quantities + r.quantities,
    certified: a.certified + r.certified,
    claims: a.claims + r.claimsApproved,
    open: a.open + r.claimsOpen,
    payroll: a.payroll + r.payrollPaid,
  }), { baseline: 0, quantities: 0, certified: 0, claims: 0, open: 0, payroll: 0 }), [filtered]);

  const variance = t.baseline - (t.certified + t.claims);

  const exportCsv = () => {
    downloadCsv(rowsCsv(filtered.map((r) => ({
      [isArabic ? "المشروع" : "Project"]: r.name,
      [isArabic ? "خط الأساس" : "Baseline"]: r.baseline,
      [isArabic ? "قيمة الكميات" : "Quantities value"]: r.quantities,
      [isArabic ? "المنفذ المعتمد" : "Certified"]: r.certified,
      [isArabic ? "مطالبات معتمدة" : "Approved claims"]: r.claimsApproved,
      [isArabic ? "مطالبات مفتوحة" : "Open claims"]: r.claimsOpen,
      [isArabic ? "مطالبات مُستلمة" : "Received claims"]: r.claimsReceived,
      [isArabic ? "مرتبات مستحقة" : "Payroll due"]: r.payrollDue,
      [isArabic ? "مرتبات مدفوعة" : "Payroll paid"]: r.payrollPaid,
      [isArabic ? "الانحراف" : "Variance"]: varianceOf(r),
    }))), `unified-budget-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={LayoutGrid}
        title={isArabic ? "الميزانية الموحدة" : "Unified budget"}
        subtitle={isArabic
          ? "خط الأساس والكميات والمطالبات والمرتبات في لوحة واحدة، مع تصفية حسب المشروع والمقابلة"
          : "Baseline, quantities, claims and payroll in one view, filtered by project and counterparty"}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => load(counterparty)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard label={isArabic ? "خط الأساس" : "Baseline"} value={fmtMoney(t.baseline)} tone="primary" />
        <KpiCard label={isArabic ? "قيمة الكميات" : "Quantities"} value={fmtMoney(t.quantities)} />
        <KpiCard label={isArabic ? "المنفذ المعتمد" : "Certified"} value={fmtMoney(t.certified)} tone="success" />
        <KpiCard label={isArabic ? "مطالبات معتمدة" : "Approved claims"} value={fmtMoney(t.claims)} hint={isArabic ? `مفتوحة: ${fmtMoney(t.open)}` : `Open: ${fmtMoney(t.open)}`} />
        <KpiCard label={isArabic ? "مرتبات مدفوعة" : "Payroll paid"} value={fmtMoney(t.payroll)} />
        <KpiCard label={isArabic ? "الانحراف" : "Variance"} value={fmtMoney(variance)} tone={variance < 0 ? "destructive" : "success"} />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{isArabic ? "الميزانية لكل مشروع" : "Budget per project"} ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-48" placeholder={isArabic ? "بحث..." : "Search..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
                {rows.map((r) => <SelectItem key={r.projectId} value={r.projectId}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={counterparty} onValueChange={setCounterparty}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المقابلات" : "All counterparties"}</SelectItem>
                {counterparties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "خط الأساس" : "Baseline"}</TableHead>
                  <TableHead>{isArabic ? "الكميات" : "Quantities"}</TableHead>
                  <TableHead>{isArabic ? "المنفذ" : "Certified"}</TableHead>
                  <TableHead>{isArabic ? "مطالبات معتمدة" : "Approved claims"}</TableHead>
                  <TableHead>{isArabic ? "مطالبات مفتوحة" : "Open claims"}</TableHead>
                  <TableHead>{isArabic ? "مرتبات مدفوعة" : "Payroll paid"}</TableHead>
                  <TableHead className="w-36">{isArabic ? "الاستهلاك" : "Burn"}</TableHead>
                  <TableHead>{isArabic ? "الانحراف" : "Variance"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد بيانات" : "No data"}
                  </TableCell></TableRow>
                )}
                {!loading && filtered.map((r) => {
                  const base = r.baseline || r.quantities;
                  const v = varianceOf(r);
                  const pct = base > 0 ? Math.min(100, Math.round(((r.certified + r.claimsApproved) / base) * 100)) : 0;
                  return (
                    <TableRow key={r.projectId}>
                      <TableCell className="font-medium max-w-[220px] truncate">{r.name}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.baseline)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.quantities)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.certified)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.claimsApproved)}</TableCell>
                      <TableCell className="tabular-nums text-warning">{fmtMoney(r.claimsOpen)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.payrollPaid)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs text-muted-foreground w-9 text-end">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v < 0 ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}>
                          {fmtMoney(v)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/claims?project=${r.projectId}`}>
                            <ExternalLink className="h-4 w-4 me-1" />{isArabic ? "المطالبات" : "Claims"}
                          </Link>
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
