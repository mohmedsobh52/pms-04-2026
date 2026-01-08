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
  notes?: string;
  [key: string]: string | number | undefined;
}

// Arabic-to-Western digit conversion map
const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

// Convert Arabic numbers to Western digits
function convertArabicNumbers(text: string): string {
  if (!text) return text;
  return text.replace(/[٠-٩]/g, (digit) => ARABIC_DIGITS[digit] || digit);
}

// Normalize Arabic decimal and thousands separators
function normalizeArabicNumbers(text: string): string {
  if (!text) return text;
  return text
    .replace(/٫/g, '.')  // Arabic decimal separator to dot
    .replace(/٬/g, '');  // Arabic thousands separator removed
}

// Parse number with Arabic number handling
function parseArabicNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  const strValue = String(value);
  const converted = normalizeArabicNumbers(convertArabicNumbers(strValue));
  const cleaned = converted.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? undefined : parsed;
}

// Common BOQ column name patterns (Arabic and English) - Extended for better recognition
const COLUMN_PATTERNS = {
  itemNo: [
    // English patterns
    'item', 'no', 'item no', 'item number', 'serial', 'ref', 'code', '#', 'seq',
    // Arabic patterns - from document + extended
    'رقم', 'البند', 'م', 'بند', 'رقم البند', 'مسلسل', 'تسلسل', 'بند/رقم',
    'ر.م', 'رم', 'التسلسل', 'ت', 'المرجع', 'رقم المسلسل', 'الرقم', 'الكود'
  ],
  description: [
    // English patterns
    'description', 'spec', 'specification', 'details', 'scope', 'name',
    // Arabic patterns - from document + extended
    'وصف', 'البيان', 'الوصف', 'شرح', 'تفاصيل', 'اسم البند', 'وصف البند',
    'بيان الأعمال', 'بيان', 'العمل', 'المواصفات', 'التفاصيل', 'العنصر',
    'الصنف', 'المادة', 'البيانات', 'اسم'
  ],
  unit: [
    // English patterns
    'unit', 'uom', 'unit of measure',
    // Arabic patterns - from document + extended
    'وحدة', 'الوحدة', 'وحده', 'الوحـدة', 'وحدة القياس', 'و.ق', 'وق', 'الوحدات',
    'م2', 'م3', 'م.ط', 'طن', 'كجم', 'لتر'
  ],
  quantity: [
    // English patterns
    'qty', 'quantity', 'amount', 'count', 'no.', 'nos',
    // Arabic patterns - from document + extended
    'كمية', 'الكمية', 'العدد', 'الكميه', 'الكم', 'الكميات', 'المقدار',
    'حجم', 'الحجم', 'المساحة'
  ],
  unitPrice: [
    // English patterns
    'unit price', 'price', 'rate', 'unit rate', 'u.price', 'u/price', 'cost',
    // Arabic patterns - from document + extended
    'سعر', 'سعر الوحدة', 'السعر', 'المعدل', 'سعر الوحده', 'وحدة سعر',
    'سعر وحده', 'وحدة/سعر', 'سعر المفرد', 'ثمن الوحدة', 'الفئة', 'فئة',
    'التكلفة', 'تكلفة الوحدة', 'ر.و'
  ],
  totalPrice: [
    // English patterns
    'total', 'amount', 'total price', 'total amount', 'sum', 'net', 'value',
    // Arabic patterns - from document + extended
    'إجمالي', 'المبلغ', 'الإجمالي', 'اجمالي', 'المجموع', 'الجملة', 'القيمة',
    'جملة', 'جمله', 'القيمه', 'القيمة الإجمالية', 'إجمالى', 'اجمالى',
    'المجموع الكلي', 'الثمن', 'الصافي', 'صافي'
  ],
  notes: [
    // English patterns
    'notes', 'remarks', 'comment', 'comments',
    // Arabic patterns - from document
    'ملاحظات', 'ملاحظة', 'ملاحظـات', 'مرفقات'
  ],
};

// Remove Arabic diacritics for better matching
function removeDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

function normalizeColumnName(name: string): string {
  const cleaned = removeDiacritics(name.toString().toLowerCase().trim());
  return cleaned.replace(/\s+/g, ' ');
}

function matchesPattern(columnName: string, patterns: string[]): boolean {
  const normalized = normalizeColumnName(columnName);
  return patterns.some(pattern => {
    const normalizedPattern = normalizeColumnName(pattern);
    return normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized);
  });
}

function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  // IMPORTANT: Do NOT reverse column order for RTL sheets - use physical order
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

function extractBOQItems(sheet: XLSX.WorkSheet, maxRows: number = 500): ExcelBOQItem[] {
  const items: ExcelBOQItem[] = [];
  
  // Use faster JSON conversion with row limit
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { 
    header: 1, 
    defval: '',
    range: maxRows // Limit rows for speed
  });
  
  if (data.length < 2) return items;
  
  // Find header row quickly
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    const nonEmptyCells = row.filter(cell => cell && cell.toString().trim()).length;
    if (nonEmptyCells >= 3) {
      headerRowIndex = i;
      break;
    }
  }
  
  const headers = data[headerRowIndex].map(h => h?.toString() || '');
  const columnMapping = detectColumnMapping(headers);
  
  // Extract items - limit to maxRows
  const endRow = Math.min(data.length, maxRows);
  for (let i = headerRowIndex + 1; i < endRow; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) continue;
    
    const item: ExcelBOQItem = {};
    
    // Map known columns - apply Arabic number conversion
    if (columnMapping.itemNo !== undefined) {
      const rawValue = row[columnMapping.itemNo]?.toString();
      item.itemNo = convertArabicNumbers(rawValue || '');
    }
    if (columnMapping.description !== undefined) {
      item.description = row[columnMapping.description]?.toString();
    }
    if (columnMapping.unit !== undefined) {
      item.unit = row[columnMapping.unit]?.toString();
    }
    if (columnMapping.quantity !== undefined) {
      item.quantity = parseArabicNumber(row[columnMapping.quantity]);
    }
    if (columnMapping.unitPrice !== undefined) {
      item.unitPrice = parseArabicNumber(row[columnMapping.unitPrice]);
    }
    if (columnMapping.totalPrice !== undefined) {
      item.totalPrice = parseArabicNumber(row[columnMapping.totalPrice]);
    }
    if (columnMapping.notes !== undefined) {
      item.notes = row[columnMapping.notes]?.toString();
    }
    
    if (item.description || item.itemNo) {
      items.push(item);
    }
  }
  
  return items;
}

function sheetToText(sheet: XLSX.WorkSheet, maxRows: number = 300): string {
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { 
    header: 1, 
    defval: '',
    range: maxRows 
  });
  
  const rows: string[] = [];
  const limit = Math.min(data.length, maxRows);
  
  for (let i = 0; i < limit; i++) {
    const row = data[i];
    const text = row.map(cell => cell?.toString().trim() || '').filter(Boolean).join(' | ');
    if (text) rows.push(text);
  }
  
  return rows.join('\n');
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
        
        // OPTIMIZED: Use minimal parsing options for speed
        const workbook = XLSX.read(data, { 
          type: 'array',
          codepage: 65001,
          cellFormula: false,  // Skip formulas
          cellHTML: false,     // Skip HTML
          cellStyles: false,   // Skip styles - major speedup!
          cellNF: false,       // Skip number formats
          sheetRows: 500,      // Limit rows per sheet
        });
        
        onProgress?.('parsing', 50, 'تم تحليل الملف بنجاح');
        
        const sheetNames = workbook.SheetNames;
        let allText = '';
        let allItems: ExcelBOQItem[] = [];
        let totalRows = 0;
        
        // OPTIMIZED: Process max 3 sheets
        const sheetsToProcess = Math.min(sheetNames.length, 3);
        
        for (let i = 0; i < sheetsToProcess; i++) {
          const sheetName = sheetNames[i];
          const sheetProgress = Math.round(((i + 1) / sheetsToProcess) * 100);
          onProgress?.('extracting', sheetProgress, `جاري استخراج الورقة ${i + 1} من ${sheetsToProcess}: ${sheetName}`);
          
          const sheet = workbook.Sheets[sheetName];
          const text = sheetToText(sheet, 300);
          const items = extractBOQItems(sheet, 500);
          
          if (text) {
            if (i > 0) allText += '\n\n--- ' + sheetName + ' ---\n\n';
            allText += text;
          }
          
          allItems = allItems.concat(items);
          
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          totalRows += Math.min(range.e.r - range.s.r + 1, 500);
        }
        
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

// NEW: Extract all rows exactly as they are from Excel
export function extractRawExcelData(sheet: XLSX.WorkSheet, maxRows: number = 1000): Array<Record<string, any>> {
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { 
    header: 1, 
    defval: '',
    range: maxRows,
    raw: true
  });
  
  if (data.length < 2) return [];
  
  // Find header row (first row with at least 3 non-empty cells)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const nonEmptyCells = row?.filter((cell: any) => cell !== undefined && cell !== null && String(cell).trim() !== '').length || 0;
    if (nonEmptyCells >= 3) {
      headerRowIndex = i;
      break;
    }
  }
  
  const headers = (data[headerRowIndex] || []).map((h: any, idx: number) => {
    const header = h !== undefined && h !== null ? String(h).trim() : '';
    return header || `Column_${idx + 1}`;
  });
  
  const rows: Array<Record<string, any>> = [];
  
  for (let i = headerRowIndex + 1; i < Math.min(data.length, maxRows); i++) {
    const row = data[i];
    if (!row || row.every((cell: any) => cell === undefined || cell === null || String(cell).trim() === '')) continue;
    
    const rowData: Record<string, any> = {};
    let hasData = false;
    
    headers.forEach((header: string, idx: number) => {
      const cellValue = row[idx];
      if (cellValue !== undefined && cellValue !== null) {
        rowData[header] = cellValue;
        hasData = true;
      }
    });
    
    if (hasData) {
      rows.push(rowData);
    }
  }
  
  return rows;
}

// NEW: Extract data for historical pricing - preserves all data as-is
export async function extractRawDataFromExcel(
  file: File,
  onProgress?: ExcelProgressCallback
): Promise<{ 
  rows: Array<Record<string, any>>;
  headers: string[];
  sheetNames: string[];
  totalRows: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
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
        
        const workbook = XLSX.read(data, { 
          type: 'array',
          codepage: 65001,
          cellFormula: false,
          cellHTML: false,
          cellStyles: false,
          cellNF: false,
          raw: true,
        });
        
        const sheetNames = workbook.SheetNames;
        let allRows: Array<Record<string, any>> = [];
        let allHeaders: string[] = [];
        let totalRows = 0;
        
        if (sheetNames.length > 0) {
          const sheet = workbook.Sheets[sheetNames[0]];
          
          const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            const nonEmptyCells = row?.filter((cell: any) => cell !== undefined && cell !== null && String(cell).trim() !== '').length || 0;
            if (nonEmptyCells >= 3) {
              headerRowIndex = i;
              break;
            }
          }
          
          allHeaders = (rawData[headerRowIndex] || []).map((h: any, idx: number) => {
            const header = h !== undefined && h !== null ? String(h).trim() : '';
            return header || `Column_${idx + 1}`;
          });
          
          allRows = extractRawExcelData(sheet, 1000);
          
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          totalRows = range.e.r - range.s.r + 1;
        }
        
        onProgress?.('formatting', 100, `تم استخراج ${allRows.length} صف`);
        
        resolve({
          rows: allRows,
          headers: allHeaders,
          sheetNames,
          totalRows,
        });
      } catch (error) {
        reject(new Error('فشل قراءة ملف Excel: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')));
      }
    };
    
    reader.onerror = () => reject(new Error('فشل تحميل ملف Excel'));
    
    reader.readAsArrayBuffer(file);
  });
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
