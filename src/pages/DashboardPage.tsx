import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { ColorLegend } from "@/components/ui/color-code";
import { SuspenseFallback } from "@/components/ui/loading-states";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import {
  buildDashboardSuggestions,
  buildFinancialHealthSuggestions,
  buildDocumentExpirySuggestions,
  buildScheduleHealthSuggestions,
} from "@/lib/suggestion-generators";

const MainDashboard = lazy(() =>
  import("@/components/MainDashboard").then((m) => ({ default: m.MainDashboard }))
);
const MainDashboardOverview = lazy(() =>
  import("@/components/MainDashboardOverview").then((m) => ({ default: m.MainDashboardOverview }))
);
const ActionCenter = lazy(() =>
  import("@/components/dashboard/ActionCenter").then((m) => ({ default: m.ActionCenter }))
);
const ProjectHealthScore = lazy(() =>
  import("@/components/dashboard/ProjectHealthScore").then((m) => ({ default: m.ProjectHealthScore }))
);
const CashOutflowForecast = lazy(() =>
  import("@/components/dashboard/CashOutflowForecast").then((m) => ({ default: m.CashOutflowForecast }))
);
const RecentActivityFeed = lazy(() =>
  import("@/components/dashboard/RecentActivityFeed").then((m) => ({ default: m.RecentActivityFeed }))
);
const TopRisksPanel = lazy(() =>
  import("@/components/dashboard/TopRisksPanel").then((m) => ({ default: m.TopRisksPanel }))
);
const ProcurementPipeline = lazy(() =>
  import("@/components/dashboard/ProcurementPipeline").then((m) => ({ default: m.ProcurementPipeline }))
);
const ContractsExpiryPanel = lazy(() =>
  import("@/components/dashboard/ContractsExpiryPanel").then((m) => ({ default: m.ContractsExpiryPanel }))
);
const WarrantiesTracker = lazy(() =>
  import("@/components/dashboard/WarrantiesTracker").then((m) => ({ default: m.WarrantiesTracker }))
);
const PricingAccuracyWidget = lazy(() =>
  import("@/components/dashboard/PricingAccuracyWidget").then((m) => ({ default: m.PricingAccuracyWidget }))
);
const OverduePaymentsPanel = lazy(() =>
  import("@/components/dashboard/OverduePaymentsPanel").then((m) => ({ default: m.OverduePaymentsPanel }))
);
const RiskHeatmapWidget = lazy(() =>
  import("@/components/dashboard/RiskHeatmapWidget").then((m) => ({ default: m.RiskHeatmapWidget }))
);
const QuotationsStatusWidget = lazy(() =>
  import("@/components/dashboard/QuotationsStatusWidget").then((m) => ({ default: m.QuotationsStatusWidget }))
);
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage"));


const Fallback = () => <SuspenseFallback size="lg" />;

const DashboardPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { setAnalysisData, setWbsData } = useAnalysisData();
  const { replaceBySource } = useGlobalSuggestions();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const in30 = iso(new Date(today.getTime() + 30 * 864e5));
      const in14 = iso(new Date(today.getTime() + 14 * 864e5));
      const nowIso = iso(today);

      const [projectsRes, contractsRes, paymentsRes, variationsRes, certsRes, docsRes, warrantiesRes, milestonesRes] =
        await Promise.all([
          supabase.from("saved_projects").select("id,status").eq("user_id", user.id).limit(1000),
          supabase.from("contracts").select("id,project_id,contract_value").eq("user_id", user.id).limit(1000),
          supabase.from("contract_payments").select("id,amount,due_date,status").eq("user_id", user.id).limit(2000),
          supabase.from("contract_variations").select("id,status").eq("user_id", user.id).limit(1000),
          supabase.from("progress_certificates").select("id,status").eq("user_id", user.id).limit(1000),
          supabase
            .from("project_attachments")
            .select("id,category,expiry_date,is_latest")
            .eq("user_id", user.id)
            .limit(2000),
          supabase.from("contract_warranties").select("id,end_date,status").eq("user_id", user.id).limit(1000),
          supabase.from("contract_milestones").select("id,due_date,status,contract_id").eq("user_id", user.id).limit(2000),
        ]);

      const rows = (projectsRes.data as any[]) || [];
      const contracts = (contractsRes.data as any[]) || [];
      const payments = (paymentsRes.data as any[]) || [];
      const variations = (variationsRes.data as any[]) || [];
      const certs = (certsRes.data as any[]) || [];
      const docs = ((docsRes.data as any[]) || []).filter((d) => d.is_latest !== false);
      const warranties = (warrantiesRes.data as any[]) || [];
      const milestones = (milestonesRes.data as any[]) || [];

      const isPaid = (s: any) => ["paid", "مدفوع", "completed"].includes(String(s || "").toLowerCase());
      const isDone = (s: any) => ["completed", "done", "مكتمل", "منجز"].includes(String(s || "").toLowerCase());

      const active = rows.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s && s !== "completed" && s !== "archived" && s !== "مكتمل" && s !== "مؤرشف";
      }).length;

      replaceBySource("dashboard", buildDashboardSuggestions({
        projects: rows.length,
        activeProjects: active,
      }));

      replaceBySource("financial-health", buildFinancialHealthSuggestions({
        contracts: contracts.length,
        contractValue: contracts.reduce((s, c) => s + (Number(c.contract_value) || 0), 0),
        paidValue: payments.filter((p) => isPaid(p.status)).reduce((s, p) => s + (Number(p.amount) || 0), 0),
        overduePayments: payments.filter((p) => !isPaid(p.status) && p.due_date && p.due_date < nowIso).length,
        openVariations: variations.filter((v) => !["approved", "معتمد", "rejected"].includes(String(v.status || "").toLowerCase())).length,
        certificatesPendingApproval: certs.filter((c) => ["pending", "submitted", "قيد المراجعة", "draft"].includes(String(c.status || "").toLowerCase())).length,
      }));

      replaceBySource("documents", buildDocumentExpirySuggestions({
        expired: docs.filter((d) => d.expiry_date && d.expiry_date < nowIso).length,
        expiringIn30d: docs.filter((d) => d.expiry_date && d.expiry_date >= nowIso && d.expiry_date <= in30).length,
        documentsWithoutCategory: docs.filter((d) => !d.category).length,
        warrantiesExpiring: warranties.filter(
          (w) => w.end_date && w.end_date >= nowIso && w.end_date <= in30 && String(w.status || "").toLowerCase() !== "released",
        ).length,
      }));

      const contractsWithMilestones = new Set(milestones.map((m) => m.contract_id));
      replaceBySource("schedule", buildScheduleHealthSuggestions({
        overdueMilestones: milestones.filter((m) => !isDone(m.status) && m.due_date && m.due_date < nowIso).length,
        milestonesDueSoon: milestones.filter(
          (m) => !isDone(m.status) && m.due_date && m.due_date >= nowIso && m.due_date <= in14,
        ).length,
        projectsWithoutMilestones: contracts.filter((c) => !contractsWithMilestones.has(c.id)).length,
      }));
    })();
  }, [user, replaceBySource]);

  if (!user) {
    return (
      <PageLayout>
        <Suspense fallback={<Fallback />}>
          <MainDashboardOverview />
        </Suspense>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Suspense fallback={<Fallback />}>
        <AdminDashboardPage />
      </Suspense>
      <ColorLegend type="status" isArabic={isArabic} className="mb-4 mt-6" />

      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={null}>
          <ProjectHealthScore />
        </Suspense>
        <Suspense fallback={null}>
          <ActionCenter />
        </Suspense>
      </div>
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Suspense fallback={null}>
            <CashOutflowForecast />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <RecentActivityFeed />
        </Suspense>
      </div>
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={null}>
          <TopRisksPanel />
        </Suspense>
        <Suspense fallback={null}>
          <ProcurementPipeline />
        </Suspense>
      </div>
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={null}>
          <ContractsExpiryPanel />
        </Suspense>
        <Suspense fallback={null}>
          <WarrantiesTracker />
        </Suspense>
      </div>
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={null}>
          <OverduePaymentsPanel />
        </Suspense>
        <Suspense fallback={null}>
          <PricingAccuracyWidget />
        </Suspense>
      </div>
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={null}>
          <RiskHeatmapWidget />
        </Suspense>
        <Suspense fallback={null}>
          <QuotationsStatusWidget />
        </Suspense>
      </div>
      <Suspense fallback={<Fallback />}>
        <MainDashboard
          onLoadProject={(loadedAnalysis, loadedWbs) => {
            setAnalysisData(loadedAnalysis);
            setWbsData(loadedWbs);
          }}
        />
      </Suspense>
    </PageLayout>
  );
};

export default DashboardPage;
