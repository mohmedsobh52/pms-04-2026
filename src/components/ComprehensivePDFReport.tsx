import { useState } from "react";
import { FileText, Download, Loader2, Check, Calendar, Package, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, addDays } from "date-fns";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface ProcurementItem {
  id: string;
  itemNumber: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  leadTime: number;
  supplier?: string;
  orderDate?: string;
  deliveryDate?: string;
  status: string;
  priority: string;
}

interface ResourceItem {
  id: string;
  type: 'labor' | 'equipment' | 'material';
  name: string;
  category: string;
  quantity: number;
  unit: string;
  ratePerDay: number;
  totalCost: number;
  startDate: string;
  endDate: string;
  utilizationPercentage: number;
  status: string;
}

interface TimelineItem {
  code: string;
  title: string;
  level: number;
  startDay: number;
  duration: number;
  progress: number;
  isCritical?: boolean;
  status?: string;
}

interface ComprehensivePDFReportProps {
  projectName?: string;
  boqItems?: BOQItem[];
  procurementItems?: ProcurementItem[];
  resourceItems?: ResourceItem[];
  timelineItems?: TimelineItem[];
  projectStartDate?: Date;
  currency?: string;
  analysisData?: any;
}

export function ComprehensivePDFReport({
  projectName = "المشروع",
  boqItems = [],
  procurementItems = [],
  resourceItems = [],
  timelineItems = [],
  projectStartDate = new Date(),
  currency = "SAR",
  analysisData
}: ComprehensivePDFReportProps) {
  const { isArabic } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Section toggles
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeBOQ, setIncludeBOQ] = useState(true);
  const [includeProcurement, setIncludeProcurement] = useState(true);
  const [includeResources, setIncludeResources] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeGantt, setIncludeGantt] = useState(true);
  const [includeCashFlow, setIncludeCashFlow] = useState(true);

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const sanitizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return String(text)
      .replace(/[\u0600-\u06FF]/g, char => char)
      .replace(/[\x00-\x1F\x7F]/g, '')
      .substring(0, 100);
  };

  const generateComprehensiveReport = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = 0;
      let pageNumber = 1;

      // Helper function to add new page
      const addNewPage = () => {
        doc.addPage();
        pageNumber++;
        currentY = 25;
        addFooter();
      };

      // Helper function to check if we need new page
      const checkPageBreak = (requiredSpace: number) => {
        if (currentY + requiredSpace > pageHeight - 25) {
          addNewPage();
          return true;
        }
        return false;
      };

      // Add footer to current page
      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `${isArabic ? 'صفحة' : 'Page'} ${pageNumber} - ${format(new Date(), "yyyy/MM/dd HH:mm")}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      };

      setProgress(10);

      // ============ COVER PAGE ============
      // Background header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 80, "F");
      
      // Gradient effect
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 60, pageWidth, 20, "F");

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text(isArabic ? "تقرير التحليل الشامل" : "Comprehensive Analysis Report", pageWidth / 2, 35, { align: "center" });
      
      doc.setFontSize(16);
      doc.text(projectName, pageWidth / 2, 50, { align: "center" });

      doc.setFontSize(12);
      doc.text(format(new Date(), "yyyy/MM/dd"), pageWidth / 2, 70, { align: "center" });

      // Summary cards on cover
      currentY = 100;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(isArabic ? "ملخص المشروع" : "Project Summary", margin, currentY);

      currentY += 15;
      const summaryData = [
        { label: isArabic ? "إجمالي البنود" : "Total Items", value: boqItems.length.toString(), icon: "📋" },
        { label: isArabic ? "إجمالي القيمة" : "Total Value", value: formatCurrency(boqItems.reduce((sum, i) => sum + (i.total_price || 0), 0)), icon: "💰" },
        { label: isArabic ? "بنود المشتريات" : "Procurement Items", value: procurementItems.length.toString(), icon: "📦" },
        { label: isArabic ? "الموارد" : "Resources", value: resourceItems.length.toString(), icon: "👥" },
        { label: isArabic ? "مهام الجدول الزمني" : "Timeline Tasks", value: timelineItems.length.toString(), icon: "📅" },
      ];

      // Draw summary boxes
      const boxWidth = (pageWidth - margin * 2 - 20) / 2;
      const boxHeight = 25;
      let row = 0;
      let col = 0;

      summaryData.forEach((item, idx) => {
        const x = margin + col * (boxWidth + 10);
        const y = currentY + row * (boxHeight + 5);

        // Box background
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, "F");

        // Icon and label
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(item.icon + " " + item.label, x + 5, y + 10);

        // Value
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text(item.value, x + 5, y + 20);
        doc.setFont("helvetica", "normal");

        col++;
        if (col >= 2) {
          col = 0;
          row++;
        }
      });

      addFooter();
      setProgress(20);

      // ============ TABLE OF CONTENTS ============
      addNewPage();
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(isArabic ? "جدول المحتويات" : "Table of Contents", margin, currentY);
      currentY += 15;

      const sections = [];
      let sectionNum = 1;
      if (includeSummary) sections.push({ num: sectionNum++, title: isArabic ? "الملخص التنفيذي" : "Executive Summary" });
      if (includeBOQ && boqItems.length > 0) sections.push({ num: sectionNum++, title: isArabic ? "جدول الكميات (BOQ)" : "Bill of Quantities (BOQ)" });
      if (includeProcurement && procurementItems.length > 0) sections.push({ num: sectionNum++, title: isArabic ? "جدول المشتريات" : "Procurement Schedule" });
      if (includeResources && resourceItems.length > 0) sections.push({ num: sectionNum++, title: isArabic ? "جدول الموارد" : "Resource Schedule" });
      if (includeTimeline && timelineItems.length > 0) sections.push({ num: sectionNum++, title: isArabic ? "الجدول الزمني" : "Project Timeline" });
      if (includeGantt && timelineItems.length > 0) sections.push({ num: sectionNum++, title: isArabic ? "مخطط جانت" : "Gantt Chart" });
      if (includeCashFlow) sections.push({ num: sectionNum++, title: isArabic ? "التدفق النقدي المتوقع" : "Projected Cash Flow" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      sections.forEach((section, idx) => {
        doc.setTextColor(59, 130, 246);
        doc.text(`${section.num}.`, margin, currentY);
        doc.setTextColor(30, 41, 59);
        doc.text(section.title, margin + 10, currentY);
        currentY += 10;
      });

      addFooter();
      setProgress(30);

      // ============ EXECUTIVE SUMMARY ============
      if (includeSummary) {
        addNewPage();
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "1. الملخص التنفيذي" : "1. Executive Summary", margin, 14);
        
        currentY = 35;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        // Project overview
        const totalValue = boqItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
        const categories = [...new Set(boqItems.map(i => i.category).filter(Boolean))];
        const criticalItems = timelineItems.filter(t => t.isCritical).length;
        const totalDuration = timelineItems.length > 0 
          ? Math.max(...timelineItems.map(t => t.startDay + t.duration))
          : 0;

        const summaryText = [
          isArabic 
            ? `يتضمن هذا التقرير تحليلاً شاملاً لمشروع "${projectName}".`
            : `This report provides a comprehensive analysis of the "${projectName}" project.`,
          "",
          isArabic ? "أبرز النقاط:" : "Key Highlights:",
          `• ${isArabic ? "إجمالي القيمة التقديرية" : "Total Estimated Value"}: ${formatCurrency(totalValue)}`,
          `• ${isArabic ? "عدد البنود" : "Number of Items"}: ${boqItems.length}`,
          `• ${isArabic ? "الفئات" : "Categories"}: ${categories.length}`,
          `• ${isArabic ? "المدة الإجمالية المتوقعة" : "Expected Total Duration"}: ${totalDuration} ${isArabic ? "يوم" : "days"}`,
          `• ${isArabic ? "المهام الحرجة" : "Critical Tasks"}: ${criticalItems}`,
        ];

        summaryText.forEach(line => {
          doc.text(line, margin, currentY);
          currentY += 7;
        });

        addFooter();
      }

      setProgress(40);

      // ============ BOQ SECTION ============
      if (includeBOQ && boqItems.length > 0) {
        addNewPage();
        doc.setFillColor(34, 197, 94);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "2. جدول الكميات (BOQ)" : "2. Bill of Quantities (BOQ)", margin, 14);

        const boqTableData = boqItems.slice(0, 50).map((item, idx) => [
          String(idx + 1),
          sanitizeText(item.item_number),
          sanitizeText(item.description)?.substring(0, 40) || '',
          item.unit || '',
          String(item.quantity || 0),
          formatCurrency(item.unit_price || 0),
          formatCurrency(item.total_price || 0),
        ]);

        autoTable(doc, {
          startY: 30,
          head: [[
            isArabic ? "#" : "#",
            isArabic ? "رقم البند" : "Item No.",
            isArabic ? "الوصف" : "Description",
            isArabic ? "الوحدة" : "Unit",
            isArabic ? "الكمية" : "Qty",
            isArabic ? "سعر الوحدة" : "Unit Price",
            isArabic ? "الإجمالي" : "Total",
          ]],
          body: boqTableData,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 20 },
            2: { cellWidth: 50 },
            3: { cellWidth: 15 },
            4: { cellWidth: 15 },
            5: { cellWidth: 25 },
            6: { cellWidth: 25 },
          },
          margin: { left: margin, right: margin },
        });

        addFooter();
      }

      setProgress(55);

      // ============ PROCUREMENT SECTION ============
      if (includeProcurement && procurementItems.length > 0) {
        addNewPage();
        doc.setFillColor(249, 115, 22);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "3. جدول المشتريات" : "3. Procurement Schedule", margin, 14);

        const procTableData = procurementItems.slice(0, 40).map((item, idx) => [
          String(idx + 1),
          sanitizeText(item.itemNumber),
          sanitizeText(item.description)?.substring(0, 35) || '',
          item.category || '',
          item.deliveryDate ? format(new Date(item.deliveryDate), "MM/dd") : '-',
          item.status || '',
          item.priority || '',
        ]);

        autoTable(doc, {
          startY: 30,
          head: [[
            "#",
            isArabic ? "رقم البند" : "Item No.",
            isArabic ? "الوصف" : "Description",
            isArabic ? "الفئة" : "Category",
            isArabic ? "التسليم" : "Delivery",
            isArabic ? "الحالة" : "Status",
            isArabic ? "الأولوية" : "Priority",
          ]],
          body: procTableData,
          theme: "striped",
          headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          margin: { left: margin, right: margin },
        });

        addFooter();
      }

      setProgress(65);

      // ============ RESOURCES SECTION ============
      if (includeResources && resourceItems.length > 0) {
        addNewPage();
        doc.setFillColor(139, 92, 246);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "4. جدول الموارد" : "4. Resource Schedule", margin, 14);

        // Group by type
        const laborItems = resourceItems.filter(r => r.type === 'labor');
        const equipmentItems = resourceItems.filter(r => r.type === 'equipment');
        const materialItems = resourceItems.filter(r => r.type === 'material');

        const resourceTableData = resourceItems.slice(0, 40).map((item, idx) => [
          String(idx + 1),
          item.type === 'labor' ? '👷' : item.type === 'equipment' ? '🚜' : '📦',
          sanitizeText(item.name)?.substring(0, 30) || '',
          String(item.quantity || 0),
          formatCurrency(item.ratePerDay || 0),
          formatCurrency(item.totalCost || 0),
          `${item.utilizationPercentage || 0}%`,
        ]);

        autoTable(doc, {
          startY: 30,
          head: [[
            "#",
            isArabic ? "النوع" : "Type",
            isArabic ? "الاسم" : "Name",
            isArabic ? "الكمية" : "Qty",
            isArabic ? "المعدل/يوم" : "Rate/Day",
            isArabic ? "الإجمالي" : "Total",
            isArabic ? "الاستخدام" : "Util.",
          ]],
          body: resourceTableData,
          theme: "striped",
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          margin: { left: margin, right: margin },
        });

        // Summary box
        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, finalY + 10, pageWidth - margin * 2, 30, 3, 3, "F");
        
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`${isArabic ? "العمالة" : "Labor"}: ${laborItems.length}`, margin + 10, finalY + 20);
        doc.text(`${isArabic ? "المعدات" : "Equipment"}: ${equipmentItems.length}`, margin + 60, finalY + 20);
        doc.text(`${isArabic ? "المواد" : "Materials"}: ${materialItems.length}`, margin + 110, finalY + 20);
        doc.text(
          `${isArabic ? "إجمالي التكلفة" : "Total Cost"}: ${formatCurrency(resourceItems.reduce((sum, r) => sum + (r.totalCost || 0), 0))}`,
          margin + 10,
          finalY + 32
        );

        addFooter();
      }

      setProgress(75);

      // ============ TIMELINE SECTION ============
      if (includeTimeline && timelineItems.length > 0) {
        addNewPage();
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "5. الجدول الزمني" : "5. Project Timeline", margin, 14);

        const timelineTableData = timelineItems.slice(0, 40).map((item, idx) => {
          const startDate = addDays(projectStartDate, item.startDay);
          const endDate = addDays(startDate, item.duration);
          
          return [
            item.code,
            sanitizeText(item.title)?.substring(0, 35) || '',
            format(startDate, "MM/dd"),
            format(endDate, "MM/dd"),
            String(item.duration),
            `${item.progress || 0}%`,
            item.isCritical ? "●" : "",
          ];
        });

        autoTable(doc, {
          startY: 30,
          head: [[
            isArabic ? "الكود" : "Code",
            isArabic ? "المهمة" : "Task",
            isArabic ? "البداية" : "Start",
            isArabic ? "النهاية" : "End",
            isArabic ? "المدة" : "Days",
            isArabic ? "التقدم" : "Progress",
            isArabic ? "حرج" : "Critical",
          ]],
          body: timelineTableData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            6: { textColor: [220, 38, 38], halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });

        addFooter();
      }

      setProgress(85);

      // ============ GANTT CHART ============
      if (includeGantt && timelineItems.length > 0) {
        addNewPage();
        doc.setFillColor(124, 58, 237);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "6. مخطط جانت" : "6. Gantt Chart", margin, 14);

        const ganttStartY = 30;
        const rowHeight = 6;
        const taskColumnWidth = 50;
        const ganttWidth = pageWidth - margin * 2 - taskColumnWidth;
        const totalDays = Math.max(...timelineItems.map(t => t.startDay + t.duration), 90);
        const displayItems = timelineItems.slice(0, 25); // Limit for readability

        // Draw header
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, ganttStartY, pageWidth - margin * 2, rowHeight + 2, "F");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7);
        doc.text(isArabic ? "المهمة" : "Task", margin + 2, ganttStartY + 5);

        // Draw week markers
        const weeksCount = Math.ceil(totalDays / 7);
        const maxWeeksToShow = 12;
        const weekStep = weeksCount > maxWeeksToShow ? Math.ceil(weeksCount / maxWeeksToShow) : 1;
        
        for (let i = 0; i <= weeksCount; i += weekStep) {
          const x = margin + taskColumnWidth + (i / weeksCount) * ganttWidth;
          doc.setDrawColor(226, 232, 240);
          doc.line(x, ganttStartY, x, ganttStartY + (displayItems.length + 1) * rowHeight + 5);
          if (i < weeksCount) {
            doc.setFontSize(6);
            doc.text(`W${i + 1}`, x + 1, ganttStartY + 5);
          }
        }

        // Draw tasks
        displayItems.forEach((task, idx) => {
          const y = ganttStartY + (idx + 1) * rowHeight + 5;

          // Alternating background
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 2, pageWidth - margin * 2, rowHeight, "F");
          }

          // Task name
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(6);
          doc.text(sanitizeText(task.title)?.substring(0, 20) || '', margin + 2, y + 3);

          // Task bar
          const barStart = margin + taskColumnWidth + (task.startDay / totalDays) * ganttWidth;
          const barWidth = Math.max((task.duration / totalDays) * ganttWidth, 3);

          // Color based on status
          if (task.isCritical) {
            doc.setFillColor(220, 38, 38);
          } else if (task.progress === 100) {
            doc.setFillColor(34, 197, 94);
          } else if (task.progress > 0) {
            doc.setFillColor(59, 130, 246);
          } else {
            doc.setFillColor(148, 163, 184);
          }

          doc.roundedRect(barStart, y, barWidth, rowHeight - 2, 1, 1, "F");

          // Progress bar
          if (task.progress > 0 && task.progress < 100) {
            const progressWidth = barWidth * (task.progress / 100);
            doc.setFillColor(34, 197, 94);
            doc.roundedRect(barStart, y, progressWidth, rowHeight - 2, 1, 1, "F");
          }
        });

        // Legend
        const legendY = ganttStartY + (displayItems.length + 2) * rowHeight + 10;
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);

        doc.setFillColor(148, 163, 184);
        doc.rect(margin, legendY, 8, 4, "F");
        doc.text(isArabic ? "لم يبدأ" : "Not Started", margin + 10, legendY + 3);

        doc.setFillColor(59, 130, 246);
        doc.rect(margin + 40, legendY, 8, 4, "F");
        doc.text(isArabic ? "قيد التنفيذ" : "In Progress", margin + 50, legendY + 3);

        doc.setFillColor(34, 197, 94);
        doc.rect(margin + 90, legendY, 8, 4, "F");
        doc.text(isArabic ? "مكتمل" : "Completed", margin + 100, legendY + 3);

        doc.setFillColor(220, 38, 38);
        doc.rect(margin + 140, legendY, 8, 4, "F");
        doc.text(isArabic ? "حرج" : "Critical", margin + 150, legendY + 3);

        addFooter();
      }

      setProgress(95);

      // ============ CASH FLOW SECTION ============
      if (includeCashFlow && boqItems.length > 0) {
        addNewPage();
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(isArabic ? "7. التدفق النقدي المتوقع" : "7. Projected Cash Flow", margin, 14);

        // Generate monthly cash flow based on timeline
        const totalValue = boqItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
        const totalDays = timelineItems.length > 0 
          ? Math.max(...timelineItems.map(t => t.startDay + t.duration))
          : 180;
        const months = Math.ceil(totalDays / 30);
        
        const cashFlowData: Array<[string, string, string, string]> = [];
        let cumulative = 0;
        
        for (let i = 0; i < months; i++) {
          const monthDate = addDays(projectStartDate, i * 30);
          // S-curve distribution (more spending in middle months)
          const monthProgress = (i + 1) / months;
          const sCurveMultiplier = 3 * Math.pow(monthProgress, 2) - 2 * Math.pow(monthProgress, 3);
          const monthlySpend = (totalValue / months) * (0.5 + sCurveMultiplier);
          cumulative += monthlySpend;
          
          cashFlowData.push([
            format(monthDate, "yyyy/MM"),
            formatCurrency(monthlySpend),
            formatCurrency(cumulative),
            `${Math.round((cumulative / totalValue) * 100)}%`,
          ]);
        }

        autoTable(doc, {
          startY: 30,
          head: [[
            isArabic ? "الشهر" : "Month",
            isArabic ? "الإنفاق الشهري" : "Monthly Spend",
            isArabic ? "التراكمي" : "Cumulative",
            isArabic ? "النسبة" : "Percentage",
          ]],
          body: cashFlowData,
          theme: "striped",
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
        });

        addFooter();
      }

      setProgress(100);

      // Save the PDF
      doc.save(`${projectName}_Comprehensive_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast.success(isArabic ? "تم تصدير التقرير الشامل بنجاح" : "Comprehensive report exported successfully");
      setIsOpen(false);

    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(isArabic ? "خطأ في إنشاء التقرير" : "Error generating report");
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const hasData = boqItems.length > 0 || procurementItems.length > 0 || resourceItems.length > 0 || timelineItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 btn-gradient">
          <FileText className="w-4 h-4" />
          {isArabic ? "تقرير شامل PDF" : "Comprehensive PDF Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {isArabic ? "إنشاء تقرير PDF شامل" : "Generate Comprehensive PDF Report"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? "اختر الأقسام التي تريد تضمينها في التقرير:"
              : "Select sections to include in the report:"}
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox id="summary" checked={includeSummary} onCheckedChange={(c) => setIncludeSummary(!!c)} />
              <label htmlFor="summary" className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                {isArabic ? "الملخص التنفيذي" : "Executive Summary"}
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="boq" checked={includeBOQ} onCheckedChange={(c) => setIncludeBOQ(!!c)} disabled={boqItems.length === 0} />
              <label htmlFor="boq" className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                {isArabic ? "جدول الكميات" : "Bill of Quantities"} ({boqItems.length})
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="procurement" checked={includeProcurement} onCheckedChange={(c) => setIncludeProcurement(!!c)} disabled={procurementItems.length === 0} />
              <label htmlFor="procurement" className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                {isArabic ? "جدول المشتريات" : "Procurement Schedule"} ({procurementItems.length})
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="resources" checked={includeResources} onCheckedChange={(c) => setIncludeResources(!!c)} disabled={resourceItems.length === 0} />
              <label htmlFor="resources" className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                {isArabic ? "جدول الموارد" : "Resource Schedule"} ({resourceItems.length})
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="timeline" checked={includeTimeline} onCheckedChange={(c) => setIncludeTimeline(!!c)} disabled={timelineItems.length === 0} />
              <label htmlFor="timeline" className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                {isArabic ? "الجدول الزمني" : "Project Timeline"} ({timelineItems.length})
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="gantt" checked={includeGantt} onCheckedChange={(c) => setIncludeGantt(!!c)} disabled={timelineItems.length === 0} />
              <label htmlFor="gantt" className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                {isArabic ? "مخطط جانت" : "Gantt Chart"}
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox id="cashflow" checked={includeCashFlow} onCheckedChange={(c) => setIncludeCashFlow(!!c)} />
              <label htmlFor="cashflow" className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                {isArabic ? "التدفق النقدي" : "Cash Flow"}
              </label>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {isArabic ? `جاري الإنشاء... ${progress}%` : `Generating... ${progress}%`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={generateComprehensiveReport} disabled={isGenerating || !hasData} className="gap-2">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isArabic ? "تصدير PDF" : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
