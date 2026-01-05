import { BOQVersionComparison } from "@/components/BOQVersionComparison";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";

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
