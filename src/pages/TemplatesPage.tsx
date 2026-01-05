import { BOQTemplates } from "@/components/BOQTemplates";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/PageLayout";

const TemplatesPage = () => {
  const { analysisData, setAnalysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { toast } = useToast();

  return (
    <PageLayout>
      <BOQTemplates 
        currentItems={analysisData?.items || []}
        onUseTemplate={(items) => {
          setAnalysisData(prev => prev ? { ...prev, items } : { items, summary: {} });
          toast({
            title: isArabic ? "تم تطبيق القالب" : "Template Applied",
            description: isArabic ? "تم استيراد بنود القالب" : "Template items imported"
          });
        }}
      />
    </PageLayout>
  );
};

export default TemplatesPage;
