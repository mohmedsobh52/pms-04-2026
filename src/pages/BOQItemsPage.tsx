import { useState } from "react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, FolderOpen, FileSpreadsheet } from "lucide-react";
import { BOQUploadDialog } from "@/components/project-details/BOQUploadDialog";

const BOQItemsPage = () => {
  const { analysisData, wbsData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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
        <div className="flex flex-col items-center justify-center py-16 gap-8 max-w-2xl mx-auto px-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              {isArabic ? "بنود جدول الكميات" : "BOQ Items"}
            </h2>
            <p className="text-muted-foreground">
              {isArabic
                ? "لا توجد بيانات تحليل. ارفع ملف BOQ أو افتح مشروعاً محفوظاً."
                : "No analysis data. Upload a BOQ file or open a saved project."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Button size="lg" className="flex-1 gap-2" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-5 h-5" />
              {isArabic ? "رفع ملف BOQ" : "Upload BOQ File"}
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" asChild>
              <Link to="/projects">
                <FolderOpen className="w-5 h-5" />
                {isArabic ? "فتح مشروع" : "Open Project"}
              </Link>
            </Button>
          </div>
        </div>

        <BOQUploadDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          isArabic={isArabic}
          onSuccess={() => setShowUploadDialog(false)}
          onSuccessWithData={(data) => {
            setAnalysisData(data);
            setShowUploadDialog(false);
          }}
        />
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
