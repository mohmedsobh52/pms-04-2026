import { useState, useCallback, useRef, useEffect } from 'react';
import LZString from 'lz-string';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export interface ChunkProgress {
  totalChunks: number;
  processedChunks: number;
  currentChunk: number;
  status: 'idle' | 'chunking' | 'processing' | 'merging' | 'completed' | 'failed' | 'rate_limited' | 'auto_resizing';
  percentage: number;
  waitingSeconds?: number;
  totalWaitSeconds?: number;
  currentStep?: string;
  autoResizeCount?: number;
  currentChunkSize?: number;
}

export interface AnalysisJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  jobType: string;
  progressPercentage: number;
  currentStep: string;
  resultData: any;
  errorMessage: string | null;
  totalChunks: number;
  processedChunks: number;
}

interface ChunkedAnalysisOptions {
  chunkSize?: number; // Characters per chunk (default: 30000)
  overlapSize?: number; // Overlap between chunks (default: 500)
  maxRetries?: number;
  useCompression?: boolean;
  useJobQueue?: boolean;
  // Throttle options
  enableThrottle?: boolean;
  maxRequestsPerMinute?: number;
  delayBetweenChunks?: number; // in seconds
  // Arabic optimization
  arabicOptimization?: boolean;
  arabicChunkSize?: number;
  // Auto-resize options - NEW
  enableAutoResize?: boolean;
  minChunkSize?: number; // Minimum chunk size (default: 5000)
  resizeReductionFactor?: number; // Reduction factor (default: 0.6 = 60%)
  maxResizeAttempts?: number; // Max resize attempts per chunk (default: 3)
}

const DEFAULT_CHUNK_SIZE = 30000;
const DEFAULT_OVERLAP_SIZE = 500;
const DEFAULT_MIN_CHUNK_SIZE = 5000;
const DEFAULT_RESIZE_FACTOR = 0.6;
const DEFAULT_MAX_RESIZE_ATTEMPTS = 3;

// Strong exponential backoff: 30s, 60s, 120s, 120s, 120s
const BACKOFF_SCHEDULE = [30000, 60000, 120000, 120000, 120000];

// Detect truncated AI response
function detectTruncatedResponse(content: any): boolean {
  if (!content) return false;
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  
  const openBraces = (str.match(/\{/g) || []).length;
  const closeBraces = (str.match(/\}/g) || []).length;
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;
  
  // If significant imbalance, response is likely truncated
  return (openBraces - closeBraces) > 2 || (openBrackets - closeBrackets) > 1;
}

const getBackoffDelay = (attempt: number, retryAfter?: number): number => {
  if (retryAfter && retryAfter > 0) {
    return retryAfter * 1000;
  }
  return BACKOFF_SCHEDULE[Math.min(attempt - 1, BACKOFF_SCHEDULE.length - 1)];
};

// Compress text using LZ-String
export function compressText(text: string): string {
  return LZString.compressToBase64(text);
}

// Decompress text
export function decompressText(compressed: string): string {
  return LZString.decompressFromBase64(compressed) || '';
}

// Detect if text is primarily Arabic
const isArabicText = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const arabicCount = (text.match(arabicPattern) || []).length;
  return arabicCount > text.length * 0.3;
};

// Split text into chunks with overlap, respecting Arabic punctuation
export function splitIntoChunks(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlapSize: number = DEFAULT_OVERLAP_SIZE
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;
  const isArabic = isArabicText(text);

  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at a natural boundary
    if (end < text.length) {
      const searchStart = end - 300;
      const searchEnd = Math.min(end + 300, text.length);
      const searchRange = text.slice(searchStart, searchEnd);
      
      // Look for newline first
      const newlineIndex = searchRange.lastIndexOf('\n');
      if (newlineIndex !== -1) {
        end = searchStart + newlineIndex + 1;
      } else {
        // Look for period or Arabic punctuation
        const periodIndex = searchRange.lastIndexOf('.');
        const arabicSemiIndex = searchRange.lastIndexOf('؛');
        const arabicCommaIndex = searchRange.lastIndexOf('،');
        
        const bestBreak = Math.max(
          periodIndex,
          isArabic ? Math.max(arabicSemiIndex, arabicCommaIndex) : -1
        );
        
        if (bestBreak !== -1) {
          end = searchStart + bestBreak + 1;
        }
      }
    }

    chunks.push(text.slice(start, end));
    start = end - overlapSize; // Overlap with previous chunk
    
    if (start >= text.length) break;
  }

  return chunks;
}

// Merge analysis results from multiple chunks
export function mergeChunkResults(results: any[]): any {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  // Merge items arrays
  const allItems: any[] = [];
  const seenItems = new Set<string>();
  
  for (const result of results) {
    if (result?.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        // Create a unique key for deduplication
        const key = `${item.itemNumber || ''}-${item.description?.slice(0, 50) || ''}`;
        if (!seenItems.has(key) && (item.itemNumber || item.description)) {
          seenItems.add(key);
          allItems.push(item);
        }
      }
    }
  }

  // Merge summary
  const mergedSummary = {
    totalItems: allItems.length,
    totalValue: allItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0),
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

export function useChunkedAnalysis() {
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const [progress, setProgress] = useState<ChunkProgress>({
    totalChunks: 0,
    processedChunks: 0,
    currentChunk: 0,
    status: 'idle',
    percentage: 0,
  });
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Throttle tracking - NEW
  const requestCountRef = useRef<number>(0);
  const minuteStartRef = useRef<number>(Date.now());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  // Cancel current analysis
  const cancelAnalysis = useCallback(() => {
    abortControllerRef.current?.abort();
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setProgress(prev => ({ ...prev, status: 'idle' }));
    setCurrentJob(null);
  }, []);

  // Process a single chunk with strong retry logic
  const processChunk = async (
    chunk: string,
    chunkIndex: number,
    totalChunks: number,
    functionName: string,
    options: { useCompression?: boolean; maxRetries?: number } = {}
  ): Promise<any> => {
    const { useCompression = true, maxRetries = 5 } = options; // Default 5 retries
    
    const payload = useCompression
      ? { boqTextCompressed: compressText(chunk), isCompressed: true }
      : { boqText: chunk };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: {
            ...payload,
            analysisType: 'extract_items',
            chunkIndex,
            totalChunks,
            generate_schedule: false,
          },
        });

        if (error) throw error;

        // Edge function may return ok:false with statusCode to avoid non-2xx crashes.
        if (data?.ok === false) {
          const retryAfter = data?.retryAfter;
          const msg = data?.suggestion || data?.error || 'Analysis failed';
          const err2 = new Error(msg) as any;
          err2.errorCode = data?.errorCode;
          err2.retryAfter = retryAfter;
          err2.statusCode = data?.statusCode;
          throw err2;
        }

        return data;
      } catch (err: any) {
        lastError = err;
        
        const isRateLimit =
          String(err?.message || '').includes('429') ||
          err?.errorCode === 'RATE_LIMIT_429' ||
          err?.statusCode === 429;

        const isServerError = err?.statusCode >= 500;
        const isTimeout = err?.name === 'AbortError' || String(err?.message || '').includes('timeout');

        if ((isRateLimit || isServerError || isTimeout) && attempt < maxRetries) {
          const delay = getBackoffDelay(attempt, err?.retryAfter);
          const totalWaitSecs = Math.ceil(delay / 1000);
          
          // Update progress with waiting status and total wait time
          setProgress(prev => ({
            ...prev,
            status: 'rate_limited',
            waitingSeconds: totalWaitSecs,
            totalWaitSeconds: totalWaitSecs,
            currentStep: isArabic 
              ? `انتظار ${totalWaitSecs} ثانية قبل إعادة المحاولة...`
              : `Waiting ${totalWaitSecs}s before retry...`,
          }));

          // Countdown timer for visual feedback
          const countdownInterval = setInterval(() => {
            setProgress(prev => {
              const newWaiting = (prev.waitingSeconds || 1) - 1;
              if (newWaiting <= 0) {
                clearInterval(countdownInterval);
                return prev;
              }
              return { ...prev, waitingSeconds: newWaiting };
            });
          }, 1000);

          await new Promise(resolve => setTimeout(resolve, delay));
          clearInterval(countdownInterval);
          
          // Reset status back to processing
          setProgress(prev => ({
            ...prev,
            status: 'processing',
            waitingSeconds: undefined,
            totalWaitSeconds: undefined,
            currentStep: undefined,
          }));
        }
      }
    }

    throw lastError;
  };

  // Process chunk with auto-resize on truncation
  const processChunkWithAutoResize = async (
    chunk: string,
    chunkIndex: number,
    totalChunks: number,
    functionName: string,
    options: {
      useCompression?: boolean;
      maxRetries?: number;
      currentChunkSize: number;
      minChunkSize: number;
      resizeFactor: number;
      maxResizeAttempts: number;
      resizeCount?: number;
    }
  ): Promise<any[]> => {
    const { currentChunkSize, minChunkSize, resizeFactor, maxResizeAttempts, resizeCount = 0 } = options;
    
    try {
      const result = await processChunk(chunk, chunkIndex, totalChunks, functionName, options);
      
      // Check if response is truncated
      const isTruncated = result?.partial === true || detectTruncatedResponse(result);
      
      if (isTruncated && currentChunkSize > minChunkSize && resizeCount < maxResizeAttempts) {
        console.log(`Chunk ${chunkIndex + 1} appears truncated, attempting auto-resize...`);
        throw new Error('TRUNCATED_RESPONSE');
      }
      
      return result ? [result.analysisResult || result] : [];
    } catch (err: any) {
      const isTruncationError = 
        err.message === 'TRUNCATED_RESPONSE' ||
        err.message?.includes('JSON') ||
        err.message?.includes('parse') ||
        err.message?.includes('Unexpected end');
      
      // Auto-resize if truncation detected and we can reduce size
      if (isTruncationError && currentChunkSize > minChunkSize && resizeCount < maxResizeAttempts) {
        const newChunkSize = Math.max(minChunkSize, Math.floor(currentChunkSize * resizeFactor));
        
        console.log(`Auto-resizing chunk from ${currentChunkSize} to ${newChunkSize} chars`);
        
        setProgress(prev => ({
          ...prev,
          status: 'auto_resizing',
          autoResizeCount: (prev.autoResizeCount || 0) + 1,
          currentChunkSize: newChunkSize,
          currentStep: isArabic
            ? `تقليل تلقائي: ${currentChunkSize} → ${newChunkSize} حرف`
            : `Auto-resizing: ${currentChunkSize} → ${newChunkSize} chars`,
        }));
        
        toast({
          title: isArabic ? 'تقليل تلقائي للحجم' : 'Auto-resizing',
          description: isArabic
            ? `تم تقليل حجم القطعة من ${currentChunkSize} إلى ${newChunkSize} حرف`
            : `Reduced chunk size from ${currentChunkSize} to ${newChunkSize} chars`,
        });
        
        // Split this chunk into smaller sub-chunks
        const subChunks = splitIntoChunks(chunk, newChunkSize, 200);
        const subResults: any[] = [];
        
        for (let j = 0; j < subChunks.length; j++) {
          setProgress(prev => ({
            ...prev,
            currentStep: isArabic
              ? `معالجة القطعة الفرعية ${j + 1}/${subChunks.length}...`
              : `Processing sub-chunk ${j + 1}/${subChunks.length}...`,
          }));
          
          const subResult = await processChunkWithAutoResize(
            subChunks[j],
            chunkIndex,
            totalChunks,
            functionName,
            { ...options, currentChunkSize: newChunkSize, resizeCount: resizeCount + 1 }
          );
          
          subResults.push(...subResult);
          
          // Small delay between sub-chunks
          if (j < subChunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        return subResults;
      }
      
      // Re-throw if we can't handle it
      throw err;
    }
  };

  // Chunked analysis (client-side processing) with strong retry, throttle, and auto-resize
  const analyzeWithChunks = useCallback(async (
    text: string,
    functionName: string = 'analyze-boq',
    options: ChunkedAnalysisOptions = {}
  ): Promise<any> => {
    const {
      chunkSize: baseChunkSize = DEFAULT_CHUNK_SIZE,
      overlapSize = DEFAULT_OVERLAP_SIZE,
      maxRetries = 5,
      useCompression = true,
      // Throttle options
      enableThrottle = true,
      maxRequestsPerMinute = 3,
      delayBetweenChunks = 5,
      // Arabic optimization
      arabicOptimization = true,
      arabicChunkSize = 15000,
      // Auto-resize options - NEW
      enableAutoResize = true,
      minChunkSize = DEFAULT_MIN_CHUNK_SIZE,
      resizeReductionFactor = DEFAULT_RESIZE_FACTOR,
      maxResizeAttempts = DEFAULT_MAX_RESIZE_ATTEMPTS,
    } = options;

    // Detect if content is Arabic and adjust chunk size
    const contentIsArabic = isArabicText(text);
    const chunkSize = (arabicOptimization && contentIsArabic) 
      ? Math.min(arabicChunkSize, baseChunkSize) 
      : baseChunkSize;

    // Reset throttle tracking
    requestCountRef.current = 0;
    minuteStartRef.current = Date.now();
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Split into chunks
      setProgress({ 
        totalChunks: 0, 
        processedChunks: 0, 
        currentChunk: 0, 
        status: 'chunking', 
        percentage: 5,
        autoResizeCount: 0,
        currentChunkSize: chunkSize,
      });
      const chunks = splitIntoChunks(text, chunkSize, overlapSize);
      
      setProgress({
        totalChunks: chunks.length,
        processedChunks: 0,
        currentChunk: 0,
        status: 'processing',
        percentage: 10,
        autoResizeCount: 0,
        currentChunkSize: chunkSize,
      });

      toast({
        title: isArabic ? 'بدء التحليل المجزأ' : 'Starting Chunked Analysis',
        description: isArabic 
          ? `تقسيم الملف إلى ${chunks.length} أجزاء للتحليل${contentIsArabic ? ' (تحسين عربي مفعّل)' : ''}${enableAutoResize ? ' مع تقليل تلقائي' : ''}`
          : `Splitting file into ${chunks.length} chunks for analysis${contentIsArabic ? ' (Arabic optimization enabled)' : ''}${enableAutoResize ? ' with auto-resize' : ''}`,
      });

      // Process each chunk with throttle and auto-resize support
      const results: any[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Analysis cancelled');
        }

        // Throttle check
        if (enableThrottle) {
          const now = Date.now();
          const elapsedMs = now - minuteStartRef.current;
          
          if (elapsedMs >= 60000) {
            requestCountRef.current = 0;
            minuteStartRef.current = now;
          }
          
          if (requestCountRef.current >= maxRequestsPerMinute) {
            const waitTime = 60000 - elapsedMs;
            const waitSecs = Math.ceil(waitTime / 1000);
            
            setProgress(prev => ({
              ...prev,
              status: 'rate_limited',
              waitingSeconds: waitSecs,
              totalWaitSeconds: waitSecs,
              currentStep: isArabic 
                ? `انتظار ${waitSecs} ثانية (تحديد السرعة)...`
                : `Waiting ${waitSecs}s (throttle limit)...`,
            }));
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            requestCountRef.current = 0;
            minuteStartRef.current = Date.now();
            
            setProgress(prev => ({
              ...prev,
              status: 'processing',
              waitingSeconds: undefined,
              totalWaitSeconds: undefined,
            }));
          }
        }

        setProgress(prev => ({
          ...prev,
          currentChunk: i + 1,
          percentage: 10 + Math.round((i / chunks.length) * 80),
          currentStep: isArabic
            ? `معالجة القطعة ${i + 1} من ${chunks.length}...`
            : `Processing chunk ${i + 1} of ${chunks.length}...`,
        }));

        try {
          requestCountRef.current++;
          
          if (enableAutoResize) {
            // Use auto-resize processing
            const chunkResults = await processChunkWithAutoResize(
              chunks[i],
              i,
              chunks.length,
              functionName,
              {
                useCompression,
                maxRetries,
                currentChunkSize: chunkSize,
                minChunkSize,
                resizeFactor: resizeReductionFactor,
                maxResizeAttempts,
              }
            );
            results.push(...chunkResults);
          } else {
            // Standard processing
            const result = await processChunk(
              chunks[i],
              i,
              chunks.length,
              functionName,
              { useCompression, maxRetries }
            );

            if (result?.analysisResult || result?.items) {
              results.push(result.analysisResult || result);
            }
          }
        } catch (chunkErr: any) {
          console.warn(`Chunk ${i + 1} failed after all retries:`, chunkErr);
          // Continue to next chunk instead of failing completely
        }

        setProgress(prev => ({
          ...prev,
          processedChunks: i + 1,
          status: 'processing',
        }));

        // Delay between chunks
        if (enableThrottle && i < chunks.length - 1) {
          const delayMs = delayBetweenChunks * 1000;
          setProgress(prev => ({
            ...prev,
            currentStep: isArabic
              ? `انتظار ${delayBetweenChunks} ثانية قبل القطعة التالية...`
              : `Waiting ${delayBetweenChunks}s before next chunk...`,
          }));
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (results.length === 0) {
        throw new Error(isArabic 
          ? 'فشل تحليل جميع الأجزاء. يرجى المحاولة مرة أخرى.'
          : 'All chunks failed to analyze. Please try again.');
      }

      // Merge results
      setProgress(prev => ({ ...prev, status: 'merging', percentage: 95 }));
      const mergedResult = mergeChunkResults(results);

      setProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));

      const autoResizeMsg = progress.autoResizeCount && progress.autoResizeCount > 0
        ? (isArabic ? ` (تقليل تلقائي ${progress.autoResizeCount} مرات)` : ` (auto-resized ${progress.autoResizeCount} times)`)
        : '';

      toast({
        title: isArabic ? 'اكتمل التحليل المجزأ' : 'Chunked Analysis Complete',
        description: isArabic
          ? `تم تحليل ${results.length}/${chunks.length} أجزاء ودمج النتائج${autoResizeMsg}`
          : `Analyzed ${results.length}/${chunks.length} chunks and merged results${autoResizeMsg}`,
      });

      return mergedResult;
    } catch (error: any) {
      setProgress(prev => ({ ...prev, status: 'failed' }));
      throw error;
    }
  }, [toast, isArabic, progress.autoResizeCount]);

  // Create a job in the queue (for very large files)
  const createAnalysisJob = useCallback(async (
    text: string,
    jobType: 'extract_items' | 'create_wbs' | 'full_analysis',
    fileName?: string
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: isArabic ? 'يجب تسجيل الدخول' : 'Login Required',
        description: isArabic ? 'يرجى تسجيل الدخول لاستخدام التحليل الخلفي' : 'Please login to use background analysis',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const compressedText = compressText(text);
      
      const { data, error } = await supabase
        .from('analysis_jobs')
        .insert({
          user_id: user.id,
          job_type: jobType,
          input_text_compressed: compressedText,
          input_text_length: text.length,
          file_name: fileName,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: isArabic ? 'تم إنشاء مهمة التحليل' : 'Analysis Job Created',
        description: isArabic
          ? 'سيتم معالجة الملف في الخلفية'
          : 'File will be processed in the background',
      });

      return data.id;
    } catch (error: any) {
      console.error('Failed to create analysis job:', error);
      toast({
        title: isArabic ? 'فشل إنشاء المهمة' : 'Failed to Create Job',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, isArabic]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string): Promise<AnalysisJob | null> => {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Failed to poll job status:', error);
      return null;
    }

    const job: AnalysisJob = {
      id: data.id,
      status: data.status as AnalysisJob['status'],
      jobType: data.job_type,
      progressPercentage: data.progress_percentage ?? 0,
      currentStep: data.current_step || '',
      resultData: data.result_data,
      errorMessage: data.error_message,
      totalChunks: data.total_chunks ?? 1,
      processedChunks: data.processed_chunks ?? 0,
    };

    setCurrentJob(job);
    return job;
  }, []);

  // Start polling for job updates
  const startPolling = useCallback((
    jobId: string,
    onComplete: (result: any) => void,
    onError: (error: string) => void,
    intervalMs: number = 2000
  ) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const poll = async () => {
      const job = await pollJobStatus(jobId);
      if (!job) return;

      if (job.status === 'completed') {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        onComplete(job.resultData);
      } else if (job.status === 'failed') {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        onError(job.errorMessage || 'Unknown error');
      }
    };

    // Poll immediately, then at interval
    poll();
    pollingIntervalRef.current = setInterval(poll, intervalMs);
  }, [pollJobStatus]);

  // Resume a failed job
  const resumeJob = useCallback(async (
    jobId: string,
    onComplete: (result: any) => void,
    onError: (error: string) => void
  ) => {
    try {
      toast({
        title: isArabic ? 'استئناف المهمة' : 'Resuming Job',
        description: isArabic ? 'جاري استئناف المهمة من آخر نقطة...' : 'Resuming job from last checkpoint...',
      });

      // Kick off resume processing
      const { error } = await supabase.functions.invoke('process-analysis-job', {
        body: { jobId, resume: true },
      });

      if (error) throw error;

      // Start polling for updates
      startPolling(jobId, onComplete, onError);
    } catch (err: any) {
      console.error('Failed to resume job:', err);
      onError(err.message || 'Failed to resume job');
    }
  }, [toast, isArabic, startPolling]);

  // Subscribe to realtime job updates
  const subscribeToJob = useCallback((
    jobId: string,
    onUpdate: (job: AnalysisJob) => void
  ) => {
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const data = payload.new as any;
          const job: AnalysisJob = {
            id: data.id,
            status: data.status,
            jobType: data.job_type,
            progressPercentage: data.progress_percentage,
            currentStep: data.current_step || '',
            resultData: data.result_data,
            errorMessage: data.error_message,
            totalChunks: data.total_chunks,
            processedChunks: data.processed_chunks,
          };
          setCurrentJob(job);
          onUpdate(job);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    progress,
    currentJob,
    analyzeWithChunks,
    createAnalysisJob,
    pollJobStatus,
    startPolling,
    resumeJob,
    subscribeToJob,
    cancelAnalysis,
    compressText,
    decompressText,
    splitIntoChunks,
    mergeChunkResults,
  };
}
