import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Info,
  EyeOff,
  Eye,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Item {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
  aiSuggestedProductivity?: number;
  aiSuggestedRent?: number;
}

export type AnomalyKind =
  | "zero_productivity"
  | "zero_rent"
  | "zero_cost"
  | "cost_outlier_high"
  | "cost_outlier_low"
  | "productivity_outlier_high"
  | "productivity_outlier_low"
  | "rent_outlier_high"
  | "duplicate_name"
  | "large_ai_gap_prod"
  | "large_ai_gap_rent"
  | "missing_ai"
  | "negative_value"
  | "extreme_ratio"
  | "empty_name";

export type Severity = "info" | "warning" | "critical";

interface Anomaly {
  id: string;
  itemId: string;
  itemName: string;
  kind: AnomalyKind;
  severity: Severity;
  message: string;
  value?: number;
  reference?: number;
}

const KIND_LABEL: Record<AnomalyKind, string> = {
  zero_productivity: "إنتاجية صفر",
  zero_rent: "إيجار صفر",
  zero_cost: "تكلفة صفر",
  cost_outlier_high: "تكلفة مرتفعة شاذة",
  cost_outlier_low: "تكلفة منخفضة شاذة",
  productivity_outlier_high: "إنتاجية شاذة عالية",
  productivity_outlier_low: "إنتاجية شاذة منخفضة",
  rent_outlier_high: "إيجار شاذ مرتفع",
  duplicate_name: "اسم مكرر",
  large_ai_gap_prod: "فجوة كبيرة مع اقتراح AI (إنتاجية)",
  large_ai_gap_rent: "فجوة كبيرة مع اقتراح AI (إيجار)",
  missing_ai: "لا يوجد اقتراح AI",
  negative_value: "قيمة سالبة",
  extreme_ratio: "نسبة إيجار/إنتاجية متطرفة",
  empty_name: "اسم فارغ",
};

const SEVERITY_STYLE: Record<Severity, string> = {
  critical: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

const DISMISS_KEY = "cost_anomaly_dismissed_v1";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function detect(items: Item[]): Anomaly[] {
  const out: Anomaly[] = [];
  const costs = items.map((i) => i.costPerUnit).filter((v) => v > 0);
  const prods = items.map((i) => i.dailyProductivity).filter((v) => v > 0);
  const rents = items.map((i) => i.dailyRent).filter((v) => v > 0);

  const costMed = median(costs);
  const prodMed = median(prods);
  const rentMed = median(rents);

  const nameCount = new Map<string, number>();
  items.forEach((i) => {
    const key = i.name.trim().toLowerCase();
    if (key) nameCount.set(key, (nameCount.get(key) || 0) + 1);
  });

  items.forEach((i) => {
    const push = (
      kind: AnomalyKind,
      severity: Severity,
      message: string,
      value?: number,
      reference?: number,
    ) => {
      out.push({
        id: `${i.id}::${kind}`,
        itemId: i.id,
        itemName: i.name || "(بدون اسم)",
        kind,
        severity,
        message,
        value,
        reference,
      });
    };

    if (!i.name || !i.name.trim()) push("empty_name", "warning", "اسم البند فارغ");
    if (i.dailyProductivity === 0)
      push("zero_productivity", "critical", "الإنتاجية اليومية = 0");
    if (i.dailyRent === 0) push("zero_rent", "warning", "الإيجار اليومي = 0");
    if (i.costPerUnit === 0) push("zero_cost", "warning", "تكلفة الوحدة = 0");
    if (i.dailyProductivity < 0)
      push("negative_value", "critical", "الإنتاجية سالبة", i.dailyProductivity);
    if (i.dailyRent < 0)
      push("negative_value", "critical", "الإيجار سالب", i.dailyRent);

    if (costMed > 0 && i.costPerUnit > costMed * 3)
      push(
        "cost_outlier_high",
        "warning",
        `تكلفة تفوق 3× الوسيط (${costMed.toFixed(2)})`,
        i.costPerUnit,
        costMed,
      );
    if (costMed > 0 && i.costPerUnit > 0 && i.costPerUnit < costMed * 0.2)
      push(
        "cost_outlier_low",
        "info",
        `تكلفة أقل من 20% من الوسيط (${costMed.toFixed(2)})`,
        i.costPerUnit,
        costMed,
      );
    if (prodMed > 0 && i.dailyProductivity > prodMed * 3)
      push(
        "productivity_outlier_high",
        "info",
        `إنتاجية تفوق 3× الوسيط (${prodMed.toFixed(2)})`,
        i.dailyProductivity,
        prodMed,
      );
    if (prodMed > 0 && i.dailyProductivity > 0 && i.dailyProductivity < prodMed * 0.2)
      push(
        "productivity_outlier_low",
        "warning",
        `إنتاجية أقل من 20% من الوسيط (${prodMed.toFixed(2)})`,
        i.dailyProductivity,
        prodMed,
      );
    if (rentMed > 0 && i.dailyRent > rentMed * 3)
      push(
        "rent_outlier_high",
        "warning",
        `إيجار يفوق 3× الوسيط (${rentMed.toFixed(2)})`,
        i.dailyRent,
        rentMed,
      );

    if (i.name && nameCount.get(i.name.trim().toLowerCase())! > 1)
      push("duplicate_name", "info", "يوجد بند آخر بنفس الاسم");

    if (
      typeof i.aiSuggestedProductivity === "number" &&
      i.dailyProductivity > 0 &&
      Math.abs(i.aiSuggestedProductivity - i.dailyProductivity) / i.dailyProductivity > 0.3
    )
      push(
        "large_ai_gap_prod",
        "info",
        `اقتراح AI يختلف >30% (${i.aiSuggestedProductivity} مقابل ${i.dailyProductivity})`,
        i.aiSuggestedProductivity,
        i.dailyProductivity,
      );
    if (
      typeof i.aiSuggestedRent === "number" &&
      i.dailyRent > 0 &&
      Math.abs(i.aiSuggestedRent - i.dailyRent) / i.dailyRent > 0.3
    )
      push(
        "large_ai_gap_rent",
        "info",
        `اقتراح AI يختلف >30% (${i.aiSuggestedRent} مقابل ${i.dailyRent})`,
        i.aiSuggestedRent,
        i.dailyRent,
      );

    if (i.aiSuggestedProductivity == null && i.aiSuggestedRent == null)
      push("missing_ai", "info", "لا يوجد اقتراح AI لهذا البند");

    if (i.dailyProductivity > 0 && i.dailyRent / i.dailyProductivity > 10000)
      push("extreme_ratio", "warning", "نسبة إيجار/إنتاجية عالية جداً");
  });

  return out;
}

interface Props {
  items: Item[];
  currency: string;
  onFocusItem?: (id: string) => void;
}

export function AnomalyDetectorPanel({ items, currency, onFocusItem }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [showDismissed, setShowDismissed] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const persist = (next: Set<string>) => {
    setDismissed(new Set(next));
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
  };

  const all = useMemo(() => detect(items), [items]);
  const visible = useMemo(
    () =>
      all.filter((a) => {
        if (!showDismissed && dismissed.has(a.id)) return false;
        if (severityFilter !== "all" && a.severity !== severityFilter) return false;
        return true;
      }),
    [all, dismissed, showDismissed, severityFilter],
  );

  const counts = useMemo(
    () => ({
      critical: all.filter((a) => a.severity === "critical" && !dismissed.has(a.id)).length,
      warning: all.filter((a) => a.severity === "warning" && !dismissed.has(a.id)).length,
      info: all.filter((a) => a.severity === "info" && !dismissed.has(a.id)).length,
    }),
    [all, dismissed],
  );

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    persist(next);
  };

  const restore = (id: string) => {
    const next = new Set(dismissed);
    next.delete(id);
    persist(next);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            كاشف الشذوذ والمخاطر
            <Badge variant="outline" className="text-[10px]">
              {visible.length} حالة
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-red-500 hover:bg-red-500 text-[10px]">
              حرج: {counts.critical}
            </Badge>
            <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px]">
              تحذير: {counts.warning}
            </Badge>
            <Badge className="bg-sky-500 hover:bg-sky-500 text-[10px]">
              معلومة: {counts.info}
            </Badge>
            <Select
              value={severityFilter}
              onValueChange={(v) => setSeverityFilter(v as Severity | "all")}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="critical">حرج</SelectItem>
                <SelectItem value="warning">تحذير</SelectItem>
                <SelectItem value="info">معلومة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1"
              onClick={() => setShowDismissed((v) => !v)}
            >
              {showDismissed ? (
                <>
                  <EyeOff className="w-3 h-3" /> إخفاء المتجاهلة
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" /> إظهار المتجاهلة ({dismissed.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[420px] pr-2">
          {visible.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              لا توجد حالات شذوذ
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((a) => {
                const isDismissed = dismissed.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`p-2.5 rounded-md border bg-card hover:bg-muted/30 transition ${
                      isDismissed ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${SEVERITY_STYLE[a.severity]}`}
                          >
                            {a.severity === "critical"
                              ? "حرج"
                              : a.severity === "warning"
                              ? "تحذير"
                              : "معلومة"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {KIND_LABEL[a.kind]}
                          </Badge>
                          {a.value != null && a.reference != null && (
                            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                              {a.value > a.reference ? (
                                <TrendingUp className="w-3 h-3 text-red-500" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-emerald-500" />
                              )}
                              {a.value.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs">
                          <span className="font-medium">{a.itemName}</span>
                          <span className="text-muted-foreground"> — {a.message}</span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {onFocusItem && !isDismissed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => onFocusItem(a.itemId)}
                          >
                            فحص
                          </Button>
                        )}
                        {isDismissed ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => restore(a.id)}
                          >
                            استعادة
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => dismiss(a.id)}
                          >
                            تجاهل
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {all.length === 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-3">
            <Info className="w-3 h-3" />
            كل شيء يبدو على ما يرام
          </div>
        )}
      </CardContent>
    </Card>
  );
}
