import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Loader2,
  FileText,
  Calculator,
  BarChart3,
  Search,
  ClipboardList
} from "lucide-react";
import { toast } from "sonner";
import { XLSX } from "@/lib/exceljs-utils";

interface AnalyzedFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  category: string | null;
  is_analyzed: boolean | null;
  analysis_result: any;
}

interface ReAnalyzeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: AnalyzedFile | null;
  onComplete: () => void;
}

const ANALYSIS_TYPES = [
  { 
    value: "extract_data", 
    labelEn: "Data Extraction", 
    labelAr: "استخراج البيانات",
    descEn: "Extract structured data and key information",
    descAr: "استخراج البيانات المنظمة والمعلومات الرئيسية",
    icon: Search
  },
  { 
    value: "summarize", 
    labelEn: "Document Summary", 
    labelAr: "تلخيص المستند",
    descEn: "Generate a comprehensive summary",
    descAr: "إنشاء ملخص شامل للمستند",
    icon: FileText
  },
  { 
    value: "extract_boq", 
    labelEn: "BOQ Extraction", 
    labelAr: "استخراج جدول الكميات",
    descEn: "Extract bill of quantities items and prices",
    descAr: "استخراج بنود جدول الكميات والأسعار",
    icon: ClipboardList
  },
  { 
    value: "cost_analysis", 
    labelEn: "Cost Analysis", 
    labelAr: "تحليل التكاليف",
    descEn: "Analyze costs, pricing, and financial data",
    descAr: "تحليل التكاليف والأسعار والبيانات المالية",
    icon: Calculator
  },
  { 
    value: "comparison", 
    labelEn: "Comparison Analysis", 
    labelAr: "تحليل المقارنة",
    descEn: "Compare with market rates and standards",
    descAr: "مقارنة مع أسعار السوق والمعايير",
    icon: BarChart3
  },
];

export function ReAnalyzeDialog({ isOpen, onClose, file, onComplete }: ReAnalyzeDialogProps) {
  const { isArabic } = useLanguage();
  const [selectedType, setSelectedType] = useState("extract_data");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const extractFileContent = async (blob: Blob, fileName: string, fileType: string): Promise<string> => {
    if (fileType.includes("text") || fileName.endsWith(".txt") || 
        fileName.endsWith(".json") || fileName.endsWith(".xml") ||
        fileName.endsWith(".csv")) {
      return await blob.text();
    }
    
    if (fileType.includes("sheet") || fileType.includes("excel") ||
        fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      let content = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        content += `\n=== Sheet: ${sheetName} ===\n`;
        content += XLSX.utils.sheet_to_csv(sheet);
      });
      return content;
    }
    
    return `[File: ${fileName}, Type: ${fileType}]`;
  };

  const handleReAnalyze = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    
    try {
      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("project-files")
        .download(file.file_path);

      if (downloadError) throw downloadError;

      // Extract content
      const content = await extractFileContent(fileData, file.file_name, file.file_type || "");

      // Call the analysis function with selected type
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke("analyze-attachment", {
        body: {
          fileContent: content.slice(0, 50000),
          fileName: file.file_name,
          fileType: file.file_type,
          analysisType: selectedType
        }
      });

      if (analysisError) throw analysisError;

      if (analysisResult.error) {
        throw new Error(analysisResult.error);
      }

      // Update the attachment with new analysis result
      const { error: updateError } = await supabase
        .from("project_attachments")
        .update({
          is_analyzed: true,
          analysis_result: {
            ...analysisResult.analysis,
            analysisType: selectedType,
            reanalyzedAt: new Date().toISOString()
          }
        })
        .eq("id", file.id);

      if (updateError) throw updateError;

      toast.success(isArabic ? "تم إعادة تحليل الملف بنجاح" : "File re-analyzed successfully");
      onComplete();
      onClose();
      
    } catch (error: any) {
      console.error("Re-analysis error:", error);
      toast.error(isArabic ? "خطأ في إعادة التحليل" : "Error re-analyzing file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isAnalyzing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            {isArabic ? "إعادة التحليل" : "Re-Analyze File"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر نوع تحليل مختلف للحصول على نتائج جديدة"
              : "Choose a different analysis type for new results"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current File Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm truncate">{file.file_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">
                {file.category}
              </Badge>
              {file.analysis_result?.analysisType && (
                <Badge variant="secondary" className="text-[10px]">
                  {isArabic ? "التحليل السابق:" : "Previous:"} {file.analysis_result.analysisType}
                </Badge>
              )}
            </div>
          </div>

          {/* Analysis Types */}
          <div className="space-y-2">
            <Label>{isArabic ? "نوع التحليل الجديد" : "New Analysis Type"}</Label>
            <ScrollArea className="h-64">
              <RadioGroup value={selectedType} onValueChange={setSelectedType} className="space-y-2">
                {ANALYSIS_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.value}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setSelectedType(type.value)}
                    >
                      <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <Label htmlFor={type.value} className="cursor-pointer font-medium">
                            {isArabic ? type.labelAr : type.labelEn}
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isArabic ? type.descAr : type.descEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleReAnalyze}
              disabled={isAnalyzing}
              className="flex-1 gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? "جاري التحليل..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {isArabic ? "إعادة التحليل" : "Re-Analyze"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
