import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { XLSX } from '@/lib/exceljs-utils';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface AnalyzedFile {
  id: string;
  file_name: string;
  category: string | null;
  analysis_result: any;
  is_analyzed: boolean | null;
}

interface AnalysisExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analyzedFiles: AnalyzedFile[];
}

export function AnalysisExportDialog({ isOpen, onClose, analyzedFiles }: AnalysisExportDialogProps) {
  const { isArabic } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | null>(null);

  const toggleFile = (id: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAll = () => {
    if (selectedFiles.size === analyzedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(analyzedFiles.map(f => f.id)));
    }
  };

  const exportToExcel = () => {
    const filesToExport = analyzedFiles.filter(f => selectedFiles.has(f.id));
    
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = filesToExport.map(f => ({
      [isArabic ? "اسم الملف" : "File Name"]: f.file_name,
      [isArabic ? "التصنيف" : "Category"]: f.category || "-",
      [isArabic ? "نوع المستند" : "Document Type"]: f.analysis_result?.document_type || "-",
      [isArabic ? "الملخص" : "Summary"]: f.analysis_result?.summary || "-",
      [isArabic ? "القيمة الإجمالية" : "Total Value"]: f.analysis_result?.total_value || f.analysis_result?.extracted_data?.total_value || "-",
      [isArabic ? "العملة" : "Currency"]: f.analysis_result?.currency || f.analysis_result?.extracted_data?.currency || "-",
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, isArabic ? "الملخص" : "Summary");
    
    // Details for each file with items
    filesToExport.forEach((file, index) => {
      if (file.analysis_result?.items && file.analysis_result.items.length > 0) {
        const itemsData = file.analysis_result.items.map((item: any, idx: number) => ({
          "#": item.item_number || idx + 1,
          [isArabic ? "الوصف" : "Description"]: item.description || "-",
          [isArabic ? "الكمية" : "Quantity"]: item.quantity || "-",
          [isArabic ? "الوحدة" : "Unit"]: item.unit || "-",
          [isArabic ? "سعر الوحدة" : "Unit Price"]: item.unit_price || "-",
          [isArabic ? "الإجمالي" : "Total"]: item.total_price || "-",
        }));
        
        const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
        const sheetName = `${index + 1}-${file.file_name.slice(0, 20)}`;
        XLSX.utils.book_append_sheet(workbook, itemsSheet, sheetName);
      }
    });
    
    XLSX.writeFile(workbook, `analysis_export_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    const filesToExport = analyzedFiles.filter(f => selectedFiles.has(f.id));
    
    const doc = new jsPDF();
    let yPosition = 20;
    
    // Title
    doc.setFontSize(18);
    doc.text(isArabic ? "تقرير نتائج التحليل" : "Analysis Results Report", 105, yPosition, { align: "center" });
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.text(`${isArabic ? "تاريخ التصدير" : "Export Date"}: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: "center" });
    yPosition += 15;
    
    filesToExport.forEach((file, fileIndex) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // File header
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      doc.text(`${fileIndex + 1}. ${file.file_name}`, 14, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      
      if (file.analysis_result?.document_type) {
        doc.text(`${isArabic ? "نوع المستند" : "Type"}: ${file.analysis_result.document_type}`, 14, yPosition);
        yPosition += 6;
      }
      
      if (file.analysis_result?.summary) {
        const summary = file.analysis_result.summary.slice(0, 200);
        const lines = doc.splitTextToSize(summary, 180);
        doc.text(lines, 14, yPosition);
        yPosition += lines.length * 5 + 5;
      }
      
      // Items table
      if (file.analysis_result?.items && file.analysis_result.items.length > 0) {
        const tableData = file.analysis_result.items.slice(0, 15).map((item: any, idx: number) => [
          item.item_number || idx + 1,
          (item.description || "-").slice(0, 50),
          item.quantity || "-",
          item.unit || "-",
          item.total_price?.toLocaleString() || "-"
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [[
            "#",
            isArabic ? "الوصف" : "Description",
            isArabic ? "الكمية" : "Qty",
            isArabic ? "الوحدة" : "Unit",
            isArabic ? "الإجمالي" : "Total"
          ]],
          body: tableData,
          theme: "striped",
          headStyles: { fillColor: [33, 150, 243] },
          styles: { fontSize: 8 },
          margin: { left: 14 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Total value
      const totalValue = file.analysis_result?.total_value || file.analysis_result?.extracted_data?.total_value;
      if (totalValue) {
        doc.setFontSize(11);
        doc.setTextColor(0, 128, 0);
        doc.text(`${isArabic ? "القيمة الإجمالية" : "Total Value"}: ${totalValue.toLocaleString()} ${file.analysis_result?.currency || ""}`, 14, yPosition);
        yPosition += 15;
      }
      
      yPosition += 5;
    });
    
    doc.save(`analysis_export_${Date.now()}.pdf`);
  };

  const handleExport = async (format: "excel" | "pdf") => {
    if (selectedFiles.size === 0) {
      toast.error(isArabic ? "يرجى اختيار ملف واحد على الأقل" : "Please select at least one file");
      return;
    }
    
    setIsExporting(true);
    setExportFormat(format);
    
    try {
      if (format === "excel") {
        exportToExcel();
      } else {
        exportToPDF();
      }
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في تصدير التقرير" : "Error exporting report");
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {isArabic ? "تصدير نتائج التحليل" : "Export Analysis Results"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر الملفات التي تريد تصدير نتائج تحليلها"
              : "Select the files to export their analysis results"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectedFiles.size === analyzedFiles.length && analyzedFiles.length > 0}
              onCheckedChange={toggleAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer">
              {isArabic ? "تحديد الكل" : "Select All"} ({analyzedFiles.length})
            </Label>
          </div>

          {/* File List */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {analyzedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={file.id}
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => toggleFile(file.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={file.id} className="cursor-pointer text-sm font-medium truncate block">
                      {file.file_name}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {file.category}
                      </Badge>
                      {file.analysis_result?.document_type && (
                        <span className="text-xs text-muted-foreground">
                          {file.analysis_result.document_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Export Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => handleExport("excel")}
              disabled={isExporting || selectedFiles.size === 0}
              className="flex-1 gap-2"
              variant="outline"
            >
              {isExporting && exportFormat === "excel" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
              )}
              Excel
            </Button>
            <Button
              onClick={() => handleExport("pdf")}
              disabled={isExporting || selectedFiles.size === 0}
              className="flex-1 gap-2"
              variant="outline"
            >
              {isExporting && exportFormat === "pdf" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-red-500" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
