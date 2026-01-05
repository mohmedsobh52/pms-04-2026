import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel, Header, Footer, PageNumber, NumberFormat, TableOfContents, SectionType, ImageRun, convertInchesToTwip, PageBreak, ShadingType } from "docx";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface TimelineItem {
  code: string;
  title: string;
  level: number;
  startDay: number;
  duration: number;
  progress: number;
  isCritical?: boolean;
}

interface ResourceItem {
  name: string;
  type: string;
  quantity: number;
  unit?: string;
  rate_per_day?: number;
  total_cost?: number;
  category?: string;
}

interface ProcurementItem {
  boq_item_number: string;
  description?: string;
  quantity?: number;
  unit?: string;
  estimated_cost?: number;
  lead_time_days?: number;
  status?: string;
  priority?: string;
}

interface WordExportOptions {
  projectName: string;
  boqItems?: BOQItem[];
  timelineItems?: TimelineItem[];
  resourceItems?: ResourceItem[];
  procurementItems?: ProcurementItem[];
  currency?: string;
  companyName?: string;
  companyLogo?: string;
  language?: 'ar' | 'en';
  includeSections?: {
    coverPage?: boolean;
    tableOfContents?: boolean;
    executiveSummary?: boolean;
    boq?: boolean;
    procurement?: boolean;
    resources?: boolean;
    timeline?: boolean;
  };
}

// Translations for Arabic support
const translations = {
  ar: {
    billOfQuantities: "جدول الكميات",
    comprehensiveReport: "تقرير شامل للمشروع",
    executiveSummary: "الملخص التنفيذي",
    summaryDescription: "يقدم هذا التقرير الشامل تحليلاً مفصلاً للمشروع يشمل جدول الكميات، جدول المشتريات، توزيع الموارد، والجدول الزمني.",
    totalItems: "إجمالي البنود",
    totalValue: "إجمالي القيمة",
    procurementItems: "بنود المشتريات",
    resourceCount: "عدد الموارد",
    projectDuration: "مدة المشروع",
    days: "يوم",
    generatedOn: "تاريخ الإنشاء",
    boqTitle: "جدول الكميات (BOQ)",
    itemNo: "رقم البند",
    description: "الوصف",
    unit: "الوحدة",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    total: "الإجمالي",
    procurementSchedule: "جدول المشتريات",
    item: "البند",
    qty: "الكمية",
    leadTime: "فترة التوريد",
    status: "الحالة",
    priority: "الأولوية",
    pending: "معلق",
    medium: "متوسط",
    resourcesAllocation: "توزيع الموارد",
    name: "الاسم",
    type: "النوع",
    ratePerDay: "السعر اليومي",
    totalCost: "التكلفة الإجمالية",
    projectTimeline: "الجدول الزمني للمشروع",
    code: "الكود",
    task: "المهمة",
    startDay: "يوم البدء",
    duration: "المدة",
    progress: "التقدم",
    critical: "حرج",
    yes: "نعم",
    no: "لا",
    page: "صفحة",
    of: "من"
  },
  en: {
    billOfQuantities: "Bill of Quantities",
    comprehensiveReport: "COMPREHENSIVE PROJECT REPORT",
    executiveSummary: "Executive Summary",
    summaryDescription: "This comprehensive report provides a detailed analysis of the project including Bill of Quantities, procurement schedule, resource allocation, and timeline estimates.",
    totalItems: "Total BOQ Items",
    totalValue: "Total BOQ Value",
    procurementItems: "Procurement Items",
    resourceCount: "Resource Count",
    projectDuration: "Project Duration",
    days: "days",
    generatedOn: "Generated",
    boqTitle: "Bill of Quantities (BOQ)",
    itemNo: "Item No.",
    description: "Description",
    unit: "Unit",
    quantity: "Qty",
    unitPrice: "Unit Price",
    total: "Total",
    procurementSchedule: "Procurement Schedule",
    item: "Item",
    qty: "Qty",
    leadTime: "Lead Time",
    status: "Status",
    priority: "Priority",
    pending: "Pending",
    medium: "Medium",
    resourcesAllocation: "Resources Allocation",
    name: "Name",
    type: "Type",
    ratePerDay: "Rate/Day",
    totalCost: "Total Cost",
    projectTimeline: "Project Timeline",
    code: "Code",
    task: "Task",
    startDay: "Start Day",
    duration: "Duration",
    progress: "Progress",
    critical: "Critical",
    yes: "Yes",
    no: "No",
    page: "Page",
    of: "of"
  }
};

const formatCurrency = (value: number, currency = "SAR"): string => {
  const currencySymbols: Record<string, string> = {
    SAR: "ر.س",
    USD: "$",
    EUR: "€",
    AED: "د.إ",
    KWD: "د.ك",
    QAR: "ر.ق",
    BHD: "د.ب",
    OMR: "ر.ع",
    EGP: "ج.م",
    JOD: "د.أ"
  };
  return `${value.toLocaleString('ar-SA')} ${currencySymbols[currency] || currency}`;
};

const createCoverPage = (projectName: string, companyName?: string): Paragraph[] => {
  return [
    new Paragraph({
      spacing: { before: 2400, after: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: companyName || "Bill of Quantities",
          bold: true,
          size: 72,
          color: "3B82F6",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          color: "CBD5E1",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 600 },
      children: [
        new TextRun({
          text: projectName,
          bold: true,
          size: 56,
          color: "1E293B",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: "COMPREHENSIVE PROJECT REPORT",
          size: 28,
          color: "64748B",
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200 },
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          size: 22,
          color: "94A3B8",
        }),
      ],
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
};

const createSummarySection = (
  boqItems: BOQItem[],
  procurementItems: ProcurementItem[],
  resourceItems: ResourceItem[],
  timelineItems: TimelineItem[],
  currency: string
): Paragraph[] => {
  const totalBOQValue = boqItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const totalProcurement = procurementItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  const totalResources = resourceItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  const projectDuration = timelineItems.length > 0 
    ? Math.max(...timelineItems.map(t => t.startDay + t.duration)) 
    : 0;

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "Executive Summary",
          bold: true,
          color: "1E293B",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "This comprehensive report provides a detailed analysis of the project including Bill of Quantities, procurement schedule, resource allocation, and timeline estimates.",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      spacing: { before: 100, after: 50 },
      children: [new TextRun({ text: `Total BOQ Items: ${boqItems.length}`, size: 22 })],
    }),
    new Paragraph({
      spacing: { before: 50, after: 50 },
      children: [new TextRun({ text: `Total BOQ Value: ${formatCurrency(totalBOQValue, currency)}`, size: 22 })],
    }),
    new Paragraph({
      spacing: { before: 50, after: 50 },
      children: [new TextRun({ text: `Procurement Items: ${procurementItems.length}`, size: 22 })],
    }),
    new Paragraph({
      spacing: { before: 50, after: 50 },
      children: [new TextRun({ text: `Resource Count: ${resourceItems.length}`, size: 22 })],
    }),
    new Paragraph({
      spacing: { before: 50, after: 50 },
      children: [new TextRun({ text: `Project Duration: ${projectDuration} days`, size: 22 })],
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
};

const createBOQTable = (items: BOQItem[], currency: string): (Paragraph | Table)[] => {
  const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: "Bill of Quantities (BOQ)", bold: true, color: "1E293B" }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true, color: "FFFFFF" })] })],
              width: { size: 5, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Item No.", bold: true, color: "FFFFFF" })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, color: "FFFFFF" })] })],
              width: { size: 35, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Unit", bold: true, color: "FFFFFF" })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true, color: "FFFFFF" })] })],
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Unit Price", bold: true, color: "FFFFFF" })] })],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              shading: { fill: "3B82F6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, color: "FFFFFF" })] })],
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        ...items.map((item, index) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(index + 1))] }),
              new TableCell({ children: [new Paragraph(item.item_number || "-")] }),
              new TableCell({ children: [new Paragraph(item.description || "-")] }),
              new TableCell({ children: [new Paragraph(item.unit || "-")] }),
              new TableCell({ children: [new Paragraph(String(item.quantity))] }),
              new TableCell({ children: [new Paragraph(item.unit_price?.toLocaleString() || "-")] }),
              new TableCell({ children: [new Paragraph(item.total_price?.toLocaleString() || "-")] }),
            ],
          })
        ),
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 6,
              shading: { fill: "F0FDF4", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })],
            }),
            new TableCell({
              shading: { fill: "F0FDF4", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(totalValue, currency), bold: true })] })],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
};

const createProcurementTable = (items: ProcurementItem[]): (Paragraph | Table)[] => {
  if (items.length === 0) return [];

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: "Procurement Schedule", bold: true, color: "1E293B" })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              shading: { fill: "10B981", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "10B981", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "10B981", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "10B981", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Lead Time", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "10B981", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "10B981", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Priority", bold: true, color: "FFFFFF" })] })],
            }),
          ],
        }),
        ...items.map((item) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(item.boq_item_number)] }),
              new TableCell({ children: [new Paragraph(item.description || "-")] }),
              new TableCell({ children: [new Paragraph(String(item.quantity || 0))] }),
              new TableCell({ children: [new Paragraph(`${item.lead_time_days || 0} days`)] }),
              new TableCell({ children: [new Paragraph(item.status || "Pending")] }),
              new TableCell({ children: [new Paragraph(item.priority || "Medium")] }),
            ],
          })
        ),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
};

const createResourcesTable = (items: ResourceItem[], currency: string): (Paragraph | Table)[] => {
  if (items.length === 0) return [];

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: "Resources Allocation", bold: true, color: "1E293B" })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              shading: { fill: "8B5CF6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "8B5CF6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "8B5CF6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "8B5CF6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Rate/Day", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "8B5CF6", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Total Cost", bold: true, color: "FFFFFF" })] })],
            }),
          ],
        }),
        ...items.map((item) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(item.name)] }),
              new TableCell({ children: [new Paragraph(item.type)] }),
              new TableCell({ children: [new Paragraph(String(item.quantity))] }),
              new TableCell({ children: [new Paragraph(item.rate_per_day?.toLocaleString() || "-")] }),
              new TableCell({ children: [new Paragraph(formatCurrency(item.total_cost || 0, currency))] }),
            ],
          })
        ),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
};

const createTimelineTable = (items: TimelineItem[]): (Paragraph | Table)[] => {
  if (items.length === 0) return [];

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: "Project Timeline", bold: true, color: "1E293B" })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              shading: { fill: "F59E0B", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Code", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "F59E0B", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Task", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "F59E0B", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Start Day", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "F59E0B", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Duration", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "F59E0B", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Progress", bold: true, color: "FFFFFF" })] })],
            }),
            new TableCell({
              shading: { fill: "F59E0B", type: ShadingType.SOLID },
              children: [new Paragraph({ children: [new TextRun({ text: "Critical", bold: true, color: "FFFFFF" })] })],
            }),
          ],
        }),
        ...items.map((item) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(item.code)] }),
              new TableCell({ children: [new Paragraph("  ".repeat(item.level - 1) + item.title)] }),
              new TableCell({ children: [new Paragraph(String(item.startDay))] }),
              new TableCell({ children: [new Paragraph(`${item.duration} days`)] }),
              new TableCell({ children: [new Paragraph(`${item.progress}%`)] }),
              new TableCell({ children: [new Paragraph(item.isCritical ? "Yes" : "No")] }),
            ],
          })
        ),
      ],
    }),
  ];
};

export async function generateWordDocument(options: WordExportOptions): Promise<Blob> {
  const {
    projectName,
    boqItems = [],
    timelineItems = [],
    resourceItems = [],
    procurementItems = [],
    currency = "SAR",
    companyName,
    includeSections = {
      coverPage: true,
      tableOfContents: true,
      executiveSummary: true,
      boq: true,
      procurement: true,
      resources: true,
      timeline: true,
    },
  } = options;

  const sections: (Paragraph | Table)[] = [];

  // Cover Page
  if (includeSections.coverPage) {
    sections.push(...createCoverPage(projectName, companyName));
  }

  // Executive Summary
  if (includeSections.executiveSummary) {
    sections.push(...createSummarySection(boqItems, procurementItems, resourceItems, timelineItems, currency));
  }

  // BOQ
  if (includeSections.boq && boqItems.length > 0) {
    sections.push(...createBOQTable(boqItems, currency));
  }

  // Procurement
  if (includeSections.procurement && procurementItems.length > 0) {
    sections.push(...createProcurementTable(procurementItems));
  }

  // Resources
  if (includeSections.resources && resourceItems.length > 0) {
    sections.push(...createResourcesTable(resourceItems, currency));
  }

  // Timeline
  if (includeSections.timeline && timelineItems.length > 0) {
    sections.push(...createTimelineTable(timelineItems));
  }

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: {
            size: 32,
            bold: true,
            color: "1E293B",
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
        heading2: {
          run: {
            size: 26,
            bold: true,
            color: "374151",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: projectName,
                    size: 18,
                    color: "94A3B8",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: "94A3B8",
                  }),
                ],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadWordDocument(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
