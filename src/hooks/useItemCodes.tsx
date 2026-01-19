import { useState, useCallback, useEffect } from 'react';
import { XLSX } from '@/lib/exceljs-utils';

const ITEM_CODES_STORAGE_KEY = 'boq_item_codes';
const CODE_FORMAT_STORAGE_KEY = 'boq_code_format';

export interface ItemCode {
  itemNumber: string;
  code: string;
}

export type CodeFormat = 'IC' | 'BOQ' | 'ITEM' | 'WBS' | 'ACT' | 'CUSTOM';

export interface CodeFormatConfig {
  prefix: string;
  digits: number;
  separator: string;
}

const DEFAULT_FORMAT_CONFIGS: Record<CodeFormat, CodeFormatConfig> = {
  IC: { prefix: 'IC', digits: 4, separator: '-' },
  BOQ: { prefix: 'BOQ', digits: 3, separator: '-' },
  ITEM: { prefix: 'ITEM', digits: 3, separator: '-' },
  WBS: { prefix: 'WBS', digits: 4, separator: '.' },
  ACT: { prefix: 'ACT', digits: 4, separator: '-' },
  CUSTOM: { prefix: 'CODE', digits: 4, separator: '-' },
};

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

  const [codeFormat, setCodeFormat] = useState<CodeFormat>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(CODE_FORMAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.format || 'IC';
        }
      }
    } catch (e) {
      console.error('Error loading code format from localStorage:', e);
    }
    return 'IC';
  });

  const [customConfig, setCustomConfig] = useState<CodeFormatConfig>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(CODE_FORMAT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.customConfig || DEFAULT_FORMAT_CONFIGS.CUSTOM;
        }
      }
    } catch (e) {
      console.error('Error loading custom config from localStorage:', e);
    }
    return DEFAULT_FORMAT_CONFIGS.CUSTOM;
  });

  // Save to localStorage whenever itemCodes changes
  useEffect(() => {
    try {
      localStorage.setItem(ITEM_CODES_STORAGE_KEY, JSON.stringify(itemCodes));
    } catch (e) {
      console.error('Error saving item codes to localStorage:', e);
    }
  }, [itemCodes]);

  // Save format config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CODE_FORMAT_STORAGE_KEY, JSON.stringify({
        format: codeFormat,
        customConfig,
      }));
    } catch (e) {
      console.error('Error saving code format to localStorage:', e);
    }
  }, [codeFormat, customConfig]);

  const getFormatConfig = useCallback((): CodeFormatConfig => {
    if (codeFormat === 'CUSTOM') {
      return customConfig;
    }
    return DEFAULT_FORMAT_CONFIGS[codeFormat];
  }, [codeFormat, customConfig]);

  const generateAutoCode = useCallback((index: number): string => {
    const config = getFormatConfig();
    const paddedNumber = String(index + 1).padStart(config.digits, '0');
    return `${config.prefix}${config.separator}${paddedNumber}`;
  }, [getFormatConfig]);

  const getItemCode = useCallback((itemNumber: string, index?: number): string => {
    // If already has a custom code, return it
    if (itemCodes[itemNumber]) {
      return itemCodes[itemNumber];
    }
    // Auto-generate code based on index (1-based)
    if (index !== undefined) {
      return generateAutoCode(index);
    }
    return '';
  }, [itemCodes, generateAutoCode]);

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

  // Export item codes to Excel
  const exportItemCodesToExcel = useCallback((items: Array<{ item_number: string; description: string }>) => {
    const headers = ['#', 'Item Number', 'Item Code', 'Description'];
    const data = items.map((item, idx) => [
      idx + 1,
      item.item_number,
      getItemCode(item.item_number, idx),
      item.description,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // #
      { wch: 15 },  // Item Number
      { wch: 15 },  // Item Code
      { wch: 60 },  // Description
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Item Codes');

    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Item_Codes_${currentDate}.xlsx`);
  }, [getItemCode]);

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

  const updateCodeFormat = useCallback((format: CodeFormat) => {
    setCodeFormat(format);
  }, []);

  const updateCustomConfig = useCallback((config: Partial<CodeFormatConfig>) => {
    setCustomConfig(prev => ({ ...prev, ...config }));
  }, []);

  const getAvailableFormats = useCallback((): Array<{ value: CodeFormat; label: string; example: string }> => {
    return [
      { value: 'IC', label: 'IC-0001', example: 'IC-0001, IC-0002...' },
      { value: 'BOQ', label: 'BOQ-001', example: 'BOQ-001, BOQ-002...' },
      { value: 'ITEM', label: 'ITEM-001', example: 'ITEM-001, ITEM-002...' },
      { value: 'WBS', label: 'WBS.0001', example: 'WBS.0001, WBS.0002...' },
      { value: 'ACT', label: 'ACT-0001', example: 'ACT-0001, ACT-0002...' },
      { value: 'CUSTOM', label: 'Custom', example: `${customConfig.prefix}${customConfig.separator}${'0'.repeat(customConfig.digits)}` },
    ];
  }, [customConfig]);

  return {
    itemCodes,
    getItemCode,
    setItemCode,
    setMultipleItemCodes,
    clearItemCode,
    clearAllItemCodes,
    getAllItemCodes,
    exportItemCodes,
    exportItemCodesToExcel,
    importItemCodes,
    codeFormat,
    customConfig,
    updateCodeFormat,
    updateCustomConfig,
    getAvailableFormats,
    getFormatConfig,
    generateAutoCode,
  };
}
