import { AnalysisResults } from "@/components/AnalysisResults";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const BOQItemsPage = () => {
  const { analysisData, wbsData, setAnalysisData } = useAnalysisData();
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

  if (!analysisData) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-muted-foreground text-lg">
            {isArabic ? "لا توجد بيانات تحليل. يرجى تحليل ملف BOQ أولاً." : "No analysis data. Please analyze a BOQ file first."}
          </p>
          <Link to="/">
            <Button>
              {isArabic ? "العودة للرئيسية" : "Go to Home"}
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <AnalysisResults 
        data={analysisData} 
        wbsData={wbsData} 
        onApplyRate={handleApplyRate}
        fileName={(analysisData as any)?.file_name}
      />
    </PageLayout>
  );
};

export default BOQItemsPage;
