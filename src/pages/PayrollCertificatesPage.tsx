import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Search, FileSignature } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { fmtMoney, rowsCsv } from "@/lib/claims-finance";
import { PayrollEntry, loadPayroll } from "@/lib/payroll";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

type Row = {
  key: string;
  month: string;
  contractor: string;
  projectId: string | null;
  project: string;
  certified: number;
  certCount: number;
  payrollDue: number;
  payrollPaid: number;
};

const CERT_COUNTED = ["approved", "paid", "issued"];

export default function PayrollCertificatesPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [all, setAll] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [contractor, setContractor] = useState("all");
  const [project, setProject] = useState("all");

  const load = async () => {
    if (!user) { setAll([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [projRes, certRes, payroll] = await Promise.all([
        supabase.from("saved_projects").select("id,name"),
        supabase
          .from("progress_certificates")
          .select("project_id,contractor_name,net_amount,status,period_to,created_at"),
        loadPayroll(),
      ]);
      if (projRes.error) throw projRes.error;
      if (certRes.error) throw certRes.error;

      const names = new Map<string, string>();
      (projRes.data ?? []).forEach((p: any) => names.set(p.id, p.name));

      const map = new Map<string, Row>();
      const get = (contractorName: string, m: string, projectId: string | null) => {
        const key = `${contractorName}__${m}__${projectId ?? "none"}`;
        const row = map.get(key) ?? {
          key, month: m, contractor: contractorName, projectId,
          project: projectId ? names.get(projectId) ?? "—" : "—",
          certified: 0, certCount: 0, payrollDue: 0, payrollPaid: 0,
        };
        map.set(key, row);
        return row;
      };

      (certRes.data ?? []).forEach((c: any) => {
        if (!CERT_COUNTED.includes(String(c.status ?? "").toLowerCase())) return;
        const d = c.period_to || c.created_at;
        if (!d) return;
        const r = get(c.contractor_name || "—", String(d).slice(0, 7), c.project_id ?? null);
        r.certified += Number(c.net_amount || 0);
        r.certCount += 1;
      });

      (payroll as PayrollEntry[]).forEach((e) => {
        const r = get(e.counterparty || "—", e.period_month, e.project_id ?? null);
        r.payrollDue += Number(e.gross_amount || 0);
        r.payrollPaid += Number(e.paid_amount || 0);
      });

      setAll(Array.from(map.values()).sort((a, b) =>
        b.month.localeCompare(a.month) || a.contractor.localeCompare(b.contractor)));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const months = useMemo(() => Array.from(new Set(all.map((r) => r.month))).sort().reverse(), [all]);
  const contractors = useMemo(() => Array.from(new Set(all.map((r) => r.contractor))).sort(), [all]);
  const projects = useMemo(() => {
    const m = new Map<string, string>();
    all.forEach((r) => { if (r.projectId) m.set(r.projectId, r.project); });
    return Array.from(m.entries());
  }, [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (month !== "all" && r.month !== month) return false;
      if (contractor !== "all" && r.contractor !== contractor) return false;
      if (project !== "all" && r.projectId !== project) return false;
      return !q || `${r.contractor} ${r.project}`.toLowerCase().includes(q);
    });
  }, [all, search, month, contractor, project]);

  const t = useMemo(() => rows.reduce((a, r) => ({
    certified: a.certified + r.certified,
    payrollPaid: a.payrollPaid + r.payrollPaid,
    payrollDue: a.payrollDue + r.payrollDue,
  }), { certified: 0, payrollPaid: 0, payrollDue: 0 }), [rows]);

  const gap = t.certified - t.payrollPaid;
  const coverage = t.certified > 0 ? Math.round((t.payrollPaid / t.certified) * 100) : 0;

  const exportCsv = () => {
    downloadCsv(rowsCsv(rows.map((r) => ({
      [isArabic ? "الشهر" : "Month"]: r.month,
      [isArabic ? "المقاول" : "Contractor"]: r.contractor,
      [isArabic ? "المشروع" : "Project"]: r.project,
      [isArabic ? "عدد المستخلصات" : "Certificates"]: r.certCount,
      [isArabic ? "صافي المستخلصات" : "Certified net"]: r.certified,
      [isArabic ? "المرتبات المستحقة" : "Payroll due"]: r.payrollDue,
      [isArabic ? "المرتبات المدفوعة" : "Payroll paid"]: r.payrollPaid,
      [isArabic ? "الفرق" : "Gap"]: r.certified - r.payrollPaid,
      [isArabic ? "نسبة التغطية %" : "Coverage %"]: r.certified > 0 ? Math.round((r.payrollPaid / r.certified) * 100) : 0,
    }))), `payroll-vs-certificates-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={FileSignature}
        title={isArabic ? "المرتبات مقابل المستخلصات" : "Payroll vs certificates"}
        subtitle={isArabic
          ? "مطابقة صافي المستخلصات المعتمدة مع الدفعات والمرتبات لكل مقاول ومشروع شهرياً"
          : "Match certified net amounts with paid payroll per contractor, project and month"}
        actions={<>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label={isArabic ? "صافي المستخلصات" : "Certified net"} value={fmtMoney(t.certified)} tone="primary" />
        <KpiCard label={isArabic ? "المرتبات المدفوعة" : "Payroll paid"} value={fmtMoney(t.payrollPaid)} tone="success"
          hint={isArabic ? `مستحق: ${fmtMoney(t.payrollDue)}` : `Due: ${fmtMoney(t.payrollDue)}`} />
        <KpiCard label={isArabic ? "الفرق" : "Gap"} value={fmtMoney(gap)} tone={gap < 0 ? "destructive" : "warning"}
          hint={isArabic ? "المستخلصات ناقص المدفوع" : "Certified minus paid"} />
        <KpiCard label={isArabic ? "نسبة التغطية" : "Coverage"} value={`${coverage}%`} />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            {isArabic ? "المطابقة الشهرية" : "Monthly reconciliation"} ({rows.length})
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-48" placeholder={isArabic ? "بحث..." : "Search..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
                {projects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
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
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "عدد المستخلصات" : "Certificates"}</TableHead>
                  <TableHead>{isArabic ? "صافي المستخلصات" : "Certified net"}</TableHead>
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
                  const g = r.certified - r.payrollPaid;
                  const cov = r.certified > 0 ? Math.round((r.payrollPaid / r.certified) * 100) : 0;
                  return (
                    <TableRow key={r.key}>
                      <TableCell className="tabular-nums">{r.month}</TableCell>
                      <TableCell className="font-medium">{r.contractor}</TableCell>
                      <TableCell>{r.project}</TableCell>
                      <TableCell className="tabular-nums">{r.certCount}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.certified)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.payrollDue)}</TableCell>
                      <TableCell className="tabular-nums text-success">{fmtMoney(r.payrollPaid)}</TableCell>
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
