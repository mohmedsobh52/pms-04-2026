import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileUp, Sparkles, Download, FileText, Edit3, Loader2, CheckCircle2, AlertTriangle, LogIn, LogOut, Save, User, Receipt, Scale, ScanLine, FileStack, Calendar, GitCompare, Bell, LayoutDashboard, Package, MoreHorizontal, Share2, FolderOpen, ChevronDown, Paperclip, Users, Copy, Settings2, FileSpreadsheet, Clock, Layers } from "lucide-react";
import { PMSLogo } from "@/components/PMSLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { FileUpload } from "@/components/FileUpload";
import { WorkflowStatus, defaultWorkflowSteps, type WorkflowStep, type StepStatus } from "@/components/WorkflowStatus";
import { AnalysisResults } from "@/components/AnalysisResults";
import { SavedProjects } from "@/components/SavedProjects";
import { SaveProjectDialog } from "@/components/SaveProjectDialog";
import { LocalProjectManager } from "@/components/LocalProjectManager";
import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { ComprehensiveReport } from "@/components/ComprehensiveReport";
import { BOQComparison } from "@/components/BOQComparison";
import { BOQVersionComparison } from "@/components/BOQVersionComparison";
import { ShareAnalysis } from "@/components/ShareAnalysis";
import { P6Export } from "@/components/P6Export";
import { KPIDashboard } from "@/components/KPIDashboard";
import { NotificationSettings } from "@/components/NotificationSettings";
import { MainDashboard } from "@/components/MainDashboard";
import { MainDashboardOverview } from "@/components/MainDashboardOverview";
import { P6ExportDialog } from "@/components/P6ExportDialog";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ProcurementResourcesSchedule } from "@/components/ProcurementResourcesSchedule";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { DualHorizontalScrollBar } from "@/components/DualHorizontalScrollBar";
import { EnhancedKPIDashboard } from "@/components/EnhancedKPIDashboard";
import { SubcontractorBOQLink } from "@/components/SubcontractorBOQLink";
import { ContractNotifications } from "@/components/ContractNotifications";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { SubcontractorManagement } from "@/components/SubcontractorManagement";
import { BOQTemplates } from "@/components/BOQTemplates";
import { AnalysisSettingsDialog, getAnalysisSettings, type AnalysisSettings } from "@/components/AnalysisSettingsDialog";
import { ConnectionErrorDialog, detectErrorType, type ConnectionError } from "@/components/ConnectionErrorDialog";
import { ChunkedAnalysisProgress } from "@/components/ChunkedAnalysisProgress";
import { ChunkedAnalysisPanel } from "@/components/ChunkedAnalysisPanel";
import { AnalysisStatusPanel, useAnalysisStatus } from "@/components/AnalysisStatusPanel";
import { AnalysisErrorCard, detectAnalysisErrorType, type AnalysisErrorInfo } from "@/components/AnalysisErrorCard";
import { AIMonitoringDashboard } from "@/components/AIMonitoringDashboard";
import { useChunkedAnalysis, compressText } from "@/hooks/useChunkedAnalysis";
import { EstimatedAnalysisTime } from "@/components/EstimatedAnalysisTime";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useAnalysisTracking } from "@/hooks/useAnalysisTracking";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF, validateExtractedText, extractWithOCROnly } from "@/lib/pdf-utils";
import { extractDataFromExcel, formatExcelDataForAnalysis } from "@/lib/excel-utils";

function isExcelFile(file: File): boolean {
  return file.type.includes('spreadsheet') || file.type.includes('excel') || 
         file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { language, isArabic, t } = useLanguage();
  
  // Use global analysis context for data persistence
  const { 
    analysisData, 
    wbsData, 
    extractedText: contextExtractedText, 
    selectedFile: contextSelectedFile,
    setAnalysisData, 
    setWbsData, 
    setExtractedText: setContextExtractedText,
    setSelectedFile: setContextSelectedFile,
    clearAll: clearContextData
  } = useAnalysisData();
  
  // Local state that doesn't need persistence
  const [selectedFile, setSelectedFile] = useState<File | null>(contextSelectedFile);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>(contextExtractedText);
  const [manualText, setManualText] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "success" | "failed">(
    contextExtractedText ? "success" : "idle"
  );
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [excelProgress, setExcelProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [showBOQComparison, setShowBOQComparison] = useState(false);
  const [showP6Export, setShowP6Export] = useState(false);
  const [showComprehensiveReport, setShowComprehensiveReport] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const tabsRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(() => {
    // Initialize workflow steps based on existing data
    if (analysisData) {
      return defaultWorkflowSteps.map(step => ({ ...step, status: 'complete' as StepStatus }));
    }
    return defaultWorkflowSteps;
  });
  const { toast } = useToast();
  const { selectedProvider } = useAnalysisTracking();
  
  // Analysis settings and error handling
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(getAnalysisSettings);
  const [connectionError, setConnectionError] = useState<ConnectionError | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  
  // Persistent analysis error state
  const [analysisError, setAnalysisError] = useState<AnalysisErrorInfo | null>(null);
  const [analysisRetryAttempts, setAnalysisRetryAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCallbackRef = useRef<(() => void) | null>(null);

  // Chunked analysis hook
  const {
    progress: chunkProgress,
    currentJob,
    analyzeWithChunks,
    createAnalysisJob,
    startPolling,
    cancelAnalysis,
    resumeJob,
  } = useChunkedAnalysis();

  // Track last failed job ID for resume functionality
  const [lastFailedJobId, setLastFailedJobId] = useState<string | null>(null);

  // Analysis status hook
  const analysisStatusHook = useAnalysisStatus();

  // Handle floating toolbar navigation
  const handleToolbarNavigate = (tab: string) => {
    setActiveTab(tab);
    // Scroll to tabs section
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Sync local state with context
  useEffect(() => {
    if (contextExtractedText && !extractedText) {
      setExtractedText(contextExtractedText);
      setExtractionStatus("success");
    }
  }, [contextExtractedText]);
  
  // Update context when local analysis data changes
  useEffect(() => {
    if (extractedText && extractedText !== contextExtractedText) {
      setContextExtractedText(extractedText);
    }
  }, [extractedText]);

  const updateStepStatus = (stepId: string, status: StepStatus, progress?: number) => {
    setWorkflowSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status, progress: progress ?? (status === 'complete' ? 100 : step.progress) } : step
      )
    );
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    updateStepStatus("upload", "complete");
    setIsExtracting(true);
    setExtractionStatus("extracting");
    
    // Check if it's an Excel file
    if (isExcelFile(file)) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const isLargeFile = file.size > 1024 * 1024; // > 1MB
      
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
          setExtractionStatus("success");
          updateStepStatus("extract", "complete");
          toast({
            title: t('dataExtracted'),
            description: `${result.items.length} ${t('itemsExtracted')} ${result.sheetNames.length} ${t('sheets')}`,
          });
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
        setManualText("");
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
        const cleanText = text.includes("[فشل") || text.includes("[تعذر") || text.includes("[لم يتم") ? "" : text;
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
    
    // Clear any previous error when starting new analysis
    setAnalysisError(null);
    
    if (!rawText || rawText.length < 50) {
      toast({
        title: t('notEnoughText'),
        description: t('enterBOQForAnalysis'),
        variant: "destructive",
      });
      return;
    }

    // Check if we should use chunked analysis for large files
    const chunkThreshold = analysisSettings.chunkSize * 1000;
    const autoChunkThresholdBytes = (analysisSettings.autoChunkThreshold || 500) * 1024;
    
    // Auto-chunk large files if enabled
    const shouldAutoChunk = analysisSettings.autoChunkLargeFiles && rawText.length > autoChunkThresholdBytes;
    const shouldUseChunks = (analysisSettings.enableChunkedAnalysis && rawText.length > chunkThreshold) || shouldAutoChunk;

    // Apply text truncation based on settings (only if not using chunks)
    const maxChars = analysisSettings.maxTextLength * 1000;
    let textToAnalyze = rawText;
    
    if (!shouldUseChunks && analysisSettings.autoTruncate && rawText.length > maxChars) {
      textToAnalyze = rawText.slice(0, maxChars);
      toast({
        title: isArabic ? 'تم تقليص النص' : 'Text Truncated',
        description: isArabic 
          ? `تم تقليص النص من ${Math.round(rawText.length/1000)}K إلى ${analysisSettings.maxTextLength}K حرف`
          : `Text reduced from ${Math.round(rawText.length/1000)}K to ${analysisSettings.maxTextLength}K chars`,
      });
    }
    
    // Show auto-chunking notification
    if (shouldAutoChunk) {
      const estimatedBatches = Math.ceil(rawText.length / chunkThreshold);
      toast({
        title: t('autoChunkingEnabled'),
        description: isArabic 
          ? `سيتم تقسيم الملف إلى ${estimatedBatches} دفعة للتحليل الأفضل`
          : `File will be split into ${estimatedBatches} batches for better analysis`,
        duration: 5000,
      });
    }

    setIsProcessing(true);
    updateStepStatus("analyze", "processing", 10);

    // Auto-determine if we should use Job Queue based on file size
    // Use Job Queue for files > autoJobQueueThreshold KB (default 200KB)
    const autoJobQueueThresholdBytes = (analysisSettings.autoJobQueueThreshold || 200) * 1024;
    const shouldUseJobQueue = analysisSettings.useJobQueue && user && rawText.length > autoJobQueueThresholdBytes;

    // Use Job Queue for large files (auto-enabled for files over threshold)
    if (shouldUseJobQueue) {
      try {
        toast({
          title: isArabic ? 'تحليل في الخلفية' : 'Background Analysis',
          description: isArabic 
            ? `الملف كبير (${Math.round(rawText.length/1024)} KB). سيتم معالجته في الخلفية.`
            : `Large file (${Math.round(rawText.length/1024)} KB). Processing in background.`,
        });

        const jobId = await createAnalysisJob(rawText, 'extract_items', selectedFile?.name);
        if (jobId) {
          toast({
            title: isArabic ? 'تم إنشاء مهمة التحليل' : 'Analysis Job Created',
            description: isArabic
              ? 'سيتم معالجة الملف في الخلفية. يمكنك متابعة التقدم.'
              : 'File will be processed in background. You can track progress.',
          });

          // Kick off backend processing immediately (otherwise the job stays pending)
          try {
            await supabase.functions.invoke('process-analysis-job', {
              body: { jobId },
            });
          } catch (startErr) {
            console.warn('Failed to start background job (will keep polling):', startErr);
          }

          // Start polling for job status
          startPolling(
            jobId,
            (result) => {
              setAnalysisData(result);
              updateStepStatus("analyze", "complete", 100);
              setIsProcessing(false);
              toast({
                title: isArabic ? 'اكتمل التحليل' : 'Analysis Complete',
                description: isArabic
                  ? `تم تحليل ${result?.items?.length || 0} بند`
                  : `Analyzed ${result?.items?.length || 0} items`,
              });
            },
            (error) => {
              updateStepStatus("analyze", "error");
              setIsProcessing(false);
              setLastFailedJobId(jobId); // Track failed job for resume
              setAnalysisError({
                type: detectAnalysisErrorType({ message: error }),
                message: error,
                errorCode: 'JOB_FAILED',
                timestamp: new Date(),
              });
              toast({
                title: isArabic ? 'فشل التحليل' : 'Analysis Failed',
                description: error,
                variant: "destructive",
              });
            }
          );
          return;
        }
      } catch (jobError) {
        console.error('Job queue error:', jobError);
        // Fall back to regular analysis
      }
    }

    // Use chunked analysis for large files
    if (shouldUseChunks) {
      try {
        toast({
          title: isArabic ? 'بدء التحليل المجزأ' : 'Starting Chunked Analysis',
          description: isArabic 
            ? `الملف كبير (${Math.round(rawText.length/1000)}K). سيتم تقسيمه لتحليل أفضل.`
            : `Large file (${Math.round(rawText.length/1000)}K). Splitting for better analysis.`,
        });

        const result = await analyzeWithChunks(rawText, 'analyze-boq', {
          chunkSize: analysisSettings.chunkSize * 1000,
          useCompression: analysisSettings.enableCompression,
          maxRetries: analysisSettings.maxRetries,
        });

        if (result?.items) {
          // Normalize items
          const normalizedItems = result.items.map((item: any) => ({
            ...item,
            item_number: item.itemNumber || item.item_number || '',
            unit_price: item.unitPrice || item.unit_price || 0,
            total_price: item.totalPrice || item.total_price || 0,
            description: item.description || '',
            unit: item.unit || 'م',
            category: item.category || 'غير مصنف',
          }));

          setAnalysisData({
            items: normalizedItems,
            summary: result.summary,
            chunksProcessed: result.chunksProcessed,
          });
          updateStepStatus("analyze", "complete", 100);
          updateStepStatus("wbs", "complete");
          updateStepStatus("export", "complete");
        }

        setIsProcessing(false);
        return;
      } catch (chunkError: any) {
        console.error('Chunked analysis error:', chunkError);
        // Fall back to regular analysis with truncation
        textToAnalyze = rawText.slice(0, maxChars);
      }
    }
    
    // Track current attempt for error dialog
    let currentAttempt = 0;
    const maxRetries = analysisSettings.enableRetry ? analysisSettings.maxRetries : 1;

    // Helper function to invoke backend function with retry logic (network resilience)
    const invokeWithRetry = async (
      functionName: string,
      body: any
    ) => {
      let lastError: any;
      let retryDelay = analysisSettings.retryDelay * 1000;

      // Apply compression if enabled
      if (analysisSettings.enableCompression && body.text) {
        body.textCompressed = compressText(body.text);
        body.isCompressed = true;
        delete body.text;
      }

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        currentAttempt = attempt;
        
        try {
          const result = await supabase.functions.invoke(functionName, {
            body,
            timeout: 120000, // allow slow AI analysis
          });

          if (!result.error) return result;

          const err: any = result.error;
          const message = String(err?.message || '');
          const name = String(err?.name || '');

          const isRetryable =
            name === 'FunctionsFetchError' ||
            name === 'AbortError' ||
            message.includes('Failed to fetch') ||
            message.includes('FunctionsFetchError') ||
            message.toLowerCase().includes('network');

          if (isRetryable && attempt < maxRetries && analysisSettings.enableRetry) {
            console.warn(
              `Function invoke failed (attempt ${attempt}/${maxRetries}); retrying in ${Math.round(retryDelay)}ms`,
              err
            );
            toast({
              title: isArabic ? `محاولة ${attempt}/${maxRetries} فشلت` : `Attempt ${attempt}/${maxRetries} failed`,
              description: isArabic ? 'جاري إعادة المحاولة...' : 'Retrying...',
            });
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retryDelay *= 1.5; // exponential backoff
            lastError = err;
            continue;
          }

          throw err;
        } catch (err: any) {
          const message = String(err?.message || '');
          const name = String(err?.name || '');

          const isRetryable =
            name === 'FunctionsFetchError' ||
            name === 'AbortError' ||
            message.includes('Failed to fetch') ||
            message.includes('FunctionsFetchError') ||
            message.toLowerCase().includes('network');

          if (isRetryable && attempt < maxRetries && analysisSettings.enableRetry) {
            console.warn(
              `Function invoke threw (attempt ${attempt}/${maxRetries}); retrying in ${Math.round(retryDelay)}ms`,
              err
            );
            toast({
              title: isArabic ? `محاولة ${attempt}/${maxRetries} فشلت` : `Attempt ${attempt}/${maxRetries} failed`,
              description: isArabic ? 'جاري إعادة المحاولة...' : 'Retrying...',
            });
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retryDelay *= 1.5;
            lastError = err;
            continue;
          }

          // Show error dialog for connection errors
          const errorType = detectErrorType(err);
          if (['network', 'timeout', 'cors'].includes(errorType)) {
            setConnectionError({
              type: errorType,
              message: err.message || 'Unknown error',
              details: err.stack || String(err),
              timestamp: new Date().toISOString(),
              attempt: currentAttempt,
              maxAttempts: maxRetries,
              functionName,
            });
            retryCallbackRef.current = runAnalysis;
            setShowErrorDialog(true);
          }

          throw err;
        }
      }

      throw lastError;
    };

    try {
      // Extract items analysis with retry
      // NOTE: disable schedule generation here to keep response smaller and more reliable
      const { data: itemsResult, error: itemsError } = await invokeWithRetry(
        "analyze-boq",
        { text: textToAnalyze, analysis_type: "extract_items", language, generate_schedule: false, preferred_provider: selectedProvider }
      );

      if (itemsError) throw itemsError;
      
      // Check for rate limit error with suggestion to use Job Queue
      if (itemsResult.errorCode === 'RATE_LIMIT_429' || itemsResult.statusCode === 429) {
        // Auto-escalate to Job Queue if user is logged in
        if (user && analysisSettings.useJobQueue) {
          toast({
            title: isArabic ? 'التبديل للمعالجة الخلفية' : 'Switching to Background Processing',
            description: isArabic 
              ? 'تجاوز حد الطلبات. سيتم معالجة الملف في الخلفية.'
              : 'Rate limit hit. Switching to background processing.',
            duration: 8000,
          });

          // Wait for suggested retry time before using Job Queue
          const waitTime = Math.min((itemsResult.retryAfter || 30) * 1000, 60000);
          await new Promise(resolve => setTimeout(resolve, waitTime));

          const jobId = await createAnalysisJob(rawText, 'extract_items', selectedFile?.name);
          if (jobId) {
            // Start backend processing
            try {
              await supabase.functions.invoke('process-analysis-job', { body: { jobId } });
            } catch (startErr) {
              console.warn('Failed to start background job:', startErr);
            }

            // Start polling for completion
            startPolling(
              jobId,
              (result) => {
                setAnalysisData(result);
                updateStepStatus("analyze", "complete", 100);
                setIsProcessing(false);
                toast({
                  title: isArabic ? 'اكتمل التحليل' : 'Analysis Complete',
                  description: isArabic
                    ? `تم تحليل ${result?.items?.length || 0} بند`
                    : `Analyzed ${result?.items?.length || 0} items`,
                });
              },
              (error) => {
                updateStepStatus("analyze", "error");
                setIsProcessing(false);
                setLastFailedJobId(jobId);
                setAnalysisError({
                  type: 'rate_limit',
                  message: error,
                  errorCode: 'JOB_FAILED_AFTER_ESCALATION',
                  timestamp: new Date(),
                });
              }
            );
            return;
          }
        }

        // If no auto-escalation, throw error with helpful message
        throw new Error(itemsResult.suggestion || itemsResult.error);
      }

      if (itemsResult.error) {
        throw new Error(itemsResult.suggestion || itemsResult.error);
      }

      // Normalize item data - map item_no to item_number, rate to unit_price, amount to total_price
      const normalizedItems = (itemsResult.items || []).map((item: any) => {
        // Get prices from various possible fields
        const unitPrice = item.unit_price ?? item.rate ?? item.price ?? item.unitPrice ?? 0;
        const quantity = item.quantity ?? item.qty ?? 1;
        const totalPrice = item.total_price ?? item.amount ?? item.total ?? (unitPrice * quantity);
        
        return {
          ...item,
          item_number: item.item_number || item.item_no || item.itemNo || '',
          unit_price: unitPrice,
          quantity: quantity,
          total_price: totalPrice,
          category: item.category || item.section_trade || item.section || 'غير مصنف',
          unit: item.unit || item.uom || 'م',
          description: item.description || item.desc || item.item_description || '',
        };
      }).filter((item: any) => item.item_number); // Filter out items without item_number

      const normalizedResult = {
        ...itemsResult,
        items: normalizedItems,
        summary: {
          ...itemsResult.summary,
          total_items: normalizedItems.length,
          total_value: itemsResult.summary?.total_value || 
            itemsResult.analysis?.total_value || 
            normalizedItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0),
          currency: itemsResult.summary?.currency || itemsResult.analysis?.currency || 'SAR',
          categories: itemsResult.summary?.categories || 
            [...new Set(normalizedItems.map((item: any) => item.category))],
        }
      };

      setAnalysisData(normalizedResult);
      updateStepStatus("analyze", "complete", 100);

      // Notify if OpenAI fallback was used
      if (itemsResult._meta?.fallbackUsed) {
        toast({
          title: t('aiSwitchedToOpenAI'),
          description: t('aiSwitchedToOpenAIDesc'),
        });
      }

      toast({
        title: t('analysisSuccess'),
        description: `${itemsResult.items?.length || 0} ${t('itemsExtracted2')}`,
      });

      // Create WBS with retry
      updateStepStatus("wbs", "processing", 30);
      
      const { data: wbsResult, error: wbsError } = await invokeWithRetry(
        "analyze-boq",
        { text: textToAnalyze, analysis_type: "create_wbs", language, generate_schedule: false, preferred_provider: selectedProvider }
      );

      if (wbsError) throw wbsError;

      if (wbsResult.error) {
        console.warn("WBS creation warning:", wbsResult.error);
      } else {
        setWbsData(wbsResult);
      }
      
      updateStepStatus("wbs", "complete");
      updateStepStatus("export", "complete");

      toast({
        title: t('wbsCreated'),
        description: `${wbsResult.wbs?.length || 0} ${t('elementsInStructure')}`,
      });

      // Auto-fetch market rates after analysis
      if (itemsResult.items && itemsResult.items.length > 0) {
        toast({
          title: t('fetchingRates') || "جاري جلب الأسعار...",
          description: t('autoFetchingRates') || "جاري تحليل أسعار السوق تلقائياً",
        });
        
        try {
          const { data: ratesData, error: ratesError } = await supabase.functions.invoke("suggest-market-rates", {
            body: { items: itemsResult.items, location: "Riyadh" },
          });

          if (!ratesError && ratesData?.suggestions) {
            const rates = ratesData.suggestions.map((s: any) => ({
              itemId: s.item_number || s.item_no,
              rate: s.suggested_avg,
            }));
            
            // Update items with AI rates
            const updatedItems = normalizedItems.map((item: any) => {
              const rateInfo = rates.find((r: any) => r.itemId === item.item_number);
              if (rateInfo) {
                return { ...item, aiSuggestedRate: rateInfo.rate };
              }
              return item;
            });
            
            setAnalysisData({
              ...normalizedResult,
              items: updatedItems,
            });
            
            toast({
              title: t('ratesFetched') || "تم جلب الأسعار",
              description: `${ratesData.analyzed_items || rates.length} ${t('itemsAnalyzed') || "بند تم تحليله"}`,
            });
          }
        } catch (ratesErr) {
          console.warn("Auto-fetch rates warning:", ratesErr);
          // Don't show error - it's optional
        }
      }

    } catch (error: any) {
      console.error("Analysis error:", error);
      updateStepStatus("analyze", "error");
      
      // Detect error type for rich error display
      const errorType = detectAnalysisErrorType(error);
      const errorMessage = error?.message || '';
      
      // Extract retry delay if present
      let retryAfter = error?.retryAfter;
      if (!retryAfter && errorType === 'rate_limit') {
        retryAfter = 30;
      }
      
      // Create persistent error info
      const errorInfo: AnalysisErrorInfo = {
        type: errorType,
        message: errorMessage,
        errorCode: error?.errorCode,
        details: error?.stack || String(error),
        retryAfter,
        timestamp: new Date(),
        provider: error?.provider || selectedProvider,
        attempts: analysisRetryAttempts + 1,
      };
      
      setAnalysisError(errorInfo);
      setAnalysisRetryAttempts(prev => prev + 1);
      
      // Also show a brief toast for immediate feedback
      const toastTitles: Record<string, { en: string; ar: string }> = {
        rate_limit: { en: 'Rate Limit Exceeded', ar: 'تجاوز حد الاستخدام' },
        timeout: { en: 'Request Timed Out', ar: 'انتهت مهلة الطلب' },
        network: { en: 'Connection Error', ar: 'خطأ في الاتصال' },
        credits_exhausted: { en: 'Credits Exhausted', ar: 'نفاد الرصيد' },
        server_error: { en: 'Server Error', ar: 'خطأ في الخادم' },
        unknown: { en: 'Analysis Failed', ar: 'فشل التحليل' },
      };
      
      const title = isArabic ? toastTitles[errorType]?.ar : toastTitles[errorType]?.en;
      
      toast({
        title: title || t('analysisError'),
        description: isArabic 
          ? 'راجع تفاصيل الخطأ أدناه للحصول على خطوات الحل'
          : 'See error details below for resolution steps',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle retry from error card
  const handleAnalysisRetry = () => {
    setAnalysisError(null);
    runAnalysis();
  };

  // Handle dismiss error card
  const handleDismissError = () => {
    setAnalysisError(null);
    setAnalysisRetryAttempts(0);
    setLastFailedJobId(null);
  };

  // Handle resume failed job from checkpoint
  const handleResumeJob = useCallback((jobId: string) => {
    setAnalysisError(null);
    setIsProcessing(true);
    updateStepStatus("analyze", "processing", 10);

    resumeJob(
      jobId,
      (result) => {
        setAnalysisData(result);
        updateStepStatus("analyze", "complete", 100);
        setIsProcessing(false);
        setLastFailedJobId(null);
        toast({
          title: isArabic ? 'اكتمل التحليل' : 'Analysis Complete',
          description: isArabic
            ? `تم تحليل ${result?.items?.length || 0} بند بنجاح`
            : `Successfully analyzed ${result?.items?.length || 0} items`,
        });
      },
      (error) => {
        updateStepStatus("analyze", "error");
        setIsProcessing(false);
        setAnalysisError({
          type: detectAnalysisErrorType({ message: error }),
          message: error,
          errorCode: 'JOB_RESUME_FAILED',
          timestamp: new Date(),
        });
        toast({
          title: isArabic ? 'فشل استئناف التحليل' : 'Resume Failed',
          description: error,
          variant: "destructive",
        });
      }
    );
  }, [resumeJob, setAnalysisData, updateStepStatus, isArabic, toast]);

  // Handle applying suggested market rates
  const handleApplyRate = useCallback((itemNumber: string, newRate: number) => {
    if (!analysisData?.items) return;

    const updatedItems = analysisData.items.map((item: any) => {
      if (item.item_number === itemNumber) {
        const newTotalPrice = item.quantity * newRate;
        return {
          ...item,
          unit_price: newRate,
          total_price: newTotalPrice,
        };
      }
      return item;
    });

    // Calculate new total value
    const newTotalValue = updatedItems.reduce((sum: number, item: any) => 
      sum + (item.total_price || 0), 0
    );

    setAnalysisData({
      ...analysisData,
      items: updatedItems,
      summary: {
        ...analysisData.summary,
        total_value: newTotalValue,
      },
    });

    toast({
      title: "Rate Applied",
      description: `Updated item ${itemNumber}. New project total: ${newTotalValue.toLocaleString()} ${analysisData.summary?.currency || 'SAR'}`,
    });
  }, [analysisData, toast, t]);

  return (
    <div className="min-h-screen bg-background overflow-x-auto" dir={isArabic ? 'rtl' : 'ltr'} ref={mainContentRef}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <PMSLogo size="md" showText />
            </div>
            
            {/* Navigation Tabs - Clean horizontal layout */}
            <nav className="flex-1 flex items-center justify-center overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
                <Link to="/">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs font-medium hover:bg-background/80 data-[active=true]:bg-background data-[active=true]:shadow-sm rounded-md" data-active="true">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'الرئيسية' : 'Dashboard'}</span>
                  </Button>
                </Link>
                
                <Link to="/cost-analysis">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs font-medium hover:bg-background/80 rounded-md">
                    <Scale className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{isArabic ? 'تحليل التكاليف' : 'Cost Analysis'}</span>
                  </Button>
                </Link>
                
                <Link to="/saved-projects">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs font-medium hover:bg-background/80 rounded-md">
                    <Save className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{isArabic ? 'المشاريع' : 'Projects'}</span>
                  </Button>
                </Link>

                <Link to="/about">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs font-medium hover:bg-background/80 rounded-md">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{isArabic ? 'حول' : 'About'}</span>
                  </Button>
                </Link>
              </div>
            </nav>

            {/* Right Actions - Simplified */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Share Button */}
              <ShareAnalysis 
                analysisData={analysisData}
                wbsData={wbsData}
                fileName={selectedFile?.name}
              />
              
              {/* Project Management */}
              <LocalProjectManager
                analysisData={analysisData}
                wbsData={wbsData}
                fileName={selectedFile?.name}
                onLoadProject={(loadedAnalysis, loadedWbs) => {
                  setAnalysisData(loadedAnalysis);
                  setWbsData(loadedWbs);
                  updateStepStatus("upload", "complete");
                  updateStepStatus("extract", "complete");
                  updateStepStatus("analyze", "complete");
                  updateStepStatus("wbs", "complete");
                  updateStepStatus("export", "complete");
                }}
              />
              
              {/* Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-xs">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{isArabic ? 'أدوات' : 'Tools'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-50">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <div onClick={() => setShowBOQComparison(true)} className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4" />
                      <span>{isArabic ? 'مقارنة النسخ' : 'Compare Versions'}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <div onClick={() => setShowP6Export(true)} className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{isArabic ? 'تصدير P6' : 'P6 Export'}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <div onClick={() => setShowComprehensiveReport(true)} className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{isArabic ? 'التقرير الشامل' : 'Comprehensive Report'}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/changelog" className="flex items-center gap-2">
                      <FileStack className="w-4 h-4" />
                      <span>{isArabic ? 'سجل التحديثات' : 'Changelog'}</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <ThemeToggle />
              <LanguageToggle />
              
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-1.5 h-8 px-2 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{t('signOut')}</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-xs">
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{t('signIn')}</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              {t('heroTitle')} <span className="gradient-text">{t('heroTitleHighlight')}</span> {t('heroTitleSuffix')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('heroDescription')}
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload & Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload & Extraction Status */}
              {!extractedText && !analysisData && !showManualInput && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {isArabic ? 'ارفع ملف BOQ للتحليل' : 'Upload BOQ file for analysis'}
                    </span>
                    <AnalysisSettingsDialog 
                      trigger={
                        <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs">
                          <Settings2 className="h-3.5 w-3.5" />
                          {isArabic ? 'إعدادات' : 'Settings'}
                        </Button>
                      }
                      onSettingsChange={setAnalysisSettings}
                    />
                  </div>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isProcessing={isExtracting}
                    selectedFile={selectedFile}
                    onClear={handleClearFile}
                  />
                  
                  {/* Extraction Status */}
                  {isExtracting && (
                    <div className="glass-card p-6 animate-slide-up">
                      <div className="flex items-center gap-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <div className="flex-1">
                          <h3 className="font-display font-semibold">{t('extractingText')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {pdfProgress 
                              ? `Extracting page ${pdfProgress.current} / ${pdfProgress.total}`
                              : t('analyzingPDFContent')
                            }
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                        {pdfProgress ? (
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" 
                            style={{ width: `${(pdfProgress.current / pdfProgress.total) * 100}%` }}
                          />
                        ) : (
                          <div className="h-full bg-gradient-to-r from-primary to-accent animate-shimmer bg-[length:200%_100%]" />
                        )}
                      </div>
                      {pdfProgress && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {Math.round((pdfProgress.current / pdfProgress.total) * 100)}%
                        </p>
                      )}
                    </div>
                  )}

                  {extractionStatus === "failed" && !isExtracting && !isOCRProcessing && (
                    <div className="glass-card p-6 border-warning/50 bg-warning/5 animate-slide-up">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="w-8 h-8 text-warning shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-display font-semibold text-warning">{t('extractionFailed')}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('scannedOrUnsupported')}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              onClick={handleOCRExtraction}
                              size="sm"
                              className="gap-2"
                            >
                              <ScanLine className="w-4 h-4" />
                              {t('useOCR')}
                            </Button>
                            <Button
                              onClick={() => setShowManualInput(true)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              {t('manualEntry')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}

                  {/* Excel Processing Progress */}
                  {isExtracting && excelProgress && (
                    <div className="glass-card p-6 animate-slide-up">
                      <div className="flex items-center gap-4">
                        <FileSpreadsheet className="w-8 h-8 text-green-500 animate-pulse" />
                        <div className="flex-1">
                          <h3 className="font-display font-semibold">
                            {isArabic ? 'جاري معالجة ملف Excel' : 'Processing Excel File'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {excelProgress.message}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {excelProgress.progress}%
                        </span>
                      </div>
                      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" 
                          style={{ width: `${excelProgress.progress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>{isArabic ? 'قراءة' : 'Reading'}</span>
                        <span>{isArabic ? 'تحليل' : 'Parsing'}</span>
                        <span>{isArabic ? 'استخراج' : 'Extracting'}</span>
                        <span>{isArabic ? 'تنسيق' : 'Formatting'}</span>
                      </div>
                    </div>
                  )}

                  {isOCRProcessing && (
                    <div className="glass-card p-6 animate-slide-up">
                      <div className="flex items-center gap-4">
                        <ScanLine className="w-8 h-8 text-primary animate-pulse" />
                        <div className="flex-1">
                          <h3 className="font-display font-semibold">{t('ocrProcessing')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {ocrProgress 
                              ? `${t('page')} ${ocrProgress.current} ${t('of')} ${ocrProgress.total}`
                              : t('analyzingImagesAI')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                        {ocrProgress ? (
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" 
                            style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }}
                          />
                        ) : (
                          <div className="h-full bg-gradient-to-r from-primary to-accent animate-shimmer bg-[length:200%_100%]" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chunked Analysis Progress */}
                  {chunkProgress.status !== 'idle' && (
                    <ChunkedAnalysisProgress
                      progress={chunkProgress}
                      job={currentJob}
                      onCancel={cancelAnalysis}
                      onResume={handleResumeJob}
                    />
                  )}

                  {/* AI Monitoring Dashboard - Show when processing or has previous errors */}
                  {(isProcessing || analysisStatusHook.status.lastError) && (
                    <AIMonitoringDashboard 
                      isAnalyzing={isProcessing} 
                      onRetry={runAnalysis}
                    />
                  )}

                  {/* Persistent Error Card - Show when analysis fails */}
                  {analysisError && !isProcessing && (
                    <AnalysisErrorCard
                      error={analysisError}
                      onRetry={handleAnalysisRetry}
                      onDismiss={handleDismissError}
                      onOpenSettings={() => {
                        const settingsBtn = document.querySelector('[data-settings-trigger]');
                        if (settingsBtn instanceof HTMLElement) {
                          settingsBtn.click();
                        }
                      }}
                      lastJobId={lastFailedJobId || undefined}
                      onResumeJob={handleResumeJob}
                    />
                  )}

                  {!selectedFile && !isExtracting && (
                    <>
                      <div className="text-center">
                        <span className="text-muted-foreground">{t('or')}</span>
                      </div>
                      
                      <button
                        onClick={() => setShowManualInput(true)}
                        className="w-full glass-card p-6 text-center hover:border-primary/50 transition-colors"
                      >
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/10 flex items-center justify-center">
                          <Edit3 className="w-6 h-6 text-accent" />
                        </div>
                        <h3 className="font-display text-lg font-semibold mb-1">{t('manualTextEntry')}</h3>
                        <p className="text-sm text-muted-foreground">{t('pasteBOQContent')}</p>
                      </button>
                    </>
                  )}
                </>
              )}

              {showManualInput && !extractedText && !analysisData && (
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold">{t('enterBOQText')}</h3>
                        <p className="text-sm text-muted-foreground">{t('pasteBOQHere')}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearFile}>
                      {t('cancel')}
                    </Button>
                  </div>

                  {/* Tips for manual entry */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-2">{t('tipsForBestResults')}</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• {t('tipCopyFromExcel')}</li>
                      <li>• {t('tipIncludeNumbers')}</li>
                      <li>• {t('tipCopyTables')}</li>
                    </ul>
                  </div>
                  
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={t('boqPlaceholder')}
                    className="min-h-[300px] font-mono text-sm"
                    dir="auto"
                  />
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {manualText.length} {t('characters')}
                      </span>
                      {manualText.length >= 50 && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('readyForAnalysis')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {selectedFile && (
                        <Button
                          onClick={() => {
                            setShowManualInput(false);
                            setExtractionStatus("idle");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          {t('back')}
                        </Button>
                      )}
                      <Button
                        onClick={handleManualTextSubmit}
                        disabled={manualText.length < 50}
                        className="btn-gradient gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {t('saveText')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {extractedText && !analysisData && (
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{t('textReadyForAnalysis')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {extractedText.length.toLocaleString()} {t('characters')}
                        {analysisSettings.autoTruncate && extractedText.length > analysisSettings.maxTextLength * 1000 && (
                          <span className="text-yellow-600 ml-2">
                            ({isArabic ? 'سيتم تقليصه إلى' : 'will be truncated to'} {analysisSettings.maxTextLength}K)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AnalysisSettingsDialog 
                        trigger={
                          <Button variant="ghost" size="sm" className="gap-1.5" data-settings-trigger>
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        }
                        onSettingsChange={setAnalysisSettings}
                      />
                      <Button variant="outline" size="sm" onClick={handleClearFile}>
                        {t('edit')}
                      </Button>
                      <Button
                        onClick={runAnalysis}
                        disabled={isProcessing}
                        className="btn-gradient gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {t('startAnalysis')}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Estimated Time Display */}
                  {analysisSettings.showEstimatedTime && (
                    <div className="mb-4">
                      <EstimatedAnalysisTime
                        textLength={extractedText.length}
                        isAutoChunking={analysisSettings.autoChunkLargeFiles && extractedText.length > (analysisSettings.autoChunkThreshold || 500) * 1024}
                        chunkSize={analysisSettings.chunkSize}
                        isProcessing={isProcessing}
                      />
                    </div>
                  )}
                  
                  {/* Chunked Analysis Panel for Large Files */}
                  {extractedText.length >= 20000 && !isProcessing && (
                    <ChunkedAnalysisPanel
                      textContent={extractedText}
                      onAnalysisComplete={(result) => {
                        if (result?.items) {
                          const normalizedItems = result.items.map((item: any) => ({
                            ...item,
                            item_number: item.itemNumber || item.item_number || '',
                            unit_price: item.unitPrice || item.unit_price || 0,
                            total_price: item.totalPrice || item.total_price || 0,
                            description: item.description || '',
                            unit: item.unit || 'م',
                            category: item.category || 'غير مصنف',
                          }));
                          setAnalysisData({
                            items: normalizedItems,
                            summary: result.summary,
                            chunksProcessed: result.chunksProcessed,
                          });
                          updateStepStatus("analyze", "complete", 100);
                          updateStepStatus("wbs", "complete");
                          updateStepStatus("export", "complete");
                          toast({
                            title: isArabic ? 'اكتمل التحليل المجزأ' : 'Chunked Analysis Complete',
                            description: `${normalizedItems.length} ${isArabic ? 'بند تم تحليله' : 'items analyzed'}`,
                          });
                        }
                      }}
                      onCancel={() => {
                        toast({
                          title: isArabic ? 'تم إلغاء التحليل' : 'Analysis Cancelled',
                        });
                      }}
                      functionName="analyze-boq"
                      autoStart={false}
                      minChunkSizeForAuto={50000}
                    />
                  )}
                  
                  <div className="bg-muted rounded-xl p-4 max-h-48 overflow-y-auto">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono" dir="auto">
                      {extractedText.slice(0, 1000)}
                      {extractedText.length > 1000 && "..."}
                    </pre>
                  </div>
                </div>
              )}

              {analysisData && (
                <div className="space-y-4">
                  {user && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                      <SaveProjectDialog
                        analysisData={analysisData}
                        wbsData={wbsData}
                        fileName={selectedFile?.name}
                        onSaved={(projectId) => setSavedProjectId(projectId)}
                      />
                    </div>
                  )}
                  <AnalysisResults 
                    data={analysisData} 
                    wbsData={wbsData} 
                    onApplyRate={handleApplyRate}
                    savedProjectId={savedProjectId || undefined}
                    fileName={selectedFile?.name}
                  />
                  
                  {/* Comprehensive Report Section */}
                  <ComprehensiveReport
                    projectName={selectedFile?.name?.replace(/\.[^/.]+$/, "") || "مشروع BOQ"}
                    analysisData={analysisData}
                    wbsData={wbsData}
                  />
                </div>
              )}

              {/* Quotations Section */}
              {user && (
                <div ref={tabsRef} className="glass-card p-6 animate-slide-up">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto p-1 bg-muted/50 mb-4">
                      <TabsTrigger value="dashboard" className="gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'لوحة التحكم' : 'Dashboard'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="boq-compare" className="gap-2">
                        <FileStack className="w-4 h-4" />
                        <span className="hidden sm:inline">BOQ</span>
                      </TabsTrigger>
                      <TabsTrigger value="templates" className="gap-2">
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'القوالب' : 'Templates'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="attachments" className="gap-2">
                        <Paperclip className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'المرفقات' : 'Attachments'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="procurement" className="gap-2">
                        <Package className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'المشتريات' : 'Procurement'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="subcontractors" className="gap-2">
                        <Users className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'المقاولين' : 'Subcontractors'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="compare" className="gap-2">
                        <Scale className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'مقارنة' : 'Compare'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="p6-export" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">P6</span>
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="gap-2">
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">{isArabic ? 'الإشعارات' : 'Settings'}</span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="dashboard">
                      <MainDashboard 
                        onLoadProject={(loadedAnalysis, loadedWbs, projectId) => {
                          setAnalysisData(loadedAnalysis);
                          setWbsData(loadedWbs);
                          if (projectId) {
                            setSavedProjectId(projectId);
                          }
                          updateStepStatus("upload", "complete");
                          updateStepStatus("extract", "complete");
                          updateStepStatus("analyze", "complete");
                          updateStepStatus("wbs", "complete");
                          updateStepStatus("export", "complete");
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="boq-compare">
                      <BOQComparison />
                    </TabsContent>
                    <TabsContent value="templates">
                      <BOQTemplates 
                        currentItems={analysisData?.items || []}
                        onUseTemplate={(items) => {
                          setAnalysisData(prev => prev ? { ...prev, items } : { items, summary: {} });
                          toast({
                            title: isArabic ? "تم تطبيق القالب" : "Template Applied",
                            description: isArabic ? "تم استيراد بنود القالب" : "Template items imported"
                          });
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="attachments">
                      <ProjectAttachments projectId={savedProjectId || undefined} />
                    </TabsContent>
                    <TabsContent value="procurement">
                      <ProcurementResourcesSchedule 
                        items={analysisData?.items || []} 
                        currency={analysisData?.summary?.currency || "SAR"} 
                      />
                    </TabsContent>
                    <TabsContent value="subcontractors">
                      <Tabs defaultValue="management" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="management">
                            {isArabic ? "إدارة المقاولين" : "Management"}
                          </TabsTrigger>
                          <TabsTrigger value="boq-link">
                            {isArabic ? "ربط بالبنود" : "BOQ Link"}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="management">
                          <SubcontractorManagement />
                        </TabsContent>
                        <TabsContent value="boq-link">
                          <SubcontractorBOQLink 
                            boqItems={analysisData?.items || []} 
                            projectId={savedProjectId || undefined}
                          />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                    <TabsContent value="compare">
                      <QuotationComparison />
                    </TabsContent>
                    <TabsContent value="p6-export">
                      <P6Export items={analysisData?.items || []} currency="SAR" />
                    </TabsContent>
                    <TabsContent value="settings">
                      <Tabs defaultValue="notifications" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="notifications">
                            {isArabic ? "الإشعارات" : "Notifications"}
                          </TabsTrigger>
                          <TabsTrigger value="contracts">
                            {isArabic ? "تذكيرات العقود" : "Contract Alerts"}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="notifications">
                          <NotificationSettings />
                        </TabsContent>
                        <TabsContent value="contracts">
                          <ContractNotifications />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            {/* Right Column - Workflow Status */}
            <div className="space-y-6">
              <WorkflowStatus steps={workflowSteps} />

              {/* Saved Projects - only for logged in users */}
              {user && (
                <SavedProjects
                  onLoadProject={(analysisData, wbsData, projectId) => {
                    setAnalysisData(analysisData);
                    setWbsData(wbsData);
                    if (projectId) {
                      setSavedProjectId(projectId);
                    }
                    updateStepStatus("upload", "complete");
                    updateStepStatus("extract", "complete");
                    updateStepStatus("analyze", "complete");
                    updateStepStatus("wbs", "complete");
                    updateStepStatus("export", "complete");
                  }}
                />
              )}

              {/* Features Card */}
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold mb-4">{t('features')}</h3>
                <div className="space-y-3">
                  {[
                    { icon: <FileUp className="w-4 h-4" />, textKey: 'featureManualEntry' },
                    { icon: <Sparkles className="w-4 h-4" />, textKey: 'featureAIAnalysis' },
                    { icon: <Layers className="w-4 h-4" />, textKey: 'featureAutoWBS' },
                    { icon: <Download className="w-4 h-4" />, textKey: 'featureExport' },
                    { icon: <Save className="w-4 h-4" />, textKey: 'featureSaveProjects' },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {feature.icon}
                      </div>
                      <span>{t(feature.textKey as any)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {analysisData && (
                <Button
                  onClick={handleClearFile}
                  variant="outline"
                  className="w-full"
                >
                  {t('analyzeNewFile')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* BOQ Version Comparison - uses internal dialog trigger */}
      {showBOQComparison && analysisData?.items && (
        <Dialog open={showBOQComparison} onOpenChange={setShowBOQComparison}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <BOQVersionComparison 
              currentItems={analysisData?.items}
              currentTotalValue={analysisData?.summary?.total_value}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* P6 Export Dialog */}
      {showP6Export && analysisData?.items && (
        <Dialog open={showP6Export} onOpenChange={setShowP6Export}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <P6Export 
              items={analysisData.items}
              currency={analysisData.summary?.currency || "SAR"}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Comprehensive Report Dialog */}
      {showComprehensiveReport && analysisData && (
        <Dialog open={showComprehensiveReport} onOpenChange={setShowComprehensiveReport}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ComprehensiveReport 
              analysisData={analysisData}
              wbsData={wbsData}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Toolbar - only for logged in users */}
      {user && (
        <FloatingToolbar 
          onNavigate={handleToolbarNavigate}
          currentTab={activeTab}
          hasAnalysisData={!!analysisData}
          onShowBOQComparison={() => setShowBOQComparison(true)}
          onShowReport={() => setShowComprehensiveReport(true)}
        />
      )}

      {/* Horizontal Scroll Bars - Top and Bottom */}
      <DualHorizontalScrollBar containerRef={mainContentRef} position="top" />
      <DualHorizontalScrollBar containerRef={mainContentRef} position="bottom" />

      {/* Connection Error Dialog */}
      <ConnectionErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        error={connectionError}
        onRetry={() => {
          setShowErrorDialog(false);
          setIsRetrying(true);
          setTimeout(() => {
            setIsRetrying(false);
            retryCallbackRef.current?.();
          }, 500);
        }}
        isRetrying={isRetrying}
      />

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('poweredByAI')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
