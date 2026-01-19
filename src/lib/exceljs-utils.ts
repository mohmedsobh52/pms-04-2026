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

/**
 * XLSX-Compatible API
 * 
 * These functions provide a drop-in replacement for the xlsx (SheetJS) library
 * to minimize migration effort while using the more secure ExcelJS under the hood.
 */

// Store for tracking workbooks to sheets mapping (for compatibility)
const workbookCache = new WeakMap<object, ExcelJS.Workbook>();

type XLSXSheet = unknown[][];
type XLSXWorkbook = {
  SheetNames: string[];
  Sheets: Record<string, XLSXSheet>;
  _exceljs?: ExcelJS.Workbook;
};

/**
 * XLSX-compatible utils namespace
 */
export const XLSX = {
  utils: {
    /**
     * Create a new workbook
     */
    book_new(): XLSXWorkbook {
      const wb: XLSXWorkbook = {
        SheetNames: [],
        Sheets: {},
        _exceljs: new ExcelJS.Workbook()
      };
      return wb;
    },

    /**
     * Convert JSON to sheet
     */
    json_to_sheet(data: Record<string, unknown>[]): XLSXSheet {
      if (!data || data.length === 0) return [[]];
      
      const headers = Object.keys(data[0]);
      const rows: unknown[][] = [headers];
      
      data.slice(0, MAX_ROWS).forEach(item => {
        const row = headers.map(h => {
          const val = item[h];
          return val !== undefined && val !== null ? val : '';
        });
        rows.push(row);
      });
      
      return rows;
    },

    /**
     * Convert array of arrays to sheet
     */
    aoa_to_sheet(data: unknown[][]): XLSXSheet {
      return data.slice(0, MAX_ROWS);
    },

    /**
     * Append sheet to workbook
     */
    book_append_sheet(workbook: XLSXWorkbook, sheet: XLSXSheet, name: string): void {
      const safeName = name.substring(0, 31);
      workbook.SheetNames.push(safeName);
      workbook.Sheets[safeName] = sheet;
      
      // Also add to the internal ExcelJS workbook
      if (workbook._exceljs) {
        const ws = workbook._exceljs.addWorksheet(safeName);
        sheet.forEach((row, idx) => {
          ws.addRow(row);
          if (idx === 0) {
            const headerRow = ws.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' }
            };
          }
        });
        // Auto-fit columns
        if (sheet.length > 0) {
          const maxCols = Math.max(...sheet.map(r => r.length));
          for (let i = 0; i < maxCols; i++) {
            let maxLen = 10;
            sheet.forEach(row => {
              const len = row[i]?.toString().length || 0;
              if (len > maxLen) maxLen = len;
            });
            ws.getColumn(i + 1).width = Math.min(maxLen + 2, 50);
          }
        }
      }
    },

    /**
     * Convert sheet to CSV string
     */
    sheet_to_csv(sheet: XLSXSheet): string {
      if (!Array.isArray(sheet)) return '';
      return sheet.map(row => 
        row.map(cell => {
          const str = cell?.toString() || '';
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ).join('\n');
    },

    /**
     * Convert sheet to JSON array
     */
    sheet_to_json<T = Record<string, unknown>>(sheet: XLSXSheet, options?: { header?: number | 1 }): T[] {
      if (!Array.isArray(sheet) || sheet.length === 0) return [];
      
      const result: T[] = [];
      const headers = sheet[0] as string[];
      
      for (let i = 1; i < sheet.length; i++) {
        const row = sheet[i];
        if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) continue;
        
        const obj: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          const key = header?.toString() || `col_${idx}`;
          obj[key] = row[idx] !== undefined ? row[idx] : '';
        });
        result.push(obj as T);
      }
      
      return result;
    }
  },

  /**
   * Read Excel file from ArrayBuffer
   */
  read(data: ArrayBuffer, options?: { type?: string }): XLSXWorkbook {
    // This is synchronous in original xlsx, but we need to return something
    // For compatibility, we create an empty workbook that can be populated async
    const wb: XLSXWorkbook = {
      SheetNames: [],
      Sheets: {},
      _exceljs: undefined
    };
    
    // Store reference to load later
    const workbook = new ExcelJS.Workbook();
    
    // Load asynchronously and update the workbook object
    workbook.xlsx.load(data).then(() => {
      wb._exceljs = workbook;
      workbook.worksheets.forEach(ws => {
        wb.SheetNames.push(ws.name);
        const rows: unknown[][] = [];
        ws.eachRow((row) => {
          const rowData: unknown[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
              value = (value as ExcelJS.CellFormulaValue).result;
            }
            if (value && typeof value === 'object' && 'richText' in value) {
              value = (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('');
            }
            rowData[colNumber - 1] = value ?? '';
          });
          rows.push(rowData);
        });
        wb.Sheets[ws.name] = rows;
      });
    });
    
    return wb;
  },

  /**
   * Write workbook to file (triggers download)
   */
  writeFile(workbook: XLSXWorkbook, filename: string): void {
    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    
    if (workbook._exceljs) {
      workbook._exceljs.xlsx.writeBuffer().then(buffer => {
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
      });
    } else {
      // Fallback: create ExcelJS workbook from sheet data
      const wb = new ExcelJS.Workbook();
      workbook.SheetNames.forEach(name => {
        const sheetData = workbook.Sheets[name];
        if (Array.isArray(sheetData)) {
          const ws = wb.addWorksheet(name);
          sheetData.forEach((row, idx) => {
            ws.addRow(row);
            if (idx === 0) {
              const headerRow = ws.getRow(1);
              headerRow.font = { bold: true };
            }
          });
        }
      });
      
      wb.xlsx.writeBuffer().then(buffer => {
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
      });
    }
  }
};

/**
 * Async version of XLSX.read for proper handling
 */
export async function xlsxReadAsync(data: ArrayBuffer): Promise<XLSXWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  
  const wb: XLSXWorkbook = {
    SheetNames: [],
    Sheets: {},
    _exceljs: workbook
  };
  
  workbook.worksheets.forEach(ws => {
    wb.SheetNames.push(ws.name);
    const rows: unknown[][] = [];
    ws.eachRow((row) => {
      const rowData: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let value = cell.value;
        if (value && typeof value === 'object' && 'result' in value) {
          value = (value as ExcelJS.CellFormulaValue).result;
        }
        if (value && typeof value === 'object' && 'richText' in value) {
          value = (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('');
        }
        rowData[colNumber - 1] = value ?? '';
      });
      rows.push(rowData);
    });
    wb.Sheets[ws.name] = rows;
  });
  
  return wb;
}
