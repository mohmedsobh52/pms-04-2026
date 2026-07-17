import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  ShieldCheck,
  Workflow,
  FileText,
  Inbox,
  Check,
  X,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { CATEGORY_META, SEVERITY_META } from "@/lib/suggestion-generators";
import type { SuggestionCategory } from "@/contexts/GlobalSuggestionsContext";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<SuggestionCategory | "all", any> = {
  all: Inbox,
  "ai-pricing": Sparkles,
  "data-quality": ShieldCheck,
  workflow: Workflow,
  reports: FileText,
};

export function GlobalSuggestionsInbox() {
  const { suggestions, dismiss, markApplied, clearAll, unreadCount } = useGlobalSuggestions();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SuggestionCategory | "all">("all");

  const active = useMemo(
    () => suggestions.filter((s) => !s.dismissed && !s.applied),
    [suggestions],
  );

  const filtered = useMemo(
    () => (tab === "all" ? active : active.filter((s) => s.category === tab)),
    [active, tab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: active.length };
    for (const s of active) c[s.category] = (c[s.category] || 0) + 1;
    return c;
  }, [active]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          className="fixed bottom-6 left-40 z-40 shadow-elegant gap-2 rounded-full h-12 px-5"
          aria-label="global suggestions"
        >
          <Sparkles className="w-4 h-4" />
          الاقتراحات الذكية
          {unreadCount > 0 && (
            <Badge variant="secondary" className="rounded-full h-5 min-w-5 px-1.5">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[440px] sm:w-[520px] p-0" dir="rtl">
        <SheetHeader className="p-6 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            صندوق الاقتراحات الموحد
            <Badge variant="secondary" className="ml-auto">{active.length}</Badge>
          </SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-5 mx-6 mt-3">
            {(["all", "ai-pricing", "data-quality", "workflow", "reports"] as const).map((k) => {
              const Icon = TAB_ICONS[k];
              return (
                <TabsTrigger key={k} value={k} className="text-[11px] gap-1 px-1">
                  <Icon className="w-3 h-3" />
                  <span>{k === "all" ? "الكل" : CATEGORY_META[k].ar.split(" ")[0]}</span>
                  {counts[k] ? (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{counts[k]}</Badge>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex items-center gap-2 px-6 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm("مسح كل الاقتراحات؟")) clearAll();
              }}
              disabled={active.length === 0}
              className="gap-1 text-destructive"
            >
              <Trash2 className="w-3 h-3" /> مسح الكل
            </Button>
          </div>

          <TabsContent value={tab} className="mt-3">
            <ScrollArea className="h-[calc(100vh-230px)] px-6 pb-6">
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-16">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  لا توجد اقتراحات نشطة في هذا القسم
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((s) => {
                    const meta = CATEGORY_META[s.category];
                    const sev = SEVERITY_META[s.severity];
                    const Icon = TAB_ICONS[s.category];
                    return (
                      <div
                        key={s.id}
                        className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={cn("w-4 h-4 shrink-0", meta.color)} />
                            <Badge variant="outline" className="text-[10px]">{meta.ar}</Badge>
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", sev.badge)}>
                              {sev.ar}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => dismiss(s.id)}
                            title="تجاهل"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-medium leading-snug">{s.title}</p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.applyLabel && (s.onApply || s.sourceRoute) && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 gap-1 text-xs"
                              onClick={async () => {
                                if (s.onApply) await s.onApply();
                                if (s.sourceRoute) navigate(s.sourceRoute);
                                markApplied(s.id);
                              }}
                            >
                              <Check className="w-3 h-3" />
                              {s.applyLabel}
                            </Button>
                          )}
                          {s.sourceRoute && !s.applyLabel && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              onClick={() => navigate(s.sourceRoute!)}
                            >
                              <ExternalLink className="w-3 h-3" />
                              انتقال
                            </Button>
                          )}
                          {s.sourceScreen && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {s.sourceScreen}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
