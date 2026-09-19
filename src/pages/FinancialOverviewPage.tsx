import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Gauge, ExternalLink } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { fmtMoney, rowsCsv, isOpenClaim, isReceived, monthKey, claimPeriodDate } from "@/lib/claims-finance";
import { loadPayroll } from "@/lib/payroll";
import { KpiCard } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

type ProjectRow = {
  id: string;
  name: string;
  budget: number;
  certified: number;
  claimsApproved: number;
  claimsOpen: number;
  received: number;
  payrollPaid: number;
};

type MonthRow = { month: string; certified: number; claims: number; payroll: number };

const CERT_COUNTED = ["approved", "paid", "issued"];

export default function FinancialOverviewPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [projectFilter, setProjectFilter] = useState("all");

  const load = async () => {
    if (!user) { setProjects([]); setMonths([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [projRes, itemsRes, baseRes, certRes, claimRes, payroll] = await Promise.all([
        supabase.from("saved_projects").select("id,name").order("updated_at", { ascending: false }),
        supabase.from("project_items").select("project_id,total_price,quantity,unit_price,is_section"),
        supabase.from("project_baselines").select("project_id,total_value,is_current"),
        supabase.from("progress_certificates").select("project_id,net_amount,total_work_done,status,period_to,created_at"),
        (supabase.from("claims") as any).select("project_id,claimed_amount,approved_amount,status,submitted_date,resolved_date,created_at"),
        loadPayroll(),
      ]);
      const err = projRes.error || itemsRes.error || baseRes.error || certRes.error || claimRes.error;
      if (err) throw err;

      const quantities = new Map<string, number>();
      (itemsRes.data ?? []).forEach((it: any) => {
        if (it.is_section) return;
        const v = Number(it.total_price ?? Number(it.quantity || 0) * Number(it.unit_price || 0)) || 0;
        quantities.set(it.project_id, (quantities.get(it.project_id) ?? 0) + v);
      });

      const baseline = new Map<string, number>();
      (baseRes.data ?? []).forEach((b: any) => {
        if (!b.project_id) return;
        if (b.is_current || !baseline.has(b.project_id)) baseline.set(b.project_id, Number(b.total_value || 0));
      });

      const certified = new Map<string, number>();
      const monthMap = new Map<string, MonthRow>();
      const bucket = (m: string) => {
        const r = monthMap.get(m) ?? { month: m, certified: 0, claims: 0, payroll: 0 };
        monthMap.set(m, r);
        return r;
      };

      (certRes.data ?? []).forEach((c: any) => {
        if (!CERT_COUNTED.includes(String(c.status ?? "").toLowerCase())) return;
        if (c.project_id) {
          certified.set(c.project_id, (certified.get(c.project_id) ?? 0) + Number(c.net_amount || 0));
        }
        const d = c.period_to || c.created_at;
        if (d) bucket(String(d).slice(0, 7)).certified += Number(c.net_amount || 0);
      });

      const approved = new Map<string, number>();
      const open = new Map<string, number>();
      const received = new Map<string, number>();
      (claimRes.data ?? []).forEach((c: any) => {
        if (c.project_id) {
          approved.set(c.project_id, (approved.get(c.project_id) ?? 0) + Number(c.approved_amount || 0));
          if (isOpenClaim(c)) open.set(c.project_id, (open.get(c.project_id) ?? 0) + Number(c.claimed_amount || 0));
          if (isReceived(c)) received.set(c.project_id, (received.get(c.project_id) ?? 0) + Number(c.approved_amount || 0));
        }
        const d = claimPeriodDate(c);
        if (d) bucket(monthKey(d)).claims += Number(c.approved_amount || 0);
      });

      const payPaid = new Map<string, number>();
      payroll.forEach((p) => {
        if (p.project_id) payPaid.set(p.project_id, (payPaid.get(p.project_id) ?? 0) + Number(p.paid_amount || 0));
        bucket(p.period_month).payroll += Number(p.paid_amount || 0);
      });

      setProjects((projRes.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        budget: baseline.get(p.id) || quantities.get(p.id) || 0,
        certified: certified.get(p.id) ?? 0,
        claimsApproved: approved.get(p.id) ?? 0,
        claimsOpen: open.get(p.id) ?? 0,
        received: received.get(p.id) ?? 0,
        payrollPaid: payPaid.get(p.id) ?? 0,
      })));
      setMonths(Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const rows = useMemo(
    () => (projectFilter === "all" ? projects : projects.filter((p) => p.id === projectFilter)),
    [projects, projectFilter],
  );

  const t = useMemo(() => rows.reduce((a, r) => ({
    budget: a.budget + r.budget,
    certified: a.certified + r.certified,
    claimsApproved: a.claimsApproved + r.claimsApproved,
    claimsOpen: a.claimsOpen + r.claimsOpen,
    received: a.received + r.received,
    payrollPaid: a.payrollPaid + r.payrollPaid,
  }), { budget: 0, certified: 0, claimsApproved: 0, claimsOpen: 0, received: 0, payrollPaid: 0 }), [rows]);

  const consumed = t.certified + t.claimsApproved;
  const consumedPct = t.budget > 0 ? Math.min(100, Math.round((consumed / t.budget) * 100)) : 0;
  const collection = t.claimsApproved > 0 ? Math.round((t.received / t.claimsApproved) * 100) : 0;

  const exportCsv = () => {
    downloadCsv(rowsCsv(rows.map((r) => ({
      [isArabic ? "المشروع" : "Project"]: r.name,
      [isArabic ? "الميزانية" : "Budget"]: r.budget,
      [isArabic ? "المستخلصات" : "Certified"]: r.certified,
      [isArabic ? "مطالبات معتمدة" : "Approved claims"]: r.claimsApproved,
      [isArabic ? "مطالبات مفتوحة" : "Open claims"]: r.claimsOpen,
      [isArabic ? "المُحصّل" : "Received"]: r.received,
      [isArabic ? "المرتبات المدفوعة" : "Payroll paid"]: r.payrollPaid,
      [isArabic ? "المتبقي" : "Remaining"]: r.budget - (r.certified + r.claimsApproved),
    }))), `financial-overview-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={Gauge}
        title={isArabic ? "لوحة المؤشرات التنفيذية المالية" : "Executive financial dashboard"}
        subtitle={isArabic
          ? "الميزانية والمستخلصات والمطالبات والتحصيل والمرتبات في شاشة واحدة"
          : "Budget, certificates, claims, collection and payroll in one view"}
        actions={<>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? "كل المشاريع" : "All projects"}</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard label={isArabic ? "الميزانية" : "Budget"} value={fmtMoney(t.budget)} tone="primary" />
        <KpiCard label={isArabic ? "المستخلصات" : "Certified"} value={fmtMoney(t.certified)} />
        <KpiCard label={isArabic ? "مطالبات معتمدة" : "Approved claims"} value={fmtMoney(t.claimsApproved)} />
        <KpiCard label={isArabic ? "مطالبات مفتوحة" : "Open claims"} value={fmtMoney(t.claimsOpen)} tone="warning" />
        <KpiCard label={isArabic ? "المُحصّل" : "Collected"} value={fmtMoney(t.received)} tone="success"
          hint={`${collection}%`} />
        <KpiCard label={isArabic ? "المرتبات المدفوعة" : "Payroll paid"} value={fmtMoney(t.payrollPaid)} />
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isArabic ? "استهلاك الميزانية" : "Budget consumption"} — {consumedPct}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={consumedPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {isArabic
              ? `المستهلك ${fmtMoney(consumed)} من ${fmtMoney(t.budget)} — المتبقي ${fmtMoney(t.budget - consumed)}`
              : `Consumed ${fmtMoney(consumed)} of ${fmtMoney(t.budget)} — remaining ${fmtMoney(t.budget - consumed)}`}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isArabic ? "الاتجاه الشهري" : "Monthly trend"}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {months.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {isArabic ? "لا توجد بيانات" : "No data"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="certified" name={isArabic ? "المستخلصات" : "Certified"} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="claims" name={isArabic ? "المطالبات" : "Claims"} fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payroll" name={isArabic ? "المرتبات" : "Payroll"} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isArabic ? "حسب المشروع" : "By project"} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "الميزانية" : "Budget"}</TableHead>
                  <TableHead>{isArabic ? "المستخلصات" : "Certified"}</TableHead>
                  <TableHead>{isArabic ? "مطالبات معتمدة" : "Approved"}</TableHead>
                  <TableHead>{isArabic ? "مفتوحة" : "Open"}</TableHead>
                  <TableHead>{isArabic ? "المُحصّل" : "Collected"}</TableHead>
                  <TableHead>{isArabic ? "المرتبات" : "Payroll"}</TableHead>
                  <TableHead>{isArabic ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead />
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
                    {isArabic ? "لا توجد مشاريع" : "No projects"}
                  </TableCell></TableRow>
                )}
                {!loading && rows.map((r) => {
                  const remaining = r.budget - (r.certified + r.claimsApproved);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.budget)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.certified)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.claimsApproved)}</TableCell>
                      <TableCell className="tabular-nums text-warning">{fmtMoney(r.claimsOpen)}</TableCell>
                      <TableCell className="tabular-nums text-success">{fmtMoney(r.received)}</TableCell>
                      <TableCell className="tabular-nums">{fmtMoney(r.payrollPaid)}</TableCell>
                      <TableCell className={`tabular-nums ${remaining < 0 ? "text-destructive" : ""}`}>{fmtMoney(remaining)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/claims?project=${r.id}`}><ExternalLink className="h-4 w-4" /></Link>
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
