import ExcelJS from 'exceljs';

export interface ExcelExtractionResult {
  text: string;
  items: ExcelBOQItem[];
  sheetNames: string[];
  totalRows: number;
  // New fields for column remapping support
  rawData?: (string | number | undefined)[][];
  detectedHeaderRow?: number;
  columnMapping?: Record<string, number>;
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

// Persian/Farsi digit map
const PERSIAN_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
};

// Convert Arabic and Persian numbers to Western digits
export function convertArabicNumbers(text: string): string {
  if (!text) return text;
  return text
    .replace(/[٠-٩]/g, (digit) => ARABIC_DIGITS[digit] || digit)
    .replace(/[۰-۹]/g, (digit) => PERSIAN_DIGITS[digit] || digit);
}

// Normalize Arabic decimal and thousands separators
export function normalizeArabicNumbers(text: string): string {
  if (!text) return text;
  return text
    .replace(/٫/g, '.')  // Arabic decimal separator to dot
    .replace(/٬/g, '')   // Arabic thousands separator removed
    .replace(/،/g, ',')  // Arabic comma to regular comma
    .replace(/؛/g, ';')  // Arabic semicolon
    .replace(/\u00A0/g, ' '); // Non-breaking space to regular space
}

// Normalize Arabic text for better matching
export function normalizeArabicText(text: string): string {
  if (!text) return text;
  return text
    // Normalize different forms of Arabic letters
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    // Remove tatweel (stretching character)
    .replace(/ـ/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse number with Arabic/Persian number handling
export function parseArabicNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  // If already a number, return it
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  
  const strValue = String(value);
  const converted = normalizeArabicNumbers(convertArabicNumbers(strValue));
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = converted.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? undefined : parsed;
}

// Common BOQ column name patterns (Arabic and English)
const COLUMN_PATTERNS = {
  itemNo: [
    'item', 'no', 'item no', 'item number', 'serial', 'ref', 'code', '#', 'seq',
    'sn', 's/n', 's.n', 'line', 'line no', 'row', 'id', 'number', 'num',
    'رقم', 'البند', 'م', 'بند', 'رقم البند', 'مسلسل', 'تسلسل', 'بند/رقم',
    'ر.م', 'رم', 'التسلسل', 'ت', 'المرجع', 'رقم المسلسل', 'الرقم', 'الكود',
    'رقم بند', 'بند رقم', 'م.', 'ر', 'السطر', 'التسلسلي', 'رقم مسلسل'
  ],
  description: [
    'المواصفات', 'مواصفات', 'spec', 'specification', 'specifications',
    'description', 'details', 'scope', 'name', 'desc', 'item description', 
    'work description', 'work', 'activity', 'task',
    'وصف', 'البيان', 'الوصف', 'شرح', 'تفاصيل', 'اسم البند', 'وصف البند',
    'بيان الأعمال', 'بيان', 'العمل', 'التفاصيل', 'العنصر',
    'الصنف', 'المادة', 'البيانات', 'اسم', 'وصف الأعمال',
    'وصف العمل', 'الأعمال', 'النشاط', 'المهمة', 'بيان العمل', 'تفصيل'
  ],
  unit: [
    'unit', 'uom', 'unit of measure', 'u/m', 'measure', 'units',
    'وحدة', 'الوحدة', 'وحده', 'الوحـدة', 'وحدة القياس', 'و.ق', 'وق', 'الوحدات',
    'م2', 'م3', 'م.ط', 'طن', 'كجم', 'لتر', 'القياس', 'وحدات'
  ],
  quantity: [
    'qty', 'quantity', 'amount', 'count', 'no.', 'nos', 'quantities', 'qnty',
    'كمية', 'الكمية', 'العدد', 'الكميه', 'الكم', 'الكميات', 'المقدار',
    'حجم', 'الحجم', 'المساحة', 'كميات', 'عدد'
  ],
  unitPrice: [
    'unit price', 'price', 'rate', 'unit rate', 'u.price', 'u/price', 'cost',
    'unit cost', 'per unit', 'each', 'single price', 'item price',
    'سعر', 'سعر الوحدة', 'السعر', 'المعدل', 'سعر الوحده', 'وحدة سعر',
    'سعر وحده', 'وحدة/سعر', 'سعر المفرد', 'ثمن الوحدة', 'الفئة', 'فئة',
    'التكلفة', 'تكلفة الوحدة', 'ر.و', 'سعر البند', 'السعر المفرد',
    'سعر الفئة', 'ثمن', 'سعر/وحدة', 'تكلفة', 'المفرد'
  ],
  totalPrice: [
    'total', 'amount', 'total price', 'total amount', 'sum', 'net', 'value',
    'total cost', 'line total', 'extended', 'ext', 'subtotal', 'sub total',
    'إجمالي', 'المبلغ', 'الإجمالي', 'اجمالي', 'المجموع', 'الجملة', 'القيمة',
    'جملة', 'جمله', 'القيمه', 'القيمة الإجمالية', 'إجمالى', 'اجمالى',
    'المجموع الكلي', 'الثمن', 'الصافي', 'صافي', 'اجمالى البند', 'إجمالي البند',
    'المبلغ الإجمالي', 'جملة المبلغ', 'مجموع', 'قيمة', 'إجمالى السعر'
  ],
  notes: [
    'notes', 'remarks', 'comment', 'comments', 'remark', 'note', 'observation',
    'ملاحظات', 'ملاحظة', 'ملاحظـات', 'مرفقات', 'تعليق', 'تعليقات', 'إضافات'
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

// Get cell value handling different types
function getCellValue(cell: ExcelJS.Cell): string | number | undefined {
  const value = cell.value;
  
  if (value === null || value === undefined) return undefined;
  
  // Handle formula results
  if (typeof value === 'object' && 'result' in value) {
    return (value as ExcelJS.CellFormulaValue).result as string | number;
  }
  
  // Handle rich text
  if (typeof value === 'object' && 'richText' in value) {
    return (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('');
  }
  
  // Handle hyperlink
  if (typeof value === 'object' && 'text' in value) {
    return (value as ExcelJS.CellHyperlinkValue).text;
  }
  
  // Handle date
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  return value as string | number;
}

// Convert worksheet to array of arrays
function worksheetToArray(worksheet: ExcelJS.Worksheet, maxRows: number = 3000): (string | number | undefined)[][] {
  const result: (string | number | undefined)[][] = [];
  let rowCount = 0;
  
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowCount >= maxRows) return;
    
    const rowData: (string | number | undefined)[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = getCellValue(cell);
    });
    
    result.push(rowData);
    rowCount++;
  });
  
  return result;
}

// Check if a row is likely a header row (not data)
function isLikelyHeaderRow(row: (string | number | undefined)[]): boolean {
  const values = row.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
  if (values.length < 2) return false;
  
  // Count large numbers (>100) - headers rarely have big numbers
  const largeNumericCount = values.filter(v => {
    const num = parseFloat(String(v).replace(/[,،]/g, ''));
    return !isNaN(num) && num > 100;
  }).length;
  
  // If more than 1 large number, it's likely a data row
  if (largeNumericCount > 1) return false;
  
  // Check for header keywords
  const headerKeywords = [
    'رقم', 'وصف', 'كمية', 'سعر', 'وحدة', 'بند', 'البند', 'البيان', 'المواصفات', 'الإجمالي',
    'item', 'desc', 'qty', 'price', 'unit', 'no', 'total', 'amount', 'specification',
    '#', 'ref', 'code', 'description', 'quantity'
  ];
  
  const hasKeywords = values.some(v => {
    const strVal = String(v).toLowerCase().trim();
    return headerKeywords.some(kw => strVal.includes(kw));
  });
  
  return hasKeywords;
}

// Smart description column finder - analyzes data patterns to find the real description column
function findDescriptionColumnFromData(
  data: (string | number | undefined)[][],
  headerRowIndex: number,
  excludeIndices: Set<number>
): number | undefined {
  // Sample first 10 data rows
  const sampleRows = data.slice(headerRowIndex + 1, headerRowIndex + 11).filter(r => r && r.length > 0);
  if (sampleRows.length === 0) return undefined;
  
  const columnCount = Math.max(...sampleRows.map(r => r?.length || 0));
  const columnScores: { index: number; score: number }[] = [];
  
  for (let colIdx = 0; colIdx < columnCount; colIdx++) {
    if (excludeIndices.has(colIdx)) continue;
    
    let score = 0;
    
    for (const row of sampleRows) {
      const value = row?.[colIdx]?.toString()?.trim() || '';
      if (!value) continue;
      
      // Long text (>20 chars) = +5 points
      if (value.length > 20) score += 5;
      
      // Contains Arabic characters = +3 points
      if (/[\u0600-\u06FF]/.test(value)) score += 3;
      
      // Not a pure number = +2 points
      if (isNaN(parseFloat(value.replace(/[,،]/g, '')))) score += 2;
      
      // Contains spaces (multiple words/sentence) = +2 points
      if (value.includes(' ') && value.split(' ').length > 2) score += 2;
      
      // Contains descriptive words = +3 points
      const descWords = ['توريد', 'تركيب', 'أعمال', 'supply', 'install', 'work', 'provide'];
      if (descWords.some(w => value.toLowerCase().includes(w))) score += 3;
    }
    
    columnScores.push({ index: colIdx, score });
  }
  
  // Sort by score descending
  columnScores.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring column if score is significant
  if (columnScores.length > 0 && columnScores[0].score > 15) {
    console.log('Excel extraction - Smart description detection:', columnScores[0]);
    return columnScores[0].index;
  }
  
  return undefined;
}

interface ExtractionResult {
  items: ExcelBOQItem[];
  headerRowIndex: number;
  columnMapping: Record<string, number>;
}

function extractBOQItems(data: (string | number | undefined)[][], maxRows: number = 1000): ExtractionResult {
  const items: ExcelBOQItem[] = [];

  if (data.length < 2) return { items, headerRowIndex: 0, columnMapping: {} };

  // Find the best header row with improved validation
  let headerRowIndex = 0;
  let bestScore = -1;
  const headerScanLimit = Math.min(20, data.length);

  for (let i = 0; i < headerScanLimit; i++) {
    const row = data[i] || [];
    const nonEmptyCells = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '').length;
    if (nonEmptyCells < 3) continue;
    
    // Additional check: verify it's actually a header row
    if (!isLikelyHeaderRow(row)) continue;

    const candidateHeaders = row.map(h => h?.toString() || '');
    const candidateMapping = detectColumnMapping(candidateHeaders);
    const score = Object.keys(candidateMapping).length;

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = i;
    }
  }

  // Fallback: first row that looks like headers (not data)
  if (bestScore <= 0) {
    for (let i = 0; i < headerScanLimit; i++) {
      const row = data[i] || [];
      const nonEmptyCells = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '').length;
      if (nonEmptyCells >= 3 && isLikelyHeaderRow(row)) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headers = (data[headerRowIndex] || []).map(h => h?.toString() || '');
  let columnMapping = detectColumnMapping(headers);

  console.log('Excel extraction - Header row index:', headerRowIndex);
  console.log('Excel extraction - Headers:', headers);
  console.log('Excel extraction - Initial column mapping:', columnMapping);

  // If no headers matched at all, try smart positional detection
  if (Object.keys(columnMapping).length === 0) {
    const firstDataRow = data[headerRowIndex + 1];
    if (firstDataRow) {
      columnMapping = detectColumnMappingFromData(headers, firstDataRow);
    }
    
    // Last resort: sequential fallback
    if (Object.keys(columnMapping).length === 0) {
      const nonEmptyIndices = headers
        .map((h, i) => (h && h.trim()) ? i : -1)
        .filter(i => i >= 0);
      
      if (nonEmptyIndices.length >= 2) {
        columnMapping = {
          itemNo: nonEmptyIndices[0],
          description: nonEmptyIndices[1],
          unit: nonEmptyIndices[2],
          quantity: nonEmptyIndices[3],
          unitPrice: nonEmptyIndices[4],
          totalPrice: nonEmptyIndices[5],
        };
      } else {
        columnMapping = {
          itemNo: 0,
          description: 1,
          unit: 2,
          quantity: 3,
          unitPrice: 4,
          totalPrice: 5,
        };
      }
    }
  }

  // CRITICAL: Use smart description finder if description column seems wrong
  const usedIndices = new Set(Object.values(columnMapping).filter(v => v !== undefined) as number[]);
  
  // Check if description column is producing empty or numeric values
  const testDescCol = columnMapping.description;
  let descriptionNeedsRemap = false;
  
  if (testDescCol !== undefined) {
    const sampleRows = data.slice(headerRowIndex + 1, headerRowIndex + 6);
    const emptyOrNumericCount = sampleRows.filter(row => {
      const val = row?.[testDescCol]?.toString()?.trim() || '';
      return !val || !isNaN(parseFloat(val.replace(/[,،]/g, '')));
    }).length;
    
    // If most sample values are empty or numeric, remap description
    if (emptyOrNumericCount >= sampleRows.length * 0.6) {
      descriptionNeedsRemap = true;
      console.log('Excel extraction - Description column appears wrong, attempting smart detection');
    }
  } else {
    descriptionNeedsRemap = true;
  }
  
  if (descriptionNeedsRemap) {
    const smartDescCol = findDescriptionColumnFromData(data, headerRowIndex, usedIndices);
    if (smartDescCol !== undefined) {
      columnMapping.description = smartDescCol;
      console.log('Excel extraction - Smart description column found:', smartDescCol);
    }
  }

  console.log('Excel extraction - Final mapping:', columnMapping);

  // Extract items
  const endRow = Math.min(data.length, maxRows);
  for (let i = headerRowIndex + 1; i < endRow; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) continue;

    const item: ExcelBOQItem = {};

    // Map known columns with Arabic number conversion
    if (columnMapping.itemNo !== undefined && columnMapping.itemNo >= 0 && row[columnMapping.itemNo] !== undefined) {
      const rawValue = row[columnMapping.itemNo]?.toString();
      item.itemNo = convertArabicNumbers(rawValue || '');
    }
    
    // For description, use the mapped column
    if (columnMapping.description !== undefined && columnMapping.description >= 0) {
      const descValue = row[columnMapping.description]?.toString()?.trim();
      if (descValue) {
        item.description = descValue;
      }
    }
    
    // If description is still empty, try to find longest text in row
    if (!item.description) {
      let longestText = '';
      const skipIndices = new Set([
        columnMapping.itemNo,
        columnMapping.quantity,
        columnMapping.unitPrice,
        columnMapping.totalPrice
      ].filter(v => v !== undefined && v >= 0) as number[]);
      
      row.forEach((cell, idx) => {
        if (skipIndices.has(idx)) return;
        const cellText = cell?.toString()?.trim() || '';
        // Must be longer than current and look like text (not pure number)
        if (cellText.length > longestText.length && cellText.length > 5) {
          const numVal = parseFloat(cellText.replace(/[,،]/g, ''));
          if (isNaN(numVal) || cellText.length > 15) {
            longestText = cellText;
          }
        }
      });
      if (longestText) {
        item.description = longestText;
      }
    }
    
    if (columnMapping.unit !== undefined && columnMapping.unit >= 0 && row[columnMapping.unit] !== undefined) {
      item.unit = row[columnMapping.unit]?.toString();
    }
    if (columnMapping.quantity !== undefined && columnMapping.quantity >= 0 && row[columnMapping.quantity] !== undefined) {
      item.quantity = parseArabicNumber(row[columnMapping.quantity]);
    }
    if (columnMapping.unitPrice !== undefined && columnMapping.unitPrice >= 0 && row[columnMapping.unitPrice] !== undefined) {
      item.unitPrice = parseArabicNumber(row[columnMapping.unitPrice]);
    }
    if (columnMapping.totalPrice !== undefined && columnMapping.totalPrice >= 0 && row[columnMapping.totalPrice] !== undefined) {
      item.totalPrice = parseArabicNumber(row[columnMapping.totalPrice]);
    }
    if (columnMapping.notes !== undefined && columnMapping.notes >= 0 && row[columnMapping.notes] !== undefined) {
      item.notes = row[columnMapping.notes]?.toString();
    }

    // Auto-calculate total if missing
    if (!item.totalPrice && item.quantity && item.unitPrice) {
      item.totalPrice = item.quantity * item.unitPrice;
    }

    // Only add items that have meaningful data - expanded conditions
    if (item.description || (item.itemNo && item.itemNo !== '') || item.quantity || item.unitPrice) {
      items.push(item);
    }
  }

  console.log('Excel extraction - Extracted items count:', items.length);
  if (items.length > 0) {
    console.log('Excel extraction - Sample item:', items[0]);
  }

  return { items, headerRowIndex, columnMapping };
}

// Detect column mapping from data patterns
function detectColumnMappingFromData(
  headers: string[], 
  sampleRow: (string | number | undefined)[]
): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  sampleRow.forEach((value, index) => {
    if (value === undefined || value === null) return;
    const strValue = value.toString().trim();
    const numValue = parseArabicNumber(strValue);
    
    // Try to detect column type from value pattern
    if (!strValue) return;
    
    // Short numeric or alphanumeric could be item number
    if (!mapping.itemNo && strValue.length <= 10 && /^[\d\.\-\/\sA-Za-z]*$/.test(strValue)) {
      // Check if it looks like an item number (short, possibly with dots/dashes)
      if (/^\d+[\.\-]?\d*$/.test(strValue) || /^[A-Za-z]{1,3}[\-\.\s]?\d+/.test(strValue)) {
        mapping.itemNo = index;
        return;
      }
    }
    
    // Long text is likely description
    if (!mapping.description && strValue.length > 10 && isNaN(numValue || NaN)) {
      mapping.description = index;
      return;
    }
    
    // Short text with unit patterns
    if (!mapping.unit && strValue.length <= 10 && 
        /^(m|m2|m3|no|nos|kg|ton|ls|عدد|م|م2|م3|طن|كجم|وحدة|مقطوعية|متر)$/i.test(strValue)) {
      mapping.unit = index;
      return;
    }
  });
  
  // Try to assign remaining numeric columns to quantity, unitPrice, totalPrice
  const usedIndices = new Set(Object.values(mapping));
  const numericIndices: number[] = [];
  
  sampleRow.forEach((value, index) => {
    if (usedIndices.has(index)) return;
    const numValue = parseArabicNumber(value);
    if (numValue !== undefined && !isNaN(numValue)) {
      numericIndices.push(index);
    }
  });
  
  // Assign numeric columns in order: quantity, unitPrice, totalPrice
  if (numericIndices.length >= 1 && !mapping.quantity) {
    mapping.quantity = numericIndices[0];
  }
  if (numericIndices.length >= 2 && !mapping.unitPrice) {
    mapping.unitPrice = numericIndices[1];
  }
  if (numericIndices.length >= 3 && !mapping.totalPrice) {
    mapping.totalPrice = numericIndices[2];
  }
  
  return mapping;
}

function dataToText(data: (string | number | undefined)[][], maxRows: number = 300): string {
  const rows: string[] = [];
  const limit = Math.min(data.length, maxRows);

  for (let i = 0; i < limit; i++) {
    const row = data[i];
    if (!row) continue;
    const text = row
      .map(cell => cell?.toString().trim() || '')
      .filter(Boolean)
      .join(' | ');
    if (text) rows.push(text);
  }

  return rows.join('\n');
}

// Clean mojibake (encoding corruption) from text
function cleanMojibake(text: string | undefined): string | undefined {
  if (!text) return text;
  
  const mojibakePattern = /p[\*ˆ˜°´¸¹²³µ¶·ºª¡¿€£¥¢¤®©™±×÷«»‹›""''‚„†‡…‰ËŽxÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿA-Za-z]+/gi;
  
  if (mojibakePattern.test(text)) {
    return text
      .replace(/[\u0080-\u00FF]+/g, '')
      .replace(mojibakePattern, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || text;
  }
  
  return text;
}

export interface ExcelProgressCallback {
  (stage: 'reading' | 'parsing' | 'extracting' | 'formatting', progress: number, message?: string): void;
}

export async function extractDataFromExcel(
  file: File, 
  onProgress?: ExcelProgressCallback
): Promise<ExcelExtractionResult> {
  onProgress?.('reading', 0, 'جاري قراءة الملف...');
  
  const buffer = await file.arrayBuffer();
  
  onProgress?.('parsing', 0, 'جاري تحليل البيانات...');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  onProgress?.('parsing', 50, 'تم تحليل الملف بنجاح');
  
  const sheetNames = workbook.worksheets.map(ws => ws.name);
  let allText = '';
  let allItems: ExcelBOQItem[] = [];
  let totalRows = 0;
  
  // Process all sheets (removed 3 sheet limit)
  const sheetsToProcess = sheetNames.length;
  
  // Store raw data and mapping from first sheet for remapping support
  let rawData: (string | number | undefined)[][] = [];
  let detectedHeaderRow = 0;
  let finalColumnMapping: Record<string, number> = {};
  
  for (let i = 0; i < sheetsToProcess; i++) {
    const sheetName = sheetNames[i];
    const sheetProgress = Math.round(((i + 1) / sheetsToProcess) * 100);
    onProgress?.('extracting', sheetProgress, `جاري استخراج الورقة ${i + 1} من ${sheetsToProcess}: ${sheetName}`);
    
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) continue;
    
    const data = worksheetToArray(worksheet, 3000);
    const text = dataToText(data, 500);
    const extractionResult = extractBOQItems(data, 3000);
    
    // Store raw data from first sheet
    if (i === 0) {
      rawData = data;
      detectedHeaderRow = extractionResult.headerRowIndex;
      finalColumnMapping = extractionResult.columnMapping;
    }
    
    if (text) {
      if (i > 0) allText += '\n\n--- ' + sheetName + ' ---\n\n';
      allText += text;
    }
    
    allItems = allItems.concat(extractionResult.items);
    totalRows += Math.min(worksheet.rowCount, 3000);
  }
  
  onProgress?.('formatting', 50, 'جاري تنسيق البيانات...');
  
  // Clean up any mojibake and normalize Arabic text
  allItems = allItems.map(item => ({
    ...item,
    itemNo: cleanMojibake(convertArabicNumbers(item.itemNo || '')),
    description: cleanMojibake(item.description),
    unit: cleanMojibake(item.unit),
    quantity: parseArabicNumber(item.quantity),
    unitPrice: parseArabicNumber(item.unitPrice),
    totalPrice: parseArabicNumber(item.totalPrice),
  }));
  
  onProgress?.('formatting', 100, `تم استخراج ${allItems.length} عنصر`);
  
  return {
    text: cleanMojibake(allText) || allText,
    items: allItems,
    sheetNames,
    totalRows,
    rawData,
    detectedHeaderRow,
    columnMapping: finalColumnMapping,
  };
}

// Extract raw Excel data with original values
export function extractRawExcelData(worksheet: ExcelJS.Worksheet, maxRows: number = 1000): Array<Record<string, unknown>> {
  const data = worksheetToArray(worksheet, maxRows);

  if (data.length < 2) return [];

  // Find header row
  let headerRowIndex = 0;
  let bestScore = -1;
  const headerScanLimit = Math.min(20, data.length);

  for (let i = 0; i < headerScanLimit; i++) {
    const row = data[i] || [];
    const nonEmptyCells = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '').length;
    if (nonEmptyCells < 3) continue;

    const candidateHeaders = row.map(h => h !== undefined && h !== null ? String(h).trim() : '');
    const candidateMapping = detectColumnMapping(candidateHeaders);
    const score = Object.keys(candidateMapping).length;

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = i;
    }
  }

  if (bestScore <= 0) {
    for (let i = 0; i < headerScanLimit; i++) {
      const row = data[i] || [];
      const nonEmptyCells = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '').length;
      if (nonEmptyCells >= 3) {
        headerRowIndex = i;
        break;
      }
    }
  }

  const headers = (data[headerRowIndex] || []).map((h, idx) => {
    const header = h !== undefined && h !== null ? String(h).trim() : '';
    return header || `Column_${idx + 1}`;
  });

  const rows: Array<Record<string, unknown>> = [];

  for (let i = headerRowIndex + 1; i < Math.min(data.length, maxRows); i++) {
    const row = data[i];
    if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) continue;

    const rowData: Record<string, unknown> = {};
    let hasData = false;

    headers.forEach((header, idx) => {
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

// OPTIMIZED: Fast extraction for historical pricing
export async function extractRawDataFromExcel(
  file: File,
  onProgress?: ExcelProgressCallback
): Promise<{ 
  rows: Array<Record<string, unknown>>;
  headers: string[];
  sheetNames: string[];
  totalRows: number;
}> {
  const buffer = await file.arrayBuffer();
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const sheetNames = workbook.worksheets.map(ws => ws.name);
  
  if (sheetNames.length === 0) {
    return { rows: [], headers: [], sheetNames: [], totalRows: 0 };
  }
  
  const worksheet = workbook.worksheets[0];
  const data = worksheetToArray(worksheet, 1000);
  
  if (data.length < 2) {
    return { rows: [], headers: [], sheetNames, totalRows: 0 };
  }
  
  // Quick header detection (first row with 3+ cells)
  let headerRowIndex = 0;
  const maxHeaderSearch = Math.min(5, data.length);
  for (let i = 0; i < maxHeaderSearch; i++) {
    const row = data[i];
    if (row && row.filter(c => c != null && String(c).trim()).length >= 3) {
      headerRowIndex = i;
      break;
    }
  }
  
  const headerRow = data[headerRowIndex] || [];
  const headers = headerRow.map((h, idx) => 
    (h != null && String(h).trim()) || `Column_${idx + 1}`
  );
  
  // Fast row extraction with Arabic number conversion
  const rows: Array<Record<string, unknown>> = [];
  const dataEndIndex = Math.min(data.length, 1000);
  
  for (let i = headerRowIndex + 1; i < dataEndIndex; i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowData: Record<string, unknown> = {};
    let hasData = false;
    
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val != null && val !== '') {
        // Convert Arabic numbers if it's a string that looks like a number
        if (typeof val === 'string') {
          const converted = convertArabicNumbers(normalizeArabicNumbers(val));
          // Try to parse as number if it looks numeric
          if (/^[\d.,\-+]+$/.test(converted.trim())) {
            const parsed = parseFloat(converted.replace(/,/g, ''));
            if (!isNaN(parsed)) {
              val = parsed;
            } else {
              val = converted;
            }
          } else {
            val = converted;
          }
        }
        rowData[headers[j]] = val;
        hasData = true;
      }
    }
    
    if (hasData) rows.push(rowData);
  }
  
  onProgress?.('formatting', 100, `تم استخراج ${rows.length} صف`);
  
  return {
    rows,
    headers,
    sheetNames,
    totalRows: rows.length,
  };
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

  // Fallback: always return something useful (raw text)
  const raw = (result.text || '').trim();
  if (!raw) return '';

  const sheetInfo = result.sheetNames?.length ? `الأوراق: ${result.sheetNames.join(', ')}\n\n` : '';
  return `${sheetInfo}بيانات Excel (غير منظمة):\n\n${raw}`;
}

// Re-extract BOQ items with custom column mapping (for manual remapping)
export function reExtractWithMapping(
  rawData: (string | number | undefined)[][],
  headerRowIndex: number,
  customMapping: Record<string, number>,
  maxRows: number = 1000
): ExcelBOQItem[] {
  const items: ExcelBOQItem[] = [];
  
  if (rawData.length < headerRowIndex + 2) return items;
  
  const endRow = Math.min(rawData.length, maxRows);
  
  console.log('reExtractWithMapping - headerRowIndex:', headerRowIndex);
  console.log('reExtractWithMapping - customMapping:', customMapping);
  
  for (let i = headerRowIndex + 1; i < endRow; i++) {
    const row = rawData[i];
    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) continue;
    
    const item: ExcelBOQItem = {};
    
    // Extract Item Number
    if (customMapping.itemNo !== undefined && customMapping.itemNo >= 0) {
      const val = row[customMapping.itemNo];
      if (val !== undefined && val !== null) {
        item.itemNo = convertArabicNumbers(val.toString().trim());
      }
    }
    
    // Extract Description - this is critical
    if (customMapping.description !== undefined && customMapping.description >= 0) {
      const val = row[customMapping.description];
      if (val !== undefined && val !== null) {
        const descText = val.toString().trim();
        if (descText) {
          item.description = descText;
        }
      }
    }
    
    // Fallback: If no description found, search for longest text in row
    if (!item.description) {
      let longestText = '';
      const skipIndices = new Set([
        customMapping.itemNo,
        customMapping.quantity,
        customMapping.unitPrice,
        customMapping.totalPrice
      ].filter(v => v !== undefined && v >= 0) as number[]);
      
      row.forEach((cell, idx) => {
        if (skipIndices.has(idx)) return;
        const cellText = cell?.toString()?.trim() || '';
        // Must be longer than current and look like text (not pure number)
        if (cellText.length > longestText.length && cellText.length > 5) {
          const numVal = parseFloat(cellText.replace(/[,،]/g, ''));
          if (isNaN(numVal) || cellText.length > 15) {
            longestText = cellText;
          }
        }
      });
      if (longestText) {
        item.description = longestText;
      }
    }
    
    // Extract Unit
    if (customMapping.unit !== undefined && customMapping.unit >= 0) {
      const val = row[customMapping.unit];
      if (val !== undefined && val !== null) {
        item.unit = val.toString().trim();
      }
    }
    
    // Extract Quantity
    if (customMapping.quantity !== undefined && customMapping.quantity >= 0) {
      item.quantity = parseArabicNumber(row[customMapping.quantity]);
    }
    
    // Extract Unit Price
    if (customMapping.unitPrice !== undefined && customMapping.unitPrice >= 0) {
      item.unitPrice = parseArabicNumber(row[customMapping.unitPrice]);
    }
    
    // Extract Total Price
    if (customMapping.totalPrice !== undefined && customMapping.totalPrice >= 0) {
      item.totalPrice = parseArabicNumber(row[customMapping.totalPrice]);
    }
    
    // Auto-calculate total if missing but qty and unit price exist
    if (!item.totalPrice && item.quantity && item.unitPrice) {
      item.totalPrice = item.quantity * item.unitPrice;
    }
    
    // Only add items that have meaningful data
    if (item.description || (item.itemNo && item.itemNo !== '')) {
      items.push(item);
    }
  }
  
  console.log('reExtractWithMapping - extracted items count:', items.length);
  if (items.length > 0) {
    console.log('reExtractWithMapping - sample item:', items[0]);
  }
  
  return items;
}
