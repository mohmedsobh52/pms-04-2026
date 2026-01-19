import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, FileDown, FileSpreadsheet, Scale, ArrowUpDown, CheckCircle2, AlertTriangle, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { getBalanceSettings } from "@/hooks/useBalanceSettings";
import { cn } from "@/lib/utils";
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
}

interface CalculatedCosts {
  calculatedUnitPrice: number;
  aiSuggestedRate?: number;
}

interface BalancedPricingReportProps {
  items: BOQItem[];
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts;
  currency?: string;
}

type BalanceStatus = "balanced" | "slightly_high" | "slightly_low" | "high" | "low";

interface PricingRow {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  originalPrice: number;
  aiSuggestedPrice: number;
  calculatedPrice: number;
  varianceVsAI: number;
  varianceVsCalc: number;
  balanceStatus: BalanceStatus;
  recommendation: string;
}

function getBalanceStatus(originalPrice: number, referencePrice: number): BalanceStatus {
  const settings = getBalanceSettings();
  
  if (originalPrice === 0 || referencePrice === 0) return "balanced";
  
  const variance = ((originalPrice - referencePrice) / referencePrice) * 100;
  
  if (Math.abs(variance) <= settings.balancedThreshold) return "balanced";
  if (variance > settings.slightThreshold) return "high";
  if (variance > settings.balancedThreshold) return "slightly_high";
  if (variance < -settings.slightThreshold) return "low";
  return "slightly_low";
}

function getRecommendation(status: BalanceStatus, variance: number, isArabic: boolean): string {
  switch (status) {
    case "balanced":
      return isArabic ? "✓ السعر متوازن - لا يحتاج تعديل" : "✓ Price is balanced - no adjustment needed";
    case "slightly_high":
      return isArabic 
        ? `↓ السعر أعلى قليلاً بنسبة ${Math.abs(variance).toFixed(1)}% - يُنصح بمراجعة التسعير`
        : `↓ Price is slightly high by ${Math.abs(variance).toFixed(1)}% - consider reviewing`;
    case "slightly_low":
      return isArabic 
        ? `↑ السعر أقل قليلاً بنسبة ${Math.abs(variance).toFixed(1)}% - يمكن زيادته`
        : `↑ Price is slightly low by ${Math.abs(variance).toFixed(1)}% - can be increased`;
    case "high":
      return isArabic 
        ? `⚠️ السعر مرتفع جداً بنسبة ${Math.abs(variance).toFixed(1)}% - يجب تخفيضه`
        : `⚠️ Price is too high by ${Math.abs(variance).toFixed(1)}% - should be reduced`;
    case "low":
      return isArabic 
        ? `⚠️ السعر منخفض جداً بنسبة ${Math.abs(variance).toFixed(1)}% - يجب زيادته`
        : `⚠️ Price is too low by ${Math.abs(variance).toFixed(1)}% - should be increased`;
    default:
      return "";
  }
}

export function BalancedPricingReport({
  items,
  getItemCalculatedCosts,
  currency = "SAR"
}: BalancedPricingReportProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("balanceStatus");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const pricingData = useMemo((): PricingRow[] => {
    return items.map(item => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      
      const originalPrice = item.unit_price || 0;
      const aiSuggestedPrice = calcCosts.aiSuggestedRate || 0;
      const calculatedPrice = calcCosts.calculatedUnitPrice || 0;
      
      // Use AI suggested price as primary reference, fallback to calculated
      const referencePrice = aiSuggestedPrice > 0 ? aiSuggestedPrice : calculatedPrice;
      
      const varianceVsAI = aiSuggestedPrice > 0 
        ? ((originalPrice - aiSuggestedPrice) / aiSuggestedPrice) * 100 
        : 0;
      const varianceVsCalc = calculatedPrice > 0 
        ? ((originalPrice - calculatedPrice) / calculatedPrice) * 100 
        : 0;
      
      const balanceStatus = getBalanceStatus(originalPrice, referencePrice);
      const primaryVariance = aiSuggestedPrice > 0 ? varianceVsAI : varianceVsCalc;
      const recommendation = getRecommendation(balanceStatus, primaryVariance, isArabic);

      return {
        itemNumber: item.item_number,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        originalPrice,
        aiSuggestedPrice,
        calculatedPrice,
        varianceVsAI,
        varianceVsCalc,
        balanceStatus,
        recommendation,
      };
    });
  }, [items, getItemCalculatedCosts, isArabic]);

  const sortedData = useMemo(() => {
    const statusOrder: Record<BalanceStatus, number> = {
      high: 4,
      low: 3,
      slightly_high: 2,
      slightly_low: 1,
      balanced: 0,
    };

    return [...pricingData].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "itemNumber":
          aVal = a.itemNumber;
          bVal = b.itemNumber;
          break;
        case "originalPrice":
          aVal = a.originalPrice;
          bVal = b.originalPrice;
          break;
        case "varianceVsAI":
          aVal = Math.abs(a.varianceVsAI);
          bVal = Math.abs(b.varianceVsAI);
          break;
        case "balanceStatus":
          aVal = statusOrder[a.balanceStatus];
          bVal = statusOrder[b.balanceStatus];
          break;
        default:
          return 0;
      }
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [pricingData, sortField, sortDirection]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    const balanced = pricingData.filter(r => r.balanceStatus === "balanced").length;
    const slightlyHigh = pricingData.filter(r => r.balanceStatus === "slightly_high").length;
    const slightlyLow = pricingData.filter(r => r.balanceStatus === "slightly_low").length;
    const high = pricingData.filter(r => r.balanceStatus === "high").length;
    const low = pricingData.filter(r => r.balanceStatus === "low").length;
    
    const total = pricingData.length;
    const itemsWithReference = pricingData.filter(r => r.aiSuggestedPrice > 0 || r.calculatedPrice > 0).length;
    
    const avgVariance = pricingData
      .filter(r => r.varianceVsAI !== 0 || r.varianceVsCalc !== 0)
      .reduce((sum, r) => sum + Math.abs(r.varianceVsAI || r.varianceVsCalc), 0) / 
      (itemsWithReference || 1);

    return {
      balanced,
      slightlyHigh,
      slightlyLow,
      high,
      low,
      total,
      itemsWithReference,
      avgVariance,
      balancedPercent: total > 0 ? (balanced / total) * 100 : 0,
      aboveMarket: slightlyHigh + high,
      belowMarket: slightlyLow + low,
    };
  }, [pricingData]);

  const getStatusBadge = (status: BalanceStatus) => {
    switch (status) {
      case "balanced":
        return (
          <Badge className="gap-1 bg-success/20 text-success border-success/30 hover:bg-success/30">
            <CheckCircle2 className="w-3 h-3" />
            {isArabic ? "متوازن" : "Balanced"}
          </Badge>
        );
      case "slightly_high":
        return (
          <Badge className="gap-1 bg-warning/20 text-warning border-warning/30 hover:bg-warning/30">
            <TrendingUp className="w-3 h-3" />
            {isArabic ? "أعلى قليلاً" : "Slightly High"}
          </Badge>
        );
      case "slightly_low":
        return (
          <Badge className="gap-1 bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30">
            <TrendingDown className="w-3 h-3" />
            {isArabic ? "أقل قليلاً" : "Slightly Low"}
          </Badge>
        );
      case "high":
        return (
          <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">
            <AlertTriangle className="w-3 h-3" />
            {isArabic ? "مرتفع جداً" : "Too High"}
          </Badge>
        );
      case "low":
        return (
          <Badge className="gap-1 bg-orange-500/20 text-orange-600 border-orange-500/30 hover:bg-orange-500/30">
            <XCircle className="w-3 h-3" />
            {isArabic ? "منخفض جداً" : "Too Low"}
          </Badge>
        );
    }
  };

  const exportToPDF = () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;

    // Header
    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(isArabic ? "تقرير التسعير المتوازن" : "Balanced Pricing Report", margin, 16);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 16);

    // Summary
    let yPos = 35;
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);

    const summaryItems = [
      { label: isArabic ? "متوازن" : "Balanced", value: `${stats.balanced} (${stats.balancedPercent.toFixed(1)}%)`, color: [16, 185, 129] },
      { label: isArabic ? "أعلى من السوق" : "Above Market", value: `${stats.aboveMarket}`, color: [245, 158, 11] },
      { label: isArabic ? "أقل من السوق" : "Below Market", value: `${stats.belowMarket}`, color: [59, 130, 246] },
      { label: isArabic ? "متوسط الفارق" : "Avg Variance", value: `${stats.avgVariance.toFixed(1)}%`, color: [100, 116, 139] },
    ];

    summaryItems.forEach((item, idx) => {
      const x = margin + (idx * 70);
      pdf.setFillColor(...(item.color as [number, number, number]));
      pdf.roundedRect(x, yPos, 65, 20, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text(item.label, x + 5, yPos + 8);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(item.value, x + 5, yPos + 16);
    });

    // Table
    const tableData = sortedData.map(row => [
      row.itemNumber,
      row.description.substring(0, 30) + (row.description.length > 30 ? '...' : ''),
      row.originalPrice > 0 ? row.originalPrice.toLocaleString() : '-',
      row.aiSuggestedPrice > 0 ? row.aiSuggestedPrice.toLocaleString() : '-',
      row.calculatedPrice > 0 ? row.calculatedPrice.toLocaleString() : '-',
      row.balanceStatus === "balanced" ? "✓" : 
        row.balanceStatus === "high" || row.balanceStatus === "low" ? "⚠" : "~",
      row.recommendation.replace(/[✓↓↑⚠️]/g, '').substring(0, 40),
    ]);

    autoTable(pdf, {
      startY: yPos + 30,
      head: [[
        isArabic ? '#' : 'Item #', 
        isArabic ? 'الوصف' : 'Description', 
        isArabic ? 'السعر الأصلي' : 'Original', 
        isArabic ? 'سعر AI' : 'AI Rate', 
        isArabic ? 'المحسوب' : 'Calculated', 
        isArabic ? 'الحالة' : 'Status',
        isArabic ? 'التوصية' : 'Recommendation'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'center', cellWidth: 15 },
        6: { cellWidth: 60 },
      },
      margin: { left: margin, right: margin },
    });

    pdf.save('balanced-pricing-report.pdf');
  };

  const exportToExcel = () => {
    const data = sortedData.map(row => ({
      [isArabic ? "رقم البند" : "Item Number"]: row.itemNumber,
      [isArabic ? "الوصف" : "Description"]: row.description,
      [isArabic ? "الوحدة" : "Unit"]: row.unit,
      [isArabic ? "الكمية" : "Quantity"]: row.quantity,
      [isArabic ? "السعر الأصلي" : "Original Price"]: row.originalPrice,
      [isArabic ? "سعر AI المقترح" : "AI Suggested Price"]: row.aiSuggestedPrice,
      [isArabic ? "السعر المحسوب" : "Calculated Price"]: row.calculatedPrice,
      [isArabic ? "الفارق عن AI %" : "Variance vs AI %"]: row.varianceVsAI.toFixed(2),
      [isArabic ? "الفارق عن المحسوب %" : "Variance vs Calc %"]: row.varianceVsCalc.toFixed(2),
      [isArabic ? "حالة التوازن" : "Balance Status"]: row.balanceStatus,
      [isArabic ? "التوصية" : "Recommendation"]: row.recommendation,
    }));

    const summaryData = [
      { [isArabic ? "الملخص" : "Summary"]: isArabic ? "البنود المتوازنة" : "Balanced Items", [isArabic ? "القيمة" : "Value"]: `${stats.balanced} (${stats.balancedPercent.toFixed(1)}%)` },
      { [isArabic ? "الملخص" : "Summary"]: isArabic ? "أعلى من السوق" : "Above Market", [isArabic ? "القيمة" : "Value"]: stats.aboveMarket },
      { [isArabic ? "الملخص" : "Summary"]: isArabic ? "أقل من السوق" : "Below Market", [isArabic ? "القيمة" : "Value"]: stats.belowMarket },
      { [isArabic ? "الملخص" : "Summary"]: isArabic ? "متوسط الفارق" : "Average Variance", [isArabic ? "القيمة" : "Value"]: `${stats.avgVariance.toFixed(2)}%` },
    ];

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws1, isArabic ? "تحليل التوازن" : "Balance Analysis");
    
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, isArabic ? "الملخص" : "Summary");

    XLSX.writeFile(wb, 'balanced-pricing-report.xlsx');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-success/30 text-success hover:bg-success/10">
          <Scale className="w-4 h-4" />
          {isArabic ? "تقرير التوازن" : "Balance Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-success" />
              {isArabic ? "تقرير التسعير المتوازن" : "Balanced Pricing Report"}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <FileDown className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-4">
          <Card className="bg-success/10 border-success/20">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{stats.balanced}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "متوازن" : "Balanced"}</p>
              <p className="text-xs font-medium text-success">{stats.balancedPercent.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold text-warning">{stats.slightlyHigh}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "أعلى قليلاً" : "Slightly High"}</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-2xl font-bold text-destructive">{stats.high}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "مرتفع جداً" : "Too High"}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <TrendingDown className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-600">{stats.slightlyLow}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "أقل قليلاً" : "Slightly Low"}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-3 text-center">
              <XCircle className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-600">{stats.low}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "منخفض جداً" : "Too Low"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort("itemNumber")}>
                  <span className="flex items-center gap-1">
                    # <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 text-left">{isArabic ? "الوصف" : "Description"}</th>
                <th className="px-3 py-3 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort("originalPrice")}>
                  <span className="flex items-center justify-end gap-1">
                    {isArabic ? "الأصلي" : "Original"} <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 text-right bg-purple-500/5">
                  {isArabic ? "AI" : "AI Rate"}
                </th>
                <th className="px-3 py-3 text-right bg-primary/5">
                  {isArabic ? "المحسوب" : "Calculated"}
                </th>
                <th className="px-3 py-3 text-center cursor-pointer hover:bg-muted" onClick={() => toggleSort("balanceStatus")}>
                  <span className="flex items-center justify-center gap-1">
                    {isArabic ? "الحالة" : "Status"} <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {isArabic ? "التوصية" : "Recommendation"}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.map((row, idx) => (
                <tr key={row.itemNumber} className={cn(
                  "hover:bg-muted/30",
                  idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}>
                  <td className="px-3 py-2 font-mono text-xs">{row.itemNumber}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={row.description}>{row.description}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.originalPrice > 0 ? row.originalPrice.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right bg-purple-500/5 text-purple-600">
                    {row.aiSuggestedPrice > 0 ? row.aiSuggestedPrice.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-right bg-primary/5 text-primary">
                    {row.calculatedPrice > 0 ? row.calculatedPrice.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {getStatusBadge(row.balanceStatus)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[250px]">
                    {row.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
