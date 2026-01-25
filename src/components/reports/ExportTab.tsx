import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Download, Eye, Languages, Printer, FileDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { exportBOQToExcel, exportEnhancedBOQToExcel, exportTenderSummaryToExcel, exportPriceAnalysisToExcel, exportTenderSummaryToPDF } from "@/lib/reports-export-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
}

interface ExportTabProps {
  projects: Project[];
  isLoading: boolean;
}

export const ExportTab = ({ projects, isLoading }: ExportTabProps) => {
  const { isArabic } = useLanguage();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleExportBOQ = () => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    exportBOQToExcel(selectedProject.analysis_data.items, selectedProject.name);
    toast.success(isArabic ? "تم تصدير جدول الكميات بنجاح" : "BOQ exported successfully");
  };

  const handleExportEnhancedBOQ = (language: 'en' | 'ar' | 'both') => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    exportEnhancedBOQToExcel(selectedProject.analysis_data.items, selectedProject.name, language);
    toast.success(isArabic ? "تم تصدير جدول الكميات المحسن بنجاح" : "Enhanced BOQ exported successfully");
  };

  const handleExportTenderSummary = (format: 'pdf' | 'excel') => {
    if (!selectedProject?.analysis_data) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    if (format === 'pdf') {
      exportTenderSummaryToPDF(selectedProject.analysis_data, selectedProject.name);
    } else {
      exportTenderSummaryToExcel(selectedProject.analysis_data, selectedProject.name);
    }
    toast.success(isArabic ? "تم تصدير ملخص العطاء بنجاح" : "Tender summary exported successfully");
  };

  const handleExportPriceAnalysis = () => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    exportPriceAnalysisToExcel(selectedProject.analysis_data.items, selectedProject.name);
    toast.success(isArabic ? "تم تصدير تحليل الأسعار بنجاح" : "Price analysis exported successfully");
  };

  const handleViewPriceAnalysis = () => {
    if (!selectedProject?.analysis_data) {
      toast.error(isArabic ? "لا توجد بيانات للعرض" : "No data to view");
      return;
    }
    toast.info(isArabic ? "جاري فتح تحليل الأسعار..." : "Opening price analysis...");
  };

  const handleExportComprehensivePDF = () => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    
    const doc = new jsPDF();
    const items = selectedProject.analysis_data.items;
    
    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(isArabic ? "التقرير الشامل" : "Comprehensive Report", 14, 18);
    doc.setFontSize(12);
    doc.text(selectedProject.name, 14, 28);
    
    // Summary section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    let y = 50;
    doc.text(isArabic ? "ملخص المشروع" : "Project Summary", 14, y);
    y += 10;
    
    doc.setFontSize(10);
    const totalValue = items.reduce((sum: number, item: any) => sum + (parseFloat(item.total_price) || 0), 0);
    doc.text(`${isArabic ? "إجمالي البنود:" : "Total Items:"} ${items.length}`, 14, y);
    y += 7;
    doc.text(`${isArabic ? "إجمالي القيمة:" : "Total Value:"} ${totalValue.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`${isArabic ? "تاريخ التقرير:" : "Report Date:"} ${new Date().toLocaleDateString()}`, 14, y);
    y += 15;
    
    // Items table
    autoTable(doc, {
      startY: y,
      head: [[
        '#',
        isArabic ? 'الوصف' : 'Description',
        isArabic ? 'الكمية' : 'Qty',
        isArabic ? 'الوحدة' : 'Unit',
        isArabic ? 'السعر' : 'Price',
        isArabic ? 'الإجمالي' : 'Total'
      ]],
      body: items.slice(0, 50).map((item: any, idx: number) => [
        idx + 1,
        (item.description || '-').substring(0, 35),
        item.quantity || '-',
        item.unit || '-',
        item.unit_price?.toLocaleString() || '-',
        item.total_price?.toLocaleString() || '-'
      ]),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });
    
    doc.save(`comprehensive-report-${selectedProject.name}.pdf`);
    toast.success(isArabic ? "تم تصدير التقرير الشامل بنجاح" : "Comprehensive report exported successfully");
  };

  const handlePrintReport = () => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للطباعة" : "No data to print");
      return;
    }
    
    const items = selectedProject.analysis_data.items;
    const totalValue = items.reduce((sum: number, item: any) => sum + (parseFloat(item.total_price) || 0), 0);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedProject.name} - Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #3b82f6; margin-bottom: 5px; }
            .summary { margin: 20px 0; padding: 15px; background: #f1f5f9; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #3b82f6; color: white; }
            tr:nth-child(even) { background: #f8fafc; }
            .total-row { font-weight: bold; background: #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>${selectedProject.name}</h1>
          <p style="color: #64748b;">${isArabic ? "التقرير الشامل" : "Comprehensive Report"}</p>
          <div class="summary">
            <strong>${isArabic ? "إجمالي البنود:" : "Total Items:"}</strong> ${items.length}<br>
            <strong>${isArabic ? "إجمالي القيمة:" : "Total Value:"}</strong> ${totalValue.toLocaleString()}<br>
            <strong>${isArabic ? "التاريخ:" : "Date:"}</strong> ${new Date().toLocaleDateString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isArabic ? "الوصف" : "Description"}</th>
                <th>${isArabic ? "الكمية" : "Qty"}</th>
                <th>${isArabic ? "الوحدة" : "Unit"}</th>
                <th>${isArabic ? "السعر" : "Price"}</th>
                <th>${isArabic ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.description || '-'}</td>
                  <td>${item.quantity || '-'}</td>
                  <td>${item.unit || '-'}</td>
                  <td>${item.unit_price?.toLocaleString() || '-'}</td>
                  <td>${item.total_price?.toLocaleString() || '-'}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5">${isArabic ? "الإجمالي" : "Total"}</td>
                <td>${totalValue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    toast.success(isArabic ? "جاري الطباعة..." : "Printing...");
  };

  const exportCards = [
    {
      title: isArabic ? "التقرير الشامل" : "Comprehensive Report",
      description: isArabic 
        ? "تقرير PDF شامل يتضمن جميع بيانات المشروع" 
        : "Full PDF report including all project data",
      icon: FileDown,
      actions: (
        <Button 
          onClick={handleExportComprehensivePDF}
          disabled={!selectedProjectId}
          className="bg-primary hover:bg-primary/90"
        >
          <FileDown className="h-4 w-4 mr-2" />
          PDF
        </Button>
      ),
    },
    {
      title: isArabic ? "تقرير قابل للطباعة" : "Printable Report",
      description: isArabic 
        ? "فتح نافذة طباعة مع تنسيق جاهز للطباعة" 
        : "Open print preview with print-ready format",
      icon: Printer,
      actions: (
        <Button 
          onClick={handlePrintReport}
          disabled={!selectedProjectId}
          variant="outline"
        >
          <Printer className="h-4 w-4 mr-2" />
          {isArabic ? "طباعة" : "Print"}
        </Button>
      ),
    },
    {
      title: isArabic ? "جدول الكميات" : "Bill of Quantities",
      description: isArabic 
        ? "تصدير جميع بنود BOQ مع الأسعار إلى Excel" 
        : "Export all BOQ items with prices to Excel",
      icon: FileSpreadsheet,
      actions: (
        <Button 
          onClick={handleExportBOQ}
          disabled={!selectedProjectId}
          className="bg-success hover:bg-success/90"
        >
          <Download className="h-4 w-4 mr-2" />
          Excel
        </Button>
      ),
    },
    {
      title: isArabic ? "جدول الكميات المحسن" : "Enhanced BOQ",
      description: isArabic 
        ? "تصدير محسن مع المجاميع الفرعية ودعم اللغتين" 
        : "Enhanced export with subtotals and bilingual support",
      icon: Languages,
      actions: (
        <div className="flex gap-2">
          <Button 
            onClick={() => handleExportEnhancedBOQ('en')}
            disabled={!selectedProjectId}
            variant="outline"
            size="sm"
          >
            EN
          </Button>
          <Button 
            onClick={() => handleExportEnhancedBOQ('ar')}
            disabled={!selectedProjectId}
            variant="outline"
            size="sm"
          >
            AR
          </Button>
          <Button 
            onClick={() => handleExportEnhancedBOQ('both')}
            disabled={!selectedProjectId}
            className="bg-success hover:bg-success/90"
            size="sm"
          >
            {isArabic ? "كلاهما" : "Both"}
          </Button>
        </div>
      ),
    },
    {
      title: isArabic ? "ملخص العطاء" : "Tender Summary",
      description: isArabic 
        ? "تصدير ملخص التسعير الكامل" 
        : "Export full pricing summary",
      icon: FileText,
      actions: (
        <div className="flex gap-2">
          <Button 
            onClick={() => handleExportTenderSummary('pdf')}
            disabled={!selectedProjectId}
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            PDF
          </Button>
          <Button 
            onClick={() => handleExportTenderSummary('excel')}
            disabled={!selectedProjectId}
            variant="outline"
            size="sm"
          >
            Excel
          </Button>
        </div>
      ),
    },
    {
      title: isArabic ? "تحليل الأسعار" : "Price Analysis",
      description: isArabic 
        ? "تصدير تحليل الأسعار التفصيلي إلى Excel" 
        : "Export detailed price analysis to Excel",
      icon: FileSpreadsheet,
      actions: (
        <div className="flex gap-2">
          <Button 
            onClick={handleViewPriceAnalysis}
            disabled={!selectedProjectId}
            variant="outline"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-1" />
            {isArabic ? "عرض" : "View"}
          </Button>
          <Button 
            onClick={handleExportPriceAnalysis}
            disabled={!selectedProjectId}
            className="bg-success hover:bg-success/90"
            size="sm"
          >
            Excel
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">
              {isArabic ? "اختر المشروع:" : "Select Project:"}
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[300px]">
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

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportCards.map((card, index) => (
          <Card key={index} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
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
        <p className="text-center text-muted-foreground text-sm">
          {isArabic ? "الرجاء اختيار مشروع للتصدير" : "Please select a project to export"}
        </p>
      )}
    </div>
  );
};
