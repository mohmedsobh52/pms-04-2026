import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Search, CalendarRange } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { fmtMoney, rowsCsv, isReceived, isOpenClaim, claimPeriodDate, monthKey } from "@/lib/claims-finance";
import { loadPayroll } from "@/lib/payroll";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

type Row = {
  key: string;
  month: string;
  projectId: string;
  project: string;
  budget: number;
  executed: number;
  earnedBudget: number;
  claims: number;
  openClaims: number;
  collected: number;
  payrollPaid: number;
};

export default function EvmMonthlyReportsPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("all");
  const [counterparty, setCounterparty] = useState("all");
  const [counterparties, setCounterparties] = useState<string[]>([]);
  const [month, setMonth] = useState("all");

  const load = async (cp: string) => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [projRes, itemsRes, certRes, claimRes, payroll] = await Promise.all([
        supabase.from("saved_projects").select("id,name").order("updated_at", { ascending: false }),
        supabase.from("project_items").select("project_id,total_price,quantity,unit_price,is_section"),
        supabase.from("progress_certificates").select("project_id,period_to,current_work_done,net_amount,status,contractor_name,created_at"),
        (supabase.from("claims") as any).select("project_id,claimed_amount,approved_amount,status,counterparty,resolved_date,submitted_date,created_at"),
        loadPayroll(),
      ]);
      const err = projRes.error || itemsRes.error || certRes.error || claimRes.error;
      if (err) throw err;

      const cps = new Set<string>();
      (claimRes.data ?? []).forEach((c: any) => c.counterparty && cps.add(c.counterparty));
      (certRes.data ?? []).forEach((c: any) => c.contractor_name && cps.add(c.contractor_name));
      payroll.forEach((p) => p.counterparty && cps.add(p.counterparty));
      setCounterparties(Array.from(cps).sort());
      const matchCp = (v?: string | null) => cp === "all" || (v ?? "") === cp;

      const names = new Map<string, string>((projRes.data ?? []).map((p: any) => [p.id, p.name]));
      const budget = new Map<string, number>();
      (itemsRes.data ?? []).forEach((it: any) => {
        if (it.is_section) return;
        const v = Number(it.total_price ?? Number(it.quantity || 0) * Number(it.unit_price || 0)) || 0;
        budget.set(it.project_id, (budget.get(it.project_id) ?? 0) + v);
      });

      const map = new Map<string, Row>();
      const get = (projectId: string, m: string) => {
        const key = `${projectId}__${m}`;
        const r = map.get(key) ?? {
          key, month: m, projectId, project: names.get(projectId) ?? "—",
          budget: budget.get(projectId) ?? 0,
          executed: 0, earnedBudget: 0, claims: 0, openClaims: 0, collected: 0, payrollPaid: 0,
        };
        map.set(key, r);
        return r;
      };

      (certRes.data ?? []).forEach((c: any) => {
        if (!c.project_id || !matchCp(c.contractor_name)) return;
        const raw = c.period_to || c.created_at;
        if (!raw) return;
        const d = new Date(String(raw).length <= 10 ? `${raw}T00:00:00` : raw);
        if (Number.isNaN(d.getTime())) return;
        const r = get(c.project_id, monthKey(d));
        r.executed += Number(c.current_work_done || 0);
        if (["approved", "paid", "issued"].includes(String(c.status ?? "").toLowerCase())) {
          r.earnedBudget += Number(c.net_amount || 0);
        }
      });

      (claimRes.data ?? []).forEach((c: any) => {
        if (!c.project_id || !matchCp(c.counterparty)) return;
        const d = claimPeriodDate(c);
        if (!d) return;
        const r = get(c.project_id, monthKey(d));
        r.claims += Number(c.claimed_amount || 0);
        if (isOpenClaim(c)) r.openClaims += Number(c.claimed_amount || 0);
        if (isReceived(c)) r.collected += Number(c.approved_amount || 0);
      });

      payroll.forEach((p) => {
        if (!p.project_id || !matchCp(p.counterparty)) return;
        const r = get(p.project_id, p.period_month);
        r.payrollPaid += Number(p.paid_amount || 0);
      });

      setRows(Array.from(map.values()).sort((a, b) =>
        b.month.localeCompare(a.month) || a.project.localeCompare(b.project)));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(counterparty); /* eslint-disable-next-line */ }, [user, counterparty]);

  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.month))).sort().reverse(), [rows]);
  const projects = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.projectId, r.project));
    return Array.from(m.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (project !== "all" && r.projectId !== project) return false;
      if (month !== "all" && r.month !== month) return false;
      return !q || r.project.toLowerCase().includes(q);
    });
  }, [rows, search, project, month]);

  const t = useMemo(() => filtered.reduce((a, r) => ({
    executed: a.executed + r.executed,
    earned: a.earned + r.earnedBudget,
    claims: a.claims + r.claims,
    collected: a.collected + r.collected,
    payroll: a.payroll + r.payrollPaid,
  }), { executed: 0, earned: 0, claims: 0, collected: 0, payroll: 0 }), [filtered]);

  const exportCsv = () => {
    downloadCsv(rowsCsv(filtered.map((r) => ({
      [isArabic ? "الشهر" : "Month"]: r.month,
      [isArabic ? "المشروع" : "Project"]: r.project,
      [isArabic ? "الميزانية" : "Budget"]: r.budget,
      [isArabic ? "المنفذ" : "Executed"]: r.executed,
      [isArabic ? "الميزانية المُستحقة" : "Earned budget"]: r.earnedBudget,
      [isArabic ? "المطالبات" : "Claims"]: r.claims,
      [isArabic ? "مطالبات مفتوحة" : "Open claims"]: r.openClaims,
      [isArabic ? "التحصيل" : "Collected"]: r.collected,
      [isArabic ? "المرتبات المدفوعة" : "Payroll paid"]: r.payrollPaid,
      [isArabic ? "نسبة التحصيل %" : "Collection %"]: r.claims > 0 ? Math.round((r.collected / r.claims) * 100) : 0,
    }))), `evm-monthly-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={CalendarRange}
        title={isArabic ? "تقارير القيمة المكتسبة الشهرية" : "Monthly EVM reports"}
        subtitle={isArabic
          ? "لكل مشروع: الميزانية، المنفذ، الميزانية المُستحقة، المطالبات، والتحصيل"
          : "Per project: budget, executed, earned budget, claims and collection"}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => load(counterparty)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard label={isArabic ? "المنفذ" : "Executed"} value={fmtMoney(t.executed)} tone="primary" />
        <KpiCard label={isArabic ? "الميزانية المُستحقة" : "Earned budget"} value={fmtMoney(t.earned)} />
        <KpiCard label={isArabic ? "المطالبات" : "Claims"} value={fmtMoney(t.claims)} tone="warning" />
        <KpiCard label={isArabic ? "التحصيل" : "Collected"} value={fmtMoney(t.collected)} tone="success"
          hint={t.claims > 0 ? `${Math.round((t.collected / t.claims) * 100)}%` : undefined} />
        <KpiCard label={isArabic ? "المرتبات المدفوعة" : "Payroll paid"} value={fmtMoney(t.payroll)} />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{isArabic ? "التقرير الشهري" : "Monthly report"} ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-44" placeholder={isArabic ? "بحث..." : "Search..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
                {projects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={counterparty} onValueChange={setCounterparty}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المقابلات" : "All counterparties"}</SelectItem>
                {counterparties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
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
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "الميزانية" : "Budget"}</TableHead>
                  <TableHead>{isArabic ? "المنفذ" : "Executed"}</TableHead>
                  <TableHead>{isArabic ? "الميزانية المُستحقة" : "Earned"}</TableHead>
                  <TableHead>{isArabic ? "المطالبات" : "Claims"}</TableHead>
                  <TableHead>{isArabic ? "التحصيل" : "Collected"}</TableHead>
                  <TableHead>{isArabic ? "المرتبات" : "Payroll"}</TableHead>
                  <TableHead>{isArabic ? "نسبة التحصيل" : "Collection"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد بيانات" : "No data"}
                  </TableCell></TableRow>
                )}
                {!loading && filtered.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="tabular-nums">{r.month}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{r.project}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(r.budget)}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(r.executed)}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(r.earnedBudget)}</TableCell>
                    <TableCell className="tabular-nums text-warning">{fmtMoney(r.claims)}</TableCell>
                    <TableCell className="tabular-nums text-success">{fmtMoney(r.collected)}</TableCell>
                    <TableCell className="tabular-nums">{fmtMoney(r.payrollPaid)}</TableCell>
                    <TableCell className="tabular-nums">
                      {r.claims > 0 ? `${Math.round((r.collected / r.claims) * 100)}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
