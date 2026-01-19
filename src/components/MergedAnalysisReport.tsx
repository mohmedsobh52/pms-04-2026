import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Combine,
  FileText,
  Download,
  Loader2,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from '@/lib/exceljs-utils';

interface AnalyzedFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  category: string | null;
  is_analyzed: boolean | null;
  analysis_result: any;
}

interface MergedAnalysisReportProps {
  isOpen: boolean;
  onClose: () => void;
  analyzedFiles: AnalyzedFile[];
}

export function MergedAnalysisReport({ isOpen, onClose, analyzedFiles }: MergedAnalysisReportProps) {
  const { isArabic } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(analyzedFiles.map(f => f.id)));
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);

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

  const selectedAnalyzedFiles = useMemo(() => 
    analyzedFiles.filter(f => selectedFiles.has(f.id)),
    [analyzedFiles, selectedFiles]
  );

  const mergedData = useMemo(() => {
    if (selectedAnalyzedFiles.length === 0) return null;

    const allItems: any[] = [];
    const summary = {
      totalFiles: selectedAnalyzedFiles.length,
      totalItems: 0,
      totalValue: 0,
      categories: new Map<string, number>(),
      filesIncluded: selectedAnalyzedFiles.map(f => f.file_name)
    };

    selectedAnalyzedFiles.forEach(file => {
      const result = file.analysis_result;
      if (!result) return;

      // Collect items
      const items = result.items || result.data || result.boqItems || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          allItems.push({
            ...item,
            sourceFile: file.file_name,
            sourceCategory: file.category
          });
          
          const value = parseFloat(item.total_price || item.totalPrice || item.value || 0);
          if (!isNaN(value)) {
            summary.totalValue += value;
          }
        });
        summary.totalItems += items.length;
      }

      // Track categories
      const category = file.category || "general";
      summary.categories.set(category, (summary.categories.get(category) || 0) + 1);
    });

    return {
      items: allItems,
      summary,
      generatedAt: new Date().toISOString()
    };
  }, [selectedAnalyzedFiles]);

  const handleGenerateReport = () => {
    if (selectedFiles.size < 2) {
      toast.error(isArabic ? "يرجى اختيار ملفين على الأقل" : "Please select at least 2 files");
      return;
    }
    setShowReport(true);
  };

  const exportToPDF = async () => {
    if (!mergedData) return;
    
    setIsGenerating(true);
    try {
      const pdf = new jsPDF();
      let yPos = 20;

      // Title
      pdf.setFontSize(18);
      pdf.text(isArabic ? "تقرير التحليل الموحد" : "Merged Analysis Report", 105, yPos, { align: "center" });
      yPos += 15;

      // Summary
      pdf.setFontSize(12);
      pdf.text(isArabic ? "ملخص التقرير" : "Report Summary", 14, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.text(`${isArabic ? "عدد الملفات:" : "Files:"} ${mergedData.summary.totalFiles}`, 14, yPos);
      yPos += 6;
      pdf.text(`${isArabic ? "إجمالي البنود:" : "Total Items:"} ${mergedData.summary.totalItems}`, 14, yPos);
      yPos += 6;
      pdf.text(`${isArabic ? "القيمة الإجمالية:" : "Total Value:"} ${mergedData.summary.totalValue.toLocaleString()}`, 14, yPos);
      yPos += 12;

      // Files included
      pdf.setFontSize(12);
      pdf.text(isArabic ? "الملفات المضمنة:" : "Files Included:", 14, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      mergedData.summary.filesIncluded.forEach((fileName: string, index: number) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(`${index + 1}. ${fileName}`, 18, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Items table
      if (mergedData.items.length > 0) {
        pdf.addPage();
        
        autoTable(pdf, {
          startY: 20,
          head: [[
            isArabic ? "م" : "#",
            isArabic ? "الوصف" : "Description",
            isArabic ? "الكمية" : "Qty",
            isArabic ? "السعر" : "Price",
            isArabic ? "الملف المصدر" : "Source"
          ]],
          body: mergedData.items.slice(0, 100).map((item: any, index: number) => [
            index + 1,
            (item.description || item.name || "-").slice(0, 50),
            item.quantity || "-",
            item.total_price || item.totalPrice || "-",
            item.sourceFile?.slice(0, 20) || "-"
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] }
        });
      }

      pdf.save(`merged-analysis-${Date.now()}.pdf`);
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في التصدير" : "Export error");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (!mergedData) return;
    
    setIsGenerating(true);
    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        [isArabic ? "تقرير التحليل الموحد" : "Merged Analysis Report"],
        [],
        [isArabic ? "عدد الملفات" : "Files Count", mergedData.summary.totalFiles],
        [isArabic ? "إجمالي البنود" : "Total Items", mergedData.summary.totalItems],
        [isArabic ? "القيمة الإجمالية" : "Total Value", mergedData.summary.totalValue],
        [],
        [isArabic ? "الملفات المضمنة:" : "Files Included:"],
        ...mergedData.summary.filesIncluded.map((f: string, i: number) => [`${i + 1}. ${f}`])
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, isArabic ? "الملخص" : "Summary");

      // Items sheet
      if (mergedData.items.length > 0) {
        const itemsData = [
          [isArabic ? "م" : "#", isArabic ? "الوصف" : "Description", isArabic ? "الكمية" : "Quantity", 
           isArabic ? "الوحدة" : "Unit", isArabic ? "السعر" : "Price", isArabic ? "الملف المصدر" : "Source File"],
          ...mergedData.items.map((item: any, index: number) => [
            index + 1,
            item.description || item.name || "",
            item.quantity || "",
            item.unit || "",
            item.total_price || item.totalPrice || "",
            item.sourceFile || ""
          ])
        ];
        const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(wb, itemsSheet, isArabic ? "البنود" : "Items");
      }

      XLSX.writeFile(wb, `merged-analysis-${Date.now()}.xlsx`);
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في التصدير" : "Export error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Combine className="w-5 h-5" />
            {isArabic ? "دمج نتائج التحليل" : "Merge Analysis Results"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر الملفات لدمج نتائج تحليلها في تقرير واحد شامل"
              : "Select files to merge their analysis results into one comprehensive report"}
          </DialogDescription>
        </DialogHeader>

        {!showReport ? (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                id="select-all-merge"
                checked={selectedFiles.size === analyzedFiles.length && analyzedFiles.length > 0}
                onCheckedChange={toggleAll}
              />
              <Label htmlFor="select-all-merge" className="cursor-pointer">
                {isArabic ? "تحديد الكل" : "Select All"} ({analyzedFiles.length})
              </Label>
            </div>

            {/* File List */}
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {analyzedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer",
                      selectedFiles.has(file.id) && "bg-primary/5 border border-primary/20"
                    )}
                    onClick={() => toggleFile(file.id)}
                  >
                    <Checkbox
                      id={file.id}
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                    />
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={file.id} className="cursor-pointer text-sm font-medium truncate block">
                        {file.file_name}
                      </Label>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {file.category}
                      </Badge>
                    </div>
                    <CheckCircle className={cn(
                      "w-4 h-4 transition-opacity",
                      selectedFiles.has(file.id) ? "text-primary opacity-100" : "opacity-0"
                    )} />
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={selectedFiles.size < 2}
                className="flex-1 gap-2"
              >
                <Combine className="w-4 h-4" />
                {isArabic ? `دمج ${selectedFiles.size} ملفات` : `Merge ${selectedFiles.size} Files`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">{isArabic ? "الملخص" : "Summary"}</TabsTrigger>
                <TabsTrigger value="items">{isArabic ? "البنود" : "Items"}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {isArabic ? "الملفات" : "Files"}
                        </span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{mergedData?.summary.totalFiles}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {isArabic ? "البنود" : "Items"}
                        </span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{mergedData?.summary.totalItems}</p>
                    </CardContent>
                  </Card>
                  <Card className="col-span-2">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">
                          {isArabic ? "القيمة الإجمالية" : "Total Value"}
                        </span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{mergedData?.summary.totalValue.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{isArabic ? "الملفات المضمنة" : "Included Files"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {mergedData?.summary.filesIncluded.map((fileName: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {fileName}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="mt-4">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {mergedData?.items.slice(0, 50).map((item: any, index: number) => (
                      <div key={index} className="p-2 rounded-lg bg-muted/30 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {item.description || item.name || `Item ${index + 1}`}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{item.quantity || "-"} {item.unit || ""}</span>
                              <span>•</span>
                              <span className="truncate">{item.sourceFile}</span>
                            </div>
                          </div>
                          <span className="font-medium text-primary whitespace-nowrap">
                            {item.total_price || item.totalPrice || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {mergedData?.items.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {isArabic ? "لا توجد بنود" : "No items found"}
                      </p>
                    )}
                    {(mergedData?.items.length || 0) > 50 && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        {isArabic 
                          ? `+ ${mergedData!.items.length - 50} بند آخر...` 
                          : `+ ${mergedData!.items.length - 50} more items...`}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Export Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowReport(false)} className="flex-1">
                {isArabic ? "رجوع" : "Back"}
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={isGenerating}
                className="flex-1 gap-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Excel
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={isGenerating}
                className="flex-1 gap-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
