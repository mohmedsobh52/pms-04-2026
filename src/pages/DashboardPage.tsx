import { MainDashboard } from "@/components/MainDashboard";
import { MainDashboardOverview } from "@/components/MainDashboardOverview";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { ColorLegend } from "@/components/ui/color-code";

const DashboardPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { setAnalysisData, setWbsData } = useAnalysisData();

  if (!user) {
    return (
      <PageLayout>
        <MainDashboardOverview />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <ColorLegend type="status" isArabic={isArabic} className="mb-4" />
      <MainDashboard
        onLoadProject={(loadedAnalysis, loadedWbs, projectId) => {
          setAnalysisData(loadedAnalysis);
          setWbsData(loadedWbs);
        }}
      />
    </PageLayout>
  );
};

export default DashboardPage;
