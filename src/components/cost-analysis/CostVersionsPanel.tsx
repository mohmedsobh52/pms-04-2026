import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Save, Undo2, Trash2, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { deriveTotals } from "@/lib/cost-analysis/derive-totals";

interface CostItemLite {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
  [k: string]: unknown;
}

export interface CostVersionSnapshot {
  id: string;
  label: string;
  createdAt: string;
  items: CostItemLite[];
  wastePercentage: number;
  adminPercentage: number;
  taxPct?: number;
  grandTotal: number;
}

interface Props {
  items: CostItemLite[];
  wastePercentage: number;
  adminPercentage: number;
  taxPct?: number;
  currency?: string;
  storageKey?: string;
  onRestore: (snap: CostVersionSnapshot) => void;
}

const DEFAULT_KEY = "cost_analysis_versions_v1";
const MAX_VERSIONS = 20;

export function CostVersionsPanel({
  items,
  wastePercentage,
  adminPercentage,
  taxPct = 0,
  currency = "SAR",
  storageKey = DEFAULT_KEY,
  onRestore,
}: Props) {
  const [versions, setVersions] = useState<CostVersionSnapshot[]>([]);
  const [label, setLabel] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setVersions(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = useCallback((next: CostVersionSnapshot[]) => {
    setVersions(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* quota */ }
  }, [storageKey]);

  const currentTotal = deriveTotals(items as never, {
    wastePct: wastePercentage,
    adminPct: adminPercentage,
    taxPct,
  }).grandTotal;

  const saveVersion = useCallback(() => {
    if (!items.length) {
      toast.error("لا توجد بنود للحفظ");
      return;
    }
    const trimmed = label.trim();
    const snap: CostVersionSnapshot = {
      id: `v-${Date.now()}`,
      label: trimmed || `الإصدار ${versions.length + 1}`,
      createdAt: new Date().toISOString(),
      items: JSON.parse(JSON.stringify(items)),
      wastePercentage,
      adminPercentage,
      taxPct,
      grandTotal: currentTotal,
    };
    const next = [snap, ...versions].slice(0, MAX_VERSIONS);
    persist(next);
    setLabel("");
    toast.success(`تم حفظ ${snap.label}`);
  }, [items, wastePercentage, adminPercentage, taxPct, currentTotal, versions, label, persist]);

  const restore = useCallback((snap: CostVersionSnapshot) => {
    if (!confirm(`استعادة "${snap.label}"؟ سيتم استبدال البيانات الحالية.`)) return;
    onRestore(snap);
    toast.success(`تمت استعادة ${snap.label}`);
  }, [onRestore]);

  const remove = useCallback((id: string) => {
    persist(versions.filter((v) => v.id !== id));
    if (compareId === id) setCompareId(null);
  }, [versions, compareId, persist]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  const compareSnap = versions.find((v) => v.id === compareId) ?? null;
  const diff = compareSnap ? currentTotal - compareSnap.grandTotal : 0;
  const diffPct = compareSnap && compareSnap.grandTotal ? (diff / compareSnap.grandTotal) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4 text-primary" />
          إصدارات التحليل ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="اسم الإصدار (اختياري)"
            className="h-9"
          />
          <Button size="sm" onClick={saveVersion} className="gap-1.5">
            <Save className="w-4 h-4" />
            حفظ نسخة
          </Button>
        </div>

        {compareSnap && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">مقارنة مع:</span>
            <Badge variant="outline">{compareSnap.label}</Badge>
            <span>الحالي: <b>{fmt(currentTotal)}</b> {currency}</span>
            <span>الفارق: <b className={diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-600" : ""}>
              {diff > 0 ? "+" : ""}{fmt(diff)} ({diffPct.toFixed(1)}%)
            </b></span>
            <Button size="sm" variant="ghost" onClick={() => setCompareId(null)} className="h-6 ms-auto">إلغاء</Button>
          </div>
        )}

        {versions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            لا توجد إصدارات محفوظة. احفظ نسخة قبل التعديلات الكبيرة.
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-1.5">
              {versions.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-medium">{v.label}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {new Date(v.createdAt).toLocaleString("en-GB")} · {v.items.length} بند
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">{fmt(v.grandTotal)} {currency}</Badge>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCompareId(v.id === compareId ? null : v.id)}
                      className="h-7 px-2"
                      title="مقارنة"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => restore(v)}
                      className="h-7 px-2 text-primary"
                      title="استعادة"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(v.id)}
                      className="h-7 px-2 text-destructive"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
