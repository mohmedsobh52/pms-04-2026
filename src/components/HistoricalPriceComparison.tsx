import { useState, useEffect } from "react";
import { History, TrendingUp, TrendingDown, Minus, Search, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
}

interface EnhancedSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  final_suggested_price: number;
  overall_confidence: number;
}

interface HistoricalMatch {
  item_number: string;
  description: string;
  historical_price: number;
  historical_project: string;
  historical_date: string;
  match_score: number;
  price_trend: "up" | "down" | "stable";
  trend_percentage: number;
}

interface ComparisonResult {
  item_number: string;
  description: string;
  current_price: number;
  ai_suggested_price: number;
  historical_average: number;
  historical_matches: HistoricalMatch[];
  adjusted_price: number;
  confidence_boost: number;
  recommendation: string;
}

interface HistoricalPriceComparisonProps {
  items: BOQItem[];
  suggestions: EnhancedSuggestion[];
  onApplyAdjustedPrices?: (prices: Array<{ itemId: string; rate: number }>) => void;
}

export function HistoricalPriceComparison({ items, suggestions, onApplyAdjustedPrices }: HistoricalPriceComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [historicalProjects, setHistoricalProjects] = useState<any[]>([]);
  const { toast } = useToast();

  // Load historical projects from saved projects AND historical pricing files
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load from saved_projects
        const { data: savedProjects, error: savedError } = await supabase
          .from("saved_projects")
          .select("id, name, analysis_data, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (savedError) throw savedError;

        // Load from historical_pricing_files (new dedicated table)
        const { data: historicalFiles, error: histError } = await supabase
          .from("historical_pricing_files")
          .select("id, project_name, items, project_date, is_verified, project_location")
          .order("created_at", { ascending: false })
          .limit(50);

        if (histError) {
          console.error("Failed to load historical files:", histError);
        }

        // Combine both sources
        const combined = [
          ...(savedProjects || []).map(p => ({
            ...p,
            source: 'saved_project' as const
          })),
          ...(historicalFiles || []).map(h => ({
            id: h.id,
            name: h.project_name,
            analysis_data: { items: h.items },
            created_at: h.project_date || new Date().toISOString(),
            is_verified: h.is_verified,
            source: 'historical_file' as const
          }))
        ];

        setHistoricalProjects(combined);
      } catch (error) {
        console.error("Failed to load historical projects:", error);
      }
    };

    if (isOpen) {
      loadHistoricalData();
    }
  }, [isOpen]);

  const findSimilarItems = (item: BOQItem, historicalItems: any[]): HistoricalMatch[] => {
    const matches: HistoricalMatch[] = [];
    const itemWords = item.description.toLowerCase().split(/\s+/);

    for (const histItem of historicalItems) {
      if (!histItem.description || !histItem.unit_price) continue;

      const histWords = histItem.description.toLowerCase().split(/\s+/);
      const commonWords = itemWords.filter(w => histWords.includes(w) && w.length > 2);
      const matchScore = (commonWords.length / Math.max(itemWords.length, histWords.length)) * 100;

      // Also check if units match
      const unitMatch = item.unit?.toLowerCase() === histItem.unit?.toLowerCase();
      const adjustedScore = matchScore * (unitMatch ? 1.2 : 0.8);

      if (adjustedScore >= 30) {
        const currentPrice = item.unit_price || 0;
        const historicalPrice = histItem.unit_price || 0;
        const trendPercentage = currentPrice > 0 
          ? ((historicalPrice - currentPrice) / currentPrice) * 100 
          : 0;

        matches.push({
          item_number: histItem.item_number,
          description: histItem.description,
          historical_price: historicalPrice,
          historical_project: histItem.project_name || "مشروع سابق",
          historical_date: histItem.created_at || new Date().toISOString(),
          match_score: Math.min(100, adjustedScore),
          price_trend: Math.abs(trendPercentage) <= 5 ? "stable" : trendPercentage > 0 ? "up" : "down",
          trend_percentage: Math.abs(trendPercentage),
        });
      }
    }

    return matches.sort((a, b) => b.match_score - a.match_score).slice(0, 5);
  };

  const handleCompare = async () => {
    if (!items.length || !suggestions.length) {
      toast({
        title: "بيانات غير كافية",
        description: "يرجى إجراء التحليل المتقدم أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setComparisons([]);

    try {
      // Extract items from historical projects
      const allHistoricalItems: any[] = [];
      
      for (const project of historicalProjects) {
        if (project.analysis_data?.items) {
          const analysisData = typeof project.analysis_data === 'string' 
            ? JSON.parse(project.analysis_data) 
            : project.analysis_data;
          
          const projectItems = analysisData.items || [];
          projectItems.forEach((item: any) => {
            allHistoricalItems.push({
              ...item,
              project_name: project.name,
              created_at: project.created_at,
            });
          });
        }
      }

      // Compare each item
      const results: ComparisonResult[] = [];

      for (const item of items) {
        const suggestion = suggestions.find(s => s.item_number === item.item_number);
        const historicalMatches = findSimilarItems(item, allHistoricalItems);

        // Calculate historical average
        const historicalPrices = historicalMatches.map(m => m.historical_price);
        const historicalAverage = historicalPrices.length > 0
          ? historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length
          : 0;

        // Calculate adjusted price (weighted average of AI and historical)
        const aiPrice = suggestion?.final_suggested_price || item.unit_price || 0;
        const historicalWeight = Math.min(0.3, historicalMatches.length * 0.1); // Max 30% historical influence
        const adjustedPrice = historicalAverage > 0
          ? aiPrice * (1 - historicalWeight) + historicalAverage * historicalWeight
          : aiPrice;

        // Calculate confidence boost from historical data
        const confidenceBoost = historicalMatches.length > 0
          ? Math.min(15, historicalMatches.reduce((sum, m) => sum + m.match_score * 0.1, 0))
          : 0;

        // Generate recommendation
        let recommendation = "";
        if (historicalMatches.length === 0) {
          recommendation = "لا توجد بيانات تاريخية مشابهة. الاعتماد على تحليل الذكاء الاصطناعي.";
        } else if (Math.abs(aiPrice - historicalAverage) / aiPrice <= 0.1) {
          recommendation = "السعر المقترح متوافق مع البيانات التاريخية. ثقة عالية.";
        } else if (aiPrice > historicalAverage) {
          recommendation = `السعر المقترح أعلى من المتوسط التاريخي بـ ${((aiPrice - historicalAverage) / historicalAverage * 100).toFixed(1)}%. يُنصح بمراجعة تغيرات السوق.`;
        } else {
          recommendation = `السعر المقترح أقل من المتوسط التاريخي بـ ${((historicalAverage - aiPrice) / historicalAverage * 100).toFixed(1)}%. قد يعكس انخفاض السوق.`;
        }

        results.push({
          item_number: item.item_number,
          description: item.description,
          current_price: item.unit_price || 0,
          ai_suggested_price: aiPrice,
          historical_average: historicalAverage,
          historical_matches: historicalMatches,
          adjusted_price: Math.round(adjustedPrice * 100) / 100,
          confidence_boost: Math.round(confidenceBoost),
          recommendation,
        });
      }

      setComparisons(results);

      toast({
        title: "✅ تمت المقارنة",
        description: `تم مقارنة ${results.length} بند مع ${allHistoricalItems.length} بند تاريخي`,
      });
    } catch (error: any) {
      console.error("Comparison error:", error);
      toast({
        title: "فشلت المقارنة",
        description: error.message || "حدث خطأ أثناء المقارنة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAdjusted = () => {
    if (onApplyAdjustedPrices && comparisons.length > 0) {
      const prices = comparisons
        .filter(c => c.adjusted_price > 0)
        .map(c => ({
          itemId: c.item_number,
          rate: c.adjusted_price,
        }));
      onApplyAdjustedPrices(prices);
      toast({
        title: "✅ تم التطبيق",
        description: `تم تطبيق ${prices.length} سعر معدّل`,
      });
    }
  };

  const filteredComparisons = comparisons.filter(c =>
    c.item_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return <TrendingUp className="w-3 h-3 text-red-500" />;
      case "down": return <TrendingDown className="w-3 h-3 text-green-500" />;
      default: return <Minus className="w-3 h-3 text-blue-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={suggestions.length === 0}>
          <History className="w-4 h-4" />
          مقارنة تاريخية
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            مقارنة مع المشاريع السابقة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-lg font-bold text-primary">{historicalProjects.length}</p>
              <p className="text-xs text-muted-foreground">مشروع سابق</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-lg font-bold">{suggestions.length}</p>
              <p className="text-xs text-muted-foreground">بند للمقارنة</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
              <p className="text-lg font-bold text-green-600">{comparisons.filter(c => c.historical_matches.length > 0).length}</p>
              <p className="text-xs text-muted-foreground">تطابق تاريخي</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleCompare} disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>جاري المقارنة...</>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  بدء المقارنة
                </>
              )}
            </Button>

            {comparisons.length > 0 && (
              <>
                <Button variant="secondary" onClick={handleApplyAdjusted} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  تطبيق الأسعار المعدّلة
                </Button>

                <div className="flex-1">
                  <Input
                    placeholder="بحث في النتائج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* Results */}
          {comparisons.length > 0 && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredComparisons.map((comparison) => (
                  <div key={comparison.item_number} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{comparison.item_number}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[400px]">
                          {comparison.description}
                        </p>
                      </div>
                      <Badge variant={comparison.historical_matches.length > 0 ? "default" : "secondary"}>
                        {comparison.historical_matches.length} تطابق
                      </Badge>
                    </div>

                    {/* Prices Grid */}
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">الحالي</p>
                        <p className="font-medium">{comparison.current_price.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-xs text-muted-foreground">AI المقترح</p>
                        <p className="font-medium text-blue-600">{comparison.ai_suggested_price.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <p className="text-xs text-muted-foreground">متوسط تاريخي</p>
                        <p className="font-medium text-yellow-600">
                          {comparison.historical_average > 0 ? comparison.historical_average.toFixed(2) : "-"}
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <p className="text-xs text-muted-foreground">السعر المعدّل</p>
                        <p className="font-bold text-green-600">{comparison.adjusted_price.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Historical Matches */}
                    {comparison.historical_matches.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">المطابقات التاريخية:</p>
                        <div className="flex flex-wrap gap-2">
                          {comparison.historical_matches.slice(0, 3).map((match, idx) => (
                            <TooltipProvider key={idx}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    {getTrendIcon(match.price_trend)}
                                    {match.historical_price.toFixed(2)} ر.س
                                    <span className="text-muted-foreground">({match.match_score.toFixed(0)}%)</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{match.historical_project}</p>
                                  <p className="text-xs">{match.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(match.historical_date).toLocaleDateString("ar-SA")}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className="flex items-start gap-2 p-2 bg-muted/30 rounded text-sm">
                      {comparison.historical_matches.length > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-muted-foreground">{comparison.recommendation}</p>
                      {comparison.confidence_boost > 0 && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          +{comparison.confidence_boost}% ثقة
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {comparisons.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>انقر "بدء المقارنة" لمقارنة الأسعار مع المشاريع السابقة</p>
              <p className="text-sm">يتوفر {historicalProjects.length} مشروع سابق للمقارنة</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
