import { BOQVersionComparison } from "@/components/BOQVersionComparison";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { AppShell as PageLayout } from "@/components/layout/AppShell";

const CompareVersionsPage = () => {
  const { analysisData } = useAnalysisData();

  return (
    <PageLayout>
      <BOQVersionComparison 
        currentItems={analysisData?.items || []}
        currentTotalValue={analysisData?.summary?.total_value}
      />
    </PageLayout>
  );
};

export default CompareVersionsPage;
