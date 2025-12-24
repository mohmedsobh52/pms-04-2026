import { useState, useCallback, useEffect } from 'react';

const ITEM_CODES_STORAGE_KEY = 'boq_item_codes';

export interface ItemCode {
  itemNumber: string;
  code: string;
}

export function useItemCodes() {
  const [itemCodes, setItemCodes] = useState<Record<string, string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ITEM_CODES_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as Record<string, string>;
        }
      }
    } catch (e) {
      console.error('Error loading item codes from localStorage:', e);
    }
    return {};
  });

  // Save to localStorage whenever itemCodes changes
  useEffect(() => {
    try {
      localStorage.setItem(ITEM_CODES_STORAGE_KEY, JSON.stringify(itemCodes));
    } catch (e) {
      console.error('Error saving item codes to localStorage:', e);
    }
  }, [itemCodes]);

  const getItemCode = useCallback((itemNumber: string): string => {
    return itemCodes[itemNumber] || '';
  }, [itemCodes]);

  const setItemCode = useCallback((itemNumber: string, code: string) => {
    setItemCodes(prev => ({
      ...prev,
      [itemNumber]: code,
    }));
  }, []);

  const setMultipleItemCodes = useCallback((codes: Array<{ itemNumber: string; code: string }>) => {
    setItemCodes(prev => {
      const newCodes = { ...prev };
      codes.forEach(({ itemNumber, code }) => {
        newCodes[itemNumber] = code;
      });
      return newCodes;
    });
  }, []);

  const clearItemCode = useCallback((itemNumber: string) => {
    setItemCodes(prev => {
      const newCodes = { ...prev };
      delete newCodes[itemNumber];
      return newCodes;
    });
  }, []);

  const clearAllItemCodes = useCallback(() => {
    setItemCodes({});
    try {
      localStorage.removeItem(ITEM_CODES_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing item codes from localStorage:', e);
    }
  }, []);

  const getAllItemCodes = useCallback((): Record<string, string> => {
    return { ...itemCodes };
  }, [itemCodes]);

  const exportItemCodes = useCallback((): string => {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      itemCodes,
    }, null, 2);
  }, [itemCodes]);

  const importItemCodes = useCallback((jsonString: string): { success: boolean; count: number; error?: string } => {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.itemCodes || typeof data.itemCodes !== 'object') {
        return { success: false, count: 0, error: 'Invalid format: missing itemCodes object' };
      }
      
      const newCodes: Record<string, string> = {};
      let count = 0;
      
      Object.entries(data.itemCodes).forEach(([key, value]) => {
        if (typeof value === 'string') {
          newCodes[key] = value;
          count++;
        }
      });
      
      setItemCodes(prev => ({ ...prev, ...newCodes }));
      
      return { success: true, count };
    } catch (e) {
      return { success: false, count: 0, error: e instanceof Error ? e.message : 'Failed to parse JSON' };
    }
  }, []);

  return {
    itemCodes,
    getItemCode,
    setItemCode,
    setMultipleItemCodes,
    clearItemCode,
    clearAllItemCodes,
    getAllItemCodes,
    exportItemCodes,
    importItemCodes,
  };
}
