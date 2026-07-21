import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search,
  Clock,
  Pin,
  PinOff,
  ChevronDown,
  Layers,
  Download,
  CheckSquare,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGlobalSuggestions, isSuggestionSnoozed } from "@/contexts/GlobalSuggestionsContext";
import { CATEGORY_META, SEVERITY_META } from "@/lib/suggestion-generators";
import type { SuggestionCategory, SuggestionSeverity } from "@/contexts/GlobalSuggestionsContext";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<SuggestionCategory | "all", any> = {
  all: Inbox,
  "ai-pricing": Sparkles,
  "data-quality": ShieldCheck,
  workflow: Workflow,
  reports: FileText,
};

const SEV_WEIGHT: Record<SuggestionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

type SortMode = "severity" | "recent" | "screen";

function counts_bySev(list: any[], sev: SuggestionSeverity) {
  return list.filter((s) => s.severity === sev).length;
}

export function GlobalSuggestionsInbox() {
  const {
    suggestions,
    dismiss,
    dismissMany,
    snoozeMany,
    markApplied,
    snooze,
    togglePin,
    restoreAll,
    clearAll,
    unreadCount,
    criticalCount,
    dismissedCount,
  } = useGlobalSuggestions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SuggestionCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sevFilter, setSevFilter] = useState<SuggestionSeverity | "all">("all");
  const [sort, setSort] = useState<SortMode>("severity");
  const lastCriticalIds = useRef<Set<string>>(new Set());

  // Keyboard shortcut: Ctrl+/ or Cmd+/ to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = useMemo(
    () => suggestions.filter((s) => !s.dismissed && !s.applied && !isSuggestionSnoozed(s)),
    [suggestions],
  );

  // Toast on newly-arrived critical suggestions
  useEffect(() => {
    const currentCritical = active.filter((s) => s.severity === "critical");
    const currentIds = new Set(currentCritical.map((s) => s.id));
    const fresh = currentCritical.filter((s) => !lastCriticalIds.current.has(s.id));
    if (lastCriticalIds.current.size > 0 && fresh.length > 0 && !open) {
      toast({
        title: `${fresh.length} تنبيه حرِج جديد`,
        description: fresh[0].title,
      });
    }
    lastCriticalIds.current = currentIds;
  }, [active, open]);


  const filtered = useMemo(() => {
    let list = tab === "all" ? active : active.filter((s) => s.category === tab);
    if (sevFilter !== "all") list = list.filter((s) => s.severity === sevFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.sourceScreen?.toLowerCase().includes(q),
      );
    }
    // Pinned first
    const sorted = [...list].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      if (sort === "severity") return SEV_WEIGHT[a.severity] - SEV_WEIGHT[b.severity];
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      return (a.sourceScreen ?? "").localeCompare(b.sourceScreen ?? "");
    });
    return sorted;
  }, [active, tab, query, sevFilter, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: active.length };
    for (const s of active) c[s.category] = (c[s.category] || 0) + 1;
    return c;
  }, [active]);

  const grouped = useMemo(() => {
    if (sort !== "screen") return null;
    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const key = s.sourceScreen || "غير محدد";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [filtered, sort]);

  const exportCSV = () => {
    const rows = [
      ["Severity", "Category", "Title", "Description", "Screen", "Route", "Created"],
      ...filtered.map((s) => [
        s.severity,
        s.category,
        (s.title || "").replace(/"/g, '""'),
        (s.description || "").replace(/"/g, '""'),
        s.sourceScreen || "",
        s.sourceRoute || "",
        s.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suggestions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير الاقتراحات", description: `${filtered.length} صف CSV` });
  };

  const exportJSON = () => {
    const payload = filtered.map(({ onApply, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suggestions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير JSON", description: `${filtered.length} عنصر` });
  };

  const dismissView = () => {
    if (filtered.length === 0) return;
    if (confirm(`تجاهل ${filtered.length} اقتراح ظاهر؟`)) dismissMany(filtered.map((s) => s.id));
  };

  const snoozeView = (hours: number) => {
    if (filtered.length === 0) return;
    snoozeMany(filtered.map((s) => s.id), hours);
    toast({ title: `تم تأجيل ${filtered.length} اقتراح` });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          className="fixed bottom-6 left-40 z-40 shadow-elegant gap-2 rounded-full h-12 px-5"
          aria-label="global suggestions"
          title="الاقتراحات الذكية (Ctrl+/)"
        >
          <Sparkles className="w-4 h-4" />
          الاقتراحات الذكية
          {unreadCount > 0 && (
            <Badge variant="secondary" className="rounded-full h-5 min-w-5 px-1.5">
              {unreadCount}
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge variant="destructive" className="rounded-full h-5 min-w-5 px-1.5">
              {criticalCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[460px] sm:w-[540px] p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            صندوق الاقتراحات الموحد
            <Badge variant="secondary" className="ml-auto">{active.length}</Badge>
          </SheetTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              حرِج: {counts_bySev(active, "critical")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              تحذير: {counts_bySev(active, "warning")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              معلومة: {counts_bySev(active, "info")}
            </span>
            <span className="ml-auto opacity-70">Ctrl+/ للفتح</span>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 mx-5 mt-3">
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

          <div className="px-5 mt-3 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث في الاقتراحات..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pr-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["all", "critical", "warning", "info"] as const).map((sv) => (
                <button
                  key={sv}
                  onClick={() => setSevFilter(sv as any)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                    sevFilter === sv
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted",
                  )}
                >
                  {sv === "all" ? "كل الخطورات" : SEVERITY_META[sv].ar}
                </button>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px] ml-auto">
                    <Layers className="w-3 h-3" />
                    {sort === "severity" ? "خطورة" : sort === "recent" ? "أحدث" : "شاشة"}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem onClick={() => setSort("severity")}>حسب الخطورة</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSort("recent")}>الأحدث أولاً</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSort("screen")}>تجميع حسب الشاشة</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 text-[10px]"
                    disabled={filtered.length === 0}
                    title="إجراءات جماعية على المعروض"
                  >
                    <CheckSquare className="w-3 h-3" /> جماعي
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem onClick={dismissView}>تجاهل المعروض ({filtered.length})</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snoozeView(1)}>تأجيل ساعة</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snoozeView(24)}>تأجيل يوم</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snoozeView(24 * 7)}>تأجيل أسبوع</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="ghost"
                onClick={exportCSV}
                disabled={filtered.length === 0}
                className="h-6 gap-1 text-[10px]"
                title="تصدير CSV"
              >
                <Download className="w-3 h-3" /> CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={exportJSON}
                disabled={filtered.length === 0}
                className="h-6 gap-1 text-[10px]"
                title="تصدير JSON"
              >
                <Download className="w-3 h-3" /> JSON
              </Button>
              {dismissedCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    restoreAll();
                    toast({ title: `تم استرجاع ${dismissedCount} اقتراح` });
                  }}
                  className="h-6 gap-1 text-[10px]"
                  title="استرجاع المتجاهَل والمؤجَّل"
                >
                  استرجاع ({dismissedCount})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("مسح كل الاقتراحات؟")) clearAll();
                }}
                disabled={active.length === 0}
                className="h-6 gap-1 text-[10px] text-destructive"
              >
                <Trash2 className="w-3 h-3" /> مسح
              </Button>
            </div>
          </div>


          <TabsContent value={tab} className="mt-3 flex-1 min-h-0">
            <ScrollArea className="h-full px-5 pb-6">
              {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-16">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  لا توجد اقتراحات مطابقة
                </div>
              ) : sort === "screen" && grouped ? (
                <div className="space-y-4">
                  {grouped.map(([screen, items]) => (
                    <div key={screen}>
                      <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-background/95 backdrop-blur py-1">
                        {screen} <Badge variant="outline" className="text-[10px] mr-1">{items.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map((s) => (
                          <SuggestionCard
                            key={s.id}
                            s={s}
                            onDismiss={dismiss}
                            onApplied={markApplied}
                            onSnooze={snooze}
                            onTogglePin={togglePin}
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      s={s}
                      onDismiss={dismiss}
                      onApplied={markApplied}
                      onSnooze={snooze}
                      onTogglePin={togglePin}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function SuggestionCard({
  s,
  onDismiss,
  onApplied,
  onSnooze,
  onTogglePin,
  onNavigate,
}: {
  s: any;
  onDismiss: (id: string) => void;
  onApplied: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  onTogglePin: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const meta = CATEGORY_META[s.category as SuggestionCategory];
  const sev = SEVERITY_META[s.severity as SuggestionSeverity];
  const Icon = TAB_ICONS[s.category as SuggestionCategory];
  return (
    <div
      className={cn(
        "p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors",
        s.pinned && "border-primary/60 ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Icon className={cn("w-4 h-4 shrink-0", meta.color)} />
          <Badge variant="outline" className="text-[10px]">{meta.ar}</Badge>
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", sev.badge)}>
            {sev.ar}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onTogglePin(s.id)}
            title={s.pinned ? "إلغاء التثبيت" : "تثبيت"}
          >
            {s.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="غفوة">
                <Clock className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuItem onClick={() => onSnooze(s.id, 1)}>ساعة</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(s.id, 4)}>4 ساعات</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(s.id, 24)}>يوم</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(s.id, 24 * 7)}>أسبوع</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDismiss(s.id)}
            title="تجاهل"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
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
              if (s.sourceRoute) onNavigate(s.sourceRoute);
              onApplied(s.id);
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
            onClick={() => onNavigate(s.sourceRoute!)}
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
}
