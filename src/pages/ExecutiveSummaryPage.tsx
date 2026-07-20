import { useEffect, useMemo, useState } from "react";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Briefcase,
  FileSignature,
  ShieldAlert,
  Wallet,
  TrendingUp,
  Printer,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(Math.round(n));

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

export default function ExecutiveSummaryPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [projects, contracts, quotations, risks, certs] = await Promise.all([
        supabase.from("project_data").select("id,name,total_value,created_at").eq("user_id", user.id),
        supabase.from("contracts").select("id,contract_value,status,end_date").eq("user_id", user.id),
        supabase.from("price_quotations").select("id,total_amount,status,created_at").eq("user_id", user.id),
        supabase.from("risks").select("id,severity,status").eq("user_id", user.id),
        supabase.from("progress_certificates").select("id,net_amount,status,created_at").eq("user_id", user.id),
      ]);
      if (cancelled) return;

      const projectsList = projects.data ?? [];
      const contractsList = contracts.data ?? [];
      const certsList = certs.data ?? [];

      const totalProjectsValue = projectsList.reduce((s, p: any) => s + Number(p.total_value ?? 0), 0);
      const totalContractsValue = contractsList.reduce((s, c: any) => s + Number(c.contract_value ?? 0), 0);
      const totalCertified = certsList.reduce((s, c: any) => s + Number(c.net_amount ?? 0), 0);
      const openRisks = (risks.data ?? []).filter((r: any) => r.status !== "closed").length;

      const months: Record<string, { name: string; projects: number; certs: number }> = {};
      const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months[monthKey(d)] = { name: d.toLocaleDateString(isArabic ? "ar" : "en", { month: "short" }), projects: 0, certs: 0 };
      }
      projectsList.forEach((p: any) => {
        const k = monthKey(new Date(p.created_at));
        if (months[k]) months[k].projects++;
      });
      certsList.forEach((c: any) => {
        const k = monthKey(new Date(c.created_at));
        if (months[k]) months[k].certs++;
      });

      const contractStatus: Record<string, number> = {};
      contractsList.forEach((c: any) => {
        const k = c.status || "draft";
        contractStatus[k] = (contractStatus[k] || 0) + 1;
      });

      setData({
        totalProjectsValue,
        totalContractsValue,
        totalCertified,
        openRisks,
        projectsCount: projectsList.length,
        contractsCount: contractsList.length,
        spendRatio: totalContractsValue > 0 ? (totalCertified / totalContractsValue) * 100 : 0,
        timeline: Object.values(months),
        contractStatus: Object.entries(contractStatus).map(([name, value]) => ({ name, value })),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, isArabic]);

  const handlePrint = () => window.print();

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold font-display">{isArabic ? "الملخص التنفيذي" : "Executive Summary"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isArabic ? "نظرة شاملة على أداء جميع المشاريع" : "A complete overview of all projects performance"}
          </p>
        </div>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          {isArabic ? "طباعة / PDF" : "Print / PDF"}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !data || data.projectsCount === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={isArabic ? "لا توجد بيانات بعد" : "No data yet"}
          description={isArabic ? "أنشئ مشروعك الأول لرؤية الملخص التنفيذي" : "Create your first project to see the executive summary"}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              tone="emerald"
              icon={Briefcase}
              label={isArabic ? "إجمالي قيمة المشاريع" : "Total Projects Value"}
              value={fmt(data.totalProjectsValue)}
              hint={`${data.projectsCount} ${isArabic ? "مشروع" : "projects"}`}
            />
            <StatCard
              tone="gold"
              icon={FileSignature}
              label={isArabic ? "إجمالي قيمة العقود" : "Total Contracts Value"}
              value={fmt(data.totalContractsValue)}
              hint={`${data.contractsCount} ${isArabic ? "عقد" : "contracts"}`}
            />
            <StatCard
              tone="violet"
              icon={Wallet}
              label={isArabic ? "إجمالي المعتمد" : "Certified to date"}
              value={fmt(data.totalCertified)}
              trend={{ value: data.spendRatio, positiveIsGood: true }}
              hint={`${data.spendRatio.toFixed(1)}% ${isArabic ? "من العقود" : "of contracts"}`}
            />
            <StatCard
              tone="rose"
              icon={ShieldAlert}
              label={isArabic ? "مخاطر مفتوحة" : "Open Risks"}
              value={data.openRisks}
              hint={isArabic ? "تحتاج متابعة" : "requires attention"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {isArabic ? "اتجاه المشاريع والمستخلصات" : "Projects & Certificates Trend"}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline}>
                    <defs>
                      <linearGradient id="grProj" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grCert" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Area type="monotone" dataKey="projects" stroke="hsl(var(--primary))" fill="url(#grProj)" name={isArabic ? "مشاريع" : "Projects"} />
                    <Area type="monotone" dataKey="certs" stroke="hsl(var(--accent))" fill="url(#grCert)" name={isArabic ? "مستخلصات" : "Certificates"} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold mb-4">{isArabic ? "العقود حسب الحالة" : "Contracts by Status"}</h3>
              <div className="h-64">
                {data.contractStatus.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {isArabic ? "لا توجد عقود" : "No contracts"}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.contractStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                        {data.contractStatus.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
