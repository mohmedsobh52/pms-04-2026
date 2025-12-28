import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface AnalysisContextType {
  analysisData: any;
  wbsData: any;
  extractedText: string;
  selectedFile: File | null;
  setAnalysisData: (data: any) => void;
  setWbsData: (data: any) => void;
  setExtractedText: (text: string) => void;
  setSelectedFile: (file: File | null) => void;
  clearAll: () => void;
  hasData: boolean;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const STORAGE_KEY = 'boq_analysis_session';

interface StoredData {
  analysisData: any;
  wbsData: any;
  extractedText: string;
  fileName?: string;
  savedAt: string;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisData, setAnalysisDataState] = useState<any>(null);
  const [wbsData, setWbsDataState] = useState<any>(null);
  const [extractedText, setExtractedTextState] = useState<string>('');
  const [selectedFile, setSelectedFileState] = useState<File | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredData = JSON.parse(stored);
        // Check if data is recent (within last 24 hours)
        const savedAt = new Date(data.savedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          if (data.analysisData) setAnalysisDataState(data.analysisData);
          if (data.wbsData) setWbsDataState(data.wbsData);
          if (data.extractedText) setExtractedTextState(data.extractedText);
        } else {
          // Clear old data
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load analysis data from session:', error);
    }
  }, []);

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    if (analysisData || wbsData || extractedText) {
      try {
        const dataToStore: StoredData = {
          analysisData,
          wbsData,
          extractedText,
          fileName: selectedFile?.name,
          savedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      } catch (error) {
        console.warn('Failed to save analysis data to session:', error);
      }
    }
  }, [analysisData, wbsData, extractedText, selectedFile]);

  const setAnalysisData = useCallback((data: any) => {
    setAnalysisDataState(data);
  }, []);

  const setWbsData = useCallback((data: any) => {
    setWbsDataState(data);
  }, []);

  const setExtractedText = useCallback((text: string) => {
    setExtractedTextState(text);
  }, []);

  const setSelectedFile = useCallback((file: File | null) => {
    setSelectedFileState(file);
  }, []);

  const clearAll = useCallback(() => {
    setAnalysisDataState(null);
    setWbsDataState(null);
    setExtractedTextState('');
    setSelectedFileState(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasData = Boolean(analysisData || wbsData || extractedText);

  return (
    <AnalysisContext.Provider
      value={{
        analysisData,
        wbsData,
        extractedText,
        selectedFile,
        setAnalysisData,
        setWbsData,
        setExtractedText,
        setSelectedFile,
        clearAll,
        hasData,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisData() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysisData must be used within an AnalysisProvider');
  }
  return context;
}
