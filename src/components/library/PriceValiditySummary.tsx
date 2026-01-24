import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";

interface PriceValiditySummaryProps {
  stats: {
    valid: number;
    expiring: number;
    expired: number;
    unknown: number;
  };
  onFilterChange?: (filter: string | null) => void;
  activeFilter?: string | null;
}

export const PriceValiditySummary = ({ 
  stats, 
  onFilterChange,
  activeFilter 
}: PriceValiditySummaryProps) => {
  const { isArabic } = useLanguage();
  const total = stats.valid + stats.expiring + stats.expired + stats.unknown;

  const items = [
    {
      key: "valid",
      icon: CheckCircle,
      label: isArabic ? "صالحة" : "Valid",
      count: stats.valid,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      hoverBg: "hover:bg-green-200 dark:hover:bg-green-900/50",
    },
    {
      key: "expiring",
      icon: AlertTriangle,
      label: isArabic ? "تقترب من الانتهاء" : "Expiring Soon",
      count: stats.expiring,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      hoverBg: "hover:bg-amber-200 dark:hover:bg-amber-900/50",
    },
    {
      key: "expired",
      icon: XCircle,
      label: isArabic ? "منتهية" : "Expired",
      count: stats.expired,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      hoverBg: "hover:bg-red-200 dark:hover:bg-red-900/50",
    },
  ];

  if (total === 0) return null;

  return (
    <Card className="mb-4">
      <CardContent className="py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm font-medium text-muted-foreground">
            {isArabic ? "حالة الأسعار:" : "Price Status:"}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {items.map(item => (
              <button
                key={item.key}
                onClick={() => onFilterChange?.(activeFilter === item.key ? null : item.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-all
                  ${item.bgColor} ${item.color} ${item.hoverBg}
                  ${activeFilter === item.key ? 'ring-2 ring-offset-1 ring-current' : ''}
                  ${item.count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                disabled={item.count === 0}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.count}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
            
            {activeFilter && (
              <button
                onClick={() => onFilterChange?.(null)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {isArabic ? "إظهار الكل" : "Show All"}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
