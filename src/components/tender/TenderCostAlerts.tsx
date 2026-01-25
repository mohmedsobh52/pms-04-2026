import { useLanguage } from "@/hooks/useLanguage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle, Lightbulb, TrendingDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CostTotals {
  totalStaffCosts: number;
  totalFacilitiesCosts: number;
  totalInsuranceCosts: number;
  totalGuaranteesCosts: number;
  totalIndirectCosts: number;
  totalSubcontractorsCosts: number;
}

interface TenderCostAlertsProps {
  contractValue: number;
  totals: CostTotals;
  currency?: string;
}

interface AlertItem {
  category: string;
  categoryEn: string;
  currentValue: number;
  percentage: number;
  warningThreshold: number;
  dangerThreshold: number;
  level: 'success' | 'warning' | 'danger';
  recommendation: string;
  recommendationEn: string;
  potentialSavings: number;
  targetPercentage: number;
}

const TenderCostAlerts = ({ contractValue, totals, currency = "SAR" }: TenderCostAlertsProps) => {
  const { isArabic: isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateAlerts = (): AlertItem[] => {
    if (!contractValue || contractValue <= 0) return [];

    const alertConfigs = [
      {
        category: "طاقم الموقع",
        categoryEn: "Site Staff",
        value: totals.totalStaffCosts,
        warningThreshold: 8,
        dangerThreshold: 12,
        targetPercentage: 8,
        recommendation: "مراجعة أعداد الموظفين أو تخفيض الرواتب أو البحث عن كوادر محلية",
        recommendationEn: "Review staff numbers, reduce salaries, or find local personnel"
      },
      {
        category: "المرافق",
        categoryEn: "Facilities",
        value: totals.totalFacilitiesCosts,
        warningThreshold: 5,
        dangerThreshold: 8,
        targetPercentage: 5,
        recommendation: "البحث عن مواقع بديلة أو تقليل المساحات أو مشاركة المرافق",
        recommendationEn: "Find alternative locations, reduce spaces, or share facilities"
      },
      {
        category: "التأمين",
        categoryEn: "Insurance",
        value: totals.totalInsuranceCosts,
        warningThreshold: 2,
        dangerThreshold: 3,
        targetPercentage: 1.5,
        recommendation: "التفاوض مع شركات التأمين للحصول على أسعار تنافسية أو مراجعة التغطيات",
        recommendationEn: "Negotiate with insurance companies or review coverages"
      },
      {
        category: "الضمانات",
        categoryEn: "Guarantees",
        value: totals.totalGuaranteesCosts,
        warningThreshold: 1.5,
        dangerThreshold: 2.5,
        targetPercentage: 1,
        recommendation: "البحث عن بنوك بعمولات أقل أو تقليل نسب الضمانات المطلوبة",
        recommendationEn: "Find banks with lower commissions or reduce guarantee percentages"
      },
      {
        category: "التكاليف غير المباشرة",
        categoryEn: "Indirect Costs",
        value: totals.totalIndirectCosts,
        warningThreshold: 6,
        dangerThreshold: 10,
        targetPercentage: 5,
        recommendation: "مراجعة شاملة للتكاليف الإدارية وتحسين الكفاءة التشغيلية",
        recommendationEn: "Comprehensive review of admin costs and improve operational efficiency"
      },
      {
        category: "مقاولو الباطن",
        categoryEn: "Subcontractors",
        value: totals.totalSubcontractorsCosts,
        warningThreshold: 30,
        dangerThreshold: 40,
        targetPercentage: 25,
        recommendation: "إعادة التفاوض مع المقاولين أو تنفيذ بعض الأعمال داخلياً",
        recommendationEn: "Renegotiate with contractors or execute some work internally"
      }
    ];

    return alertConfigs.map(config => {
      const percentage = (config.value / contractValue) * 100;
      let level: 'success' | 'warning' | 'danger' = 'success';
      
      if (percentage >= config.dangerThreshold) {
        level = 'danger';
      } else if (percentage >= config.warningThreshold) {
        level = 'warning';
      }

      const potentialSavings = level !== 'success' 
        ? config.value - (contractValue * config.targetPercentage / 100)
        : 0;

      return {
        ...config,
        currentValue: config.value,
        percentage,
        level,
        potentialSavings: Math.max(0, potentialSavings)
      };
    }).filter(alert => alert.currentValue > 0);
  };

  const alerts = calculateAlerts();
  const dangerAlerts = alerts.filter(a => a.level === 'danger');
  const warningAlerts = alerts.filter(a => a.level === 'warning');
  const successAlerts = alerts.filter(a => a.level === 'success');
  const totalPotentialSavings = alerts.reduce((sum, a) => sum + a.potentialSavings, 0);

  if (alerts.length === 0) return null;

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'danger': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertBadge = (level: string) => {
    switch (level) {
      case 'danger': return <Badge variant="destructive">{isRTL ? "خطر" : "Danger"}</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">{isRTL ? "تحذير" : "Warning"}</Badge>;
      default: return <Badge className="bg-green-500">{isRTL ? "طبيعي" : "Normal"}</Badge>;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {isRTL ? "تنبيهات التكاليف الذكية" : "Smart Cost Alerts"}
                {dangerAlerts.length > 0 && (
                  <Badge variant="destructive" className="mr-2">{dangerAlerts.length}</Badge>
                )}
                {warningAlerts.length > 0 && (
                  <Badge className="bg-yellow-500">{warningAlerts.length}</Badge>
                )}
              </CardTitle>
              <span className="text-muted-foreground text-sm">
                {isOpen ? (isRTL ? "إخفاء" : "Hide") : (isRTL ? "إظهار" : "Show")}
              </span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Danger Alerts */}
            {dangerAlerts.map((alert, index) => (
              <Alert key={`danger-${index}`} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>
                    {isRTL ? alert.category : alert.categoryEn} ({alert.percentage.toFixed(1)}%)
                  </span>
                  {getAlertBadge(alert.level)}
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm">
                    {isRTL 
                      ? `تجاوز الحد الأقصى المسموح به (${alert.dangerThreshold}%)`
                      : `Exceeded maximum threshold (${alert.dangerThreshold}%)`
                    }
                  </p>
                  <div className="flex items-start gap-2 bg-destructive/10 p-2 rounded">
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-sm">
                      {isRTL ? alert.recommendation : alert.recommendationEn}
                    </span>
                  </div>
                  {alert.potentialSavings > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingDown className="h-4 w-4" />
                      {isRTL 
                        ? `الوفر المتوقع: ${formatCurrency(alert.potentialSavings)} ${currency}`
                        : `Potential savings: ${currency} ${formatCurrency(alert.potentialSavings)}`
                      }
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ))}

            {/* Warning Alerts */}
            {warningAlerts.map((alert, index) => (
              <Alert key={`warning-${index}`} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="flex items-center justify-between">
                  <span>
                    {isRTL ? alert.category : alert.categoryEn} ({alert.percentage.toFixed(1)}%)
                  </span>
                  {getAlertBadge(alert.level)}
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {isRTL 
                      ? `تجاوز النسبة الطبيعية (${alert.warningThreshold}%)`
                      : `Exceeded normal threshold (${alert.warningThreshold}%)`
                    }
                  </p>
                  <div className="flex items-start gap-2 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                    <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      {isRTL ? alert.recommendation : alert.recommendationEn}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            ))}

            {/* Success Summary */}
            {successAlerts.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {isRTL ? "طبيعي:" : "Normal:"}
                </span>
                {successAlerts.map((alert, index) => (
                  <Badge key={index} variant="outline" className="border-green-500 text-green-700">
                    {isRTL ? alert.category : alert.categoryEn} ({alert.percentage.toFixed(1)}%)
                  </Badge>
                ))}
              </div>
            )}

            {/* Total Savings Summary */}
            {totalPotentialSavings > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {isRTL ? "إجمالي الوفر المتوقع عند تطبيق التوصيات" : "Total potential savings"}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(totalPotentialSavings)} {currency}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isRTL 
                      ? `نسبة التحسن المتوقعة: +${((totalPotentialSavings / contractValue) * 100).toFixed(1)}% من هامش الربح`
                      : `Expected improvement: +${((totalPotentialSavings / contractValue) * 100).toFixed(1)}% profit margin`
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default TenderCostAlerts;
