import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Database, 
  Brain, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Link2
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useMaterialPrices, MaterialPrice, MATERIAL_CATEGORIES } from "@/hooks/useMaterialPrices";
import { cn } from "@/lib/utils";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";
import { toast } from 'sonner';

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  ai_suggested_rate?: number;
}

interface PriceComparisonItem {
  item: BOQItem;
  aiPrice: number | null;
  localPrice: number | null;
  matchedMaterial: MaterialPrice | null;
  difference: number | null;
  differencePercent: number | null;
  recommendation: 'use_local' | 'use_ai' | 'review' | 'no_match';
}

interface AIVsLocalPriceComparisonProps {
  items: BOQItem[];
  onApplyLocalPrice?: (itemNumber: string, price: number) => void;
  onApplyAIPrice?: (itemNumber: string, price: number) => void;
}

export const AIVsLocalPriceComparison = ({ 
  items, 
  onApplyLocalPrice,
  onApplyAIPrice 
}: AIVsLocalPriceComparisonProps) => {
  const { isArabic } = useLanguage();
  const { materials, loading, findMatchingPrice } = useMaterialPrices();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Match BOQ items with local database prices
  const comparisonData = useMemo((): PriceComparisonItem[] => {
    return items.map(item => {
      const aiPrice = item.ai_suggested_rate || item.unit_price || null;
      
      // Try to find matching price in local database
      const matchedMaterial = findMatchingPrice(item.description, item.category);
      const localPrice = matchedMaterial?.unit_price || null;
      
      let difference: number | null = null;
      let differencePercent: number | null = null;
      let recommendation: 'use_local' | 'use_ai' | 'review' | 'no_match' = 'no_match';
      
      if (aiPrice !== null && localPrice !== null) {
        difference = localPrice - aiPrice;
        differencePercent = ((difference / aiPrice) * 100);
        
        // Determine recommendation
        const absDiff = Math.abs(differencePercent);
        if (absDiff < 10) {
          recommendation = 'use_local'; // Prices are close, prefer local verified data
        } else if (differencePercent < -20) {
          recommendation = 'review'; // AI price much higher than local - review needed
        } else if (differencePercent > 20) {
          recommendation = 'review'; // Local price much higher than AI - review needed
        } else {
          recommendation = 'use_local'; // Default to local verified data
        }
      } else if (localPrice !== null) {
        recommendation = 'use_local';
      } else if (aiPrice !== null) {
        recommendation = 'use_ai';
      }
      
      return {
        item,
        aiPrice,
        localPrice,
        matchedMaterial,
        difference,
        differencePercent,
        recommendation
      };
    });
  }, [items, findMatchingPrice]);

  // Statistics
  const stats = useMemo(() => {
    const matched = comparisonData.filter(c => c.localPrice !== null).length;
    const unmatched = comparisonData.filter(c => c.localPrice === null).length;
    const lowerLocal = comparisonData.filter(c => c.difference !== null && c.difference < 0).length;
    const higherLocal = comparisonData.filter(c => c.difference !== null && c.difference > 0).length;
    const similar = comparisonData.filter(c => c.difference !== null && Math.abs(c.differencePercent!) < 10).length;
    const needsReview = comparisonData.filter(c => c.recommendation === 'review').length;
    
    const totalAI = comparisonData.reduce((sum, c) => sum + (c.aiPrice || 0) * c.item.quantity, 0);
    const totalLocal = comparisonData.reduce((sum, c) => sum + (c.localPrice || c.aiPrice || 0) * c.item.quantity, 0);
    const potentialSavings = totalAI - totalLocal;
    
    return { matched, unmatched, lowerLocal, higherLocal, similar, needsReview, totalAI, totalLocal, potentialSavings };
  }, [comparisonData]);

  const handleExportReport = () => {
    const reportData = comparisonData.map(c => ({
      [isArabic ? 'رقم البند' : 'Item No']: c.item.item_number,
      [isArabic ? 'الوصف' : 'Description']: c.item.description,
      [isArabic ? 'الوحدة' : 'Unit']: c.item.unit,
      [isArabic ? 'الكمية' : 'Quantity']: c.item.quantity,
      [isArabic ? 'سعر AI' : 'AI Price']: c.aiPrice || '-',
      [isArabic ? 'السعر المحلي' : 'Local Price']: c.localPrice || '-',
      [isArabic ? 'الفرق' : 'Difference']: c.difference?.toFixed(2) || '-',
      [isArabic ? 'الفرق %' : 'Diff %']: c.differencePercent ? `${c.differencePercent.toFixed(1)}%` : '-',
      [isArabic ? 'المورد' : 'Supplier']: c.matchedMaterial?.supplier_name || '-',
      [isArabic ? 'التوصية' : 'Recommendation']: 
        c.recommendation === 'use_local' ? (isArabic ? 'استخدم المحلي' : 'Use Local') :
        c.recommendation === 'use_ai' ? (isArabic ? 'استخدم AI' : 'Use AI') :
        c.recommendation === 'review' ? (isArabic ? 'مراجعة' : 'Review') :
        (isArabic ? 'لا يوجد تطابق' : 'No Match'),
    }));

    const wb = createWorkbook();
    addJsonSheet(wb, reportData, isArabic ? 'مقارنة الأسعار' : 'Price Comparison');
    downloadWorkbook(wb, `price-comparison-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(isArabic ? 'تم تصدير التقرير' : 'Report exported');
  };

  const handleApplyAllLocalPrices = () => {
    let applied = 0;
    comparisonData.forEach(c => {
      if (c.localPrice !== null && c.recommendation !== 'review' && onApplyLocalPrice) {
        onApplyLocalPrice(c.item.item_number, c.localPrice);
        applied++;
      }
    });
    toast.success(isArabic ? `تم تطبيق ${applied} سعر من القاعدة المحلية` : `Applied ${applied} local prices`);
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'use_local':
        return <Badge className="bg-green-500/20 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />{isArabic ? 'محلي' : 'Local'}</Badge>;
      case 'use_ai':
        return <Badge className="bg-blue-500/20 text-blue-600"><Brain className="w-3 h-3 mr-1" />{isArabic ? 'AI' : 'AI'}</Badge>;
      case 'review':
        return <Badge className="bg-yellow-500/20 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />{isArabic ? 'مراجعة' : 'Review'}</Badge>;
      default:
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />{isArabic ? 'لا تطابق' : 'No Match'}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>{isArabic ? 'جاري تحميل قاعدة الأسعار...' : 'Loading price database...'}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'بنود متطابقة' : 'Matched Items'}</p>
                <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
              </div>
              <Database className="h-8 w-8 text-green-600/30" />
            </div>
            <Progress value={(stats.matched / items.length) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'غير متطابقة' : 'Unmatched'}</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unmatched}</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-600/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'تحتاج مراجعة' : 'Needs Review'}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.needsReview}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isArabic ? 'الوفر المتوقع' : 'Potential Savings'}</p>
                <p className={cn("text-2xl font-bold", stats.potentialSavings > 0 ? "text-green-600" : "text-red-600")}>
                  {stats.potentialSavings > 0 ? '+' : ''}{stats.potentialSavings.toLocaleString()} <span className="text-sm">SAR</span>
                </p>
              </div>
              {stats.potentialSavings > 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600/30" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600/30" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleExportReport}>
          <Download className="h-4 w-4 mr-2" />
          {isArabic ? 'تصدير التقرير' : 'Export Report'}
        </Button>
        {stats.matched > 0 && onApplyLocalPrice && (
          <Button onClick={handleApplyAllLocalPrices}>
            <Link2 className="h-4 w-4 mr-2" />
            {isArabic ? 'تطبيق الأسعار المحلية' : 'Apply Local Prices'}
          </Button>
        )}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {isArabic ? 'مقارنة أسعار AI مع قاعدة البيانات المحلية' : 'AI vs Local Database Price Comparison'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">{isArabic ? 'الكل' : 'All'} ({comparisonData.length})</TabsTrigger>
              <TabsTrigger value="matched">{isArabic ? 'متطابقة' : 'Matched'} ({stats.matched})</TabsTrigger>
              <TabsTrigger value="review">{isArabic ? 'مراجعة' : 'Review'} ({stats.needsReview})</TabsTrigger>
              <TabsTrigger value="unmatched">{isArabic ? 'غير متطابقة' : 'Unmatched'} ({stats.unmatched})</TabsTrigger>
            </TabsList>

            {['all', 'matched', 'review', 'unmatched'].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue}>
                <div className="border rounded-lg overflow-auto max-h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-20">{isArabic ? 'رقم' : 'No.'}</TableHead>
                        <TableHead>{isArabic ? 'الوصف' : 'Description'}</TableHead>
                        <TableHead className="text-center">{isArabic ? 'سعر AI' : 'AI Price'}</TableHead>
                        <TableHead className="text-center">{isArabic ? 'السعر المحلي' : 'Local Price'}</TableHead>
                        <TableHead className="text-center">{isArabic ? 'الفرق' : 'Difference'}</TableHead>
                        <TableHead className="text-center">{isArabic ? 'المورد' : 'Supplier'}</TableHead>
                        <TableHead className="text-center">{isArabic ? 'التوصية' : 'Rec.'}</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData
                        .filter(c => {
                          if (tabValue === 'all') return true;
                          if (tabValue === 'matched') return c.localPrice !== null;
                          if (tabValue === 'review') return c.recommendation === 'review';
                          if (tabValue === 'unmatched') return c.localPrice === null;
                          return true;
                        })
                        .map((comparison, index) => (
                          <TableRow key={comparison.item.item_number} className={cn(
                            comparison.recommendation === 'review' && 'bg-yellow-50/50 dark:bg-yellow-900/10'
                          )}>
                            <TableCell className="font-mono text-sm">{comparison.item.item_number}</TableCell>
                            <TableCell className="max-w-xs truncate" title={comparison.item.description}>
                              {comparison.item.description}
                            </TableCell>
                            <TableCell className="text-center">
                              {comparison.aiPrice ? (
                                <span className="font-medium">{comparison.aiPrice.toLocaleString()}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {comparison.localPrice ? (
                                <span className="font-medium text-green-600">{comparison.localPrice.toLocaleString()}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {comparison.differencePercent !== null ? (
                                <div className="flex items-center justify-center gap-1">
                                  {comparison.differencePercent > 0 ? (
                                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                                  ) : comparison.differencePercent < 0 ? (
                                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Minus className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className={cn(
                                    "font-medium",
                                    comparison.differencePercent > 0 ? "text-red-600" : 
                                    comparison.differencePercent < 0 ? "text-green-600" : "text-gray-600"
                                  )}>
                                    {comparison.differencePercent > 0 ? '+' : ''}{comparison.differencePercent.toFixed(1)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {comparison.matchedMaterial?.supplier_name || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {getRecommendationBadge(comparison.recommendation)}
                            </TableCell>
                            <TableCell>
                              {comparison.localPrice !== null && onApplyLocalPrice && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => onApplyLocalPrice(comparison.item.item_number, comparison.localPrice!)}
                                >
                                  {isArabic ? 'تطبيق' : 'Apply'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* No Local Data Message */}
      {materials.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">{isArabic ? 'قاعدة الأسعار فارغة' : 'Price Database Empty'}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isArabic 
                ? 'أضف أسعار المواد المحلية لمقارنتها مع تقديرات AI'
                : 'Add local material prices to compare with AI estimates'
              }
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/material-prices'}>
              <Database className="h-4 w-4 mr-2" />
              {isArabic ? 'فتح قاعدة الأسعار' : 'Open Price Database'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
