import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw, BarChart3, Gavel, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import {
  FinanceClaim, loadClaimsFinance, byProject, byContractor, byMonth, byYear,
  totals, bucketsCsv, fmtMoney,
} from "@/lib/claims-finance";
import { KpiCard, BucketsTable } from "@/components/claims/FinanceUI";

export default function ClaimsFinancialReportsPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [claims, setClaims] = useState<FinanceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("all");

  const load = async () => {
    if (!user) { setClaims([]); setLoading(false); return; }
    setLoading(true);
    try {
      setClaims(await loadClaimsFinance());
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const years = useMemo(() => {
    const s = new Set<string>();
    byYear(claims).forEach((b) => s.add(b.key));
    return Array.from(s).sort().reverse();
  }, [claims]);

  const filtered = useMemo(
    () => (year === "all" ? claims : claims.filter((c) => {
      const d = c.resolved_date || c.submitted_date || c.created_at || "";
      return d.startsWith(year);
    })),
    [claims, year],
  );

  const t = useMemo(() => totals(filtered), [filtered]);
  const projects = useMemo(() => byProject(filtered).sort((a, b) => b.claimed - a.claimed), [filtered]);
  const contractors = useMemo(() => byContractor(filtered).sort((a, b) => b.claimed - a.claimed), [filtered]);
  const months = useMemo(() => byMonth(filtered), [filtered]);
  const yearsAgg = useMemo(() => byYear(claims), [claims]);

  const exportCsv = (rows: any[], head: string, name: string) => {
    downloadCsv(bucketsCsv(rows, head, isArabic), `${name}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {isArabic ? "التقارير المالية للمطالبات" : "Claims Financial Reports"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isArabic ? "توزيع المطالبات حسب المشروع والمقاول مع تقارير سنوية وشهرية" : "Distribution by project and contractor, with annual and monthly reports"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل السنوات" : "All years"}</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/claims"><Gavel className="h-4 w-4 me-1" />{isArabic ? "المطالبات" : "Claims"}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KpiCard label={isArabic ? "إجمالي المطالب به" : "Total claimed"} value={fmtMoney(t.claimed)} icon={DollarSign} tone="primary" />
        <KpiCard label={isArabic ? "المعتمد" : "Approved"} value={fmtMoney(t.approved)} icon={TrendingUp} />
        <KpiCard label={isArabic ? "المُستلم" : "Received"} value={fmtMoney(t.received)} tone="success" />
        <KpiCard label={isArabic ? "المتأخر" : "Overdue"} value={fmtMoney(t.overdue)} tone="destructive" icon={AlertTriangle} hint={`${t.overdueCount}`} />
        <KpiCard label={isArabic ? "نسبة التحصيل" : "Collection rate"} value={`${t.collectionRate.toFixed(1)}%`} tone="success" />
      </div>

      <Tabs defaultValue="project">
        <TabsList>
          <TabsTrigger value="project">{isArabic ? "حسب المشروع" : "By project"}</TabsTrigger>
          <TabsTrigger value="contractor">{isArabic ? "حسب المقاول" : "By contractor"}</TabsTrigger>
          <TabsTrigger value="monthly">{isArabic ? "شهري" : "Monthly"}</TabsTrigger>
          <TabsTrigger value="annual">{isArabic ? "سنوي" : "Annual"}</TabsTrigger>
        </TabsList>

        {[
          { v: "project", rows: projects, head: isArabic ? "المشروع" : "Project", file: "claims-by-project" },
          { v: "contractor", rows: contractors, head: isArabic ? "المقاول" : "Contractor", file: "claims-by-contractor" },
          { v: "monthly", rows: months, head: isArabic ? "الشهر" : "Month", file: "claims-monthly" },
          { v: "annual", rows: yearsAgg, head: isArabic ? "السنة" : "Year", file: "claims-annual" },
        ].map((s) => (
          <TabsContent key={s.v} value={s.v}>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{s.head}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportCsv(s.rows, s.head, s.file)}>
                  <Download className="h-4 w-4 me-1" />CSV
                </Button>
              </CardHeader>
              <CardContent>
                <BucketsTable buckets={s.rows} firstHeader={s.head} isArabic={isArabic} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}
