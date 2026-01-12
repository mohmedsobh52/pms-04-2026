import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { usePushNotifications } from './usePushNotifications';
import LZString from 'lz-string';

export interface EnhancedJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
  jobType: string;
  progressPercentage: number;
  currentStep: string;
  resultData: any;
  errorMessage: string | null;
  totalChunks: number;
  processedChunks: number;
  retryCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  fileName: string | null;
  estimatedTimeRemaining: number | null; // seconds
  processingSpeed: number | null; // chars/second
}

interface JobQueueOptions {
  maxConcurrentJobs?: number;
  retryLimit?: number;
  retryDelay?: number;
  priorityBoost?: boolean;
  enableRealtime?: boolean;
}

const DEFAULT_OPTIONS: JobQueueOptions = {
  maxConcurrentJobs: 3,
  retryLimit: 5,
  retryDelay: 2000,
  priorityBoost: true,
  enableRealtime: true,
};

export function useEnhancedJobQueue(options: JobQueueOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const { notifyJobStatus } = usePushNotifications();
  
  const [jobs, setJobs] = useState<EnhancedJob[]>([]);
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const realtimeChannelRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach(interval => clearInterval(interval));
      pollingRef.current.clear();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback((jobId: string, onUpdate: (job: EnhancedJob) => void) => {
    if (!opts.enableRealtime) return () => {};

    const channel = supabase
      .channel(`enhanced-job-${jobId}`)
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
          const job = mapDbToJob(data);
          onUpdate(job);
          
          // Update local state
          setJobs(prev => prev.map(j => j.id === job.id ? job : j));
          
          // Remove from active if completed or failed
          if (['completed', 'failed', 'cancelled'].includes(job.status)) {
            setActiveJobs(prev => prev.filter(id => id !== job.id));
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [opts.enableRealtime]);

  // Map database row to EnhancedJob
  const mapDbToJob = (data: any): EnhancedJob => {
    const processedAt = data.updated_at ? new Date(data.updated_at) : new Date();
    const startedAt = data.started_at ? new Date(data.started_at) : null;
    
    // Calculate processing speed and ETA
    let processingSpeed: number | null = null;
    let estimatedTimeRemaining: number | null = null;
    
    if (startedAt && data.processed_chunks > 0 && data.total_chunks > 0) {
      const elapsedMs = processedAt.getTime() - startedAt.getTime();
      const elapsedSeconds = elapsedMs / 1000;
      const chunksPerSecond = data.processed_chunks / elapsedSeconds;
      const remainingChunks = data.total_chunks - data.processed_chunks;
      
      processingSpeed = Math.round((data.input_text_length || 0) / elapsedSeconds);
      estimatedTimeRemaining = Math.round(remainingChunks / chunksPerSecond);
    }

    return {
      id: data.id,
      status: data.status,
      jobType: data.job_type,
      progressPercentage: data.progress_percentage || 0,
      currentStep: data.current_step || '',
      resultData: data.result_data,
      errorMessage: data.error_message,
      totalChunks: data.total_chunks || 1,
      processedChunks: data.processed_chunks || 0,
      retryCount: 0, // Track locally
      createdAt: data.created_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      fileName: data.file_name,
      estimatedTimeRemaining,
      processingSpeed,
    };
  };

  // Create a new job with enhanced options
  const createJob = useCallback(async (
    text: string,
    jobType: 'extract_items' | 'create_wbs' | 'full_analysis',
    fileName?: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: isArabic ? 'يجب تسجيل الدخول' : 'Login Required',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Compress text
      const compressedText = LZString.compressToBase64(text);
      
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
        .select('*')
        .single();

      if (error) throw error;

      const job = mapDbToJob(data);
      setJobs(prev => [job, ...prev]);
      
      // Notify
      notifyJobStatus('started', 0, fileName);
      
      toast({
        title: isArabic ? '✅ تم إنشاء مهمة التحليل' : '✅ Job Created',
        description: isArabic
          ? 'سيتم معالجة الملف في الخلفية'
          : 'File will be processed in background',
      });

      return data.id;
    } catch (error: any) {
      console.error('Failed to create job:', error);
      toast({
        title: isArabic ? 'فشل إنشاء المهمة' : 'Failed to Create Job',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, isArabic, notifyJobStatus]);

  // Start processing a job with retry logic
  const startJob = useCallback(async (
    jobId: string,
    onComplete?: (result: any) => void,
    onError?: (error: string) => void
  ) => {
    let retryCount = 0;
    
    const processWithRetry = async (): Promise<boolean> => {
      try {
        setActiveJobs(prev => [...prev.filter(id => id !== jobId), jobId]);
        setIsProcessing(true);

        // Invoke the processing function
        const { data, error } = await supabase.functions.invoke('process-analysis-job', {
          body: { jobId },
        });

        if (error) {
          // Check if retryable
          const isRetryable = error.message?.includes('rate') || 
                              error.message?.includes('timeout') ||
                              error.message?.includes('429');
          
          if (isRetryable && retryCount < (opts.retryLimit || 5)) {
            retryCount++;
            const delay = (opts.retryDelay || 2000) * Math.pow(1.5, retryCount);
            
            toast({
              title: isArabic ? `محاولة ${retryCount}/${opts.retryLimit}` : `Retry ${retryCount}/${opts.retryLimit}`,
              description: isArabic 
                ? `الانتظار ${Math.round(delay / 1000)} ثانية...`
                : `Waiting ${Math.round(delay / 1000)} seconds...`,
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return processWithRetry();
          }
          
          throw error;
        }

        return true;
      } catch (e: any) {
        console.error('Job processing failed:', e);
        onError?.(e.message || 'Unknown error');
        return false;
      }
    };

    // Setup realtime updates
    const unsubscribe = setupRealtimeSubscription(jobId, (job) => {
      if (job.status === 'completed') {
        setIsProcessing(false);
        notifyJobStatus('completed', 100, job.fileName || undefined);
        onComplete?.(job.resultData);
      } else if (job.status === 'failed') {
        setIsProcessing(false);
        notifyJobStatus('failed', job.progressPercentage, job.fileName || undefined);
        onError?.(job.errorMessage || 'Unknown error');
      } else if (job.status === 'processing') {
        notifyJobStatus('progress', job.progressPercentage, job.fileName || undefined);
      }
    });

    // Start processing
    await processWithRetry();

    return unsubscribe;
  }, [opts.retryLimit, opts.retryDelay, setupRealtimeSubscription, toast, isArabic, notifyJobStatus]);

  // Pause a job
  const pauseJob = useCallback(async (jobId: string) => {
    await supabase
      .from('analysis_jobs')
      .update({ status: 'paused' })
      .eq('id', jobId);
    
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'paused' as const } : j
    ));
  }, []);

  // Resume a job
  const resumeJob = useCallback(async (jobId: string) => {
    await supabase
      .from('analysis_jobs')
      .update({ status: 'pending' })
      .eq('id', jobId);
    
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'pending' as const } : j
    ));
  }, []);

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string) => {
    await supabase
      .from('analysis_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);
    
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'cancelled' as const } : j
    ));
    setActiveJobs(prev => prev.filter(id => id !== jobId));
    
    // Clear polling
    const interval = pollingRef.current.get(jobId);
    if (interval) {
      clearInterval(interval);
      pollingRef.current.delete(jobId);
    }
  }, []);

  // Get user's jobs
  const fetchJobs = useCallback(async (limit = 10) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch jobs:', error);
      return [];
    }

    const mappedJobs = data.map(mapDbToJob);
    setJobs(mappedJobs);
    return mappedJobs;
  }, []);

  // Get active job count
  const getActiveJobCount = useCallback(() => {
    return jobs.filter(j => ['pending', 'processing'].includes(j.status)).length;
  }, [jobs]);

  // Retry a failed job
  const retryJob = useCallback(async (jobId: string) => {
    await supabase
      .from('analysis_jobs')
      .update({ 
        status: 'pending',
        error_message: null,
        progress_percentage: 0,
        processed_chunks: 0,
      })
      .eq('id', jobId);
    
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'pending' as const, errorMessage: null, progressPercentage: 0 } : j
    ));
    
    toast({
      title: isArabic ? 'إعادة المحاولة' : 'Retrying',
      description: isArabic ? 'سيتم إعادة معالجة المهمة' : 'Job will be reprocessed',
    });
  }, [toast, isArabic]);

  return {
    jobs,
    activeJobs,
    isProcessing,
    createJob,
    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
    retryJob,
    fetchJobs,
    getActiveJobCount,
  };
}
