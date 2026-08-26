import { useEffect, useState } from "react";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildFastExtractionSuggestions } from "@/lib/suggestion-generators";
import { Link } from "react-router-dom";
import { Upload, History, Lightbulb, FolderOpen, Zap, FileStack, FileCheck2, DraftingCompass, Hash } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FastExtractionStepper from "@/components/FastExtractionStepper";
import FastExtractionUploader, { UploadedFile } from "@/components/FastExtractionUploader";
import FastExtractionClassifier from "@/components/FastExtractionClassifier";
import FastExtractionDrawingAnalyzer from "@/components/FastExtractionDrawingAnalyzer";
import FastExtractionProjectSelector from "@/components/FastExtractionProjectSelector";
import { ProjectFilesViewer } from "@/components/ProjectFilesViewer";
import { AppShell } from "@/components/layout/AppShell";


export default function FastExtractionPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === "ar";

  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showProjectFiles, setShowProjectFiles] = useState(false);
  const [drawingResults, setDrawingResults] = useState<any[]>([]);
  const [extractedQuantities, setExtractedQuantities] = useState<any[]>([]);

  const readyFilesCount = files.filter((f) => f.status === "success").length;
  const hasDrawingFiles = files.some((f) => f.category === "drawings" && f.status === "success");

  const { replaceBySource } = useGlobalSuggestions();
  useEffect(() => {
    const drawingsCount = files.filter((f) => f.category === "drawings").length;
    replaceBySource(
      "fast-extraction",
      buildFastExtractionSuggestions({
        filesCount: files.length,
        readyCount: readyFilesCount,
        drawingsCount,
        step: currentStep,
        extractedItems: extractedQuantities,
      }),
    );
  }, [files, readyFilesCount, currentStep, extractedQuantities, replaceBySource]);


  const handleUploadComplete = () => {
    // Auto-advance to classify when files are uploaded
  };

  const handleClassifyComplete = () => {
    // Check if there are drawing files to analyze
    if (hasDrawingFiles) {
      setCurrentStep(3); // Go to drawing analysis
    } else {
      setCurrentStep(4); // Skip to project selection
    }
  };

  const handleDrawingAnalysisComplete = (results: any[]) => {
    setDrawingResults(results);
    setCurrentStep(4);
  };

  const handleDrawingAnalysisSkip = () => {
    setCurrentStep(4);
  };

  const goToClassify = () => {
    if (readyFilesCount > 0) {
      setCurrentStep(2);
    }
  };

  const tips = isArabic
    ? [
        "ارفع مستندات BOQ، رسومات، عقود",
        "سيقوم الذكاء الاصطناعي بتصنيف الملفات تلقائياً",
        "يمكن استخراج الكميات من المخططات",
        "يمكنك إنشاء مشروع جديد أو الربط بمشروع موجود",
      ]
    : [
        "Upload BOQ documents, drawings, contracts",
        "AI will automatically classify the files",
        "Quantities can be extracted from drawings",
        "Create a new project or link to existing one",
      ];

  return (
    <AppShell>
      <div>
        {/* Page actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProjectFiles(true)}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? "ملفات المشاريع" : "Project Files"}
            </span>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/projects" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isArabic ? "عمليات الاستخراج" : "Extraction History"}
              </span>
            </Link>
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setFiles([]);
              setCurrentStep(1);
            }}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? "رفع جديد" : "New Upload"}
            </span>
          </Button>
        </div>

        <div>

          {/* Professional header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-xl bg-primary/10">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {isArabic ? "الاستخراج السريع وتحليل المخططات" : "Fast Extraction & Drawing Analysis"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? "رفع الملفات وتصنيفها بالذكاء الاصطناعي وحصر الكميات من المخططات"
                  : "Upload files, classify with AI, and extract quantities from drawings"}
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileStack className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{files.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isArabic ? "ملفات مرفوعة" : "Uploaded"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <FileCheck2 className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{readyFilesCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isArabic ? "جاهزة" : "Ready"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DraftingCompass className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{files.filter((f) => f.category === "drawings").length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isArabic ? "مخططات" : "Drawings"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Hash className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{extractedQuantities.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isArabic ? "كميات مستخرجة" : "Quantities"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stepper */}
          <FastExtractionStepper currentStep={currentStep} onStepClick={setCurrentStep} />

          {/* Content Grid */}
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 mt-6">
            {/* Sidebar */}
            <div className="space-y-4">
              {/* Ready Files Counter */}
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      {isArabic ? "الملفات الجاهزة" : "Ready Files"}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {readyFilesCount}
                    </span>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={goToClassify}
                    disabled={readyFilesCount === 0}
                  >
                    ✨ {isArabic ? "تصنيف الملفات" : "Classify Files"}
                  </Button>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      {isArabic ? "نصائح" : "Tips"}
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Main Area */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {currentStep === 1 && (
                  <FastExtractionUploader
                    files={files}
                    onFilesChange={setFiles}
                    onUploadComplete={handleUploadComplete}
                  />
                )}
                {currentStep === 2 && (
                  <FastExtractionClassifier
                    files={files}
                    onFilesChange={setFiles}
                    onComplete={handleClassifyComplete}
                  />
                )}
                {currentStep === 3 && (
                  <FastExtractionDrawingAnalyzer
                    files={files}
                    onComplete={handleDrawingAnalysisComplete}
                    onSkip={handleDrawingAnalysisSkip}
                    onQuantitiesChange={setExtractedQuantities}
                  />
                )}
                {currentStep === 4 && (
                  <FastExtractionProjectSelector 
                    files={files} 
                    drawingResults={drawingResults}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Project Files Viewer */}
        <ProjectFilesViewer
          isOpen={showProjectFiles}
          onClose={() => setShowProjectFiles(false)}
        />
      </div>
    </AppShell>

  );
}
