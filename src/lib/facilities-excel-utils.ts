import ExcelJS from 'exceljs';
import type { Facility } from '@/components/tender/FacilitiesTab';

const FACILITY_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  office: { ar: "مكتب", en: "Office" },
  storage: { ar: "تخزين", en: "Storage" },
  accommodation: { ar: "سكن", en: "Accommodation" },
  workshop: { ar: "ورشة", en: "Workshop" },
  utility: { ar: "خدمات", en: "Utility" },
  security: { ar: "أمن", en: "Security" },
  parking: { ar: "مواقف", en: "Parking" },
  other: { ar: "أخرى", en: "Other" },
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  active: { ar: "نشط", en: "Active" },
  pending: { ar: "معلق", en: "Pending" },
  expired: { ar: "منتهي", en: "Expired" },
};

export async function exportFacilitiesToExcel(facilities: Facility[], isArabic: boolean): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMS System';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet(isArabic ? 'المرافق' : 'Facilities', {
    views: [{ rightToLeft: isArabic }]
  });

  // Define columns
  worksheet.columns = [
    { header: isArabic ? 'الاسم (عربي)' : 'Name (Arabic)', key: 'name', width: 25 },
    { header: isArabic ? 'الاسم (إنجليزي)' : 'Name (English)', key: 'nameEn', width: 25 },
    { header: isArabic ? 'نوع المرفق' : 'Facility Type', key: 'facilityType', width: 15 },
    { header: isArabic ? 'نوع التكلفة' : 'Cost Type', key: 'type', width: 12 },
    { header: isArabic ? 'المورد' : 'Supplier', key: 'supplier', width: 25 },
    { header: isArabic ? 'رقم العقد' : 'Contract #', key: 'contractNumber', width: 18 },
    { header: isArabic ? 'الحالة' : 'Status', key: 'status', width: 12 },
    { header: isArabic ? 'تاريخ البداية' : 'Start Date', key: 'startDate', width: 14 },
    { header: isArabic ? 'تكلفة الوحدة' : 'Unit Cost', key: 'unitCost', width: 14 },
    { header: isArabic ? 'الكمية' : 'Quantity', key: 'quantity', width: 10 },
    { header: isArabic ? 'المدة (شهر)' : 'Duration (months)', key: 'duration', width: 12 },
    { header: isArabic ? 'التكلفة الشهرية' : 'Monthly Cost', key: 'monthlyCost', width: 14 },
    { header: isArabic ? 'تكلفة التركيب' : 'Installation Cost', key: 'installationCost', width: 14 },
    { header: isArabic ? 'الإجمالي' : 'Total', key: 'total', width: 14 },
    { header: isArabic ? 'الوصف' : 'Description', key: 'description', width: 30 },
    { header: isArabic ? 'ملاحظات' : 'Notes', key: 'notes', width: 30 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Add data rows
  facilities.forEach((f, index) => {
    const facilityTypeLabel = FACILITY_TYPE_LABELS[f.facilityType] || { ar: f.facilityType, en: f.facilityType };
    const statusLabel = STATUS_LABELS[f.status] || { ar: f.status, en: f.status };
    
    const row = worksheet.addRow({
      name: f.name,
      nameEn: f.nameEn,
      facilityType: isArabic ? facilityTypeLabel.ar : facilityTypeLabel.en,
      type: f.type === 'rent' ? (isArabic ? 'إيجار' : 'Rent') : (isArabic ? 'شراء' : 'Purchase'),
      supplier: f.supplier || '',
      contractNumber: f.contractNumber || '',
      status: isArabic ? statusLabel.ar : statusLabel.en,
      startDate: f.startDate || '',
      unitCost: f.unitCost,
      quantity: f.quantity,
      duration: f.duration,
      monthlyCost: f.monthlyCost || 0,
      installationCost: f.installationCost || 0,
      total: f.total,
      description: isArabic ? f.descriptionAr : f.description,
      notes: f.notes || '',
    });

    // Alternate row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
    }

    // Format currency columns
    ['unitCost', 'monthlyCost', 'installationCost', 'total'].forEach(key => {
      const cell = row.getCell(key);
      cell.numFmt = '#,##0';
    });
  });

  // Add totals row
  const totalsRow = worksheet.addRow({
    name: isArabic ? 'الإجمالي' : 'TOTAL',
    nameEn: '',
    facilityType: '',
    type: '',
    supplier: '',
    contractNumber: '',
    status: '',
    startDate: '',
    unitCost: '',
    quantity: facilities.reduce((sum, f) => sum + f.quantity, 0),
    duration: '',
    monthlyCost: facilities.reduce((sum, f) => sum + (f.monthlyCost || 0), 0),
    installationCost: facilities.reduce((sum, f) => sum + (f.installationCost || 0), 0),
    total: facilities.reduce((sum, f) => sum + f.total, 0),
    description: '',
    notes: '',
  });

  totalsRow.font = { bold: true };
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }
  };

  // Format totals currency
  ['monthlyCost', 'installationCost', 'total'].forEach(key => {
    const cell = totalsRow.getCell(key);
    cell.numFmt = '#,##0';
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: facilities.length + 1, column: 16 }
  };

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: isArabic }];

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `facilities_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importFacilitiesFromExcel(file: File): Promise<Facility[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the Excel file');
  }

  const facilities: Facility[] = [];
  
  // Get header row to map columns
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value?.toString().toLowerCase() || '';
  });

  // Process data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    // Skip empty rows or total rows
    const firstCell = row.getCell(1).value?.toString() || '';
    if (!firstCell || firstCell.toLowerCase().includes('total') || firstCell.includes('الإجمالي')) {
      return;
    }

    const getCellValue = (colIndex: number): string => {
      const value = row.getCell(colIndex).value;
      if (value === null || value === undefined) return '';
      if (typeof value === 'object' && 'text' in value) return value.text || '';
      return value.toString();
    };

    const getNumericValue = (colIndex: number): number => {
      const value = row.getCell(colIndex).value;
      if (value === null || value === undefined) return 0;
      const num = typeof value === 'number' ? value : parseFloat(value.toString());
      return isNaN(num) ? 0 : num;
    };

    // Determine facility type from text
    const facilityTypeText = getCellValue(3).toLowerCase();
    let facilityType = 'other';
    if (facilityTypeText.includes('مكتب') || facilityTypeText.includes('office')) facilityType = 'office';
    else if (facilityTypeText.includes('تخزين') || facilityTypeText.includes('storage')) facilityType = 'storage';
    else if (facilityTypeText.includes('سكن') || facilityTypeText.includes('accommodation')) facilityType = 'accommodation';
    else if (facilityTypeText.includes('ورشة') || facilityTypeText.includes('workshop')) facilityType = 'workshop';
    else if (facilityTypeText.includes('خدمات') || facilityTypeText.includes('utility')) facilityType = 'utility';
    else if (facilityTypeText.includes('أمن') || facilityTypeText.includes('security')) facilityType = 'security';
    else if (facilityTypeText.includes('مواقف') || facilityTypeText.includes('parking')) facilityType = 'parking';

    // Determine cost type
    const typeText = getCellValue(4).toLowerCase();
    const type: 'rent' | 'purchase' = 
      typeText.includes('rent') || typeText.includes('إيجار') ? 'rent' : 'purchase';

    // Determine status
    const statusText = getCellValue(7).toLowerCase();
    let status: 'active' | 'pending' | 'expired' = 'active';
    if (statusText.includes('pending') || statusText.includes('معلق')) status = 'pending';
    else if (statusText.includes('expired') || statusText.includes('منتهي')) status = 'expired';

    const unitCost = getNumericValue(9);
    const quantity = getNumericValue(10) || 1;
    const duration = getNumericValue(11) || 12;
    const installationCost = getNumericValue(13);
    
    // Calculate total if not provided
    let total = getNumericValue(14);
    if (total === 0) {
      total = type === 'rent' 
        ? (unitCost * quantity * duration) + installationCost
        : (unitCost * quantity) + installationCost;
    }

    const monthlyCost = type === 'rent' ? unitCost * quantity : 0;

    const facility: Facility = {
      id: `imported-${Date.now()}-${rowNumber}`,
      name: getCellValue(1) || `مرفق ${rowNumber}`,
      nameEn: getCellValue(2) || `Facility ${rowNumber}`,
      facilityType,
      type,
      description: getCellValue(15),
      descriptionAr: getCellValue(15),
      unitCost,
      quantity,
      duration,
      total,
      notes: getCellValue(16),
      supplier: getCellValue(5),
      contractNumber: getCellValue(6),
      startDate: getCellValue(8),
      status,
      installationCost,
      monthlyCost,
    };

    facilities.push(facility);
  });

  return facilities;
}

export function generateFacilitiesTemplate(isArabic: boolean): void {
  // Create a template file for users to fill in
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(isArabic ? 'قالب المرافق' : 'Facilities Template', {
    views: [{ rightToLeft: isArabic }]
  });

  worksheet.columns = [
    { header: isArabic ? 'الاسم (عربي)' : 'Name (Arabic)', key: 'name', width: 25 },
    { header: isArabic ? 'الاسم (إنجليزي)' : 'Name (English)', key: 'nameEn', width: 25 },
    { header: isArabic ? 'نوع المرفق' : 'Facility Type', key: 'facilityType', width: 15 },
    { header: isArabic ? 'نوع التكلفة (إيجار/شراء)' : 'Cost Type (Rent/Purchase)', key: 'type', width: 18 },
    { header: isArabic ? 'المورد' : 'Supplier', key: 'supplier', width: 25 },
    { header: isArabic ? 'رقم العقد' : 'Contract Number', key: 'contractNumber', width: 18 },
    { header: isArabic ? 'الحالة' : 'Status', key: 'status', width: 12 },
    { header: isArabic ? 'تاريخ البداية' : 'Start Date', key: 'startDate', width: 14 },
    { header: isArabic ? 'تكلفة الوحدة' : 'Unit Cost', key: 'unitCost', width: 14 },
    { header: isArabic ? 'الكمية' : 'Quantity', key: 'quantity', width: 10 },
    { header: isArabic ? 'المدة (شهر)' : 'Duration (months)', key: 'duration', width: 12 },
    { header: isArabic ? 'تكلفة التركيب' : 'Installation Cost', key: 'installationCost', width: 14 },
    { header: isArabic ? 'الوصف' : 'Description', key: 'description', width: 30 },
    { header: isArabic ? 'ملاحظات' : 'Notes', key: 'notes', width: 30 },
  ];

  // Style header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  };

  // Add example row
  worksheet.addRow({
    name: 'مكتب الموقع',
    nameEn: 'Site Office',
    facilityType: isArabic ? 'مكتب' : 'Office',
    type: isArabic ? 'إيجار' : 'Rent',
    supplier: 'شركة الحاويات',
    contractNumber: 'CONT-001',
    status: isArabic ? 'نشط' : 'Active',
    startDate: '2024-01-01',
    unitCost: 5000,
    quantity: 1,
    duration: 12,
    installationCost: 2000,
    description: 'مكتب إدارة الموقع',
    notes: '',
  });

  // Add data validation notes
  const notesSheet = workbook.addWorksheet(isArabic ? 'ملاحظات' : 'Notes');
  notesSheet.getCell('A1').value = isArabic ? 'ملاحظات الاستخدام:' : 'Usage Notes:';
  notesSheet.getCell('A2').value = isArabic 
    ? 'أنواع المرافق: مكتب، تخزين، سكن، ورشة، خدمات، أمن، مواقف، أخرى'
    : 'Facility Types: Office, Storage, Accommodation, Workshop, Utility, Security, Parking, Other';
  notesSheet.getCell('A3').value = isArabic
    ? 'نوع التكلفة: إيجار أو شراء'
    : 'Cost Type: Rent or Purchase';
  notesSheet.getCell('A4').value = isArabic
    ? 'الحالة: نشط، معلق، منتهي'
    : 'Status: Active, Pending, Expired';

  // Download
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facilities_template.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}
