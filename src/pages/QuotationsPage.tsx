import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";

const QuotationsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="tabs-navigation-safe">
          <TabsTrigger value="upload">
            {isArabic ? "رفع عروض الأسعار" : "Upload Quotations"}
          </TabsTrigger>
          <TabsTrigger value="compare">
            {isArabic ? "مقارنة العروض" : "Compare Quotations"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <QuotationUpload />
        </TabsContent>
        <TabsContent value="compare">
          <QuotationComparison />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default QuotationsPage;
