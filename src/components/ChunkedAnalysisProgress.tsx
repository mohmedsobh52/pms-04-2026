import { Layers, Loader2, CheckCircle2, XCircle, Combine, FileText, RefreshCw, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import type { ChunkProgress, AnalysisJob } from '@/hooks/useChunkedAnalysis';

// Format countdown as MM:SS or Xs
const formatCountdown = (seconds: number): string => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
};

interface ChunkedAnalysisProgressProps {
  progress: ChunkProgress;
  job?: AnalysisJob | null;
  onCancel?: () => void;
  onResume?: (jobId: string) => void;
  showCard?: boolean;
}

export function ChunkedAnalysisProgress({
  progress,
  job,
  onCancel,
  onResume,
  showCard = true,
}: ChunkedAnalysisProgressProps) {
  const { isArabic } = useLanguage();

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'chunking':
        return <Layers className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'merging':
        return <Combine className="h-4 w-4 animate-pulse text-purple-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rate_limited':
        return <Loader2 className="h-4 w-4 animate-spin text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'chunking':
        return isArabic ? 'تقسيم الملف...' : 'Splitting file...';
      case 'processing':
        return progress.currentStep || (isArabic 
          ? `معالجة الجزء ${progress.currentChunk} من ${progress.totalChunks}`
          : `Processing chunk ${progress.currentChunk} of ${progress.totalChunks}`);
      case 'merging':
        return isArabic ? 'دمج النتائج...' : 'Merging results...';
      case 'completed':
        return isArabic ? 'اكتمل التحليل' : 'Analysis complete';
      case 'failed':
        return isArabic ? 'فشل التحليل' : 'Analysis failed';
      case 'rate_limited':
        return progress.waitingSeconds 
          ? (isArabic ? `انتظار ${progress.waitingSeconds} ثانية قبل إعادة المحاولة...` : `Waiting ${progress.waitingSeconds}s before retry...`)
          : (isArabic ? 'تجاوز حد الاستخدام...' : 'Rate limited...');
      default:
        return isArabic ? 'جاهز' : 'Ready';
    }
  };

  const getStatusBadgeVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (progress.status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
      case 'chunking':
      case 'merging':
      case 'rate_limited':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (progress.status === 'idle') {
    return null;
  }

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        <Badge variant={getStatusBadgeVariant()}>
          {progress.percentage}%
        </Badge>
      </div>

      <Progress value={progress.percentage} className="h-2" />

      {/* Visual Countdown for rate_limited status */}
      {progress.status === 'rate_limited' && progress.waitingSeconds !== undefined && progress.waitingSeconds > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">
                {isArabic ? 'انتظار قبل إعادة المحاولة' : 'Waiting before retry'}
              </span>
            </div>
            <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatCountdown(progress.waitingSeconds)}
            </span>
          </div>
          {progress.totalWaitSeconds && progress.totalWaitSeconds > 0 && (
            <Progress 
              value={((progress.totalWaitSeconds - progress.waitingSeconds) / progress.totalWaitSeconds) * 100} 
              className="h-2"
            />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {isArabic 
              ? 'سيتم استئناف المعالجة تلقائياً بعد انتهاء العداد'
              : 'Processing will resume automatically after countdown'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isArabic 
            ? `${progress.processedChunks} / ${progress.totalChunks} أجزاء`
            : `${progress.processedChunks} / ${progress.totalChunks} chunks`}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && progress.status === 'processing' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
          {onResume && job && progress.status === 'failed' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onResume(job.id)}
              className="gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              {isArabic ? 'استئناف' : 'Resume'}
            </Button>
          )}
        </div>
      </div>

      {/* Job Queue Status */}
      {job && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {isArabic ? 'معرف المهمة:' : 'Job ID:'}
            </span>
            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
              {job.id.slice(0, 8)}...
            </code>
          </div>
          {job.currentStep && (
            <div className="mt-1 text-xs text-muted-foreground">
              {job.currentStep}
            </div>
          )}
          {/* Resume button for failed jobs */}
          {onResume && job.status === 'failed' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onResume(job.id)}
              className="mt-2 w-full gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isArabic ? 'استئناف من آخر نقطة حفظ' : 'Resume from Last Checkpoint'}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-4 w-4" />
          {isArabic ? 'التحليل المجزأ' : 'Chunked Analysis'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}
