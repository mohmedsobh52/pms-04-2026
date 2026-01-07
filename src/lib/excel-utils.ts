import * as XLSX from 'xlsx';

export interface ExcelExtractionResult {
  text: string;
  items: ExcelBOQItem[];
  sheetNames: string[];
  totalRows: number;
}

export interface ExcelBOQItem {
  itemNo?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  [key: string]: string | number | undefined;
}

// Common BOQ column name patterns (Arabic and English)
const COLUMN_PATTERNS = {
  itemNo: ['item', 'no', 'رقم', 'البند', 'م', '#', 'seq', 'بند'],
  description: ['description', 'وصف', 'البيان', 'الوصف', 'بيان', 'العمل', 'item description', 'spec'],
  unit: ['unit', 'وحدة', 'الوحدة', 'uom'],
  quantity: ['qty', 'quantity', 'كمية', 'الكمية', 'عدد'],
  unitPrice: ['unit price', 'price', 'سعر', 'سعر الوحدة', 'rate', 'السعر'],
  totalPrice: ['total', 'amount', 'إجمالي', 'المبلغ', 'الإجمالي', 'total price', 'المجموع'],
};

function normalizeColumnName(name: string): string {
  return name.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchesPattern(columnName: string, patterns: string[]): boolean {
  const normalized = normalizeColumnName(columnName);
  return patterns.some(pattern => normalized.includes(pattern.toLowerCase()));
}

function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    if (!header) return;
    
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (matchesPattern(header, patterns) && mapping[field] === undefined) {
        mapping[field] = index;
        break;
      }
    }
  });
  
  return mapping;
}

function extractBOQItems(sheet: XLSX.WorkSheet): ExcelBOQItem[] {
  const items: ExcelBOQItem[] = [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  // Get all data as array of arrays
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  
  if (data.length < 2) return items;
  
  // Try to find header row (usually first row with text)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const nonEmptyCells = row.filter(cell => cell && cell.toString().trim()).length;
    if (nonEmptyCells >= 3) {
      headerRowIndex = i;
      break;
    }
  }
  
  const headers = data[headerRowIndex].map(h => h?.toString() || '');
  const columnMapping = detectColumnMapping(headers);
  
  // Extract items from data rows
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) continue;
    
    const item: ExcelBOQItem = {};
    
    // Map known columns
    if (columnMapping.itemNo !== undefined) {
      item.itemNo = row[columnMapping.itemNo]?.toString();
    }
    if (columnMapping.description !== undefined) {
      item.description = row[columnMapping.description]?.toString();
    }
    if (columnMapping.unit !== undefined) {
      item.unit = row[columnMapping.unit]?.toString();
    }
    if (columnMapping.quantity !== undefined) {
      const qty = parseFloat(row[columnMapping.quantity]?.toString() || '0');
      item.quantity = isNaN(qty) ? undefined : qty;
    }
    if (columnMapping.unitPrice !== undefined) {
      const price = parseFloat(row[columnMapping.unitPrice]?.toString() || '0');
      item.unitPrice = isNaN(price) ? undefined : price;
    }
    if (columnMapping.totalPrice !== undefined) {
      const total = parseFloat(row[columnMapping.totalPrice]?.toString() || '0');
      item.totalPrice = isNaN(total) ? undefined : total;
    }
    
    // Include all columns as raw data
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined && row[index] !== '') {
        const key = header.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
        item[key] = row[index];
      }
    });
    
    // Only include items that have at least a description or item number
    if (item.description || item.itemNo) {
      items.push(item);
    }
  }
  
  return items;
}

function sheetToText(sheet: XLSX.WorkSheet): string {
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  
  return data
    .map(row => row.map(cell => cell?.toString().trim() || '').filter(Boolean).join(' | '))
    .filter(row => row.length > 0)
    .join('\n');
}

export interface ExcelProgressCallback {
  (stage: 'reading' | 'parsing' | 'extracting' | 'formatting', progress: number, message?: string): void;
}

export async function extractDataFromExcel(
  file: File, 
  onProgress?: ExcelProgressCallback
): Promise<ExcelExtractionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // Report initial progress
    onProgress?.('reading', 0, 'جاري قراءة الملف...');
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.('reading', percent, `جاري قراءة الملف... ${percent}%`);
      }
    };
    
    reader.onload = (e) => {
      try {
        onProgress?.('parsing', 0, 'جاري تحليل البيانات...');
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // Read with codepage support for Arabic (Windows-1256)
        const workbook = XLSX.read(data, { 
          type: 'array',
          codepage: 65001, // UTF-8
          cellDates: true,
          cellNF: true,
          cellStyles: true,
          raw: false,
        });
        
        onProgress?.('parsing', 50, 'تم تحليل الملف بنجاح');
        
        const sheetNames = workbook.SheetNames;
        let allText = '';
        let allItems: ExcelBOQItem[] = [];
        let totalRows = 0;
        
        const totalSheets = sheetNames.length;
        
        sheetNames.forEach((sheetName, index) => {
          const sheetProgress = Math.round(((index + 1) / totalSheets) * 100);
          onProgress?.('extracting', sheetProgress, `جاري استخراج الورقة ${index + 1} من ${totalSheets}: ${sheetName}`);
          
          const sheet = workbook.Sheets[sheetName];
          const text = sheetToText(sheet);
          const items = extractBOQItems(sheet);
          
          if (text) {
            if (index > 0) allText += '\n\n--- ' + sheetName + ' ---\n\n';
            allText += text;
          }
          
          allItems = [...allItems, ...items];
          
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          totalRows += range.e.r - range.s.r + 1;
        });
        
        onProgress?.('formatting', 50, 'جاري تنسيق البيانات...');
        
        // Clean up any mojibake in extracted items
        allItems = allItems.map(item => ({
          ...item,
          itemNo: cleanMojibake(item.itemNo),
          description: cleanMojibake(item.description),
          unit: cleanMojibake(item.unit),
        }));
        
        onProgress?.('formatting', 100, `تم استخراج ${allItems.length} عنصر`);
        
        resolve({
          text: cleanMojibake(allText) || allText,
          items: allItems,
          sheetNames,
          totalRows,
        });
      } catch (error) {
        reject(new Error('فشل قراءة ملف Excel: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('فشل تحميل ملف Excel'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Clean mojibake (encoding corruption) from text
function cleanMojibake(text: string | undefined): string | undefined {
  if (!text) return text;
  
  // Pattern for common mojibake sequences (corrupted Arabic)
  const mojibakePattern = /p[\*ˆ˜°´¸¹²³µ¶·ºª¡¿€£¥¢¤®©™±×÷«»‹›""''‚„†‡…‰ËŽxÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿA-Za-z]+/gi;
  
  if (mojibakePattern.test(text)) {
    // Text is corrupted, try to clean it
    return text
      .replace(/[\u0080-\u00FF]+/g, '') // Remove Latin-1 supplement
      .replace(mojibakePattern, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || text; // Return original if cleaning results in empty string
  }
  
  return text;
}

export function formatExcelDataForAnalysis(result: ExcelExtractionResult): string {
  // If we have structured items, format them nicely
  if (result.items.length > 0) {
    let formatted = 'جدول كميات BOQ:\n\n';
    
    result.items.forEach((item, index) => {
      formatted += `${index + 1}. `;
      if (item.itemNo) formatted += `[${item.itemNo}] `;
      if (item.description) formatted += item.description;
      if (item.unit || item.quantity) {
        formatted += ' - ';
        if (item.quantity) formatted += `الكمية: ${item.quantity}`;
        if (item.unit) formatted += ` ${item.unit}`;
      }
      if (item.unitPrice) formatted += ` | سعر الوحدة: ${item.unitPrice}`;
      if (item.totalPrice) formatted += ` | الإجمالي: ${item.totalPrice}`;
      formatted += '\n';
    });
    
    return formatted;
  }
  
  // Otherwise return raw text
  return result.text;
}
