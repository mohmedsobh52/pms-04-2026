/**
 * Safe XLSX Wrapper
 * 
 * This module provides a secure wrapper around the xlsx (SheetJS) library
 * to mitigate known vulnerabilities:
 * - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
 * - ReDoS (GHSA-5pgg-2g8v-p4x9)
 * 
 * All xlsx operations should be imported from this file instead of directly from 'xlsx'
 */
import * as XLSX from 'xlsx';

// Re-export safe types
export type WorkBook = XLSX.WorkBook;
export type WorkSheet = XLSX.WorkSheet;
export type Sheet2JSONOpts = XLSX.Sheet2JSONOpts;
export type WritingOptions = XLSX.WritingOptions;
export type ParsingOptions = XLSX.ParsingOptions;

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Maximum rows to process (prevents ReDoS on large files)
const MAX_ROWS = 10000;

// Maximum cell content length (prevents ReDoS on regex operations)
const MAX_CELL_LENGTH = 50000;

// Dangerous prototype properties that should never be modified
const DANGEROUS_PROPS = [
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
];

/**
 * Sanitize an object to prevent prototype pollution
 * Removes dangerous properties and creates a clean copy
 */
function sanitizeObject<T>(obj: T, depth: number = 0): T {
  // Prevent deep recursion attacks
  if (depth > 50) return obj;
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1)) as T;
  }
  
  // Create a clean object without prototype chain pollution
  const clean = Object.create(null) as Record<string, unknown>;
  
  for (const key of Object.keys(obj)) {
    // Skip dangerous properties
    if (DANGEROUS_PROPS.includes(key)) {
      console.warn(`[safe-xlsx] Blocked dangerous property: ${key}`);
      continue;
    }
    
    // Sanitize nested objects
    clean[key] = sanitizeObject((obj as Record<string, unknown>)[key], depth + 1);
  }
  
  return clean as T;
}

/**
 * Sanitize a cell value to prevent ReDoS
 * Truncates overly long strings that could trigger regex denial of service
 */
function sanitizeCellValue(value: unknown): unknown {
  if (typeof value === 'string' && value.length > MAX_CELL_LENGTH) {
    console.warn(`[safe-xlsx] Truncated cell value from ${value.length} to ${MAX_CELL_LENGTH} chars`);
    return value.substring(0, MAX_CELL_LENGTH) + '... [truncated]';
  }
  return value;
}

/**
 * Sanitize a worksheet by cleaning all cell values
 */
function sanitizeWorksheet(sheet: XLSX.WorkSheet): XLSX.WorkSheet {
  const sanitized = Object.create(null) as XLSX.WorkSheet;
  
  for (const key of Object.keys(sheet)) {
    if (DANGEROUS_PROPS.includes(key)) continue;
    
    const value = sheet[key];
    if (value && typeof value === 'object' && 'v' in value) {
      // It's a cell - sanitize the value
      sanitized[key] = {
        ...value,
        v: sanitizeCellValue(value.v),
      };
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate file size before processing
 */
function validateFileSize(data: ArrayBuffer | Uint8Array | string): void {
  let size: number;
  
  if (typeof data === 'string') {
    size = data.length;
  } else if (data instanceof ArrayBuffer) {
    size = data.byteLength;
  } else if (data instanceof Uint8Array) {
    size = data.byteLength;
  } else {
    throw new Error('Invalid data type');
  }
  
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
}

/**
 * Safe XLSX.read wrapper
 * Validates file size and sanitizes output to prevent prototype pollution
 */
export function safeRead(
  data: ArrayBuffer | Uint8Array | string,
  opts?: XLSX.ParsingOptions
): XLSX.WorkBook {
  // Validate file size
  validateFileSize(data);
  
  // Apply safe defaults
  const safeOpts: XLSX.ParsingOptions = {
    ...opts,
    sheetRows: Math.min(opts?.sheetRows || MAX_ROWS, MAX_ROWS),
    cellFormula: false, // Disable formula parsing to prevent injection
    cellHTML: false,    // Disable HTML parsing
    WTF: false,         // Don't throw on unknown features
  };
  
  // Read the workbook
  const workbook = XLSX.read(data, safeOpts);
  
  // Sanitize the workbook
  const sanitizedSheets: Record<string, XLSX.WorkSheet> = {};
  for (const sheetName of workbook.SheetNames) {
    sanitizedSheets[sheetName] = sanitizeWorksheet(workbook.Sheets[sheetName]);
  }
  
  return {
    ...workbook,
    Sheets: sanitizedSheets,
  };
}

/**
 * Safe XLSX.utils.sheet_to_json wrapper
 * Sanitizes output to prevent prototype pollution
 */
export function safeSheetToJson<T = unknown[]>(
  sheet: XLSX.WorkSheet,
  opts?: XLSX.Sheet2JSONOpts
): T[] {
  const result = XLSX.utils.sheet_to_json<T>(sheet, opts);
  return sanitizeObject(result) as T[];
}

/**
 * Safe XLSX.utils.decode_range wrapper
 */
export function safeDecodeRange(range: string): XLSX.Range {
  // Validate range string to prevent ReDoS
  if (range.length > 100) {
    throw new Error('Range string too long');
  }
  return XLSX.utils.decode_range(range);
}

/**
 * Safe XLSX.utils.encode_range wrapper
 */
export function safeEncodeRange(range: XLSX.Range): string {
  return XLSX.utils.encode_range(range);
}

/**
 * Safe XLSX.utils.book_new wrapper
 */
export function safeBookNew(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}

/**
 * Safe XLSX.utils.json_to_sheet wrapper
 * Sanitizes input to prevent prototype pollution
 */
export function safeJsonToSheet<T>(
  data: T[],
  opts?: XLSX.JSON2SheetOpts
): XLSX.WorkSheet {
  const sanitizedData = sanitizeObject(data);
  return XLSX.utils.json_to_sheet(sanitizedData, opts);
}

/**
 * Safe XLSX.utils.aoa_to_sheet wrapper
 */
export function safeAoaToSheet(
  data: unknown[][],
  opts?: XLSX.AOA2SheetOpts
): XLSX.WorkSheet {
  // Sanitize all cell values
  const sanitizedData = data.map(row => 
    row.map(cell => sanitizeCellValue(cell))
  );
  return XLSX.utils.aoa_to_sheet(sanitizedData, opts);
}

/**
 * Safe XLSX.utils.book_append_sheet wrapper
 */
export function safeBookAppendSheet(
  workbook: XLSX.WorkBook,
  worksheet: XLSX.WorkSheet,
  name: string
): void {
  // Validate sheet name
  if (name.length > 31) {
    name = name.substring(0, 31);
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

/**
 * Safe XLSX.write wrapper
 */
export function safeWrite(
  workbook: XLSX.WorkBook,
  opts?: XLSX.WritingOptions
): string | ArrayBuffer | Uint8Array {
  return XLSX.write(workbook, opts);
}

/**
 * Safe XLSX.writeFile wrapper
 */
export function safeWriteFile(
  workbook: XLSX.WorkBook,
  filename: string,
  opts?: XLSX.WritingOptions
): void {
  // Validate filename
  if (filename.length > 255) {
    throw new Error('Filename too long');
  }
  XLSX.writeFile(workbook, filename, opts);
}

/**
 * Safe XLSX.writeFileXLSX wrapper (for xlsx format only)
 */
export function safeWriteFileXLSX(
  workbook: XLSX.WorkBook,
  filename: string,
  opts?: XLSX.WritingOptions
): void {
  if (!filename.endsWith('.xlsx')) {
    filename += '.xlsx';
  }
  safeWriteFile(workbook, filename, opts);
}

// Re-export utils namespace with safe wrappers
export const utils = {
  sheet_to_json: safeSheetToJson,
  decode_range: safeDecodeRange,
  encode_range: safeEncodeRange,
  book_new: safeBookNew,
  json_to_sheet: safeJsonToSheet,
  aoa_to_sheet: safeAoaToSheet,
  book_append_sheet: safeBookAppendSheet,
};

// Re-export main functions
export const read = safeRead;
export const write = safeWrite;
export const writeFile = safeWriteFile;
export const writeFileXLSX = safeWriteFileXLSX;

// Default export matching xlsx structure
export default {
  read: safeRead,
  write: safeWrite,
  writeFile: safeWriteFile,
  writeFileXLSX: safeWriteFileXLSX,
  utils,
};
