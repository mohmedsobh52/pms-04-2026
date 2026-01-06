import { useState, useCallback, useRef, useEffect } from 'react';
import LZString from 'lz-string';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export interface ChunkProgress {
  totalChunks: number;
  processedChunks: number;
  currentChunk: number;
  status: 'idle' | 'chunking' | 'processing' | 'merging' | 'completed' | 'failed';
  percentage: number;
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
}

const DEFAULT_CHUNK_SIZE = 30000;
const DEFAULT_OVERLAP_SIZE = 500;

// Compress text using LZ-String
export function compressText(text: string): string {
  return LZString.compressToBase64(text);
}

// Decompress text
export function decompressText(compressed: string): string {
  return LZString.decompressFromBase64(compressed) || '';
}

// Split text into chunks with overlap
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

  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at a natural boundary (newline or period)
    if (end < text.length) {
      const searchStart = end - 200;
      const searchEnd = end + 200;
      const searchRange = text.slice(searchStart, Math.min(searchEnd, text.length));
      
      // Look for newline first
      const newlineIndex = searchRange.lastIndexOf('\n');
      if (newlineIndex !== -1) {
        end = searchStart + newlineIndex + 1;
      } else {
        // Look for period
        const periodIndex = searchRange.lastIndexOf('.');
        if (periodIndex !== -1) {
          end = searchStart + periodIndex + 1;
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
        if (!seenItems.has(key)) {
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

  // Process a single chunk
  const processChunk = async (
    chunk: string,
    chunkIndex: number,
    totalChunks: number,
    functionName: string,
    options: { useCompression?: boolean; maxRetries?: number } = {}
  ): Promise<any> => {
    const { useCompression = true, maxRetries = 3 } = options;
    
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
        return data;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  };

  // Chunked analysis (client-side processing)
  const analyzeWithChunks = useCallback(async (
    text: string,
    functionName: string = 'analyze-boq',
    options: ChunkedAnalysisOptions = {}
  ): Promise<any> => {
    const {
      chunkSize = DEFAULT_CHUNK_SIZE,
      overlapSize = DEFAULT_OVERLAP_SIZE,
      maxRetries = 3,
      useCompression = true,
    } = options;

    abortControllerRef.current = new AbortController();
    
    try {
      // Split into chunks
      setProgress({ totalChunks: 0, processedChunks: 0, currentChunk: 0, status: 'chunking', percentage: 5 });
      const chunks = splitIntoChunks(text, chunkSize, overlapSize);
      
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
          ? `تقسيم الملف إلى ${chunks.length} أجزاء للتحليل`
          : `Splitting file into ${chunks.length} chunks for analysis`,
      });

      // Process each chunk
      const results: any[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          throw new Error('Analysis cancelled');
        }

        setProgress(prev => ({
          ...prev,
          currentChunk: i + 1,
          percentage: 10 + Math.round((i / chunks.length) * 80),
        }));

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

        setProgress(prev => ({
          ...prev,
          processedChunks: i + 1,
        }));
      }

      // Merge results
      setProgress(prev => ({ ...prev, status: 'merging', percentage: 95 }));
      const mergedResult = mergeChunkResults(results);

      setProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));

      toast({
        title: isArabic ? 'اكتمل التحليل المجزأ' : 'Chunked Analysis Complete',
        description: isArabic
          ? `تم تحليل ${chunks.length} أجزاء ودمج النتائج`
          : `Analyzed ${chunks.length} chunks and merged results`,
      });

      return mergedResult;
    } catch (error: any) {
      setProgress(prev => ({ ...prev, status: 'failed' }));
      throw error;
    }
  }, [toast, isArabic]);

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
    subscribeToJob,
    cancelAnalysis,
    compressText,
    decompressText,
    splitIntoChunks,
    mergeChunkResults,
  };
}
