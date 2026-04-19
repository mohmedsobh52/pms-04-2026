import { P6Export } from "@/components/P6Export";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { ColorLegend } from "@/components/ui/color-code";
import { useLanguage } from "@/hooks/useLanguage";

const P6ExportPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <ColorLegend type="category" isArabic={isArabic} className="mb-4" />
      <P6Export
        items={analysisData?.items || []}
        currency={analysisData?.summary?.currency || "SAR"}
      />
    </PageLayout>
  );
};

export default P6ExportPage;
