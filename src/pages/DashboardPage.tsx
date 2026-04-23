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
