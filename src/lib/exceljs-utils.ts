/**
 * ExcelJS Utilities
 * 
 * This module provides secure Excel file operations using ExcelJS library
 * instead of the vulnerable xlsx (SheetJS) library.
 * 
 * ExcelJS is a more secure alternative that doesn't have the known vulnerabilities:
 * - Prototype Pollution (GHSA-4r6h-8v6p-xvw6)
 * - ReDoS (GHSA-5pgg-2g8v-p4x9)
 */
import ExcelJS from 'exceljs';

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Maximum rows to process
const MAX_ROWS = 10000;

/**
 * Validate file size before processing
 */
function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
}

/**
 * Create a new workbook
 */
export function createWorkbook(): ExcelJS.Workbook {
  return new ExcelJS.Workbook();
}

/**
 * Add a worksheet to a workbook with data from JSON array
 */
export function addJsonSheet(
  workbook: ExcelJS.Workbook,
  data: Record<string, unknown>[],
  sheetName: string,
  options?: { header?: string[] }
): ExcelJS.Worksheet {
  // Truncate sheet name to 31 characters (Excel limit)
  const safeName = sheetName.substring(0, 31);
  const worksheet = workbook.addWorksheet(safeName);
  
  if (data.length === 0) return worksheet;
  
  // Get headers from options or from first data item
  const headers = options?.header || Object.keys(data[0]);
  
  // Add header row
  worksheet.addRow(headers);
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add data rows (limit to MAX_ROWS)
  const limitedData = data.slice(0, MAX_ROWS);
  limitedData.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      // Handle undefined/null values
      return value !== undefined && value !== null ? value : '';
    });
    worksheet.addRow(row);
  });
  
  // Auto-fit columns (approximate)
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index]?.toString().length || 10;
    limitedData.forEach(item => {
      const value = item[headers[index]];
      const length = value?.toString().length || 0;
      if (length > maxLength) maxLength = length;
    });
    column.width = Math.min(maxLength + 2, 50);
  });
  
  return worksheet;
}

/**
 * Add a worksheet with array of arrays data
 */
export function addArraySheet(
  workbook: ExcelJS.Workbook,
  data: unknown[][],
  sheetName: string
): ExcelJS.Worksheet {
  const safeName = sheetName.substring(0, 31);
  const worksheet = workbook.addWorksheet(safeName);
  
  // Limit rows
  const limitedData = data.slice(0, MAX_ROWS);
  
  limitedData.forEach((row, rowIndex) => {
    worksheet.addRow(row);
    
    // Style first row as header
    if (rowIndex === 0) {
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }
  });
  
  // Auto-fit columns
  if (data.length > 0) {
    const maxCols = Math.max(...data.map(row => row.length));
    for (let i = 0; i < maxCols; i++) {
      let maxLength = 10;
      data.forEach(row => {
        const value = row[i];
        const length = value?.toString().length || 0;
        if (length > maxLength) maxLength = length;
      });
      const column = worksheet.getColumn(i + 1);
      column.width = Math.min(maxLength + 2, 50);
    }
  }
  
  return worksheet;
}

/**
 * Set column widths for a worksheet
 */
export function setColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((width, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = width;
  });
}

/**
 * Download workbook as Excel file
 */
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  // Ensure filename ends with .xlsx
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read Excel file and return workbook
 */
export async function readExcelFile(file: File): Promise<ExcelJS.Workbook> {
  validateFileSize(file.size);
  
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  return workbook;
}

/**
 * Read Excel file from ArrayBuffer
 */
export async function readExcelBuffer(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
  validateFileSize(buffer.byteLength);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  return workbook;
}

/**
 * Convert worksheet to array of arrays
 */
export function worksheetToArray(worksheet: ExcelJS.Worksheet, maxRows: number = MAX_ROWS): unknown[][] {
  const result: unknown[][] = [];
  let rowCount = 0;
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowCount >= maxRows) return;
    
    const rowData: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Get the value, handling different cell types
      let value = cell.value;
      
      // Handle formula results
      if (value && typeof value === 'object' && 'result' in value) {
        value = (value as ExcelJS.CellFormulaValue).result;
      }
      
      // Handle rich text
      if (value && typeof value === 'object' && 'richText' in value) {
        value = (value as ExcelJS.CellRichTextValue).richText
          .map(rt => rt.text)
          .join('');
      }
      
      rowData[colNumber - 1] = value !== null && value !== undefined ? value : '';
    });
    
    result.push(rowData);
    rowCount++;
  });
  
  return result;
}

/**
 * Convert worksheet to JSON array
 */
export function worksheetToJson<T = Record<string, unknown>>(
  worksheet: ExcelJS.Worksheet,
  options?: { headerRow?: number; maxRows?: number }
): T[] {
  const headerRow = options?.headerRow || 1;
  const maxRows = options?.maxRows || MAX_ROWS;
  
  const data = worksheetToArray(worksheet, maxRows);
  if (data.length < headerRow) return [];
  
  const headers = (data[headerRow - 1] || []).map((h, i) => 
    h?.toString().trim() || `Column${i + 1}`
  );
  
  const result: T[] = [];
  const dataStartRow = headerRow;
  const endRow = Math.min(data.length, maxRows);
  
  for (let i = dataStartRow; i < endRow; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) continue;
    
    const item: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    result.push(item as T);
  }
  
  return result;
}

/**
 * Get sheet names from workbook
 */
export function getSheetNames(workbook: ExcelJS.Workbook): string[] {
  return workbook.worksheets.map(ws => ws.name);
}

/**
 * Get worksheet by name or index
 */
export function getWorksheet(
  workbook: ExcelJS.Workbook, 
  nameOrIndex: string | number
): ExcelJS.Worksheet | undefined {
  if (typeof nameOrIndex === 'string') {
    return workbook.getWorksheet(nameOrIndex);
  }
  return workbook.worksheets[nameOrIndex];
}

// Re-export ExcelJS types for convenience
export type { Workbook, Worksheet, Row, Cell } from 'exceljs';
