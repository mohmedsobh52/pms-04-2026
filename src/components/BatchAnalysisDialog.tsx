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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Layers,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { XLSX, xlsxReadAsync } from '@/lib/exceljs-utils';

interface FileToAnalyze {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  category: string | null;
  is_analyzed: boolean | null;
}

interface BatchAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileToAnalyze[];
  onComplete: () => void;
}

interface AnalysisStatus {
  id: string;
  status: "pending" | "analyzing" | "success" | "error";
  error?: string;
}

export function BatchAnalysisDialog({ isOpen, onClose, files, onComplete }: BatchAnalysisDialogProps) {
  const { isArabic } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(files.filter(f => !f.is_analyzed).map(f => f.id))
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatuses, setAnalysisStatuses] = useState<Map<string, AnalysisStatus>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const unanalyzedFiles = files.filter(f => !f.is_analyzed);
  const progress = selectedFiles.size > 0 ? (completedCount / selectedFiles.size) * 100 : 0;
  
  // Count statuses
  const successCount = Array.from(analysisStatuses.values()).filter(s => s.status === "success").length;
  const errorCount = Array.from(analysisStatuses.values()).filter(s => s.status === "error").length;

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
    if (selectedFiles.size === unanalyzedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(unanalyzedFiles.map(f => f.id)));
    }
  };
  
  const toggleErrorExpand = (id: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedErrors(newExpanded);
  };

  const extractFileContent = async (blob: Blob, fileName: string, fileType: string): Promise<string> => {
    let content = "";
    
    try {
      // Handle text files
      if (fileType.includes("text") || fileName.endsWith(".txt") || 
          fileName.endsWith(".json") || fileName.endsWith(".xml") ||
          fileName.endsWith(".csv")) {
        content = await blob.text();
      }
      // Handle Excel files
      else if (fileType.includes("sheet") || fileType.includes("excel") ||
          fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          content += `\n=== Sheet: ${sheetName} ===\n`;
          content += XLSX.utils.sheet_to_csv(sheet);
        });
      }
    } catch (err) {
      console.warn("Content extraction failed for", fileName, err);
    }
    
    // Fallback for empty content (e.g., PDFs, images, or extraction failures)
    if (!content || content.trim().length === 0) {
      content = `[Document: ${fileName}]\n[Type: ${fileType || 'unknown'}]\n[Size: ${blob.size} bytes]\n[Note: Content requires OCR/PDF parsing - metadata-based analysis]`;
    }
    
    return content;
  };

  const analyzeFile = async (file: FileToAnalyze): Promise<boolean> => {
    try {
      // Update status to analyzing
      setAnalysisStatuses(prev => new Map(prev).set(file.id, { id: file.id, status: "analyzing" }));

      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("project-files")
        .download(file.file_path);

      if (downloadError) throw downloadError;

      // Extract content
      const content = await extractFileContent(fileData, file.file_name, file.file_type || "");

      // Determine analysis type
      let analysisType = "extract_data";
      if (file.category === "boq") {
        analysisType = "extract_boq";
      } else if (file.category === "quotations") {
        analysisType = "cost_analysis";
      }

      // Call the analysis function
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke("analyze-attachment", {
        body: {
          fileContent: content.slice(0, 50000),
          fileName: file.file_name,
          fileType: file.file_type,
          analysisType
        }
      });

      if (analysisError) throw analysisError;

      if (analysisResult.error) {
        throw new Error(analysisResult.error);
      }

      // Update the attachment with analysis result
      const { error: updateError } = await supabase
        .from("project_attachments")
        .update({
          is_analyzed: true,
          analysis_result: analysisResult.analysis
        })
        .eq("id", file.id);

      if (updateError) throw updateError;

      // Update status to success
      setAnalysisStatuses(prev => new Map(prev).set(file.id, { id: file.id, status: "success" }));
      return true;

    } catch (error: any) {
      console.error("Analysis error for", file.file_name, error);
      setAnalysisStatuses(prev => new Map(prev).set(file.id, { 
        id: file.id, 
        status: "error",
        error: error.message || "Unknown error"
      }));
      return false;
    }
  };

  const startBatchAnalysis = async () => {
    if (selectedFiles.size === 0) {
      toast.error(isArabic ? "يرجى اختيار ملف واحد على الأقل" : "Please select at least one file");
      return;
    }

    setIsAnalyzing(true);
    setCompletedCount(0);
    
    // Initialize all statuses as pending
    const initialStatuses = new Map<string, AnalysisStatus>();
    selectedFiles.forEach(id => {
      initialStatuses.set(id, { id, status: "pending" });
    });
    setAnalysisStatuses(initialStatuses);

    const filesToAnalyze = unanalyzedFiles.filter(f => selectedFiles.has(f.id));
    let successCount = 0;
    let errorCount = 0;

    // Process files sequentially to avoid rate limiting
    for (let i = 0; i < filesToAnalyze.length; i++) {
      setCurrentIndex(i);
      const file = filesToAnalyze[i];
      
      const success = await analyzeFile(file);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      setCompletedCount(i + 1);
      
      // Add small delay between requests to avoid rate limiting
      if (i < filesToAnalyze.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsAnalyzing(false);
    
    if (successCount > 0) {
      toast.success(
        isArabic 
          ? `تم تحليل ${successCount} من ${filesToAnalyze.length} ملفات بنجاح`
          : `Successfully analyzed ${successCount} of ${filesToAnalyze.length} files`
      );
    }
    
    if (errorCount > 0) {
      toast.error(
        isArabic
          ? `فشل تحليل ${errorCount} ملفات`
          : `Failed to analyze ${errorCount} files`
      );
    }

    onComplete();
  };

  const getStatusIcon = (status: AnalysisStatus["status"]) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "analyzing": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error": return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: AnalysisStatus["status"]) => {
    const styles = {
      pending: "bg-muted text-muted-foreground",
      analyzing: "bg-blue-500/10 text-blue-600",
      success: "bg-green-500/10 text-green-600",
      error: "bg-red-500/10 text-red-600",
    };
    const labels = {
      pending: isArabic ? "في الانتظار" : "Pending",
      analyzing: isArabic ? "جاري التحليل" : "Analyzing",
      success: isArabic ? "تم" : "Done",
      error: isArabic ? "خطأ" : "Error",
    };
    return <Badge variant="outline" className={styles[status]}>{labels[status]}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isAnalyzing && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isArabic ? "تحليل مجموعة ملفات" : "Batch File Analysis"}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {isArabic
                  ? "تحليل الملفات باستخدام الذكاء الاصطناعي"
                  : "Analyzing files with AI"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Progress Section */}
          {isAnalyzing && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {isArabic 
                      ? `جاري تحليل ${completedCount + 1} من ${selectedFiles.size}...`
                      : `Analyzing ${completedCount + 1} of ${selectedFiles.size}...`
                    }
                  </span>
                </div>
                <span className="text-lg font-bold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-3"
              />
              {/* Status summary during analysis */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" /> {successCount} {isArabic ? "ناجح" : "done"}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-3 h-3" /> {errorCount} {isArabic ? "فشل" : "failed"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Select All */}
          {!isAnalyzing && (
            <div className="flex items-center gap-2 pb-3 border-b">
              <Checkbox
                id="select-all-batch"
                checked={selectedFiles.size === unanalyzedFiles.length && unanalyzedFiles.length > 0}
                onCheckedChange={toggleAll}
              />
              <Label htmlFor="select-all-batch" className="cursor-pointer font-medium">
                {isArabic ? "تحديد الكل" : "Select All"} 
                <Badge variant="secondary" className="ml-2">{unanalyzedFiles.length}</Badge>
              </Label>
            </div>
          )}

          {/* File List */}
          <ScrollArea className="h-72">
            <div className="space-y-1 pr-2">
              {unanalyzedFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500/50" />
                  <p className="font-medium">{isArabic ? "جميع الملفات تم تحليلها" : "All files are already analyzed"}</p>
                </div>
              ) : (
                unanalyzedFiles.map((file) => {
                  const status = analysisStatuses.get(file.id);
                  const hasError = status?.status === "error";
                  const isExpanded = expandedErrors.has(file.id);
                  
                  return (
                    <div key={file.id} className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isAnalyzing ? "bg-muted/20" : "hover:bg-muted/50 cursor-pointer",
                          hasError && "bg-red-500/5 border border-red-500/20"
                        )}
                        onClick={() => !isAnalyzing && toggleFile(file.id)}
                      >
                        {!isAnalyzing && (
                          <Checkbox
                            id={file.id}
                            checked={selectedFiles.has(file.id)}
                            onCheckedChange={() => toggleFile(file.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        
                        {isAnalyzing && status && (
                          <div className="flex-shrink-0">
                            {getStatusIcon(status.status)}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className={cn(
                              "text-sm font-medium truncate",
                              hasError && "text-red-700 dark:text-red-400"
                            )}>
                              {file.file_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {file.category || "general"}
                            </Badge>
                            {hasError && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleErrorExpand(file.id); }}
                                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      {isArabic ? "عرض الخطأ" : "Show error"}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-sm">
                                    <p className="text-xs">{status?.error}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        
                        {isAnalyzing && status && (
                          <div className="flex-shrink-0">
                            {getStatusBadge(status.status)}
                          </div>
                        )}
                      </div>
                      
                      {/* Expanded error message */}
                      {hasError && isExpanded && (
                        <div className="mx-3 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div className="break-words whitespace-pre-wrap">
                              {status?.error || (isArabic ? "خطأ غير معروف" : "Unknown error")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

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
              onClick={startBatchAnalysis}
              disabled={isAnalyzing || selectedFiles.size === 0}
              className="flex-1 gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? "جاري التحليل..." : "Analyzing..."}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {isArabic ? `تحليل ${selectedFiles.size} ملفات` : `Analyze ${selectedFiles.size} Files`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
