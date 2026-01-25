import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { 
  BarChart3, 
  Scale, 
  TrendingUp, 
  History, 
  FileDown,
  FileSpreadsheet,
  Eye
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from "@/lib/exceljs-utils";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
}

interface PriceAnalysisTabProps {
  projects: Project[];
}

export const PriceAnalysisTab = ({ projects }: PriceAnalysisTabProps) => {
  const { isArabic } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const items = selectedProject?.analysis_data?.items || [];

  // Calculate price analysis data
  const priceStats = items.length > 0 ? {
    totalOriginal: items.reduce((sum: number, item: any) => sum + (parseFloat(item.total_price) || 0), 0),
    itemsCount: items.length,
    avgPrice: items.reduce((sum: number, item: any) => sum + (parseFloat(item.unit_price) || 0), 0) / items.length,
    highestItem: items.reduce((max: any, item: any) => 
      (parseFloat(item.total_price) || 0) > (parseFloat(max?.total_price) || 0) ? item : max, items[0]),
    lowestItem: items.reduce((min: any, item: any) => 
      (parseFloat(item.total_price) || 0) < (parseFloat(min?.total_price) || Infinity) ? item : min, items[0]),
  } : null;

  const handleExportPriceComparison = (format: 'pdf' | 'excel') => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    if (format === 'pdf') {
      const pdf = new jsPDF({ orientation: 'landscape' });
      
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 25, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text(isArabic ? "تقرير مقارنة الأسعار" : "Price Comparison Report", 14, 16);
      
      autoTable(pdf, {
        startY: 35,
        head: [[
          isArabic ? '#' : 'Item #',
          isArabic ? 'الوصف' : 'Description',
          isArabic ? 'الكمية' : 'Qty',
          isArabic ? 'الوحدة' : 'Unit',
          isArabic ? 'سعر الوحدة' : 'Unit Price',
          isArabic ? 'الإجمالي' : 'Total',
        ]],
        body: items.map((item: any) => [
          item.item_number || '-',
          (item.description || '-').substring(0, 40),
          item.quantity || '-',
          item.unit || '-',
          item.unit_price?.toLocaleString() || '-',
          item.total_price?.toLocaleString() || '-',
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
      
      pdf.save(`price-comparison-${selectedProject.name}.pdf`);
    } else {
      const data = items.map((item: any, idx: number) => ({
        [isArabic ? "م" : "#"]: idx + 1,
        [isArabic ? "رقم البند" : "Item Number"]: item.item_number,
        [isArabic ? "الوصف" : "Description"]: item.description,
        [isArabic ? "الكمية" : "Quantity"]: item.quantity,
        [isArabic ? "الوحدة" : "Unit"]: item.unit,
        [isArabic ? "سعر الوحدة" : "Unit Price"]: item.unit_price,
        [isArabic ? "الإجمالي" : "Total"]: item.total_price,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isArabic ? "مقارنة الأسعار" : "Price Comparison");
      XLSX.writeFile(wb, `price-comparison-${selectedProject.name}.xlsx`);
    }

    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const handleExportBalanceReport = () => {
    if (!priceStats) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const pdf = new jsPDF();
    
    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, 210, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text(isArabic ? "تقرير التوازن السعري" : "Price Balance Report", 14, 20);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    let y = 45;
    
    pdf.text(`${isArabic ? "المشروع:" : "Project:"} ${selectedProject?.name}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "إجمالي القيمة:" : "Total Value:"} ${priceStats.totalOriginal.toLocaleString()}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "عدد البنود:" : "Items Count:"} ${priceStats.itemsCount}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "متوسط السعر:" : "Average Price:"} ${priceStats.avgPrice.toFixed(2)}`, 14, y);
    
    pdf.save(`balance-report-${selectedProject?.name}.pdf`);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const reportCards = [
    {
      id: "price-comparison",
      title: isArabic ? "مقارنة الأسعار" : "Price Comparison",
      description: isArabic 
        ? "مقارنة السعر الأصلي مع السعر المقترح والمحسوب"
        : "Compare original price with suggested and calculated prices",
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      actions: (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!selectedProjectId}
            onClick={() => handleExportPriceComparison('pdf')}
          >
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!selectedProjectId}
            onClick={() => handleExportPriceComparison('excel')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      ),
    },
    {
      id: "balance-report",
      title: isArabic ? "تقرير التوازن" : "Balance Report",
      description: isArabic 
        ? "تحليل توازن الأسعار مقارنة بأسعار السوق"
        : "Price balance analysis compared to market rates",
      icon: Scale,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      actions: (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!selectedProjectId}
          onClick={handleExportBalanceReport}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          PDF
        </Button>
      ),
    },
    {
      id: "variance-analysis",
      title: isArabic ? "تحليل الفروقات" : "Variance Analysis",
      description: isArabic 
        ? "تحليل الانحرافات السعرية بين المصادر المختلفة"
        : "Analyze price variances between different sources",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      actions: (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!selectedProjectId}
          onClick={() => {
            toast.info(isArabic ? "جاري فتح التحليل..." : "Opening analysis...");
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          {isArabic ? "عرض" : "View"}
        </Button>
      ),
    },
    {
      id: "historical-pricing",
      title: isArabic ? "الأسعار التاريخية" : "Historical Pricing",
      description: isArabic 
        ? "مقارنة الأسعار مع البيانات التاريخية"
        : "Compare prices with historical data",
      icon: History,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      actions: (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!selectedProjectId}
          onClick={() => {
            toast.info(isArabic ? "جاري فتح المقارنة..." : "Opening comparison...");
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          {isArabic ? "عرض" : "View"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              {isArabic ? "اختر المشروع:" : "Select Project:"}
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder={isArabic ? "اختر المشروع" : "Choose Project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Price Stats Summary */}
      {priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "إجمالي القيمة" : "Total Value"}
              </p>
              <p className="text-xl font-bold text-primary">
                {priceStats.totalOriginal.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "عدد البنود" : "Items Count"}
              </p>
              <p className="text-xl font-bold">{priceStats.itemsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "أعلى بند" : "Highest Item"}
              </p>
              <p className="text-xl font-bold text-destructive">
                {parseFloat(priceStats.highestItem?.total_price || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "أقل بند" : "Lowest Item"}
              </p>
              <p className="text-xl font-bold text-success">
                {parseFloat(priceStats.lowestItem?.total_price || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((card) => (
          <Card key={card.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {card.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex justify-end">
                {card.actions}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedProjectId && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {isArabic ? "الرجاء اختيار مشروع لعرض تحليل الأسعار" : "Please select a project to view price analysis"}
        </p>
      )}
    </div>
  );
};
