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
import { Download, RefreshCw, Wallet, Search, ExternalLink, PiggyBank } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { rowsCsv, fmtMoney } from "@/lib/claims-finance";
import { KpiCard } from "@/components/claims/FinanceUI";

type BudgetRow = {
  projectId: string;
  name: string;
  budget: number;
  certified: number;
  paid: number;
  claimsExposure: number;
  itemsCount: number;
};

type Health = "all" | "over" | "at_risk" | "healthy" | "no_budget";

const healthOf = (r: BudgetRow): Health => {
  if (r.budget <= 0) return "no_budget";
  const forecast = r.certified + r.claimsExposure;
  if (forecast > r.budget) return "over";
  if (forecast > r.budget * 0.9) return "at_risk";
  return "healthy";
};

export default function BudgetingPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<Health>("all");

  const load = async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [projRes, itemsRes, certRes, claimRes] = await Promise.all([
        supabase.from("saved_projects").select("id,name").order("updated_at", { ascending: false }),
        supabase.from("project_items").select("project_id,total_price,quantity,unit_price,is_section"),
        supabase.from("progress_certificates").select("project_id,total_work_done,net_amount,status"),
        supabase.from("claims").select("project_id,claimed_amount,approved_amount,status"),
      ]);
      const err = projRes.error || itemsRes.error || certRes.error || claimRes.error;
      if (err) throw err;

      const budget = new Map<string, { sum: number; count: number }>();
      (itemsRes.data ?? []).forEach((it: any) => {
        if (it.is_section) return;
        const v = Number(it.total_price ?? (Number(it.quantity || 0) * Number(it.unit_price || 0))) || 0;
        const cur = budget.get(it.project_id) ?? { sum: 0, count: 0 };
        budget.set(it.project_id, { sum: cur.sum + v, count: cur.count + 1 });
      });

      const certified = new Map<string, number>();
      const paid = new Map<string, number>();
      (certRes.data ?? []).forEach((c: any) => {
        if (!c.project_id) return;
        certified.set(c.project_id, Math.max(certified.get(c.project_id) ?? 0, Number(c.total_work_done || 0)));
        if (["approved", "paid", "issued"].includes(String(c.status ?? "").toLowerCase())) {
          paid.set(c.project_id, (paid.get(c.project_id) ?? 0) + Number(c.net_amount || 0));
        }
      });

      const exposure = new Map<string, number>();
      (claimRes.data ?? []).forEach((c: any) => {
        if (!c.project_id) return;
        const closed = ["closed", "rejected"].includes(String(c.status ?? "").toLowerCase());
        if (closed) return;
        const amt = Number(c.approved_amount || c.claimed_amount || 0);
        exposure.set(c.project_id, (exposure.get(c.project_id) ?? 0) + amt);
      });

      setRows((projRes.data ?? []).map((p: any) => ({
        projectId: p.id,
        name: p.name,
        budget: budget.get(p.id)?.sum ?? 0,
        itemsCount: budget.get(p.id)?.count ?? 0,
        certified: certified.get(p.id) ?? 0,
        paid: paid.get(p.id) ?? 0,
        claimsExposure: exposure.get(p.id) ?? 0,
      })));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (health !== "all" && healthOf(r) !== health) return false;
      return !q || r.name.toLowerCase().includes(q);
    });
  }, [rows, search, health]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    budget: a.budget + r.budget,
    certified: a.certified + r.certified,
    paid: a.paid + r.paid,
    exposure: a.exposure + r.claimsExposure,
  }), { budget: 0, certified: 0, paid: 0, exposure: 0 }), [filtered]);

  const remaining = totals.budget - totals.certified;
  const forecastVariance = totals.budget - (totals.certified + totals.exposure);

  const exportCsv = () => {
    const data = filtered.map((r) => ({
      [isArabic ? "المشروع" : "Project"]: r.name,
      [isArabic ? "عدد البنود" : "Items"]: r.itemsCount,
      [isArabic ? "الميزانية" : "Budget"]: r.budget,
      [isArabic ? "المعتمد/المنفذ" : "Certified"]: r.certified,
      [isArabic ? "المدفوع" : "Paid"]: r.paid,
      [isArabic ? "التزامات المطالبات" : "Claims exposure"]: r.claimsExposure,
      [isArabic ? "المتبقي" : "Remaining"]: r.budget - r.certified,
      [isArabic ? "الانحراف المتوقع" : "Forecast variance"]: r.budget - (r.certified + r.claimsExposure),
      [isArabic ? "نسبة الاستهلاك %" : "Burn %"]: r.budget > 0 ? Math.round((r.certified / r.budget) * 100) : 0,
    }));
    downloadCsv(rowsCsv(data), `budgeting-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  const healthBadge = (r: BudgetRow) => {
    const h = healthOf(r);
    const map: Record<Health, { label: string; cls: string }> = {
      all: { label: "", cls: "" },
      over: { label: isArabic ? "تجاوز" : "Over", cls: "bg-destructive/15 text-destructive" },
      at_risk: { label: isArabic ? "قرب الحد" : "At risk", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
      healthy: { label: isArabic ? "سليم" : "Healthy", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
      no_budget: { label: isArabic ? "بلا ميزانية" : "No budget", cls: "bg-muted text-muted-foreground" },
    };
    return <Badge variant="outline" className={map[h].cls}>{map[h].label}</Badge>;
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><PiggyBank className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-bold">{isArabic ? "إدارة الميزانية" : "Budgeting"}</h1>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "الميزانية مقابل المنفذ والمدفوع والتزامات المطالبات لكل مشروع" : "Budget vs certified, paid and claim commitments per project"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard label={isArabic ? "إجمالي الميزانية" : "Total budget"} value={fmtMoney(totals.budget)} tone="primary" />
        <KpiCard label={isArabic ? "المنفذ المعتمد" : "Certified"} value={fmtMoney(totals.certified)} />
        <KpiCard label={isArabic ? "المدفوع" : "Paid"} value={fmtMoney(totals.paid)} tone="success" />
        <KpiCard label={isArabic ? "المتبقي" : "Remaining"} value={fmtMoney(remaining)} tone={remaining < 0 ? "destructive" : "warning"} />
        <KpiCard
          label={isArabic ? "الانحراف المتوقع" : "Forecast variance"}
          value={fmtMoney(forecastVariance)}
          tone={forecastVariance < 0 ? "destructive" : "success"}
          hint={isArabic ? "بعد التزامات المطالبات" : "after claim commitments"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            {isArabic ? "ميزانيات المشاريع" : "Project budgets"} ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-56" placeholder={isArabic ? "بحث عن مشروع..." : "Search project..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={health} onValueChange={(v) => setHealth(v as Health)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All"}</SelectItem>
                <SelectItem value="over">{isArabic ? "تجاوز الميزانية" : "Over budget"}</SelectItem>
                <SelectItem value="at_risk">{isArabic ? "قرب الحد" : "At risk"}</SelectItem>
                <SelectItem value="healthy">{isArabic ? "سليم" : "Healthy"}</SelectItem>
                <SelectItem value="no_budget">{isArabic ? "بلا ميزانية" : "No budget"}</SelectItem>
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
                  <TableHead>{isArabic ? "الميزانية" : "Budget"}</TableHead>
                  <TableHead>{isArabic ? "المنفذ" : "Certified"}</TableHead>
                  <TableHead>{isArabic ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{isArabic ? "التزامات مطالبات" : "Claims"}</TableHead>
                  <TableHead>{isArabic ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead className="w-40">{isArabic ? "الاستهلاك" : "Burn"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {isArabic ? "لا توجد بيانات" : "No data"}
                  </TableCell></TableRow>
                )}
                {!loading && filtered.map((r) => {
                  const rem = r.budget - r.certified;
                  const pct = r.budget > 0 ? Math.min(100, Math.round((r.certified / r.budget) * 100)) : 0;
                  return (
                    <TableRow key={r.projectId}>
                      <TableCell className="font-medium max-w-[240px] truncate">{r.name}</TableCell>
                      <TableCell>{fmtMoney(r.budget)}</TableCell>
                      <TableCell>{fmtMoney(r.certified)}</TableCell>
                      <TableCell>{fmtMoney(r.paid)}</TableCell>
                      <TableCell>{fmtMoney(r.claimsExposure)}</TableCell>
                      <TableCell className={rem < 0 ? "text-destructive font-semibold" : ""}>{fmtMoney(rem)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs text-muted-foreground w-9 text-end">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{healthBadge(r)}</TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/projects/${r.projectId}/cost-control`}>
                            <ExternalLink className="h-4 w-4 me-1" />{isArabic ? "متابعة التكلفة" : "Cost control"}
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/claims?project=${r.projectId}`}>
                            <Wallet className="h-4 w-4 me-1" />{isArabic ? "المطالبات" : "Claims"}
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
