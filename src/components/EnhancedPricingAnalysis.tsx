import { useState, useEffect } from "react";
import { Brain, Sparkles, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, Loader2, Settings2, BarChart3, Users, Shield, Calculator, ChevronDown, ChevronRight, Target, Lightbulb, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAnalysisTracking } from "@/hooks/useAnalysisTracking";
import { AnalyzerWeightsDialog } from "./AnalyzerWeightsDialog";
import { HistoricalPriceComparison } from "./HistoricalPriceComparison";
import { EnhancedAnalysisPDFReport } from "./EnhancedAnalysisPDFReport";
import { Link } from "react-router-dom";
interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface AnalyzerResult {
  name: string;
  nameAr: string;
  suggested_price: number;
  confidence: number;
  methodology: string;
  source: string;
}

interface EnhancedSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  analyzers: AnalyzerResult[];
  final_suggested_price: number;
  price_range: { min: number; max: number };
  overall_confidence: number;
  consensus_score: number;
  recommendation: string;
  recommendation_ar: string;
}

interface EnhancedPricingAnalysisProps {
  items: BOQItem[];
  onApplyRates?: (rates: Array<{ itemId: string; rate: number }>) => void;
}

const ANALYZERS = [
  { id: "construction_expert", name: "Construction Expert", nameAr: "خبير البناء", icon: Users, description: "خبرة 25+ سنة في السعودية مع أسعار مرجعية" },
  { id: "market_analyst", name: "Market Analyst", nameAr: "محلل السوق", icon: BarChart3, description: "أسعار السوق الحالية 2024-2025" },
  { id: "quantity_surveyor", name: "Quantity Surveyor", nameAr: "مهندس كميات", icon: Calculator, description: "تحليل تفصيلي للتكاليف" },
  { id: "database_comparator", name: "Historical Database", nameAr: "قاعدة بيانات تاريخية", icon: Shield, description: "مقارنة مع مشاريع سابقة حقيقية" },
];

const LOCATIONS = [
  { value: "Riyadh", label: "الرياض / Riyadh" },
  { value: "Jeddah", label: "جدة / Jeddah" },
  { value: "Dammam", label: "الدمام / Dammam" },
  { value: "Makkah", label: "مكة / Makkah" },
  { value: "Madinah", label: "المدينة / Madinah" },
];

export function EnhancedPricingAnalysis({ items, onApplyRates }: EnhancedPricingAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [location, setLocation] = useState("Riyadh");
  const [activeAnalyzers, setActiveAnalyzers] = useState<string[]>(["construction_expert", "market_analyst", "quantity_surveyor", "database_comparator"]);
  const [suggestions, setSuggestions] = useState<EnhancedSuggestion[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { selectedModel } = useAnalysisTracking();

  // Load saved weights on mount
  useEffect(() => {
    const saved = localStorage.getItem("analyzer_weights");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize to 0-1 scale
        const total = Object.values(parsed).reduce((sum: number, val: any) => sum + (val as number), 0) as number;
        const normalized: Record<string, number> = {};
        for (const [key, val] of Object.entries(parsed)) {
          normalized[key] = total > 0 ? (val as number) / total : 0.25;
        }
        setCustomWeights(normalized);
      } catch (e) {
        console.error("Failed to load analyzer weights:", e);
      }
    }
  }, []);

  const toggleAnalyzer = (id: string) => {
    setActiveAnalyzers(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id)
        : [...prev, id]
    );
  };

  const toggleExpanded = (itemNumber: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemNumber)) {
        newSet.delete(itemNumber);
      } else {
        newSet.add(itemNumber);
      }
      return newSet;
    });
  };

  const handleAnalyze = async () => {
    if (!items || items.length === 0) {
      toast({
        title: "لا توجد بنود",
        description: "يرجى تحميل بيانات BOQ أولاً",
        variant: "destructive",
      });
      return;
    }

    if (activeAnalyzers.length === 0) {
      toast({
        title: "لا يوجد محلل نشط",
        description: "يرجى اختيار محلل واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setSuggestions([]);
    setSummary(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    try {
      const validItems = items.filter(item => !!item.item_number);

      const { data, error } = await supabase.functions.invoke("enhanced-pricing-analysis", {
        body: {
          items: validItems,
          location,
          model: selectedModel,
          analyzers: activeAnalyzers,
          weights: Object.keys(customWeights).length > 0 ? customWeights : undefined
        },
      });
      clearInterval(progressInterval);

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setSuggestions(data.suggestions || []);
      setSummary(data.summary);
      setProgress(100);

      // Apply rates if callback provided
      if (onApplyRates && data.suggestions?.length > 0) {
        const rates = data.suggestions.map((s: EnhancedSuggestion) => ({
          itemId: s.item_number,
          rate: s.final_suggested_price,
        }));
        onApplyRates(rates);
      }

      toast({
        title: "✅ تم التحليل بنجاح",
        description: `تم تحليل ${data.summary?.analyzed_items || 0} بند باستخدام ${activeAnalyzers.length} محلل`,
      });
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("Enhanced analysis error:", error);
      toast({
        title: "فشل التحليل",
        description: error.message || "حدث خطأ أثناء التحليل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 dark:text-green-400";
    if (confidence >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConsensusColor = (consensus: number) => {
    if (consensus >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (consensus >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const getVarianceIndicator = (current: number, suggested: number) => {
    const variance = current > 0 ? ((suggested - current) / current) * 100 : 0;
    if (Math.abs(variance) <= 5) {
      return { icon: Minus, color: "text-green-500", label: "متوازن" };
    } else if (variance > 0) {
      return { icon: TrendingUp, color: "text-red-500", label: `+${variance.toFixed(1)}%` };
    } else {
      return { icon: TrendingDown, color: "text-blue-500", label: `${variance.toFixed(1)}%` };
    }
  };

  const handleApplyAll = () => {
    if (onApplyRates && suggestions.length > 0) {
      const rates = suggestions.map(s => ({
        itemId: s.item_number,
        rate: s.final_suggested_price,
      }));
      onApplyRates(rates);
      toast({
        title: "✅ تم التطبيق",
        description: `تم تطبيق ${rates.length} سعر مقترح`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/50 hover:bg-primary/10">
          <Brain className="w-4 h-4 text-primary" />
          <span>تحليل متقدم للأسعار</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            تحليل الأسعار المتقدم بالذكاء الاصطناعي المتعدد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Settings Panel */}
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">إعدادات التحليل</span>
              </div>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Analyzers Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">المحللات النشطة</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ANALYZERS.map(analyzer => {
                  const Icon = analyzer.icon;
                  const isActive = activeAnalyzers.includes(analyzer.id);
                  return (
                    <div
                      key={analyzer.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        isActive 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background hover:bg-muted/50"
                      )}
                      onClick={() => toggleAnalyzer(analyzer.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        <Switch checked={isActive} />
                      </div>
                      <p className="text-xs font-medium">{analyzer.nameAr}</p>
                      <p className="text-xs text-muted-foreground truncate">{analyzer.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analyze Button */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleAnalyze} 
                disabled={isLoading || activeAnalyzers.length === 0}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    بدء التحليل المتقدم ({items.length} بند)
                  </>
                )}
              </Button>

              {suggestions.length > 0 && (
                <>
                  <Button variant="secondary" onClick={handleApplyAll} className="gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    تطبيق جميع الأسعار
                  </Button>

                  <HistoricalPriceComparison 
                    items={items} 
                    suggestions={suggestions}
                    onApplyAdjustedPrices={onApplyRates}
                  />

                  <EnhancedAnalysisPDFReport 
                    suggestions={suggestions}
                    summary={summary}
                  />
                </>
              )}

              <div className="mr-auto flex items-center gap-2">
                <Link to="/historical-pricing">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Database className="w-4 h-4" />
                    قاعدة البيانات التاريخية
                  </Button>
                </Link>
                <AnalyzerWeightsDialog onWeightsChange={setCustomWeights} />
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  جاري التحليل باستخدام {activeAnalyzers.length} محلل...
                </p>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{summary.analyzed_items}</p>
                <p className="text-xs text-muted-foreground">بند تم تحليله</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.average_confidence}%</p>
                <p className="text-xs text-muted-foreground">متوسط الثقة</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.average_consensus}%</p>
                <p className="text-xs text-muted-foreground">توافق المحللين</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">{summary.analyzers_used?.length || 0}</p>
                <p className="text-xs text-muted-foreground">محلل نشط</p>
              </div>
            </div>
          )}

          {/* Results List */}
          {suggestions.length > 0 && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {suggestions.map((suggestion) => {
                  const isExpanded = expandedItems.has(suggestion.item_number);
                  const variance = getVarianceIndicator(suggestion.current_price, suggestion.final_suggested_price);
                  const VarianceIcon = variance.icon;

                  return (
                    <Collapsible key={suggestion.item_number} open={isExpanded}>
                      <div className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger 
                          className="w-full p-3 hover:bg-muted/50 transition-colors"
                          onClick={() => toggleExpanded(suggestion.item_number)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <div className="text-right">
                                <p className="font-medium text-sm">{suggestion.item_number}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {suggestion.description}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">الحالي</p>
                                <p className="font-medium">{suggestion.current_price.toFixed(2)}</p>
                              </div>
                              
                              <VarianceIcon className={cn("w-5 h-5", variance.color)} />
                              
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">المقترح</p>
                                <p className="font-bold text-primary">{suggestion.final_suggested_price.toFixed(2)}</p>
                              </div>

                              <Badge className={getConsensusColor(suggestion.consensus_score)}>
                                توافق {suggestion.consensus_score}%
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="p-4 bg-muted/20 border-t space-y-4">
                            {/* Recommendation */}
                            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                              <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">التوصية</p>
                                <p className="text-sm text-muted-foreground">{suggestion.recommendation_ar}</p>
                              </div>
                            </div>

                            {/* Price Range */}
                            <div className="flex items-center gap-4">
                              <Target className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">نطاق السعر:</span>
                              <span className="text-sm font-medium">
                                {suggestion.price_range.min.toFixed(2)} - {suggestion.price_range.max.toFixed(2)} ر.س
                              </span>
                            </div>

                            {/* Analyzers Details */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium">نتائج المحللين:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {suggestion.analyzers.map((analyzer, idx) => (
                                  <div key={idx} className="p-2 bg-background rounded border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">{analyzer.nameAr}</span>
                                      <Badge variant="outline" className={getConfidenceColor(analyzer.confidence)}>
                                        {analyzer.confidence}%
                                      </Badge>
                                    </div>
                                    <p className="text-lg font-bold">{analyzer.suggested_price.toFixed(2)} ر.س</p>
                                    <p className="text-xs text-muted-foreground truncate">{analyzer.methodology}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!isLoading && suggestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>اختر المحللات وابدأ التحليل للحصول على أسعار دقيقة</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
