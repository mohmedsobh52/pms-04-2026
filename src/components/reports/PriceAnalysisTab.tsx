import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BarChart3, 
  Scale, 
  TrendingUp, 
  History, 
  FileDown,
  FileSpreadsheet,
  Eye,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from "@/lib/exceljs-utils";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
}

interface PricingHistoryRecord {
  id: string;
  item_number: string;
  item_description: string;
  suggested_price: number;
  final_price: number | null;
  accuracy_score: number | null;
  source: string | null;
  deviation_percent: number | null;
  is_approved: boolean | null;
  confidence: string | null;
}

interface PriceAnalysisTabProps {
  projects: Project[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const PriceAnalysisTab = React.forwardRef<HTMLDivElement, PriceAnalysisTabProps>(
  ({ projects }, ref) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [pricingHistory, setPricingHistory] = useState<PricingHistoryRecord[]>([]);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const items = selectedProject?.analysis_data?.items || [];

  // Fetch pricing history when project changes
  useEffect(() => {
    if (selectedProjectId && user) {
      fetchPricingHistory();
    }
  }, [selectedProjectId, user]);

  const fetchPricingHistory = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("pricing_history")
        .select("*")
        .eq("project_id", selectedProjectId)
        .eq("user_id", user.id);

      if (error) throw error;
      setPricingHistory((data || []) as PricingHistoryRecord[]);
    } catch (error) {
      console.error("Error fetching pricing history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculate comprehensive price stats
  const priceStats = useMemo(() => {
    if (items.length === 0) return null;

    const totalOriginal = items.reduce((sum: number, item: any) => 
      sum + (parseFloat(item.total_price) || 0), 0);
    
    const totalSuggested = pricingHistory.reduce((sum, h) => 
      sum + (h.suggested_price || 0), 0);
    
    const totalFinal = pricingHistory.reduce((sum, h) => 
      sum + (h.final_price || h.suggested_price || 0), 0);

    const avgAccuracy = pricingHistory.length > 0
      ? pricingHistory.filter(h => h.accuracy_score !== null)
          .reduce((sum, h) => sum + (h.accuracy_score || 0), 0) / 
          pricingHistory.filter(h => h.accuracy_score !== null).length
      : 0;

    const sourceDistribution = {
      library: pricingHistory.filter(h => h.source === 'library').length,
      reference: pricingHistory.filter(h => h.source === 'reference_db').length,
      ai: pricingHistory.filter(h => h.source === 'ai' || h.source === 'ai_suggested').length,
      manual: pricingHistory.filter(h => !h.source || h.source === 'manual').length,
    };

    const approvedCount = pricingHistory.filter(h => h.is_approved).length;
    const highConfidenceCount = pricingHistory.filter(h => h.confidence === 'high').length;

    return {
      totalOriginal,
      totalSuggested,
      totalFinal,
      itemsCount: items.length,
      avgPrice: totalOriginal / items.length,
      avgAccuracy: avgAccuracy || 0,
      sourceDistribution,
      approvedCount,
      highConfidenceCount,
      pricingCoverage: (pricingHistory.length / items.length) * 100,
      highestItem: items.reduce((max: any, item: any) => 
        (parseFloat(item.total_price) || 0) > (parseFloat(max?.total_price) || 0) ? item : max, items[0]),
      lowestItem: items.reduce((min: any, item: any) => 
        (parseFloat(item.total_price) || 0) < (parseFloat(min?.total_price) || Infinity) ? item : min, items[0]),
    };
  }, [items, pricingHistory]);

  // Prepare chart data
  const priceComparisonData = useMemo(() => {
    return items.slice(0, 15).map((item: any, idx: number) => {
      const historyRecord = pricingHistory.find(h => h.item_number === item.item_number);
      return {
        name: `${idx + 1}`,
        itemNumber: item.item_number,
        original: parseFloat(item.unit_price) || 0,
        suggested: historyRecord?.suggested_price || parseFloat(item.ai_suggested_rate) || 0,
        final: historyRecord?.final_price || parseFloat(item.unit_price) || 0,
      };
    });
  }, [items, pricingHistory]);

  const sourceDistributionData = useMemo(() => {
    if (!priceStats) return [];
    return [
      { name: isArabic ? 'المكتبة' : 'Library', value: priceStats.sourceDistribution.library, color: '#3b82f6' },
      { name: isArabic ? 'قاعدة بيانات' : 'Reference DB', value: priceStats.sourceDistribution.reference, color: '#10b981' },
      { name: isArabic ? 'الذكاء الاصطناعي' : 'AI', value: priceStats.sourceDistribution.ai, color: '#8b5cf6' },
      { name: isArabic ? 'يدوي' : 'Manual', value: priceStats.sourceDistribution.manual, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [priceStats, isArabic]);

  // Variance items for dialog
  const varianceItems = useMemo(() => {
    return items.map((item: any) => {
      const original = parseFloat(item.unit_price) || 0;
      const suggested = parseFloat(item.ai_suggested_rate) || original;
      const deviation = original > 0 ? ((suggested - original) / original) * 100 : 0;
      
      return {
        ...item,
        originalPrice: original,
        suggestedPrice: suggested,
        deviation,
        recommendation: Math.abs(deviation) > 20 
          ? (isArabic ? 'مراجعة مطلوبة' : 'Review needed')
          : Math.abs(deviation) > 10
          ? (isArabic ? 'فرق متوسط' : 'Moderate variance')
          : (isArabic ? 'مقبول' : 'Acceptable'),
      };
    }).sort((a: any, b: any) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }, [items, isArabic]);

  const handleExportPriceComparison = (format: 'pdf' | 'excel') => {
    if (!selectedProject?.analysis_data?.items) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    if (format === 'pdf') {
      const pdf = new jsPDF({ orientation: 'landscape' });
      
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 25, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text(isArabic ? "تقرير مقارنة الأسعار" : "Price Comparison Report", 14, 16);
      
      autoTable(pdf, {
        startY: 35,
        head: [[
          isArabic ? '#' : 'Item #',
          isArabic ? 'الوصف' : 'Description',
          isArabic ? 'الكمية' : 'Qty',
          isArabic ? 'السعر الأصلي' : 'Original Price',
          isArabic ? 'السعر المقترح' : 'Suggested Price',
          isArabic ? 'الفرق %' : 'Variance %',
        ]],
        body: varianceItems.slice(0, 50).map((item: any) => [
          item.item_number || '-',
          (item.description || '-').substring(0, 40),
          item.quantity || '-',
          item.originalPrice?.toLocaleString() || '-',
          item.suggestedPrice?.toLocaleString() || '-',
          `${item.deviation?.toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
      
      pdf.save(`price-comparison-${selectedProject.name}.pdf`);
    } else {
      const data = varianceItems.map((item: any, idx: number) => ({
        [isArabic ? "م" : "#"]: idx + 1,
        [isArabic ? "رقم البند" : "Item Number"]: item.item_number,
        [isArabic ? "الوصف" : "Description"]: item.description,
        [isArabic ? "الكمية" : "Quantity"]: item.quantity,
        [isArabic ? "السعر الأصلي" : "Original Price"]: item.originalPrice,
        [isArabic ? "السعر المقترح" : "Suggested Price"]: item.suggestedPrice,
        [isArabic ? "نسبة الفرق" : "Variance %"]: item.deviation?.toFixed(1),
        [isArabic ? "التوصية" : "Recommendation"]: item.recommendation,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isArabic ? "مقارنة الأسعار" : "Price Comparison");
      XLSX.writeFile(wb, `price-comparison-${selectedProject.name}.xlsx`);
    }

    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const handleExportBalanceReport = () => {
    if (!priceStats) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const pdf = new jsPDF();
    
    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, 210, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text(isArabic ? "تقرير التوازن السعري" : "Price Balance Report", 14, 20);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    let y = 45;
    
    pdf.text(`${isArabic ? "المشروع:" : "Project:"} ${selectedProject?.name}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "إجمالي القيمة الأصلية:" : "Total Original:"} ${priceStats.totalOriginal.toLocaleString()}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "إجمالي القيمة المقترحة:" : "Total Suggested:"} ${priceStats.totalSuggested.toLocaleString()}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "عدد البنود:" : "Items Count:"} ${priceStats.itemsCount}`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "نسبة التغطية:" : "Coverage:"} ${priceStats.pricingCoverage.toFixed(1)}%`, 14, y);
    y += 10;
    pdf.text(`${isArabic ? "متوسط الدقة:" : "Avg Accuracy:"} ${priceStats.avgAccuracy.toFixed(1)}%`, 14, y);
    
    pdf.save(`balance-report-${selectedProject?.name}.pdf`);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const reportCards = [
    {
      id: "price-comparison",
      title: isArabic ? "مقارنة الأسعار" : "Price Comparison",
      description: isArabic 
        ? "مقارنة السعر الأصلي مع السعر المقترح والمحسوب"
        : "Compare original price with suggested and calculated prices",
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      actions: (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!selectedProjectId}
            onClick={() => handleExportPriceComparison('pdf')}
          >
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!selectedProjectId}
            onClick={() => handleExportPriceComparison('excel')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      ),
    },
    {
      id: "balance-report",
      title: isArabic ? "تقرير التوازن" : "Balance Report",
      description: isArabic 
        ? "تحليل توازن الأسعار مقارنة بأسعار السوق"
        : "Price balance analysis compared to market rates",
      icon: Scale,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      actions: (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!selectedProjectId}
          onClick={handleExportBalanceReport}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          PDF
        </Button>
      ),
    },
    {
      id: "variance-analysis",
      title: isArabic ? "تحليل الفروقات" : "Variance Analysis",
      description: isArabic 
        ? "تحليل الانحرافات السعرية بين المصادر المختلفة"
        : "Analyze price variances between different sources",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      actions: (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!selectedProjectId}
          onClick={() => setShowVarianceDialog(true)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {isArabic ? "عرض" : "View"}
        </Button>
      ),
    },
    {
      id: "historical-pricing",
      title: isArabic ? "الأسعار التاريخية" : "Historical Pricing",
      description: isArabic 
        ? "مقارنة الأسعار مع البيانات التاريخية"
        : "Compare prices with historical data",
      icon: History,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      actions: (
        <Badge variant="outline" className="text-xs">
          {pricingHistory.length} {isArabic ? "سجل" : "records"}
        </Badge>
      ),
    },
  ];

  return (
    <div ref={ref} className="space-y-6">
      {/* Project Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              {isArabic ? "اختر المشروع:" : "Select Project:"}
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder={isArabic ? "اختر المشروع" : "Choose Project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Price Stats Summary */}
      {priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "إجمالي القيمة" : "Total Value"}
              </p>
              <p className="text-xl font-bold text-primary">
                {priceStats.totalOriginal.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "عدد البنود" : "Items Count"}
              </p>
              <p className="text-xl font-bold">{priceStats.itemsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "تغطية التسعير" : "Pricing Coverage"}
              </p>
              <p className="text-xl font-bold text-blue-600">
                {priceStats.pricingCoverage.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {isArabic ? "متوسط الدقة" : "Avg Accuracy"}
              </p>
              <p className={`text-xl font-bold ${priceStats.avgAccuracy >= 80 ? 'text-green-600' : priceStats.avgAccuracy >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {priceStats.avgAccuracy > 0 ? `${priceStats.avgAccuracy.toFixed(0)}%` : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {selectedProjectId && priceStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                {isArabic ? "مقارنة الأسعار" : "Price Comparison"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isArabic ? "أعلى 15 بند - السعر الأصلي vs المقترح" : "Top 15 items - Original vs Suggested"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={priceComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString()}
                    labelFormatter={(label) => `${isArabic ? 'البند' : 'Item'} ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="original" fill="#3b82f6" name={isArabic ? "الأصلي" : "Original"} />
                  <Bar dataKey="suggested" fill="#10b981" name={isArabic ? "المقترح" : "Suggested"} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Source Distribution Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                {isArabic ? "توزيع مصادر التسعير" : "Pricing Source Distribution"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isArabic ? "توزيع البنود حسب مصدر السعر" : "Items distribution by price source"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sourceDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RechartsPieChart>
                    <Pie
                      data={sourceDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                    >
                      {sourceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  {isArabic ? "لا توجد بيانات تاريخية" : "No historical data available"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((card) => (
          <Card key={card.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {card.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex justify-end">
                {card.actions}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!selectedProjectId && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {isArabic ? "الرجاء اختيار مشروع لعرض تحليل الأسعار" : "Please select a project to view price analysis"}
        </p>
      )}

      {/* Variance Analysis Dialog */}
      <Dialog open={showVarianceDialog} onOpenChange={setShowVarianceDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-purple-600" />
              {isArabic ? "تحليل الفروقات السعرية" : "Price Variance Analysis"}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? "البنود مرتبة حسب أكبر فرق سعري - أعلى 20 بند"
                : "Items sorted by highest price variance - Top 20 items"}
            </DialogDescription>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 my-4">
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                <p className="text-xs text-muted-foreground">{isArabic ? "فرق عالي (>20%)" : "High Variance (>20%)"}</p>
                <p className="text-lg font-bold text-red-600">
                  {varianceItems.filter((i: any) => Math.abs(i.deviation) > 20).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200">
              <CardContent className="p-3 text-center">
                <Target className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                <p className="text-xs text-muted-foreground">{isArabic ? "فرق متوسط (10-20%)" : "Medium (10-20%)"}</p>
                <p className="text-lg font-bold text-yellow-600">
                  {varianceItems.filter((i: any) => Math.abs(i.deviation) > 10 && Math.abs(i.deviation) <= 20).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
              <CardContent className="p-3 text-center">
                <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-xs text-muted-foreground">{isArabic ? "مقبول (<10%)" : "Acceptable (<10%)"}</p>
                <p className="text-lg font-bold text-green-600">
                  {varianceItems.filter((i: any) => Math.abs(i.deviation) <= 10).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Variance Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                  <TableHead className="text-right">{isArabic ? "السعر الأصلي" : "Original"}</TableHead>
                  <TableHead className="text-right">{isArabic ? "المقترح" : "Suggested"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "الفرق %" : "Variance"}</TableHead>
                  <TableHead>{isArabic ? "التوصية" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceItems.slice(0, 20).map((item: any, idx: number) => (
                  <TableRow key={item.item_number || idx}>
                    <TableCell className="font-medium">{item.item_number || idx + 1}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.description}>
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.originalPrice?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.suggestedPrice?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={Math.abs(item.deviation) > 20 ? "destructive" : Math.abs(item.deviation) > 10 ? "secondary" : "outline"}
                        className="font-mono"
                      >
                        {item.deviation > 0 ? '+' : ''}{item.deviation?.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${
                        Math.abs(item.deviation) > 20 ? 'text-red-600' : 
                        Math.abs(item.deviation) > 10 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.recommendation}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowVarianceDialog(false)}>
              {isArabic ? "إغلاق" : "Close"}
            </Button>
            <Button onClick={() => handleExportPriceComparison('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isArabic ? "تصدير Excel" : "Export Excel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
  }
);

PriceAnalysisTab.displayName = "PriceAnalysisTab";
