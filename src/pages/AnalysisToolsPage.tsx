import { BOQComparison } from "@/components/BOQComparison";
import { MarketRateSuggestions } from "@/components/MarketRateSuggestions";
import { CostAnalysis } from "@/components/CostAnalysis";
import { AIVsLocalPriceComparison } from "@/components/AIVsLocalPriceComparison";
import { SmartCostEnginePanel } from "@/components/cost-engine/SmartCostEnginePanel";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { ColorLegend } from "@/components/ui/color-code";
import { Database, DollarSign, FileStack, TrendingUp } from "lucide-react";

const AnalysisToolsPage = () => {
  const { analysisData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();

  const handleApplyRate = (itemNumber: string, rate: number) => {
    if (!analysisData?.items) return;
    
    const updatedItems = analysisData.items.map((item: any) => {
      if (item.item_number === itemNumber) {
        return {
          ...item,
          unit_price: rate,
          total_price: (item.quantity || 1) * rate
        };
      }
      return item;
    });

    setAnalysisData({
      ...analysisData,
      items: updatedItems
    });
  };

  const engineRows = (analysisData?.items || []).map((it: any, idx: number) => ({
    id: String(it.item_number ?? idx),
    name: it.description ?? `Item ${idx + 1}`,
    dailyProductivity: 1,
    dailyRent: Number(it.unit_price) || 0,
  }));

  const handleEngineApply = (rowId: string, patch: { dailyProductivity?: number; dailyRent?: number }) => {
    if (!analysisData?.items || patch.dailyRent == null) return;
    const updated = analysisData.items.map((it: any, idx: number) => {
      const id = String(it.item_number ?? idx);
      if (id !== rowId) return it;
      return { ...it, unit_price: patch.dailyRent, total_price: (Number(it.quantity) || 1) * (patch.dailyRent as number) };
    });
    setAnalysisData({ ...analysisData, items: updated });
  };

  return (
    <PageLayout>
      <ColorLegend type="category" isArabic={isArabic} className="mb-4" />
      {engineRows.length > 0 && (
        <div className="mb-4">
          <SmartCostEnginePanel
            pageRows={engineRows}
            wastePct={0}
            currency={analysisData?.summary?.currency || "SAR"}
            onApply={handleEngineApply}
          />
        </div>
      )}
      <Tabs defaultValue="cost-analysis" className="space-y-4">

        <TabsList className="grid w-full grid-cols-4 tabs-navigation-safe">
          <TabsTrigger value="cost-analysis" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {isArabic ? "تحليل التكاليف" : "Cost Analysis"}
          </TabsTrigger>
          <TabsTrigger value="price-comparison" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {isArabic ? "مقارنة الأسعار" : "Price Compare"}
          </TabsTrigger>
          <TabsTrigger value="boq-compare" className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            {isArabic ? "مقارنة BOQ" : "BOQ Compare"}
          </TabsTrigger>
          <TabsTrigger value="market-rates" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {isArabic ? "أسعار السوق" : "Market Rates"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cost-analysis">
          <CostAnalysis 
            items={analysisData?.items || []} 
            currency={analysisData?.summary?.currency || "SAR"} 
          />
        </TabsContent>
        <TabsContent value="price-comparison">
          <AIVsLocalPriceComparison 
            items={analysisData?.items || []}
            onApplyLocalPrice={handleApplyRate}
            onApplyAIPrice={handleApplyRate}
          />
        </TabsContent>
        <TabsContent value="boq-compare">
          <BOQComparison />
        </TabsContent>
        <TabsContent value="market-rates">
          <MarketRateSuggestions 
            items={analysisData?.items || []}
            onApplyRate={handleApplyRate}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default AnalysisToolsPage;
