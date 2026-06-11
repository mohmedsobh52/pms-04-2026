import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

interface Item {
  item_number?: string | number;
  description?: string;
  unit?: string;
  category?: string;
  quantity?: number;
  unit_price?: number;
}

interface Props {
  items: Item[];
  isArabic?: boolean;
}

interface Anomaly {
  item: Item;
  category: string;
  zScore: number;
  median: number;
  ratio: number; // unit_price / median
}

/**
 * Statistical outlier detector for BOQ unit prices.
 * For each category, computes median + MAD-based z-score; flags items
 * whose unit price deviates by >2 (modified z-score on absolute deviation).
 */
export function PriceAnomalyDetector({ items, isArabic }: Props) {
  const [expanded, setExpanded] = useState(false);

  const anomalies = useMemo<Anomaly[]>(() => {
    const priced = items.filter((i) => Number(i.unit_price) > 0);
    if (priced.length < 5) return [];

    // Group by category (fallback "_global_")
    const byCat = new Map<string, Item[]>();
    priced.forEach((i) => {
      const c = (i.category || "_global_").toString();
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c)!.push(i);
    });

    const out: Anomaly[] = [];
    byCat.forEach((arr, cat) => {
      if (arr.length < 4) return;
      const prices = arr.map((i) => Number(i.unit_price)).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      if (!median) return;
      // Median Absolute Deviation
      const mad = prices.map((p) => Math.abs(p - median)).sort((a, b) => a - b)[
        Math.floor(prices.length / 2)
      ] || 1;

      arr.forEach((i) => {
        const p = Number(i.unit_price);
        const z = (0.6745 * (p - median)) / mad;
        if (Math.abs(z) >= 2) {
          out.push({
            item: i,
            category: cat === "_global_" ? (isArabic ? "عام" : "General") : cat,
            zScore: z,
            median,
            ratio: p / median,
          });
        }
      });
    });

    return out.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }, [items, isArabic]);

  if (anomalies.length === 0) {
    if (items.filter((i) => Number(i.unit_price) > 0).length < 5) return null;
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold">
              {isArabic ? "لا توجد قيم شاذة" : "No price anomalies detected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isArabic
                ? "جميع أسعار الوحدات ضمن النطاق المتوقع لفئاتها"
                : "All unit prices are within expected range for their categories"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    maximumFractionDigits: 2,
  });
  const visible = expanded ? anomalies : anomalies.slice(0, 5);
  const high = anomalies.filter((a) => a.zScore > 0).length;
  const low = anomalies.filter((a) => a.zScore < 0).length;

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          {isArabic ? "كشف القيم الشاذة في التسعير" : "Price Anomaly Detector"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {anomalies.length} {isArabic ? "بند" : "items"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-red-600" />
            {isArabic ? `${high} مرتفعة جداً` : `${high} too high`}
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
            {isArabic ? `${low} منخفضة جداً` : `${low} too low`}
          </span>
        </div>

        <div className="space-y-1.5">
          {visible.map((a, idx) => {
            const isHigh = a.zScore > 0;
            const pctDiff = Math.round((a.ratio - 1) * 100);
            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-md border border-border/30 hover:bg-muted/40"
              >
                {isHigh ? (
                  <TrendingUp className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    #{a.item.item_number} · {a.item.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {a.category} · {isArabic ? "الوسيط" : "median"}: {fmt.format(a.median)} {a.item.unit || ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums">
                    {fmt.format(Number(a.item.unit_price))}
                  </p>
                  <Badge
                    variant={Math.abs(a.zScore) >= 3 ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {pctDiff > 0 ? "+" : ""}
                    {pctDiff}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {anomalies.length > 5 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 me-1" />
                {isArabic ? "عرض أقل" : "Show less"}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 me-1" />
                {isArabic ? `عرض الكل (${anomalies.length})` : `Show all (${anomalies.length})`}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
