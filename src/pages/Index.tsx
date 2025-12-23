import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileUp, Sparkles, GitMerge, Download, FileText, Edit3, Loader2, CheckCircle2, AlertTriangle, LogIn, LogOut, Save, User, Receipt, Scale, ScanLine } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { FileUpload } from "@/components/FileUpload";
import { WorkflowStatus, defaultWorkflowSteps, type WorkflowStep, type StepStatus } from "@/components/WorkflowStatus";
import { AnalysisResults } from "@/components/AnalysisResults";
import { SavedProjects } from "@/components/SavedProjects";
import { SaveProjectDialog } from "@/components/SaveProjectDialog";
import { QuotationUpload } from "@/components/QuotationUpload";
import { QuotationComparison } from "@/components/QuotationComparison";
import { ComprehensiveReport } from "@/components/ComprehensiveReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "success" | "failed">("idle");
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [wbsData, setWbsData] = useState<any>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(defaultWorkflowSteps);
  const { toast } = useToast();

  const updateStepStatus = (stepId: string, status: StepStatus) => {
    setWorkflowSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
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
      toast({
        title: t('readingExcel'),
        description: t('pleaseWait'),
      });
      
      try {
        const result = await extractDataFromExcel(file);
        const formattedText = formatExcelDataForAnalysis(result);
        
        if (formattedText.length > 50) {
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
      const text = await extractTextFromPDF(file);
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
  }, [toast]);

  const handleClearFile = () => {
    setSelectedFile(null);
    setExtractedText("");
    setManualText("");
    setShowManualInput(false);
    setIsExtracting(false);
    setExtractionStatus("idle");
    setIsOCRProcessing(false);
    setOcrProgress(null);
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
    const textToAnalyze = extractedText || manualText;
    
    if (!textToAnalyze || textToAnalyze.length < 50) {
      toast({
        title: t('notEnoughText'),
        description: t('enterBOQForAnalysis'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    updateStepStatus("analyze", "processing");

    try {
      // Extract items analysis
      const { data: itemsResult, error: itemsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: textToAnalyze, analysis_type: "extract_items", language },
      });

      if (itemsError) throw itemsError;
      
      if (itemsResult.error) {
        throw new Error(itemsResult.suggestion || itemsResult.error);
      }

      setAnalysisData(itemsResult);
      updateStepStatus("analyze", "complete");

      toast({
        title: t('analysisSuccess'),
        description: `${itemsResult.items?.length || 0} ${t('itemsExtracted2')}`,
      });

      // Create WBS
      updateStepStatus("wbs", "processing");
      
      const { data: wbsResult, error: wbsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: textToAnalyze, analysis_type: "create_wbs", language },
      });

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

    } catch (error: any) {
      console.error("Analysis error:", error);
      updateStepStatus("analyze", "error");
      
      let errorTitle = t('analysisError');
      let errorDescription = t('errorAnalyzing');
      
      if (error?.message?.includes("AI credits exhausted") || error?.message?.includes("Payment required")) {
        errorTitle = t('aiCreditsExhausted');
        errorDescription = t('addCredits');
      } else if (error?.message?.includes("Rate limits exceeded")) {
        errorTitle = t('rateLimitExceeded');
        errorDescription = t('tryAgainLater');
      } else if (error instanceof Error) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GitMerge className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold gradient-text">BOQ Analyzer</h1>
                <p className="text-xs text-muted-foreground">{t('appDescription')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('signOut')}</span>
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    {t('signIn')}
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
                        <div>
                          <h3 className="font-display font-semibold">جاري استخراج النص...</h3>
                          <p className="text-sm text-muted-foreground">يتم تحليل محتوى ملف PDF</p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-accent animate-shimmer bg-[length:200%_100%]" />
                      </div>
                    </div>
                  )}

                  {extractionStatus === "failed" && !isExtracting && !isOCRProcessing && (
                    <div className="glass-card p-6 border-warning/50 bg-warning/5 animate-slide-up">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="w-8 h-8 text-warning shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-display font-semibold text-warning">تعذر استخراج النص بالكامل</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            قد يكون الملف يحتوي على صور ممسوحة ضوئياً أو تنسيق غير مدعوم.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              onClick={handleOCRExtraction}
                              size="sm"
                              className="gap-2"
                            >
                              <ScanLine className="w-4 h-4" />
                              استخدم OCR (ذكاء اصطناعي)
                            </Button>
                            <Button
                              onClick={() => setShowManualInput(true)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Edit3 className="w-4 h-4" />
                              إدخال يدوي
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isOCRProcessing && (
                    <div className="glass-card p-6 animate-slide-up">
                      <div className="flex items-center gap-4">
                        <ScanLine className="w-8 h-8 text-primary animate-pulse" />
                        <div className="flex-1">
                          <h3 className="font-display font-semibold">جاري استخراج النص بـ OCR...</h3>
                          <p className="text-sm text-muted-foreground">
                            {ocrProgress 
                              ? `صفحة ${ocrProgress.current} من ${ocrProgress.total}`
                              : "يتم تحليل صور الملف بالذكاء الاصطناعي"}
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

                  {!selectedFile && !isExtracting && (
                    <>
                      <div className="text-center">
                        <span className="text-muted-foreground">أو</span>
                      </div>
                      
                      <button
                        onClick={() => setShowManualInput(true)}
                        className="w-full glass-card p-6 text-center hover:border-primary/50 transition-colors"
                      >
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/10 flex items-center justify-center">
                          <Edit3 className="w-6 h-6 text-accent" />
                        </div>
                        <h3 className="font-display text-lg font-semibold mb-1">إدخال النص يدوياً</h3>
                        <p className="text-sm text-muted-foreground">الصق محتوى BOQ من Excel أو Word أو PDF</p>
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
                        <h3 className="font-display text-lg font-semibold">إدخال نص BOQ</h3>
                        <p className="text-sm text-muted-foreground">الصق محتوى جدول الكميات هنا</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearFile}>
                      إلغاء
                    </Button>
                  </div>

                  {/* Tips for manual entry */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-2">💡 نصائح للحصول على أفضل النتائج:</p>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>• انسخ من Excel أو Word مباشرة (Ctrl+C ثم Ctrl+V)</li>
                      <li>• تأكد من وجود أرقام البنود والكميات والوحدات</li>
                      <li>• يمكن نسخ جداول كاملة من أي برنامج</li>
                    </ul>
                  </div>
                  
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="الصق نص BOQ هنا...

مثال:
1. أعمال الحفر والردم
   1.1 حفر عام للأساسات - 500 م³
   1.2 ردم وتسوية - 200 م³

2. أعمال الخرسانة
   2.1 خرسانة عادية - 100 م³ - 450 ر.س/م³
   2.2 خرسانة مسلحة - 250 م³ - 650 ر.س/م³

أو الصق جدول من Excel مباشرة..."
                    className="min-h-[300px] font-mono text-sm"
                    dir="auto"
                  />
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {manualText.length} حرف
                      </span>
                      {manualText.length >= 50 && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="w-3 h-3" />
                          جاهز للتحليل
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
                          رجوع
                        </Button>
                      )}
                      <Button
                        onClick={handleManualTextSubmit}
                        disabled={manualText.length < 50}
                        className="btn-gradient gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        حفظ النص
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {extractedText && !analysisData && (
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">النص جاهز للتحليل</h3>
                      <p className="text-sm text-muted-foreground">
                        {extractedText.length.toLocaleString()} حرف
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleClearFile}>
                        تعديل
                      </Button>
                      <Button
                        onClick={runAnalysis}
                        disabled={isProcessing}
                        className="btn-gradient gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        بدء التحليل
                      </Button>
                    </div>
                  </div>
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
                      />
                    </div>
                  )}
                  <AnalysisResults data={analysisData} wbsData={wbsData} />
                  
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
                <div className="glass-card p-6 animate-slide-up">
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="upload" className="gap-2">
                        <Receipt className="w-4 h-4" />
                        رفع عروض الأسعار
                      </TabsTrigger>
                      <TabsTrigger value="compare" className="gap-2">
                        <Scale className="w-4 h-4" />
                        مقارنة العروض
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload">
                      <QuotationUpload />
                    </TabsContent>
                    <TabsContent value="compare">
                      <QuotationComparison />
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
                  onLoadProject={(analysisData, wbsData) => {
                    setAnalysisData(analysisData);
                    setWbsData(wbsData);
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
                    { icon: <GitMerge className="w-4 h-4" />, textKey: 'featureAutoWBS' },
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

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('poweredByAI')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
