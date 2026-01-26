import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigationHistory, iconMap } from "@/hooks/useNavigationHistory";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  Clock, 
  ChevronRight, 
  Trash2,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function NavigationHistorySidebar() {
  const { getHistoryExcludingCurrent, clearHistory } = useNavigationHistory();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const history = getHistoryExcludingCurrent();

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || FileText;
    return IconComponent;
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { 
      addSuffix: true,
      locale: isArabic ? ar : enUS
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          title={isArabic ? "سجل التنقل" : "Navigation History"}
        >
          <History className="h-4 w-4" />
          {history.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {history.length > 9 ? "9+" : history.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side={isArabic ? "right" : "left"} 
        className="w-80 sm:w-96"
      >
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {isArabic ? "الصفحات الأخيرة" : "Recent Pages"}
          </SheetTitle>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {isArabic 
                ? "لا توجد صفحات في السجل بعد" 
                : "No pages in history yet"}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {isArabic 
                ? "ستظهر الصفحات التي تزورها هنا" 
                : "Pages you visit will appear here"}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[calc(100vh-180px)] mt-4">
              <div className="space-y-1 pr-3">
                {history.map((entry, index) => {
                  const IconComponent = getIcon(entry.icon);
                  return (
                    <button
                      key={`${entry.path}-${index}`}
                      onClick={() => handleNavigate(entry.path)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg",
                        "hover:bg-muted/80 text-start transition-all duration-200",
                        "group border border-transparent hover:border-border",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {isArabic ? entry.labelAr : entry.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatTime(entry.timestamp)}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-all",
                        "opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0",
                        isArabic && "rotate-180"
                      )} />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="absolute bottom-4 left-4 right-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isArabic ? "مسح السجل" : "Clear History"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
