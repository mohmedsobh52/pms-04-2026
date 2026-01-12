import { Layers, Loader2, CheckCircle2, XCircle, Combine, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import type { ChunkProgress, AnalysisJob } from '@/hooks/useChunkedAnalysis';

interface ChunkedAnalysisProgressProps {
  progress: ChunkProgress;
  job?: AnalysisJob | null;
  onCancel?: () => void;
  showCard?: boolean;
}

export function ChunkedAnalysisProgress({
  progress,
  job,
  onCancel,
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

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isArabic 
            ? `${progress.processedChunks} / ${progress.totalChunks} أجزاء`
            : `${progress.processedChunks} / ${progress.totalChunks} chunks`}
        </span>
        {onCancel && progress.status === 'processing' && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
        )}
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
