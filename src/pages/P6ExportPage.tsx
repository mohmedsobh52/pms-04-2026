import { P6Export } from "@/components/P6Export";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";

const P6ExportPage = () => {
  const { analysisData } = useAnalysisData();

  return (
    <PageLayout>
      <P6Export 
        items={analysisData?.items || []} 
        currency={analysisData?.summary?.currency || "SAR"} 
      />
    </PageLayout>
  );
};

export default P6ExportPage;
