import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  FileText,
  Combine,
  CalendarClock,
  Download,
  Loader2
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

interface AdvancedReportsTabProps {
  projects: Project[];
}

interface ReportType {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: any;
  color: string;
  bgColor: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'cost-summary',
    name: 'Cost Summary',
    nameAr: 'ملخص التكاليف',
    description: 'Overall cost breakdown and analysis',
    descriptionAr: 'تحليل شامل لتوزيع التكاليف',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'progress-report',
    name: 'Progress Report',
    nameAr: 'تقرير التقدم',
    description: 'Project progress and timeline',
    descriptionAr: 'تقدم المشروع والجدول الزمني',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'resource-utilization',
    name: 'Resource Utilization',
    nameAr: 'استغلال الموارد',
    description: 'Resource allocation and usage',
    descriptionAr: 'تخصيص واستخدام الموارد',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'material-report',
    name: 'Material Report',
    nameAr: 'تقرير المواد',
    description: 'Material quantities and costs',
    descriptionAr: 'كميات وتكاليف المواد',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
];

export const AdvancedReportsTab = ({ projects }: AdvancedReportsTabProps) => {
  const { isArabic } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const analysisData = selectedProject?.analysis_data;

  const generatePDFReport = async (reportType: string) => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    setGeneratingReport(reportType);
    
    try {
      const doc = new jsPDF();
      const report = reportTypes.find(r => r.id === reportType);
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(isArabic ? report?.nameAr || '' : report?.name || '', 14, 20);
      
      // Date
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`${isArabic ? "التاريخ:" : "Date:"} ${new Date().toLocaleDateString()}`, 14, 40);
      doc.text(`${isArabic ? "المشروع:" : "Project:"} ${selectedProject?.name}`, 14, 48);

      // Table
      autoTable(doc, {
        startY: 60,
        head: [[
          isArabic ? 'م' : '#',
          isArabic ? 'الوصف' : 'Description',
          isArabic ? 'الكمية' : 'Quantity',
          isArabic ? 'الوحدة' : 'Unit',
          isArabic ? 'السعر' : 'Price',
          isArabic ? 'الإجمالي' : 'Total',
        ]],
        body: analysisData.items.map((item: any, idx: number) => [
          idx + 1,
          (item.description || '-').substring(0, 40),
          item.quantity || '-',
          item.unit || '-',
          item.unit_price || '-',
          item.total_price || '-',
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      doc.save(`${reportType}-${selectedProject?.name}-${Date.now()}.pdf`);
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في التصدير" : "Export error");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateExcelReport = async (reportType: string) => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    setGeneratingReport(reportType);

    try {
      const worksheet = XLSX.utils.json_to_sheet(
        analysisData.items.map((item: any, idx: number) => ({
          [isArabic ? 'م' : '#']: idx + 1,
          [isArabic ? 'الوصف' : 'Description']: item.description,
          [isArabic ? 'الكمية' : 'Quantity']: item.quantity,
          [isArabic ? 'الوحدة' : 'Unit']: item.unit,
          [isArabic ? 'السعر' : 'Unit Price']: item.unit_price,
          [isArabic ? 'الإجمالي' : 'Total']: item.total_price,
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${reportType}-${selectedProject?.name}-${Date.now()}.xlsx`);
      
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في التصدير" : "Export error");
    } finally {
      setGeneratingReport(null);
    }
  };

  const additionalTools = [
    {
      id: "files-report",
      title: isArabic ? "تقرير الملفات" : "Files Report",
      description: isArabic ? "تقرير شامل من جميع الملفات المحللة" : "Comprehensive report from analyzed files",
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
    },
    {
      id: "merge-analysis",
      title: isArabic ? "دمج التحليلات" : "Merge Analysis",
      description: isArabic ? "دمج نتائج تحليل عدة ملفات" : "Merge analysis results from multiple files",
      icon: Combine,
      color: "text-pink-600",
      bgColor: "bg-pink-500/10",
    },
    {
      id: "scheduled-reports",
      title: isArabic ? "تقارير مجدولة" : "Scheduled Reports",
      description: isArabic ? "إنشاء تقارير تلقائية ترسل بالبريد" : "Create automatic email reports",
      icon: CalendarClock,
      color: "text-cyan-600",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {isArabic ? "التقارير المتقدمة" : "Advanced Reports"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isArabic ? "إنشاء وتصدير تقارير مفصلة" : "Generate and export detailed reports"}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={isArabic ? "اختر المشروع" : "Select Project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "الكل" : "All Time"}</SelectItem>
              <SelectItem value="month">{isArabic ? "هذا الشهر" : "This Month"}</SelectItem>
              <SelectItem value="quarter">{isArabic ? "هذا الربع" : "This Quarter"}</SelectItem>
              <SelectItem value="year">{isArabic ? "هذه السنة" : "This Year"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isGenerating = generatingReport === report.id;
          
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${report.bgColor}`}>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {isArabic ? report.nameAr : report.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isArabic ? report.descriptionAr : report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!selectedProjectId || isGenerating}
                    onClick={() => generatePDFReport(report.id)}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!selectedProjectId || isGenerating}
                    onClick={() => generateExcelReport(report.id)}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Tools */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {isArabic ? "أدوات إضافية" : "Additional Tools"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {additionalTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                      <Icon className={`h-5 w-5 ${tool.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tool.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {!selectedProjectId && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {isArabic 
            ? "الرجاء اختيار مشروع لإنشاء التقارير المتقدمة" 
            : "Please select a project to generate advanced reports"}
        </p>
      )}
    </div>
  );
};
