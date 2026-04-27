import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, MapPin, Loader2, Check, AlertTriangle, CheckCheck, BarChart3, Bot, Globe, BookOpen, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ApplyRateDialog } from "./ApplyRateDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisTracking, useTrackAnalysis } from "@/hooks/useAnalysisTracking";

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
  source?: "library" | "reference" | "ai";
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

export function MarketRateSuggestions({ items, projectId, onApplyRate, onApplyAIRates, onApplyAIRatesToCalcPrice }: MarketRateSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState("Riyadh");
  const [region, setRegion] = useState("saudi");
  const [suggestions, setSuggestions] = useState<MarketRateSuggestion[]>([]);
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MarketRateSuggestion | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [analyzedItemsCount, setAnalyzedItemsCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { selectedModel } = useAnalysisTracking();
  const { startTracking, completeTracking } = useTrackAnalysis(
    'suggest-market-rates',
    'Market Rate Suggestions',
    'اقتراحات أسعار السوق'
  );

  // Get source icon
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case "library":
        return <BookOpen className="w-3 h-3 text-green-600" />;
      case "reference":
        return <Database className="w-3 h-3 text-blue-600" />;
      case "ai":
        return <Bot className="w-3 h-3 text-purple-600" />;
      default:
        return <Bot className="w-3 h-3 text-muted-foreground" />;
    }
  };

  // Get source label
  const getSourceLabel = (source?: string) => {
    switch (source) {
      case "library": return "Local Library";
      case "reference": return "Reference DB";
      case "ai": return "AI Analysis";
      default: return "Unknown";
    }
  };

  // Update pricing history when rate is applied
  const updatePricingHistory = async (itemNumber: string, finalPrice: number, suggestedPrice: number) => {
    if (!user) return;

    try {
      // Calculate accuracy and deviation
      const deviation = suggestedPrice > 0 ? ((finalPrice - suggestedPrice) / suggestedPrice) * 100 : 0;
      const accuracy = Math.max(0, 100 - Math.abs(deviation));

      await supabase
        .from('pricing_history')
        .update({
          final_price: finalPrice,
          is_approved: true,
          approved_at: new Date().toISOString(),
          deviation_percent: Math.round(deviation * 100) / 100,
          accuracy_score: Math.round(accuracy * 100) / 100
        })
        .eq('item_number', itemNumber)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (error) {
      console.error('Error updating pricing history:', error);
    }
  };

  // Fetch library data for enhanced pricing
  const fetchLibraryData = async () => {
    try {
      const [materialsRes, laborRes, equipmentRes] = await Promise.all([
        supabase.from('material_prices').select('name, name_ar, unit_price, unit, category, is_verified, price_date'),
        supabase.from('labor_rates').select('name, name_ar, unit_rate, unit, category'),
        supabase.from('equipment_rates').select('name, name_ar, rental_rate, unit, category')
      ]);
      
      return {
        materials: materialsRes.data || [],
        labor: laborRes.data || [],
        equipment: equipmentRes.data || []
      };
    } catch (error) {
      console.error('Error fetching library data:', error);
      return undefined;
    }
  };

  const handleSuggestRates = async () => {
    if (!items || items.length === 0) {
      toast({
        title: "No items",
        description: "Please upload BOQ data first",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => !!item.item_number);

    if (validItems.length === 0) {
      toast({
        title: "No valid items",
        description: "All items are missing item numbers",
        variant: "destructive",
      });
      return;
    }

    const trackingId = startTracking(validItems.length);

    setIsLoading(true);
    setSuggestions([]);
    setTotalItemsCount(validItems.length);
    setAnalyzedItemsCount(0);
    setAnalysisProgress(0);

    try {
      // Fetch library data for enhanced accuracy
      const libraryData = await fetchLibraryData();
      console.log(`Library data loaded: ${libraryData?.materials?.length || 0} materials, ${libraryData?.labor?.length || 0} labor, ${libraryData?.equipment?.length || 0} equipment`);
      
      const regionInfo = REGIONS.find(r => r.value === region);
      const { data, error } = await supabase.functions.invoke("suggest-market-rates", {
        body: { 
          items: validItems, 
          location, 
          region: regionInfo?.label || "Saudi Arabia",
          model: selectedModel,
          libraryData
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
      
      completeTracking(trackingId, true, false, {
        itemsAnalyzed: receivedSuggestions.length,
      });
      
      if (receivedSuggestions.length > 0 && onApplyAIRates) {
        const rates = receivedSuggestions.map((s: MarketRateSuggestion) => ({
          itemId: s.item_number,
          rate: s.suggested_avg,
        }));
        onApplyAIRates(rates);
      }
      
      // Show accuracy in toast
      const accuracy = data.accuracy_metrics?.estimated_accuracy || 0;
      const sourceInfo = data.data_source;
      toast({
        title: `تم التحليل بدقة ${accuracy}%`,
        description: `${data.analyzed_items} بند: مكتبة(${sourceInfo?.library_count || 0}) + مرجعي(${sourceInfo?.reference_count || 0}) + AI(${sourceInfo?.ai_count || 0})`,
      });
    } catch (error: any) {
      console.error("Error getting market rates:", error);
      completeTracking(trackingId, false, false, {
        error: error.message || "Failed to get market rate suggestions"
      });
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

  const handleConfirmApply = async () => {
    if (!selectedSuggestion || !onApplyRate) return;
    
    onApplyRate(selectedSuggestion.item_number, selectedSuggestion.suggested_avg);
    setAppliedItems(prev => new Set([...prev, selectedSuggestion.item_number]));
    setConfirmDialogOpen(false);
    
    // Update pricing history with the applied rate
    await updatePricingHistory(
      selectedSuggestion.item_number, 
      selectedSuggestion.suggested_avg,
      selectedSuggestion.suggested_avg
    );
    
    toast({
      title: "Rate applied",
      description: `Updated unit price for item ${selectedSuggestion.item_number}`,
    });
    
    setSelectedSuggestion(null);
  };

  const handleApplyAll = async () => {
    if (!onApplyRate) return;
    
    const unappliedSuggestions = suggestions.filter(s => !appliedItems.has(s.item_number));
    for (const suggestion of unappliedSuggestions) {
      onApplyRate(suggestion.item_number, suggestion.suggested_avg);
      await updatePricingHistory(suggestion.item_number, suggestion.suggested_avg, suggestion.suggested_avg);
    }
    
    setAppliedItems(new Set(suggestions.map(s => s.item_number)));
    
    toast({
      title: "All rates applied",
      description: `Updated ${unappliedSuggestions.length} items with suggested market rates`,
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
        return <TrendingUp className="w-4 h-4 text-destructive" />;
      case "Decreasing":
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-600" />;
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

  const getConfidencePercent = (confidence: string) => {
    if (confidence === "High") return "≥95%";
    if (confidence === "Medium") return "~88%";
    return "~75%";
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) > 20) return "text-destructive font-bold";
    if (Math.abs(variance) > 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const highVarianceCount = suggestions.filter(s => Math.abs(s.variance_percent) > 20).length;

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const dialogContent = (
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

      {/* Analysis Progress */}
      {isLoading && (
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg space-y-3 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <div>
                <p className="font-semibold text-sm">جارٍ تحليل البنود...</p>
                <p className="text-xs text-muted-foreground">يرجى الانتظار</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{analysisProgress}%</p>
            </div>
          </div>
          <Progress value={analysisProgress} className="h-3" />
        </div>
      )}
      
      {/* Completed Analysis Summary */}
      {suggestions.length > 0 && !isLoading && (
        <div className="p-4 bg-green-500/10 rounded-lg space-y-3 border border-green-500/20">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">تم اكتمال التحليل بنجاح!</p>
              <p className="text-xs text-muted-foreground">
                تم تحليل {analyzedItemsCount} من {totalItemsCount} بند
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location selector and analyze button */}
      <div className="flex flex-col gap-4 p-4 bg-muted/50 rounded-lg">
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
        </div>
        
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
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze All ({items?.length || 0} items)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results summary */}
      {suggestions.length > 0 && (
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <span className="text-muted-foreground">
            {suggestions.length} rate suggestions available
          </span>
          <div className="flex items-center gap-2">
            {highVarianceCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {highVarianceCount} high variance
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyAll}
              disabled={suggestions.length === 0 || appliedItems.size === suggestions.length}
              className="gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Apply All ({suggestions.length - appliedItems.size})
            </Button>
          </div>
        </div>
      )}

      {/* Suggestions table */}
      {suggestions.length > 0 ? (
        <ScrollArea className="h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="p-2 text-right">Item</th>
                <th className="p-2 text-right">Description</th>
                <th className="p-2 text-center">Source</th>
                <th className="p-2 text-right">Current</th>
                <th className="p-2 text-right">Suggested</th>
                <th className="p-2 text-right">Variance</th>
                <th className="p-2 text-right">Confidence</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => (
                <tr key={suggestion.item_number} className={cn(
                  "border-b hover:bg-muted/50 transition-colors",
                  appliedItems.has(suggestion.item_number) && "bg-green-50 dark:bg-green-900/20"
                )}>
                  <td className="p-3 font-mono text-xs">{suggestion.item_number}</td>
                  <td className="p-3 max-w-[200px] truncate" title={suggestion.description}>
                    {suggestion.description}
                  </td>
                  <td className="p-3 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "gap-1",
                              suggestion.source === "library" && "bg-green-500/10 border-green-500/30",
                              suggestion.source === "reference" && "bg-blue-500/10 border-blue-500/30",
                              suggestion.source === "ai" && "bg-purple-500/10 border-purple-500/30"
                            )}
                          >
                            {getSourceIcon(suggestion.source)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getSourceLabel(suggestion.source)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="p-3 font-mono">
                    {suggestion.current_price?.toLocaleString() || "N/A"}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-primary">
                      {suggestion.suggested_avg?.toLocaleString()}
                    </span>
                  </td>
                  <td className={cn("p-3 font-mono", getVarianceColor(suggestion.variance_percent))}>
                    {suggestion.variance_percent > 0 ? "+" : ""}{suggestion.variance_percent?.toFixed(1)}%
                  </td>
                  <td className="p-3">
                    <Badge className={cn(getConfidenceBadge(suggestion.confidence), "gap-1")}>
                      {suggestion.confidence}
                      <span className="opacity-80 text-[10px] font-mono">{getConfidencePercent(suggestion.confidence)}</span>
                    </Badge>
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
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Sparkles className="w-12 h-12 text-muted-foreground/50" />
              <p>Click "Analyze All" to get AI-powered market rate suggestions</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 analysis-action-btn hover:bg-primary/10 hover:border-primary/50 transition-all duration-100"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Suggest Rates</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {items?.length || 0}
            </Badge>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Market Rate Suggestions
            </DialogTitle>
          </DialogHeader>
          {dialogContent}
        </DialogContent>
      </Dialog>
      <ApplyRateDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        item={getSelectedItem()}
        suggestedRate={selectedSuggestion?.suggested_avg || 0}
        onConfirm={handleConfirmApply}
      />
    </>
  );
}
