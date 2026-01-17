import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const AUTO_SAVE_KEY = "boq_auto_save_data";
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds - quick auto-save
const DEBOUNCE_DELAY = 1500; // 1.5 seconds debounce for immediate changes

export interface AutoSaveData {
  analysisData: any;
  wbsData?: any;
  fileName?: string;
  itemCosts?: Record<string, any>;
  lastSaved: string;
}

export function useAutoSave(
  analysisData: any,
  wbsData?: any,
  fileName?: string,
  itemCosts?: Record<string, any>
) {
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const previousDataRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if data has changed
  const checkForChanges = useCallback(() => {
    const currentData = JSON.stringify({ analysisData, wbsData, itemCosts });
    if (currentData !== previousDataRef.current) {
      setHasUnsavedChanges(true);
      return true;
    }
    return false;
  }, [analysisData, wbsData, itemCosts]);

  // Save data to localStorage
  const saveData = useCallback((showNotification = false) => {
    if (!analysisData) return;

    try {
      setIsSaving(true);
      const saveData: AutoSaveData = {
        analysisData,
        wbsData,
        fileName,
        itemCosts,
        lastSaved: new Date().toISOString(),
      };

      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
      previousDataRef.current = JSON.stringify({ analysisData, wbsData, itemCosts });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setIsSaving(false);

      // Show notification only when requested (manual save or significant changes)
      if (showNotification) {
        toast({
          title: isArabic ? "تم الحفظ تلقائياً" : "Auto-saved",
          description: isArabic 
            ? `تم حفظ التغييرات في ${new Date().toLocaleTimeString("ar-EG")}`
            : `Changes saved at ${new Date().toLocaleTimeString()}`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Auto-save error:", error);
      setIsSaving(false);
    }
  }, [analysisData, wbsData, fileName, itemCosts, toast, isArabic]);

  // Load saved data
  const loadSavedData = useCallback((): AutoSaveData | null => {
    try {
      const stored = localStorage.getItem(AUTO_SAVE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading auto-saved data:", error);
    }
    return null;
  }, []);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setHasUnsavedChanges(false);
  }, []);

  // Manual save trigger
  const triggerSave = useCallback(() => {
    if (checkForChanges()) {
      saveData(true); // Show notification for manual saves
    }
  }, [checkForChanges, saveData]);

  // Debounced save - triggers after any change with short delay
  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      if (checkForChanges()) {
        saveData(false); // Silent save
      }
    }, DEBOUNCE_DELAY);
  }, [checkForChanges, saveData]);

  // Watch for data changes and trigger debounced save
  useEffect(() => {
    if (!analysisData) return;
    
    const currentData = JSON.stringify({ analysisData, wbsData, itemCosts });
    if (currentData !== previousDataRef.current && previousDataRef.current !== "") {
      setHasUnsavedChanges(true);
      debouncedSave();
    }
    
    // Initialize on first load
    if (previousDataRef.current === "") {
      previousDataRef.current = currentData;
    }
  }, [analysisData, wbsData, itemCosts, debouncedSave]);

  // Backup auto-save on interval (for safety)
  useEffect(() => {
    if (!analysisData) return;

    saveTimeoutRef.current = setInterval(() => {
      if (checkForChanges()) {
        saveData(false);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [analysisData, checkForChanges, saveData]);

  // Save on component unmount
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        saveData(false);
      }
    };
  }, [hasUnsavedChanges, saveData]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        saveData(false);
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, saveData]);

  return {
    lastSaved,
    hasUnsavedChanges,
    isSaving,
    triggerSave,
    loadSavedData,
    clearSavedData,
  };
}
