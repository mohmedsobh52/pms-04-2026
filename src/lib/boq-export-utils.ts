import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { XLSX } from '@/lib/exceljs-utils';
import { 
  addPDFLetterheadHeader, 
  addPDFLetterheadFooter,
  getLetterheadConfig 
} from '@/lib/letterhead-utils';

interface ComparisonItem {
  itemCode: string;
  description: string;
  tender: {
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  } | null;
  budget: {
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  } | null;
  variance: {
    quantity: number;
    quantityPercent: number;
    rate: number;
    ratePercent: number;
    cost: number;
    costPercent: number;
  };
  status: 'Added' | 'Omitted' | 'Modified' | 'Matched';
  riskFlag: 'High Risk' | 'Opportunity' | 'Neutral';
  matchConfidence: number;
  recommendation?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface CategoryVariance {
  category: string;
  tenderAmount: number;
  budgetAmount: number;
  variance: number;
  variancePercent: number;
  itemCount: number;
}

interface ComparisonResult {
  summary: {
    tenderTotal: number;
    budgetTotal: number;
    totalVariance: number;
    totalVariancePercent: number;
    addedItemsCount: number;
    omittedItemsCount: number;
    modifiedItemsCount: number;
    matchedItemsCount: number;
    highRiskCount: number;
    opportunityCount: number;
  };
  comparisonItems: ComparisonItem[];
  categoryVariances: CategoryVariance[];
  highRiskItems: ComparisonItem[];
  opportunities: ComparisonItem[];
  addedItems: ComparisonItem[];
  omittedItems: ComparisonItem[];
}

// Helper function to sanitize text for PDF (handle Arabic/Unicode)
const sanitizeTextForPDF = (text: string | undefined | null): string => {
  if (!text) return '-';
  const cleaned = text
    .replace(/[\u0600-\u06FF]/g, '') // Remove Arabic characters
    .replace(/[\u0000-\u001F]/g, '') // Remove control characters
    .trim();
  if (!cleaned && text.trim()) {
    return text.replace(/[^\x20-\x7E\d.,\-+×%²³]/g, ' ').replace(/\s+/g, ' ').trim() || text.substring(0, 50);
  }
  return cleaned || '-';
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' SAR';
};

const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

export function exportBOQComparisonToPDF(result: ComparisonResult, projectName?: string): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const currentDate = new Date().toLocaleDateString('en-GB');
  const config = getLetterheadConfig();
  
  // Add letterhead header
  const startY = addPDFLetterheadHeader(doc);
  
  // Title
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ Comparison Report', 14, startY + 5);
  
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tender vs Budget Analysis | ${currentDate}`, 14, startY + 12);
  if (projectName) {
    doc.text(`Project: ${projectName}`, pageWidth - 14, startY + 5, { align: 'right' });
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Summary Section
  let yPos = startY + 22;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPos);
  
  yPos += 8;
  
  // Summary boxes
  const summaryData = [
    ['Tender Total', formatCurrency(result.summary.tenderTotal)],
    ['Budget Total', formatCurrency(result.summary.budgetTotal)],
    ['Total Variance', formatCurrency(result.summary.totalVariance)],
    ['Variance %', formatPercent(result.summary.totalVariancePercent)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: 14 },
    tableWidth: 100,
  });
  
  // Item counts
  const countData = [
    ['Matched Items', result.summary.matchedItemsCount.toString()],
    ['Modified Items', result.summary.modifiedItemsCount.toString()],
    ['Added Items', result.summary.addedItemsCount.toString()],
    ['Omitted Items', result.summary.omittedItemsCount.toString()],
    ['High Risk Items', result.summary.highRiskCount.toString()],
    ['Opportunities', result.summary.opportunityCount.toString()],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Status', 'Count']],
    body: countData,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 130 },
    tableWidth: 80,
  });
  
  // Comparison Details
  doc.addPage();
  yPos = 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Variance Analysis', 14, yPos);
  
  yPos += 10;
  
  const comparisonTableData = result.comparisonItems.map(item => {
    const desc = sanitizeTextForPDF(item.description);
    const truncatedDesc = desc.length > 40 ? desc.substring(0, 40) + '...' : desc;
    return [
      item.itemCode,
      truncatedDesc,
      item.tender ? item.tender.quantity.toString() : '-',
      item.budget ? item.budget.quantity.toString() : '-',
      formatPercent(item.variance.quantityPercent),
      item.tender ? formatCurrency(item.tender.rate) : '-',
      item.budget ? formatCurrency(item.budget.rate) : '-',
      formatPercent(item.variance.ratePercent),
      formatCurrency(item.variance.cost),
      item.status,
      item.priority || '-',
      sanitizeTextForPDF(item.recommendation) || '-',
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Item Code', 'Description', 
      'Tender Qty', 'Budget Qty', 'Qty Var%',
      'Tender Rate', 'Budget Rate', 'Rate Var%',
      'Cost Variance', 'Status', 'Priority', 'Recommendation'
    ]],
    body: comparisonTableData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 7 },
    styles: { fontSize: 6, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 15, halign: 'right' },
      8: { cellWidth: 25, halign: 'right' },
      9: { cellWidth: 18 },
      10: { cellWidth: 15 },
      11: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      // Color code variance cells
      if (data.column.index === 8 && data.section === 'body') {
        const value = result.comparisonItems[data.row.index]?.variance.cost || 0;
        if (value > 0) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (value < 0) {
          data.cell.styles.textColor = [34, 197, 94]; // Green
        }
      }
    },
  });
  
  // High Risk Items Page
  if (result.highRiskItems.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('High Risk Items', 14, yPos);
    doc.setTextColor(0, 0, 0);
    
    yPos += 10;
    
    const riskTableData = result.highRiskItems.map(item => {
      const desc = sanitizeTextForPDF(item.description);
      const truncatedDesc = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
      return [
        item.itemCode,
        truncatedDesc,
        item.tender ? formatCurrency(item.tender.amount) : '-',
        item.budget ? formatCurrency(item.budget.amount) : '-',
        formatCurrency(item.variance.cost),
        formatPercent(item.variance.costPercent),
        sanitizeTextForPDF(item.recommendation) || 'Review required',
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item Code', 'Description', 'Tender Amount', 'Budget Amount', 'Cost Variance', 'Variance %', 'Recommendation']],
      body: riskTableData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      styles: { fontSize: 8 },
    });
  }
  
  // Category Breakdown Page
  doc.addPage();
  yPos = 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Category-wise Variance Breakdown', 14, yPos);
  
  yPos += 10;
  
  const categoryTableData = result.categoryVariances.map(cat => [
    sanitizeTextForPDF(cat.category),
    formatCurrency(cat.tenderAmount),
    formatCurrency(cat.budgetAmount),
    formatCurrency(cat.variance),
    formatPercent(cat.variancePercent),
    cat.itemCount.toString(),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Tender Amount', 'Budget Amount', 'Variance', 'Variance %', 'Items']],
    body: categoryTableData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const value = result.categoryVariances[data.row.index]?.variance || 0;
        if (value > 0) {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (value < 0) {
          data.cell.styles.textColor = [34, 197, 94];
        }
      }
    },
  });
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated by PMS | ${currentDate}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`BOQ_Comparison_Report_${currentDate.replace(/\//g, '-')}.pdf`);
}

export function exportBOQComparisonToExcel(result: ComparisonResult, projectName?: string): void {
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    ['BOQ Comparison Report'],
    ['Generated:', new Date().toLocaleDateString('en-GB')],
    ['Project:', projectName || 'N/A'],
    [''],
    ['Executive Summary'],
    ['Tender Total:', result.summary.tenderTotal],
    ['Budget Total:', result.summary.budgetTotal],
    ['Total Variance:', result.summary.totalVariance],
    ['Variance %:', result.summary.totalVariancePercent],
    [''],
    ['Item Status Summary'],
    ['Matched Items:', result.summary.matchedItemsCount],
    ['Modified Items:', result.summary.modifiedItemsCount],
    ['Added Items:', result.summary.addedItemsCount],
    ['Omitted Items:', result.summary.omittedItemsCount],
    ['High Risk Items:', result.summary.highRiskCount],
    ['Opportunities:', result.summary.opportunityCount],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // All Comparison Items Sheet
  const comparisonHeaders = [
    'Item Code', 'Description', 'Status', 'Risk Flag', 'Priority', 'Recommendation',
    'Tender Qty', 'Tender Unit', 'Tender Rate', 'Tender Amount',
    'Budget Qty', 'Budget Unit', 'Budget Rate', 'Budget Amount',
    'Qty Variance', 'Qty Variance %', 'Rate Variance', 'Rate Variance %',
    'Cost Variance', 'Cost Variance %', 'Match Confidence'
  ];
  
  const comparisonData = result.comparisonItems.map(item => [
    item.itemCode,
    item.description,
    item.status,
    item.riskFlag,
    item.priority || '',
    item.recommendation || '',
    item.tender?.quantity || '',
    item.tender?.unit || '',
    item.tender?.rate || '',
    item.tender?.amount || '',
    item.budget?.quantity || '',
    item.budget?.unit || '',
    item.budget?.rate || '',
    item.budget?.amount || '',
    item.variance.quantity,
    item.variance.quantityPercent,
    item.variance.rate,
    item.variance.ratePercent,
    item.variance.cost,
    item.variance.costPercent,
    item.matchConfidence,
  ]);
  
  const comparisonSheet = XLSX.utils.aoa_to_sheet([comparisonHeaders, ...comparisonData]);
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'All Items');
  
  // Added Items Sheet
  if (result.addedItems.length > 0) {
    const addedHeaders = ['Item Code', 'Description', 'Tender Qty', 'Tender Unit', 'Tender Rate', 'Tender Amount', 'Recommendation'];
    const addedData = result.addedItems.map(item => [
      item.itemCode,
      item.description,
      item.tender?.quantity || '',
      item.tender?.unit || '',
      item.tender?.rate || '',
      item.tender?.amount || '',
      item.recommendation || 'Review scope addition',
    ]);
    const addedSheet = XLSX.utils.aoa_to_sheet([addedHeaders, ...addedData]);
    XLSX.utils.book_append_sheet(workbook, addedSheet, 'Added Items');
  }
  
  // Omitted Items Sheet
  if (result.omittedItems.length > 0) {
    const omittedHeaders = ['Item Code', 'Description', 'Budget Qty', 'Budget Unit', 'Budget Rate', 'Budget Amount', 'Recommendation'];
    const omittedData = result.omittedItems.map(item => [
      item.itemCode,
      item.description,
      item.budget?.quantity || '',
      item.budget?.unit || '',
      item.budget?.rate || '',
      item.budget?.amount || '',
      item.recommendation || 'Verify scope exclusion',
    ]);
    const omittedSheet = XLSX.utils.aoa_to_sheet([omittedHeaders, ...omittedData]);
    XLSX.utils.book_append_sheet(workbook, omittedSheet, 'Omitted Items');
  }
  
  // High Risk Items Sheet
  if (result.highRiskItems.length > 0) {
    const riskHeaders = ['Item Code', 'Description', 'Tender Amount', 'Budget Amount', 'Cost Variance', 'Variance %', 'Priority', 'Recommendation'];
    const riskData = result.highRiskItems.map(item => [
      item.itemCode,
      item.description,
      item.tender?.amount || '',
      item.budget?.amount || '',
      item.variance.cost,
      item.variance.costPercent,
      item.priority || 'High',
      item.recommendation || 'Immediate review required',
    ]);
    const riskSheet = XLSX.utils.aoa_to_sheet([riskHeaders, ...riskData]);
    XLSX.utils.book_append_sheet(workbook, riskSheet, 'High Risk Items');
  }
  
  // Opportunities Sheet
  if (result.opportunities.length > 0) {
    const oppHeaders = ['Item Code', 'Description', 'Tender Amount', 'Budget Amount', 'Savings', 'Savings %', 'Recommendation'];
    const oppData = result.opportunities.map(item => [
      item.itemCode,
      item.description,
      item.tender?.amount || '',
      item.budget?.amount || '',
      Math.abs(item.variance.cost),
      Math.abs(item.variance.costPercent),
      item.recommendation || 'Lock in favorable rate',
    ]);
    const oppSheet = XLSX.utils.aoa_to_sheet([oppHeaders, ...oppData]);
    XLSX.utils.book_append_sheet(workbook, oppSheet, 'Opportunities');
  }
  
  // Categories Sheet
  const catHeaders = ['Category', 'Tender Amount', 'Budget Amount', 'Variance', 'Variance %', 'Item Count'];
  const catData = result.categoryVariances.map(cat => [
    cat.category,
    cat.tenderAmount,
    cat.budgetAmount,
    cat.variance,
    cat.variancePercent,
    cat.itemCount,
  ]);
  const catSheet = XLSX.utils.aoa_to_sheet([catHeaders, ...catData]);
  XLSX.utils.book_append_sheet(workbook, catSheet, 'Categories');
  
  // Download
  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  XLSX.writeFile(workbook, `BOQ_Comparison_${currentDate}.xlsx`);
}

// Schedule Integration Export Functions
interface CostLoadedActivity {
  activity_id: string;
  activity_name: string;
  trade_category: string;
  related_boq_items: { item_number: string; description: string; cost: number }[];
  duration_days: number;
  activity_cost: number;
  cost_weight_percent: number;
  start_date: string;
  finish_date: string;
  predecessors: string[];
  daily_cost_rate: number;
}

interface ScheduleIntegrationResult {
  integration_summary: {
    total_schedule_activities: number;
    fully_linked_activities: number;
    partially_linked_activities: number;
    not_linked_activities: number;
    total_boq_items: number;
    linked_boq_items: number;
    orphan_boq_items: number;
    total_boq_cost: number;
    scheduled_cost: number;
    cost_variance: number;
    variance_percent: number;
    total_project_duration: number;
    project_start_date: string;
    project_finish_date: string;
    integration_score: number;
  };
  cost_loaded_schedule: CostLoadedActivity[];
  orphan_boq_items: { item_number: string; description: string; quantity: number; cost: number; suggested_activity: string }[];
  cost_flow_monthly: { period: string; period_start: string; period_end: string; planned_cost: number; cumulative_cost: number; activities_active: string[] }[];
  s_curve_data: { date: string; day_number: number; planned_daily_cost: number; planned_cumulative_cost: number; planned_cumulative_percent: number }[];
  evm_summary?: {
    data_date: string;
    bac: number;
    bcws: number;
    bcwp: number;
    acwp: number;
    sv: number;
    cv: number;
    spi: number;
    cpi: number;
    etc: number;
    eac: number;
    vac: number;
  };
}

export function exportScheduleIntegrationToPDF(result: ScheduleIntegrationResult, currency: string = 'SAR'): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const currentDate = new Date().toLocaleDateString('en-GB');
  
  // Header
  doc.setFillColor(34, 197, 94); // Green
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost-Loaded Project Schedule Report', 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`BOQ-Schedule Integration Analysis | ${currentDate}`, 14, 23);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Summary Section
  let yPos = 40;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Summary', 14, yPos);
  
  yPos += 8;
  
  const { integration_summary } = result;
  
  const summaryData = [
    ['Integration Score', `${integration_summary.integration_score}%`],
    ['Project Duration', `${integration_summary.total_project_duration} days`],
    ['Project Start', integration_summary.project_start_date],
    ['Project Finish', integration_summary.project_finish_date],
    ['Total Scheduled Cost', `${integration_summary.scheduled_cost.toLocaleString()} ${currency}`],
    ['Cost Variance', `${integration_summary.cost_variance.toLocaleString()} ${currency} (${integration_summary.variance_percent.toFixed(2)}%)`],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 14 },
    tableWidth: 110,
  });
  
  const activityData = [
    ['Total Activities', integration_summary.total_schedule_activities.toString()],
    ['Linked BOQ Items', integration_summary.linked_boq_items.toString()],
    ['Orphan BOQ Items', integration_summary.orphan_boq_items.toString()],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Activity Stats', 'Count']],
    body: activityData,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 140 },
    tableWidth: 80,
  });
  
  // Cost-Loaded Schedule Table
  doc.addPage();
  yPos = 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost-Loaded Schedule', 14, yPos);
  
  yPos += 10;
  
  const scheduleTableData = result.cost_loaded_schedule.map(activity => [
    activity.activity_id,
    activity.activity_name,
    activity.trade_category,
    activity.related_boq_items.map(i => i.item_number).join(', '),
    activity.duration_days.toString(),
    `${activity.activity_cost.toLocaleString()} ${currency}`,
    `${activity.cost_weight_percent.toFixed(1)}%`,
    activity.start_date,
    activity.finish_date,
    activity.predecessors.join(', ') || '-',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['ID', 'Activity Name', 'Trade', 'BOQ Items', 'Duration', 'Cost', 'Weight %', 'Start', 'Finish', 'Predecessors']],
    body: scheduleTableData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 7 },
    styles: { fontSize: 6, cellPadding: 1 },
  });
  
  // Cash Flow Page
  if (result.cost_flow_monthly.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Cash Flow Projection', 14, yPos);
    
    yPos += 10;
    
    const cashFlowData = result.cost_flow_monthly.map(period => [
      period.period,
      period.period_start,
      period.period_end,
      `${period.planned_cost.toLocaleString()} ${currency}`,
      `${period.cumulative_cost.toLocaleString()} ${currency}`,
      period.activities_active.length.toString(),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Period', 'Start', 'End', 'Monthly Cost', 'Cumulative Cost', 'Active Activities']],
      body: cashFlowData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 9 },
    });
  }
  
  // EVM Summary if available
  if (result.evm_summary) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Earned Value Management Summary', 14, yPos);
    
    yPos += 10;
    
    const evmData = [
      ['Data Date', result.evm_summary.data_date],
      ['BAC (Budget at Completion)', `${result.evm_summary.bac.toLocaleString()} ${currency}`],
      ['BCWS (Planned Value)', `${result.evm_summary.bcws.toLocaleString()} ${currency}`],
      ['BCWP (Earned Value)', `${result.evm_summary.bcwp.toLocaleString()} ${currency}`],
      ['ACWP (Actual Cost)', `${result.evm_summary.acwp.toLocaleString()} ${currency}`],
      ['SV (Schedule Variance)', `${result.evm_summary.sv.toLocaleString()} ${currency}`],
      ['CV (Cost Variance)', `${result.evm_summary.cv.toLocaleString()} ${currency}`],
      ['SPI (Schedule Performance Index)', result.evm_summary.spi.toFixed(2)],
      ['CPI (Cost Performance Index)', result.evm_summary.cpi.toFixed(2)],
      ['ETC (Estimate to Complete)', `${result.evm_summary.etc.toLocaleString()} ${currency}`],
      ['EAC (Estimate at Completion)', `${result.evm_summary.eac.toLocaleString()} ${currency}`],
      ['VAC (Variance at Completion)', `${result.evm_summary.vac.toLocaleString()} ${currency}`],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['EVM Metric', 'Value']],
      body: evmData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' },
      },
    });
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Cost-Loaded Schedule Report | ${currentDate}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`Schedule_Integration_Report_${currentDate.replace(/\//g, '-')}.pdf`);
}

export function exportScheduleIntegrationToExcel(result: ScheduleIntegrationResult, currency: string = 'SAR'): void {
  const workbook = XLSX.utils.book_new();
  const { integration_summary } = result;
  
  // Summary Sheet
  const summaryData = [
    ['Cost-Loaded Schedule Report'],
    ['Generated:', new Date().toLocaleDateString('en-GB')],
    [''],
    ['Project Summary'],
    ['Integration Score:', `${integration_summary.integration_score}%`],
    ['Project Duration:', `${integration_summary.total_project_duration} days`],
    ['Project Start:', integration_summary.project_start_date],
    ['Project Finish:', integration_summary.project_finish_date],
    [''],
    ['Cost Summary'],
    ['Total BOQ Cost:', integration_summary.total_boq_cost],
    ['Scheduled Cost:', integration_summary.scheduled_cost],
    ['Cost Variance:', integration_summary.cost_variance],
    ['Variance %:', integration_summary.variance_percent],
    [''],
    ['Activity Statistics'],
    ['Total Activities:', integration_summary.total_schedule_activities],
    ['Linked BOQ Items:', integration_summary.linked_boq_items],
    ['Orphan BOQ Items:', integration_summary.orphan_boq_items],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Cost-Loaded Schedule Sheet
  const scheduleHeaders = [
    'Activity ID', 'Activity Name', 'Trade Category',
    'BOQ Item Numbers', 'BOQ Item Count', 'Duration (Days)',
    'Activity Cost', 'Cost Weight %', 'Daily Cost Rate',
    'Start Date', 'Finish Date', 'Predecessors'
  ];
  
  const scheduleData = result.cost_loaded_schedule.map(activity => [
    activity.activity_id,
    activity.activity_name,
    activity.trade_category,
    activity.related_boq_items.map(i => i.item_number).join(', '),
    activity.related_boq_items.length,
    activity.duration_days,
    activity.activity_cost,
    activity.cost_weight_percent,
    activity.daily_cost_rate,
    activity.start_date,
    activity.finish_date,
    activity.predecessors.join(', '),
  ]);
  
  const scheduleSheet = XLSX.utils.aoa_to_sheet([scheduleHeaders, ...scheduleData]);
  XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Cost-Loaded Schedule');
  
  // BOQ Linkage Details Sheet
  const linkageHeaders = ['Activity ID', 'Activity Name', 'BOQ Item Number', 'BOQ Description', 'BOQ Cost'];
  const linkageData: any[][] = [];
  
  result.cost_loaded_schedule.forEach(activity => {
    activity.related_boq_items.forEach(item => {
      linkageData.push([
        activity.activity_id,
        activity.activity_name,
        item.item_number,
        item.description,
        item.cost,
      ]);
    });
  });
  
  const linkageSheet = XLSX.utils.aoa_to_sheet([linkageHeaders, ...linkageData]);
  XLSX.utils.book_append_sheet(workbook, linkageSheet, 'BOQ Linkage');
  
  // Cash Flow Sheet
  if (result.cost_flow_monthly.length > 0) {
    const cashFlowHeaders = ['Period', 'Start Date', 'End Date', 'Planned Cost', 'Cumulative Cost', 'Active Activities'];
    const cashFlowData = result.cost_flow_monthly.map(period => [
      period.period,
      period.period_start,
      period.period_end,
      period.planned_cost,
      period.cumulative_cost,
      period.activities_active.join(', '),
    ]);
    
    const cashFlowSheet = XLSX.utils.aoa_to_sheet([cashFlowHeaders, ...cashFlowData]);
    XLSX.utils.book_append_sheet(workbook, cashFlowSheet, 'Cash Flow');
  }
  
  // S-Curve Data Sheet
  if (result.s_curve_data.length > 0) {
    const sCurveHeaders = ['Date', 'Day Number', 'Daily Cost', 'Cumulative Cost', 'Cumulative %'];
    const sCurveData = result.s_curve_data.map(point => [
      point.date,
      point.day_number,
      point.planned_daily_cost,
      point.planned_cumulative_cost,
      point.planned_cumulative_percent,
    ]);
    
    const sCurveSheet = XLSX.utils.aoa_to_sheet([sCurveHeaders, ...sCurveData]);
    XLSX.utils.book_append_sheet(workbook, sCurveSheet, 'S-Curve Data');
  }
  
  // Orphan Items Sheet
  if (result.orphan_boq_items.length > 0) {
    const orphanHeaders = ['Item Number', 'Description', 'Quantity', 'Cost', 'Suggested Activity'];
    const orphanData = result.orphan_boq_items.map(item => [
      item.item_number,
      item.description,
      item.quantity,
      item.cost,
      item.suggested_activity,
    ]);
    
    const orphanSheet = XLSX.utils.aoa_to_sheet([orphanHeaders, ...orphanData]);
    XLSX.utils.book_append_sheet(workbook, orphanSheet, 'Orphan Items');
  }
  
  // Download
  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  XLSX.writeFile(workbook, `Schedule_Integration_${currentDate}.xlsx`);
}
