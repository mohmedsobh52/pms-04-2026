import { useState, useMemo, memo } from "react";
import { Sparkles, Info, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMaterialPrices, MaterialPrice } from "@/hooks/useMaterialPrices";
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
}

function AutoPriceDialogComponent({
  isOpen,
  onClose,
  items,
  onApplyPricing,
  isArabic,
  currency,
}: AutoPriceDialogProps) {
  const [confidenceThreshold, setConfidenceThreshold] = useState([95]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { materials, findMatchingPrice } = useMaterialPrices();
  const { laborRates } = useLaborRates();
  const { equipmentRates } = useEquipmentRates();

  // ===== Text normalization (Arabic + English) =====
  const normalizeText = (s: string): string => {
    if (!s) return "";
    return s
      .toLowerCase()
      // Remove Arabic diacritics (tashkeel)
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
      // Unify alef forms
      .replace(/[\u0622\u0623\u0625]/g, "\u0627")
      // Unify yaa
      .replace(/\u0649/g, "\u064A")
      // Taa marbuta -> haa
      .replace(/\u0629/g, "\u0647")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim();
  };

  const tokenize = (s: string): string[] => {
    return normalizeText(s)
      .split(/[\s,،.\-_/\\()\[\]{}:;|]+/)
      .filter(w => w.length >= 3);
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

  // Get unpriced items
  const unpricedItems = useMemo(() => {
    return items.filter(item => !item.unit_price || item.unit_price === 0);
  }, [items]);

  // Calculate confidence: combines exact substring, Jaccard, unit & category bonuses
  function calculateConfidence(
    itemDesc: string,
    candidateName: string,
    candidateNameAr?: string | null,
    itemUnit?: string | null,
    candidateUnit?: string | null,
    itemCategory?: string | null,
    candidateCategory?: string | null,
  ): number {
    const desc = normalizeText(itemDesc);
    const name = normalizeText(candidateName);
    const nameAr = normalizeText(candidateNameAr || "");

    let score = 0;

    // Strong exact-substring match (the candidate name is fully present)
    if (name && (desc.includes(name) || name.includes(desc))) score += 80;
    if (nameAr && (desc.includes(nameAr) || nameAr.includes(desc))) score += 80;

    // Jaccard token overlap (0-100) weighted at 0.6
    const j = Math.max(jaccardScore(itemDesc, candidateName), jaccardScore(itemDesc, candidateNameAr || ""));
    score += Math.round(j * 0.6);

    // Unit exact match bonus
    if (itemUnit && candidateUnit && normalizeText(itemUnit) === normalizeText(candidateUnit)) {
      score += 10;
    }
    // Category match bonus
    if (itemCategory && candidateCategory && normalizeText(itemCategory) === normalizeText(candidateCategory)) {
      score += 10;
    }

    return Math.min(score, 99);
  }

  function calculateTextSimilarity(
    itemDesc: string,
    candidateText: string,
    itemUnit?: string | null,
    candidateUnit?: string | null,
  ): number {
    let score = 0;
    const desc = normalizeText(itemDesc);
    const cand = normalizeText(candidateText);
    if (cand && (desc.includes(cand) || cand.includes(desc))) score += 70;
    score += Math.round(jaccardScore(itemDesc, candidateText) * 0.6);
    if (itemUnit && candidateUnit && normalizeText(itemUnit) === normalizeText(candidateUnit)) score += 10;
    return Math.min(score, 99);
  }

  // Calculate pricing suggestions with confidence scores
  const pricingResults = useMemo((): PricingResult[] => {
    const results: PricingResult[] = [];
    const minThreshold = confidenceThreshold[0];

    for (const item of unpricedItems) {
      const description = item.description || "";

      let bestMatch: { price: number; confidence: number; source: string; sourceName: string } | null = null;

      // 1. Check material_prices
      const materialMatch = findMatchingPrice(description, item.category || undefined);
      if (materialMatch) {
        const confidence = calculateConfidence(
          description,
          materialMatch.name,
          materialMatch.name_ar,
          item.unit,
          materialMatch.unit,
          item.category,
          materialMatch.category,
        );
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            price: materialMatch.unit_price,
            confidence,
            source: "library",
            sourceName: materialMatch.name,
          };
        }
      }

      // 2. Check labor_rates
      for (const labor of laborRates) {
        const laborText = `${labor.name} ${labor.name_ar || ""} ${labor.category || ""}`;
        const confidence = calculateTextSimilarity(description, laborText, item.unit, labor.unit);
        if (confidence >= 50 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            price: labor.unit_rate,
            confidence,
            source: "labor",
            sourceName: labor.name,
          };
        }
      }

      // 3. Check equipment_rates
      for (const equipment of equipmentRates) {
        const equipText = `${equipment.name} ${equipment.name_ar || ""} ${equipment.category || ""}`;
        const confidence = calculateTextSimilarity(description, equipText, item.unit, equipment.unit);
        if (confidence >= 50 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            price: equipment.rental_rate,
            confidence,
            source: "equipment",
            sourceName: equipment.name,
          };
        }
      }

      if (bestMatch && bestMatch.confidence >= minThreshold) {
        results.push({
          itemId: item.id,
          itemNumber: item.item_number,
          description: description.slice(0, 80) + (description.length > 80 ? "..." : ""),
          suggestedPrice: bestMatch.price,
          confidence: bestMatch.confidence,
          source: bestMatch.source,
          sourceName: bestMatch.sourceName,
        });
      }
    }

    return results;
  }, [unpricedItems, materials, laborRates, equipmentRates, findMatchingPrice, confidenceThreshold]);

  const handleApply = async () => {
    if (pricingResults.length === 0) return;
    
    setIsApplying(true);
    try {
      const pricedItems = pricingResults.map(r => ({
        id: r.itemId,
        price: r.suggestedPrice,
        source: r.source,
      }));
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
      default: return source;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-3xl max-h-[80vh] overflow-hidden"
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
          {/* Confidence Threshold Slider */}
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
              max={90}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30%</span>
              <span>50%</span>
              <span>70%</span>
              <span>90%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? "البنود ذات الثقة الأعلى من هذا الحد سيتم تسعيرها"
                : "Items with confidence above this threshold will be priced"
              }
            </p>
          </div>

          {/* What will happen info */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-2">
                  {isArabic ? "ما الذي سيحدث:" : "What will happen:"}
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {isArabic ? "مطابقة أوصاف البنود مع مكتبة الأسعار" : "Match item descriptions with price library"}</li>
                  <li>• {isArabic ? "تطبيق أسعار السوق المحلي" : "Apply local market prices"}</li>
                  <li>• {isArabic ? "حساب الإجمالي لكل بند" : "Calculate total for each item"}</li>
                  <li>• {isArabic ? "البنود المسعرة مسبقاً لن تتأثر" : "Already priced items won't be affected"}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{unpricedItems.length}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "بنود غير مسعرة" : "Unpriced Items"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-600">{pricingResults.length}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "بنود يمكن تسعيرها" : "Can Be Priced"}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{unpricedItems.length - pricingResults.length}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "بنود بدون مطابقة" : "No Match Found"}
              </p>
            </div>
          </div>

          {/* Preview Mode */}
          {isPreviewMode && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {isArabic ? "معاينة النتائج" : "Preview Results"}
              </h4>
              {pricingResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p>{isArabic ? "لم يتم العثور على تطابقات" : "No matches found"}</p>
                  <p className="text-xs mt-1">
                    {isArabic 
                      ? "جرب تقليل الحد الأدنى للثقة أو أضف أسعار للمكتبة"
                      : "Try lowering the confidence threshold or add prices to library"
                    }
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[200px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isArabic ? "رقم البند" : "Item No."}</TableHead>
                        <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                        <TableHead>{isArabic ? "السعر" : "Price"}</TableHead>
                        <TableHead>{isArabic ? "الثقة" : "Confidence"}</TableHead>
                        <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingResults.map((result) => (
                        <TableRow key={result.itemId}>
                          <TableCell className="font-mono text-xs">{result.itemNumber}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={result.description}>
                            {result.description}
                          </TableCell>
                          <TableCell className="font-medium">
                            {currency} {result.suggestedPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getConfidenceColor(result.confidence)}>
                              {result.confidence}%
                            </Badge>
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
              disabled={pricingResults.length === 0 || isApplying}
              className="gap-2"
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isArabic ? `تطبيق (${pricingResults.length} بند)` : `Apply (${pricingResults.length} items)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Wrap with memo to prevent React ref warnings with Radix UI Dialog
const AutoPriceDialog = memo(AutoPriceDialogComponent);
AutoPriceDialog.displayName = "AutoPriceDialog";

export { AutoPriceDialog };
