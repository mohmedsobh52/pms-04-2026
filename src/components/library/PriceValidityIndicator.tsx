import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface PriceValidityIndicatorProps {
  priceDate?: string | null;
  validUntil?: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export type ValidityStatus = "valid" | "expiring" | "expired" | "unknown";

export const getValidityStatus = (validUntil?: string | null, priceDate?: string | null): ValidityStatus => {
  const today = new Date();
  
  // If we have a valid_until date, use it
  if (validUntil) {
    try {
      const expiryDate = parseISO(validUntil);
      const daysUntilExpiry = differenceInDays(expiryDate, today);
      
      if (daysUntilExpiry < 0) return "expired";
      if (daysUntilExpiry <= 30) return "expiring";
      return "valid";
    } catch {
      return "unknown";
    }
  }
  
  // If no valid_until, estimate based on price_date (assume 90 days validity)
  if (priceDate) {
    try {
      const priceDateParsed = parseISO(priceDate);
      const daysSincePrice = differenceInDays(today, priceDateParsed);
      
      if (daysSincePrice > 90) return "expired";
      if (daysSincePrice > 60) return "expiring";
      return "valid";
    } catch {
      return "unknown";
    }
  }
  
  return "unknown";
};

export const getValidityStats = (items: Array<{ price_date?: string | null; valid_until?: string | null }>) => {
  const stats = { valid: 0, expiring: 0, expired: 0, unknown: 0 };
  
  items.forEach(item => {
    const status = getValidityStatus(item.valid_until, item.price_date);
    stats[status]++;
  });
  
  return stats;
};

export const PriceValidityIndicator = ({ 
  priceDate, 
  validUntil, 
  showLabel = false,
  size = "sm"
}: PriceValidityIndicatorProps) => {
  const { isArabic } = useLanguage();
  const status = getValidityStatus(validUntil, priceDate);
  
  const config = {
    valid: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      label: isArabic ? "صالح" : "Valid",
      description: isArabic ? "السعر صالح" : "Price is valid",
    },
    expiring: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      label: isArabic ? "يقترب من الانتهاء" : "Expiring Soon",
      description: isArabic ? "السعر يقترب من انتهاء الصلاحية" : "Price is expiring soon",
    },
    expired: {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      label: isArabic ? "منتهي" : "Expired",
      description: isArabic ? "السعر منتهي الصلاحية" : "Price has expired",
    },
    unknown: {
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: isArabic ? "غير محدد" : "Unknown",
      description: isArabic ? "تاريخ الصلاحية غير محدد" : "Validity date not set",
    },
  };

  const { icon: Icon, color, bgColor, label, description } = config[status];
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), "yyyy/MM/dd", { locale: isArabic ? ar : enUS });
    } catch {
      return null;
    }
  };

  const tooltipContent = (
    <div className="text-xs space-y-1">
      <div className="font-medium">{description}</div>
      {priceDate && (
        <div className="text-muted-foreground">
          {isArabic ? "تاريخ السعر: " : "Price Date: "}{formatDate(priceDate)}
        </div>
      )}
      {validUntil && (
        <div className="text-muted-foreground">
          {isArabic ? "صالح حتى: " : "Valid Until: "}{formatDate(validUntil)}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {showLabel ? (
            <Badge 
              variant="outline" 
              className={`${bgColor} ${color} gap-1 cursor-help border-0`}
            >
              <Icon className={iconSize} />
              <span>{label}</span>
            </Badge>
          ) : (
            <div className={`${color} cursor-help`}>
              <Icon className={iconSize} />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
