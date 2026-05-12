import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, AlertTriangle, BarChart3, Settings2, Wand2, Save, RotateCcw, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityLite {
  sn: number;
  activity: string;
  activityAr: string;
  itemIds?: string[];
}

interface PricingRow {
  project_item_id: string;
  resource_name: string;
  pricing_type: "material" | "labor" | "equipment";
  quantity: number;
  duration: number;
  unit: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string | null;
  filteredActivities: ActivityLite[];
  isArabic: boolean;
}

type Section = "analysis" | "suggestions" | "auto" | "capacities";

interface ResourceUsage {
  name: string;
  type: "material" | "labor" | "equipment";
  unit: string | null;
  perDay: Record<number, number>;
  perDayActivities: Record<number, number[]>;
  totalDemand: number;
  peak: number;
  peakDay: number;
  capacity: number;
  overloadDays: number[];
}

interface Scenario {
  capacities: Record<string, number>;
  shifts: Record<number, number>;
  savedAt: string;
  name: string;
}

const TYPE_COLOR: Record<string, string> = {
  material: "text-blue-600",
  labor: "text-emerald-600",
  equipment: "text-amber-600",
};

const TYPE_LABEL_AR: Record<string, string> = {
  material: "مواد",
  labor: "عمالة",
  equipment: "معدات",
};

export function ResourceLevellingDialog({ open, onOpenChange, projectId, filteredActivities, isArabic }: Props) {
  const [section, setSection] = useState<Section>("analysis");
  const [details, setDetails] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [shifts, setShifts] = useState<Record<number, number>>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  const capKey = useMemo(() => `rl:caps:${projectId || "default"}`, [projectId]);
  const scenKey = useMemo(() => `rl:scenarios:${projectId || "default"}`, [projectId]);

  useEffect(() => {
    try {
      const c = localStorage.getItem(capKey);
      if (c) setCapacities(JSON.parse(c));
      const s = localStorage.getItem(scenKey);
      if (s) setScenarios(JSON.parse(s));
    } catch {}
  }, [capKey, scenKey]);

  useEffect(() => {
    try { localStorage.setItem(capKey, JSON.stringify(capacities)); } catch {}
  }, [capacities, capKey]);

  useEffect(() => {
    if (!open || !projectId) return;
    const allItemIds = Array.from(new Set(filteredActivities.flatMap(a => a.itemIds || [])));
    if (allItemIds.length === 0) { setDetails([]); return; }
    setLoading(true);
    (async () => {
      try {
        const out: PricingRow[] = [];
        const chunk = 200;
        for (let i = 0; i < allItemIds.length; i += chunk) {
          const slice = allItemIds.slice(i, i + chunk);
          const { data, error } = await supabase
            .from("item_pricing_details")
            .select("project_item_id, resource_name, pricing_type, quantity, duration, unit")
            .in("project_item_id", slice);
          if (error) throw error;
          (data || []).forEach((d: any) => out.push({
            project_item_id: d.project_item_id,
            resource_name: d.resource_name || "—",
            pricing_type: d.pricing_type,
            quantity: Number(d.quantity) || 0,
            duration: Number(d.duration) || 1,
            unit: d.unit || null,
          }));
        }
        setDetails(out);
      } catch (e) {
        console.warn("Resource levelling: load failed", e);
        toast.error(isArabic ? "فشل تحميل بيانات الموارد" : "Failed to load resource data");
      } finally { setLoading(false); }
    })();
  }, [open, projectId, filteredActivities, isArabic]);

  const usage = useMemo<ResourceUsage[]>(() => {
    const itemRows = new Map<string, PricingRow[]>();
    details.forEach(r => {
      const arr = itemRows.get(r.project_item_id) || [];
      arr.push(r); itemRows.set(r.project_item_id, arr);
    });
    const byKey = new Map<string, ResourceUsage>();
    const keyOf = (r: PricingRow) => `${r.pricing_type}::${r.resource_name}`;
    filteredActivities.forEach((a, idx) => {
      const baseDay = idx + (shifts[a.sn] || 0);
      const ids = a.itemIds || [];
      let actDur = 1;
      ids.forEach(pid => {
        (itemRows.get(pid) || []).forEach(r => { if (r.duration > actDur) actDur = r.duration; });
      });
      ids.forEach(pid => {
        (itemRows.get(pid) || []).forEach(r => {
          const k = keyOf(r);
          let u = byKey.get(k);
          if (!u) {
            u = {
              name: r.resource_name, type: r.pricing_type, unit: r.unit,
              perDay: {}, perDayActivities: {}, totalDemand: 0, peak: 0, peakDay: 0,
              capacity: capacities[k] || 0, overloadDays: [],
            };
            byKey.set(k, u);
          }
          const span = Math.max(1, r.duration || actDur || 1);
          const perDay = (Number(r.quantity) || 0) / span;
          for (let d = 0; d < span; d++) {
            const day = baseDay + d;
            u.perDay[day] = (u.perDay[day] || 0) + perDay;
            const list = u.perDayActivities[day] || [];
            if (!list.includes(a.sn)) list.push(a.sn);
            u.perDayActivities[day] = list;
            u.totalDemand += perDay;
          }
        });
      });
    });
    const out = Array.from(byKey.values()).map(u => {
      const cap = capacities[`${u.type}::${u.name}`] || 0;
      let peak = 0, peakDay = 0; const overloadDays: number[] = [];
      Object.entries(u.perDay).forEach(([d, v]) => {
        const day = Number(d);
        if (v > peak) { peak = v; peakDay = day; }
        if (cap > 0 && v > cap) overloadDays.push(day);
      });
      return { ...u, capacity: cap, peak, peakDay, overloadDays: overloadDays.sort((a, b) => a - b) };
    });
    out.sort((a, b) => b.totalDemand - a.totalDemand);
    return out;
  }, [details, filteredActivities, capacities, shifts]);

  const overloadedResources = useMemo(() => usage.filter(u => u.overloadDays.length > 0), [usage]);

  const suggestions = useMemo(() => {
    const arr: Array<{ resource: string; type: string; day: number; activitySn: number; activityName: string; shiftBy: number; }> = [];
    overloadedResources.forEach(u => {
      u.overloadDays.forEach(day => {
        const acts = u.perDayActivities[day] || [];
        const sn = acts[acts.length - 1];
        if (sn == null) return;
        let target = day + 1;
        while (target < day + 60 && (u.perDay[target] || 0) >= u.capacity) target++;
        const a = filteredActivities.find(x => x.sn === sn);
        if (!a) return;
        arr.push({
          resource: u.name, type: u.type, day, activitySn: sn,
          activityName: isArabic ? (a.activityAr || a.activity) : a.activity,
          shiftBy: target - day,
        });
      });
    });
    const map = new Map<number, typeof arr[0]>();
    arr.forEach(s => {
      const ex = map.get(s.activitySn);
      if (!ex || s.shiftBy > ex.shiftBy) map.set(s.activitySn, s);
    });
    return Array.from(map.values()).slice(0, 50);
  }, [overloadedResources, filteredActivities, isArabic]);

  const applySuggestion = (sn: number, shiftBy: number) => {
    setShifts(prev => ({ ...prev, [sn]: (prev[sn] || 0) + shiftBy }));
    toast.success(isArabic ? `تم تأجيل النشاط ${shiftBy} يوم` : `Activity shifted by ${shiftBy} days`);
  };

  const runAutoLevelling = () => {
    if (usage.length === 0) { toast.info(isArabic ? "لا توجد موارد" : "No resources"); return; }
    const newShifts: Record<number, number> = { ...shifts };
    const sortedRes = [...usage].sort((a, b) => b.totalDemand - a.totalDemand);
    sortedRes.forEach(u => {
      const cap = u.capacity;
      if (!cap || cap <= 0) return;
      const dayLoad: Record<number, number> = {};
      const acts = Object.entries(u.perDayActivities).flatMap(([d, list]) => list.map(sn => ({ sn, day: Number(d) })));
      acts.sort((a, b) => a.day - b.day);
      acts.forEach(entry => {
        const sn = entry.sn;
        const baseDay = entry.day + ((newShifts[sn] || 0) - (shifts[sn] || 0));
        let day = baseDay;
        const unitDemand = (u.perDay[entry.day] || 0) / Math.max(1, (u.perDayActivities[entry.day] || []).length);
        while ((dayLoad[day] || 0) + unitDemand > cap && day < baseDay + 365) day++;
        dayLoad[day] = (dayLoad[day] || 0) + unitDemand;
        const delta = day - baseDay;
        if (delta > 0) newShifts[sn] = (newShifts[sn] || 0) + delta;
      });
    });
    setShifts(newShifts);
    toast.success(isArabic ? "تم تنفيذ التسوية التلقائية" : "Auto-levelling applied");
  };

  const resetShifts = () => { setShifts({}); toast.info(isArabic ? "تم استعادة الجدول الأصلي" : "Schedule restored"); };

  const saveScenario = () => {
    const name = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    const next: Scenario[] = [...scenarios, { name, capacities: { ...capacities }, shifts: { ...shifts }, savedAt: new Date().toISOString() }];
    setScenarios(next);
    try { localStorage.setItem(scenKey, JSON.stringify(next)); } catch { }
    setScenarioName("");
    toast.success(isArabic ? `تم حفظ السيناريو: ${name}` : `Scenario saved: ${name}`);
  };

  const loadScenario = (s: Scenario) => {
    setCapacities(s.capacities); setShifts(s.shifts);
    toast.success(isArabic ? `تم تحميل السيناريو: ${s.name}` : `Scenario loaded: ${s.name}`);
  };

  const deleteScenario = (idx: number) => {
    const next = scenarios.filter((_, i) => i !== idx);
    setScenarios(next);
    try { localStorage.setItem(scenKey, JSON.stringify(next)); } catch { }
  };

  const sections: Array<{ id: Section; label: string; labelAr: string; icon: typeof Activity }> = [
    { id: "analysis", label: "Load Analysis", labelAr: "تحليل التحميل", icon: BarChart3 },
    { id: "suggestions", label: "Manual Suggestions", labelAr: "اقتراحات يدوية", icon: AlertTriangle },
    { id: "auto", label: "Auto-Levelling", labelAr: "تسوية تلقائية", icon: Wand2 },
    { id: "capacities", label: "Capacities & Scenarios", labelAr: "السعات والسيناريوهات", icon: Settings2 },
  ];

  const allDays = useMemo(() => {
    const days = new Set<number>();
    usage.forEach(u => Object.keys(u.perDay).forEach(d => days.add(Number(d))));
    return Array.from(days).sort((a, b) => a - b);
  }, [usage]);
  const minDay = allDays[0] ?? 0;
  const maxDay = allDays[allDays.length - 1] ?? 0;
  const dayList = useMemo(() => {
    const arr: number[] = [];
    for (let d = minDay; d <= maxDay && arr.length < 60; d++) arr.push(d);
    return arr;
  }, [minDay, maxDay]);

  const heatColor = (val: number, cap: number) => {
    if (val <= 0) return "bg-muted/30";
    if (cap <= 0) return "bg-blue-200/60 dark:bg-blue-900/40";
    const ratio = val / cap;
    if (ratio > 1) return "bg-rose-500/70 text-white";
    if (ratio > 0.85) return "bg-amber-400/70";
    if (ratio > 0.5) return "bg-emerald-400/60";
    return "bg-emerald-200/60 dark:bg-emerald-900/30";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isArabic ? "تسوية الموارد" : "Resource Levelling"}
            {Object.keys(shifts).length > 0 && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Activity className="h-3 w-3" />
                {isArabic ? `${Object.keys(shifts).length} نشاط مُعدَّل` : `${Object.keys(shifts).length} activities shifted`}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 gap-4">
          <div className="w-52 shrink-0 border-r pr-3 space-y-1">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                    section === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{isArabic ? s.labelAr : s.label}</span>
                </button>
              );
            })}
            <div className="pt-3 mt-3 border-t text-xs text-muted-foreground space-y-1">
              <div>{isArabic ? "موارد:" : "Resources:"} <span className="font-medium text-foreground">{usage.length}</span></div>
              <div>{isArabic ? "أنشطة:" : "Activities:"} <span className="font-medium text-foreground">{filteredActivities.length}</span></div>
              <div>{isArabic ? "تعارضات:" : "Overloads:"} <span className={cn("font-medium", overloadedResources.length > 0 ? "text-rose-600" : "text-foreground")}>{overloadedResources.length}</span></div>
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-auto">
            {loading && <div className="text-sm text-muted-foreground p-4">{isArabic ? "جار التحميل..." : "Loading..."}</div>}

            {!loading && section === "analysis" && (
              <div className="space-y-3">
                {usage.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-6 text-center">{isArabic ? "لا توجد بيانات موارد للأنشطة المفلترة" : "No resource data for filtered activities"}</div>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="min-w-[180px]">{isArabic ? "المورد" : "Resource"}</TableHead>
                          <TableHead className="w-20 text-center">{isArabic ? "النوع" : "Type"}</TableHead>
                          <TableHead className="w-20 text-right">{isArabic ? "السعة/يوم" : "Cap/day"}</TableHead>
                          <TableHead className="w-20 text-right">{isArabic ? "الذروة" : "Peak"}</TableHead>
                          {dayList.map(d => <TableHead key={d} className="w-8 text-center text-[10px] p-1">D{d + 1}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usage.slice(0, 30).map(u => (
                          <TableRow key={`${u.type}-${u.name}`}>
                            <TableCell className="font-medium text-sm">
                              {u.name} {u.unit && <span className="text-xs text-muted-foreground">({u.unit})</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-[10px]", TYPE_COLOR[u.type])}>
                                {isArabic ? TYPE_LABEL_AR[u.type] : u.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">{u.capacity || "—"}</TableCell>
                            <TableCell className={cn("text-right text-sm font-semibold", u.capacity > 0 && u.peak > u.capacity ? "text-rose-600" : "")}>
                              {u.peak.toFixed(1)}
                            </TableCell>
                            {dayList.map(d => {
                              const v = u.perDay[d] || 0;
                              return (
                                <TableCell key={d} className={cn("text-center text-[10px] p-0.5", heatColor(v, u.capacity))} title={`Day ${d + 1}: ${v.toFixed(2)}${u.capacity > 0 ? ` / ${u.capacity}` : ""}`}>
                                  {v > 0 ? v.toFixed(0) : ""}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {usage.length > 30 && <p className="text-xs text-muted-foreground">{isArabic ? `عرض أعلى 30 من ${usage.length} مورد` : `Showing top 30 of ${usage.length} resources`}</p>}
                {dayList.length < (maxDay - minDay + 1) && <p className="text-xs text-muted-foreground">{isArabic ? `عرض أول 60 يومًا فقط` : `Showing first 60 days only`}</p>}
              </div>
            )}

            {!loading && section === "suggestions" && (
              <div className="space-y-2">
                {suggestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-6 text-center">
                    {isArabic ? "لا توجد تعارضات. اضبط السعات في تبويب السعات." : "No overloads. Set capacities in the Capacities tab."}
                  </div>
                ) : suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.activityName}</div>
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? "تعارض" : "Overload"}: <span className={TYPE_COLOR[s.type]}>{s.resource}</span> · {isArabic ? `يوم ${s.day + 1}` : `Day ${s.day + 1}`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {isArabic ? `تأجيل +${s.shiftBy} يوم` : `Shift +${s.shiftBy}d`}
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => applySuggestion(s.activitySn, s.shiftBy)}>
                      {isArabic ? "تطبيق" : "Apply"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!loading && section === "auto" && (
              <div className="space-y-4">
                <div className="p-4 rounded-md border bg-muted/30 text-sm space-y-2">
                  <p>{isArabic
                    ? "خوارزمية تسوية تلقائية تقوم بتأجيل الأنشطة بشكل تتابعي لكل مورد حتى لا يتجاوز التحميل اليومي السعة المُعرَّفة."
                    : "Greedy auto-levelling shifts activities forward per resource until daily load respects the defined capacity."}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "يلزم تعريف سعات الموارد أولًا في تبويب السعات." : "Capacities must be defined first in the Capacities tab."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runAutoLevelling} className="gap-2"><Wand2 className="h-4 w-4" />{isArabic ? "تشغيل" : "Run"}</Button>
                  <Button variant="outline" onClick={resetShifts} className="gap-2"><RotateCcw className="h-4 w-4" />{isArabic ? "استعادة" : "Reset"}</Button>
                </div>
                {Object.keys(shifts).length > 0 && (
                  <div className="border rounded-md overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{isArabic ? "النشاط" : "Activity"}</TableHead>
                          <TableHead className="text-right">{isArabic ? "الإزاحة (يوم)" : "Shift (days)"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(shifts).map(([sn, sh]) => {
                          const a = filteredActivities.find(x => x.sn === Number(sn));
                          if (!a) return null;
                          return (
                            <TableRow key={sn}>
                              <TableCell className="text-sm">{isArabic ? (a.activityAr || a.activity) : a.activity}</TableCell>
                              <TableCell className="text-right text-sm font-semibold">+{sh}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {!loading && section === "capacities" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">{isArabic ? "السعة اليومية لكل مورد" : "Daily capacity per resource"}</h4>
                  <ScrollArea className="h-72 border rounded-md p-2">
                    <div className="space-y-1">
                      {usage.map(u => {
                        const k = `${u.type}::${u.name}`;
                        return (
                          <div key={k} className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded">
                            <Badge variant="outline" className={cn("text-[10px] shrink-0", TYPE_COLOR[u.type])}>
                              {isArabic ? TYPE_LABEL_AR[u.type] : u.type}
                            </Badge>
                            <span className="text-sm flex-1 truncate">{u.name}</span>
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={capacities[k] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value === "" ? 0 : Number(e.target.value);
                                setCapacities(prev => ({ ...prev, [k]: v }));
                              }}
                              className="w-24 h-8 text-sm"
                              placeholder={isArabic ? "السعة" : "Cap"}
                            />
                            <span className="text-xs text-muted-foreground w-10 text-right">{u.unit || ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2">{isArabic ? "السيناريوهات" : "Scenarios"}</h4>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      placeholder={isArabic ? "اسم السيناريو" : "Scenario name"}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={saveScenario} className="gap-1"><Save className="h-3 w-3" />{isArabic ? "حفظ" : "Save"}</Button>
                  </div>
                  {scenarios.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{isArabic ? "لا توجد سيناريوهات محفوظة" : "No saved scenarios"}</p>
                  ) : (
                    <div className="space-y-1">
                      {scenarios.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-2 border rounded text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {Object.keys(s.shifts).length} {isArabic ? "إزاحات" : "shifts"} · {Object.keys(s.capacities).length} {isArabic ? "سعات" : "caps"}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => loadScenario(s)}>{isArabic ? "تحميل" : "Load"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteScenario(i)} className="text-destructive">×</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isArabic ? "إغلاق" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
