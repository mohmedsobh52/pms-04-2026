import { useState, useCallback, useEffect } from "react";
import {
  Scale,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  Download,
  GitCompare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { ItemComparison } from "./ItemComparison";
import { QuotationCostChart } from "./QuotationCostChart";
import { XLSX } from '@/lib/exceljs-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface QuotationItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Quotation {
  id: string;
  name: string;
  file_name: string;
  supplier_name?: string;
  quotation_date?: string;
  total_amount?: number;
  currency: string;
  status: string;
  ai_analysis?: {
    supplier?: { name?: string };
    items?: QuotationItem[];
    totals?: {
      subtotal?: number;
      tax?: number;
      grand_total?: number;
    };
  };
  created_at: string;
}

interface ComparisonResult {
  suppliers: {
    id: string;
    name: string;
    total: number;
    itemCount: number;
    avgUnitPrice: number;
  }[];
  lowestTotal: { id: string; name: string; total: number };
  highestTotal: { id: string; name: string; total: number };
  averageTotal: number;
  potentialSavings: number;
  savingsPercentage: number;
  recommendation: string;
  itemComparison: {
    itemNumber: string;
    description: string;
    suppliers: { id: string; name: string; unitPrice: number; total: number }[];
    lowestPrice: number;
    highestPrice: number;
    variance: number;
  }[];
}

export function QuotationComparison() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [showItemComparison, setShowItemComparison] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { isArabic } = useLanguage();

  const loadQuotations = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(q => ({
        ...q,
        ai_analysis: typeof q.ai_analysis === 'string' 
          ? JSON.parse(q.ai_analysis) 
          : q.ai_analysis
      }));

      setQuotations(parsed);
    } catch (error) {
      console.error("Error loading quotations:", error);
      toast({
        title: isArabic ? "خطأ في التحميل" : "Loading error",
        description: isArabic ? "فشل تحميل عروض الأسعار" : "Failed to load quotations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, isArabic]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
    setComparison(null);
  };

  const runComparison = () => {
    if (selectedIds.length < 2) {
      toast({
        title: isArabic ? "اختر عرضين على الأقل" : "Select at least 2 quotations",
        variant: "destructive"
      });
      return;
    }

    const selected = quotations.filter(q => selectedIds.includes(q.id));
    
    // Build supplier data
    const suppliers = selected.map(q => {
      const items = q.ai_analysis?.items || [];
      const total = q.ai_analysis?.totals?.grand_total || q.total_amount || 
        items.reduce((sum, item) => sum + (item.total || 0), 0);
      const avgUnitPrice = items.length > 0 
        ? items.reduce((sum, item) => sum + (item.unit_price || 0), 0) / items.length 
        : 0;

      return {
        id: q.id,
        name: q.ai_analysis?.supplier?.name || q.supplier_name || q.name,
        total,
        itemCount: items.length,
        avgUnitPrice
      };
    });

    // Find lowest and highest
    const sortedByTotal = [...suppliers].sort((a, b) => a.total - b.total);
    const lowestTotal = sortedByTotal[0];
    const highestTotal = sortedByTotal[sortedByTotal.length - 1];
    const averageTotal = suppliers.reduce((sum, s) => sum + s.total, 0) / suppliers.length;
    const potentialSavings = highestTotal.total - lowestTotal.total;
    const savingsPercentage = highestTotal.total > 0 ? (potentialSavings / highestTotal.total) * 100 : 0;

    // Build item-level comparison
    const allItems = new Map<string, { description: string; suppliers: Map<string, { unitPrice: number; total: number }> }>();
    
    selected.forEach(q => {
      const items = q.ai_analysis?.items || [];
      
      items.forEach(item => {
        const key = item.item_number || item.description?.slice(0, 30);
        if (!allItems.has(key)) {
          allItems.set(key, { description: item.description, suppliers: new Map() });
        }
        allItems.get(key)!.suppliers.set(q.id, {
          unitPrice: item.unit_price || 0,
          total: item.total || 0
        });
      });
    });

    const itemComparison = Array.from(allItems.entries()).map(([itemNumber, data]) => {
      const supplierPrices = Array.from(data.suppliers.entries()).map(([id, prices]) => ({
        id,
        name: suppliers.find(s => s.id === id)?.name || '',
        unitPrice: prices.unitPrice,
        total: prices.total
      }));

      const prices = supplierPrices.map(s => s.unitPrice).filter(p => p > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const variance = lowestPrice > 0 ? ((highestPrice - lowestPrice) / lowestPrice) * 100 : 0;

      return {
        itemNumber,
        description: data.description,
        suppliers: supplierPrices,
        lowestPrice,
        highestPrice,
        variance
      };
    });

    // Generate recommendation
    let recommendation = '';
    if (isArabic) {
      recommendation = `نوصي بالتعامل مع "${lowestTotal.name}" بسعر إجمالي ${lowestTotal.total.toLocaleString()} ر.س. `;
      recommendation += `يمكنك توفير ${potentialSavings.toLocaleString()} ر.س (${savingsPercentage.toFixed(1)}%) `;
      recommendation += `مقارنة بأعلى عرض من "${highestTotal.name}".`;
    } else {
      recommendation = `We recommend "${lowestTotal.name}" with a total of ${lowestTotal.total.toLocaleString()} SAR. `;
      recommendation += `You can save ${potentialSavings.toLocaleString()} SAR (${savingsPercentage.toFixed(1)}%) `;
      recommendation += `compared to the highest offer from "${highestTotal.name}".`;
    }

    setComparison({
      suppliers,
      lowestTotal,
      highestTotal,
      averageTotal,
      potentialSavings,
      savingsPercentage,
      recommendation,
      itemComparison
    });

    toast({
      title: isArabic ? "تمت المقارنة" : "Comparison complete",
      description: isArabic ? `تمت مقارنة ${selected.length} عروض أسعار` : `Compared ${selected.length} quotations`
    });
  };

  const exportComparison = () => {
    if (!comparison) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      [isArabic ? "ملخص المقارنة" : "Comparison Summary"],
      [""],
      [isArabic ? "أقل إجمالي" : "Lowest Total", comparison.lowestTotal.name, comparison.lowestTotal.total],
      [isArabic ? "أعلى إجمالي" : "Highest Total", comparison.highestTotal.name, comparison.highestTotal.total],
      [isArabic ? "متوسط الإجمالي" : "Average Total", "", comparison.averageTotal],
      [isArabic ? "التوفير المحتمل" : "Potential Savings", "", comparison.potentialSavings],
      [isArabic ? "نسبة التوفير" : "Savings %", "", `${comparison.savingsPercentage.toFixed(1)}%`],
      [""],
      [isArabic ? "التوصية" : "Recommendation"],
      [comparison.recommendation]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, isArabic ? "الملخص" : "Summary");

    // Item comparison sheet
    const itemHeaders = [
      isArabic ? "رقم البند" : "Item #",
      isArabic ? "الوصف" : "Description",
      ...comparison.suppliers.map(s => s.name),
      isArabic ? "أقل سعر" : "Lowest",
      isArabic ? "أعلى سعر" : "Highest",
      isArabic ? "الفرق %" : "Variance %"
    ];
    const itemData = comparison.itemComparison.map(item => [
      item.itemNumber,
      item.description?.slice(0, 50),
      ...comparison.suppliers.map(s => {
        const found = item.suppliers.find(is => is.id === s.id);
        return found?.unitPrice || '-';
      }),
      item.lowestPrice,
      item.highestPrice,
      `${item.variance.toFixed(1)}%`
    ]);
    const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemData]);
    XLSX.utils.book_append_sheet(wb, wsItems, isArabic ? "مقارنة البنود" : "Item Comparison");

    XLSX.writeFile(wb, `Quotation_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: isArabic ? "تم تحميل ملف المقارنة" : "Comparison file downloaded"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Scale className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? "يرجى تسجيل الدخول لمقارنة عروض الأسعار" : "Please sign in to compare quotations"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Include all quotations that have total_amount or analyzed items
  const comparableQuotations = quotations.filter(q => 
    q.total_amount || q.ai_analysis?.items?.length || q.ai_analysis?.totals?.grand_total
  );

  if (comparableQuotations.length < 2) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Scale className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isArabic 
              ? "تحتاج إلى عرضي أسعار على الأقل للمقارنة" 
              : "You need at least 2 quotations for comparison"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Chart data
  const chartData = comparison?.suppliers.map(s => ({
    name: s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name,
    total: s.total,
    items: s.itemCount,
    avgPrice: s.avgUnitPrice
  })) || [];

  const radarData = comparison?.itemComparison.slice(0, 6).map(item => {
    const obj: any = { item: item.itemNumber.slice(0, 10) };
    comparison.suppliers.forEach(s => {
      const found = item.suppliers.find(is => is.id === s.id);
      obj[s.name.slice(0, 10)] = found?.unitPrice || 0;
    });
    return obj;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">
            {isArabic ? "مقارنة أسعار الموردين" : "Supplier Price Comparison"}
          </h2>
        </div>
        {comparison && (
          <Button variant="outline" onClick={exportComparison} className="gap-2">
            <Download className="h-4 w-4" />
            {isArabic ? "تصدير Excel" : "Export Excel"}
          </Button>
        )}
      </div>

      {/* Quotation Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isArabic ? "اختر عروض الأسعار للمقارنة" : "Select Quotations to Compare"}
          </CardTitle>
          <CardDescription>
            {isArabic 
              ? `${selectedIds.length} من ${comparableQuotations.length} عرض محدد`
              : `${selectedIds.length} of ${comparableQuotations.length} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {comparableQuotations.map(q => {
              const isSelected = selectedIds.includes(q.id);
              const supplierName = q.ai_analysis?.supplier?.name || q.supplier_name || q.name;
              const total = q.ai_analysis?.totals?.grand_total || q.total_amount || 0;
              const itemCount = q.ai_analysis?.items?.length || 0;

              return (
                <div 
                  key={q.id}
                  onClick={() => toggleSelection(q.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} />
                      <div>
                        <p className="font-medium">{supplierName}</p>
                        <p className="text-sm text-muted-foreground">{itemCount} {isArabic ? "بند" : "items"}</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {total.toLocaleString()} {q.currency || 'SAR'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <Button 
            onClick={runComparison} 
            disabled={selectedIds.length < 2}
            className="w-full mt-4 gap-2"
          >
            <Scale className="h-4 w-4" />
            {isArabic ? "مقارنة عروض الأسعار المحددة" : "Compare Selected Quotations"}
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                  <TrendingDown className="h-4 w-4" />
                  {isArabic ? "أقل عرض" : "Lowest Offer"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{comparison.lowestTotal.total.toLocaleString()}</p>
                <p className="text-sm text-green-600">{comparison.lowestTotal.name}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-300">
                  <TrendingUp className="h-4 w-4" />
                  {isArabic ? "أعلى عرض" : "Highest Offer"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{comparison.highestTotal.total.toLocaleString()}</p>
                <p className="text-sm text-red-600">{comparison.highestTotal.name}</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <DollarSign className="h-4 w-4" />
                  {isArabic ? "التوفير المحتمل" : "Potential Savings"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{comparison.potentialSavings.toLocaleString()}</p>
                <p className="text-sm text-blue-600">{comparison.savingsPercentage.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <BarChart3 className="h-4 w-4" />
                  {isArabic ? "المتوسط" : "Average"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{comparison.averageTotal.toLocaleString()}</p>
                <p className="text-sm text-purple-600">{comparison.suppliers.length} {isArabic ? "موردين" : "suppliers"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-primary">
                    {isArabic ? "التوصية" : "Recommendation"}
                  </p>
                  <p className="text-sm mt-1">{comparison.recommendation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Toggle */}
          <div className="flex gap-2">
            <Button 
              variant={showCharts ? "default" : "outline"} 
              onClick={() => setShowCharts(!showCharts)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {isArabic ? "المخططات" : "Charts"}
            </Button>
            <Button 
              variant={showItemComparison ? "default" : "outline"} 
              onClick={() => setShowItemComparison(!showItemComparison)}
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              {isArabic ? "مقارنة البنود" : "Item Comparison"}
            </Button>
          </div>

          {/* Charts */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "مقارنة الإجماليات" : "Total Comparison"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => value.toLocaleString() + ' SAR'} />
                        <Legend />
                        <Bar 
                          dataKey="total" 
                          fill="hsl(var(--primary))" 
                          name={isArabic ? "الإجمالي" : "Total"} 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "مقارنة أسعار البنود" : "Item Price Comparison"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="item" />
                        <PolarRadiusAxis />
                        {comparison.suppliers.map((s, i) => (
                          <Radar
                            key={s.id}
                            name={s.name}
                            dataKey={s.name.slice(0, 10)}
                            stroke={`hsl(${(i * 60) % 360}, 70%, 50%)`}
                            fill={`hsl(${(i * 60) % 360}, 70%, 50%)`}
                            fillOpacity={0.3}
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Item Comparison Table */}
          {showItemComparison && comparison.itemComparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {isArabic ? "مقارنة البنود التفصيلية" : "Detailed Item Comparison"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                        <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                        {comparison.suppliers.map(s => (
                          <TableHead key={s.id} className="text-end">{s.name.slice(0, 15)}</TableHead>
                        ))}
                        <TableHead className="text-end">{isArabic ? "الفرق" : "Variance"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.itemComparison.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{item.itemNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                          {comparison.suppliers.map(s => {
                            const found = item.suppliers.find(is => is.id === s.id);
                            const isLowest = found?.unitPrice === item.lowestPrice && found?.unitPrice > 0;
                            return (
                              <TableCell 
                                key={s.id} 
                                className={`text-end ${isLowest ? 'text-green-600 font-bold' : ''}`}
                              >
                                {found?.unitPrice?.toLocaleString() || '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-end">
                            {item.variance > 0 && (
                              <Badge 
                                variant={item.variance > 20 ? "destructive" : "outline"}
                              >
                                {item.variance.toFixed(0)}%
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
