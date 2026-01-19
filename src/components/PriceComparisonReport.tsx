import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, FileDown, FileSpreadsheet, BarChart3, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from "@/lib/exceljs-utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface ItemCostData {
  itemId: string;
  aiSuggestedRate?: number;
  materials?: number;
  profitMargin?: number;
}

interface CalculatedCosts {
  calculatedUnitPrice: number;
  aiSuggestedRate?: number;
}

interface PriceComparisonReportProps {
  items: BOQItem[];
  getItemCostData: (itemId: string) => ItemCostData;
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts;
  currency?: string;
}

interface ComparisonRow {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  originalPrice: number;
  aiSuggestedPrice: number;
  calculatedPrice: number;
  varianceVsOriginal: number;
  varianceVsAI: number;
}

export function PriceComparisonReport({
  items,
  getItemCostData,
  getItemCalculatedCosts,
  currency = "SAR"
}: PriceComparisonReportProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("itemNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const comparisonData = useMemo((): ComparisonRow[] => {
    return items.map(item => {
      const costData = getItemCostData(item.item_number);
      const calcCosts = getItemCalculatedCosts(item.item_number);
      
      const originalPrice = item.unit_price || 0;
      const aiSuggestedPrice = calcCosts.aiSuggestedRate || 0;
      const calculatedPrice = calcCosts.calculatedUnitPrice || 0;

      const varianceVsOriginal = originalPrice > 0 
        ? ((calculatedPrice - originalPrice) / originalPrice) * 100 
        : 0;
      const varianceVsAI = aiSuggestedPrice > 0 
        ? ((calculatedPrice - aiSuggestedPrice) / aiSuggestedPrice) * 100 
        : 0;

      return {
        itemNumber: item.item_number,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        originalPrice,
        aiSuggestedPrice,
        calculatedPrice,
        varianceVsOriginal,
        varianceVsAI,
      };
    });
  }, [items, getItemCostData, getItemCalculatedCosts]);

  const sortedData = useMemo(() => {
    return [...comparisonData].sort((a, b) => {
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
        case "aiSuggestedPrice":
          aVal = a.aiSuggestedPrice;
          bVal = b.aiSuggestedPrice;
          break;
        case "calculatedPrice":
          aVal = a.calculatedPrice;
          bVal = b.calculatedPrice;
          break;
        case "varianceVsOriginal":
          aVal = Math.abs(a.varianceVsOriginal);
          bVal = Math.abs(b.varianceVsOriginal);
          break;
        default:
          return 0;
      }
      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [comparisonData, sortField, sortDirection]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const totalOriginal = comparisonData.reduce((sum, row) => sum + (row.originalPrice * row.quantity), 0);
    const totalAI = comparisonData.reduce((sum, row) => sum + (row.aiSuggestedPrice * row.quantity), 0);
    const totalCalculated = comparisonData.reduce((sum, row) => sum + (row.calculatedPrice * row.quantity), 0);
    
    const itemsWithCalculation = comparisonData.filter(row => row.calculatedPrice > 0).length;
    const itemsWithAI = comparisonData.filter(row => row.aiSuggestedPrice > 0).length;
    
    const avgVariance = comparisonData
      .filter(row => row.varianceVsOriginal !== 0)
      .reduce((sum, row) => sum + row.varianceVsOriginal, 0) / 
      (comparisonData.filter(row => row.varianceVsOriginal !== 0).length || 1);

    return {
      totalOriginal,
      totalAI,
      totalCalculated,
      itemsWithCalculation,
      itemsWithAI,
      avgVariance,
      overallVariance: totalOriginal > 0 ? ((totalCalculated - totalOriginal) / totalOriginal) * 100 : 0,
    };
  }, [comparisonData]);

  const getVarianceBadge = (variance: number) => {
    if (Math.abs(variance) < 0.1) {
      return <Badge variant="secondary" className="gap-1"><Minus className="w-3 h-3" /> 0%</Badge>;
    }
    if (variance > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <TrendingUp className="w-3 h-3" />
          +{variance.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-success text-success-foreground">
        <TrendingDown className="w-3 h-3" />
        {variance.toFixed(1)}%
      </Badge>
    );
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
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Price Comparison Report", margin, 16);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, 16);

    // Summary cards
    let yPos = 35;
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);

    const summaryItems = [
      { label: "Total Original", value: `${stats.totalOriginal.toLocaleString()} ${currency}` },
      { label: "Total AI Suggested", value: `${stats.totalAI.toLocaleString()} ${currency}` },
      { label: "Total Calculated", value: `${stats.totalCalculated.toLocaleString()} ${currency}` },
      { label: "Overall Variance", value: `${stats.overallVariance > 0 ? '+' : ''}${stats.overallVariance.toFixed(1)}%` },
    ];

    summaryItems.forEach((item, idx) => {
      const x = margin + (idx * 70);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, yPos, 65, 20, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(item.label, x + 5, yPos + 8);
      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text(item.value, x + 5, yPos + 16);
    });

    // Table
    const tableData = sortedData.map(row => [
      row.itemNumber,
      row.description.substring(0, 35) + (row.description.length > 35 ? '...' : ''),
      row.originalPrice > 0 ? row.originalPrice.toLocaleString() : '-',
      row.aiSuggestedPrice > 0 ? row.aiSuggestedPrice.toLocaleString() : '-',
      row.calculatedPrice > 0 ? row.calculatedPrice.toLocaleString() : '-',
      row.varianceVsOriginal !== 0 ? `${row.varianceVsOriginal > 0 ? '+' : ''}${row.varianceVsOriginal.toFixed(1)}%` : '-',
    ]);

    autoTable(pdf, {
      startY: yPos + 30,
      head: [['Item #', 'Description', 'Original Price', 'AI Suggested', 'Calculated', 'Variance']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 80 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
    });

    pdf.save('price-comparison-report.pdf');
  };

  const exportToExcel = () => {
    const data = sortedData.map(row => ({
      "Item Number": row.itemNumber,
      "Description": row.description,
      "Unit": row.unit,
      "Quantity": row.quantity,
      "Original Price": row.originalPrice,
      "AI Suggested Price": row.aiSuggestedPrice,
      "Calculated Price": row.calculatedPrice,
      "Variance vs Original %": row.varianceVsOriginal.toFixed(2),
      "Variance vs AI %": row.varianceVsAI.toFixed(2),
      "Original Total": row.originalPrice * row.quantity,
      "Calculated Total": row.calculatedPrice * row.quantity,
    }));

    const summaryData = [
      { "Summary": "Total Original", "Value": stats.totalOriginal },
      { "Summary": "Total AI Suggested", "Value": stats.totalAI },
      { "Summary": "Total Calculated", "Value": stats.totalCalculated },
      { "Summary": "Overall Variance %", "Value": stats.overallVariance.toFixed(2) },
      { "Summary": "Items with Calculation", "Value": stats.itemsWithCalculation },
      { "Summary": "Items with AI Rates", "Value": stats.itemsWithAI },
    ];

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws1, "Price Comparison");
    
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    XLSX.writeFile(wb, 'price-comparison-report.xlsx');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          {isArabic ? "مقارنة الأسعار" : "View Comparison"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {isArabic ? "تقرير مقارنة الأسعار" : "Price Comparison Report"}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isArabic ? "الإجمالي الأصلي" : "Total Original"}</p>
              <p className="text-xl font-bold">{stats.totalOriginal.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي AI" : "Total AI Suggested"}</p>
              <p className="text-xl font-bold text-purple-600">{stats.totalAI.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isArabic ? "الإجمالي المحسوب" : "Total Calculated"}</p>
              <p className="text-xl font-bold text-primary">{stats.totalCalculated.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{currency}</span></p>
            </CardContent>
          </Card>
          <Card className={cn(
            "border",
            stats.overallVariance > 0 ? "bg-destructive/10 border-destructive/20" : "bg-success/10 border-success/20"
          )}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{isArabic ? "الفارق الإجمالي" : "Overall Variance"}</p>
              <p className={cn(
                "text-xl font-bold",
                stats.overallVariance > 0 ? "text-destructive" : "text-success"
              )}>
                {stats.overallVariance > 0 ? '+' : ''}{stats.overallVariance.toFixed(1)}%
              </p>
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
                <th className="px-3 py-3 text-left">Description</th>
                <th className="px-3 py-3 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort("originalPrice")}>
                  <span className="flex items-center justify-end gap-1">
                    Original <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:bg-muted bg-purple-500/5" onClick={() => toggleSort("aiSuggestedPrice")}>
                  <span className="flex items-center justify-end gap-1">
                    AI Suggested <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:bg-muted bg-primary/5" onClick={() => toggleSort("calculatedPrice")}>
                  <span className="flex items-center justify-end gap-1">
                    Calculated <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-3 py-3 text-center cursor-pointer hover:bg-muted" onClick={() => toggleSort("varianceVsOriginal")}>
                  <span className="flex items-center justify-center gap-1">
                    Variance <ArrowUpDown className="w-3 h-3" />
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
                  <td className="px-3 py-2 text-right">{row.originalPrice > 0 ? row.originalPrice.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right bg-purple-500/5 text-purple-600">
                    {row.aiSuggestedPrice > 0 ? row.aiSuggestedPrice.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-right bg-primary/5 font-semibold text-primary">
                    {row.calculatedPrice > 0 ? row.calculatedPrice.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.varianceVsOriginal !== 0 && row.originalPrice > 0 && row.calculatedPrice > 0
                      ? getVarianceBadge(row.varianceVsOriginal)
                      : <span className="text-muted-foreground">-</span>
                    }
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
