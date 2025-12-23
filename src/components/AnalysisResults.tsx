import { useState, useMemo } from "react";
import { Download, FileJson, ChevronDown, ChevronUp, Package, Layers, DollarSign, BarChart3, CalendarDays, FileSpreadsheet, FileText, FileDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataCharts } from "./DataCharts";
import { ProjectTimeline } from "./ProjectTimeline";
import { CostAnalysis } from "./CostAnalysis";
import { ScheduleIntegration } from "./ScheduleIntegration";
import { KPIDashboard } from "./KPIDashboard";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  notes?: string;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface AnalysisData {
  analysis_type: string;
  items?: BOQItem[];
  wbs?: WBSItem[];
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
}

interface AnalysisResultsProps {
  data: AnalysisData;
  wbsData?: AnalysisData;
}

export function AnalysisResults({ data, wbsData }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<"items" | "wbs" | "costs" | "summary" | "charts" | "timeline" | "integration">("items");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const groupedItems = data.items?.reduce((acc, item) => {
    const category = item.category || "غير مصنف";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BOQItem[]>) || {};

  // Calculate KPI data from analysis
  const kpiData = useMemo(() => {
    const items = data.items || [];
    const totalValue = data.summary?.total_value || items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const highRiskItems = items.filter(item => 
      item.notes?.toLowerCase().includes('risk') || 
      item.notes?.toLowerCase().includes('warning') ||
      (item.total_price && item.total_price > totalValue * 0.05)
    );
    const avgUnitPrice = items.length > 0 
      ? items.reduce((sum, item) => sum + (item.unit_price || 0), 0) / items.length 
      : 0;

    return {
      totalValue,
      itemCount: items.length,
      highRiskCount: highRiskItems.length,
      variancePercentage: 0,
      completedItems: items.filter(item => item.total_price && item.total_price > 0).length,
      pendingItems: items.filter(item => !item.total_price || item.total_price === 0).length,
      avgUnitPrice,
      currency: data.summary?.currency || "SAR"
    };
  }, [data]);


  const exportToCSV = () => {
    if (!data.items) return;

    const headers = ["رقم البند", "الوصف", "الوحدة", "الكمية", "سعر الوحدة", "الإجمالي", "الفئة", "ملاحظات"];
    const rows = data.items.map(item => [
      item.item_number,
      item.description,
      item.unit,
      item.quantity.toString(),
      item.unit_price?.toString() || "",
      item.total_price?.toString() || "",
      item.category || "",
      item.notes || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boq_analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const exportData = {
      analysis_type: data.analysis_type,
      items: data.items || [],
      wbs: wbsData?.wbs || [],
      summary: data.summary || {},
      exported_at: new Date().toISOString(),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boq_analysis.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!data.items) return;

    // Create BOQ items sheet
    const itemsData = data.items.map(item => ({
      "رقم البند": item.item_number,
      "الوصف": item.description,
      "الوحدة": item.unit,
      "الكمية": item.quantity,
      "سعر الوحدة": item.unit_price || 0,
      "الإجمالي": item.total_price || 0,
      "الفئة": item.category || "غير مصنف",
      "ملاحظات": item.notes || ""
    }));

    // Create summary sheet
    const summaryData = [
      { "البيان": "إجمالي العناصر", "القيمة": data.summary?.total_items || data.items.length },
      { "البيان": "إجمالي القيمة", "القيمة": data.summary?.total_value || 0 },
      { "البيان": "العملة", "القيمة": data.summary?.currency || "ر.س" },
      { "البيان": "عدد الفئات", "القيمة": data.summary?.categories?.length || 0 },
    ];

    // Create WBS sheet if available
    const wbsSheetData = wbsData?.wbs?.map(item => ({
      "الكود": item.code,
      "العنوان": item.title,
      "المستوى": item.level,
      "الكود الأب": item.parent_code || "-",
      "العناصر": item.items.join(", ") || "-"
    })) || [];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets
    const ws1 = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, ws1, "جدول الكميات");
    
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "الملخص");
    
    if (wbsSheetData.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(wbsSheetData);
      XLSX.utils.book_append_sheet(wb, ws3, "هيكل تجزئة العمل");
    }

    // Download
    XLSX.writeFile(wb, "boq_analysis.xlsx");
  };

  const exportToWord = () => {
    if (!data.items) return;

    // Create HTML content for Word
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #333; padding: 8px; text-align: right; }
          th { background-color: #f0f0f0; font-weight: bold; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .summary-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .total-row { background-color: #e8f4e8; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>تقرير تحليل جدول الكميات (BOQ)</h1>
        <p>تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}</p>
        
        <div class="summary-box">
          <h2>ملخص المشروع</h2>
          <p><strong>إجمالي العناصر:</strong> ${data.summary?.total_items || data.items.length}</p>
          <p><strong>إجمالي القيمة:</strong> ${(data.summary?.total_value || 0).toLocaleString()} ${data.summary?.currency || 'ر.س'}</p>
          <p><strong>الفئات:</strong> ${data.summary?.categories?.join('، ') || 'غير محدد'}</p>
        </div>

        <h2>جدول الكميات</h2>
        <table>
          <tr>
            <th>رقم البند</th>
            <th>الوصف</th>
            <th>الوحدة</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
            <th>الفئة</th>
          </tr>
          ${data.items.map(item => `
            <tr>
              <td>${item.item_number}</td>
              <td>${item.description}</td>
              <td>${item.unit}</td>
              <td>${item.quantity}</td>
              <td>${item.unit_price?.toLocaleString() || '-'}</td>
              <td>${item.total_price?.toLocaleString() || '-'}</td>
              <td>${item.category || 'غير مصنف'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5">الإجمالي الكلي</td>
            <td colspan="2">${(data.summary?.total_value || 0).toLocaleString()} ${data.summary?.currency || 'ر.س'}</td>
          </tr>
        </table>
    `;

    // Add WBS if available
    if (wbsData?.wbs && wbsData.wbs.length > 0) {
      htmlContent += `
        <h2>هيكل تجزئة العمل (WBS)</h2>
        <table>
          <tr>
            <th>الكود</th>
            <th>العنوان</th>
            <th>المستوى</th>
          </tr>
          ${wbsData.wbs.map(item => `
            <tr>
              <td>${item.code}</td>
              <td style="padding-right: ${item.level * 20}px">${item.title}</td>
              <td>${item.level}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    htmlContent += `</body></html>`;

    // Download as .doc
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boq_report.doc';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!data.items) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add Arabic font support - use built-in fonts
    doc.setFont("helvetica");
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Header with gradient-like background
    doc.setFillColor(59, 130, 246); // Primary blue
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Logo circle
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth - 25, 22, 12, 'F');
    doc.setFillColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text("BOQ", pageWidth - 25, 24, { align: 'center' });

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BOQ Analysis Report", margin, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Bill of Quantities - Professional Report", margin, 30);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, margin, 38);

    // Summary section
    let yPos = 55;
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Project Summary", margin, yPos);
    
    yPos += 8;
    
    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxHeight = 25;
    
    // Box 1: Total Items
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, yPos, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Total Items", margin + 5, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.setFont("helvetica", "bold");
    doc.text(String(data.summary?.total_items || data.items.length), margin + 5, yPos + 20);
    
    // Box 2: Total Value
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Total Value", margin + boxWidth + 10, yPos + 8);
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.setFont("helvetica", "bold");
    const totalValue = data.summary?.total_value || 0;
    doc.text(`${totalValue.toLocaleString()} ${data.summary?.currency || 'SAR'}`, margin + boxWidth + 10, yPos + 20);
    
    // Box 3: Categories
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin + (boxWidth + 5) * 2, yPos, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Categories", margin + (boxWidth + 5) * 2 + 5, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(202, 138, 4);
    doc.setFont("helvetica", "bold");
    doc.text(String(data.summary?.categories?.length || 0), margin + (boxWidth + 5) * 2 + 5, yPos + 20);

    yPos += boxHeight + 15;

    // BOQ Items Table
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Bill of Quantities", margin, yPos);
    
    yPos += 5;

    // Table data
    const tableData = data.items.map((item, index) => [
      String(index + 1),
      item.item_number || '-',
      item.description?.substring(0, 40) + (item.description?.length > 40 ? '...' : '') || '-',
      item.unit || '-',
      String(item.quantity || 0),
      item.unit_price ? item.unit_price.toLocaleString() : '-',
      item.total_price ? item.total_price.toLocaleString() : '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Item No.', 'Description', 'Unit', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
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
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'left', cellWidth: 55 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // Footer on each page
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
        doc.text('BOQ Analyzer - Professional Report', margin, pageHeight - 6);
        doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 6, { align: 'right' });
      },
    });

    // Add WBS section if available
    if (wbsData?.wbs && wbsData.wbs.length > 0) {
      doc.addPage();
      
      // WBS Header
      doc.setFillColor(124, 58, 237); // Purple
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Work Breakdown Structure (WBS)", margin, 18);
      
      const wbsData_ = wbsData.wbs.map(item => [
        item.code,
        '  '.repeat(item.level - 1) + item.title,
        String(item.level),
        item.parent_code || '-',
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Code', 'Title', 'Level', 'Parent']],
        body: wbsData_,
        theme: 'striped',
        headStyles: {
          fillColor: [124, 58, 237],
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
          1: { cellWidth: 100 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      });
    }

    // Save PDF
    doc.save('boq_professional_report.pdf');
  };

  const tabs = [
    { id: "items", label: "العناصر", icon: <Package className="w-4 h-4" /> },
    { id: "wbs", label: "WBS", icon: <Layers className="w-4 h-4" /> },
    { id: "costs", label: "التكاليف", icon: <DollarSign className="w-4 h-4" /> },
    { id: "summary", label: "الملخص", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "charts", label: "الرسوم", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "timeline", label: "الجدول الزمني", icon: <CalendarDays className="w-4 h-4" /> },
    { id: "integration", label: "Schedule Integration", icon: <Link2 className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      {/* KPI Dashboard at the top */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <KPIDashboard 
          data={kpiData} 
          title="Project KPIs / مؤشرات المشروع" 
        />
      </div>
      
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="default" size="sm" onClick={exportToPDF} className="gap-2 bg-gradient-to-r from-primary to-accent">
              <FileDown className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToWord} className="gap-2">
              <FileText className="w-4 h-4" />
              Word
            </Button>
            <Button variant="outline" size="sm" onClick={exportToJSON} className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "items" && (
          <div className="space-y-4">
            {/* BOQ Items Table with Bilingual Headers */}
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="bg-muted/70 border-b border-border">
                    <th className="px-4 py-3 text-right font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">البند</span>
                        <span className="text-xs text-muted-foreground font-normal">Item</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">الوصف العام</span>
                        <span className="text-xs text-muted-foreground font-normal">Description</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">وصف البند</span>
                        <span className="text-xs text-muted-foreground font-normal">Arabic Description</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">الوحدة</span>
                        <span className="text-xs text-muted-foreground font-normal">Unit</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">الكمية (العدد)</span>
                        <span className="text-xs text-muted-foreground font-normal">Quantity</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">سعر الوحدة (ريال سعودي)</span>
                        <span className="text-xs text-muted-foreground font-normal">Price SAR</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">السعر الإجمالي (ريال سعودي)</span>
                        <span className="text-xs text-muted-foreground font-normal">Total Price SAR</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items?.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {item.item_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right max-w-[200px]">
                        <p className="text-sm text-foreground truncate" title={item.description}>
                          {item.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate" title={item.notes || item.description}>
                          {item.notes || item.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{item.quantity.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <span className="text-sm">
                          {item.unit_price ? item.unit_price.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <span className="font-semibold text-primary">
                          {item.total_price ? item.total_price.toLocaleString() : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/10 border-t-2 border-primary/30">
                    <td colSpan={5} className="px-4 py-3 text-right font-bold">
                      <span className="text-foreground">الإجمالي الكلي / Grand Total</span>
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-left">
                      <span className="font-bold text-lg text-primary">
                        {(data.summary?.total_value || data.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0).toLocaleString()} {data.summary?.currency || 'SAR'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Category Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div 
                  key={category} 
                  className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{items.length} items</span>
                    <span className="font-semibold text-primary">
                      {items.reduce((sum, item) => sum + (item.total_price || 0), 0).toLocaleString()} {data.summary?.currency || 'SAR'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "wbs" && wbsData?.wbs && (
          <div className="space-y-2">
            {wbsData.wbs.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-xl border border-border hover:border-primary/30 transition-colors",
                  item.level === 1 && "bg-muted/50",
                  item.level === 2 && "mr-8",
                  item.level === 3 && "mr-16"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    {item.code}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </div>
                {item.items.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    العناصر: {item.items.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "summary" && data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">إجمالي العناصر</p>
              <p className="text-3xl font-display font-bold text-primary">
                {data.summary.total_items}
              </p>
            </div>
            {data.summary.total_value && (
              <div className="p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <p className="text-sm text-muted-foreground mb-1">إجمالي القيمة</p>
                <p className="text-3xl font-display font-bold text-success">
                  {data.summary.total_value.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{data.summary.currency}</p>
              </div>
            )}
            <div className="p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 col-span-1 md:col-span-2">
              <p className="text-sm text-muted-foreground mb-2">الفئات</p>
              <div className="flex flex-wrap gap-2">
                {data.summary.categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "costs" && data.items && (
          <CostAnalysis items={data.items} currency={data.summary?.currency} />
        )}

        {activeTab === "charts" && data.items && (
          <DataCharts items={data.items} summary={data.summary} />
        )}

        {activeTab === "timeline" && wbsData?.wbs && (
          <ProjectTimeline wbsData={wbsData.wbs} />
        )}

        {activeTab === "integration" && data.items && (
          <ScheduleIntegration 
            items={data.items} 
            wbsData={wbsData?.wbs} 
            currency={data.summary?.currency} 
          />
        )}
      </div>
    </div>
  );
}
