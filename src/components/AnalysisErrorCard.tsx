import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  WifiOff, 
  CreditCard, 
  Server, 
  HelpCircle,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export type AnalysisErrorType = 
  | 'rate_limit' 
  | 'timeout' 
  | 'network' 
  | 'credits_exhausted' 
  | 'server_error' 
  | 'unknown';

export interface AnalysisErrorInfo {
  type: AnalysisErrorType;
  message: string;
  errorCode?: string;
  details?: string;
  retryAfter?: number;
  timestamp: Date;
  provider?: string;
  attempts?: number;
}

interface AnalysisErrorCardProps {
  error: AnalysisErrorInfo;
  onRetry: () => void;
  onDismiss: () => void;
  onOpenSettings?: () => void;
  isRetrying?: boolean;
}

const ERROR_CONFIG: Record<AnalysisErrorType, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  rate_limit: {
    icon: Clock,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  timeout: {
    icon: AlertTriangle,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    borderClass: 'border-orange-200 dark:border-orange-800',
  },
  network: {
    icon: WifiOff,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
  },
  credits_exhausted: {
    icon: CreditCard,
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-200 dark:border-purple-800',
  },
  server_error: {
    icon: Server,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
  },
  unknown: {
    icon: HelpCircle,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
    borderClass: 'border-border',
  },
};

export function detectAnalysisErrorType(error: any): AnalysisErrorType {
  const message = String(error?.message || error || '').toLowerCase();
  const errorCode = String(error?.errorCode || '').toLowerCase();

  if (errorCode.includes('429') || message.includes('rate limit') || message.includes('429')) {
    return 'rate_limit';
  }
  if (errorCode.includes('402') || message.includes('credits') || message.includes('payment')) {
    return 'credits_exhausted';
  }
  if (message.includes('timeout') || message.includes('timed out') || message.includes('انتهت المهلة')) {
    return 'timeout';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('الشبكة')) {
    return 'network';
  }
  if (message.includes('500') || message.includes('server') || message.includes('internal')) {
    return 'server_error';
  }
  return 'unknown';
}

export function AnalysisErrorCard({
  error,
  onRetry,
  onDismiss,
  onOpenSettings,
  isRetrying = false,
}: AnalysisErrorCardProps) {
  const { isArabic } = useLanguage();
  const [countdown, setCountdown] = useState<number>(error.retryAfter || 0);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = ERROR_CONFIG[error.type];
  const Icon = config.icon;

  // Countdown timer for rate limit
  useEffect(() => {
    if (error.type === 'rate_limit' && error.retryAfter) {
      setCountdown(error.retryAfter);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [error.type, error.retryAfter]);

  const getTitle = () => {
    const titles: Record<AnalysisErrorType, { en: string; ar: string }> = {
      rate_limit: { en: 'Rate Limit Exceeded', ar: 'تجاوز حد الاستخدام' },
      timeout: { en: 'Request Timed Out', ar: 'انتهت مهلة الطلب' },
      network: { en: 'Connection Error', ar: 'خطأ في الاتصال' },
      credits_exhausted: { en: 'Credits Exhausted', ar: 'نفاد الرصيد' },
      server_error: { en: 'Server Error', ar: 'خطأ في الخادم' },
      unknown: { en: 'Analysis Failed', ar: 'فشل التحليل' },
    };
    return isArabic ? titles[error.type].ar : titles[error.type].en;
  };

  const getDescription = () => {
    const descriptions: Record<AnalysisErrorType, { en: string; ar: string }> = {
      rate_limit: {
        en: 'The AI service is temporarily busy. Too many requests were made in a short time.',
        ar: 'خدمة الذكاء الاصطناعي مشغولة مؤقتاً. تم إرسال طلبات كثيرة في وقت قصير.',
      },
      timeout: {
        en: 'The analysis took too long to complete. The file might be too large or complex.',
        ar: 'استغرق التحليل وقتاً طويلاً جداً. قد يكون الملف كبيراً أو معقداً.',
      },
      network: {
        en: 'Could not connect to the analysis service. Please check your internet connection.',
        ar: 'تعذر الاتصال بخدمة التحليل. يرجى التحقق من اتصال الإنترنت.',
      },
      credits_exhausted: {
        en: 'AI credits have been used up. Add more credits or configure your own API key.',
        ar: 'تم استهلاك رصيد الذكاء الاصطناعي. أضف رصيداً أو قم بإعداد مفتاح API خاص بك.',
      },
      server_error: {
        en: 'The analysis server encountered an unexpected error. Please try again.',
        ar: 'واجه خادم التحليل خطأً غير متوقع. يرجى المحاولة مرة أخرى.',
      },
      unknown: {
        en: 'An unexpected error occurred during analysis.',
        ar: 'حدث خطأ غير متوقع أثناء التحليل.',
      },
    };
    return isArabic ? descriptions[error.type].ar : descriptions[error.type].en;
  };

  const getSuggestions = (): string[] => {
    const suggestions: Record<AnalysisErrorType, { en: string[]; ar: string[] }> = {
      rate_limit: {
        en: [
          'Wait 30 seconds before retrying',
          'Enable "Job Queue" in settings for large files',
          'Try reducing the file size or splitting it into parts',
        ],
        ar: [
          'انتظر 30 ثانية قبل إعادة المحاولة',
          'فعّل "نظام الطابور" في الإعدادات للملفات الكبيرة',
          'حاول تقليل حجم الملف أو تقسيمه إلى أجزاء',
        ],
      },
      timeout: {
        en: [
          'Try enabling chunked analysis in settings',
          'Reduce the text length limit in analysis settings',
          'Split the file into smaller sections',
        ],
        ar: [
          'جرّب تفعيل التحليل المجزأ في الإعدادات',
          'قلل حد طول النص في إعدادات التحليل',
          'قسّم الملف إلى أقسام أصغر',
        ],
      },
      network: {
        en: [
          'Check your internet connection',
          'Disable VPN if you are using one',
          'Try refreshing the page and retry',
        ],
        ar: [
          'تحقق من اتصال الإنترنت',
          'أوقف VPN إذا كنت تستخدمه',
          'حاول تحديث الصفحة وأعد المحاولة',
        ],
      },
      credits_exhausted: {
        en: [
          'Add more AI credits to your account',
          'Configure your own OpenAI API key in settings',
          'Contact support for assistance',
        ],
        ar: [
          'أضف رصيداً للذكاء الاصطناعي لحسابك',
          'قم بإعداد مفتاح OpenAI API خاص بك في الإعدادات',
          'تواصل مع الدعم للمساعدة',
        ],
      },
      server_error: {
        en: [
          'Wait a moment and try again',
          'Try a different analysis approach',
          'Contact support if the issue persists',
        ],
        ar: [
          'انتظر لحظة ثم أعد المحاولة',
          'جرّب طريقة تحليل مختلفة',
          'تواصل مع الدعم إذا استمرت المشكلة',
        ],
      },
      unknown: {
        en: [
          'Try the analysis again',
          'Refresh the page and retry',
          'Check if the file format is correct (PDF or Excel)',
        ],
        ar: [
          'جرّب التحليل مرة أخرى',
          'حدّث الصفحة وأعد المحاولة',
          'تأكد من صحة تنسيق الملف (PDF أو Excel)',
        ],
      },
    };
    return isArabic ? suggestions[error.type].ar : suggestions[error.type].en;
  };

  const handleCopyDetails = async () => {
    const details = `
Error Type: ${error.type}
Error Code: ${error.errorCode || 'N/A'}
Message: ${error.message}
Provider: ${error.provider || 'N/A'}
Timestamp: ${error.timestamp.toISOString()}
Details: ${error.details || 'N/A'}
    `.trim();
    
    await navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canRetryNow = error.type !== 'rate_limit' || countdown === 0;
  const countdownProgress = error.retryAfter ? ((error.retryAfter - countdown) / error.retryAfter) * 100 : 100;

  return (
    <Card className={cn(
      'relative overflow-hidden border-2 transition-all duration-300',
      config.bgClass,
      config.borderClass
    )}>
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-60 hover:opacity-100"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3 pt-4">
        <CardTitle className={cn('flex items-center gap-3 text-lg', config.colorClass)}>
          <div className={cn('rounded-full p-2', config.bgClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <span>{getTitle()}</span>
          {error.errorCode && (
            <span className="text-xs font-normal text-muted-foreground">
              ({error.errorCode})
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {getDescription()}
        </p>

        {/* Countdown for rate limit */}
        {error.type === 'rate_limit' && countdown > 0 && (
          <div className="space-y-2 rounded-lg bg-background/60 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isArabic ? 'إعادة المحاولة خلال' : 'Retry available in'}
              </span>
              <span className={cn('font-mono font-semibold', config.colorClass)}>
                {countdown} {isArabic ? 'ثانية' : 's'}
              </span>
            </div>
            <Progress value={countdownProgress} className="h-2" />
          </div>
        )}

        {/* Suggestions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {isArabic ? 'الإجراءات المقترحة' : 'Recommended Actions'}
          </h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {getSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Technical details */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
              <span>{isArabic ? 'التفاصيل التقنية' : 'Technical Details'}</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs font-mono space-y-1">
              <div><span className="text-muted-foreground">Type:</span> {error.type}</div>
              <div><span className="text-muted-foreground">Code:</span> {error.errorCode || 'N/A'}</div>
              <div><span className="text-muted-foreground">Provider:</span> {error.provider || 'N/A'}</div>
              <div><span className="text-muted-foreground">Time:</span> {error.timestamp.toLocaleTimeString()}</div>
              {error.attempts && (
                <div><span className="text-muted-foreground">Attempts:</span> {error.attempts}</div>
              )}
              {error.details && (
                <div className="pt-1 border-t border-border mt-2">
                  <span className="text-muted-foreground">Details:</span>
                  <div className="mt-1 whitespace-pre-wrap break-all">{error.details}</div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleCopyDetails}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {isArabic ? 'تم النسخ' : 'Copied'}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    {isArabic ? 'نسخ التفاصيل' : 'Copy Details'}
                  </>
                )}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onOpenSettings && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onOpenSettings}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isArabic ? 'فتح الإعدادات' : 'Open Settings'}
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={onRetry}
            disabled={!canRetryNow || isRetrying}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {isArabic ? 'جاري المحاولة...' : 'Retrying...'}
              </>
            ) : countdown > 0 ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                {isArabic ? `انتظر ${countdown} ثانية` : `Wait ${countdown}s`}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isArabic ? 'إعادة المحاولة' : 'Retry Now'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
