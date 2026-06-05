import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Loader2,
  History,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProjectItem } from "./types";

interface PriceFromHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProjectItem[];
  onApplyPricing: (
    pricedItems: { id: string; price: number; source: string }[],
  ) => Promise<void>;
  isArabic: boolean;
  currency: string;
}

interface Match {
  itemId: string;
  candidateId: string | null;
  unitPrice: number | null;
  confidence: number;
  reason: string;
  source: "historical" | "quotation" | null;
  sourceLabel: string | null;
  sourceFileId: string | null;
}

type SourceFilter = "all" | "historical" | "quotation";

export function PriceFromHistoryDialog({
  isOpen,
  onClose,
  items,
  onApplyPricing,
  isArabic,
  currency,
}: PriceFromHistoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [candidatesCount, setCandidatesCount] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState<number[]>([80]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unpricedItems = useMemo(
    () =>
      items.filter(
        (it) =>
          !it.is_section &&
          (it.unit_price == null || Number(it.unit_price) === 0),
      ),
    [items],
  );

  const itemMap = useMemo(
    () => new Map(items.map((it) => [it.id, it])),
    [items],
  );

  const visibleMatches = useMemo(() => {
    return matches
      .filter((m) => m.candidateId !== null && m.unitPrice != null)
      .filter((m) => m.confidence >= minConfidence[0])
      .filter((m) =>
        sourceFilter === "all" ? true : m.source === sourceFilter,
      )
      .sort((a, b) => b.confidence - a.confidence);
  }, [matches, minConfidence, sourceFilter]);

  const unmatchedCount = useMemo(
    () =>
      matches.filter(
        (m) => m.candidateId === null || (m.unitPrice == null),
      ).length,
    [matches],
  );

  const runSearch = async () => {
    if (unpricedItems.length === 0) {
      toast.info(
        isArabic
          ? "لا توجد بنود بدون تسعير"
          : "No unpriced items to match",
      );
      return;
    }
    setIsLoading(true);
    setMatches([]);
    setSelectedIds(new Set());
    try {
      const payload = {
        isArabic,
        items: unpricedItems.map((it) => ({
          id: it.id,
          description: it.description || it.description_ar || "",
          unit: it.unit,
          category: it.category,
        })),
      };
      const { data, error } = await supabase.functions.invoke(
        "ai-price-from-history",
        { body: payload },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const ms: Match[] = data?.matches || [];
      setMatches(ms);
      setCandidatesCount(data?.candidatesCount ?? 0);
      // Auto-select high confidence
      setSelectedIds(
        new Set(
          ms
            .filter(
              (m) =>
                m.candidateId !== null &&
                m.unitPrice != null &&
                m.confidence >= 90,
            )
            .map((m) => m.itemId),
        ),
      );
      if (data?.message === "no_candidates") {
        toast.warning(
          isArabic
            ? "لا توجد بيانات تاريخية أو عروض أسعار محللة بعد"
            : "No historical data or analyzed quotations yet",
        );
      } else {
        toast.success(
          isArabic
            ? `تم تحليل ${ms.length} بند مقابل ${data?.candidatesCount ?? 0} مرجع`
            : `Analyzed ${ms.length} items against ${data?.candidatesCount ?? 0} references`,
        );
      }
    } catch (e: any) {
      console.error(e);
      toast.error(
        isArabic
          ? "فشل البحث: " + (e?.message || "")
          : "Search failed: " + (e?.message || ""),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === visibleMatches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleMatches.map((m) => m.itemId)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = async () => {
    const selected = visibleMatches.filter((m) => selectedIds.has(m.itemId));
    if (selected.length === 0) return;
    setIsApplying(true);
    try {
      await onApplyPricing(
        selected.map((m) => ({
          id: m.itemId,
          price: Number(m.unitPrice),
          source: `${m.source === "historical" ? "history" : "quotation"}:${m.sourceLabel || ""}`,
        })),
      );
      toast.success(
        isArabic
          ? `تم تطبيق التسعير على ${selected.length} بند`
          : `Applied pricing to ${selected.length} items`,
      );
      onClose();
    } catch (e: any) {
      toast.error(
        isArabic
          ? "فشل التطبيق: " + (e?.message || "")
          : "Apply failed: " + (e?.message || ""),
      );
    } finally {
      setIsApplying(false);
    }
  };

  const confidenceColor = (c: number) => {
    if (c >= 90) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (c >= 75) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] flex flex-col"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isArabic
              ? "تسعير AI من البيانات التاريخية وعروض الأسعار"
              : "AI Pricing from History & Quotations"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "يبحث الذكاء الاصطناعي عن كل بند داخل مشاريعك السابقة وعروض الموردين المحللة، ويقترح السعر مع مصدره ودرجة الثقة."
              : "AI searches your prior priced projects and analyzed supplier quotations to suggest a price per item with source + confidence."}
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 border rounded-lg p-3 bg-muted/30">
          <Button
            onClick={runSearch}
            disabled={isLoading || unpricedItems.length === 0}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isArabic
              ? `بحث (${unpricedItems.length} بند بدون سعر)`
              : `Search (${unpricedItems.length} unpriced)`}
          </Button>

          <div className="flex items-center gap-2 min-w-[220px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isArabic ? "حد الثقة" : "Min confidence"}: {minConfidence[0]}%
            </span>
            <Slider
              value={minConfidence}
              onValueChange={setMinConfidence}
              min={0}
              max={100}
              step={5}
              className="w-32"
            />
          </div>

          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as SourceFilter)}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isArabic ? "كل المصادر" : "All sources"}
              </SelectItem>
              <SelectItem value="historical">
                {isArabic ? "تاريخي فقط" : "Historical only"}
              </SelectItem>
              <SelectItem value="quotation">
                {isArabic ? "عروض فقط" : "Quotations only"}
              </SelectItem>
            </SelectContent>
          </Select>

          {candidatesCount !== null && (
            <Badge variant="secondary" className="ms-auto">
              {isArabic
                ? `${candidatesCount} مرجع سعري`
                : `${candidatesCount} reference rows`}
            </Badge>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 border rounded-lg">
          {matches.length === 0 && !isLoading && (
            <div className="p-12 text-center text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>
                {isArabic
                  ? "اضغط 'بحث' لبدء التسعير الذكي"
                  : "Click 'Search' to start AI matching"}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
              <p>
                {isArabic
                  ? "جاري البحث في البيانات التاريخية والعروض..."
                  : "Searching history & quotations..."}
              </p>
            </div>
          )}

          {!isLoading && matches.length > 0 && (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        visibleMatches.length > 0 &&
                        selectedIds.size === visibleMatches.length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                  <TableHead className="text-end">
                    {isArabic ? "السعر المقترح" : "Suggested"}
                  </TableHead>
                  <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
                  <TableHead className="text-center">
                    {isArabic ? "الثقة" : "Confidence"}
                  </TableHead>
                  <TableHead>{isArabic ? "السبب" : "Reason"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleMatches.map((m) => {
                  const it = itemMap.get(m.itemId);
                  const isSel = selectedIds.has(m.itemId);
                  return (
                    <TableRow
                      key={m.itemId}
                      className={isSel ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={() => toggleOne(m.itemId)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="font-medium text-xs">
                          {it?.item_number}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {it?.description || it?.description_ar}
                        </div>
                      </TableCell>
                      <TableCell className="text-end font-semibold tabular-nums">
                        {Number(m.unitPrice).toLocaleString()} {currency}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs"
                        >
                          {m.source === "historical" ? (
                            <History className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          <span className="truncate max-w-[160px]">
                            {m.sourceLabel}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={confidenceColor(m.confidence)}
                        >
                          {m.confidence}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                        <div className="truncate" title={m.reason}>
                          {m.reason}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visibleMatches.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {isArabic
                        ? "لا توجد نتائج بمستوى الثقة الحالي"
                        : "No results at current confidence level"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Footer summary */}
        {matches.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {isArabic ? "متطابق" : "Matched"}:{" "}
              {matches.length - unmatchedCount}
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              {isArabic ? "بدون مطابقة" : "Unmatched"}: {unmatchedCount}
            </span>
            <span>
              {isArabic ? "محدد" : "Selected"}: {selectedIds.size}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            {isArabic ? "إغلاق" : "Close"}
          </Button>
          <Button
            onClick={apply}
            disabled={
              isApplying || selectedIds.size === 0 || visibleMatches.length === 0
            }
            className="gap-2"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isArabic
              ? `تطبيق على ${selectedIds.size} بند`
              : `Apply to ${selectedIds.size} items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
