import { PageLayout } from "@/components/PageLayout";
import { MaterialPriceDatabase } from "@/components/MaterialPriceDatabase";
import { useLanguage } from "@/hooks/useLanguage";

const MaterialPricesPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {isArabic ? "قاعدة بيانات الأسعار" : "Price Database"}
          </h2>
          <p className="text-muted-foreground mt-1">
            {isArabic 
              ? "إدارة أسعار المواد والموردين - إضافة يدوي، استيراد Excel، وبحث ذكي من الإنترنت"
              : "Manage material prices and suppliers - manual entry, Excel import, and smart web search"
            }
          </p>
        </div>
        
        <MaterialPriceDatabase />
      </div>
    </PageLayout>
  );
};

export default MaterialPricesPage;
