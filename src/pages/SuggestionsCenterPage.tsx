import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGlobalSuggestions,
  isSuggestionSnoozed,
  type SuggestionCategory,
  type SuggestionSeverity,
} from "@/contexts/GlobalSuggestionsContext";
import { CATEGORY_META, SEVERITY_META } from "@/lib/suggestion-generators";
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Workflow,
  FileText,
  ExternalLink,
  Trash2,
  Undo2,
  Search,
  Settings2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const CAT_ICONS: Record<SuggestionCategory, any> = {
  "ai-pricing": Sparkles,
  "data-quality": ShieldCheck,
  workflow: Workflow,
  reports: FileText,
};

const SEV_COLORS: Record<SuggestionSeverity, string> = {
  critical: "hsl(var(--destructive))",
  warning: "hsl(38 92% 50%)",
  info: "hsl(200 90% 45%)",
  success: "hsl(150 60% 40%)",
};

export default function SuggestionsCenterPage() {
  const {
    suggestions,
    dismiss,
    dismissMany,
    snoozeMany,
    markApplied,
    togglePin,
    restore,
    restoreAll,
    clearAll,
    preferences,
    updatePreferences,
    resetPreferences,
  } = useGlobalSuggestions();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"active" | "archive" | "analytics" | "preferences">("active");

  const active = useMemo(
    () => suggestions.filter((s) => !s.dismissed && !s.applied && !isSuggestionSnoozed(s)),
    [suggestions],
  );
  const archive = useMemo(
    () => suggestions.filter((s) => s.dismissed || s.applied || isSuggestionSnoozed(s)),
    [suggestions],
  );

  const filteredActive = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.sourceScreen?.toLowerCase().includes(q),
    );
  }, [active, query]);

  // Analytics data
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of active) map[s.category] = (map[s.category] || 0) + 1;
    return (Object.keys(CATEGORY_META) as SuggestionCategory[]).map((c) => ({
      name: CATEGORY_META[c].ar,
      value: map[c] || 0,
      key: c,
    }));
  }, [active]);

  const sevData = useMemo(() => {
    return (["critical", "warning", "info", "success"] as SuggestionSeverity[]).map((s) => ({
      name: SEVERITY_META[s].ar,
      value: active.filter((x) => x.severity === s).length,
      color: SEV_COLORS[s],
    }));
  }, [active]);

  const screenData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of active) {
      const key = s.sourceScreen || "غير محدد";
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [active]);

  // 14-day creation trend
  const trendData = useMemo(() => {
    const days = 14;
    const buckets: { name: string; total: number; critical: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = d.toISOString().slice(5, 10); // MM-DD
      buckets.push({ name: key, total: 0, critical: 0 });
    }
    for (const s of suggestions) {
      const t = new Date(s.createdAt).getTime();
      const diff = Math.floor((today.getTime() - new Date(new Date(t).setHours(0, 0, 0, 0)).getTime()) / 86400000);
      if (diff < 0 || diff >= days) continue;
      const idx = days - 1 - diff;
      buckets[idx].total += 1;
      if (s.severity === "critical") buckets[idx].critical += 1;
    }
    return buckets;
  }, [suggestions]);

  // Snoozed subset (sorted by wake time)
  const snoozed = useMemo(
    () =>
      suggestions
        .filter((s) => isSuggestionSnoozed(s) && !s.dismissed && !s.applied)
        .sort((a, b) => new Date(a.snoozedUntil!).getTime() - new Date(b.snoozedUntil!).getTime()),
    [suggestions],
  );

  // Unique sources & screens for preferences
  const allSources = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions) {
      if (s.meta?.sourceKey) set.add(String(s.meta.sourceKey));
    }
    return Array.from(set).sort();
  }, [suggestions]);
  const allScreens = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions) if (s.sourceScreen) set.add(s.sourceScreen);
    return Array.from(set).sort();
  }, [suggestions]);

  const toggleInArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">مركز الاقتراحات الذكية</h1>
              <p className="text-xs text-muted-foreground">
                عرض موحد لكل اقتراحات النظام مع لوحة تحكم وتحليلات وتفضيلات.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{active.length} نشط</Badge>
            <Badge variant="outline">{archive.length} أرشيف</Badge>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sevData.map((d) => (
            <Card key={d.name} className="p-3 flex items-center gap-3">
              <div
                className="w-2 h-10 rounded-full"
                style={{ background: d.color }}
              />
              <div>
                <div className="text-2xl font-bold tabular-nums">{d.value}</div>
                <div className="text-xs text-muted-foreground">{d.name}</div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-4 max-w-xl">
            <TabsTrigger value="active">النشطة ({active.length})</TabsTrigger>
            <TabsTrigger value="archive">الأرشيف ({archive.length})</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-3.5 h-3.5 ml-1" /> تحليلات
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings2 className="w-3.5 h-3.5 ml-1" /> تفضيلات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث في الاقتراحات..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-9 h-9 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={filteredActive.length === 0}
                onClick={() => snoozeMany(filteredActive.map((s) => s.id), 24)}
              >
                تأجيل المعروض يوماً
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filteredActive.length === 0}
                onClick={() => {
                  if (confirm(`تجاهل ${filteredActive.length} اقتراح؟`))
                    dismissMany(filteredActive.map((s) => s.id));
                }}
              >
                تجاهل المعروض
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={active.length === 0}
                onClick={() => {
                  if (confirm("مسح كل الاقتراحات؟")) clearAll();
                }}
              >
                <Trash2 className="w-3.5 h-3.5 ml-1" /> مسح الكل
              </Button>
            </div>

            {filteredActive.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                لا توجد اقتراحات مطابقة — كل شيء على ما يرام ✓
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredActive.map((s) => {
                  const meta = CATEGORY_META[s.category as SuggestionCategory];
                  const sev = SEVERITY_META[s.severity as SuggestionSeverity];
                  const Icon = CAT_ICONS[s.category as SuggestionCategory];
                  return (
                    <Card
                      key={s.id}
                      className={cn(
                        "p-3 hover:shadow-md transition-shadow",
                        s.pinned && "border-primary/60 ring-1 ring-primary/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Icon className={cn("w-4 h-4 shrink-0", meta.color)} />
                          <Badge variant="outline" className="text-[10px]">
                            {meta.ar}
                          </Badge>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium",
                              sev.badge,
                            )}
                          >
                            {sev.ar}
                          </span>
                          {s.sourceScreen && (
                            <Badge variant="secondary" className="text-[10px]">
                              {s.sourceScreen}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => togglePin(s.id)}
                          title={s.pinned ? "إلغاء التثبيت" : "تثبيت"}
                        >
                          {s.pinned ? "★" : "☆"}
                        </Button>
                      </div>
                      <div className="font-medium text-sm mb-1">{s.title}</div>
                      {s.description && (
                        <div className="text-xs text-muted-foreground mb-2">
                          {s.description}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {s.sourceRoute && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px]"
                            onClick={() => navigate(s.sourceRoute!)}
                          >
                            <ExternalLink className="w-3 h-3 ml-1" /> فتح الشاشة
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => markApplied(s.id)}
                        >
                          تم التطبيق
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-destructive"
                          onClick={() => dismiss(s.id)}
                        >
                          تجاهل
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="mt-4 space-y-3">
            {snoozed.length > 0 && (
              <Card className="p-3 border-warning/40 bg-warning/5">
                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                  ⏰ مؤجَّل ({snoozed.length}) — يعود تلقائياً في موعده
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {snoozed.slice(0, 8).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs border rounded-md p-2 bg-background">
                      <div className="truncate">
                        <div className="font-medium truncate">{s.title}</div>
                        <div className="text-muted-foreground text-[10px]">
                          يعود في {new Date(s.snoozedUntil!).toLocaleString("ar")}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => restore(s.id)}>
                        إيقاظ الآن
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                العناصر المتجاهَلة / المطبَّقة / المؤجَّلة.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={archive.length === 0}
                onClick={() => restoreAll()}
              >
                <Undo2 className="w-3.5 h-3.5 ml-1" /> استرجاع الكل
              </Button>
            </div>
            {archive.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground text-sm">
                الأرشيف فارغ.
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {archive.map((s) => (
                  <Card key={s.id} className="p-3 opacity-70">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_META[s.category as SuggestionCategory].ar}
                        </Badge>
                        {s.applied && (
                          <Badge variant="secondary" className="text-[10px]">
                            مُطبَّق
                          </Badge>
                        )}
                        {s.dismissed && (
                          <Badge variant="outline" className="text-[10px]">
                            متجاهَل
                          </Badge>
                        )}
                        {isSuggestionSnoozed(s) && (
                          <Badge variant="outline" className="text-[10px]">
                            مؤجَّل
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => restore(s.id)}
                      >
                        <Undo2 className="w-3 h-3 ml-1" /> استرجاع
                      </Button>
                    </div>
                    <div className="text-sm truncate">{s.title}</div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">التوزيع حسب الفئة</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catData.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label
                    >
                      {catData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`hsl(${(i * 70 + 184) % 360} 60% 45%)`}
                        />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">حسب الخطورة</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sevData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {sevData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-3">
                أعلى الشاشات إصداراً للاقتراحات
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={screenData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={160}
                    />
                    <RTooltip />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-3">اتجاه آخر 14 يوماً</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="الكل" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="critical" name="حرِج" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>


          <TabsContent value="preferences" className="mt-4 space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">تفضيلات الاقتراحات</div>
                  <p className="text-xs text-muted-foreground">
                    تُطبَّق على العرض النشط في مركز الاقتراحات والصندوق العائم.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPreferences}>
                  إعادة الضبط
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">الحد الأدنى للخطورة</Label>
                  <Select
                    value={preferences.minSeverity}
                    onValueChange={(v) => updatePreferences({ minSeverity: v as any })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">حرِج فقط</SelectItem>
                      <SelectItem value="warning">تحذير وأعلى</SelectItem>
                      <SelectItem value="info">معلومة وأعلى (الافتراضي)</SelectItem>
                      <SelectItem value="success">كل شيء</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">إشعار سطح المكتب للحرِج</Label>
                    <p className="text-[11px] text-muted-foreground">
                      يعرض توست تلقائياً عند وصول تنبيه حرِج جديد.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.desktopToastForCritical}
                    onCheckedChange={(v) =>
                      updatePreferences({ desktopToastForCritical: v })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">كتم الفئات</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_META) as SuggestionCategory[]).map((c) => {
                    const muted = preferences.mutedCategories.includes(c);
                    return (
                      <Button
                        key={c}
                        size="sm"
                        variant={muted ? "default" : "outline"}
                        onClick={() =>
                          updatePreferences({
                            mutedCategories: toggleInArray(
                              preferences.mutedCategories,
                              c,
                            ) as any,
                          })
                        }
                        className="h-7 text-xs"
                      >
                        {muted ? "🔇 " : ""}
                        {CATEGORY_META[c].ar}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {allScreens.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">
                    كتم شاشات محددة ({preferences.mutedScreens.length}/
                    {allScreens.length})
                  </Label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto p-2 border rounded-lg">
                    {allScreens.map((sc) => {
                      const muted = preferences.mutedScreens.includes(sc);
                      return (
                        <Button
                          key={sc}
                          size="sm"
                          variant={muted ? "default" : "ghost"}
                          onClick={() =>
                            updatePreferences({
                              mutedScreens: toggleInArray(
                                preferences.mutedScreens,
                                sc,
                              ),
                            })
                          }
                          className="h-6 text-[11px]"
                        >
                          {muted ? "🔇 " : ""}
                          {sc}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {allSources.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">
                    كتم مصادر داخلية ({preferences.mutedSources.length}/
                    {allSources.length})
                  </Label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto p-2 border rounded-lg">
                    {allSources.map((src) => {
                      const muted = preferences.mutedSources.includes(src);
                      return (
                        <Button
                          key={src}
                          size="sm"
                          variant={muted ? "default" : "ghost"}
                          onClick={() =>
                            updatePreferences({
                              mutedSources: toggleInArray(
                                preferences.mutedSources,
                                src,
                              ),
                            })
                          }
                          className="h-6 text-[10px] font-mono"
                        >
                          {muted ? "🔇 " : ""}
                          {src}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold">نسخ احتياطي واستعادة</div>
                <p className="text-xs text-muted-foreground">
                  حفظ/استعادة التفضيلات والاقتراحات كملف JSON محلي.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const payload = {
                      exportedAt: new Date().toISOString(),
                      preferences,
                      suggestions,
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `suggestions-backup-${new Date()
                      .toISOString()
                      .slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  تنزيل نسخة احتياطية
                </Button>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const data = JSON.parse(String(reader.result));
                          if (data?.preferences) updatePreferences(data.preferences);
                          if (Array.isArray(data?.suggestions)) {
                            localStorage.setItem(
                              "global_suggestions_v1",
                              JSON.stringify(data.suggestions),
                            );
                            window.location.reload();
                          }
                        } catch {
                          alert("ملف غير صالح");
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = "";
                    }}
                  />
                  <Button size="sm" variant="outline" asChild>
                    <span>استعادة من ملف…</span>
                  </Button>
                </label>
              </div>
            </Card>

            <Card className="p-4 flex items-start gap-3 bg-amber-500/5 border-amber-500/30">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                التفضيلات محفوظة محلياً على جهازك ولا تُرسَل إلى الخادم. الكتم يُخفي
                فقط الاقتراحات من العرض دون حذفها. استعادة الملف تستبدل الاقتراحات
                الحالية بعد إعادة التحميل.
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
