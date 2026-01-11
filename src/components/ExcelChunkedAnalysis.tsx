import { useState, useCallback, useRef } from "react";
import { Layers, Play, Pause, CheckCircle, XCircle, Loader2, Settings, Zap, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { ExcelBOQItem } from "@/lib/excel-utils";

interface ExcelChunkedAnalysisProps {
  excelItems: ExcelBOQItem[];
  fileName: string;
  onAnalysisComplete: (result: any) => void;
  onCancel?: () => void;
}

interface ChunkProgress {
  totalChunks: number;
  processedChunks: number;
  currentChunk: number;
  status: 'idle' | 'chunking' | 'processing' | 'merging' | 'completed' | 'failed' | 'cancelled';
  percentage: number;
}

// Split Excel items into chunks
function splitItemsIntoChunks(items: ExcelBOQItem[], chunkSize: number): ExcelBOQItem[][] {
  const chunks: ExcelBOQItem[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

// Convert Excel items to text for analysis
function itemsToText(items: ExcelBOQItem[]): string {
  return items.map((item, index) => {
    const parts = [
      `${item.itemNo || index + 1}`,
      item.description || '',
      item.unit || '',
      item.quantity?.toString() || '',
      item.unitPrice?.toString() || '',
      item.totalPrice?.toString() || '',
    ];
    return parts.filter(Boolean).join(' | ');
  }).join('\n');
}

// Merge analysis results from chunks
function mergeChunkResults(results: any[]): any {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  const allItems: any[] = [];
  const seenItems = new Set<string>();

  for (const result of results) {
    if (result?.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        const key = `${item.itemNumber || item.item_number || ''}-${(item.description || '').slice(0, 50)}`;
        if (!seenItems.has(key)) {
          seenItems.add(key);
          allItems.push(item);
        }
      }
    }
  }

  const mergedSummary = {
    totalItems: allItems.length,
    totalValue: allItems.reduce((sum, item) => sum + (parseFloat(item.total || item.totalPrice) || 0), 0),
    categories: [...new Set(allItems.map(item => item.category).filter(Boolean))],
    currency: results[0]?.summary?.currency || 'SAR',
  };

  return {
    items: allItems,
    summary: mergedSummary,
    analysisDate: new Date().toISOString(),
    chunksProcessed: results.length,
  };
}

export function ExcelChunkedAnalysis({
  excelItems,
  fileName,
  onAnalysisComplete,
  onCancel,
}: ExcelChunkedAnalysisProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [chunkSize, setChunkSize] = useState(50); // Items per chunk
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const [progress, setProgress] = useState<ChunkProgress>({
    totalChunks: 0,
    processedChunks: 0,
    currentChunk: 0,
    status: 'idle',
    percentage: 0,
  });

  const estimatedChunks = Math.ceil(excelItems.length / chunkSize);
  const estimatedTime = Math.ceil(estimatedChunks * 12); // ~12 seconds per chunk

  const handleStartAnalysis = useCallback(async () => {
    if (isAnalyzing || excelItems.length === 0) return;

    // Reset cancel state
    cancelledRef.current = false;
    abortControllerRef.current = new AbortController();

    setIsAnalyzing(true);
    setError(null);
    setProgress({
      totalChunks: 0,
      processedChunks: 0,
      currentChunk: 0,
      status: 'chunking',
      percentage: 5,
    });

    try {
      // Split items into chunks
      const chunks = splitItemsIntoChunks(excelItems, chunkSize);
      
      setProgress({
        totalChunks: chunks.length,
        processedChunks: 0,
        currentChunk: 0,
        status: 'processing',
        percentage: 10,
      });

      toast({
        title: isArabic ? 'بدء التحليل المجزأ' : 'Starting Chunked Analysis',
        description: isArabic 
          ? `تقسيم ${excelItems.length} بند إلى ${chunks.length} أجزاء للتحليل`
          : `Splitting ${excelItems.length} items into ${chunks.length} chunks for analysis`,
      });

      const results: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        // Check if cancelled
        if (cancelledRef.current) {
          console.log('Chunked analysis cancelled by user');
          setProgress(prev => ({ ...prev, status: 'cancelled' }));
          toast({
            title: isArabic ? 'تم إلغاء التحليل' : 'Analysis Cancelled',
            description: isArabic 
              ? `تم تحليل ${results.length} أجزاء قبل الإلغاء`
              : `Processed ${results.length} chunks before cancellation`,
          });
          
          // Return partial results if any
          if (results.length > 0) {
            const partialResult = mergeChunkResults(results);
            onAnalysisComplete(partialResult);
          }
          return;
        }

        const chunkText = itemsToText(chunks[i]);
        
        setProgress(prev => ({
          ...prev,
          currentChunk: i + 1,
          percentage: 10 + Math.round((i / chunks.length) * 80),
        }));

        // Process chunk with retry logic and timeout
        let lastError: Error | null = null;
        let result = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          // Check if cancelled before each attempt
          if (cancelledRef.current) {
            console.log('Cancelled before attempt', attempt);
            break;
          }

          try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 30000); // 30s timeout
            });

            // Create the analysis promise
            const analysisPromise = supabase.functions.invoke('analyze-quotation', {
              body: {
                quotationText: chunkText,
                quotationName: `${fileName} - Chunk ${i + 1}/${chunks.length}`,
                isChunk: true,
                chunkIndex: i,
                totalChunks: chunks.length,
              },
            });

            // Race between analysis and timeout
            const { data, error: invokeError } = await Promise.race([
              analysisPromise,
              timeoutPromise.then(() => { throw new Error('Request timeout'); }),
            ]) as { data: any; error: any };

            // Check cancelled again after async operation
            if (cancelledRef.current) {
              console.log('Cancelled after fetch');
              break;
            }

            if (invokeError) throw invokeError;
            if (data?.error) throw new Error(data.error);

            result = data?.analysis || data;
            console.log(`Chunk ${i + 1} completed successfully`);
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`Chunk ${i + 1}, attempt ${attempt} failed:`, err.message);
            
            // Check if cancelled before waiting
            if (cancelledRef.current) break;
            
            // Check for rate limit or credits exhausted
            if (err.message?.includes('429') || err.message?.includes('rate limit')) {
              console.warn(`Rate limit hit on chunk ${i + 1}, attempt ${attempt}`);
              // Wait longer for rate limits
              await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
            } else if (err.message?.includes('timeout')) {
              // For timeouts, wait less and retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
          }
        }

        // Final check for cancellation
        if (cancelledRef.current) {
          console.log('Breaking out of loop due to cancellation');
          break;
        }

        if (result) {
          results.push(result);
        } else if (lastError) {
          console.warn(`Chunk ${i + 1} failed after all retries:`, lastError.message);
          // Don't fail entire process, continue with next chunk
        }

        setProgress(prev => ({
          ...prev,
          processedChunks: i + 1,
        }));
        
        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Final cancel check
      if (cancelledRef.current) {
        // Return partial results if any
        if (results.length > 0) {
          const partialResult = mergeChunkResults(results);
          onAnalysisComplete(partialResult);
          toast({
            title: isArabic ? 'تم إلغاء التحليل' : 'Analysis Cancelled',
            description: isArabic 
              ? `تم تحليل ${results.length} أجزاء قبل الإلغاء`
              : `Processed ${results.length} chunks before cancellation`,
          });
        }
        return;
      }

      // Merge results
      setProgress(prev => ({ ...prev, status: 'merging', percentage: 95 }));
      const mergedResult = mergeChunkResults(results);

      setProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));

      toast({
        title: isArabic ? 'اكتمل التحليل المجزأ' : 'Chunked Analysis Complete',
        description: isArabic
          ? `تم تحليل ${chunks.length} أجزاء واستخراج ${mergedResult?.items?.length || 0} بند`
          : `Analyzed ${chunks.length} chunks, extracted ${mergedResult?.items?.length || 0} items`,
      });

      onAnalysisComplete(mergedResult);
    } catch (err: any) {
      if (cancelledRef.current) return;
      
      console.error('Chunked analysis error:', err);
      setError(err.message || 'Analysis failed');
      setProgress(prev => ({ ...prev, status: 'failed' }));
      
      toast({
        title: isArabic ? 'فشل التحليل' : 'Analysis Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  }, [excelItems, chunkSize, fileName, isArabic, toast, onAnalysisComplete]);

  const handleCancel = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    setIsAnalyzing(false);
    setProgress(prev => ({ ...prev, status: 'cancelled' }));
    onCancel?.();
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-amber-500" />;
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
      chunking: isArabic ? 'جاري تقسيم البنود...' : 'Splitting items...',
      processing: isArabic 
        ? `تحليل الجزء ${progress.currentChunk} من ${progress.totalChunks}` 
        : `Processing chunk ${progress.currentChunk} of ${progress.totalChunks}`,
      merging: isArabic ? 'جاري دمج النتائج...' : 'Merging results...',
      completed: isArabic ? 'اكتمل التحليل' : 'Analysis complete',
      failed: isArabic ? 'فشل التحليل' : 'Analysis failed',
      cancelled: isArabic ? 'تم الإلغاء' : 'Cancelled',
    };
    return statusMap[progress.status];
  };

  // Only show for large Excel files
  if (excelItems.length < 30) return null;

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
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
            <p className="text-muted-foreground">{isArabic ? 'عدد البنود' : 'Total Items'}</p>
            <p className="font-bold text-lg">{excelItems.length}</p>
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
                <Label className="text-xs">{isArabic ? 'بنود لكل جزء' : 'Items per Chunk'}</Label>
                <span className="text-xs text-muted-foreground">{chunkSize} items</span>
              </div>
              <Slider
                value={[chunkSize]}
                onValueChange={([v]) => setChunkSize(v)}
                min={20}
                max={100}
                step={10}
                disabled={isAnalyzing}
              />
              <p className="text-xs text-muted-foreground">
                {isArabic 
                  ? 'أجزاء أصغر = أكثر دقة لكن أبطأ'
                  : 'Smaller chunks = more accurate but slower'}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex gap-2">
          {!isAnalyzing ? (
            <Button 
              onClick={handleStartAnalysis} 
              className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
              disabled={excelItems.length === 0}
            >
              <Zap className="w-4 h-4" />
              {isArabic ? 'بدء التحليل المجزأ بالذكاء الاصطناعي' : 'Start AI Chunked Analysis'}
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
