import { 
  FileSearch, 
  GitMerge, 
  BarChart3, 
  FileSpreadsheet, 
  Calculator, 
  Scale, 
  Calendar, 
  Share2, 
  Download,
  Sparkles,
  Receipt,
  TrendingUp
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const features = [
  {
    icon: FileSearch,
    titleEn: "Smart BOQ Analysis",
    titleAr: "تحليل ذكي لجداول الكميات",
    descEn: "AI-powered extraction of items, quantities, units, and prices from PDF and Excel files",
    descAr: "استخراج ذكي للبنود والكميات والوحدات والأسعار من ملفات PDF و Excel باستخدام الذكاء الاصطناعي"
  },
  {
    icon: GitMerge,
    titleEn: "WBS Generation",
    titleAr: "إنشاء هيكل تجزئة العمل",
    descEn: "Automatic Work Breakdown Structure creation with hierarchical organization",
    descAr: "إنشاء تلقائي لهيكل تجزئة العمل (WBS) مع تنظيم هرمي للمشروع"
  },
  {
    icon: Sparkles,
    titleEn: "AI Market Rates",
    titleAr: "أسعار السوق بالذكاء الاصطناعي",
    descEn: "Get AI-suggested market rates for each item based on current market data",
    descAr: "احصل على أسعار السوق المقترحة لكل بند بناءً على بيانات السوق الحالية"
  },
  {
    icon: Scale,
    titleEn: "Quotation Comparison",
    titleAr: "مقارنة عروض الأسعار",
    descEn: "Compare multiple supplier quotations side by side with variance analysis",
    descAr: "مقارنة عروض أسعار الموردين المتعددة جنباً إلى جنب مع تحليل الفروقات"
  },
  {
    icon: Calculator,
    titleEn: "Cost Breakdown",
    titleAr: "تحليل التكاليف",
    descEn: "Detailed cost analysis including materials, labor, equipment, and overheads",
    descAr: "تحليل مفصل للتكاليف يشمل المواد والعمالة والمعدات والمصاريف العامة"
  },
  {
    icon: BarChart3,
    titleEn: "Interactive Charts",
    titleAr: "رسوم بيانية تفاعلية",
    descEn: "Visualize project data with dynamic charts and KPI dashboards",
    descAr: "عرض بيانات المشروع برسوم بيانية تفاعلية ولوحات مؤشرات الأداء"
  },
  {
    icon: Calendar,
    titleEn: "P6 Export",
    titleAr: "تصدير لـ Primavera P6",
    descEn: "Export your project schedule to Primavera P6 compatible format",
    descAr: "تصدير جدول المشروع بتنسيق متوافق مع Primavera P6"
  },
  {
    icon: Receipt,
    titleEn: "OCR Text Extraction",
    titleAr: "استخراج النص بـ OCR",
    descEn: "Extract text from scanned documents and images using advanced OCR",
    descAr: "استخراج النص من المستندات الممسوحة والصور باستخدام تقنية OCR المتقدمة"
  },
  {
    icon: Share2,
    titleEn: "Share & Collaborate",
    titleAr: "مشاركة وتعاون",
    descEn: "Share analysis with team members and add comments for collaboration",
    descAr: "مشاركة التحليل مع أعضاء الفريق وإضافة التعليقات للتعاون"
  },
  {
    icon: FileSpreadsheet,
    titleEn: "Excel Export",
    titleAr: "تصدير إلى Excel",
    descEn: "Export BOQ data with all analysis results to Excel format",
    descAr: "تصدير بيانات جدول الكميات مع جميع نتائج التحليل إلى Excel"
  },
  {
    icon: TrendingUp,
    titleEn: "Version Comparison",
    titleAr: "مقارنة الإصدارات",
    descEn: "Compare different BOQ versions to track changes and variations",
    descAr: "مقارنة إصدارات مختلفة من جدول الكميات لتتبع التغييرات"
  },
  {
    icon: Download,
    titleEn: "PDF Reports",
    titleAr: "تقارير PDF",
    descEn: "Generate comprehensive PDF reports with all project details",
    descAr: "إنشاء تقارير PDF شاملة تحتوي على جميع تفاصيل المشروع"
  }
];

export function FeaturesSection() {
  const { isArabic } = useLanguage();

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 gradient-text">
            {isArabic ? "مميزات البرنامج" : "Features"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {isArabic 
              ? "أدوات متكاملة لتحليل جداول الكميات وإدارة المشاريع الإنشائية بكفاءة عالية"
              : "Comprehensive tools for BOQ analysis and construction project management"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                {isArabic ? feature.titleAr : feature.titleEn}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isArabic ? feature.descAr : feature.descEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
