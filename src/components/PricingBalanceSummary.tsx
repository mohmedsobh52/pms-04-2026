import { useMemo } from "react";
import { CheckCircle2, TrendingUp, TrendingDown, AlertTriangle, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface CalculatedCosts {
  calculatedUnitPrice: number;
  aiSuggestedRate?: number;
}

interface PricingBalanceSummaryProps {
  items: BOQItem[];
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts;
}

type BalanceStatus = "balanced" | "slightly_high" | "slightly_low" | "high" | "low";

const BALANCED_THRESHOLD = 5;
const SLIGHT_THRESHOLD = 15;

function getBalanceStatus(originalPrice: number, referencePrice: number): BalanceStatus {
  if (originalPrice === 0 || referencePrice === 0) return "balanced";
  
  const variance = ((originalPrice - referencePrice) / referencePrice) * 100;
  
  if (Math.abs(variance) <= BALANCED_THRESHOLD) return "balanced";
  if (variance > SLIGHT_THRESHOLD) return "high";
  if (variance > BALANCED_THRESHOLD) return "slightly_high";
  if (variance < -SLIGHT_THRESHOLD) return "low";
  return "slightly_low";
}

export function PricingBalanceSummary({
  items,
  getItemCalculatedCosts,
}: PricingBalanceSummaryProps) {
  const { isArabic } = useLanguage();

  const stats = useMemo(() => {
    let balanced = 0;
    let aboveMarket = 0;
    let belowMarket = 0;
    let itemsWithReference = 0;

    items.forEach(item => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const originalPrice = item.unit_price || 0;
      const aiSuggestedPrice = calcCosts.aiSuggestedRate || 0;
      const calculatedPrice = calcCosts.calculatedUnitPrice || 0;
      
      const referencePrice = aiSuggestedPrice > 0 ? aiSuggestedPrice : calculatedPrice;
      
      if (referencePrice > 0) {
        itemsWithReference++;
        const status = getBalanceStatus(originalPrice, referencePrice);
        
        if (status === "balanced") balanced++;
        else if (status === "high" || status === "slightly_high") aboveMarket++;
        else belowMarket++;
      }
    });

    const total = items.length;
    const balancedPercent = itemsWithReference > 0 ? (balanced / itemsWithReference) * 100 : 0;
    const abovePercent = itemsWithReference > 0 ? (aboveMarket / itemsWithReference) * 100 : 0;
    const belowPercent = itemsWithReference > 0 ? (belowMarket / itemsWithReference) * 100 : 0;

    return {
      balanced,
      aboveMarket,
      belowMarket,
      total,
      itemsWithReference,
      balancedPercent,
      abovePercent,
      belowPercent,
    };
  }, [items, getItemCalculatedCosts]);

  // Don't show if no reference prices available
  if (stats.itemsWithReference === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Scale className="w-4 h-4" />
        <span>{isArabic ? "توازن التسعير:" : "Pricing Balance:"}</span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Balanced */}
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1 text-xs",
            stats.balancedPercent >= 70 
              ? "bg-success/20 text-success border-success/30" 
              : "bg-success/10 text-success/80 border-success/20"
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          {stats.balanced} {isArabic ? "متوازن" : "Balanced"} ({stats.balancedPercent.toFixed(0)}%)
        </Badge>
        
        {/* Above Market */}
        {stats.aboveMarket > 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs",
              stats.abovePercent > 30 
                ? "bg-warning/20 text-warning border-warning/30" 
                : "bg-warning/10 text-warning/80 border-warning/20"
            )}
          >
            <TrendingUp className="w-3 h-3" />
            {stats.aboveMarket} {isArabic ? "أعلى" : "Above"} ({stats.abovePercent.toFixed(0)}%)
          </Badge>
        )}
        
        {/* Below Market */}
        {stats.belowMarket > 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs",
              stats.belowPercent > 30 
                ? "bg-blue-500/20 text-blue-600 border-blue-500/30" 
                : "bg-blue-500/10 text-blue-600/80 border-blue-500/20"
            )}
          >
            <TrendingDown className="w-3 h-3" />
            {stats.belowMarket} {isArabic ? "أقل" : "Below"} ({stats.belowPercent.toFixed(0)}%)
          </Badge>
        )}
        
        {/* Reference items count */}
        <span className="text-xs text-muted-foreground">
          ({isArabic ? "من" : "of"} {stats.itemsWithReference} {isArabic ? "بند مرجعي" : "with reference"})
        </span>
      </div>
    </div>
  );
}
