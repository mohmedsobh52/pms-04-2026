import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useAnalysisTracking, AnalysisStatistics } from '@/hooks/useAnalysisTracking';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Cpu,
  Server,
  BarChart3
} from 'lucide-react';

interface AIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
  currentProvider: string;
  providerSwitches: number;
  lastError: string | null;
  lastErrorTime: string | null;
}

interface Props {
  onRetry?: () => void;
  isAnalyzing?: boolean;
}

export function AIMonitoringDashboard({ onRetry, isAnalyzing }: Props) {
  const { isArabic } = useLanguage();
  const { records, getStatistics, selectedProvider } = useAnalysisTracking();
  
  const [stats, setStats] = useState<AIUsageStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    averageResponseTime: 0,
    currentProvider: selectedProvider || 'lovable',
    providerSwitches: 0,
    lastError: null,
    lastErrorTime: null,
  });

  useEffect(() => {
    const trackingStats: AnalysisStatistics = getStatistics();
    
    // Calculate rate limit hits from records
    const rateLimitHits = records.filter(r => 
      r.status === 'error' && 
      (r.functionName?.includes('429') || r.error?.includes('rate limit') || r.error?.includes('429'))
    ).length;

    // Calculate provider switches (fallback count)
    const providerSwitches = trackingStats.fallbackCount;

    // Get last error
    const errorRecords = records.filter(r => r.status === 'error');
    const lastErrorRecord = errorRecords[errorRecords.length - 1];

    setStats({
      totalRequests: trackingStats.totalAnalyses,
      successfulRequests: trackingStats.successCount,
      failedRequests: trackingStats.errorCount,
      rateLimitHits,
      averageResponseTime: trackingStats.averageDuration,
      currentProvider: selectedProvider || 'lovable',
      providerSwitches,
      lastError: lastErrorRecord?.error || null,
      lastErrorTime: lastErrorRecord?.startTime ? new Date(lastErrorRecord.startTime).toLocaleString() : null,
    });
  }, [records, getStatistics, selectedProvider]);

  const successRate = stats.totalRequests > 0 
    ? Math.round((stats.successfulRequests / stats.totalRequests) * 100) 
    : 100;

  const healthStatus = successRate >= 90 ? 'healthy' : successRate >= 70 ? 'warning' : 'critical';

  const getHealthColor = () => {
    switch (healthStatus) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isArabic ? 'مراقبة الذكاء الاصطناعي' : 'AI Monitoring'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getHealthIcon()}
            <Badge variant={healthStatus === 'healthy' ? 'default' : healthStatus === 'warning' ? 'secondary' : 'destructive'}>
              {healthStatus === 'healthy' 
                ? (isArabic ? 'سليم' : 'Healthy')
                : healthStatus === 'warning'
                ? (isArabic ? 'تحذير' : 'Warning')
                : (isArabic ? 'حرج' : 'Critical')
              }
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
            <Server className="h-6 w-6 text-primary mb-1" />
            <span className="text-xs text-muted-foreground">
              {isArabic ? 'المزود الحالي' : 'Current Provider'}
            </span>
            <span className="font-semibold text-sm capitalize">
              {stats.currentProvider === 'lovable' ? 'Lovable AI' : 
               stats.currentProvider === 'openai' ? 'OpenAI' : 
               isArabic ? 'تلقائي' : 'Auto'}
            </span>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
            <Zap className="h-6 w-6 text-green-500 mb-1" />
            <span className="text-xs text-muted-foreground">
              {isArabic ? 'نسبة النجاح' : 'Success Rate'}
            </span>
            <span className={`font-semibold text-sm ${getHealthColor()}`}>
              {successRate}%
            </span>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
            <Clock className="h-6 w-6 text-blue-500 mb-1" />
            <span className="text-xs text-muted-foreground">
              {isArabic ? 'متوسط الوقت' : 'Avg Response'}
            </span>
            <span className="font-semibold text-sm">
              {Math.round(stats.averageResponseTime / 1000)}s
            </span>
          </div>
          
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-orange-500 mb-1" />
            <span className="text-xs text-muted-foreground">
              {isArabic ? 'حدود الاستخدام' : 'Rate Limits'}
            </span>
            <span className="font-semibold text-sm">
              {stats.rateLimitHits}
            </span>
          </div>
        </div>

        {/* Request Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isArabic ? 'إجمالي الطلبات' : 'Total Requests'}
            </span>
            <span className="font-medium">{stats.totalRequests}</span>
          </div>
          <Progress value={successRate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {stats.successfulRequests} {isArabic ? 'ناجح' : 'successful'}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              {stats.failedRequests} {isArabic ? 'فشل' : 'failed'}
            </span>
          </div>
        </div>

        {/* Provider Switches */}
        {stats.providerSwitches > 0 && (
          <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                {isArabic 
                  ? `تم التبديل بين المزودين ${stats.providerSwitches} مرة`
                  : `Provider switched ${stats.providerSwitches} times`
                }
              </span>
            </div>
          </div>
        )}

        {/* Last Error */}
        {stats.lastError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {isArabic ? 'آخر خطأ' : 'Last Error'}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1 break-words">
                  {stats.lastError.length > 100 
                    ? stats.lastError.substring(0, 100) + '...' 
                    : stats.lastError
                  }
                </p>
                {stats.lastErrorTime && (
                  <p className="text-xs text-red-500 mt-1">{stats.lastErrorTime}</p>
                )}
              </div>
              {onRetry && !isAnalyzing && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onRetry}
                  className="shrink-0 ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {isArabic ? 'إعادة' : 'Retry'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Real-time Status */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg animate-pulse">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-700 dark:text-blue-400">
              {isArabic ? 'جاري التحليل...' : 'Analyzing...'}
            </span>
          </div>
        )}

        {/* Recommendations */}
        {stats.rateLimitHits > 2 && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">
              {isArabic ? 'توصية' : 'Recommendation'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? 'لاحظنا تجاوزات متكررة للحد الأقصى. جرب تفعيل نظام الطابور للملفات الكبيرة.'
                : 'We noticed frequent rate limits. Try enabling job queue for large files.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
