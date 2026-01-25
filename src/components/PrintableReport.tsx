import { useState, useRef } from "react";
import { Printer, Download, FileText, Settings, Eye, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
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
}

interface PrintableReportProps {
  projectName?: string;
  boqItems?: BOQItem[];
  procurementItems?: ProcurementItem[];
  resourceItems?: ResourceItem[];
  timelineItems?: TimelineItem[];
  projectStartDate?: Date;
  currency?: string;
  companyName?: string;
  companyLogo?: string;
}

export function PrintableReport({
  projectName = "المشروع",
  boqItems = [],
  procurementItems = [],
  resourceItems = [],
  timelineItems = [],
  projectStartDate = new Date(),
  currency = "SAR",
  companyName = "",
  companyLogo = "",
}: PrintableReportProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Customization options
  const [includeCover, setIncludeCover] = useState(true);
  const [includeTOC, setIncludeTOC] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeBOQ, setIncludeBOQ] = useState(true);
  const [includeProcurement, setIncludeProcurement] = useState(true);
  const [includeResources, setIncludeResources] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeSCurve, setIncludeSCurve] = useState(true);
  const [includeGantt, setIncludeGantt] = useState(true);
  
  // Print settings
  const [paperSize, setPaperSize] = useState<"a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [customTitle, setCustomTitle] = useState(projectName);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showDate, setShowDate] = useState(true);

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const totalValue = boqItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const categories = [...new Set(boqItems.map(i => i.category).filter(Boolean))];
  const totalDuration = timelineItems.length > 0 
    ? Math.max(...timelineItems.map(t => t.startDay + t.duration))
    : 0;
  const laborCount = resourceItems.filter(r => r.type === 'labor').length;
  const equipmentCount = resourceItems.filter(r => r.type === 'equipment').length;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(isArabic ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow popups for printing");
      return;
    }

    const printStyles = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: ${paperSize} ${orientation};
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #1e293b;
          direction: ${isArabic ? 'rtl' : 'ltr'};
        }
        .page-break {
          page-break-before: always;
        }
        .cover-page {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%);
          color: white;
          text-align: center;
        }
        .cover-title {
          font-size: 32pt;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .cover-subtitle {
          font-size: 18pt;
          opacity: 0.9;
        }
        .cover-date {
          font-size: 12pt;
          margin-top: 40px;
          opacity: 0.8;
        }
        .company-logo {
          max-width: 150px;
          max-height: 80px;
          margin-bottom: 30px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 16pt;
          font-weight: bold;
          color: #3b82f6;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .summary-label {
          font-size: 10pt;
          color: #64748b;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 14pt;
          font-weight: bold;
          color: #1e293b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9pt;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          text-align: ${isArabic ? 'right' : 'left'};
        }
        th {
          background: #3b82f6;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        .toc-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dotted #cbd5e1;
        }
        .toc-title {
          font-weight: 500;
        }
        .toc-page {
          color: #64748b;
        }
        .footer {
          position: fixed;
          bottom: 10mm;
          left: 15mm;
          right: 15mm;
          font-size: 9pt;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        .gantt-bar {
          height: 20px;
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
          border-radius: 4px;
          margin: 4px 0;
        }
        .critical-bar {
          background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
        }
        .scurve-placeholder {
          height: 200px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      </style>
    `;

    let htmlContent = `
      <!DOCTYPE html>
      <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${customTitle} - ${isArabic ? "التقرير الشامل" : "Comprehensive Report"}</title>
        ${printStyles}
      </head>
      <body>
    `;

    // Cover Page
    if (includeCover) {
      htmlContent += `
        <div class="cover-page">
          ${companyLogo ? `<img src="${companyLogo}" class="company-logo" alt="Logo"/>` : ''}
          ${companyName ? `<p style="font-size: 14pt; margin-bottom: 20px;">${companyName}</p>` : ''}
          <h1 class="cover-title">${isArabic ? "تقرير التحليل الشامل" : "Comprehensive Analysis Report"}</h1>
          <p class="cover-subtitle">${customTitle}</p>
          <p class="cover-date">${format(new Date(), "yyyy/MM/dd")}</p>
        </div>
      `;
    }

    // Table of Contents
    if (includeTOC) {
      let tocItems = [];
      let pageNum = includeCover ? 2 : 1;
      if (includeSummary) tocItems.push({ title: isArabic ? "الملخص التنفيذي" : "Executive Summary", page: pageNum++ });
      if (includeBOQ && boqItems.length > 0) tocItems.push({ title: isArabic ? "جدول الكميات" : "Bill of Quantities", page: pageNum++ });
      if (includeProcurement && procurementItems.length > 0) tocItems.push({ title: isArabic ? "جدول المشتريات" : "Procurement Schedule", page: pageNum++ });
      if (includeResources && resourceItems.length > 0) tocItems.push({ title: isArabic ? "جدول الموارد" : "Resource Schedule", page: pageNum++ });
      if (includeTimeline && timelineItems.length > 0) tocItems.push({ title: isArabic ? "الجدول الزمني" : "Project Timeline", page: pageNum++ });
      if (includeSCurve) tocItems.push({ title: isArabic ? "منحنى S" : "S-Curve Analysis", page: pageNum++ });
      if (includeGantt && timelineItems.length > 0) tocItems.push({ title: isArabic ? "مخطط جانت" : "Gantt Chart", page: pageNum++ });

      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "جدول المحتويات" : "Table of Contents"}</h2>
          ${tocItems.map((item, idx) => `
            <div class="toc-item">
              <span class="toc-title">${idx + 1}. ${item.title}</span>
              <span class="toc-page">${item.page}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Executive Summary
    if (includeSummary) {
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "الملخص التنفيذي" : "Executive Summary"}</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "إجمالي البنود" : "Total Items"}</div>
              <div class="summary-value">${boqItems.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
              <div class="summary-value">${formatCurrency(totalValue)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "الفئات" : "Categories"}</div>
              <div class="summary-value">${categories.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "المدة الإجمالية" : "Total Duration"}</div>
              <div class="summary-value">${totalDuration} ${isArabic ? "يوم" : "days"}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "بنود المشتريات" : "Procurement Items"}</div>
              <div class="summary-value">${procurementItems.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "الموارد" : "Resources"}</div>
              <div class="summary-value">${resourceItems.length}</div>
            </div>
          </div>
          <p style="margin-top: 20px;">
            ${isArabic 
              ? `يتضمن هذا التقرير تحليلاً شاملاً لمشروع "${customTitle}". يتألف المشروع من ${boqItems.length} بند موزعة على ${categories.length} فئة بقيمة إجمالية ${formatCurrency(totalValue)}. المدة المتوقعة للمشروع هي ${totalDuration} يوم عمل.`
              : `This report provides a comprehensive analysis of the "${customTitle}" project. The project consists of ${boqItems.length} items across ${categories.length} categories with a total value of ${formatCurrency(totalValue)}. The expected project duration is ${totalDuration} working days.`
            }
          </p>
        </div>
      `;
    }

    // BOQ Table
    if (includeBOQ && boqItems.length > 0) {
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "جدول الكميات (BOQ)" : "Bill of Quantities (BOQ)"}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isArabic ? "رقم البند" : "Item No."}</th>
                <th>${isArabic ? "الوصف" : "Description"}</th>
                <th>${isArabic ? "الوحدة" : "Unit"}</th>
                <th>${isArabic ? "الكمية" : "Qty"}</th>
                <th>${isArabic ? "سعر الوحدة" : "Unit Price"}</th>
                <th>${isArabic ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              ${boqItems.slice(0, 50).map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.item_number}</td>
                  <td>${item.description?.substring(0, 50) || ''}</td>
                  <td>${item.unit || ''}</td>
                  <td>${item.quantity || 0}</td>
                  <td>${formatCurrency(item.unit_price || 0)}</td>
                  <td>${formatCurrency(item.total_price || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${boqItems.length > 50 ? `<p style="color: #64748b; font-style: italic;">${isArabic ? `... و ${boqItems.length - 50} بند آخر` : `... and ${boqItems.length - 50} more items`}</p>` : ''}
        </div>
      `;
    }

    // Procurement Table
    if (includeProcurement && procurementItems.length > 0) {
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "جدول المشتريات" : "Procurement Schedule"}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isArabic ? "رقم البند" : "Item No."}</th>
                <th>${isArabic ? "الوصف" : "Description"}</th>
                <th>${isArabic ? "الفئة" : "Category"}</th>
                <th>${isArabic ? "الكمية" : "Qty"}</th>
                <th>${isArabic ? "التكلفة" : "Cost"}</th>
                <th>${isArabic ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              ${procurementItems.slice(0, 30).map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.itemNumber}</td>
                  <td>${item.description?.substring(0, 40) || ''}</td>
                  <td>${item.category || ''}</td>
                  <td>${item.quantity || 0}</td>
                  <td>${formatCurrency(item.estimatedCost || 0)}</td>
                  <td>${item.status || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Resources Table
    if (includeResources && resourceItems.length > 0) {
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "جدول الموارد" : "Resource Schedule"}</h2>
          <div class="summary-grid" style="margin-bottom: 20px;">
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "العمالة" : "Labor"}</div>
              <div class="summary-value">${laborCount}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "المعدات" : "Equipment"}</div>
              <div class="summary-value">${equipmentCount}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "إجمالي التكلفة" : "Total Cost"}</div>
              <div class="summary-value">${formatCurrency(resourceItems.reduce((sum, r) => sum + (r.totalCost || 0), 0))}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${isArabic ? "النوع" : "Type"}</th>
                <th>${isArabic ? "الاسم" : "Name"}</th>
                <th>${isArabic ? "الكمية" : "Qty"}</th>
                <th>${isArabic ? "المعدل/يوم" : "Rate/Day"}</th>
                <th>${isArabic ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              ${resourceItems.slice(0, 30).map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.type === 'labor' ? '👷' : item.type === 'equipment' ? '🚜' : '📦'}</td>
                  <td>${item.name?.substring(0, 30) || ''}</td>
                  <td>${item.quantity || 0}</td>
                  <td>${formatCurrency(item.ratePerDay || 0)}</td>
                  <td>${formatCurrency(item.totalCost || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Timeline Table
    if (includeTimeline && timelineItems.length > 0) {
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "الجدول الزمني" : "Project Timeline"}</h2>
          <table>
            <thead>
              <tr>
                <th>${isArabic ? "الكود" : "Code"}</th>
                <th>${isArabic ? "المهمة" : "Task"}</th>
                <th>${isArabic ? "البداية" : "Start"}</th>
                <th>${isArabic ? "المدة" : "Duration"}</th>
                <th>${isArabic ? "التقدم" : "Progress"}</th>
              </tr>
            </thead>
            <tbody>
              ${timelineItems.slice(0, 30).map(item => `
                <tr style="${item.isCritical ? 'background: #fef2f2;' : ''}">
                  <td>${item.code}</td>
                  <td style="padding-left: ${item.level * 15}px;">${item.title?.substring(0, 40) || ''}</td>
                  <td>${format(addDays(projectStartDate, item.startDay), "yyyy/MM/dd")}</td>
                  <td>${item.duration} ${isArabic ? "يوم" : "days"}</td>
                  <td>${item.progress}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // S-Curve Placeholder
    if (includeSCurve) {
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "منحنى S - التدفق النقدي" : "S-Curve - Cash Flow Analysis"}</h2>
          <div class="scurve-placeholder">
            <p>${isArabic ? "الرسم البياني متاح في العرض التفاعلي" : "Chart available in interactive view"}</p>
          </div>
          <div class="summary-grid" style="margin-top: 20px;">
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "الميزانية الإجمالية" : "Total Budget"}</div>
              <div class="summary-value">${formatCurrency(totalValue)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "المدة" : "Duration"}</div>
              <div class="summary-value">${totalDuration} ${isArabic ? "يوم" : "days"}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">${isArabic ? "البداية" : "Start Date"}</div>
              <div class="summary-value">${format(projectStartDate, "yyyy/MM/dd")}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Gantt Chart Visual
    if (includeGantt && timelineItems.length > 0) {
      const maxDuration = Math.max(...timelineItems.map(t => t.startDay + t.duration), 1);
      htmlContent += `
        <div class="page-break"></div>
        <div class="section">
          <h2 class="section-title">${isArabic ? "مخطط جانت" : "Gantt Chart"}</h2>
          <div style="overflow-x: auto;">
            ${timelineItems.slice(0, 15).map(item => {
              const leftPercent = (item.startDay / maxDuration) * 100;
              const widthPercent = (item.duration / maxDuration) * 100;
              return `
                <div style="display: flex; align-items: center; margin: 8px 0;">
                  <div style="width: 150px; font-size: 10pt; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.title?.substring(0, 25) || ''}
                  </div>
                  <div style="flex: 1; position: relative; height: 24px; background: #f1f5f9; border-radius: 4px;">
                    <div class="gantt-bar ${item.isCritical ? 'critical-bar' : ''}" 
                         style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%; min-width: 2px;">
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          ${timelineItems.length > 15 ? `<p style="color: #64748b; font-style: italic; margin-top: 10px;">${isArabic ? `... و ${timelineItems.length - 15} مهمة أخرى` : `... and ${timelineItems.length - 15} more tasks`}</p>` : ''}
        </div>
      `;
    }

    // Footer
    if (showPageNumbers || showDate) {
      htmlContent += `
        <div class="footer">
          <span>${showDate ? format(new Date(), "yyyy/MM/dd HH:mm") : ''}</span>
          <span>${customTitle}</span>
          <span>${showPageNumbers ? (isArabic ? 'طُبع تلقائياً' : 'Auto-generated') : ''}</span>
        </div>
      `;
    }

    htmlContent += `
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        setIsOpen(false);
        toast.success(isArabic ? "تم فتح نافذة الطباعة" : "Print dialog opened");
      }, 250);
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          {isArabic ? "طباعة التقرير" : "Print Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {isArabic ? "خيارات الطباعة" : "Print Options"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Title & Settings */}
            <div className="space-y-4">
              <Label>{isArabic ? "عنوان التقرير" : "Report Title"}</Label>
              <Input 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={isArabic ? "اسم المشروع" : "Project Name"}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "حجم الورق" : "Paper Size"}</Label>
                  <Select value={paperSize} onValueChange={(v: "a4" | "letter") => setPaperSize(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الاتجاه" : "Orientation"}</Label>
                  <Select value={orientation} onValueChange={(v: "portrait" | "landscape") => setOrientation(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">{isArabic ? "عمودي" : "Portrait"}</SelectItem>
                      <SelectItem value="landscape">{isArabic ? "أفقي" : "Landscape"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sections to Include */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">{isArabic ? "الأقسام المضمنة" : "Sections to Include"}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="cover" checked={includeCover} onCheckedChange={(c) => setIncludeCover(!!c)} />
                  <Label htmlFor="cover" className="cursor-pointer">{isArabic ? "صفحة الغلاف" : "Cover Page"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="toc" checked={includeTOC} onCheckedChange={(c) => setIncludeTOC(!!c)} />
                  <Label htmlFor="toc" className="cursor-pointer">{isArabic ? "جدول المحتويات" : "Table of Contents"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="summary" checked={includeSummary} onCheckedChange={(c) => setIncludeSummary(!!c)} />
                  <Label htmlFor="summary" className="cursor-pointer">{isArabic ? "الملخص التنفيذي" : "Executive Summary"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="boq" checked={includeBOQ} onCheckedChange={(c) => setIncludeBOQ(!!c)} disabled={boqItems.length === 0} />
                  <Label htmlFor="boq" className="cursor-pointer">{isArabic ? "جدول الكميات" : "Bill of Quantities"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="procurement" checked={includeProcurement} onCheckedChange={(c) => setIncludeProcurement(!!c)} disabled={procurementItems.length === 0} />
                  <Label htmlFor="procurement" className="cursor-pointer">{isArabic ? "جدول المشتريات" : "Procurement"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="resources" checked={includeResources} onCheckedChange={(c) => setIncludeResources(!!c)} disabled={resourceItems.length === 0} />
                  <Label htmlFor="resources" className="cursor-pointer">{isArabic ? "جدول الموارد" : "Resources"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="timeline" checked={includeTimeline} onCheckedChange={(c) => setIncludeTimeline(!!c)} disabled={timelineItems.length === 0} />
                  <Label htmlFor="timeline" className="cursor-pointer">{isArabic ? "الجدول الزمني" : "Timeline"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="scurve" checked={includeSCurve} onCheckedChange={(c) => setIncludeSCurve(!!c)} />
                  <Label htmlFor="scurve" className="cursor-pointer">{isArabic ? "منحنى S" : "S-Curve"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="gantt" checked={includeGantt} onCheckedChange={(c) => setIncludeGantt(!!c)} disabled={timelineItems.length === 0} />
                  <Label htmlFor="gantt" className="cursor-pointer">{isArabic ? "مخطط جانت" : "Gantt Chart"}</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Options */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">{isArabic ? "خيارات إضافية" : "Additional Options"}</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="pageNumbers" checked={showPageNumbers} onCheckedChange={(c) => setShowPageNumbers(!!c)} />
                  <Label htmlFor="pageNumbers" className="cursor-pointer">{isArabic ? "أرقام الصفحات" : "Page Numbers"}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="showDate" checked={showDate} onCheckedChange={(c) => setShowDate(!!c)} />
                  <Label htmlFor="showDate" className="cursor-pointer">{isArabic ? "تاريخ الطباعة" : "Print Date"}</Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {isArabic ? "طباعة الآن" : "Print Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
