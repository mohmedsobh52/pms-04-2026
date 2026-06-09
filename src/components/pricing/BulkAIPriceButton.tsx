import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  description: string;
  unit?: string | null;
  category?: string | null;
  unit_price?: number | null;
}

interface MatchOut {
  itemId: string;
  unitPrice: number | null;
  confidence: number;
  reason: string;
  source: string | null;
  sourceLabel: string | null;
}

interface Props {
  items: Item[];
  isArabic?: boolean;
  /** Apply suggested prices: receives map of itemId → unitPrice */
  onApply: (updates: Record<string, number>) => Promise<void> | void;
}

export function BulkAIPriceButton({ items, isArabic, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<MatchOut[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);

  const unpriced = items.filter(i => !i.unit_price || Number(i.unit_price) <= 0);

  const run = async () => {
    setBusy(true);
    setMatches([]);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-price-from-history", {
        body: {
          items: unpriced.map(i => ({
            id: i.id,
            description: i.description,
            unit: i.unit || undefined,
            category: i.category || undefined,
          })),
          isArabic,
        },
      });
      if (error) throw error;
      const arr = (data?.matches || []) as MatchOut[];
      setMatches(arr);
      const initial: Record<string, boolean> = {};
      arr.forEach(m => {
        if (m.unitPrice && m.confidence >= 60) initial[m.itemId] = true;
      });
      setPicked(initial);
      toast.success(
        isArabic ? `تم العثور على ${arr.filter(m => m.unitPrice).length} مطابقة` : `${arr.filter(m => m.unitPrice).length} matches found`
      );
    } catch (e: any) {
      toast.error(e?.message || "AI pricing failed");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      const updates: Record<string, number> = {};
      matches.forEach(m => {
        if (picked[m.itemId] && m.unitPrice) updates[m.itemId] = m.unitPrice;
      });
      await onApply(updates);
      toast.success(isArabic ? `تم تطبيق ${Object.keys(updates).length} سعر` : `${Object.keys(updates).length} prices applied`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const itemById = new Map(items.map(i => [i.id, i]));

  return (
    <>
      <Button onClick={run} disabled={busy || unpriced.length === 0} variant="default" size="sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Sparkles className="h-4 w-4 me-1" />}
        {isArabic ? `تسعير AI لـ ${unpriced.length} بند` : `AI Price ${unpriced.length} items`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isArabic ? "اقتراحات التسعير بالذكاء الاصطناعي" : "AI Pricing Suggestions"}
            </DialogTitle>
            <DialogDescription>
              {isArabic
                ? "مأخوذة من بياناتك التاريخية وعروض الأسعار. تم اختيار الاقتراحات بثقة ≥60% تلقائياً."
                : "Drawn from your historical data and analyzed quotations. Suggestions with ≥60% confidence are pre-selected."}
            </DialogDescription>
          </DialogHeader>

          {busy ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              {isArabic ? "جاري التحليل..." : "Analyzing..."}
            </div>
          ) : matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{isArabic ? "لا توجد نتائج" : "No results"}</p>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                    <TableHead>{isArabic ? "السعر المقترح" : "Suggested"}</TableHead>
                    <TableHead>{isArabic ? "الثقة" : "Confidence"}</TableHead>
                    <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map(m => {
                    const item = itemById.get(m.itemId);
                    const conf = Math.round(m.confidence);
                    const confColor = conf >= 80 ? "default" : conf >= 60 ? "secondary" : "outline";
                    return (
                      <TableRow key={m.itemId} className={picked[m.itemId] ? "bg-primary/5" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            disabled={!m.unitPrice}
                            checked={!!picked[m.itemId]}
                            onChange={e => setPicked(p => ({ ...p, [m.itemId]: e.target.checked }))}
                          />
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate" title={item?.description}>
                          {item?.description}
                        </TableCell>
                        <TableCell className="font-bold">
                          {m.unitPrice ? m.unitPrice.toLocaleString() : <span className="text-muted-foreground text-xs">{isArabic ? "لا يوجد" : "—"}</span>}
                        </TableCell>
                        <TableCell>
                          {m.unitPrice ? <Badge variant={confColor as any}>{conf}%</Badge> : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={m.sourceLabel || ""}>
                          {m.sourceLabel || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <div className="flex justify-between items-center pt-3 border-t">
            <span className="text-sm text-muted-foreground">
              {isArabic ? `${Object.values(picked).filter(Boolean).length} محدد` : `${Object.values(picked).filter(Boolean).length} selected`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={apply} disabled={applying || Object.values(picked).every(v => !v)}>
                {applying ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <CheckCircle2 className="h-4 w-4 me-1" />}
                {isArabic ? "تطبيق" : "Apply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
