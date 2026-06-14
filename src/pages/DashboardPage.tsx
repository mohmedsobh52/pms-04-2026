import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { ColorLegend } from "@/components/ui/color-code";
import { SuspenseFallback } from "@/components/ui/loading-states";

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

const Fallback = () => <SuspenseFallback size="lg" />;

const DashboardPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { setAnalysisData, setWbsData } = useAnalysisData();

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
      <ColorLegend type="status" isArabic={isArabic} className="mb-4" />
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
