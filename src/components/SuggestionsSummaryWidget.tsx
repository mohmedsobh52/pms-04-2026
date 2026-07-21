import { useMemo } from "react";
import { Sparkles, AlertTriangle, ShieldCheck, Workflow, FileText, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGlobalSuggestions, isSuggestionSnoozed } from "@/contexts/GlobalSuggestionsContext";
import { CATEGORY_META } from "@/lib/suggestion-generators";
import type { SuggestionCategory } from "@/contexts/GlobalSuggestionsContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const CAT_ICONS: Record<SuggestionCategory, any> = {
  "ai-pricing": Sparkles,
  "data-quality": ShieldCheck,
  workflow: Workflow,
  reports: FileText,
};

/**
 * Compact widget that surfaces the top pending suggestions across the app.
 * Drop into any dashboard/home page to give an at-a-glance health snapshot.
 */
export function SuggestionsSummaryWidget() {
  const { suggestions } = useGlobalSuggestions();
  const navigate = useNavigate();

  const active = useMemo(
    () => suggestions.filter((s) => !s.dismissed && !s.applied && !isSuggestionSnoozed(s)),
    [suggestions],
  );

  const byCat = useMemo(() => {
    const map: Record<SuggestionCategory, number> = {
      "ai-pricing": 0,
      "data-quality": 0,
      workflow: 0,
      reports: 0,
    };
    for (const s of active) map[s.category as SuggestionCategory]++;
    return map;
  }, [active]);

  const top = useMemo(() => {
    const weight = { critical: 0, warning: 1, info: 2, success: 3 } as const;
    return [...active].sort((a, b) => weight[a.severity] - weight[b.severity]).slice(0, 4);
  }, [active]);

  const criticalCount = active.filter((s) => s.severity === "critical").length;
  const warningCount = active.filter((s) => s.severity === "warning").length;

  return (
    <Card className="p-4 md:p-5 space-y-4 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">الاقتراحات الذكية</div>
            <div className="text-[11px] text-muted-foreground">
              {active.length} اقتراح نشط عبر البرنامج
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertTriangle className="w-3 h-3" /> {criticalCount}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400">
              {warningCount} تحذير
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(CAT_ICONS) as SuggestionCategory[]).map((cat) => {
          const Icon = CAT_ICONS[cat];
          const meta = CATEGORY_META[cat];
          const n = byCat[cat];
          return (
            <div
              key={cat}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-md border bg-card/50",
                n > 0 ? "border-primary/30" : "opacity-60",
              )}
            >
              <Icon className={cn("w-4 h-4", meta.color)} />
              <div className="text-sm font-bold leading-none">{n}</div>
              <div className="text-[9px] text-muted-foreground text-center leading-tight">
                {meta.ar.split(" ")[0]}
              </div>
            </div>
          );
        })}
      </div>

      {top.length > 0 ? (
        <div className="space-y-1.5">
          {top.map((s) => (
            <button
              key={s.id}
              onClick={() => s.sourceRoute && navigate(s.sourceRoute)}
              className="w-full text-right p-2 rounded-md hover:bg-muted/60 transition-colors flex items-start gap-2 group"
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                  s.severity === "critical" && "bg-destructive",
                  s.severity === "warning" && "bg-amber-500",
                  s.severity === "info" && "bg-sky-500",
                  s.severity === "success" && "bg-emerald-500",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{s.title}</div>
                {s.sourceScreen && (
                  <div className="text-[10px] text-muted-foreground truncate">{s.sourceScreen}</div>
                )}
              </div>
              {s.sourceRoute && (
                <ArrowLeft className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground py-4">
          لا توجد اقتراحات نشطة — كل شيء على ما يرام ✓
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs gap-1.5"
        onClick={() => {
          // Trigger the global inbox via keyboard shortcut event
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true }));
        }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        فتح مركز الاقتراحات (Ctrl+/)
      </Button>
    </Card>
  );
}

export default SuggestionsSummaryWidget;
