import { useState, useCallback } from "react";
import { FileUp, Sparkles, GitMerge, Download, ChevronDown } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { WorkflowStatus, defaultWorkflowSteps, type WorkflowStep, type StepStatus } from "@/components/WorkflowStatus";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPDF } from "@/lib/pdf-utils";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
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
    setIsProcessing(true);
    updateStepStatus("upload", "complete");
    updateStepStatus("extract", "processing");

    try {
      const text = await extractTextFromPDF(file);
      setExtractedText(text);
      updateStepStatus("extract", "complete");
      
      toast({
        title: "تم استخراج النص بنجاح",
        description: `تم استخراج ${text.length} حرف من الملف`,
      });
    } catch (error) {
      console.error("Error extracting text:", error);
      updateStepStatus("extract", "error");
      toast({
        title: "خطأ في استخراج النص",
        description: "حدث خطأ أثناء قراءة ملف PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleClearFile = () => {
    setSelectedFile(null);
    setExtractedText("");
    setAnalysisData(null);
    setWbsData(null);
    setWorkflowSteps(defaultWorkflowSteps);
  };

  const runAnalysis = async () => {
    if (!extractedText) {
      toast({
        title: "لا يوجد نص",
        description: "يرجى رفع ملف PDF أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    updateStepStatus("analyze", "processing");

    try {
      // Extract items analysis
      const { data: itemsResult, error: itemsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: extractedText, analysis_type: "extract_items" },
      });

      if (itemsError) throw itemsError;

      setAnalysisData(itemsResult);
      updateStepStatus("analyze", "complete");

      toast({
        title: "تم التحليل بنجاح",
        description: `تم استخراج ${itemsResult.items?.length || 0} عنصر`,
      });

      // Create WBS
      updateStepStatus("wbs", "processing");
      
      const { data: wbsResult, error: wbsError } = await supabase.functions.invoke("analyze-boq", {
        body: { text: extractedText, analysis_type: "create_wbs" },
      });

      if (wbsError) throw wbsError;

      setWbsData(wbsResult);
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
        description: "حدث خطأ أثناء تحليل الملف",
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
                <GitMerge className="w-5 h-5 text-white" />
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
              ارفع ملف PDF لجدول الكميات وسنقوم بتحليله واستخراج العناصر وإنشاء WBS تلقائياً
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload & Actions */}
            <div className="lg:col-span-2 space-y-6">
              <FileUpload
                onFileSelect={handleFileSelect}
                isProcessing={isProcessing && !extractedText}
                selectedFile={selectedFile}
                onClear={handleClearFile}
              />

              {extractedText && !analysisData && (
                <div className="glass-card p-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">النص المستخرج</h3>
                      <p className="text-sm text-muted-foreground">
                        {extractedText.length.toLocaleString()} حرف
                      </p>
                    </div>
                    <Button
                      onClick={runAnalysis}
                      disabled={isProcessing}
                      className="btn-gradient gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      بدء التحليل
                    </Button>
                  </div>
                  <div className="bg-muted rounded-xl p-4 max-h-48 overflow-y-auto">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
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
                    { icon: <FileUp className="w-4 h-4" />, text: "استخراج النص من PDF" },
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
