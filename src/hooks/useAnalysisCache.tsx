import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

// Generate a hash for cache key from text content
const generateTextHash = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.slice(0, 10000)); // Use first 10K chars for hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
};

// Local storage cache with TTL
interface CacheEntry {
  hash: string;
  result: any;
  timestamp: number;
  fileName?: string;
  textLength: number;
}

const CACHE_KEY = 'boq_analysis_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_ENTRIES = 20;

export interface AnalysisCacheStats {
  totalEntries: number;
  cacheHits: number;
  cacheMisses: number;
  lastCleanup: string | null;
  cacheSize: string;
}

export function useAnalysisCache() {
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState<AnalysisCacheStats>({
    totalEntries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastCleanup: null,
    cacheSize: '0 KB',
  });

  // Load cache from localStorage
  const loadCache = useCallback((): CacheEntry[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      const entries = JSON.parse(cached) as CacheEntry[];
      // Filter out expired entries
      const now = Date.now();
      return entries.filter(e => (now - e.timestamp) < CACHE_TTL_MS);
    } catch {
      return [];
    }
  }, []);

  // Save cache to localStorage
  const saveCache = useCallback((entries: CacheEntry[]) => {
    try {
      // Keep only the most recent entries
      const sorted = entries.sort((a, b) => b.timestamp - a.timestamp);
      const trimmed = sorted.slice(0, MAX_CACHE_ENTRIES);
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
      
      // Update stats
      const size = new Blob([JSON.stringify(trimmed)]).size;
      setStats(prev => ({
        ...prev,
        totalEntries: trimmed.length,
        cacheSize: size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`,
      }));
    } catch (e) {
      console.warn('Failed to save cache:', e);
    }
  }, []);

  // Get cached result
  const getCachedResult = useCallback(async (text: string, fileName?: string): Promise<any | null> => {
    try {
      const hash = await generateTextHash(text);
      const cache = loadCache();
      
      // Find matching entry
      const entry = cache.find(e => 
        e.hash === hash && 
        Math.abs(e.textLength - text.length) < 100 // Allow small text length difference
      );
      
      if (entry) {
        console.log('Cache HIT for hash:', hash.slice(0, 8));
        setStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
        
        toast({
          title: isArabic ? '✅ نتيجة من الذاكرة المؤقتة' : '✅ Cached Result',
          description: isArabic 
            ? 'تم تحميل النتيجة من الذاكرة المؤقتة (أسرع)'
            : 'Result loaded from cache (faster)',
        });
        
        return entry.result;
      }
      
      console.log('Cache MISS for hash:', hash.slice(0, 8));
      setStats(prev => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
      return null;
    } catch (e) {
      console.warn('Cache lookup failed:', e);
      return null;
    }
  }, [loadCache, toast, isArabic]);

  // Save result to cache
  const cacheResult = useCallback(async (text: string, result: any, fileName?: string) => {
    try {
      const hash = await generateTextHash(text);
      const cache = loadCache();
      
      // Remove existing entry with same hash
      const filtered = cache.filter(e => e.hash !== hash);
      
      // Add new entry
      filtered.unshift({
        hash,
        result,
        timestamp: Date.now(),
        fileName,
        textLength: text.length,
      });
      
      saveCache(filtered);
      console.log('Cached result with hash:', hash.slice(0, 8));
    } catch (e) {
      console.warn('Failed to cache result:', e);
    }
  }, [loadCache, saveCache]);

  // Clear all cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setStats({
      totalEntries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastCleanup: new Date().toISOString(),
      cacheSize: '0 KB',
    });
    
    toast({
      title: isArabic ? 'تم مسح الذاكرة المؤقتة' : 'Cache Cleared',
      description: isArabic ? 'تم حذف جميع النتائج المخزنة' : 'All cached results deleted',
    });
  }, [toast, isArabic]);

  // Initialize stats on mount
  useEffect(() => {
    const cache = loadCache();
    const size = new Blob([JSON.stringify(cache)]).size;
    setStats(prev => ({
      ...prev,
      totalEntries: cache.length,
      cacheSize: size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`,
    }));
  }, [loadCache]);

  return {
    getCachedResult,
    cacheResult,
    clearCache,
    stats,
  };
}
