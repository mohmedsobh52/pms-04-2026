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
    
    const items = selectedProject.analysis_data.items;
    const totalValue = items.reduce((sum: number, item: any) => sum + (parseFloat(item.total_price) || 0), 0);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(isArabic ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow popups");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${selectedProject.name} - ${isArabic ? "التقرير الشامل" : "Comprehensive Report"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            box-sizing: border-box;
          }
          body { 
            direction: ${isArabic ? 'rtl' : 'ltr'}; 
            text-align: ${isArabic ? 'right' : 'left'}; 
            padding: 20px;
            color: #1e293b;
            line-height: 1.6;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%);
            color: white;
            padding: 25px 30px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; }
          .header p { margin: 0; opacity: 0.9; font-size: 14px; }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            background: #f1f5f9;
            border-radius: 10px;
            padding: 18px;
            text-align: center;
          }
          .summary-card .label { font-size: 12px; color: #64748b; margin-bottom: 5px; }
          .summary-card .value { font-size: 20px; font-weight: 700; color: #1e293b; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 11px;
          }
          th { 
            background: #3b82f6; 
            color: white; 
            padding: 12px 10px;
            font-weight: 600;
            text-align: ${isArabic ? 'right' : 'left'};
          }
          td { 
            border: 1px solid #e2e8f0; 
            padding: 10px;
            text-align: ${isArabic ? 'right' : 'left'};
          }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { 
            font-weight: 700; 
            background: #e2e8f0 !important;
            font-size: 13px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 11px;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
            .header { break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${selectedProject.name}</h1>
          <p>${isArabic ? "التقرير الشامل - تحليل جدول الكميات" : "Comprehensive Report - BOQ Analysis"}</p>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">${isArabic ? "إجمالي البنود" : "Total Items"}</div>
            <div class="value">${items.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
            <div class="value">${totalValue.toLocaleString('en-US')}</div>
          </div>
          <div class="summary-card">
            <div class="label">${isArabic ? "تاريخ التقرير" : "Report Date"}</div>
            <div class="value">${new Date().toLocaleDateString('en-US')}</div>
          </div>
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
                <td>${item.quantity?.toLocaleString('en-US') || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.unit_price?.toLocaleString('en-US') || '-'}</td>
                <td>${item.total_price?.toLocaleString('en-US') || '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5">${isArabic ? "الإجمالي" : "Total"}</td>
              <td>${totalValue.toLocaleString('en-US')}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          ${isArabic ? "تم إنشاء هذا التقرير بواسطة PMS" : "Generated by PMS"} - ${new Date().toLocaleString('en-US')}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for fonts to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    toast.success(isArabic ? "تم فتح نافذة الطباعة - اختر 'حفظ كـ PDF' للتصدير" : "Print window opened - Select 'Save as PDF' to export");
  };

  const handlePrintReport = () => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للطباعة" : "No data to print");
      return;
    }
    
    const items = selectedProject.analysis_data.items;
    const totalValue = items.reduce((sum: number, item: any) => sum + (parseFloat(item.total_price) || 0), 0);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(isArabic ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow popups");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${selectedProject.name} - ${isArabic ? "تقرير" : "Report"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { 
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; 
            box-sizing: border-box;
          }
          body { 
            direction: ${isArabic ? 'rtl' : 'ltr'}; 
            text-align: ${isArabic ? 'right' : 'left'}; 
            padding: 20px;
            color: #1e293b;
          }
          h1 { color: #3b82f6; margin-bottom: 5px; font-size: 22px; }
          .subtitle { color: #64748b; margin-bottom: 20px; font-size: 13px; }
          .summary { 
            margin: 20px 0; 
            padding: 18px; 
            background: #f1f5f9; 
            border-radius: 10px;
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
          }
          .summary-item { }
          .summary-label { font-size: 12px; color: #64748b; }
          .summary-value { font-size: 16px; font-weight: 600; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 10px;
            text-align: ${isArabic ? 'right' : 'left'};
          }
          th { background: #3b82f6; color: white; font-weight: 600; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { font-weight: bold; background: #e2e8f0 !important; }
        </style>
      </head>
      <body>
        <h1>${selectedProject.name}</h1>
        <p class="subtitle">${isArabic ? "تقرير جدول الكميات" : "Bill of Quantities Report"}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">${isArabic ? "إجمالي البنود" : "Total Items"}</div>
            <div class="summary-value">${items.length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
            <div class="summary-value">${totalValue.toLocaleString('en-US')}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${isArabic ? "التاريخ" : "Date"}</div>
            <div class="summary-value">${new Date().toLocaleDateString('en-US')}</div>
          </div>
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
                <td>${item.quantity?.toLocaleString('en-US') || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.unit_price?.toLocaleString('en-US') || '-'}</td>
                <td>${item.total_price?.toLocaleString('en-US') || '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5">${isArabic ? "الإجمالي" : "Total"}</td>
              <td>${totalValue.toLocaleString('en-US')}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
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
