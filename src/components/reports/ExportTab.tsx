import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Download, Eye, Languages } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { exportBOQToExcel, exportEnhancedBOQToExcel, exportTenderSummaryToExcel, exportPriceAnalysisToExcel, exportTenderSummaryToPDF } from "@/lib/reports-export-utils";

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
    // Navigate to analysis page or open dialog
    toast.info(isArabic ? "جاري فتح تحليل الأسعار..." : "Opening price analysis...");
  };

  const exportCards = [
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
          className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
        >
          <Download className="h-4 w-4 mr-2" />
          {isArabic ? "تصدير Excel" : "Export Excel"}
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
            className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
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
            className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
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
            className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
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
