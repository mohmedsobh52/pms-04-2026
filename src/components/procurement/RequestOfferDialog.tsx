import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Send, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface RequestOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestions = [
  { en: "Need 10 laptops for development team", ar: "نحتاج 10 أجهزة لابتوب لفريق التطوير" },
  { en: "Office furniture for 50 employees", ar: "أثاث مكتبي لـ 50 موظف" },
  { en: "Construction materials for building project", ar: "مواد بناء لمشروع إنشائي" },
  { en: "Electrical equipment and supplies", ar: "معدات ولوازم كهربائية" },
  { en: "HVAC systems for commercial building", ar: "أنظمة تكييف لمبنى تجاري" },
];

export const RequestOfferDialog = ({
  open,
  onOpenChange,
}: RequestOfferDialogProps) => {
  const { isArabic } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [request, setRequest] = useState("");

  const handleSuggestionClick = (suggestion: { en: string; ar: string }) => {
    setRequest(isArabic ? suggestion.ar : suggestion.en);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim()) return;

    setIsLoading(true);

    // Simulate sending request
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success(
      isArabic
        ? "تم إرسال طلب عرض السعر بنجاح"
        : "Offer request sent successfully"
    );

    setIsLoading(false);
    onOpenChange(false);
    setRequest("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic ? "طلب عرض سعر" : "Request Offer"}
          </DialogTitle>
        </DialogHeader>

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
              disabled={isLoading || !request.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 me-2" />
              )}
              {isArabic ? "إرسال الطلب" : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
