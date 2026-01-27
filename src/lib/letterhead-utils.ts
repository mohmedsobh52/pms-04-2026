/**
 * Letterhead Utilities
 * 
 * This module provides unified letterhead/branding functions for all exports
 * (PDF, Excel, Word) with company header and footer support.
 */

import jsPDF from 'jspdf';
import * as ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { getCompanySettings } from '@/hooks/useCompanySettings';
import { getStoredLogo } from '@/components/CompanyLogoUpload';
import alimtyazLogo from '@/assets/company/alimtyaz-logo.jpg';

export interface LetterheadConfig {
  headerHeight: number;
  footerHeight: number;
  logoPath: string;
  companyNameAr: string;
  companyNameEn: string;
  contactInfo: {
    phone: string;
    fax: string;
    email: string;
    website: string;
    address: string;
    city: string;
    country: string;
    crNumber: string;
    poBox: string;
    postCode: string;
  };
}

/**
 * Get letterhead configuration from company settings
 */
export function getLetterheadConfig(): LetterheadConfig {
  const settings = getCompanySettings();
  
  return {
    headerHeight: 40,
    footerHeight: 30,
    logoPath: alimtyazLogo,
    companyNameAr: settings.companyNameAr || 'الإمتياز الوطنية للمقاولات',
    companyNameEn: settings.companyNameEn || 'AL IMTYAZ ALWATANIYA CONT.',
    contactInfo: {
      phone: settings.phone || '+966-12-677-3822',
      fax: settings.phone || '+966-12-677-3822',
      email: settings.email || 'contact@imtyaz.sa',
      website: settings.website || 'www.imtyaz.sa',
      address: settings.address || 'P.O.Box 24610 Post Code 21456',
      city: settings.city || 'Jeddah',
      country: settings.country || 'Kingdom of Saudi Arabia',
      crNumber: settings.crNumber || '181551',
      poBox: 'P.O.Box 24610',
      postCode: '21456',
    },
  };
}

/**
 * Generate QR Code as Data URL for website
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(`https://${url.replace(/^https?:\/\//, '')}`, {
      width: 80,
      margin: 1,
      color: {
        dark: '#1E40AF',
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

/**
 * Add letterhead header to PDF document
 */
export function addPDFLetterheadHeader(doc: jsPDF): number {
  const config = getLetterheadConfig();
  const pageWidth = doc.internal.pageSize.width;
  const companyLogo = getStoredLogo();
  
  // Background white for header
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 38, 'F');
  
  // English name (left) - Times New Roman, italic
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // #1E293B
  doc.text(config.companyNameEn, 15, 18);
  
  // Logo (center) - Use stored logo or default
  try {
    const logoToUse = companyLogo || config.logoPath;
    if (logoToUse) {
      const logoWidth = 28;
      const logoHeight = 24;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoToUse, 'JPEG', logoX, 8, logoWidth, logoHeight);
    }
  } catch (e) {
    console.error('Error adding logo to PDF:', e);
  }
  
  // Arabic name (right) - Bold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  // For RTL Arabic text, we place it at the right side
  doc.text(config.companyNameAr, pageWidth - 15, 18, { align: 'right' });
  
  // Blue line separator
  doc.setDrawColor(30, 64, 175); // #1E40AF
  doc.setLineWidth(0.8);
  doc.line(10, 36, pageWidth - 10, 36);
  
  return 42; // Return Y position where content should start
}

/**
 * Add letterhead footer to PDF document (without QR code for simpler implementation)
 */
export function addPDFLetterheadFooter(doc: jsPDF, pageNum?: number, totalPages?: number): void {
  const config = getLetterheadConfig();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerStartY = pageHeight - 28;
  
  // Blue line separator at top of footer
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(10, footerStartY, pageWidth - 10, footerStartY);
  
  // Footer background
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.rect(0, footerStartY + 1, pageWidth, 27, 'F');
  
  // Contact info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105); // #475569
  
  const col1X = 15;
  const col2X = 80;
  const col3X = 145;
  
  // Column 1: Phone & Fax
  doc.text(`📞 ${config.contactInfo.phone}`, col1X, footerStartY + 8);
  doc.text(`📠 ${config.contactInfo.fax}`, col1X, footerStartY + 14);
  
  // Column 2: Email & Website
  doc.text(`📧 ${config.contactInfo.email}`, col2X, footerStartY + 8);
  doc.text(`🌐 ${config.contactInfo.website}`, col2X, footerStartY + 14);
  
  // Column 3: Address
  doc.text(`📍 ${config.contactInfo.city}, ${config.contactInfo.country}`, col3X, footerStartY + 8);
  doc.text(`${config.contactInfo.address} J.C.C ${config.contactInfo.crNumber}`, col3X, footerStartY + 14);
  
  // Page number (if provided)
  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${pageNum} / ${totalPages}`, pageWidth / 2, footerStartY + 22, { align: 'center' });
  }
}

/**
 * Add letterhead footer with QR code to PDF (async version)
 */
export async function addPDFLetterheadFooterWithQR(doc: jsPDF, pageNum?: number, totalPages?: number): Promise<void> {
  const config = getLetterheadConfig();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerStartY = pageHeight - 28;
  
  // Blue line separator at top of footer
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(10, footerStartY, pageWidth - 10, footerStartY);
  
  // Footer background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, footerStartY + 1, pageWidth, 27, 'F');
  
  // Contact info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  
  const col1X = 15;
  const col2X = 75;
  const col3X = 135;
  
  // Column 1: Phone & Fax
  doc.text(`📞 ${config.contactInfo.phone}`, col1X, footerStartY + 8);
  doc.text(`📠 ${config.contactInfo.fax}`, col1X, footerStartY + 14);
  
  // Column 2: Email & Website
  doc.text(`📧 ${config.contactInfo.email}`, col2X, footerStartY + 8);
  doc.text(`🌐 ${config.contactInfo.website}`, col2X, footerStartY + 14);
  
  // Column 3: Address
  doc.text(`📍 ${config.contactInfo.city}, ${config.contactInfo.country}`, col3X, footerStartY + 8);
  doc.text(`${config.contactInfo.address} J.C.C ${config.contactInfo.crNumber}`, col3X, footerStartY + 14);
  
  // QR Code (right side)
  try {
    const qrDataUrl = await generateQRCodeDataUrl(config.contactInfo.website);
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', pageWidth - 28, footerStartY + 3, 18, 18);
    }
  } catch (e) {
    console.error('Error adding QR to footer:', e);
  }
  
  // Page number (if provided)
  if (pageNum !== undefined && totalPages !== undefined) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${pageNum} / ${totalPages}`, pageWidth / 2, footerStartY + 22, { align: 'center' });
  }
}

/**
 * Add letterhead to all pages of a PDF document
 */
export function applyLetterheadToAllPages(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPDFLetterheadHeader(doc);
    addPDFLetterheadFooter(doc, i, pageCount);
  }
}

/**
 * Add company header to Excel worksheet (enhanced version)
 */
export async function addExcelLetterhead(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet
): Promise<number> {
  const config = getLetterheadConfig();
  const companyLogo = getStoredLogo();
  
  // Row 1: Company header
  worksheet.mergeCells('A1:B1');
  worksheet.getCell('A1').value = config.companyNameEn;
  worksheet.getCell('A1').font = { 
    bold: true, 
    italic: true, 
    name: 'Times New Roman', 
    size: 12, 
    color: { argb: 'FF1E293B' } 
  };
  worksheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };
  
  worksheet.mergeCells('E1:F1');
  worksheet.getCell('E1').value = config.companyNameAr;
  worksheet.getCell('E1').font = { 
    bold: true, 
    name: 'Arial', 
    size: 14, 
    color: { argb: 'FF1E293B' } 
  };
  worksheet.getCell('E1').alignment = { horizontal: 'right', vertical: 'middle' };
  
  // Add logo in center if available
  if (companyLogo) {
    try {
      const base64Data = companyLogo.split(',')[1];
      const extension = companyLogo.includes('image/png') ? 'png' : 'jpeg';
      const imageId = workbook.addImage({
        base64: base64Data,
        extension: extension as 'png' | 'jpeg',
      });
      worksheet.addImage(imageId, {
        tl: { col: 2.5, row: 0.2 },
        ext: { width: 80, height: 40 }
      });
    } catch (e) {
      console.error('Error adding logo to Excel:', e);
    }
  }
  
  worksheet.getRow(1).height = 45;
  
  // Row 2: Blue separator line
  worksheet.getRow(2).height = 5;
  ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2'].forEach(cell => {
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
  });
  
  // Row 3: Empty row for spacing
  worksheet.getRow(3).height = 15;
  
  return 4; // Data starts at row 4
}

/**
 * Add footer to Excel worksheet
 */
export function addExcelLetterheadFooter(worksheet: ExcelJS.Worksheet, lastRow: number): void {
  const config = getLetterheadConfig();
  const footerRow = lastRow + 2;
  
  // Separator line
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
    worksheet.getCell(`${col}${footerRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
  });
  worksheet.getRow(footerRow).height = 3;
  
  // Contact info row
  const contactRow = footerRow + 1;
  worksheet.mergeCells(`A${contactRow}:H${contactRow}`);
  worksheet.getCell(`A${contactRow}`).value = 
    `📞 ${config.contactInfo.phone} | 📧 ${config.contactInfo.email} | 🌐 ${config.contactInfo.website} | 📍 ${config.contactInfo.city}, ${config.contactInfo.country} ${config.contactInfo.address} J.C.C ${config.contactInfo.crNumber}`;
  worksheet.getCell(`A${contactRow}`).font = { 
    size: 9, 
    color: { argb: 'FF64748B' } 
  };
  worksheet.getCell(`A${contactRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(contactRow).height = 20;
}

// Export logo for direct use
export { alimtyazLogo };
