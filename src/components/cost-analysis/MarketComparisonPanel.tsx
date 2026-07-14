import { useMemo } from "react";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, LineChart, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  costPerUnit: number;
  dailyProductivity: number;
  dailyRent: number;
}

interface Props {
  items: Item[];
  currency: string;
  onApplyMarketPrice?: (rowId: string, newRent: number) => void;
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string) {
  return new Set(normalize(s).split(" ").filter((w) => w.length > 2));
}

function scoreMatch(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let hit = 0;
  A.forEach((t) => B.has(t) && hit++);
  return hit / Math.max(A.size, B.size);
}

export function MarketComparisonPanel({ items, currency, onApplyMarketPrice }: Props) {
  const { materials, loading } = useMaterialPrices();

  const matches = useMemo(() => {
    if (!materials?.length) return [];
    return items
      .map((it) => {
        let best: { mat: (typeof materials)[number]; score: number } | null = null;
        for (const m of materials) {
          const s = Math.max(
            scoreMatch(it.name, m.name_ar || ""),
            scoreMatch(it.name, m.name || ""),
          );
          if (s > (best?.score ?? 0)) best = { mat: m, score: s };
        }
        if (!best || best.score < 0.4) return null;
        const marketPrice = Number(best.mat.unit_price) || 0;
        const currentPrice = Number(it.costPerUnit) || 0;
        if (marketPrice <= 0 || currentPrice <= 0) return null;
        const deviation = ((currentPrice - marketPrice) / marketPrice) * 100;
        return {
          itemId: it.id,
          itemName: it.name,
          currentPrice,
          marketPrice,
          marketCurrency: best.mat.currency,
          matchName: best.mat.name_ar || best.mat.name,
          source: best.mat.source || best.mat.supplier_name || "مكتبة الأسعار",
          deviation,
          confidence: Math.round(best.score * 100),
          productivity: it.dailyProductivity,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }, [items, materials]);

  const summary = useMemo(() => {
    const total = matches.length;
    const over = matches.filter((m) => m.deviation > 5).length;
    const under = matches.filter((m) => m.deviation < -5).length;
    const inline = total - over - under;
    const avg = total > 0 ? matches.reduce((s, m) => s + m.deviation, 0) / total : 0;
    return { total, over, under, inline, avg };
  }, [matches]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          جاري تحميل بيانات السوق...
        </CardContent>
      </Card>
    );
  }

  if (!materials?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground space-y-1">
          <LineChart className="w-5 h-5 mx-auto text-muted-foreground/60" />
          <div>لا توجد بيانات في مكتبة أسعار المواد للمقارنة.</div>
          <div className="text-xs">أضف أسعاراً في شاشة "أسعار المواد" لتفعيل المقارنة السوقية.</div>
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          لم يتم العثور على تطابقات كافية بين البنود ومكتبة أسعار المواد.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="بنود مقارنة" value={String(summary.total)} tone="primary" />
        <StatTile label="أعلى من السوق" value={String(summary.over)} tone="warn" icon={TrendingUp} />
        <StatTile label="أقل من السوق" value={String(summary.under)} tone="success" icon={TrendingDown} />
        <StatTile label="متوسط الانحراف" value={`${summary.avg.toFixed(1)}%`} tone="info" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <LineChart className="w-4 h-4 text-primary" />
            تفاصيل المقارنة مع السوق
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-auto divide-y">
            {matches.slice(0, 50).map((m) => {
              const tone =
                Math.abs(m.deviation) <= 5
                  ? "text-muted-foreground"
                  : m.deviation > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-emerald-600 dark:text-emerald-400";
              const Icon =
                Math.abs(m.deviation) <= 5 ? Minus : m.deviation > 0 ? TrendingUp : TrendingDown;
              const suggestedRent =
                m.productivity > 0 ? Math.round(m.marketPrice * m.productivity * 100) / 100 : null;
              return (
                <div key={m.itemId} className="p-3 hover:bg-muted/30 transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{m.itemName}</span>
                        <Badge variant="outline" className="text-[10px]">
                          ثقة {m.confidence}%
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        مطابقة: {m.matchName} · المصدر: {m.source}
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-1 text-sm font-bold shrink-0", tone)}>
                      <Icon className="w-3.5 h-3.5" />
                      {m.deviation > 0 ? "+" : ""}
                      {m.deviation.toFixed(1)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                    <Info label="سعرك" value={`${m.currentPrice.toFixed(2)} ${currency}`} />
                    <Info
                      label="سعر السوق"
                      value={`${m.marketPrice.toFixed(2)} ${m.marketCurrency}`}
                    />
                    <Info
                      label="الفرق للوحدة"
                      value={`${(m.currentPrice - m.marketPrice).toFixed(2)}`}
                    />
                    {suggestedRent != null && onApplyMarketPrice && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => onApplyMarketPrice(m.itemId, suggestedRent)}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        تطبيق سعر السوق
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "primary" | "warn" | "success" | "info";
  icon?: typeof TrendingUp;
}) {
  const toneCls = {
    primary: "bg-primary/5 border-primary/20 text-primary",
    warn: "bg-orange-500/5 border-orange-500/20 text-orange-700 dark:text-orange-300",
    success: "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    info: "bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-300",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-3", toneCls)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium opacity-80">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-xs font-semibold truncate">{value}</div>
    </div>
  );
}
