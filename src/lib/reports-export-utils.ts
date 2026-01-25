import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BOQItem {
  item_number?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface AnalysisData {
  items?: BOQItem[];
  summary?: {
    total_value?: number;
    currency?: string;
    total_items?: number;
  };
}

// Export BOQ to Excel with RTL support
export const exportBOQToExcel = async (items: BOQItem[], projectName: string, isArabic = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BOQ', {
    views: [{ rightToLeft: isArabic }]
  });

  // Header row with proper font for Arabic
  worksheet.columns = [
    { header: isArabic ? 'رقم البند' : 'Item No.', key: 'item_number', width: 12 },
    { header: isArabic ? 'الوصف' : 'Description', key: 'description', width: 50 },
    { header: isArabic ? 'الوحدة' : 'Unit', key: 'unit', width: 10 },
    { header: isArabic ? 'الكمية' : 'Quantity', key: 'quantity', width: 12 },
    { header: isArabic ? 'سعر الوحدة' : 'Unit Price', key: 'unit_price', width: 15 },
    { header: isArabic ? 'الإجمالي' : 'Total Price', key: 'total_price', width: 18 },
  ];

  // Style header with Arabic-compatible font
  worksheet.getRow(1).font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).alignment = { horizontal: isArabic ? 'right' : 'left', vertical: 'middle' };

  // Add data with proper font
  items.forEach((item) => {
    const row = worksheet.addRow({
      item_number: item.item_number || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || (item.quantity || 0) * (item.unit_price || 0),
    });
    row.font = { name: 'Arial', size: 10 };
    row.alignment = { horizontal: isArabic ? 'right' : 'left', vertical: 'middle' };
  });

  // Calculate total
  const totalValue = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);

  // Add total row
  const totalRow = worksheet.addRow({
    item_number: '',
    description: isArabic ? 'الإجمالي' : 'TOTAL',
    unit: '',
    quantity: '',
    unit_price: '',
    total_price: totalValue,
  });
  totalRow.font = { bold: true, name: 'Arial', size: 11 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };
  totalRow.alignment = { horizontal: isArabic ? 'right' : 'left', vertical: 'middle' };

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_BOQ.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export Enhanced BOQ to Excel with bilingual support and RTL
export const exportEnhancedBOQToExcel = async (
  items: BOQItem[], 
  projectName: string, 
  language: 'en' | 'ar' | 'both'
) => {
  const workbook = new ExcelJS.Workbook();
  const isRTL = language === 'ar';
  const worksheet = workbook.addWorksheet('Enhanced BOQ', {
    views: [{ rightToLeft: isRTL }]
  });

  const headers = {
    en: ['Item No.', 'Description', 'Unit', 'Quantity', 'Unit Price', 'Total Price', 'Category'],
    ar: ['رقم البند', 'الوصف', 'الوحدة', 'الكمية', 'سعر الوحدة', 'السعر الإجمالي', 'القسم'],
  };

  const selectedHeaders = language === 'both' 
    ? headers.en.map((h, i) => `${h} / ${headers.ar[i]}`)
    : headers[language];

  worksheet.columns = [
    { header: selectedHeaders[0], key: 'item_number', width: 12 },
    { header: selectedHeaders[1], key: 'description', width: 50 },
    { header: selectedHeaders[2], key: 'unit', width: 10 },
    { header: selectedHeaders[3], key: 'quantity', width: 12 },
    { header: selectedHeaders[4], key: 'unit_price', width: 15 },
    { header: selectedHeaders[5], key: 'total_price', width: 18 },
    { header: selectedHeaders[6], key: 'category', width: 20 },
  ];

  // Style header with Arabic-compatible font
  worksheet.getRow(1).font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };

  // Group by category
  const groupedItems = items.reduce((acc: Record<string, BOQItem[]>, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Add items with category subtotals
  Object.entries(groupedItems).forEach(([category, categoryItems]) => {
    categoryItems.forEach((item) => {
      const row = worksheet.addRow({
        item_number: item.item_number || '',
        description: item.description || '',
        unit: item.unit || '',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || (item.quantity || 0) * (item.unit_price || 0),
        category: category,
      });
      row.font = { name: 'Arial', size: 10 };
      row.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };
    });

    // Subtotal for category
    const subtotal = categoryItems.reduce((sum, item) => 
      sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);
    
    const subtotalRow = worksheet.addRow({
      item_number: '',
      description: language === 'ar' ? `المجموع الفرعي - ${category}` : `Subtotal - ${category}`,
      unit: '',
      quantity: '',
      unit_price: '',
      total_price: subtotal,
      category: '',
    });
    subtotalRow.font = { bold: true, italic: true, name: 'Arial', size: 10 };
    subtotalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    subtotalRow.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };
  });

  // Grand total
  const grandTotal = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);
  
  const totalRow = worksheet.addRow({
    item_number: '',
    description: language === 'ar' ? 'المجموع الكلي' : 'GRAND TOTAL',
    unit: '',
    quantity: '',
    unit_price: '',
    total_price: grandTotal,
    category: '',
  });
  totalRow.font = { bold: true, size: 12, name: 'Arial' };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };
  totalRow.alignment = { horizontal: isRTL ? 'right' : 'left', vertical: 'middle' };

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_Enhanced_BOQ_${language}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export Tender Summary to Excel
export const exportTenderSummaryToExcel = async (analysisData: AnalysisData, projectName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tender Summary');

  const items = analysisData.items || [];
  const summary = analysisData.summary || {};

  // Title
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = `Tender Summary - ${projectName}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Summary info
  worksheet.addRow([]);
  worksheet.addRow(['Project Name:', projectName]);
  worksheet.addRow(['Total Items:', items.length]);
  worksheet.addRow(['Total Value:', summary.total_value || 0]);
  worksheet.addRow(['Currency:', summary.currency || 'SAR']);
  worksheet.addRow([]);

  // Category breakdown
  worksheet.addRow(['Category Breakdown']);
  worksheet.getRow(worksheet.rowCount).font = { bold: true };

  const groupedItems = items.reduce((acc: Record<string, number>, item) => {
    const category = item.category || 'Uncategorized';
    const value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    acc[category] = (acc[category] || 0) + value;
    return acc;
  }, {});

  Object.entries(groupedItems).forEach(([category, value]) => {
    worksheet.addRow([category, value]);
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_Tender_Summary.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export Tender Summary to PDF using HTML-to-Print for Arabic support
export const exportTenderSummaryToPDF = (analysisData: AnalysisData, projectName: string, isArabic = false) => {
  const items = analysisData.items || [];
  const summary = analysisData.summary || {};
  
  // Category breakdown
  const groupedItems = items.reduce((acc: Record<string, { count: number; value: number }>, item) => {
    const category = item.category || 'Uncategorized';
    const value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    if (!acc[category]) acc[category] = { count: 0, value: 0 };
    acc[category].count++;
    acc[category].value += value;
    return acc;
  }, {});

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - Tender Summary</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', 'Segoe UI', sans-serif; box-sizing: border-box; }
        body { 
          direction: ${isArabic ? 'rtl' : 'ltr'}; 
          text-align: ${isArabic ? 'right' : 'left'}; 
          padding: 30px;
          color: #1e293b;
        }
        h1 { text-align: center; color: #3b82f6; margin-bottom: 5px; }
        h2 { text-align: center; color: #64748b; font-weight: normal; margin-bottom: 30px; }
        .summary-box {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 25px;
        }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .summary-row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4472C4; color: white; padding: 12px; text-align: ${isArabic ? 'right' : 'left'}; }
        td { border: 1px solid #e2e8f0; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; }
        tr:nth-child(even) { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>${isArabic ? 'ملخص العطاء' : 'Tender Summary'}</h1>
      <h2>${projectName}</h2>
      
      <div class="summary-box">
        <div class="summary-row">
          <span class="label">${isArabic ? 'إجمالي البنود' : 'Total Items'}</span>
          <span class="value">${items.length}</span>
        </div>
        <div class="summary-row">
          <span class="label">${isArabic ? 'إجمالي القيمة' : 'Total Value'}</span>
          <span class="value">${new Intl.NumberFormat('en-US').format(summary.total_value || 0)} ${summary.currency || 'SAR'}</span>
        </div>
      </div>
      
      <h3>${isArabic ? 'توزيع الفئات' : 'Category Breakdown'}</h3>
      <table>
        <thead>
          <tr>
            <th>${isArabic ? 'الفئة' : 'Category'}</th>
            <th>${isArabic ? 'عدد البنود' : 'Items'}</th>
            <th>${isArabic ? 'القيمة' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(groupedItems).map(([category, data]) => `
            <tr>
              <td>${category}</td>
              <td>${data.count}</td>
              <td>${new Intl.NumberFormat('en-US').format(data.value)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

// Export Price Analysis to Excel
export const exportPriceAnalysisToExcel = async (items: BOQItem[], projectName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Price Analysis');

  worksheet.columns = [
    { header: 'Item No.', key: 'item_number', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit Price', key: 'unit_price', width: 15 },
    { header: 'Total Price', key: 'total_price', width: 18 },
    { header: 'Price per Unit %', key: 'price_percentage', width: 15 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const grandTotal = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);

  items.forEach((item) => {
    const totalPrice = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    const percentage = grandTotal > 0 ? ((totalPrice / grandTotal) * 100).toFixed(2) + '%' : '0%';
    
    worksheet.addRow({
      item_number: item.item_number || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: totalPrice,
      price_percentage: percentage,
    });
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}_Price_Analysis.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
