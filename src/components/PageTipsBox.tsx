import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/hooks/useLanguage";
import { getTipsForPath, PageTip } from "@/lib/page-tips";

interface PageTipsBoxProps {
  tips?: PageTip[];
}

export function PageTipsBox({ tips: propTips }: PageTipsBoxProps) {
  const location = useLocation();
  const { isArabic } = useLanguage();

  const tips = propTips || getTipsForPath(location.pathname);

  const storageKey = `tips-open-${location.pathname}`;
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? false : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  if (tips.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
        <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
        <span className="flex-1 text-start">
          {isArabic ? "نصائح الاستخدام" : "Usage Tips"}
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          {tips.map((tip, i) => (
            <li key={i}>{isArabic ? tip.ar : tip.en}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
