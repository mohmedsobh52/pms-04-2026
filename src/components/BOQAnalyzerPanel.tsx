import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, Loader2, CheckCircle2, AlertTriangle, Save, Sparkles, Edit3, Upload, FileText, FileSpreadsheet, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { WorkflowStatus, defaultWorkflowSteps, type WorkflowStep, type StepStatus } from "@/components/WorkflowStatus";
import { AnalysisResults } from "@/components/AnalysisResults";
import { SaveProjectDialog } from "@/components/SaveProjectDialog";
import { ExcelDataPreview } from "@/components/ExcelDataPreview";
import { AnalysisErrorCard, detectAnalysisErrorType, type AnalysisErrorInfo } from "@/components/AnalysisErrorCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useAnalysisTracking } from "@/hooks/useAnalysisTracking";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF, validateExtractedText, extractWithOCROnly } from "@/lib/pdf-utils";
import { extractDataFromExcel, formatExcelDataForAnalysis, type ExcelBOQItem } from "@/lib/excel-utils";
import { performLocalExcelAnalysis, shouldOfferAIEnrichment } from "@/lib/local-excel-analysis";
import { performLocalTextAnalysis, shouldUseAIForText, textContainsBOQData } from "@/lib/local-text-analysis";

function isExcelFile(file: File): boolean {
  return file.type.includes('spreadsheet') || file.type.includes('excel') || 
         file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
}

function getFileIcon(file: File) {
  const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || 
                  file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  return isExcel ? FileSpreadsheet : FileText;
}

interface BOQAnalyzerPanelProps {
  onProjectSaved?: (projectId: string) => void;
  embedded?: boolean;
  initialFile?: File;
}

export function BOQAnalyzerPanel({ onProjectSaved, embedded = false, initialFile }: BOQAnalyzerPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, isArabic, t } = useLanguage();
  const { toast } = useToast();
  const { selectedProvider } = useAnalysisTracking();
  
  const { 
    analysisData, 
    wbsData,
    setAnalysisData, 
    setWbsData,
  } = useAnalysisData();
  
  // Local state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "success" | "failed">("idle");
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [excelProgress, setExcelProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Excel items for local analysis
  const [excelItems, setExcelItems] = useState<ExcelBOQItem[]>([]);
  const [excelRawData, setExcelRawData] = useState<(string | number | undefined)[][] | undefined>();
  const [excelHeaderRow, setExcelHeaderRow] = useState<number>(0);
  const [excelColumnMapping, setExcelColumnMapping] = useState<Record<string, number>>({});
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [showAIEnrichmentOption, setShowAIEnrichmentOption] = useState(false);
  
  // Save dialog
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  
  // Workflow and error
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(defaultWorkflowSteps);
  const [analysisError, setAnalysisError] = useState<AnalysisErrorInfo | null>(null);

  // Auto-set file from drag-and-drop on parent
  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
    }
  }, [initialFile]);

  const updateStepStatus = (stepId: string, status: StepStatus, progress?: number) => {
    setWorkflowSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status, progress: progress ?? (status === 'complete' ? 100 : step.progress) } : step
      )
    );
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFileSelect(file);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    updateStepStatus("upload", "complete");
    setIsExtracting(true);
    setExtractionStatus("extracting");
    
    if (isExcelFile(file)) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const isLargeFile = file.size > 1024 * 1024;
      
      toast({
        title: isLargeFile ? t('readingLargeExcel') : t('readingExcel'),
        description: isLargeFile 
          ? `${t('excelFileSizeMB')}: ${fileSizeMB} MB - ${t('excelParsingData')}`
          : t('pleaseWait'),
        duration: isLargeFile ? 10000 : 5000,
      });
      
      try {
        const result = await extractDataFromExcel(file, (stage, progress, message) => {
          setExcelProgress({ stage, progress, message: message || '' });
        });
        setExcelProgress(null);
        const formattedText = formatExcelDataForAnalysis(result);

        const hasAnyData =
          result.items.length > 0 ||
          (result.text && result.text.trim().length > 20) ||
          result.totalRows > 3 ||
          formattedText.trim().length > 20;

        if (hasAnyData) {
          setExtractedText(formattedText);
          setExcelItems(result.items);
          setExcelRawData(result.rawData);
          setExcelHeaderRow(result.detectedHeaderRow || 0);
          setExcelColumnMapping(result.columnMapping || {});
          setExtractionStatus("success");
          updateStepStatus("extract", "complete");
          toast({
            title: t('dataExtracted'),
            description: `${result.items.length} ${t('itemsExtracted')} ${result.sheetNames.length} ${t('sheets')}`,
          });
          
          if (result.items.length > 0) {
            setShowExcelPreview(true);
          }
        } else {
          setExtractionStatus("failed");
          setShowManualInput(true);
          toast({
            title: t('noDataFound'),
            description: t('checkBOQTable'),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Excel extraction error:", error);
        setExtractionStatus("failed");
        setShowManualInput(true);
        toast({
          title: t('excelReadFailed'),
          description: error instanceof Error ? error.message : t('unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setIsExtracting(false);
      }
      return;
    }
    
    // Handle PDF files
    toast({
      title: t('extractingPDF'),
      description: t('extractingPDFDesc'),
    });
    
    try {
      const text = await extractTextFromPDF(file, {
        onProgress: (current, total) => {
          setPdfProgress({ current, total });
        }
      });
      setPdfProgress(null);
      const validation = validateExtractedText(text);
      
      if (validation.isBinary) {
        setExtractionStatus("failed");
        setShowManualInput(true);
        toast({
          title: t('cannotReadFile'),
          description: t('scannedPDF'),
          variant: "destructive",
        });
      } else if (validation.isValid) {
        setExtractedText(text);
        setExtractionStatus("success");
        updateStepStatus("extract", "complete");
        toast({
          title: t('textExtracted'),
          description: `${validation.wordCount} ${t('wordsExtracted')} ${file.name}`,
        });
      } else {
        setExtractionStatus("failed");
        setShowManualInput(true);
        const cleanText = text.includes("[فشل") || text.includes("[تعذر") ? "" : text;
        setManualText(cleanText);
        toast({
          title: t('partialExtraction'),
          description: `${validation.issues.join(" - ")}. ${t('reviewOrManual')}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Extraction error:", error);
      setExtractionStatus("failed");
      setShowManualInput(true);
      toast({
        title: t('extractionFailed2'),
        description: t('copyManually'),
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  }, [toast, t]);

  const handleClearFile = () => {
    setSelectedFile(null);
    setExtractedText("");
    setManualText("");
    setShowManualInput(false);
    setIsExtracting(false);
    setExtractionStatus("idle");
    setIsOCRProcessing(false);
    setOcrProgress(null);
    setPdfProgress(null);
    setAnalysisData(null);
    setWbsData(null);
    setWorkflowSteps(defaultWorkflowSteps);
    setExcelItems([]);
    setExcelRawData(undefined);
    setExcelHeaderRow(0);
    setExcelColumnMapping({});
    setShowAIEnrichmentOption(false);
    setAnalysisError(null);
  };

  const handleOCRExtraction = async () => {
    if (!selectedFile) return;
    
    setIsOCRProcessing(true);
    setOcrProgress({ current: 0, total: 1 });
    
    toast({
      title: t('ocrExtracting'),
      description: t('ocrAnalyzingImages'),
    });
    
    try {
      const text = await extractWithOCROnly(selectedFile, (current, total) => {
        setOcrProgress({ current, total });
      });
      
      const validation = validateExtractedText(text);
      
      if (validation.isValid || text.length > 100) {
        setExtractedText(text);
        setExtractionStatus("success");
        updateStepStatus("extract", "complete");
        toast({
          title: t('ocrSuccess'),
          description: `${validation.wordCount} ${t('wordsExtracted')} ${selectedFile.name}`,
        });
      } else {
        setManualText(text);
        setShowManualInput(true);
        toast({
          title: t('ocrPartial'),
          description: t('ocrReview'),
        });
      }
    } catch (error) {
      console.error("OCR extraction error:", error);
      toast({
        title: t('ocrFailed'),
        description: error instanceof Error ? error.message : t('ocrError'),
        variant: "destructive",
      });
    } finally {
      setIsOCRProcessing(false);
      setOcrProgress(null);
    }
  };

  const handleManualTextSubmit = () => {
    if (manualText.trim().length < 50) {
      toast({
        title: t('textTooShort'),
        description: t('enterLongerText'),
        variant: "destructive",
      });
      return;
    }
    setExtractedText(manualText);
    updateStepStatus("extract", "complete");
    toast({
      title: t('textSaved'),
      description: `${manualText.length} ${t('charsSaved')}`,
    });
  };

  const runAnalysis = async () => {
    const rawText = extractedText || manualText;
    setAnalysisError(null);
    
    if (!rawText || rawText.length < 50) {
      toast({
        title: t('notEnoughText'),
        description: t('enterBOQForAnalysis'),
        variant: "destructive",
      });
      return;
    }

    const isExcel = selectedFile && isExcelFile(selectedFile);
    
    // Local Excel analysis first
    if (isExcel && excelItems.length > 0) {
      setIsProcessing(true);
      updateStepStatus("analyze", "processing", 20);
      
      toast({
        title: isArabic ? '⚡ تحليل فوري' : '⚡ Instant Analysis',
        description: isArabic ? 'جاري تحليل البيانات محلياً...' : 'Analyzing data locally...',
      });
      
      try {
        const localResult = performLocalExcelAnalysis(excelItems, selectedFile?.name);
        
        const normalizedItems = localResult.items.map(item => ({
          ...item,
          remarks: item.validation?.issues.length ? item.validation.issues.join('; ') : undefined,
        }));
        
        const analysisResult = {
          items: normalizedItems,
          summary: {
            total_items: localResult.summary.total_items,
            total_value: localResult.summary.total_value,
            currency: localResult.summary.currency,
            categories: localResult.summary.categories,
            quality_score: localResult.summary.quality_score,
          },
          analysis_type: 'local_excel',
          analysis_date: localResult.analysis_date,
        };
        
        setAnalysisData(analysisResult);
        updateStepStatus("analyze", "complete", 100);
        updateStepStatus("wbs", "complete");
        updateStepStatus("export", "complete");
        
        toast({
          title: isArabic ? '✅ اكتمل التحليل' : '✅ Analysis Complete',
          description: isArabic 
            ? `${localResult.summary.total_items} بند - جودة ${localResult.summary.quality_score}%`
            : `${localResult.summary.total_items} items - Quality ${localResult.summary.quality_score}%`,
          duration: 5000,
        });
        
        if (shouldOfferAIEnrichment(localResult)) {
          setShowAIEnrichmentOption(true);
        }
        
        setIsProcessing(false);
        return;
      } catch (localError) {
        console.error('Local Excel analysis error:', localError);
        toast({
          title: isArabic ? 'التبديل للتحليل بالـ AI' : 'Switching to AI Analysis',
          description: isArabic ? 'فشل التحليل المحلي...' : 'Local analysis failed...',
        });
      }
    }

    // Local text analysis for non-Excel
    const hasBoqIndicators = textContainsBOQData(rawText);
    
    if (!isExcel && hasBoqIndicators && rawText.length < 150000) {
      setIsProcessing(true);
      updateStepStatus("analyze", "processing", 15);
      
      try {
        const localTextResult = performLocalTextAnalysis(rawText, { fileName: selectedFile?.name });
        
        if (localTextResult.items.length >= 5 && !shouldUseAIForText(localTextResult)) {
          const analysisResult = {
            items: localTextResult.items,
            summary: localTextResult.summary,
            analysis_type: 'local_text',
            analysis_date: localTextResult.analysis_date,
          };
          
          setAnalysisData(analysisResult);
          updateStepStatus("analyze", "complete", 100);
          updateStepStatus("wbs", "complete");
          updateStepStatus("export", "complete");
          
          toast({
            title: isArabic ? '✅ اكتمل التحليل' : '✅ Analysis Complete',
            description: `${localTextResult.summary.total_items} ${isArabic ? 'بند' : 'items'}`,
          });
          
          setIsProcessing(false);
          return;
        }
      } catch (localTextError) {
        console.warn('Local text analysis error:', localTextError);
      }
    }

    // AI Analysis
    setIsProcessing(true);
    updateStepStatus("analyze", "processing", 10);

    try {
      const { data: itemsResult, error: itemsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: rawText, analysis_type: "extract_items", language, preferred_provider: selectedProvider }
      });

      if (itemsError) throw itemsError;
      if (itemsResult.error) throw new Error(itemsResult.error);

      const normalizedItems = (itemsResult.items || []).map((item: any) => {
        const unitPrice = item.unit_price ?? item.rate ?? 0;
        const quantity = item.quantity ?? 1;
        const totalPrice = item.total_price ?? item.amount ?? (unitPrice * quantity);
        
        return {
          ...item,
          item_number: item.item_number || item.item_no || '',
          unit_price: unitPrice,
          quantity,
          total_price: totalPrice,
          category: item.category || 'غير مصنف',
          unit: item.unit || 'م',
        };
      }).filter((item: any) => item.item_number);

      const normalizedResult = {
        ...itemsResult,
        items: normalizedItems,
        summary: {
          ...itemsResult.summary,
          total_items: normalizedItems.length,
          total_value: itemsResult.summary?.total_value || 
            normalizedItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0),
          currency: itemsResult.summary?.currency || 'SAR',
        }
      };

      setAnalysisData(normalizedResult);
      updateStepStatus("analyze", "complete", 100);

      toast({
        title: t('analysisSuccess'),
        description: `${normalizedItems.length} ${t('itemsExtracted2')}`,
      });

      // Create WBS
      updateStepStatus("wbs", "processing", 30);
      
      const { data: wbsResult, error: wbsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: rawText, analysis_type: "create_wbs", language, preferred_provider: selectedProvider }
      });

      if (!wbsError && !wbsResult.error) {
        setWbsData(wbsResult);
      }
      
      updateStepStatus("wbs", "complete");
      updateStepStatus("export", "complete");

    } catch (error: any) {
      console.error("Analysis error:", error);
      updateStepStatus("analyze", "error");
      
      setAnalysisError({
        type: detectAnalysisErrorType(error),
        message: error?.message || '',
        timestamp: new Date(),
      });
      
      toast({
        title: t('analysisError'),
        description: error?.message || t('unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProjectSaved = (projectId: string) => {
    setSavedProjectId(projectId);
    onProjectSaved?.(projectId);
    toast({
      title: isArabic ? 'تم حفظ المشروع' : 'Project Saved',
      description: isArabic ? 'يمكنك الآن مشاهدته في قائمة المشاريع' : 'You can now view it in the projects list',
    });
  };

  const handleExcelPreviewConfirm = (confirmedItems: ExcelBOQItem[]) => {
    setExcelItems(confirmedItems);
    setShowExcelPreview(false);
    // Auto-run analysis after confirmation
    setTimeout(() => runAnalysis(), 100);
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile) : FileText;

  return (
    <div className={embedded ? "" : "space-y-6"}>
      {/* File Upload */}
      {!selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              {isArabic ? 'رفع ملف BOQ' : 'Upload BOQ File'}
            </CardTitle>
            <CardDescription>
              {isArabic 
                ? 'قم برفع ملف PDF أو Excel يحتوي على جدول الكميات للتحليل'
                : 'Upload a PDF or Excel file containing the Bill of Quantities for analysis'}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-[55]">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {isArabic ? 'اسحب الملف هنا أو انقر للرفع' : 'Drag file here or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isArabic ? 'يدعم ملفات PDF و Excel' : 'Supports PDF and Excel files'}
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Status */}
      {selectedFile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileIcon className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{selectedFile.name}</span>
              {extractionStatus === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {extractionStatus === "failed" && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            </div>
            <Button variant="outline" size="sm" onClick={handleClearFile}>
              <X className="w-4 h-4 me-1" />
              {isArabic ? 'ملف آخر' : 'Different File'}
            </Button>
          </div>
          
          <WorkflowStatus steps={workflowSteps} />
          
          {/* Progress indicators */}
          {pdfProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{isArabic ? 'استخراج الصفحات...' : 'Extracting pages...'}</span>
                <span>{pdfProgress.current}/{pdfProgress.total}</span>
              </div>
              <Progress value={(pdfProgress.current / pdfProgress.total) * 100} />
            </div>
          )}
          
          {excelProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{excelProgress.message || excelProgress.stage}</span>
                <span>{excelProgress.progress}%</span>
              </div>
              <Progress value={excelProgress.progress} />
            </div>
          )}
        </div>
      )}

      {/* Manual Input */}
      {showManualInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              {isArabic ? 'إدخال يدوي' : 'Manual Input'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={isArabic ? 'الصق نص جدول الكميات هنا...' : 'Paste BOQ text here...'}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button onClick={handleManualTextSubmit}>
                {isArabic ? 'حفظ النص' : 'Save Text'}
              </Button>
              {selectedFile && !isOCRProcessing && (
                <Button variant="outline" onClick={handleOCRExtraction}>
                  {isArabic ? 'استخراج OCR' : 'OCR Extraction'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Error */}
      {analysisError && (
        <AnalysisErrorCard
          error={analysisError}
          onRetry={runAnalysis}
          onDismiss={() => setAnalysisError(null)}
          showLoginButton={!user}
          onLoginClick={() => navigate('/auth')}
        />
      )}

      {/* Analyze Button */}
      {(extractedText || manualText) && !analysisData && !isProcessing && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {isArabic 
              ? `${Math.round((extractedText || manualText).length / 1000)}K حرف جاهز للتحليل`
              : `${Math.round((extractedText || manualText).length / 1000)}K characters ready for analysis`}
          </div>
          <Button 
            size="lg" 
            onClick={runAnalysis}
            className="gap-2"
          >
            <Sparkles className="w-5 h-5" />
            {isArabic ? 'بدء التحليل' : 'Start Analysis'}
          </Button>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <Card className="border-primary/50">
          <CardContent className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">
              {isArabic ? 'جاري التحليل...' : 'Analyzing...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'يرجى الانتظار، قد يستغرق ذلك بضع دقائق' : 'Please wait, this may take a few minutes'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisData && (
        <div className="space-y-4">
          {/* AI Enrichment Option */}
          {showAIEnrichmentOption && (
            <Alert>
              <Sparkles className="w-4 h-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {isArabic 
                    ? 'يمكنك تحسين التصنيفات باستخدام الذكاء الاصطناعي'
                    : 'You can improve categories using AI'}
                </span>
                <Button size="sm" variant="outline" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  {isArabic ? 'تحسين بالـ AI' : 'Enhance with AI'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <AnalysisResults 
            data={analysisData}
            wbsData={wbsData}
            fileName={selectedFile?.name}
            onApplyRate={() => {}}
          />
          
          {/* Save Project Button */}
          <div className="flex justify-center gap-4">
            <SaveProjectDialog
              analysisData={analysisData}
              wbsData={wbsData}
              fileName={selectedFile?.name}
              onSaved={handleProjectSaved}
            />
          </div>
        </div>
      )}

      {/* Excel Preview Dialog */}
      {showExcelPreview && excelItems.length > 0 && (
        <ExcelDataPreview
          isOpen={showExcelPreview}
          onClose={() => setShowExcelPreview(false)}
          items={excelItems}
          rawData={excelRawData}
          detectedHeaderRow={excelHeaderRow}
          columnMapping={excelColumnMapping}
          onConfirm={handleExcelPreviewConfirm}
          fileName={selectedFile?.name}
        />
      )}
    </div>
  );
}
