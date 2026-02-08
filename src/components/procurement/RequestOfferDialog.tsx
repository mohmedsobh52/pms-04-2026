import { useState, ReactNode, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Send, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RequestOfferDialogProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const suggestions = [
  { en: "Need 10 laptops for development team", ar: "نحتاج 10 أجهزة لابتوب لفريق التطوير" },
  { en: "Office furniture for 50 employees", ar: "أثاث مكتبي لـ 50 موظف" },
  { en: "Construction materials for building project", ar: "مواد بناء لمشروع إنشائي" },
  { en: "Electrical equipment and supplies", ar: "معدات ولوازم كهربائية" },
  { en: "HVAC systems for commercial building", ar: "أنظمة تكييف لمبنى تجاري" },
];

type DialogStep = 'input' | 'processing' | 'results';

export const RequestOfferDialog = ({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RequestOfferDialogProps) => {
  const { isArabic } = useLanguage();
  const [request, setRequest] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>('input');
  const [progress, setProgress] = useState(0);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    controlledOnOpenChange?.(newOpen);
    
    // Reset state when closing
    if (!newOpen) {
      setTimeout(() => {
        setStep('input');
        setProgress(0);
        setRequest("");
      }, 300);
    }
  };

  const handleSuggestionClick = (suggestion: { en: string; ar: string }) => {
    const text = isArabic ? suggestion.ar : suggestion.en;
    setRequest(text);
    // Auto-submit when clicking a suggestion
    handleSubmitWithQuery(text);
  };

  const handleSubmitWithQuery = async (query: string) => {
    if (!query.trim()) return;

    setStep('processing');
    setProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p;
        return p + Math.random() * 5 + 2;
      });
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('search-offers', {
        body: { query, language: isArabic ? 'ar' : 'en' }
      });

      clearInterval(progressInterval);

      if (error) {
        console.error('Search offers error:', error);
        throw new Error(error.message || 'Failed to search offers');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setProgress(100);

      // Show success toast with summary
      toast.success(
        isArabic
          ? "تم البحث بنجاح! تم إرسال الطلب للموردين"
          : "Search complete! Request sent to suppliers",
        {
          description: data?.summary || (isArabic ? "تم تحليل طلبك" : "Your request has been analyzed")
        }
      );

      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Submit error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast.error(
        isArabic
          ? "حدث خطأ أثناء البحث"
          : "Error during search",
        { description: errorMessage }
      );
      
      setStep('input');
      setProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitWithQuery(request);
  };

  // Processing View
  const renderProcessingView = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Animated Icon Area */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/30 rounded-lg animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          <div className="flex gap-1">
            <Sparkles className="w-4 h-4 text-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <Sparkles className="w-4 h-4 text-primary/80 animate-bounce" style={{ animationDelay: '150ms' }} />
            <Sparkles className="w-4 h-4 text-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-primary">
          {isArabic ? "جاري المعالجة..." : "Processing..."}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isArabic 
            ? "يقوم الذكاء الاصطناعي بتحليل عروض الشركاء من قواعد البيانات ومصادر الويب، ويُنشئ ملخصًا موجزًا"
            : "AI analyzes partner offers from databases and web sources, creating a concise summary."}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isArabic ? "جاري التحميل..." : "Loading..."}</span>
          <span className="text-primary font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );

  // Input View
  const renderInputView = () => (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      {/* Main Input Section */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {isArabic
            ? "أدخل طلبك بالتفصيل للحصول على أفضل عروض الأسعار من الموردين"
            : "Enter your request in detail to get the best price quotes from suppliers"}
        </p>

        <div className="relative">
          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder={
              isArabic
                ? "اكتب طلبك هنا..."
                : "Write your request here..."
            }
            rows={4}
            className="resize-none pe-10 bg-background"
          />
          <button
            type="button"
            className="absolute end-3 top-3 text-muted-foreground hover:text-primary transition-colors"
            title={isArabic ? "تسجيل صوتي" : "Voice input"}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {isArabic ? "اقتراحات جاهزة:" : "Suggested requests:"}
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-accent hover:border-primary/50 transition-colors"
            >
              {isArabic ? suggestion.ar : suggestion.en}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          {isArabic ? "إلغاء" : "Cancel"}
        </Button>
        <Button
          type="submit"
          disabled={!request.trim()}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4 me-2" />
          {isArabic ? "إرسال الطلب" : "Submit Request"}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic ? "طلب عرض سعر" : "Request Offer"}
          </DialogTitle>
        </DialogHeader>

        {step === 'processing' ? renderProcessingView() : renderInputView()}
      </DialogContent>
    </Dialog>
  );
};
