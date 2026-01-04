import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, MapPin, Loader2, Check, AlertTriangle, CheckCheck, BarChart3, Calculator, Bot, Globe, Save, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ApplyRateDialog } from "./ApplyRateDialog";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface MarketRateSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  suggested_min: number;
  suggested_max: number;
  suggested_avg: number;
  confidence: "High" | "Medium" | "Low";
  trend: "Increasing" | "Stable" | "Decreasing";
  variance_percent: number;
  notes: string;
}

interface MarketRateSuggestionsProps {
  items: BOQItem[];
  projectId?: string;
  onApplyRate?: (itemNumber: string, newRate: number) => void;
  onApplyAIRates?: (rates: Array<{ itemId: string; rate: number }>) => void;
  onApplyAIRatesToCalcPrice?: (rates: Array<{ itemId: string; rate: number }>) => void;
}

const SAUDI_CITIES = [
  { value: "Riyadh", label: "Riyadh" },
  { value: "Jeddah", label: "Jeddah" },
  { value: "Dammam", label: "Dammam" },
  { value: "Makkah", label: "Makkah" },
  { value: "Madinah", label: "Madinah" },
  { value: "Khobar", label: "Khobar" },
  { value: "Tabuk", label: "Tabuk" },
  { value: "Abha", label: "Abha" },
];

const REGIONS = [
  { value: "saudi", label: "Saudi Arabia", emoji: "🇸🇦" },
  { value: "uae", label: "UAE", emoji: "🇦🇪" },
  { value: "egypt", label: "Egypt", emoji: "🇪🇬" },
  { value: "qatar", label: "Qatar", emoji: "🇶🇦" },
  { value: "kuwait", label: "Kuwait", emoji: "🇰🇼" },
  { value: "bahrain", label: "Bahrain", emoji: "🇧🇭" },
  { value: "oman", label: "Oman", emoji: "🇴🇲" },
];

const AI_AGENTS = [
  { value: "manus", label: "Manus AI", description: "Deep market research with web search", icon: "🔍" },
  { value: "standard", label: "Standard AI", description: "Fast analysis from training data", icon: "⚡" },
];

export function MarketRateSuggestions({ items, projectId, onApplyRate, onApplyAIRates, onApplyAIRatesToCalcPrice }: MarketRateSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState("Riyadh");
  const [region, setRegion] = useState("saudi");
  const [aiAgent, setAiAgent] = useState("manus");
  const [suggestions, setSuggestions] = useState<MarketRateSuggestion[]>([]);
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MarketRateSuggestion | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [analyzedItemsCount, setAnalyzedItemsCount] = useState(0);
  const [savedToDb, setSavedToDb] = useState(false);
  const { toast } = useToast();

  const handleSuggestRates = async () => {
    if (!items || items.length === 0) {
      toast({
        title: "No items",
        description: "Please upload BOQ data first",
        variant: "destructive",
      });
      return;
    }

    // Filter out items without item_number (should be rare after normalization)
    const validItems = items.filter(item => !!item.item_number);

    if (validItems.length === 0) {
      toast({
        title: "No valid items",
        description: "All items are missing item numbers",
        variant: "destructive",
      });
      return;
    }

    

    setIsLoading(true);
    setSuggestions([]);
    setTotalItemsCount(validItems.length);
    setAnalyzedItemsCount(0);
    setAnalysisProgress(0);

    try {
      // Send ALL valid items to the API with region and agent info
      const regionInfo = REGIONS.find(r => r.value === region);
      const { data, error } = await supabase.functions.invoke("suggest-market-rates", {
        body: { 
          items: validItems, 
          location, 
          region: regionInfo?.label || "Saudi Arabia",
          aiAgent,
          useWebSearch: aiAgent === "manus"
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const receivedSuggestions = data.suggestions || [];
      setSuggestions(receivedSuggestions);
      setAnalyzedItemsCount(data.analyzed_items || receivedSuggestions.length);
      setAnalysisProgress(100);
      
      // Apply AI rates to the calculator if callback provided
      if (receivedSuggestions.length > 0) {
        const rates = receivedSuggestions.map((s: MarketRateSuggestion) => ({
          itemId: s.item_number,
          rate: s.suggested_avg,
        }));
        
        // Always apply to AI Rate column
        if (onApplyAIRates) {
          onApplyAIRates(rates);
        }
      }
      
      toast({
        title: "Market rates analyzed",
        description: `${data.analyzed_items} of ${data.total_items} items analyzed for ${location}`,
      });
    } catch (error: any) {
      console.error("Error getting market rates:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to get market rate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openApplyDialog = (suggestion: MarketRateSuggestion) => {
    setSelectedSuggestion(suggestion);
    setConfirmDialogOpen(true);
  };

  const handleConfirmApply = () => {
    if (!selectedSuggestion || !onApplyRate) return;
    
    onApplyRate(selectedSuggestion.item_number, selectedSuggestion.suggested_avg);
    setAppliedItems(prev => new Set([...prev, selectedSuggestion.item_number]));
    setConfirmDialogOpen(false);
    setSelectedSuggestion(null);
    
    toast({
      title: "Rate applied",
      description: `Updated unit price for item ${selectedSuggestion.item_number}. Totals recalculated.`,
    });
  };

  const handleApplyAll = () => {
    if (!onApplyRate) return;
    
    const unappliedSuggestions = suggestions.filter(s => !appliedItems.has(s.item_number));
    unappliedSuggestions.forEach(suggestion => {
      onApplyRate(suggestion.item_number, suggestion.suggested_avg);
    });
    
    setAppliedItems(new Set(suggestions.map(s => s.item_number)));
    
    toast({
      title: "All rates applied",
      description: `Updated ${unappliedSuggestions.length} items with suggested market rates. Totals recalculated.`,
    });
  };

  const getSelectedItem = (): BOQItem | null => {
    if (!selectedSuggestion) return null;
    return items.find(i => i.item_number === selectedSuggestion.item_number) || {
      item_number: selectedSuggestion.item_number,
      description: selectedSuggestion.description,
      unit: 'Unit',
      quantity: 1,
      unit_price: selectedSuggestion.current_price,
      total_price: selectedSuggestion.current_price
    };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "Increasing":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "Decreasing":
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      High: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return colors[confidence as keyof typeof colors] || colors.Low;
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) > 20) return "text-red-600 dark:text-red-400 font-bold";
    if (Math.abs(variance) > 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const highVarianceCount = suggestions.filter(s => Math.abs(s.variance_percent) > 20).length;

  // Calculate average suggested rate
  const averageSuggestedRate = suggestions.length > 0
    ? suggestions.reduce((sum, s) => sum + s.suggested_avg, 0) / suggestions.length
    : 0;

  // Save AI rates to database
  const handleSaveToDatabase = async () => {
    if (!projectId || suggestions.length === 0) {
      toast({
        title: "خطأ",
        description: projectId ? "لا توجد أسعار للحفظ" : "يجب حفظ المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Get project items to map item_number to project_item_id
      const { data: projectItems, error: itemsError } = await supabase
        .from('project_items')
        .select('id, item_number')
        .eq('project_id', projectId);

      if (itemsError) throw itemsError;

      if (!projectItems || projectItems.length === 0) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بنود المشروع",
          variant: "destructive",
        });
        return;
      }

      // Create a map of item_number to project_item_id
      const itemMap = new Map(projectItems.map(item => [item.item_number, item.id]));

      // Prepare upsert data
      const upsertData = suggestions
        .filter(s => itemMap.has(s.item_number))
        .map(suggestion => ({
          project_item_id: itemMap.get(suggestion.item_number)!,
          ai_suggested_rate: suggestion.suggested_avg,
        }));

      if (upsertData.length === 0) {
        toast({
          title: "تحذير",
          description: "لم يتم مطابقة أي بند مع البنود المحفوظة",
          variant: "destructive",
        });
        return;
      }

      // Upsert item costs with AI suggested rates
      for (const data of upsertData) {
        const { error: upsertError } = await supabase
          .from('item_costs')
          .upsert(data, { onConflict: 'project_item_id' });

        if (upsertError) {
          console.error('Error upserting item cost:', upsertError);
        }
      }

      setSavedToDb(true);
      toast({
        title: "✅ تم الحفظ بنجاح",
        description: `تم حفظ ${upsertData.length} سعر AI في قاعدة البيانات`,
      });
    } catch (error: any) {
      console.error('Error saving to database:', error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "فشل في حفظ الأسعار",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Suggest Rates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Market Rate Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header with total items count */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Total BOQ Items</p>
                <p className="text-xs text-muted-foreground">Ready for analysis</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {items?.length || 0} items
            </Badge>
          </div>

          {/* Analysis Progress - Enhanced */}
          {isLoading && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg space-y-3 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <div className="absolute inset-0 w-6 h-6 rounded-full border-2 border-primary/20 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">جارٍ تحليل البنود...</p>
                    <p className="text-xs text-muted-foreground">يرجى الانتظار - قد يستغرق ذلك بضع دقائق</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{analysisProgress}%</p>
                  <p className="text-xs text-muted-foreground">{totalItemsCount} بند</p>
                </div>
              </div>
              <div className="relative">
                <Progress value={analysisProgress} className="h-3" />
                <div 
                  className="absolute top-0 h-3 bg-primary/30 rounded-full animate-pulse"
                  style={{ width: `${Math.min(analysisProgress + 10, 100)}%`, transition: 'width 0.5s ease' }}
                />
              </div>
            </div>
          )}
          
          {/* Completed Analysis Summary */}
          {suggestions.length > 0 && !isLoading && (
            <div className="p-4 bg-green-500/10 rounded-lg space-y-2 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-green-700 dark:text-green-400">تم اكتمال التحليل بنجاح!</p>
                    <p className="text-xs text-muted-foreground">
                      تم تحليل {analyzedItemsCount} من {totalItemsCount} بند
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  {Math.round((analyzedItemsCount / totalItemsCount) * 100)}% مكتمل
                </Badge>
              </div>
              {analyzedItemsCount < totalItemsCount && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  بعض البنود لم يتم تحليلها بسبب عدم وضوح الوصف
                </p>
              )}
            </div>
          )}

          {/* Location, Region, Agent selector and analyze button */}
          <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
            {/* Region and Agent Selection */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Region:</span>
              </div>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="flex items-center gap-2">
                        <span>{r.emoji}</span>
                        <span>{r.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Agent:</span>
              </div>
              <Select value={aiAgent} onValueChange={setAiAgent}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_AGENTS.map(agent => (
                    <SelectItem key={agent.value} value={agent.value}>
                      <span className="flex items-center gap-2">
                        <span>{agent.icon}</span>
                        <span>{agent.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* City and Analyze Button */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">City:</span>
              </div>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAUDI_CITIES.map(city => (
                    <SelectItem key={city.value} value={city.value}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSuggestRates} 
                disabled={isLoading || !items?.length}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {aiAgent === "manus" ? "Manus Analyzing..." : "Analyzing..."}
                  </>
                ) : suggestions.length > 0 ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Re-analyze ({items?.length || 0} items)
                  </>
                ) : (
                  <>
                    {aiAgent === "manus" ? <Bot className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    {aiAgent === "manus" ? `Manus Analyze (${items?.length || 0})` : `Analyze All (${items?.length || 0} items)`}
                  </>
                )}
              </Button>
            </div>
            
            {/* Agent Description */}
            <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border">
              {AI_AGENTS.find(a => a.value === aiAgent)?.description}
            </div>
          </div>

          {/* Results summary */}
          {suggestions.length > 0 && (
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-muted-foreground">
                  {suggestions.length} items analyzed
                </span>
                {highVarianceCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {highVarianceCount} items with &gt;20% variance
                  </Badge>
                )}
                {averageSuggestedRate > 0 && (
                  <Badge variant="outline" className="gap-1">
                    Avg Rate: {averageSuggestedRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onApplyAIRatesToCalcPrice && suggestions.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      const rates = suggestions.map(s => ({
                        itemId: s.item_number,
                        rate: s.suggested_avg,
                      }));
                      onApplyAIRatesToCalcPrice(rates);
                    }}
                    className="gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Apply Avg to Calc. Price
                  </Button>
                )}
                {onApplyRate && appliedItems.size < suggestions.length && (
                  <Button 
                    size="sm" 
                    onClick={handleApplyAll}
                    className="gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Apply All Suggested Rates
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Save to Database and Close Buttons - Enhanced */}
          {suggestions.length > 0 && !isLoading && (
            <div className="flex items-center justify-between pt-4 border-t border-primary/20 bg-gradient-to-r from-primary/5 to-transparent -mx-6 px-6 pb-2 mt-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{suggestions.length}</span> سعر جاهز للتطبيق
                {savedToDb && (
                  <Badge variant="outline" className="mr-2 text-green-600 border-green-600">
                    <Database className="w-3 h-3 ml-1" />
                    محفوظ في قاعدة البيانات
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {projectId && (
                  <Button
                    onClick={handleSaveToDatabase}
                    disabled={isSaving || savedToDb}
                    variant="outline"
                    className="gap-2 border-primary text-primary hover:bg-primary/10"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جارٍ الحفظ...
                      </>
                    ) : savedToDb ? (
                      <>
                        <Check className="w-4 h-4" />
                        تم الحفظ
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        حفظ في قاعدة البيانات
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    toast({
                      title: "✅ تم الحفظ بنجاح",
                      description: `تم تطبيق ${suggestions.length} سعر من أسعار AI`,
                    });
                    setIsOpen(false);
                  }}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  size="lg"
                >
                  <Check className="w-5 h-5" />
                  حفظ وإغلاق
                </Button>
              </div>
            </div>
          )}

          {/* Suggestions table */}
          {suggestions.length > 0 ? (
            <ScrollArea className="h-[400px] border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold">Item</th>
                    <th className="p-3 text-left text-sm font-semibold">Current Price</th>
                    <th className="p-3 text-left text-sm font-semibold">Suggested Range</th>
                    <th className="p-3 text-left text-sm font-semibold">Variance</th>
                    <th className="p-3 text-left text-sm font-semibold">Confidence</th>
                    <th className="p-3 text-left text-sm font-semibold">Trend</th>
                    <th className="p-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion, index) => (
                    <tr 
                      key={suggestion.item_number || index} 
                      className={cn(
                        "border-t hover:bg-muted/30 transition-colors",
                        Math.abs(suggestion.variance_percent) > 20 && "bg-red-50 dark:bg-red-900/10"
                      )}
                    >
                      <td className="p-3">
                        <div className="font-mono text-sm">{suggestion.item_number}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {suggestion.description}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-sm">
                        {suggestion.current_price?.toLocaleString() || 0} SAR
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            {suggestion.suggested_min?.toLocaleString()} - {suggestion.suggested_max?.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          Avg: {suggestion.suggested_avg?.toLocaleString()} SAR
                        </div>
                      </td>
                      <td className={cn("p-3 font-mono text-sm", getVarianceColor(suggestion.variance_percent))}>
                        {suggestion.variance_percent > 0 ? "+" : ""}{suggestion.variance_percent}%
                      </td>
                      <td className="p-3">
                        <Badge className={getConfidenceBadge(suggestion.confidence)}>
                          {suggestion.confidence}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(suggestion.trend)}
                          <span className="text-xs">{suggestion.trend}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {appliedItems.has(suggestion.item_number) ? (
                          <Badge variant="outline" className="gap-1 text-green-600">
                            <Check className="w-3 h-3" />
                            Applied
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openApplyDialog(suggestion)}
                            disabled={!onApplyRate}
                          >
                            Apply
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p>Analyzing market rates for {location}...</p>
                  <p className="text-sm">Processing {items?.length || 0} items in batches</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Sparkles className="w-12 h-12 text-muted-foreground/50" />
                  <p>Click "Analyze All" to get AI-powered market rate suggestions</p>
                  <p className="text-sm">Based on current Saudi Arabia construction market data</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Apply Rate Confirmation Dialog */}
      <ApplyRateDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        item={getSelectedItem()}
        suggestedRate={selectedSuggestion?.suggested_avg || 0}
        onConfirm={handleConfirmApply}
      />
    </Dialog>
  );
}
