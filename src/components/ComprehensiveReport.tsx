import { useState } from "react";
import { FileDown, Loader2, FileText, Package, Layers, DollarSign, BarChart3, CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from '@/lib/exceljs-utils';

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  // Fallback field names from various sources
  rate?: number;
  price?: number;
  qty?: number;
  amount?: number;
  total?: number;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface CostBreakdown {
  item_id: string;
  description: string;
  materials_cost: number;
  labor_cost: number;
  equipment_cost: number;
  subcontractor_cost: number;
  total_direct_cost: number;
  overhead_cost: number;
  admin_cost: number;
  insurance_cost: number;
  contingency_cost: number;
  total_indirect_cost: number;
  profit_margin: number;
  profit_amount: number;
  total_cost: number;
  unit_price: number;
}

interface TimelinePhase {
  phase: string;
  name: string;
  duration_weeks: number;
  start_week: number;
  end_week: number;
  dependencies: string[];
  milestones: string[];
  resources: string[];
  deliverables: string[];
}

interface ComprehensiveReportProps {
  projectName?: string;
  analysisData?: {
    items?: BOQItem[];
    summary?: {
      total_items: number;
      total_value?: number;
      categories: string[];
      currency?: string;
    };
  };
  wbsData?: {
    wbs?: WBSItem[];
  };
  costData?: CostBreakdown[];
  timelineData?: {
    phases?: TimelinePhase[];
    total_duration_weeks?: number;
  };
}

export function ComprehensiveReport({
  projectName = "Project",
  analysisData,
  wbsData,
  costData,
  timelineData,
}: ComprehensiveReportProps) {
  const { toast } = useToast();
  const { language, isArabic } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);

  // Translations
  const t = {
    reportTitle: isArabic ? "تقرير شامل للمشروع" : "COMPREHENSIVE PROJECT REPORT",
    reportSubtitle: isArabic ? "تحليل جدول الكميات وتخطيط المشروع" : "Bill of Quantities Analysis & Project Planning",
    projectName: isArabic ? "اسم المشروع" : "PROJECT NAME",
    generated: isArabic ? "تاريخ الإنشاء" : "Generated",
    contents: isArabic ? "المحتويات" : "Contents",
    executiveSummary: isArabic ? "الملخص التنفيذي" : "Executive Summary",
    boq: isArabic ? "جدول الكميات (BOQ)" : "Bill of Quantities (BOQ)",
    wbs: isArabic ? "هيكل تجزئة العمل (WBS)" : "Work Breakdown Structure (WBS)",
    costAnalysis: isArabic ? "تحليل التكاليف" : "Cost Analysis & Breakdown",
    timeline: isArabic ? "الجدول الزمني للمشروع" : "Project Timeline",
    recommendations: isArabic ? "التوصيات" : "Recommendations",
    totalItems: isArabic ? "إجمالي البنود" : "Total Items",
    totalValue: isArabic ? "القيمة الإجمالية" : "Total Value",
    categories: isArabic ? "التصنيفات" : "Categories",
    wbsPhases: isArabic ? "مراحل WBS" : "WBS Phases",
    timelineWeeks: isArabic ? "المدة (أسابيع)" : "Timeline (Weeks)",
    itemNo: isArabic ? "رقم البند" : "Item No.",
    description: isArabic ? "الوصف" : "Description",
    unit: isArabic ? "الوحدة" : "Unit",
    qty: isArabic ? "الكمية" : "Qty",
    unitPrice: isArabic ? "سعر الوحدة" : "Unit Price",
    total: isArabic ? "الإجمالي" : "Total",
    code: isArabic ? "الكود" : "Code",
    title: isArabic ? "العنوان" : "Title",
    level: isArabic ? "المستوى" : "Level",
    parent: isArabic ? "الأصل" : "Parent",
    items: isArabic ? "البنود" : "Items",
    materials: isArabic ? "تكلفة المواد" : "Materials Cost",
    labor: isArabic ? "تكلفة العمالة" : "Labor Cost",
    equipment: isArabic ? "تكلفة المعدات" : "Equipment Cost",
    directCost: isArabic ? "التكلفة المباشرة" : "Total Direct Cost",
    indirectCost: isArabic ? "التكلفة غير المباشرة" : "Total Indirect Cost",
    grandTotal: isArabic ? "الإجمالي الكلي" : "Grand Total",
    phase: isArabic ? "المرحلة" : "Phase",
    duration: isArabic ? "المدة" : "Duration",
    start: isArabic ? "البداية" : "Start",
    end: isArabic ? "النهاية" : "End",
    milestones: isArabic ? "المعالم" : "Milestones",
    weeks: isArabic ? "أسابيع" : "weeks",
    week: isArabic ? "أسبوع" : "Week",
    ganttChart: isArabic ? "مخطط جانت" : "Gantt Chart Overview",
    totalDuration: isArabic ? "المدة الإجمالية" : "Total Duration",
    numberOfPhases: isArabic ? "عدد المراحل" : "Number of Phases",
    reportComplete: isArabic ? "انتهى التقرير" : "Report Complete",
    reportGeneratedBy: isArabic ? "تم إنشاء هذا التقرير الشامل بواسطة PMS" : "This comprehensive report was generated by PMS",
    generatedOn: isArabic ? "تم الإنشاء في" : "Generated on",
    cardTitle: isArabic ? "التقرير الشامل" : "Comprehensive Report",
    cardDescription: isArabic ? "إنشاء تقرير PDF شامل يتضمن جميع البيانات والتحليلات:" : "Generate a comprehensive PDF report including all data and analysis:",
    boqTable: isArabic ? "جدول الكميات" : "Bill of Quantities",
    wbsStructure: isArabic ? "هيكل العمل WBS" : "WBS Structure",
    costAnalysisLabel: isArabic ? "تحليل التكاليف" : "Cost Analysis",
    charts: isArabic ? "الرسوم البيانية" : "Charts",
    timelineLabel: isArabic ? "الجدول الزمني" : "Timeline",
    generating: isArabic ? "جاري إنشاء التقرير..." : "Generating Report...",
    downloadBtn: isArabic ? "تحميل التقرير الشامل PDF" : "Download Comprehensive Report PDF",
    successTitle: isArabic ? "تم إنشاء التقرير" : "Report Generated",
    successDesc: isArabic ? "تم تحميل التقرير الشامل بنجاح" : "Comprehensive report downloaded successfully",
    errorTitle: isArabic ? "خطأ في إنشاء التقرير" : "Error Generating Report",
    errorDesc: isArabic ? "حدث خطأ أثناء إنشاء التقرير" : "An error occurred while generating the report",
  };

  // Generate individual section PDFs
  const generateBOQPDF = () => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      toast({ title: "No BOQ data", variant: "destructive" });
      return;
    }
    setGeneratingSection("boq");
    
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Bill of Quantities (BOQ)", margin, 16);

        const boqData = analysisData.items.map((item, index) => {
          const unitPrice = Number(item.unit_price || item.rate || item.price || 0);
          const quantity = Number(item.quantity || item.qty || 1);
          const totalPrice = Number(item.total_price || item.amount || item.total || (unitPrice * quantity));
          
          return [
            String(index + 1),
            item.item_number || '-',
            item.description?.substring(0, 40) + (item.description?.length > 40 ? '...' : '') || '-',
            item.unit || '-',
            quantity.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          ];
        });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Item No.', 'Description', 'Unit', 'Qty', 'Unit Price', 'Total']],
      body: boqData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });

    doc.save('boq_items.pdf');
    setGeneratingSection(null);
    toast({ title: t.successTitle });
  };

  const generateWBSPDF = () => {
    if (!wbsData?.wbs || wbsData.wbs.length === 0) {
      toast({ title: "No WBS data", variant: "destructive" });
      return;
    }
    setGeneratingSection("wbs");
    
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Work Breakdown Structure (WBS)", margin, 16);

    const wbsTableData = wbsData.wbs.map(item => [
      item.code,
      '  '.repeat(item.level - 1) + item.title,
      String(item.level),
      item.parent_code || '-',
      String(item.items?.length || 0),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Code', 'Title', 'Level', 'Parent', 'Items']],
      body: wbsTableData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });

    doc.save('wbs_structure.pdf');
    setGeneratingSection(null);
    toast({ title: t.successTitle });
  };

  const generateCostPDF = () => {
    if (!costData || costData.length === 0) {
      // Generate from analysisData if no costData
      if (!analysisData?.items) {
        toast({ title: "No cost data", variant: "destructive" });
        return;
      }
    }
    setGeneratingSection("cost");
    
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Cost Analysis", margin, 16);

    const items = analysisData?.items || [];
    const costTableData = items.map((item, idx) => {
      const unitPrice = Number(item.unit_price || item.rate || item.price || 0);
      const totalPrice = Number(item.total_price || item.amount || item.total || (unitPrice * (item.quantity || 1)));
      
      return [
        String(idx + 1),
        item.item_number || '-',
        item.description?.substring(0, 30) || '-',
        unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
        totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Item', 'Description', 'Unit Price', 'Total']],
      body: costTableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });

    doc.save('cost_analysis.pdf');
    setGeneratingSection(null);
    toast({ title: t.successTitle });
  };

  const generateChartsPDF = () => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      toast({ title: "No data for charts", variant: "destructive" });
      return;
    }
    setGeneratingSection("charts");
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Data Charts Summary", margin, 16);

    // Category distribution
    let yPos = 40;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text("Category Distribution", margin, yPos);
    yPos += 10;

    const categories: Record<string, number> = {};
    analysisData.items.forEach(item => {
      const cat = item.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + (item.total_price || 0);
    });

    Object.entries(categories).forEach(([cat, value], idx) => {
      doc.setFontSize(10);
      doc.text(`${cat}: ${value.toLocaleString()} SAR`, margin + 10, yPos + idx * 8);
    });

    doc.save('charts_summary.pdf');
    setGeneratingSection(null);
    toast({ title: t.successTitle });
  };

  const generateTimelinePDF = () => {
    setGeneratingSection("timeline");
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFillColor(239, 68, 68);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Project Timeline", margin, 16);

    if (timelineData?.phases && timelineData.phases.length > 0) {
      const timelineTableData = timelineData.phases.map(phase => [
        phase.phase,
        phase.name,
        `${phase.duration_weeks} weeks`,
        `Week ${phase.start_week}`,
        `Week ${phase.end_week}`,
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Phase', 'Name', 'Duration', 'Start', 'End']],
        body: timelineTableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(12);
      doc.text("No timeline data available", pageWidth / 2, 60, { align: 'center' });
    }

    doc.save('project_timeline.pdf');
    setGeneratingSection(null);
    toast({ title: t.successTitle });
  };

  const generateGanttPDF = () => {
    setGeneratingSection("gantt");
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Gantt Chart", margin, 16);

    if (timelineData?.phases && timelineData.phases.length > 0) {
      const totalWeeks = timelineData.total_duration_weeks || 12;
      const chartWidth = pageWidth - margin * 2 - 60;
      const barWidth = chartWidth / totalWeeks;
      const startY = 45;

      // Draw week headers
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      for (let i = 1; i <= totalWeeks; i++) {
        doc.text(`W${i}`, margin + 55 + (i - 1) * barWidth, 38);
      }

      // Draw bars
      timelineData.phases.forEach((phase, index) => {
        const y = startY + index * 15;
        
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(phase.name.substring(0, 12), margin, y + 4);

        const startX = margin + 55 + (phase.start_week - 1) * barWidth;
        const width = phase.duration_weeks * barWidth;
        
        const colors = [
          [59, 130, 246], [16, 185, 129], [245, 158, 11],
          [139, 92, 246], [239, 68, 68], [6, 182, 212]
        ];
        const color = colors[index % colors.length];
        
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(startX, y - 2, width, 10, 2, 2, 'F');
      });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(12);
      doc.text("No timeline data available for Gantt chart", pageWidth / 2, 60, { align: 'center' });
    }

    doc.save('gantt_chart.pdf');
    setGeneratingSection(null);
    toast({ title: t.successTitle });
  };

  const generateComprehensiveReport = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // ===== COVER PAGE =====
      // Header background
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 80, 'F');

      // Decorative element
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 70, pageWidth, 15, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("COMPREHENSIVE PROJECT REPORT", pageWidth / 2, 35, { align: 'center' });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Bill of Quantities Analysis & Project Planning", pageWidth / 2, 50, { align: 'center' });

      // Project name box
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 95, pageWidth - margin * 2, 40, 5, 5, 'F');
      
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(12);
      doc.text("PROJECT NAME", pageWidth / 2, 110, { align: 'center' });
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(projectName, pageWidth / 2, 125, { align: 'center' });

      // Report info
      let yPos = 150;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.text(`Generated: ${reportDate}`, pageWidth / 2, yPos, { align: 'center' });

      // Table of Contents box
      yPos = 175;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 70, 5, 5, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Contents", margin + 10, yPos + 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);

      const contents = [
        "1. Executive Summary",
        "2. Bill of Quantities (BOQ)",
        "3. Work Breakdown Structure (WBS)",
        "4. Cost Analysis & Breakdown",
        "5. Project Timeline",
        "6. Recommendations"
      ];

      contents.forEach((item, index) => {
        doc.text(item, margin + 15, yPos + 28 + index * 8);
      });

      // Footer
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("PMS - Comprehensive Report", pageWidth / 2, pageHeight - 8, { align: 'center' });

      // ===== PAGE 2: EXECUTIVE SUMMARY =====
      doc.addPage();
      
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("1. Executive Summary", margin, 16);

      yPos = 40;

      // Summary cards
      const summaryData = [
        {
          label: "Total Items",
          value: String(analysisData?.summary?.total_items || analysisData?.items?.length || 0),
          color: [59, 130, 246]
        },
        {
          label: "Total Value",
          value: `${(analysisData?.summary?.total_value || 0).toLocaleString()} ${analysisData?.summary?.currency || 'SAR'}`,
          color: [16, 185, 129]
        },
        {
          label: "Categories",
          value: String(analysisData?.summary?.categories?.length || 0),
          color: [245, 158, 11]
        },
        {
          label: "WBS Phases",
          value: String(wbsData?.wbs?.length || 0),
          color: [139, 92, 246]
        },
        {
          label: "Timeline (Weeks)",
          value: String(timelineData?.total_duration_weeks || 0),
          color: [239, 68, 68]
        }
      ];

      const cardWidth = (pageWidth - margin * 2 - 20) / 3;
      const cardHeight = 30;

      summaryData.forEach((item, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = margin + col * (cardWidth + 10);
        const y = yPos + row * (cardHeight + 10);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');

        doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
        doc.setLineWidth(0.5);
        doc.line(x, y, x, y + cardHeight);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, x + 5, y + 10);

        doc.setFontSize(14);
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.setFont("helvetica", "bold");
        doc.text(item.value, x + 5, y + 22);
      });

      // ===== PAGE 3: BOQ TABLE =====
      if (analysisData?.items && analysisData.items.length > 0) {
        doc.addPage();

        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("2. Bill of Quantities (BOQ)", margin, 16);

        // Helper function to sanitize text for PDF
        const sanitizeText = (text: string | undefined | null): string => {
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

        // Filter out items with zero quantity
        const filteredItems = analysisData.items.filter(item => {
          const quantity = Number(item.quantity || item.qty || 0);
          return quantity > 0;
        });

        const boqData = filteredItems.map((item, index) => {
          const description = sanitizeText(item.description);
          const truncatedDesc = description.length > 35 ? description.substring(0, 35) + '...' : description;
          
          // Calculate prices with multiple fallbacks including AI rates
          const aiRate = Number((item as any).ai_rate || (item as any).ai_suggested_rate || (item as any).calculated_price || 0);
          const unitPrice = Number(item.unit_price || item.rate || item.price || aiRate || 0);
          const quantity = Number(item.quantity || item.qty || 1);
          const totalPrice = Number(item.total_price || item.amount || item.total || (unitPrice * quantity));
          
          return [
            String(index + 1),
            sanitizeText(item.item_number) || '-',
            truncatedDesc,
            sanitizeText(item.unit),
            quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            aiRate > 0 ? aiRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
            totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          ];
        });

        autoTable(doc, {
          startY: 35,
          head: [['#', 'Item No.', 'Description', 'Unit', 'Qty', 'Unit Price', 'AI Rate', 'Total']],
          body: boqData,
          theme: 'striped',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'center', cellWidth: 16 },
            2: { halign: 'left', cellWidth: 48 },
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'center', cellWidth: 14 },
            5: { halign: 'right', cellWidth: 22 },
            6: { halign: 'right', cellWidth: 22, textColor: [124, 58, 237] }, // AI Rate in purple
            7: { halign: 'right', cellWidth: 22 },
          },
          margin: { left: margin, right: margin },
          showHead: 'everyPage', // Header on every page
          didDrawPage: (data) => {
            // Header on every page
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("2. Bill of Quantities (BOQ)", margin, 16);
            
            // Footer
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
          },
        });

        // Calculate actual total from filtered items with multiple fallbacks
        const calculatedTotal = filteredItems.reduce((sum, item) => {
          const aiRate = Number((item as any).ai_rate || (item as any).ai_suggested_rate || (item as any).calculated_price || 0);
          const unitPrice = Number(item.unit_price || item.rate || item.price || aiRate || 0);
          const quantity = Number(item.quantity || item.qty || 1);
          const totalPrice = Number(item.total_price || item.amount || item.total || (unitPrice * quantity));
          return sum + totalPrice;
        }, 0);
        const displayTotal = calculatedTotal > 0 ? calculatedTotal : (analysisData.summary?.total_value || 0);

        // Total row
        const finalY = (doc as any).lastAutoTable.finalY || 35;
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(margin, finalY + 5, pageWidth - margin * 2, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", margin + 5, finalY + 13);
        doc.text(
          `${displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR`,
          pageWidth - margin - 5,
          finalY + 13,
          { align: 'right' }
        );
      }

      // ===== PAGE 4: WBS =====
      if (wbsData?.wbs && wbsData.wbs.length > 0) {
        doc.addPage();

        doc.setFillColor(139, 92, 246);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("3. Work Breakdown Structure (WBS)", margin, 16);

        // Helper function to sanitize text for PDF
        const sanitizeWbsText = (text: string | undefined | null): string => {
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

        const wbsTableData = wbsData.wbs.map(item => [
          item.code,
          '  '.repeat(item.level - 1) + sanitizeWbsText(item.title),
          String(item.level),
          item.parent_code || '-',
          String(item.items?.length || 0),
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Code', 'Title', 'Level', 'Parent', 'Items']],
          body: wbsTableData,
          theme: 'striped',
          headStyles: {
            fillColor: [139, 92, 246],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [30, 41, 59],
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 80 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 25 },
            4: { halign: 'center', cellWidth: 20 },
          },
          margin: { left: margin, right: margin },
        });
      }

      // ===== PAGE 5: COST ANALYSIS =====
      if (costData && costData.length > 0) {
        doc.addPage();

        doc.setFillColor(245, 158, 11);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("4. Cost Analysis & Breakdown", margin, 16);

        // Cost summary
        const totalMaterials = costData.reduce((sum, item) => sum + (item.materials_cost || 0), 0);
        const totalLabor = costData.reduce((sum, item) => sum + (item.labor_cost || 0), 0);
        const totalEquipment = costData.reduce((sum, item) => sum + (item.equipment_cost || 0), 0);
        const totalDirect = costData.reduce((sum, item) => sum + (item.total_direct_cost || 0), 0);
        const totalIndirect = costData.reduce((sum, item) => sum + (item.total_indirect_cost || 0), 0);
        const totalCost = costData.reduce((sum, item) => sum + (item.total_cost || 0), 0);

        yPos = 40;

        // Cost breakdown cards
        const costItems = [
          { label: 'Materials Cost', value: totalMaterials, color: [59, 130, 246] },
          { label: 'Labor Cost', value: totalLabor, color: [16, 185, 129] },
          { label: 'Equipment Cost', value: totalEquipment, color: [245, 158, 11] },
          { label: 'Total Direct Cost', value: totalDirect, color: [139, 92, 246] },
          { label: 'Total Indirect Cost', value: totalIndirect, color: [239, 68, 68] },
          { label: 'Grand Total', value: totalCost, color: [30, 41, 59] },
        ];

        costItems.forEach((item, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const x = margin + col * (cardWidth + 10);
          const y = yPos + row * (cardHeight + 10);

          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');

          doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
          doc.setLineWidth(0.5);
          doc.line(x, y, x, y + cardHeight);

          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.setFont("helvetica", "normal");
          doc.text(item.label, x + 5, y + 10);

          doc.setFontSize(11);
          doc.setTextColor(item.color[0], item.color[1], item.color[2]);
          doc.setFont("helvetica", "bold");
          doc.text(`${item.value.toLocaleString()} SAR`, x + 5, y + 22);
        });

        // Cost table
        yPos += 90;
        const costTableData = costData.slice(0, 10).map((item, index) => [
          String(index + 1),
          item.description?.substring(0, 30) || '-',
          item.materials_cost?.toLocaleString() || '0',
          item.labor_cost?.toLocaleString() || '0',
          item.total_direct_cost?.toLocaleString() || '0',
          item.total_cost?.toLocaleString() || '0',
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Description', 'Materials', 'Labor', 'Direct Cost', 'Total Cost']],
          body: costTableData,
          theme: 'striped',
          headStyles: {
            fillColor: [245, 158, 11],
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 7,
            textColor: [30, 41, 59],
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 50 },
            2: { halign: 'right', cellWidth: 25 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 30 },
            5: { halign: 'right', cellWidth: 30 },
          },
          margin: { left: margin, right: margin },
        });
      }

      // ===== PAGE 6: TIMELINE =====
      if (timelineData?.phases && timelineData.phases.length > 0) {
        doc.addPage();

        doc.setFillColor(239, 68, 68);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("5. Project Timeline", margin, 16);

        yPos = 35;

        // Timeline info
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Duration: ${timelineData.total_duration_weeks} weeks`, margin, yPos);
        doc.text(`Number of Phases: ${timelineData.phases.length}`, margin + 80, yPos);

        yPos += 15;

        const timelineTableData = timelineData.phases.map((phase, index) => [
          String(index + 1),
          phase.name,
          `${phase.duration_weeks} weeks`,
          `Week ${phase.start_week}`,
          `Week ${phase.end_week}`,
          phase.milestones?.slice(0, 2).join(', ') || '-',
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Phase', 'Duration', 'Start', 'End', 'Milestones']],
          body: timelineTableData,
          theme: 'striped',
          headStyles: {
            fillColor: [239, 68, 68],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 45 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { cellWidth: 50 },
          },
          margin: { left: margin, right: margin },
        });

        // Simple Gantt representation
        const ganttY = (doc as any).lastAutoTable.finalY + 20;
        if (ganttY < pageHeight - 60) {
          doc.setFontSize(12);
          doc.setTextColor(30, 41, 59);
          doc.setFont("helvetica", "bold");
          doc.text("Gantt Chart Overview", margin, ganttY);

          const ganttStartY = ganttY + 10;
          const totalWeeks = timelineData.total_duration_weeks || 12;
          const barWidth = (pageWidth - margin * 2 - 50) / totalWeeks;

          timelineData.phases.forEach((phase, index) => {
            const y = ganttStartY + index * 12;
            
            // Phase name
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.setFont("helvetica", "normal");
            doc.text(phase.name.substring(0, 15), margin, y + 4);

            // Bar
            const startX = margin + 50 + (phase.start_week - 1) * barWidth;
            const width = phase.duration_weeks * barWidth;
            
            const colors = [
              [59, 130, 246], [16, 185, 129], [245, 158, 11],
              [139, 92, 246], [239, 68, 68], [6, 182, 212]
            ];
            const color = colors[index % colors.length];
            
            doc.setFillColor(color[0], color[1], color[2]);
            doc.roundedRect(startX, y - 2, width, 8, 2, 2, 'F');
          });
        }
      }

      // ===== FINAL PAGE: FOOTER =====
      doc.addPage();
      
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Report Complete", pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("This comprehensive report was generated by PMS", pageWidth / 2, pageHeight / 2, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });

      // Save PDF
      doc.save(`${projectName}_comprehensive_report.pdf`);

      toast({
        title: t.successTitle,
        description: t.successDesc,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: t.errorTitle,
        description: t.errorDesc,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasData = analysisData?.items && analysisData.items.length > 0;

  const noDataMessage = isArabic 
    ? "لا توجد بيانات متاحة. يرجى تحميل ملف BOQ أولاً لإنشاء التقرير."
    : "No data available. Please upload a BOQ file first to generate the report.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {t.cardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">{noDataMessage}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t.cardDescription}
            </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateBOQPDF}
            disabled={generatingSection === "boq"}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10"
          >
            {generatingSection === "boq" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4 text-primary" />}
            <span className="text-xs">{t.boqTable}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateWBSPDF}
            disabled={generatingSection === "wbs"}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-500/10"
          >
            {generatingSection === "wbs" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4 text-purple-500" />}
            <span className="text-xs">{t.wbsStructure}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCostPDF}
            disabled={generatingSection === "cost"}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-500/10"
          >
            {generatingSection === "cost" ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 text-amber-500" />}
            <span className="text-xs">{t.costAnalysisLabel}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateChartsPDF}
            disabled={generatingSection === "charts"}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-green-500/10"
          >
            {generatingSection === "charts" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 text-green-500" />}
            <span className="text-xs">{t.charts}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateTimelinePDF}
            disabled={generatingSection === "timeline"}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-red-500/10"
          >
            {generatingSection === "timeline" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4 text-red-500" />}
            <span className="text-xs">{t.timelineLabel}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateGanttPDF}
            disabled={generatingSection === "gantt"}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-500/10"
          >
            {generatingSection === "gantt" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-blue-500" />}
            <span className="text-xs">Gantt Chart</span>
          </Button>
        </div>

        <Button
          onClick={generateComprehensiveReport}
          disabled={isGenerating}
          className="w-full btn-gradient gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.generating}
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              {t.downloadBtn}
            </>
          )}
        </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
