import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { ColorLegend } from "@/components/ui/color-code";
import { Loader2 } from "lucide-react";

const MainDashboard = lazy(() =>
  import("@/components/MainDashboard").then((m) => ({ default: m.MainDashboard }))
);
const MainDashboardOverview = lazy(() =>
  import("@/components/MainDashboardOverview").then((m) => ({ default: m.MainDashboardOverview }))
);

const Fallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

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
