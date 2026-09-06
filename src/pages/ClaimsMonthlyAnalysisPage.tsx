import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CalendarRange, Download, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import {
  FinanceClaim, loadClaimsFinance, byMonth, byProject, byContractor,
  claimPeriodDate, monthKey, totals, bucketsCsv, fmtMoney,
} from "@/lib/claims-finance";
import { KpiCard, BucketsTable } from "@/components/claims/FinanceUI";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";

export default function ClaimsMonthlyAnalysisPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [claims, setClaims] = useState<FinanceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("all");

  const load = async () => {
    if (!user) { setClaims([]); setLoading(false); return; }
    setLoading(true);
    try { setClaims(await loadClaimsFinance()); }
    catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const monthsAgg = useMemo(() => byMonth(claims), [claims]);
  const monthOptions = useMemo(() => monthsAgg.map((m) => m.key).reverse(), [monthsAgg]);

  const scoped = useMemo(
    () => (month === "all" ? claims : claims.filter((c) => {
      const d = claimPeriodDate(c);
      return d ? monthKey(d) === month : false;
    })),
    [claims, month],
  );

  const t = useMemo(() => totals(scoped), [scoped]);
  const projects = useMemo(() => byProject(scoped).sort((a, b) => b.due - a.due), [scoped]);
  const contractors = useMemo(() => byContractor(scoped).sort((a, b) => b.due - a.due), [scoped]);

  const exportCsv = (rows: any[], head: string, name: string) => {
    downloadCsv(bucketsCsv(rows, head, isArabic), `${name}-${month}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <ClaimsPageHeader
        icon={CalendarRange}
        title={{isArabic ? "التحليل المالي الشهري للمطالبات" : "Claims Monthly Financial Analysis"}}
        subtitle={{isArabic ? "المُستلم، المستحق، المتأخر ونسبة التحصيل حسب المشروع والمقاول" : "Received, due, overdue and collection rate by project and contractor"}}
        actions={<>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل الشهور" : "All months"}</SelectItem>
              {monthOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </>}
      />
      <div className="mb-4" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label={isArabic ? "المُستلم" : "Received"} value={fmtMoney(t.received)} tone="success" />
        <KpiCard label={isArabic ? "المستحق" : "Due"} value={fmtMoney(t.due)} tone="warning" />
        <KpiCard label={isArabic ? "المتأخر" : "Overdue"} value={fmtMoney(t.overdue)} tone="destructive" hint={`${t.overdueCount}`} />
        <KpiCard label={isArabic ? "نسبة التحصيل" : "Collection rate"} value={`${t.collectionRate.toFixed(1)}%`} tone="primary" />
      </div>

      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{isArabic ? "الاتجاه الشهري" : "Monthly trend"}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => exportCsv(monthsAgg, isArabic ? "الشهر" : "Month", "claims-monthly-trend")}>
            <Download className="h-4 w-4 me-1" />CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "الشهر" : "Month"}</TableHead>
                  <TableHead>{isArabic ? "المُستلم" : "Received"}</TableHead>
                  <TableHead>{isArabic ? "المستحق" : "Due"}</TableHead>
                  <TableHead>{isArabic ? "المتأخر" : "Overdue"}</TableHead>
                  <TableHead className="w-56">{isArabic ? "نسبة التحصيل" : "Collection"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthsAgg.map((m) => (
                  <TableRow key={m.key} className={m.key === month ? "bg-accent/30" : undefined}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="tabular-nums text-success">{fmtMoney(m.received)}</TableCell>
                    <TableCell className="tabular-nums text-warning">{fmtMoney(m.due)}</TableCell>
                    <TableCell className="tabular-nums text-destructive">{fmtMoney(m.overdue)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(100, m.collectionRate)} className="h-2" />
                        <span className="text-xs tabular-nums w-12">{m.collectionRate.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {monthsAgg.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد بيانات" : "No data"}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="project">
        <TabsList>
          <TabsTrigger value="project">{isArabic ? "حسب المشروع" : "By project"}</TabsTrigger>
          <TabsTrigger value="contractor">{isArabic ? "حسب المقاول" : "By contractor"}</TabsTrigger>
        </TabsList>
        {[
          { v: "project", rows: projects, head: isArabic ? "المشروع" : "Project", file: "claims-month-by-project" },
          { v: "contractor", rows: contractors, head: isArabic ? "المقاول" : "Contractor", file: "claims-month-by-contractor" },
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
