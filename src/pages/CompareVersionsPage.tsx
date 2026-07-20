import { useEffect } from "react";
import { BOQVersionComparison } from "@/components/BOQVersionComparison";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildCompareVersionsSuggestions } from "@/lib/suggestion-generators";

const CompareVersionsPage = () => {
  const { analysisData } = useAnalysisData();
  const { replaceBySource } = useGlobalSuggestions();

  useEffect(() => {
    const items = analysisData?.items || [];
    replaceBySource(
      "compare-versions",
      buildCompareVersionsSuggestions({
        hasCurrentItems: items.length > 0,
        itemsCount: items.length,
      })
    );
  }, [analysisData, replaceBySource]);

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

