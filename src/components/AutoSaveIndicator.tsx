import { Cloud, CloudOff, Loader2, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  compact?: boolean;
}

export function AutoSaveIndicator({
  lastSaved,
  hasUnsavedChanges,
  isSaving = false,
  compact = false,
}: AutoSaveIndicatorProps) {
  const { isArabic } = useLanguage();

  const getStatus = () => {
    if (isSaving) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: "text-primary",
        text: isArabic ? "جاري الحفظ..." : "Saving...",
      };
    }
    
    if (hasUnsavedChanges) {
      return {
        icon: <CloudOff className="w-4 h-4" />,
        color: "text-warning",
        text: isArabic ? "تغييرات غير محفوظة" : "Unsaved changes",
      };
    }
    
    if (lastSaved) {
      return {
        icon: <Check className="w-4 h-4" />,
        color: "text-success",
        text: isArabic 
          ? `تم الحفظ ${lastSaved.toLocaleTimeString("ar-EG")}`
          : `Saved ${lastSaved.toLocaleTimeString()}`,
      };
    }
    
    return {
      icon: <Cloud className="w-4 h-4" />,
      color: "text-muted-foreground",
      text: isArabic ? "الحفظ التلقائي مفعّل" : "Auto-save enabled",
    };
  };

  const status = getStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 text-xs rounded-md transition-all duration-300",
            compact ? "px-1.5 py-0.5" : "px-2 py-1",
            status.color,
            isSaving && "animate-pulse",
            hasUnsavedChanges ? "bg-warning/10" : "bg-muted/30"
          )}>
            {status.icon}
            {!compact && <span className="hidden sm:inline">{status.text}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status.text}</p>
          {lastSaved && (
            <p className="text-xs text-muted-foreground">
              {isArabic ? "آخر حفظ:" : "Last saved:"} {lastSaved.toLocaleString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
