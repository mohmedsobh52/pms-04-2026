import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CachedUrl {
  url: string;
  expiresAt: number;
  bucket: string;
  filePath: string;
}

interface SignedUrlOptions {
  expiresIn?: number;        // Duration in seconds (default: 3600 = 1 hour)
  onExpiring?: () => void;   // Callback when URL is about to expire
  warningTime?: number;      // Time before expiry to trigger warning (default: 300 = 5 minutes)
  autoRefresh?: boolean;     // Automatically refresh when expired (default: true)
}

interface SignedUrlResult {
  url: string | null;
  expiresAt: Date | null;
  isExpiring: boolean;
  isExpired: boolean;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  timeRemaining: number | null;
}

// Extract file path from full URL or return as-is if already a path
export function extractFilePath(fileUrl: string, bucket: string): string {
  if (!fileUrl) return '';
  
  // Handle full URLs
  if (fileUrl.includes(`/${bucket}/`)) {
    const parts = fileUrl.split(`/${bucket}/`);
    const pathWithParams = parts[parts.length - 1];
    // Remove query params if present
    return decodeURIComponent(pathWithParams.split('?')[0]);
  }
  
  // Already a path
  return fileUrl;
}

export const useSignedUrl = () => {
  const [urlCache, setUrlCache] = useState<Map<string, CachedUrl>>(new Map());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const expiryWatchersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();

  // Cleanup watchers on unmount
  useEffect(() => {
    return () => {
      expiryWatchersRef.current.forEach(timer => clearTimeout(timer));
      expiryWatchersRef.current.clear();
    };
  }, []);

  const getCacheKey = (bucket: string, filePath: string) => `${bucket}/${filePath}`;

  const getSignedUrl = useCallback(async (
    bucket: string,
    filePath: string,
    options: SignedUrlOptions = {}
  ): Promise<SignedUrlResult> => {
    const {
      expiresIn = 3600,
      onExpiring,
      warningTime = 300,
      autoRefresh = true
    } = options;

    const cacheKey = getCacheKey(bucket, filePath);
    const now = Date.now();

    // Check cache first
    const cached = urlCache.get(cacheKey);
    if (cached && cached.expiresAt > now + (warningTime * 1000)) {
      const timeRemaining = Math.floor((cached.expiresAt - now) / 1000);
      return {
        url: cached.url,
        expiresAt: new Date(cached.expiresAt),
        isExpiring: timeRemaining < warningTime,
        isExpired: false,
        loading: false,
        error: null,
        refresh: async () => {
          await refreshUrl(bucket, filePath, options);
        },
        timeRemaining
      };
    }

    // Set loading state
    setLoadingKeys(prev => new Set(prev).add(cacheKey));
    setErrors(prev => {
      const next = new Map(prev);
      next.delete(cacheKey);
      return next;
    });

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;

      const expiresAt = now + (expiresIn * 1000);
      
      // Cache the URL
      setUrlCache(prev => new Map(prev).set(cacheKey, {
        url: data.signedUrl,
        expiresAt,
        bucket,
        filePath
      }));

      // Setup expiry watcher
      setupExpiryWatcher(cacheKey, expiresAt, {
        onExpiring,
        warningTime,
        autoRefresh,
        bucket,
        filePath,
        expiresIn
      });

      const timeRemaining = Math.floor(expiresIn);
      return {
        url: data.signedUrl,
        expiresAt: new Date(expiresAt),
        isExpiring: false,
        isExpired: false,
        loading: false,
        error: null,
        refresh: async () => {
          await refreshUrl(bucket, filePath, options);
        },
        timeRemaining
      };
    } catch (err) {
      const error = err as Error;
      setErrors(prev => new Map(prev).set(cacheKey, error));
      
      return {
        url: null,
        expiresAt: null,
        isExpiring: false,
        isExpired: true,
        loading: false,
        error,
        refresh: async () => {
          await refreshUrl(bucket, filePath, options);
        },
        timeRemaining: null
      };
    } finally {
      setLoadingKeys(prev => {
        const next = new Set(prev);
        next.delete(cacheKey);
        return next;
      });
    }
  }, [urlCache]);

  const setupExpiryWatcher = useCallback((
    cacheKey: string,
    expiresAt: number,
    options: {
      onExpiring?: () => void;
      warningTime: number;
      autoRefresh: boolean;
      bucket: string;
      filePath: string;
      expiresIn: number;
    }
  ) => {
    // Clear existing watcher
    const existingTimer = expiryWatchersRef.current.get(cacheKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const now = Date.now();
    const timeUntilWarning = expiresAt - now - (options.warningTime * 1000);

    if (timeUntilWarning > 0) {
      const timer = setTimeout(() => {
        // Trigger warning callback
        options.onExpiring?.();
        
        // Auto-refresh if enabled
        if (options.autoRefresh) {
          refreshUrl(options.bucket, options.filePath, {
            expiresIn: options.expiresIn,
            onExpiring: options.onExpiring,
            warningTime: options.warningTime,
            autoRefresh: options.autoRefresh
          });
        }
      }, timeUntilWarning);

      expiryWatchersRef.current.set(cacheKey, timer);
    }
  }, []);

  const refreshUrl = useCallback(async (
    bucket: string,
    filePath: string,
    options: SignedUrlOptions = {}
  ): Promise<SignedUrlResult> => {
    // Clear cache to force refresh
    const cacheKey = getCacheKey(bucket, filePath);
    setUrlCache(prev => {
      const next = new Map(prev);
      next.delete(cacheKey);
      return next;
    });

    // Get new signed URL
    return getSignedUrl(bucket, filePath, options);
  }, [getSignedUrl]);

  const clearCache = useCallback((bucket?: string, filePath?: string) => {
    if (bucket && filePath) {
      const cacheKey = getCacheKey(bucket, filePath);
      setUrlCache(prev => {
        const next = new Map(prev);
        next.delete(cacheKey);
        return next;
      });
      
      const timer = expiryWatchersRef.current.get(cacheKey);
      if (timer) {
        clearTimeout(timer);
        expiryWatchersRef.current.delete(cacheKey);
      }
    } else {
      setUrlCache(new Map());
      expiryWatchersRef.current.forEach(timer => clearTimeout(timer));
      expiryWatchersRef.current.clear();
    }
  }, []);

  const isLoading = useCallback((bucket: string, filePath: string): boolean => {
    return loadingKeys.has(getCacheKey(bucket, filePath));
  }, [loadingKeys]);

  const getError = useCallback((bucket: string, filePath: string): Error | null => {
    return errors.get(getCacheKey(bucket, filePath)) || null;
  }, [errors]);

  return { 
    getSignedUrl, 
    refreshUrl, 
    clearCache, 
    isLoading, 
    getError,
    extractFilePath 
  };
};
