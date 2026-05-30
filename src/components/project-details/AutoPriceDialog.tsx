import { useState, useMemo, memo, useEffect } from "react";
import { Sparkles, Info, AlertTriangle, CheckCircle, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { ProjectItem } from "./types";

interface AutoPriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProjectItem[];
  onApplyPricing: (pricedItems: { id: string; price: number; source: string }[]) => Promise<void>;
  isArabic: boolean;
  currency: string;
}

interface PricingResult {
  itemId: string;
  itemNumber: string;
  description: string;
  suggestedPrice: number;
  confidence: number;
  source: string;
  sourceName: string;
  hasMatch: boolean;
}

function AutoPriceDialogComponent({
  isOpen,
  onClose,
  items,
  onApplyPricing,
  isArabic,
  currency,
}: AutoPriceDialogProps) {
  const [confidenceThreshold, setConfidenceThreshold] = useState([60]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEnhancing, setIsEnhancing] = useState(false);
  // Map of itemId -> AI-graded override { price, confidence, source, sourceName }
  const [aiOverrides, setAiOverrides] = useState<Record<string, { price: number; confidence: number; source: string; sourceName: string }>>({});

  const { materials, findMatchingPrice } = useMaterialPrices();
  const { laborRates } = useLaborRates();
  const { equipmentRates } = useEquipmentRates();

  const normalizeText = (s: string): string => {
    if (!s) return "";
    return s
      .toLowerCase()
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      .replace(/[\u0622\u0623\u0625]/g, "\u0627")
      .replace(/\u0649/g, "\u064A")
      .replace(/\u0629/g, "\u0647")
      .replace(/\s+/g, " ")
      .trim();
  };

  const tokenize = (s: string): string[] => {
    return normalizeText(s)
      .split(/[\s,،.\-_/\\()\[\]{}:;|]+/)
      .filter(w => w.length >= 2);
  };

  const jaccardScore = (a: string, b: string): number => {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    A.forEach(t => { if (B.has(t)) inter++; });
    const union = A.size + B.size - inter;
    return union > 0 ? Math.round((inter / union) * 100) : 0;
  };

  const unpricedItems = useMemo(() => {
    return items.filter(item => !item.unit_price || item.unit_price === 0);
  }, [items]);

  // Extract numeric/dimensional tokens like "20", "150mm", "3/4", "M20"
  const extractNumbers = (s: string): string[] => {
    const out = (s.match(/\d+(?:[.,/]\d+)?(?:\s?(?:mm|cm|m|kg|in|"|'|m2|m3))?/gi) || [])
      .map(t => t.toLowerCase().replace(/\s+/g, ""));
    return Array.from(new Set(out));
  };

  function calculateSimilarity(
    itemDesc: string,
    candidateText: string,
    itemUnit?: string | null,
    candidateUnit?: string | null,
    itemCategory?: string | null,
    candidateCategory?: string | null,
  ): number {
    const desc = normalizeText(itemDesc);
    const cand = normalizeText(candidateText);
    let score = 0;
    if (cand && desc) {
      if (desc.includes(cand) || cand.includes(desc)) score += 60;
      const candToks = tokenize(candidateText);
      const matched = candToks.filter(t => desc.includes(t)).length;
      if (candToks.length > 0) score += Math.round((matched / candToks.length) * 25);
    }
    score += Math.round(jaccardScore(itemDesc, candidateText) * 0.5);
    // Dimension/number matching is a strong signal
    const itemNums = extractNumbers(itemDesc);
    const candNums = extractNumbers(candidateText);
    if (itemNums.length && candNums.length) {
      const shared = itemNums.filter(n => candNums.includes(n)).length;
      const ratio = shared / Math.max(itemNums.length, candNums.length);
      score += Math.round(ratio * 15);
      // Penalize when both sides have numbers but none overlap (likely wrong size)
      if (shared === 0) score -= 15;
    }
    if (itemUnit && candidateUnit && normalizeText(itemUnit) === normalizeText(candidateUnit)) score += 10;
    else if (itemUnit && candidateUnit) score -= 5;
    if (itemCategory && candidateCategory && normalizeText(itemCategory) === normalizeText(candidateCategory)) score += 8;
    return Math.max(0, Math.min(score, 99));
  }

  // Compute best match per unpriced item (regardless of threshold)
  const allSuggestions = useMemo((): PricingResult[] => {
    const results: PricingResult[] = [];

    for (const item of unpricedItems) {
      const description = item.description || "";
      let bestMatch: { price: number; confidence: number; source: string; sourceName: string } | null = null;

      // 1. material library — scan all (not just best) to get a real confidence score
      for (const m of materials) {
        const text = `${m.name} ${m.name_ar || ""} ${m.category || ""}`;
        const c = calculateSimilarity(description, text, item.unit, m.unit, item.category, m.category);
        if (!bestMatch || c > bestMatch.confidence) {
          bestMatch = { price: m.unit_price, confidence: c, source: "library", sourceName: m.name };
        }
      }
      // fallback to findMatchingPrice if no materials in list
      if (!bestMatch) {
        const mm = findMatchingPrice(description, item.category || undefined);
        if (mm) {
          const c = calculateSimilarity(description, `${mm.name} ${mm.name_ar || ""}`, item.unit, mm.unit);
          bestMatch = { price: mm.unit_price, confidence: c, source: "library", sourceName: mm.name };
        }
      }

      // 2. labor
      for (const labor of laborRates) {
        const text = `${labor.name} ${labor.name_ar || ""} ${labor.category || ""}`;
        const c = calculateSimilarity(description, text, item.unit, labor.unit);
        if (!bestMatch || c > bestMatch.confidence) {
          bestMatch = { price: labor.unit_rate, confidence: c, source: "labor", sourceName: labor.name };
        }
      }

      // 3. equipment
      for (const eq of equipmentRates) {
        const text = `${eq.name} ${eq.name_ar || ""} ${eq.category || ""}`;
        const c = calculateSimilarity(description, text, item.unit, eq.unit);
        if (!bestMatch || c > bestMatch.confidence) {
          bestMatch = { price: eq.rental_rate, confidence: c, source: "equipment", sourceName: eq.name };
        }
      }

      results.push({
        itemId: item.id,
        itemNumber: item.item_number,
        description: description.slice(0, 80) + (description.length > 80 ? "..." : ""),
        suggestedPrice: bestMatch?.price || 0,
        confidence: bestMatch?.confidence || 0,
        source: bestMatch?.source || "",
        sourceName: bestMatch?.sourceName || "",
        hasMatch: !!bestMatch && bestMatch.confidence > 0,
      });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }, [unpricedItems, materials, laborRates, equipmentRates, findMatchingPrice]);

  const aboveThreshold = useMemo(
    () => allSuggestions.filter(r => r.hasMatch && r.confidence >= confidenceThreshold[0]),
    [allSuggestions, confidenceThreshold]
  );

  // Auto-select items above threshold whenever it changes
  useEffect(() => {
    setSelectedIds(new Set(aboveThreshold.map(r => r.itemId)));
  }, [aboveThreshold]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setIsApplying(true);
    try {
      const pricedItems = allSuggestions
        .filter(r => selectedIds.has(r.itemId) && r.hasMatch)
        .map(r => ({ id: r.itemId, price: r.suggestedPrice, source: r.source }));
      await onApplyPricing(pricedItems);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 bg-green-500/10";
    if (confidence >= 60) return "text-blue-600 bg-blue-500/10";
    if (confidence >= 40) return "text-amber-600 bg-amber-500/10";
    return "text-red-600 bg-red-500/10";
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "library": return isArabic ? "مكتبة الأسعار" : "Price Library";
      case "labor": return isArabic ? "أجور العمالة" : "Labor Rates";
      case "equipment": return isArabic ? "معدات" : "Equipment";
      default: return isArabic ? "—" : "—";
    }
  };

  const noMatchCount = allSuggestions.filter(r => !r.hasMatch).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic ? "التسعير التلقائي" : "Auto Pricing"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "تسعير البنود تلقائياً من مكتبة الأسعار المحلية (مواد، عمالة، معدات)"
              : "Automatically price items from local library (materials, labor, equipment)"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {isArabic ? "الحد الأدنى للثقة" : "Minimum Confidence"}
              </label>
              <Badge variant="outline" className="text-lg font-bold">
                {confidenceThreshold[0]}%
              </Badge>
            </div>
            <Slider
              value={confidenceThreshold}
              onValueChange={setConfidenceThreshold}
              min={30}
              max={99}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30%</span>
              <span>50%</span>
              <span>70%</span>
              <span>99%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isArabic
                ? "الافتراضي 60% — يتم اقتراح أفضل تطابق لكل بند، ويمكنك تحديد ما تريد تطبيقه يدوياً"
                : "Default 60% — best match per item is shown; you can manually pick which to apply"
              }
            </p>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-2">
                  {isArabic ? "ما الذي سيحدث:" : "What will happen:"}
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {isArabic ? "عرض أفضل اقتراح لكل بند مع نسبة الثقة" : "Show best suggestion per item with its confidence score"}</li>
                  <li>• {isArabic ? "تحديد البنود فوق الحد الأدنى للثقة تلقائياً" : "Auto-select items above the confidence threshold"}</li>
                  <li>• {isArabic ? "يمكنك تحديد/إلغاء أي بند يدوياً قبل التطبيق" : "You can manually check/uncheck any item before applying"}</li>
                  <li>• {isArabic ? "البنود المسعرة مسبقاً لن تتأثر" : "Already priced items won't be affected"}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{unpricedItems.length}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "غير مسعرة" : "Unpriced"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-600">{aboveThreshold.length}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "فوق الحد" : "Above Threshold"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">{allSuggestions.filter(r => r.hasMatch).length - aboveThreshold.length}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "اقتراحات ضعيفة" : "Weak Suggestions"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{noMatchCount}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "بدون مطابقة" : "No Match"}
              </p>
            </div>
          </div>

          {isPreviewMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {isArabic ? "كل الاقتراحات" : "All Suggestions"}
                </h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set(allSuggestions.filter(r => r.hasMatch).map(r => r.itemId)))}
                  >
                    {isArabic ? "تحديد الكل" : "Select All"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    {isArabic ? "إلغاء التحديد" : "Clear"}
                  </Button>
                </div>
              </div>
              {allSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p>{isArabic ? "لا توجد بنود غير مسعرة" : "No unpriced items"}</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>{isArabic ? "رقم" : "No."}</TableHead>
                        <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                        <TableHead>{isArabic ? "الاقتراح" : "Suggestion"}</TableHead>
                        <TableHead>{isArabic ? "السعر" : "Price"}</TableHead>
                        <TableHead>{isArabic ? "الثقة" : "Confidence"}</TableHead>
                        <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allSuggestions.map((result) => (
                        <TableRow key={result.itemId} className={!result.hasMatch ? "opacity-60" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(result.itemId)}
                              onCheckedChange={() => toggleSelect(result.itemId)}
                              disabled={!result.hasMatch}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{result.itemNumber}</TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate" title={result.description}>
                            {result.description}
                          </TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate" title={result.sourceName}>
                            {result.sourceName || (isArabic ? "لا يوجد" : "—")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {result.hasMatch ? `${currency} ${result.suggestedPrice.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell>
                            {result.hasMatch ? (
                              <Badge className={getConfidenceColor(result.confidence)}>
                                {result.confidence}%
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">—</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(result.source)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          {!isPreviewMode ? (
            <Button onClick={() => setIsPreviewMode(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              {isArabic ? "معاينة" : "Preview"}
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={selectedIds.size === 0 || isApplying}
              className="gap-2"
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isArabic ? `تطبيق (${selectedIds.size} بند)` : `Apply (${selectedIds.size} items)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AutoPriceDialog = memo(AutoPriceDialogComponent);
AutoPriceDialog.displayName = "AutoPriceDialog";

export { AutoPriceDialog };
