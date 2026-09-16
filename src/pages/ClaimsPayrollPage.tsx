import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Search, Scale } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { FinanceClaim, loadClaimsFinance, isReceived, claimPeriodDate, monthKey, fmtMoney, rowsCsv } from "@/lib/claims-finance";
import { PayrollEntry, loadPayroll } from "@/lib/payroll";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

type Row = {
  key: string;
  contractor: string;
  month: string;
  claimed: number;
  approved: number;
  received: number;
  payrollDue: number;
  payrollPaid: number;
};

export default function ClaimsPayrollPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [claims, setClaims] = useState<FinanceClaim[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [contractor, setContractor] = useState("all");

  const load = async () => {
    if (!user) { setClaims([]); setPayroll([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [c, p] = await Promise.all([loadClaimsFinance(), loadPayroll()]);
      setClaims(c);
      setPayroll(p);
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const all = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    const get = (contractorName: string, m: string) => {
      const key = `${contractorName}__${m}`;
      const row = map.get(key) ?? {
        key, contractor: contractorName, month: m,
        claimed: 0, approved: 0, received: 0, payrollDue: 0, payrollPaid: 0,
      };
      map.set(key, row);
      return row;
    };
    claims.forEach((c) => {
      const d = claimPeriodDate(c);
      if (!d) return;
      const r = get(c.counterparty || "—", monthKey(d));
      r.claimed += Number(c.claimed_amount || 0);
      r.approved += Number(c.approved_amount || 0);
      if (isReceived(c)) r.received += Number(c.approved_amount || 0);
    });
    payroll.forEach((e) => {
      const r = get(e.counterparty || "—", e.period_month);
      r.payrollDue += Number(e.gross_amount || 0);
      r.payrollPaid += Number(e.paid_amount || 0);
    });
    return Array.from(map.values()).sort((a, b) =>
      b.month.localeCompare(a.month) || a.contractor.localeCompare(b.contractor));
  }, [claims, payroll]);

  const months = useMemo(() => Array.from(new Set(all.map((r) => r.month))).sort().reverse(), [all]);
  const contractors = useMemo(() => Array.from(new Set(all.map((r) => r.contractor))).sort(), [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (month !== "all" && r.month !== month) return false;
      if (contractor !== "all" && r.contractor !== contractor) return false;
      return !q || r.contractor.toLowerCase().includes(q);
    });
  }, [all, search, month, contractor]);

  const t = useMemo(() => rows.reduce((a, r) => ({
    approved: a.approved + r.approved,
    received: a.received + r.received,
    payrollPaid: a.payrollPaid + r.payrollPaid,
    payrollDue: a.payrollDue + r.payrollDue,
  }), { approved: 0, received: 0, payrollPaid: 0, payrollDue: 0 }), [rows]);

  const gap = t.approved - t.payrollPaid;

  const exportCsv = () => {
    downloadCsv(rowsCsv(rows.map((r) => ({
      [isArabic ? "الشهر" : "Month"]: r.month,
      [isArabic ? "المقاول" : "Contractor"]: r.contractor,
      [isArabic ? "المطالب به" : "Claimed"]: r.claimed,
      [isArabic ? "المطالبات المعتمدة" : "Approved claims"]: r.approved,
      [isArabic ? "المُستلم" : "Received"]: r.received,
      [isArabic ? "المرتبات المستحقة" : "Payroll due"]: r.payrollDue,
      [isArabic ? "المرتبات المدفوعة" : "Payroll paid"]: r.payrollPaid,
      [isArabic ? "الفرق (معتمد - مدفوع)" : "Gap (approved - paid)"]: r.approved - r.payrollPaid,
      [isArabic ? "نسبة التغطية %" : "Coverage %"]: r.approved > 0 ? Math.round((r.payrollPaid / r.approved) * 100) : 0,
    }))), `claims-vs-payroll-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={Scale}
        title={isArabic ? "المطالبات مقابل المرتبات" : "Claims vs payroll"}
        subtitle={isArabic ? "الفرق بين المطالبات المُستحقة والمرتبات المدفوعة لكل مقاول شهرياً" : "Gap between claim dues and paid payroll per contractor per month"}
        actions={<>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label={isArabic ? "المطالبات المعتمدة" : "Approved claims"} value={fmtMoney(t.approved)} tone="primary" />
        <KpiCard label={isArabic ? "المُستلم" : "Received"} value={fmtMoney(t.received)} tone="success" />
        <KpiCard label={isArabic ? "المرتبات المدفوعة" : "Payroll paid"} value={fmtMoney(t.payrollPaid)} hint={isArabic ? `مستحق: ${fmtMoney(t.payrollDue)}` : `Due: ${fmtMoney(t.payrollDue)}`} />
        <KpiCard
          label={isArabic ? "الفرق" : "Gap"}
          value={fmtMoney(gap)}
          tone={gap < 0 ? "destructive" : "warning"}
          hint={isArabic ? "المطالبات المعتمدة ناقص المرتبات المدفوعة" : "Approved claims minus payroll paid"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{isArabic ? "المقارنة الشهرية" : "Monthly comparison"} ({rows.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-48" placeholder={isArabic ? "بحث عن مقاول..." : "Search contractor..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={contractor} onValueChange={setContractor}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المقاولين" : "All contractors"}</SelectItem>
                {contractors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <TableHead>{isArabic ? "المقاول" : "Contractor"}</TableHead>
                  <TableHead>{isArabic ? "المطالب به" : "Claimed"}</TableHead>
                  <TableHead>{isArabic ? "معتمد" : "Approved"}</TableHead>
                  <TableHead>{isArabic ? "مُستلم" : "Received"}</TableHead>
                  <TableHead>{isArabic ? "مرتبات مستحقة" : "Payroll due"}</TableHead>
                  <TableHead>{isArabic ? "مرتبات مدفوعة" : "Payroll paid"}</TableHead>
                  <TableHead>{isArabic ? "الفرق" : "Gap"}</TableHead>
                  <TableHead>{isArabic ? "التغطية" : "Coverage"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </TableCell></TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد بيانات" : "No data"}
                  </TableCell></TableRow>
                )}
                {!loading && rows.map((r) => {
                  const g = r.approved - r.payrollPaid;
                  const cov = r.approved > 0 ? Math.round((r.payrollPaid / r.approved) * 100) : 0;
                  return (
                    <TableRow key={r.key}>
                      <TableCell className="tabular-nums">{r.month}</TableCell>
                      <TableCell className="font-medium">{r.contractor}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.claimed)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.approved)}</TableCell>
                      <TableCell className="tabular-nums text-success">{fmtMoney(r.received)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.payrollDue)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.payrollPaid)}</TableCell>
                      <TableCell className={`tabular-nums ${g < 0 ? "text-destructive" : "text-warning"}`}>{fmtMoney(g)}</TableCell>
                      <TableCell className="tabular-nums">{cov}%</TableCell>
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
