import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Lightbulb, X } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export interface PageSuggestion {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  tone?: "emerald" | "violet" | "rose" | "amber" | "sky" | "teal";
  to?: string;
  onClick?: () => void;
  show?: boolean;
}

const toneClasses: Record<NonNullable<PageSuggestion["tone"]>, { ring: string; icon: string; bg: string }> = {
  emerald: { ring: "ring-emerald-500/30", icon: "text-emerald-600", bg: "bg-emerald-500/10" },
  violet:  { ring: "ring-violet-500/30",  icon: "text-violet-600",  bg: "bg-violet-500/10" },
  rose:    { ring: "ring-rose-500/30",    icon: "text-rose-600",    bg: "bg-rose-500/10" },
  amber:   { ring: "ring-amber-500/30",   icon: "text-amber-600",   bg: "bg-amber-500/10" },
  sky:     { ring: "ring-sky-500/30",     icon: "text-sky-600",     bg: "bg-sky-500/10" },
  teal:    { ring: "ring-teal-500/30",    icon: "text-teal-600",    bg: "bg-teal-500/10" },
};

interface Props {
  pageKey: string;
  titleAr?: string;
  titleEn?: string;
  suggestions: PageSuggestion[];
  className?: string;
}

export function PageSuggestions({ pageKey, titleAr, titleEn, suggestions, className }: Props) {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const dismissKey = `page-sugg-dismissed:${pageKey}`;
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(dismissKey) === "1");

  const visible = suggestions.filter((s) => s.show !== false);
  if (dismissed || visible.length === 0) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  return (
    <Card className={`relative overflow-hidden p-4 sm:p-5 mb-4 ring-1 ring-amber-400/30 ${className ?? ""}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-emerald-500/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-amber-400/15 ring-1 ring-amber-400/30 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-sm">
            {isArabic ? titleAr ?? "اقتراحات مفيدة" : titleEn ?? "Helpful suggestions"}
          </h3>
          <Badge variant="secondary" className="ml-auto text-xs">{visible.length}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismiss} aria-label="dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {visible.map((s) => {
            const Icon = s.icon;
            const t = toneClasses[s.tone ?? "emerald"];
            const go = () => (s.onClick ? s.onClick() : s.to ? navigate(s.to) : undefined);
            return (
              <button
                key={s.id}
                onClick={go}
                className={`group flex items-center gap-3 p-2.5 rounded-lg ring-1 ring-border/60 hover:ring-2 hover:${t.ring} bg-card/60 hover:bg-card transition-all text-start`}
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${t.bg}`}>
                  <Icon className={`h-4 w-4 ${t.icon}`} />
                </div>
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {isArabic ? s.labelAr : s.labelEn}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground rtl:rotate-180 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
