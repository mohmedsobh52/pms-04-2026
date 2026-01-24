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

// Export BOQ to Excel
export const exportBOQToExcel = async (items: BOQItem[], projectName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BOQ');

  // Header row
  worksheet.columns = [
    { header: 'Item No.', key: 'item_number', width: 12 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit Price', key: 'unit_price', width: 15 },
    { header: 'Total Price', key: 'total_price', width: 18 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data
  items.forEach((item) => {
    worksheet.addRow({
      item_number: item.item_number || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || (item.quantity || 0) * (item.unit_price || 0),
    });
  });

  // Calculate total
  const totalValue = items.reduce((sum, item) => 
    sum + (item.total_price || (item.quantity || 0) * (item.unit_price || 0)), 0);

  // Add total row
  const totalRow = worksheet.addRow({
    item_number: '',
    description: 'TOTAL',
    unit: '',
    quantity: '',
    unit_price: '',
    total_price: totalValue,
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };

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

// Export Enhanced BOQ to Excel with bilingual support
export const exportEnhancedBOQToExcel = async (
  items: BOQItem[], 
  projectName: string, 
  language: 'en' | 'ar' | 'both'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Enhanced BOQ');

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

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

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
      worksheet.addRow({
        item_number: item.item_number || '',
        description: item.description || '',
        unit: item.unit || '',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || (item.quantity || 0) * (item.unit_price || 0),
        category: category,
      });
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
    subtotalRow.font = { bold: true, italic: true };
    subtotalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
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
  totalRow.font = { bold: true, size: 12 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };

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

// Export Tender Summary to PDF
export const exportTenderSummaryToPDF = (analysisData: AnalysisData, projectName: string) => {
  const doc = new jsPDF();
  const items = analysisData.items || [];
  const summary = analysisData.summary || {};

  // Title
  doc.setFontSize(18);
  doc.text(`Tender Summary`, 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(projectName, 105, 30, { align: 'center' });

  // Summary info
  doc.setFontSize(11);
  doc.text(`Total Items: ${items.length}`, 20, 50);
  doc.text(`Total Value: ${new Intl.NumberFormat().format(summary.total_value || 0)} ${summary.currency || 'SAR'}`, 20, 60);

  // Category breakdown table
  const groupedItems = items.reduce((acc: Record<string, { count: number; value: number }>, item) => {
    const category = item.category || 'Uncategorized';
    const value = item.total_price || (item.quantity || 0) * (item.unit_price || 0);
    if (!acc[category]) acc[category] = { count: 0, value: 0 };
    acc[category].count++;
    acc[category].value += value;
    return acc;
  }, {});

  const tableData = Object.entries(groupedItems).map(([category, data]) => [
    category,
    data.count.toString(),
    new Intl.NumberFormat().format(data.value),
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Category', 'Items', 'Value']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [68, 114, 196] },
  });

  doc.save(`${projectName}_Tender_Summary.pdf`);
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
