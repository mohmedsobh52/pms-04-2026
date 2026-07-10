import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Item {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
}

interface Tip {
  id: string;
  kind: "success" | "warning" | "info";
  title: string;
  message: string;
}

interface Props {
  items: Item[];
  wastePct: number;
  adminPct: number;
  currency: string;
  storageKey?: string;
}

const DEFAULT_KEY = "cost_system_tips_dismissed_v1";

function buildTips(items: Item[], wastePct: number, adminPct: number): Tip[] {
  const tips: Tip[] = [];
  const total = items.length;
  if (total === 0) {
    tips.push({
      id: "empty",
      kind: "info",
      title: "ابدأ بإضافة بند",
      message: 'اضغط "إضافة بند" أو استورد من Excel للبدء بالتحليل.',
    });
    return tips;
  }

  const missingProd = items.filter((i) => i.dailyProductivity <= 0).length;
  const missingCost = items.filter((i) => i.costPerUnit <= 0).length;
  const missingRent = items.filter((i) => i.dailyRent <= 0).length;

  if (missingProd > 0)
    tips.push({
      id: "missing-prod",
      kind: "warning",
      title: `${missingProd} بند بدون إنتاجية`,
      message: 'أدخل الإنتاجية اليومية أو استخدم "توليد اقتراحات" لتقدير القيم.',
    });

  if (missingCost > 0)
    tips.push({
      id: "missing-cost",
      kind: "warning",
      title: `${missingCost} بند بدون تكلفة`,
      message: "بنود بتكلفة صفر تُخل بحساب الإجمالي والمؤشرات.",
    });

  if (missingRent > total * 0.5)
    tips.push({
      id: "rent-heavy",
      kind: "info",
      title: "أكثر من نصف البنود بدون إيجار",
      message: "إذا كان المشروع لا يعتمد على معدات، هذا طبيعي؛ وإلا راجع البنود.",
    });

  if (wastePct > 15)
    tips.push({
      id: "waste-high",
      kind: "warning",
      title: `نسبة الهالك عالية (${wastePct}%)`,
      message: "النسبة القياسية عادةً 3–10%. راجع الافتراضات في شريط المشروع.",
    });

  if (adminPct > 20)
    tips.push({
      id: "admin-high",
      kind: "warning",
      title: `نسبة الإدارية عالية (${adminPct}%)`,
      message: "أعد النظر في التوزيع بين الإدارية والأرباح لضبط الهامش.",
    });

  const totalValue = items.reduce((s, i) => s + i.costPerUnit, 0);
  if (totalValue > 0 && total >= 5) {
    const top = [...items].sort((a, b) => b.costPerUnit - a.costPerUnit).slice(0, 3);
    const share = top.reduce((s, i) => s + i.costPerUnit, 0) / totalValue;
    if (share > 0.7)
      tips.push({
        id: "concentration",
        kind: "info",
        title: `تركّز 70%+ في 3 بنود فقط`,
        message: `الأثر الأكبر: ${top.map((t) => t.name).join(" · ")}. ركّز التفاوض عليها.`,
      });
  }

  if (missingProd === 0 && missingCost === 0 && wastePct <= 10 && adminPct <= 15)
    tips.push({
      id: "healthy",
      kind: "success",
      title: "التحليل في حالة جيدة",
      message: "لا مشاكل بارزة. يمكنك البدء بتصدير التقرير أو طلب الاعتماد.",
    });

  return tips;
}

export function SystemTipsPanel({
  items,
  wastePct,
  adminPct,
  storageKey = DEFAULT_KEY,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...dismissed]));
  }, [dismissed, storageKey]);

  const tips = useMemo(
    () => buildTips(items, wastePct, adminPct).filter((t) => !dismissed.has(t.id)),
    [items, wastePct, adminPct, dismissed],
  );

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));
  const resetAll = () => setDismissed(new Set());

  if (tips.length === 0)
    return (
      <Card className="mb-6">
        <CardContent className="py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            لا توجد تلميحات نشطة
          </span>
          {dismissed.size > 0 && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={resetAll}>
              إعادة عرض المتجاهلة ({dismissed.size})
            </Button>
          )}
        </CardContent>
      </Card>
    );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            تلميحات النظام
            <Badge variant="outline" className="text-[10px]">
              {tips.length}
            </Badge>
          </CardTitle>
          {dismissed.size > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetAll}>
              استعادة ({dismissed.size})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tips.map((t) => {
          const Icon =
            t.kind === "success" ? CheckCircle2 : t.kind === "warning" ? AlertCircle : Info;
          const tone =
            t.kind === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : t.kind === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : "text-sky-600 dark:text-sky-400";
          return (
            <div
              key={t.id}
              className="p-2.5 rounded-md border bg-card hover:bg-muted/30 transition flex items-start gap-2"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.message}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => dismiss(t.id)}
                aria-label="تجاهل"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
