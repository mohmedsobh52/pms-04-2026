import { useState, useEffect } from 'react';
import {
  Bot,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Activity,
  Zap,
  TrendingUp,
  Server,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLanguage } from '@/hooks/useLanguage';
import { useAnalysisTracking, type AIProvider } from '@/hooks/useAnalysisTracking';

export interface AnalysisStatusInfo {
  isAnalyzing: boolean;
  provider: 'lovable' | 'openai' | 'unknown';
  currentAttempt: number;
  maxAttempts: number;
  progress: number;
  startTime?: Date;
  lastError?: {
    type: 'rate_limit' | 'timeout' | 'network' | 'credits' | 'unknown';
    message: string;
    timestamp: Date;
  };
  chunksProcessed?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number; // in seconds
}

interface AnalysisStatusPanelProps {
  status: AnalysisStatusInfo;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function AnalysisStatusPanel({
  status,
  onRetry,
  onCancel,
  className = '',
}: AnalysisStatusPanelProps) {
  const { isArabic } = useLanguage();
  const { selectedProvider, getStatistics } = useAnalysisTracking();
  const [isOpen, setIsOpen] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second while analyzing
  useEffect(() => {
    if (!status.isAnalyzing || !status.startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - status.startTime!.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [status.isAnalyzing, status.startTime]);

  const stats = getStatistics();

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getProviderLabel = (provider: string): string => {
    if (provider === 'lovable') return 'Lovable AI';
    if (provider === 'openai') return 'OpenAI';
    return isArabic ? 'غير معروف' : 'Unknown';
  };

  const getProviderColor = (provider: string): string => {
    if (provider === 'lovable') return 'bg-purple-500';
    if (provider === 'openai') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getErrorTypeLabel = (type: string): { en: string; ar: string } => {
    switch (type) {
      case 'rate_limit':
        return { en: 'Rate Limit (429)', ar: 'حد الطلبات (429)' };
      case 'timeout':
        return { en: 'Request Timeout', ar: 'انتهاء المهلة' };
      case 'network':
        return { en: 'Network Error', ar: 'خطأ في الشبكة' };
      case 'credits':
        return { en: 'Credits Exhausted (402)', ar: 'نفاد الرصيد (402)' };
      default:
        return { en: 'Unknown Error', ar: 'خطأ غير معروف' };
    }
  };

  const getStatusIcon = () => {
    if (status.isAnalyzing) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    if (status.lastError) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = (): string => {
    if (status.isAnalyzing) {
      if (status.chunksProcessed !== undefined && status.totalChunks) {
        return isArabic
          ? `جاري التحليل... (${status.chunksProcessed}/${status.totalChunks} أجزاء)`
          : `Analyzing... (${status.chunksProcessed}/${status.totalChunks} chunks)`;
      }
      return isArabic ? 'جاري التحليل...' : 'Analyzing...';
    }
    if (status.lastError) {
      return isArabic ? 'فشل التحليل' : 'Analysis Failed';
    }
    return isArabic ? 'جاهز' : 'Ready';
  };

  // Don't show if not analyzing and no error
  if (!status.isAnalyzing && !status.lastError) {
    return null;
  }

  return (
    <Card className={`border-dashed ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3">
          <CollapsibleTrigger className="w-full">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span>{isArabic ? 'حالة التحليل' : 'Analysis Status'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getProviderColor(status.provider)} text-white text-xs`}>
                  {getProviderLabel(status.provider)}
                </Badge>
                {status.isAnalyzing && (
                  <Badge variant="outline" className="text-xs">
                    {status.progress}%
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Progress Bar */}
            {status.isAnalyzing && (
              <div className="space-y-2">
                <Progress value={status.progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{getStatusText()}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              </div>
            )}

            {/* Attempt Counter */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
                {isArabic ? 'المحاولات' : 'Attempts'}
              </span>
              <span className="font-medium">
                {status.currentAttempt} / {status.maxAttempts}
              </span>
            </div>

            {/* Provider Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Server className="h-4 w-4" />
                {isArabic ? 'المزوّد الحالي' : 'Current Provider'}
              </span>
              <Badge variant="secondary" className="text-xs">
                {getProviderLabel(status.provider)}
              </Badge>
            </div>

            {/* Estimated Time */}
            {status.estimatedTimeRemaining !== undefined && status.estimatedTimeRemaining > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {isArabic ? 'الوقت المتبقي' : 'Time Remaining'}
                </span>
                <span className="font-medium">
                  ~{formatTime(status.estimatedTimeRemaining)}
                </span>
              </div>
            )}

            {/* Error Display */}
            {status.lastError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {isArabic
                      ? getErrorTypeLabel(status.lastError.type).ar
                      : getErrorTypeLabel(status.lastError.type).en}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {status.lastError.message}
                </p>
                <p className="text-xs text-muted-foreground opacity-70">
                  {new Date(status.lastError.timestamp).toLocaleTimeString(
                    isArabic ? 'ar-SA' : 'en-US'
                  )}
                </p>
              </div>
            )}

            {/* Historical Stats */}
            {stats.totalAnalyses > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  {isArabic ? 'إحصائيات الجلسة' : 'Session Stats'}
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs text-center">
                  <div className="p-1.5 rounded bg-muted">
                    <div className="font-semibold">{stats.totalAnalyses}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {isArabic ? 'إجمالي' : 'Total'}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-green-500/10">
                    <div className="font-semibold text-green-600">
                      {stats.successRate.toFixed(0)}%
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {isArabic ? 'نجاح' : 'Success'}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-yellow-500/10">
                    <div className="font-semibold text-yellow-600">
                      {stats.fallbackRate.toFixed(0)}%
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {isArabic ? 'تبديل' : 'Fallback'}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-muted">
                    <div className="font-semibold">
                      {stats.averageDuration > 0
                        ? formatTime(Math.round(stats.averageDuration / 1000))
                        : '-'}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {isArabic ? 'متوسط' : 'Avg Time'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {status.lastError && onRetry && (
                <Button
                  onClick={onRetry}
                  size="sm"
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <Zap className="h-4 w-4" />
                  {isArabic ? 'إعادة المحاولة' : 'Smart Retry'}
                </Button>
              )}
              {status.isAnalyzing && onCancel && (
                <Button
                  onClick={onCancel}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Hook to manage analysis status
export function useAnalysisStatus() {
  const [status, setStatus] = useState<AnalysisStatusInfo>({
    isAnalyzing: false,
    provider: 'unknown',
    currentAttempt: 0,
    maxAttempts: 3,
    progress: 0,
  });

  const startAnalysis = (provider: 'lovable' | 'openai' | 'unknown' = 'unknown', maxAttempts = 3) => {
    setStatus({
      isAnalyzing: true,
      provider,
      currentAttempt: 1,
      maxAttempts,
      progress: 0,
      startTime: new Date(),
      lastError: undefined,
    });
  };

  const updateProgress = (progress: number, chunksProcessed?: number, totalChunks?: number) => {
    setStatus((prev) => ({
      ...prev,
      progress,
      chunksProcessed,
      totalChunks,
    }));
  };

  const updateProvider = (provider: 'lovable' | 'openai') => {
    setStatus((prev) => ({ ...prev, provider }));
  };

  const incrementAttempt = () => {
    setStatus((prev) => ({
      ...prev,
      currentAttempt: prev.currentAttempt + 1,
    }));
  };

  const setError = (
    type: 'rate_limit' | 'timeout' | 'network' | 'credits' | 'unknown',
    message: string
  ) => {
    setStatus((prev) => ({
      ...prev,
      isAnalyzing: false,
      lastError: {
        type,
        message,
        timestamp: new Date(),
      },
    }));
  };

  const completeAnalysis = () => {
    setStatus((prev) => ({
      ...prev,
      isAnalyzing: false,
      progress: 100,
      lastError: undefined,
    }));
  };

  const resetStatus = () => {
    setStatus({
      isAnalyzing: false,
      provider: 'unknown',
      currentAttempt: 0,
      maxAttempts: 3,
      progress: 0,
    });
  };

  return {
    status,
    startAnalysis,
    updateProgress,
    updateProvider,
    incrementAttempt,
    setError,
    completeAnalysis,
    resetStatus,
  };
}
