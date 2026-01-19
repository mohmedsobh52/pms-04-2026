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
  Layers,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  AlertCircle
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

  const unanalyzedFiles = files.filter(f => !f.is_analyzed);
  const progress = selectedFiles.size > 0 ? (completedCount / selectedFiles.size) * 100 : 0;

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

  const extractFileContent = async (blob: Blob, fileName: string, fileType: string): Promise<string> => {
    // Handle text files
    if (fileType.includes("text") || fileName.endsWith(".txt") || 
        fileName.endsWith(".json") || fileName.endsWith(".xml") ||
        fileName.endsWith(".csv")) {
      return await blob.text();
    }
    
    // Handle Excel files
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            {isArabic ? "تحليل مجموعة ملفات" : "Batch File Analysis"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر الملفات التي تريد تحليلها دفعة واحدة"
              : "Select files to analyze in batch"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isArabic 
                    ? `جاري تحليل ${completedCount + 1} من ${selectedFiles.size}...`
                    : `Analyzing ${completedCount + 1} of ${selectedFiles.size}...`
                  }
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Select All */}
          {!isAnalyzing && (
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                id="select-all-batch"
                checked={selectedFiles.size === unanalyzedFiles.length && unanalyzedFiles.length > 0}
                onCheckedChange={toggleAll}
              />
              <Label htmlFor="select-all-batch" className="cursor-pointer">
                {isArabic ? "تحديد الكل" : "Select All"} ({unanalyzedFiles.length})
              </Label>
            </div>
          )}

          {/* File List */}
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {unanalyzedFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>{isArabic ? "جميع الملفات تم تحليلها" : "All files are already analyzed"}</p>
                </div>
              ) : (
                unanalyzedFiles.map((file) => {
                  const status = analysisStatuses.get(file.id);
                  
                  return (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        isAnalyzing ? "bg-muted/30" : "hover:bg-muted/50"
                      )}
                    >
                      {!isAnalyzing && (
                        <Checkbox
                          id={file.id}
                          checked={selectedFiles.has(file.id)}
                          onCheckedChange={() => toggleFile(file.id)}
                        />
                      )}
                      
                      {isAnalyzing && status && (
                        <div className="flex-shrink-0">
                          {getStatusIcon(status.status)}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <Label 
                          htmlFor={file.id} 
                          className={cn(
                            "cursor-pointer text-sm font-medium truncate block",
                            isAnalyzing && "cursor-default"
                          )}
                        >
                          {file.file_name}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {file.category}
                          </Badge>
                          {status?.error && (
                            <span className="text-xs text-red-500 truncate">
                              {status.error.slice(0, 30)}...
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isAnalyzing && status && (
                        <div className="flex-shrink-0">
                          {getStatusBadge(status.status)}
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
