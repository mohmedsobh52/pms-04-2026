import { useState } from "react";
import { Link } from "react-router-dom";
import { Home, Upload, History, Lightbulb, FolderOpen } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import FastExtractionStepper from "@/components/FastExtractionStepper";
import FastExtractionUploader, { UploadedFile } from "@/components/FastExtractionUploader";
import FastExtractionClassifier from "@/components/FastExtractionClassifier";
import FastExtractionProjectSelector from "@/components/FastExtractionProjectSelector";
import { ProjectFilesViewer } from "@/components/ProjectFilesViewer";

export default function FastExtractionPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === "ar";

  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showProjectFiles, setShowProjectFiles] = useState(false);

  const readyFilesCount = files.filter((f) => f.status === "success").length;

  const handleUploadComplete = () => {
    // Auto-advance to classify when files are uploaded
  };

  const handleClassifyComplete = () => {
    setCurrentStep(3);
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
        "يمكنك إنشاء مشروع جديد أو الربط بمشروع موجود",
      ]
    : [
        "Upload BOQ documents, drawings, contracts",
        "AI will automatically classify the files",
        "Create a new project or link to existing one",
      ];

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/construction-bg.png')" }}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="min-h-screen bg-background/80 backdrop-blur-sm">
        {/* Header */}
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 text-primary font-bold">
                  <Home className="h-5 w-5" />
                  <span className="hidden sm:inline">fast-extraction</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
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
                <ThemeToggle />
                <LanguageToggle />
                {user && <UserMenu />}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              ⚡ {isArabic ? "الاستخراج السريع" : "Fast Extraction"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isArabic
                ? "رفع الملفات وتصنيفها بالذكاء الاصطناعي ومتابعة التقدم"
                : "Upload files, classify with AI, and track progress"}
            </p>
          </div>

          {/* Stepper */}
          <FastExtractionStepper currentStep={currentStep} onStepClick={setCurrentStep} />

          {/* Content Grid */}
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 mt-8">
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
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
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
                  <FastExtractionProjectSelector files={files} />
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Project Files Viewer */}
        <ProjectFilesViewer
          isOpen={showProjectFiles}
          onClose={() => setShowProjectFiles(false)}
        />
      </div>
    </div>
  );
}
