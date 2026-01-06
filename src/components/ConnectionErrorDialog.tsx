import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  WifiOff, 
  Clock, 
  Shield, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Copy,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useAnalysisTracking } from '@/hooks/useAnalysisTracking';

export type ErrorType = 'network' | 'timeout' | 'cors' | 'server' | 'unknown';

export interface ConnectionError {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: string;
  attempt: number;
  maxAttempts: number;
  functionName?: string;
}

interface ConnectionErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: ConnectionError | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

const ERROR_ICONS: Record<ErrorType, React.ReactNode> = {
  network: <WifiOff className="h-8 w-8" />,
  timeout: <Clock className="h-8 w-8" />,
  cors: <Shield className="h-8 w-8" />,
  server: <AlertTriangle className="h-8 w-8" />,
  unknown: <AlertTriangle className="h-8 w-8" />,
};

const ERROR_COLORS: Record<ErrorType, string> = {
  network: 'text-orange-500',
  timeout: 'text-yellow-500',
  cors: 'text-red-500',
  server: 'text-red-500',
  unknown: 'text-gray-500',
};

export function ConnectionErrorDialog({
  open,
  onOpenChange,
  error,
  onRetry,
  isRetrying = false,
}: ConnectionErrorDialogProps) {
  const { isArabic } = useLanguage();
  const { addRecord } = useAnalysisTracking();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  useEffect(() => {
    if (isRetrying && retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isRetrying, retryCountdown]);

  // Log error to tracking when dialog opens
  useEffect(() => {
    if (open && error) {
      addRecord({
        functionName: error.functionName || 'unknown',
        displayName: 'Connection Error',
        displayNameAr: 'خطأ في الاتصال',
        status: 'error',
        model: 'google/gemini-2.5-flash',
        startTime: error.timestamp,
        endTime: new Date().toISOString(),
        dataSource: 'ai',
        error: `${error.type}: ${error.message}`,
        details: error.details,
      });
    }
  }, [open, error]);

  const getErrorTitle = (type: ErrorType) => {
    const titles: Record<ErrorType, { en: string; ar: string }> = {
      network: { en: 'Network Connection Error', ar: 'خطأ في الاتصال بالشبكة' },
      timeout: { en: 'Request Timeout', ar: 'انتهت مهلة الطلب' },
      cors: { en: 'Access Denied (CORS)', ar: 'تم رفض الوصول (CORS)' },
      server: { en: 'Server Error', ar: 'خطأ في الخادم' },
      unknown: { en: 'Unknown Error', ar: 'خطأ غير معروف' },
    };
    return isArabic ? titles[type].ar : titles[type].en;
  };

  const getErrorDescription = (type: ErrorType) => {
    const descriptions: Record<ErrorType, { en: string; ar: string }> = {
      network: { 
        en: 'Unable to reach the server. Check your internet connection and try again.', 
        ar: 'تعذر الوصول إلى الخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.' 
      },
      timeout: { 
        en: 'The request took too long. This may be due to a large file or slow connection.', 
        ar: 'استغرق الطلب وقتاً طويلاً. قد يكون هذا بسبب ملف كبير أو اتصال بطيء.' 
      },
      cors: { 
        en: 'The server blocked this request. This is usually a temporary issue.', 
        ar: 'قام الخادم بحظر هذا الطلب. هذه عادة مشكلة مؤقتة.' 
      },
      server: { 
        en: 'The server encountered an error. Please try again later.', 
        ar: 'واجه الخادم خطأً. يرجى المحاولة لاحقاً.' 
      },
      unknown: { 
        en: 'An unexpected error occurred. Please try again.', 
        ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' 
      },
    };
    return isArabic ? descriptions[type].ar : descriptions[type].en;
  };

  const getSuggestions = (type: ErrorType) => {
    const suggestions: Record<ErrorType, { en: string[]; ar: string[] }> = {
      network: {
        en: [
          'Check your internet connection',
          'Try disabling VPN if active',
          'Refresh the page and try again',
        ],
        ar: [
          'تحقق من اتصالك بالإنترنت',
          'حاول تعطيل VPN إذا كان نشطاً',
          'قم بتحديث الصفحة وحاول مرة أخرى',
        ],
      },
      timeout: {
        en: [
          'Reduce the text size in Analysis Settings',
          'Split the document into smaller parts',
          'Try again - the server may be busy',
        ],
        ar: [
          'قلل حجم النص في إعدادات التحليل',
          'قسّم المستند إلى أجزاء أصغر',
          'حاول مرة أخرى - قد يكون الخادم مشغولاً',
        ],
      },
      cors: {
        en: [
          'This is usually temporary - try again',
          'Clear browser cache and cookies',
          'Try a different browser',
        ],
        ar: [
          'هذه مشكلة مؤقتة عادة - حاول مرة أخرى',
          'امسح ذاكرة التخزين المؤقت وملفات تعريف الارتباط',
          'جرب متصفح مختلف',
        ],
      },
      server: {
        en: [
          'Wait a few minutes and try again',
          'Reduce the file size',
          'Contact support if the issue persists',
        ],
        ar: [
          'انتظر بضع دقائق وحاول مرة أخرى',
          'قلل حجم الملف',
          'تواصل مع الدعم إذا استمرت المشكلة',
        ],
      },
      unknown: {
        en: [
          'Try again',
          'Refresh the page',
          'Contact support if the issue persists',
        ],
        ar: [
          'حاول مرة أخرى',
          'قم بتحديث الصفحة',
          'تواصل مع الدعم إذا استمرت المشكلة',
        ],
      },
    };
    return isArabic ? suggestions[type].ar : suggestions[type].en;
  };

  const copyErrorDetails = () => {
    if (!error) return;
    const details = `
Error Type: ${error.type}
Message: ${error.message}
Details: ${error.details || 'N/A'}
Timestamp: ${error.timestamp}
Attempt: ${error.attempt}/${error.maxAttempts}
Function: ${error.functionName || 'N/A'}
    `.trim();
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!error) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isArabic ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <div className={`flex items-center gap-3 ${ERROR_COLORS[error.type]}`}>
            {ERROR_ICONS[error.type]}
            <div>
              <DialogTitle>{getErrorTitle(error.type)}</DialogTitle>
              <DialogDescription className="mt-1">
                {getErrorDescription(error.type)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Attempt Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isArabic ? 'المحاولة' : 'Attempt'}
              </span>
              <span className="font-medium">
                {error.attempt} / {error.maxAttempts}
              </span>
            </div>
            <Progress value={(error.attempt / error.maxAttempts) * 100} className="h-2" />
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {isArabic ? 'اقتراحات:' : 'Suggestions:'}
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {getSuggestions(error.type).map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Error Details (Expandable) */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">
                {isArabic ? 'تفاصيل تقنية' : 'Technical Details'}
              </span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showDetails && (
              <div className="p-3 pt-0 space-y-2 text-xs font-mono bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{error.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message:</span>
                  <span className="text-right max-w-[200px] truncate">{error.message}</span>
                </div>
                {error.details && (
                  <div>
                    <span className="text-muted-foreground">Details:</span>
                    <p className="mt-1 p-2 bg-background rounded text-[10px] break-all">
                      {error.details}
                    </p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={copyErrorDetails}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied 
                    ? (isArabic ? 'تم النسخ' : 'Copied') 
                    : (isArabic ? 'نسخ التفاصيل' : 'Copy Details')}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {isArabic ? 'إغلاق' : 'Close'}
          </Button>
          <Button 
            className="flex-1 gap-2" 
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {isArabic ? 'جاري المحاولة...' : 'Retrying...'}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {isArabic ? 'إعادة المحاولة' : 'Retry'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to detect error type from error object
export function detectErrorType(error: any): ErrorType {
  const message = String(error?.message || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();

  if (name.includes('abort') || message.includes('timeout') || message.includes('aborted')) {
    return 'timeout';
  }
  if (message.includes('cors') || message.includes('access-control')) {
    return 'cors';
  }
  if (
    name.includes('fetcherror') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('functionsfetcherror')
  ) {
    return 'network';
  }
  if (message.includes('500') || message.includes('server')) {
    return 'server';
  }
  return 'unknown';
}
