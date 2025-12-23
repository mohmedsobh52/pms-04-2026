import { useState, useEffect } from "react";
import { Scale, TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Loader2, BarChart3, GitCompare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QuotationCostChart } from "./QuotationCostChart";
import { ItemComparison } from "./ItemComparison";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuotationItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
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
  items?: QuotationItem[];
  ai_analysis?: any;
}

interface ComparisonResult {
  lowestBidder: string;
  highestBidder: string;
  averagePrice: number;
  priceDifference: number;
  recommendation: string;
  savings: number;
}

export function QuotationComparison() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [showItemComparison, setShowItemComparison] = useState(false);

  useEffect(() => {
    if (user) {
      loadQuotations();
    }
  }, [user]);

  const loadQuotations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('id, name, file_name, supplier_name, quotation_date, total_amount, currency, status')
        .eq('user_id', user.id)
        .not('total_amount', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
        title: "اختر عرضين على الأقل",
        description: "يجب اختيار عرضين أو أكثر للمقارنة",
        variant: "destructive",
      });
      return;
    }

    const selected = quotations.filter(q => selectedIds.includes(q.id));
    const amounts = selected.map(q => q.total_amount || 0);
    
    const lowestAmount = Math.min(...amounts);
    const highestAmount = Math.max(...amounts);
    const averagePrice = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const priceDifference = ((highestAmount - lowestAmount) / lowestAmount) * 100;
    const savings = highestAmount - lowestAmount;

    const lowestBidder = selected.find(q => q.total_amount === lowestAmount);
    const highestBidder = selected.find(q => q.total_amount === highestAmount);

    setComparison({
      lowestBidder: lowestBidder?.supplier_name || lowestBidder?.name || "غير محدد",
      highestBidder: highestBidder?.supplier_name || highestBidder?.name || "غير محدد",
      averagePrice,
      priceDifference,
      recommendation: priceDifference > 20 
        ? "فرق كبير في الأسعار - يُنصح بمراجعة تفاصيل العروض"
        : priceDifference > 10
        ? "فرق متوسط - العروض متقاربة نسبياً"
        : "فرق بسيط - جميع العروض متقاربة",
      savings,
    });

    toast({
      title: "تمت المقارنة",
      description: `تمت مقارنة ${selected.length} عروض أسعار`,
    });
  };

  const selectedQuotations = quotations.filter(q => selectedIds.includes(q.id));

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          يرجى تسجيل الدخول لمقارنة عروض الأسعار
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Toggle Button */}
      <div className="flex justify-end gap-2">
        <Button
          variant={showItemComparison ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowItemComparison(!showItemComparison)}
          className="gap-2"
        >
          <GitCompare className="w-4 h-4" />
          {isArabic ? "مقارنة البنود" : "Item Comparison"}
        </Button>
        <Button
          variant={showCharts ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowCharts(!showCharts)}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {isArabic ? "عرض الرسوم البيانية" : "Show Charts"}
        </Button>
      </div>

      {/* Item Comparison Section */}
      {showItemComparison && (
        <ItemComparison 
          quotations={quotations.map(q => ({
            ...q,
            items: q.ai_analysis?.items || []
          }))} 
          currency={quotations[0]?.currency || "ر.س"} 
        />
      )}

      {/* Charts Section */}
      {showCharts && (
        <QuotationCostChart showComparison={true} currency={quotations[0]?.currency || "ر.س"} />
      )}

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-5 h-5" />
            {isArabic ? "اختر العروض للمقارنة" : "Select Quotations to Compare"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد عروض أسعار بمبالغ محددة</p>
              <p className="text-sm mt-1">أضف المبلغ الإجمالي عند رفع العروض للمقارنة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotations.map((quotation) => (
                <div
                  key={quotation.id}
                  onClick={() => toggleSelection(quotation.id)}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedIds.includes(quotation.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'}
                  `}
                >
                  <Checkbox
                    checked={selectedIds.includes(quotation.id)}
                    onCheckedChange={() => toggleSelection(quotation.id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{quotation.name}</h4>
                    {quotation.supplier_name && (
                      <p className="text-sm text-muted-foreground">{quotation.supplier_name}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">
                      {quotation.total_amount?.toLocaleString()} {quotation.currency}
                    </p>
                    {quotation.quotation_date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(quotation.quotation_date).toLocaleDateString('ar-SA')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {quotations.length >= 2 && (
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} من {quotations.length} مختار
              </span>
              <Button
                onClick={runComparison}
                disabled={selectedIds.length < 2}
                className="btn-gradient gap-2"
              >
                <Scale className="w-4 h-4" />
                مقارنة العروض
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && selectedQuotations.length >= 2 && (
        <div className="space-y-4 animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-success/10 border-success/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">أقل سعر</p>
                    <p className="font-bold">{comparison.lowestBidder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">أعلى سعر</p>
                    <p className="font-bold">{comparison.highestBidder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">فرق السعر</p>
                    <p className="font-bold">{comparison.priceDifference.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تفاصيل المقارنة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المورد / العرض</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الفرق عن المتوسط</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedQuotations
                    .sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0))
                    .map((quotation, index) => {
                      const diffFromAvg = ((quotation.total_amount || 0) - comparison.averagePrice) / comparison.averagePrice * 100;
                      const isLowest = index === 0;
                      const isHighest = index === selectedQuotations.length - 1;
                      
                      return (
                        <TableRow key={quotation.id}>
                          <TableCell className="font-medium">
                            {quotation.supplier_name || quotation.name}
                          </TableCell>
                          <TableCell>
                            {quotation.quotation_date 
                              ? new Date(quotation.quotation_date).toLocaleDateString('ar-SA')
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="font-bold">
                            {quotation.total_amount?.toLocaleString()} {quotation.currency}
                          </TableCell>
                          <TableCell>
                            <span className={diffFromAvg < 0 ? 'text-success' : 'text-destructive'}>
                              {diffFromAvg > 0 ? '+' : ''}{diffFromAvg.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isLowest && (
                              <Badge variant="default" className="bg-success gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                الأفضل
                              </Badge>
                            )}
                            {isHighest && selectedQuotations.length > 1 && (
                              <Badge variant="destructive" className="gap-1">
                                الأعلى
                              </Badge>
                            )}
                            {!isLowest && !isHighest && (
                              <Badge variant="secondary">متوسط</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">التوصية</h4>
                  <p className="text-muted-foreground">{comparison.recommendation}</p>
                  <p className="text-sm mt-2">
                    الوفر المحتمل باختيار أقل عرض: 
                    <span className="font-bold text-success mr-2">
                      {comparison.savings.toLocaleString()} ر.س
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
