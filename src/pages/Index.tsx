import { useState, useCallback } from "react";
import { FileUp, Sparkles, GitMerge, Download, FileText, Edit3, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { WorkflowStatus, defaultWorkflowSteps, type WorkflowStep, type StepStatus } from "@/components/WorkflowStatus";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF, validateExtractedText } from "@/lib/pdf-utils";
const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "success" | "failed">("idle");
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
    
    toast({
      title: "جاري استخراج النص...",
      description: "يرجى الانتظار بينما نستخرج المحتوى من ملف PDF",
    });
    
    try {
      const text = await extractTextFromPDF(file);
      const validation = validateExtractedText(text);
      
      if (validation.isBinary) {
        // Binary data detected - don't use this text at all
        setExtractionStatus("failed");
        setShowManualInput(true);
        setManualText("");
        toast({
          title: "تعذر قراءة الملف",
          description: "ملف PDF يحتوي على صور أو نص غير قابل للتحديد. يرجى الإدخال يدوياً",
          variant: "destructive",
        });
      } else if (validation.isValid) {
        setExtractedText(text);
        setExtractionStatus("success");
        updateStepStatus("extract", "complete");
        toast({
          title: "تم استخراج النص بنجاح",
          description: `تم استخراج ${validation.wordCount} كلمة من ${file.name}`,
        });
      } else {
        setExtractionStatus("failed");
        setShowManualInput(true);
        // Only set manual text if it's not an error message
        const cleanText = text.includes("[فشل") || text.includes("[تعذر") || text.includes("[لم يتم") ? "" : text;
        setManualText(cleanText);
        toast({
          title: "استخراج جزئي",
          description: validation.issues.join(" - ") + ". يرجى المراجعة أو الإدخال يدوياً",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Extraction error:", error);
      setExtractionStatus("failed");
      setShowManualInput(true);
      toast({
        title: "فشل استخراج النص",
        description: "يرجى نسخ محتوى الملف يدوياً",
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
    setAnalysisData(null);
    setWbsData(null);
    setWorkflowSteps(defaultWorkflowSteps);
  };

  const handleManualTextSubmit = () => {
    if (manualText.trim().length < 50) {
      toast({
        title: "النص قصير جداً",
        description: "يرجى إدخال نص BOQ أطول للتحليل",
        variant: "destructive",
      });
      return;
    }
    setExtractedText(manualText);
    updateStepStatus("extract", "complete");
    toast({
      title: "تم حفظ النص",
      description: `تم حفظ ${manualText.length} حرف للتحليل`,
    });
  };

  const runAnalysis = async () => {
    const textToAnalyze = extractedText || manualText;
    
    if (!textToAnalyze || textToAnalyze.length < 50) {
      toast({
        title: "لا يوجد نص كافٍ",
        description: "يرجى إدخال نص BOQ للتحليل",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    updateStepStatus("analyze", "processing");

    try {
      // Extract items analysis
      const { data: itemsResult, error: itemsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: textToAnalyze, analysis_type: "extract_items" },
      });

      if (itemsError) throw itemsError;
      
      if (itemsResult.error) {
        throw new Error(itemsResult.suggestion || itemsResult.error);
      }

      setAnalysisData(itemsResult);
      updateStepStatus("analyze", "complete");

      toast({
        title: "تم التحليل بنجاح",
        description: `تم استخراج ${itemsResult.items?.length || 0} عنصر`,
      });

      // Create WBS
      updateStepStatus("wbs", "processing");
      
      const { data: wbsResult, error: wbsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: textToAnalyze, analysis_type: "create_wbs" },
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
        title: "تم إنشاء WBS بنجاح",
        description: `تم إنشاء ${wbsResult.wbs?.length || 0} عنصر في الهيكل`,
      });

    } catch (error) {
      console.error("Analysis error:", error);
      updateStepStatus("analyze", "error");
      toast({
        title: "خطأ في التحليل",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحليل الملف",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
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
                <p className="text-xs text-muted-foreground">تحليل جداول الكميات بالذكاء الاصطناعي</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-badge status-complete">
                <span className="pulse-dot bg-success" />
                متصل
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              حلل ملفات <span className="gradient-text">BOQ</span> بسهولة
            </h2>
            <p className="text-lg text-muted-foreground">
              الصق نص جدول الكميات وسنقوم بتحليله واستخراج العناصر وإنشاء WBS تلقائياً
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

                  {extractionStatus === "failed" && !isExtracting && (
                    <div className="glass-card p-6 border-warning/50 bg-warning/5 animate-slide-up">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="w-8 h-8 text-warning shrink-0" />
                        <div>
                          <h3 className="font-display font-semibold text-warning">تعذر استخراج النص بالكامل</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            قد يكون الملف يحتوي على صور ممسوحة ضوئياً أو تنسيق غير مدعوم. 
                            يمكنك إدخال النص يدوياً.
                          </p>
                          <Button
                            onClick={() => setShowManualInput(true)}
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            إدخال يدوي
                          </Button>
                        </div>
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
                <AnalysisResults data={analysisData} wbsData={wbsData} />
              )}
            </div>

            {/* Right Column - Workflow Status */}
            <div className="space-y-6">
              <WorkflowStatus steps={workflowSteps} />

              {/* Features Card */}
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold mb-4">المميزات</h3>
                <div className="space-y-3">
                  {[
                    { icon: <FileUp className="w-4 h-4" />, text: "إدخال النص يدوياً" },
                    { icon: <Sparkles className="w-4 h-4" />, text: "تحليل بالذكاء الاصطناعي" },
                    { icon: <GitMerge className="w-4 h-4" />, text: "إنشاء WBS تلقائي" },
                    { icon: <Download className="w-4 h-4" />, text: "تصدير إلى CSV/Excel" },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {feature.icon}
                      </div>
                      <span>{feature.text}</span>
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
                  تحليل ملف جديد
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>مدعوم بالذكاء الاصطناعي • BOQ Analyzer</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
