import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// Analysis status types
export type AnalysisStatus = 'pending' | 'success' | 'fallback' | 'error';
export type AIModel = 'google/gemini-2.5-flash' | 'google/gemini-2.5-pro' | 'openai/gpt-5' | 'openai/gpt-5-mini';

export interface AnalysisRecord {
  id: string;
  functionName: string;
  displayName: string;
  displayNameAr: string;
  status: AnalysisStatus;
  model: AIModel;
  startTime: string;
  endTime?: string;
  duration?: number;
  itemsAnalyzed?: number;
  dataSource: 'ai' | 'fallback' | 'cache';
  error?: string;
  confidence?: number;
  details?: string;
}

interface AnalysisTrackingContextType {
  records: AnalysisRecord[];
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  addRecord: (record: Omit<AnalysisRecord, 'id'>) => string;
  updateRecord: (id: string, updates: Partial<AnalysisRecord>) => void;
  clearRecords: () => void;
  getStatistics: () => AnalysisStatistics;
  getModelDisplayName: (model: AIModel) => string;
  getModelDisplayNameAr: (model: AIModel) => string;
}

export interface AnalysisStatistics {
  totalAnalyses: number;
  successCount: number;
  fallbackCount: number;
  errorCount: number;
  successRate: number;
  aiRate: number;
  fallbackRate: number;
  averageDuration: number;
  totalItemsAnalyzed: number;
  averageConfidence: number;
  byFunction: Record<string, {
    total: number;
    success: number;
    fallback: number;
    error: number;
  }>;
}

const MODEL_NAMES: Record<AIModel, { en: string; ar: string }> = {
  'google/gemini-2.5-flash': { en: 'Gemini 2.5 Flash', ar: 'جيميني 2.5 فلاش' },
  'google/gemini-2.5-pro': { en: 'Gemini 2.5 Pro', ar: 'جيميني 2.5 برو' },
  'openai/gpt-5': { en: 'GPT-5', ar: 'جي بي تي 5' },
  'openai/gpt-5-mini': { en: 'GPT-5 Mini', ar: 'جي بي تي 5 ميني' },
};

const STORAGE_KEY = 'analysis_tracking_records';
const MODEL_STORAGE_KEY = 'selected_ai_model';

const AnalysisTrackingContext = createContext<AnalysisTrackingContextType | undefined>(undefined);

export function AnalysisTrackingProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<AnalysisRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Keep only last 100 records
        return parsed.slice(-100);
      }
    } catch (e) {
      console.warn('Failed to load analysis records:', e);
    }
    return [];
  });

  const [selectedModel, setSelectedModelState] = useState<AIModel>(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored && MODEL_NAMES[stored as AIModel]) {
        return stored as AIModel;
      }
    } catch (e) {
      console.warn('Failed to load selected model:', e);
    }
    return 'google/gemini-2.5-flash';
  });

  // Save records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-100)));
    } catch (e) {
      console.warn('Failed to save analysis records:', e);
    }
  }, [records]);

  const setSelectedModel = useCallback((model: AIModel) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, model);
    } catch (e) {
      console.warn('Failed to save selected model:', e);
    }
  }, []);

  const addRecord = useCallback((record: Omit<AnalysisRecord, 'id'>): string => {
    const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRecords(prev => [...prev, { ...record, id }]);
    return id;
  }, []);

  const updateRecord = useCallback((id: string, updates: Partial<AnalysisRecord>) => {
    setRecords(prev => prev.map(record => 
      record.id === id ? { ...record, ...updates } : record
    ));
  }, []);

  const clearRecords = useCallback(() => {
    setRecords([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear analysis records:', e);
    }
  }, []);

  const getStatistics = useCallback((): AnalysisStatistics => {
    const totalAnalyses = records.length;
    const successCount = records.filter(r => r.status === 'success').length;
    const fallbackCount = records.filter(r => r.status === 'fallback').length;
    const errorCount = records.filter(r => r.status === 'error').length;
    
    const aiCount = records.filter(r => r.dataSource === 'ai').length;
    const completedDurations = records.filter(r => r.duration).map(r => r.duration!);
    const averageDuration = completedDurations.length > 0 
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length 
      : 0;
    
    const totalItemsAnalyzed = records
      .filter(r => r.itemsAnalyzed)
      .reduce((sum, r) => sum + (r.itemsAnalyzed || 0), 0);
    
    const confidenceScores = records.filter(r => r.confidence).map(r => r.confidence!);
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    // Group by function
    const byFunction: Record<string, { total: number; success: number; fallback: number; error: number }> = {};
    records.forEach(record => {
      if (!byFunction[record.functionName]) {
        byFunction[record.functionName] = { total: 0, success: 0, fallback: 0, error: 0 };
      }
      byFunction[record.functionName].total++;
      if (record.status === 'success') byFunction[record.functionName].success++;
      if (record.status === 'fallback') byFunction[record.functionName].fallback++;
      if (record.status === 'error') byFunction[record.functionName].error++;
    });

    return {
      totalAnalyses,
      successCount,
      fallbackCount,
      errorCount,
      successRate: totalAnalyses > 0 ? (successCount / totalAnalyses) * 100 : 0,
      aiRate: totalAnalyses > 0 ? (aiCount / totalAnalyses) * 100 : 0,
      fallbackRate: totalAnalyses > 0 ? (fallbackCount / totalAnalyses) * 100 : 0,
      averageDuration,
      totalItemsAnalyzed,
      averageConfidence,
      byFunction,
    };
  }, [records]);

  const getModelDisplayName = useCallback((model: AIModel): string => {
    return MODEL_NAMES[model]?.en || model;
  }, []);

  const getModelDisplayNameAr = useCallback((model: AIModel): string => {
    return MODEL_NAMES[model]?.ar || model;
  }, []);

  return (
    <AnalysisTrackingContext.Provider
      value={{
        records,
        selectedModel,
        setSelectedModel,
        addRecord,
        updateRecord,
        clearRecords,
        getStatistics,
        getModelDisplayName,
        getModelDisplayNameAr,
      }}
    >
      {children}
    </AnalysisTrackingContext.Provider>
  );
}

export function useAnalysisTracking() {
  const context = useContext(AnalysisTrackingContext);
  if (context === undefined) {
    throw new Error('useAnalysisTracking must be used within an AnalysisTrackingProvider');
  }
  return context;
}

// Helper hook for tracking a single analysis
export function useTrackAnalysis(functionName: string, displayName: string, displayNameAr: string) {
  const { addRecord, updateRecord, selectedModel } = useAnalysisTracking();
  
  const startTracking = useCallback((itemCount?: number) => {
    return addRecord({
      functionName,
      displayName,
      displayNameAr,
      status: 'pending',
      model: selectedModel,
      startTime: new Date().toISOString(),
      itemsAnalyzed: itemCount,
      dataSource: 'ai',
    });
  }, [addRecord, functionName, displayName, displayNameAr, selectedModel]);

  const completeTracking = useCallback((
    id: string, 
    success: boolean, 
    isFallback: boolean = false,
    details?: {
      itemsAnalyzed?: number;
      confidence?: number;
      error?: string;
      details?: string;
    }
  ) => {
    const endTime = new Date().toISOString();
    updateRecord(id, {
      status: success ? (isFallback ? 'fallback' : 'success') : 'error',
      endTime,
      duration: Date.now() - new Date(id.split('_')[1]).getTime(),
      dataSource: isFallback ? 'fallback' : 'ai',
      ...details,
    });
  }, [updateRecord]);

  return { startTracking, completeTracking, selectedModel };
}
