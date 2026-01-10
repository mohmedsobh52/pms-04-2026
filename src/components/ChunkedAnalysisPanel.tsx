import { useState, useEffect } from "react";
import { Layers, Play, Pause, CheckCircle, XCircle, Loader2, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useChunkedAnalysis, ChunkProgress, splitIntoChunks } from "@/hooks/useChunkedAnalysis";
import { useLanguage } from "@/hooks/useLanguage";

interface ChunkedAnalysisPanelProps {
  textContent: string;
  onAnalysisComplete: (result: any) => void;
  onCancel?: () => void;
  functionName?: string;
  autoStart?: boolean;
  minChunkSizeForAuto?: number; // Characters threshold for auto-chunking
}

export function ChunkedAnalysisPanel({
  textContent,
  onAnalysisComplete,
  onCancel,
  functionName = 'analyze-boq',
  autoStart = false,
  minChunkSizeForAuto = 50000,
}: ChunkedAnalysisPanelProps) {
  const { isArabic } = useLanguage();
  const { 
    progress, 
    analyzeWithChunks, 
    cancelAnalysis,
  } = useChunkedAnalysis();
  
  const [chunkSize, setChunkSize] = useState(30000);
  const [overlapSize, setOverlapSize] = useState(500);
  const [useCompression, setUseCompression] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [estimatedChunks, setEstimatedChunks] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Calculate estimated chunks when settings change
  useEffect(() => {
    if (textContent) {
      const chunks = splitIntoChunks(textContent, chunkSize, overlapSize);
      setEstimatedChunks(chunks.length);
    }
  }, [textContent, chunkSize, overlapSize]);

  // Auto-start if enabled and content is large enough
  useEffect(() => {
    if (autoStart && textContent.length >= minChunkSizeForAuto && !isAnalyzing) {
      handleStartAnalysis();
    }
  }, [autoStart, textContent, minChunkSizeForAuto]);

  const handleStartAnalysis = async () => {
    if (!textContent || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeWithChunks(textContent, functionName, {
        chunkSize,
        overlapSize,
        useCompression,
        maxRetries: 3,
      });
      
      onAnalysisComplete(result);
    } catch (err: any) {
      console.error('Chunked analysis failed:', err);
      setError(err.message || 'فشل في التحليل');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancel = () => {
    cancelAnalysis();
    setIsAnalyzing(false);
    onCancel?.();
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
      case 'chunking':
      case 'merging':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default:
        return <Layers className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    const statusMap: Record<ChunkProgress['status'], string> = {
      idle: isArabic ? 'جاهز للتحليل' : 'Ready to analyze',
      chunking: isArabic ? 'جاري تقسيم الملف...' : 'Splitting file...',
      processing: isArabic 
        ? `تحليل الجزء ${progress.currentChunk} من ${progress.totalChunks}` 
        : `Processing chunk ${progress.currentChunk} of ${progress.totalChunks}`,
      merging: isArabic ? 'جاري دمج النتائج...' : 'Merging results...',
      completed: isArabic ? 'اكتمل التحليل' : 'Analysis complete',
      failed: isArabic ? 'فشل التحليل' : 'Analysis failed',
    };
    return statusMap[progress.status];
  };

  const formatSize = (chars: number) => {
    if (chars < 1000) return `${chars} حرف`;
    if (chars < 1000000) return `${(chars / 1000).toFixed(1)}K`;
    return `${(chars / 1000000).toFixed(2)}M`;
  };

  const estimatedTime = Math.ceil(estimatedChunks * 15); // ~15 seconds per chunk

  const shouldShowPanel = textContent.length >= 20000 || isAnalyzing || progress.status !== 'idle';

  if (!shouldShowPanel) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>{isArabic ? 'التحليل المجزأ للملفات الكبيرة' : 'Chunked Analysis for Large Files'}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
              {getStatusText()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* File Info */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-background rounded-lg">
            <p className="text-muted-foreground">{isArabic ? 'حجم الملف' : 'File Size'}</p>
            <p className="font-bold text-lg">{formatSize(textContent.length)}</p>
          </div>
          <div className="text-center p-2 bg-background rounded-lg">
            <p className="text-muted-foreground">{isArabic ? 'الأجزاء' : 'Chunks'}</p>
            <p className="font-bold text-lg">{estimatedChunks}</p>
          </div>
          <div className="text-center p-2 bg-background rounded-lg">
            <p className="text-muted-foreground">{isArabic ? 'الوقت التقديري' : 'Est. Time'}</p>
            <p className="font-bold text-lg">~{estimatedTime}s</p>
          </div>
        </div>

        {/* Progress */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{isArabic ? 'التقدم' : 'Progress'}</span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
            {progress.totalChunks > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {isArabic 
                  ? `تم تحليل ${progress.processedChunks} من ${progress.totalChunks} أجزاء`
                  : `Processed ${progress.processedChunks} of ${progress.totalChunks} chunks`
                }
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Settings */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {isArabic ? 'إعدادات التحليل' : 'Analysis Settings'}
              </span>
              <span className="text-xs text-muted-foreground">
                {showSettings ? '▲' : '▼'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{isArabic ? 'حجم الجزء' : 'Chunk Size'}</Label>
                <span className="text-xs text-muted-foreground">{formatSize(chunkSize)}</span>
              </div>
              <Slider
                value={[chunkSize]}
                onValueChange={([v]) => setChunkSize(v)}
                min={10000}
                max={60000}
                step={5000}
                disabled={isAnalyzing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{isArabic ? 'التداخل' : 'Overlap'}</Label>
                <span className="text-xs text-muted-foreground">{overlapSize}</span>
              </div>
              <Slider
                value={[overlapSize]}
                onValueChange={([v]) => setOverlapSize(v)}
                min={100}
                max={2000}
                step={100}
                disabled={isAnalyzing}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">{isArabic ? 'ضغط البيانات' : 'Compression'}</Label>
              <Switch
                checked={useCompression}
                onCheckedChange={setUseCompression}
                disabled={isAnalyzing}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex gap-2">
          {!isAnalyzing ? (
            <Button 
              onClick={handleStartAnalysis} 
              className="flex-1 gap-2"
              disabled={!textContent}
            >
              <Play className="w-4 h-4" />
              {isArabic ? 'بدء التحليل المجزأ' : 'Start Chunked Analysis'}
            </Button>
          ) : (
            <Button 
              onClick={handleCancel} 
              variant="destructive" 
              className="flex-1 gap-2"
            >
              <Pause className="w-4 h-4" />
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
