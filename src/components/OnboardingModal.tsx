import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, DollarSign, BarChart3, CheckCircle } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  isArabic: boolean;
  onStartAnalysis: () => void;
}

const steps = [
  {
    icon: Upload,
    titleAr: "رفع BOQ",
    titleEn: "Upload BOQ",
    descAr: "ارفع ملف PDF أو Excel لاستخراج بنود جدول الكميات تلقائياً",
    descEn: "Upload a PDF or Excel file to automatically extract BOQ items",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  {
    icon: DollarSign,
    titleAr: "التسعير",
    titleEn: "Pricing",
    descAr: "سعّر البنود يدوياً أو باستخدام الذكاء الاصطناعي لتحليل دقيق",
    descEn: "Price items manually or use AI for accurate cost analysis",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    icon: BarChart3,
    titleAr: "التقارير",
    titleEn: "Reports",
    descAr: "احصل على تقارير شاملة وتحليلات متقدمة جاهزة للتصدير",
    descEn: "Get comprehensive reports and advanced analytics ready for export",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
  },
];

export default function OnboardingModal({
  open,
  onClose,
  projectId,
  projectName,
  isArabic,
  onStartAnalysis,
}: OnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-3xl">
              🎉
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {isArabic ? "تم إنشاء مشروعك بنجاح!" : "Project Created Successfully!"}
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

        {/* Steps */}
        <div className="space-y-3 my-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${step.border} bg-background`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${step.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                      {index + 1}
                    </span>
                    <p className="font-semibold text-sm text-foreground">
                      {isArabic ? step.titleAr : step.titleEn}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {isArabic ? step.descAr : step.descEn}
                  </p>
                </div>
                <CheckCircle className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
              </div>
            );
          })}
        </div>

        {/* Progress indicator dots */}
        <div className="flex justify-center gap-2 my-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/20"
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className={`flex gap-3 mt-2 ${isArabic ? "flex-row-reverse" : ""}`}>
          <Button
            className="flex-1 gap-2"
            onClick={onStartAnalysis}
          >
            <Upload className="w-4 h-4" />
            {isArabic ? "ابدأ برفع BOQ الآن" : "Start Uploading BOQ"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {isArabic ? "استكشف المشروع" : "Explore Project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
