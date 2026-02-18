import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, DollarSign, BarChart3, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  isArabic: boolean;
  onStartAnalysis: () => void;
  completedSteps?: boolean[]; // [boq uploaded, pricing done, reports ready]
}

const steps = [
  {
    icon: Upload,
    titleAr: "رفع BOQ",
    titleEn: "Upload BOQ",
    descAr: "ارفع ملف PDF أو Excel لاستخراج بنود جدول الكميات تلقائياً",
    descEn: "Upload a PDF or Excel file to automatically extract BOQ items",
    colorDefault: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderDefault: "border-blue-500/20",
    colorDone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderDone: "border-emerald-500/30",
  },
  {
    icon: DollarSign,
    titleAr: "التسعير",
    titleEn: "Pricing",
    descAr: "سعّر البنود يدوياً أو باستخدام الذكاء الاصطناعي لتحليل دقيق",
    descEn: "Price items manually or use AI for accurate cost analysis",
    colorDefault: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    borderDefault: "border-amber-500/20",
    colorDone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderDone: "border-emerald-500/30",
  },
  {
    icon: BarChart3,
    titleAr: "التقارير",
    titleEn: "Reports",
    descAr: "احصل على تقارير شاملة وتحليلات متقدمة جاهزة للتصدير",
    descEn: "Get comprehensive reports and advanced analytics ready for export",
    colorDefault: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    borderDefault: "border-violet-500/20",
    colorDone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderDone: "border-emerald-500/30",
  },
];

export default function OnboardingModal({
  open,
  onClose,
  projectId,
  projectName,
  isArabic,
  onStartAnalysis,
  completedSteps = [false, false, false],
}: OnboardingModalProps) {
  const completedCount = completedSteps.filter(Boolean).length;
  const allDone = completedCount === steps.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-3xl">
              {allDone ? "🏆" : "🎉"}
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {allDone
              ? (isArabic ? "مشروعك مكتمل! أحسنت 🎊" : "Project Complete! Great Work 🎊")
              : (isArabic ? "تم إنشاء مشروعك بنجاح!" : "Project Created Successfully!")}
          </DialogTitle>
          {projectName && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              {isArabic ? `مشروع: ${projectName}` : `Project: ${projectName}`}
            </p>
          )}
          <p className="text-sm text-muted-foreground text-center mt-1">
            {isArabic
              ? "إليك خطوات البدء للاستفادة القصوى من النظام:"
              : "Here are the steps to get started and make the most of the system:"}
          </p>
        </DialogHeader>

        {/* Progress bar */}
        {completedCount > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{isArabic ? "التقدم الكلي" : "Overall Progress"}</span>
              <span>{Math.round((completedCount / steps.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3 my-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isDone = completedSteps[index] === true;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  isDone
                    ? `${step.borderDone} bg-emerald-500/5`
                    : `${step.borderDefault} bg-background`
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                    isDone ? step.colorDone : step.colorDefault
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 transition-colors",
                        isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : index + 1}
                    </span>
                    <p
                      className={cn(
                        "font-semibold text-sm",
                        isDone ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                      )}
                    >
                      {isArabic ? step.titleAr : step.titleEn}
                    </p>
                    {isDone && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {isArabic ? "✓ مكتمل" : "✓ Done"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {isArabic ? step.descAr : step.descEn}
                  </p>
                </div>
                {isDone && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 my-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                completedSteps[i] ? "bg-emerald-500" : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className={`flex gap-3 mt-2 ${isArabic ? "flex-row-reverse" : ""}`}>
          {!allDone && (
            <Button
              className="flex-1 gap-2"
              onClick={onStartAnalysis}
            >
              <Upload className="w-4 h-4" />
              {isArabic ? "ابدأ برفع BOQ الآن" : "Start Uploading BOQ"}
            </Button>
          )}
          <Button
            variant={allDone ? "default" : "outline"}
            className="flex-1"
            onClick={onClose}
          >
            {allDone
              ? (isArabic ? "عرض المشروع" : "View Project")
              : (isArabic ? "استكشف المشروع" : "Explore Project")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
