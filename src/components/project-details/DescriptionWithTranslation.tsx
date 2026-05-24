import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Languages, Eye, EyeOff } from "lucide-react";
import { ProjectItem } from "./types";

interface Props {
  item: ProjectItem;
  isArabic: boolean;
}

/**
 * Renders the item description with its cached translation (if any).
 * Shows the original + translation side-by-side with a toggle to hide/show each.
 */
export const DescriptionWithTranslation = ({ item, isArabic }: Props) => {
  // Target language: if UI is Arabic, show English translation; else show Arabic.
  const targetLang: "ar" | "en" = isArabic ? "en" : "ar";

  const descTrans = item.translations?.description?.[targetLang];
  const notesTrans = item.translations?.notes?.[targetLang];

  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  const hasTranslation = Boolean(descTrans || notesTrans);

  return (
    <div className="space-y-2 whitespace-pre-wrap break-words">
      {showOriginal && (
        <div>
          <p>{item.description || "-"}</p>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
          )}
        </div>
      )}

      {hasTranslation && showTranslation && (
        <div className="border-t border-border/60 pt-2 mt-2 bg-primary/5 rounded-md p-2">
          <div className="flex items-center gap-1 mb-1 text-[10px] uppercase tracking-wide text-primary/80">
            <Languages className="w-3 h-3" />
            <span>{targetLang === "ar" ? "الترجمة" : "Translation"}</span>
          </div>
          {descTrans && <p>{descTrans}</p>}
          {notesTrans && (
            <p className="text-xs text-muted-foreground mt-1">{notesTrans}</p>
          )}
        </div>
      )}

      {hasTranslation && (
        <div className="flex gap-1 mt-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => setShowOriginal((v) => !v)}
            title={isArabic ? "إخفاء/إظهار الأصل" : "Toggle original"}
          >
            {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="ml-1">{isArabic ? "الأصل" : "Original"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => setShowTranslation((v) => !v)}
            title={isArabic ? "إخفاء/إظهار الترجمة" : "Toggle translation"}
          >
            {showTranslation ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="ml-1">{isArabic ? "الترجمة" : "Translation"}</span>
          </Button>
        </div>
      )}
    </div>
  );
};
