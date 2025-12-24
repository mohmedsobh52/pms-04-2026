import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, MapPin, Loader2, Check, AlertTriangle, CheckCheck, BarChart3, Calculator } from "lucide-react";
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
  onApplyRate?: (itemNumber: string, newRate: number) => void;
  onApplyAIRates?: (rates: Array<{ itemId: string; rate: number }>) => void;
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

export function MarketRateSuggestions({ items, onApplyRate, onApplyAIRates }: MarketRateSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState("Riyadh");
  const [suggestions, setSuggestions] = useState<MarketRateSuggestion[]>([]);
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MarketRateSuggestion | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [analyzedItemsCount, setAnalyzedItemsCount] = useState(0);
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

    setIsLoading(true);
    setSuggestions([]);
    setTotalItemsCount(items.length);
    setAnalyzedItemsCount(0);
    setAnalysisProgress(0);

    try {
      // Send ALL items to the API (no slicing)
      const { data, error } = await supabase.functions.invoke("suggest-market-rates", {
        body: { items, location },
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
      if (onApplyAIRates && receivedSuggestions.length > 0) {
        const rates = receivedSuggestions.map((s: MarketRateSuggestion) => ({
          itemId: s.item_number,
          rate: s.suggested_avg,
        }));
        onApplyAIRates(rates);
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

          {/* Analysis Progress */}
          {(isLoading || suggestions.length > 0) && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Analysis Progress</span>
                <Badge variant={analyzedItemsCount === totalItemsCount ? "default" : "secondary"}>
                  تم تحليل {analyzedItemsCount} من {totalItemsCount} بند
                </Badge>
              </div>
              <Progress value={analysisProgress} className="h-2" />
              {analyzedItemsCount < totalItemsCount && suggestions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Some items could not be analyzed. This may be due to unclear descriptions.
                </p>
              )}
            </div>
          )}

          {/* Location selector and analyze button */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Location:</span>
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
                {onApplyAIRates && suggestions.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      const rates = suggestions.map(s => ({
                        itemId: s.item_number,
                        rate: s.suggested_avg,
                      }));
                      onApplyAIRates(rates);
                      toast({
                        title: "تم تطبيق الأسعار",
                        description: `تم تحديث ${rates.length} بند بمتوسط أسعار السوق`,
                      });
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
