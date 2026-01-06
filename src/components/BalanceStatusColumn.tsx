import { useMemo } from "react";
import { CheckCircle2, TrendingUp, TrendingDown, AlertTriangle, XCircle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface BalanceStatusColumnProps {
  originalPrice: number;
  aiSuggestedPrice: number;
  calculatedPrice: number;
}

type BalanceStatus = "balanced" | "slightly_high" | "slightly_low" | "high" | "low" | "no_reference";

const BALANCED_THRESHOLD = 5;
const SLIGHT_THRESHOLD = 15;

export function BalanceStatusColumn({
  originalPrice,
  aiSuggestedPrice,
  calculatedPrice,
}: BalanceStatusColumnProps) {
  const { isArabic } = useLanguage();

  const { status, variance, referenceType } = useMemo(() => {
    const referencePrice = aiSuggestedPrice > 0 ? aiSuggestedPrice : calculatedPrice;
    const refType = aiSuggestedPrice > 0 ? "ai" : calculatedPrice > 0 ? "calc" : "none";
    
    if (originalPrice === 0 || referencePrice === 0) {
      return { status: "no_reference" as BalanceStatus, variance: 0, referenceType: refType };
    }
    
    const varianceVal = ((originalPrice - referencePrice) / referencePrice) * 100;
    
    let statusVal: BalanceStatus;
    if (Math.abs(varianceVal) <= BALANCED_THRESHOLD) statusVal = "balanced";
    else if (varianceVal > SLIGHT_THRESHOLD) statusVal = "high";
    else if (varianceVal > BALANCED_THRESHOLD) statusVal = "slightly_high";
    else if (varianceVal < -SLIGHT_THRESHOLD) statusVal = "low";
    else statusVal = "slightly_low";
    
    return { status: statusVal, variance: varianceVal, referenceType: refType };
  }, [originalPrice, aiSuggestedPrice, calculatedPrice]);

  const getStatusDisplay = () => {
    switch (status) {
      case "balanced":
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: "text-success",
          bgColor: "bg-success/20",
          borderColor: "border-success/30",
          label: isArabic ? "متوازن" : "Balanced",
          tooltip: isArabic 
            ? `السعر متوازن (فارق ${Math.abs(variance).toFixed(1)}% عن ${referenceType === "ai" ? "AI" : "المحسوب"})`
            : `Price is balanced (${Math.abs(variance).toFixed(1)}% variance from ${referenceType === "ai" ? "AI" : "calculated"})`,
        };
      case "slightly_high":
        return {
          icon: <TrendingUp className="w-4 h-4" />,
          color: "text-warning",
          bgColor: "bg-warning/20",
          borderColor: "border-warning/30",
          label: `+${variance.toFixed(0)}%`,
          tooltip: isArabic 
            ? `أعلى من السوق بنسبة ${variance.toFixed(1)}%`
            : `${variance.toFixed(1)}% above market rate`,
        };
      case "high":
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: "text-destructive",
          bgColor: "bg-destructive/20",
          borderColor: "border-destructive/30",
          label: `+${variance.toFixed(0)}%`,
          tooltip: isArabic 
            ? `مرتفع جداً - أعلى بنسبة ${variance.toFixed(1)}%`
            : `Too high - ${variance.toFixed(1)}% above market`,
        };
      case "slightly_low":
        return {
          icon: <TrendingDown className="w-4 h-4" />,
          color: "text-blue-600",
          bgColor: "bg-blue-500/20",
          borderColor: "border-blue-500/30",
          label: `${variance.toFixed(0)}%`,
          tooltip: isArabic 
            ? `أقل من السوق بنسبة ${Math.abs(variance).toFixed(1)}%`
            : `${Math.abs(variance).toFixed(1)}% below market rate`,
        };
      case "low":
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: "text-orange-600",
          bgColor: "bg-orange-500/20",
          borderColor: "border-orange-500/30",
          label: `${variance.toFixed(0)}%`,
          tooltip: isArabic 
            ? `منخفض جداً - أقل بنسبة ${Math.abs(variance).toFixed(1)}%`
            : `Too low - ${Math.abs(variance).toFixed(1)}% below market`,
        };
      case "no_reference":
      default:
        return {
          icon: <Minus className="w-4 h-4" />,
          color: "text-muted-foreground",
          bgColor: "bg-muted/30",
          borderColor: "border-muted",
          label: "-",
          tooltip: isArabic ? "لا يوجد سعر مرجعي" : "No reference price available",
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs cursor-help transition-all hover:scale-105",
              display.color,
              display.bgColor,
              display.borderColor
            )}
          >
            {display.icon}
            {display.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{display.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
