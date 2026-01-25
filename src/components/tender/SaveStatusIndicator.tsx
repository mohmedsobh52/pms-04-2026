import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveStatusIndicatorProps {
  status: "saved" | "saving" | "unsaved" | "error";
  lastSaved?: Date | null;
  isArabic: boolean;
}

export function SaveStatusIndicator({ status, lastSaved, isArabic }: SaveStatusIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case "saved":
        return {
          icon: <Check className="w-3.5 h-3.5" />,
          text: isArabic ? "تم الحفظ" : "Saved",
          className: "text-emerald-600 dark:text-emerald-400",
        };
      case "saving":
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          text: isArabic ? "جاري الحفظ..." : "Saving...",
          className: "text-blue-600 dark:text-blue-400",
        };
      case "unsaved":
        return {
          icon: <Cloud className="w-3.5 h-3.5" />,
          text: isArabic ? "تغييرات غير محفوظة" : "Unsaved changes",
          className: "text-amber-600 dark:text-amber-400",
        };
      case "error":
        return {
          icon: <CloudOff className="w-3.5 h-3.5" />,
          text: isArabic ? "خطأ في الحفظ" : "Save error",
          className: "text-red-600 dark:text-red-400",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  const formatLastSaved = () => {
    if (!lastSaved) return "";
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 10) {
      return isArabic ? "الآن" : "just now";
    } else if (diffSecs < 60) {
      return isArabic ? `منذ ${diffSecs} ثانية` : `${diffSecs}s ago`;
    } else if (diffMins < 60) {
      return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    }
    
    return lastSaved.toLocaleTimeString(isArabic ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", statusDisplay.className)}>
      {statusDisplay.icon}
      <span>{statusDisplay.text}</span>
      {status === "saved" && lastSaved && (
        <span className="text-muted-foreground">({formatLastSaved()})</span>
      )}
    </div>
  );
}
