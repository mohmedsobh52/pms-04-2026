import { useState } from "react";
import { Sparkles, FileText, Image, FileSpreadsheet, File, Loader2, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UploadedFile } from "./FastExtractionUploader";
import { classifyFilesLocally } from "@/lib/local-file-classification";

const categories = [
  { id: "boq", labelEn: "BOQ", labelAr: "جدول الكميات", color: "bg-blue-500" },
  { id: "drawings", labelEn: "Drawings", labelAr: "رسومات", color: "bg-purple-500" },
  { id: "specifications", labelEn: "Specifications", labelAr: "مواصفات", color: "bg-orange-500" },
  { id: "contracts", labelEn: "Contracts", labelAr: "عقود", color: "bg-red-500" },
  { id: "quotations", labelEn: "Quotations", labelAr: "عروض أسعار", color: "bg-green-500" },
  { id: "reports", labelEn: "Reports", labelAr: "تقارير", color: "bg-yellow-500" },
  { id: "schedules", labelEn: "Schedules", labelAr: "جداول زمنية", color: "bg-cyan-500" },
  { id: "general", labelEn: "General", labelAr: "عام", color: "bg-gray-500" },
];

const getFileIcon = (type: string) => {
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes("image")) return <Image className="h-5 w-5 text-blue-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
};

interface FastExtractionClassifierProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onComplete: () => void;
}

export default function FastExtractionClassifier({
  files,
  onFilesChange,
  onComplete,
}: FastExtractionClassifierProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [isClassifying, setIsClassifying] = useState(false);

  const successFiles = files.filter((f) => f.status === "success");
  const allClassified = successFiles.every((f) => f.category);

  const handleCategoryChange = (fileId: string, category: string) => {
    onFilesChange(
      files.map((f) => (f.id === fileId ? { ...f, category } : f))
    );
  };

  // Apply local classification results to files
  const applyLocalClassification = (filesToClassify: { fileName: string; fileType: string }[]) => {
    const localResults = classifyFilesLocally(filesToClassify);
    const updatedFiles = files.map((f) => {
      const classification = localResults.find((c) => c.fileName === f.name);
      return classification ? { ...f, category: classification.category } : f;
    });
    onFilesChange(updatedFiles);
    return localResults.length;
  };

  // Quick local classification without AI
  const handleQuickClassify = () => {
    const filesToClassify = successFiles.map((f) => ({
      fileName: f.name,
      fileType: f.type,
    }));
    
    const count = applyLocalClassification(filesToClassify);
    toast.success(
      isArabic 
        ? `تم تصنيف ${count} ملفات بناءً على أسماء الملفات` 
        : `Classified ${count} files based on filenames`
    );
  };

  const handleAutoClassify = async () => {
    setIsClassifying(true);
    const filesToClassify = successFiles.map((f) => ({
      fileName: f.name,
      fileType: f.type,
    }));

    try {
      const { data, error } = await supabase.functions.invoke("classify-files", {
        body: { files: filesToClassify, language },
      });

      if (error) {
        // Check for specific error codes in the error object
        const errorMessage = error.message || '';
        const errorContext = JSON.stringify(error.context || {});
        
        // Check for 402 (AI credits exhausted)
        if (errorMessage.includes('402') || errorMessage.includes('credits') || errorContext.includes('402')) {
          toast.warning(
            isArabic 
              ? "نفد رصيد AI - يتم استخدام التصنيف المحلي" 
              : "AI credits exhausted - using local classification"
          );
          applyLocalClassification(filesToClassify);
          return;
        }
        
        // Check for 429 (Rate limit)
        if (errorMessage.includes('429') || errorMessage.includes('rate') || errorContext.includes('429')) {
          toast.error(
            isArabic 
              ? "تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً" 
              : "Rate limit exceeded. Please try again later"
          );
          return;
        }
        
        throw error;
      }

      if (data?.classifications) {
        const updatedFiles = files.map((f) => {
          const classification = data.classifications.find(
            (c: { fileName: string; category: string }) => c.fileName === f.name
          );
          return classification ? { ...f, category: classification.category } : f;
        });
        onFilesChange(updatedFiles);
        toast.success(isArabic ? "تم تصنيف الملفات بنجاح" : "Files classified successfully");
      }
    } catch (error: any) {
      console.error("Classification error:", error);
      
      // Additional error handling for edge cases
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('402') || errorMessage.includes('credits')) {
        toast.warning(
          isArabic 
            ? "نفد رصيد AI - يتم استخدام التصنيف المحلي" 
            : "AI credits exhausted - using local classification"
        );
        applyLocalClassification(filesToClassify);
        return;
      }
      
      if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        toast.error(
          isArabic 
            ? "تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً" 
            : "Rate limit exceeded. Please try again later"
        );
        return;
      }
      
      // Fallback to local classification on any error
      toast.warning(
        isArabic 
          ? "فشل التصنيف التلقائي - يتم استخدام التصنيف المحلي" 
          : "Auto-classification failed - using local classification"
      );
      applyLocalClassification(filesToClassify);
    } finally {
      setIsClassifying(false);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {isArabic ? "تصنيف الملفات" : "Classify Files"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? "صنّف كل ملف يدوياً أو استخدم التصنيف التلقائي"
              : "Classify each file manually or use auto-classification"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleQuickClassify}
            variant="outline"
            disabled={isClassifying || successFiles.length === 0}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            {isArabic ? "تصنيف سريع" : "Quick Classify"}
          </Button>
          <Button
            onClick={handleAutoClassify}
            disabled={isClassifying || successFiles.length === 0}
            className="gap-2"
          >
            {isClassifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isArabic ? "تصنيف تلقائي (AI)" : "Auto Classify (AI)"}
          </Button>
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {successFiles.map((file) => {
          const categoryInfo = file.category ? getCategoryInfo(file.category) : null;

          return (
            <div
              key={file.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {categoryInfo && (
                  <Badge
                    variant="secondary"
                    className={cn("text-white", categoryInfo.color)}
                  >
                    {isArabic ? categoryInfo.labelAr : categoryInfo.labelEn}
                  </Badge>
                )}
                <Select
                  value={file.category || ""}
                  onValueChange={(value) => handleCategoryChange(file.id, value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue
                      placeholder={isArabic ? "اختر التصنيف" : "Select category"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {isArabic ? cat.labelAr : cat.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {isArabic
            ? `${successFiles.filter((f) => f.category).length} من ${successFiles.length} ملفات مصنفة`
            : `${successFiles.filter((f) => f.category).length} of ${successFiles.length} files classified`}
        </p>
        <Button onClick={onComplete} disabled={!allClassified}>
          {isArabic ? "التالي" : "Next"}
        </Button>
      </div>
    </div>
  );
}
