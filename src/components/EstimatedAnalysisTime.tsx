import { Clock, Zap, SplitSquareVertical } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface EstimatedAnalysisTimeProps {
  textLength: number; // in characters
  isAutoChunking: boolean;
  chunkSize?: number; // in thousands
  isProcessing?: boolean;
  currentBatch?: number;
  totalBatches?: number;
}

// Estimate analysis time based on text length
// Base: ~30 seconds per 50K characters, with overhead for AI processing
function estimateTime(textLength: number, isAutoChunking: boolean, chunkSize: number = 30): {
  seconds: number;
  batches: number;
  perBatchSeconds: number;
} {
  const charsPerBatch = chunkSize * 1000;
  const batches = isAutoChunking ? Math.ceil(textLength / charsPerBatch) : 1;
  
  // Base processing time: ~25-40 seconds per batch
  const perBatchSeconds = Math.min(60, Math.max(25, textLength / 2500));
  
  // Add overhead for merging results if chunked
  const mergeOverhead = batches > 1 ? 5 * (batches - 1) : 0;
  
  const totalSeconds = (perBatchSeconds * batches) + mergeOverhead;
  
  return {
    seconds: Math.round(totalSeconds),
    batches,
    perBatchSeconds: Math.round(perBatchSeconds),
  };
}

export function EstimatedAnalysisTime({
  textLength,
  isAutoChunking,
  chunkSize = 30,
  isProcessing = false,
  currentBatch = 0,
  totalBatches = 0,
}: EstimatedAnalysisTimeProps) {
  const { isArabic, t } = useLanguage();
  
  if (textLength < 1000) return null;
  
  const estimate = estimateTime(textLength, isAutoChunking, chunkSize);
  const fileSizeKB = Math.round(textLength / 1024);
  const isLargeFile = textLength > 100000; // > 100K chars
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} ${t('seconds')}`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 
      ? `${mins} ${t('minutes')} ${secs} ${t('seconds')}`
      : `${mins} ${t('minutes')}`;
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header with estimated time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t('estimatedTime')}
          </span>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          {formatTime(estimate.seconds)}
        </Badge>
      </div>
      
      {/* File size info */}
      <div className="text-xs text-muted-foreground">
        {isArabic 
          ? `حجم النص: ${fileSizeKB} KB (~${Math.round(textLength / 1000)}K حرف)`
          : `Text size: ${fileSizeKB} KB (~${Math.round(textLength / 1000)}K chars)`}
      </div>
      
      {/* Auto-chunking indicator */}
      {isLargeFile && isAutoChunking && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <SplitSquareVertical className="h-4 w-4" />
          <span>
            {t('autoChunkingEnabled')} - {estimate.batches} {isArabic ? 'دفعة' : 'batches'}
          </span>
        </div>
      )}
      
      {/* Processing progress */}
      {isProcessing && totalBatches > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>{t('batchProgress')}</span>
            <span>{currentBatch}/{totalBatches}</span>
          </div>
          <Progress value={(currentBatch / totalBatches) * 100} className="h-2" />
        </div>
      )}
      
      {/* Time breakdown for chunked analysis */}
      {!isProcessing && estimate.batches > 1 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>{isArabic ? 'وقت كل دفعة:' : 'Per batch:'}</span>
            <span>~{formatTime(estimate.perBatchSeconds)}</span>
          </div>
          <div className="flex justify-between">
            <span>{isArabic ? 'عدد الدفعات:' : 'Total batches:'}</span>
            <span>{estimate.batches}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { estimateTime };
