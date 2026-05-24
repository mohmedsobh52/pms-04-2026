import { useEffect, useState } from "react";
import { Loader2, Languages, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectItem } from "./types";

export type TranslatableField = "description" | "notes" | "category";

interface PreviewRow {
  itemId: string;
  itemNumber: string;
  field: TranslatableField;
  original: string;
  translated: string;
  cached: boolean;
  selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ProjectItem[];
  fields: TranslatableField[];
  isArabic: boolean;
  onSaved: (updated: Array<{ id: string; translations: any }>) => void;
}

function detectTarget(text: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(text || "") ? "en" : "ar";
}

const fieldLabel = (f: TranslatableField, isArabic: boolean) => {
  const map: Record<TranslatableField, { ar: string; en: string }> = {
    description: { ar: "الوصف", en: "Description" },
    notes: { ar: "ملاحظات", en: "Notes" },
    category: { ar: "الفئة", en: "Category" },
  };
  return isArabic ? map[f].ar : map[f].en;
};

export function TranslationPreviewDialog({
  open,
  onOpenChange,
  items,
  fields,
  isArabic,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Build list of (item, field) pairs that have text
        const pairs: Array<{ item: ProjectItem; field: TranslatableField; text: string }> = [];
        for (const it of items) {
          for (const f of fields) {
            const raw = ((it as any)[f] || "").toString().trim();
            if (raw) pairs.push({ item: it, field: f, text: raw });
          }
        }

        // Use cached translation when available; otherwise mark for fetch
        const needsFetch: Array<{
          id: string;
          fields: Record<string, string>;
          targetLanguage: "ar" | "en";
          pairs: typeof pairs;
        }> = [];

        const draftRows: PreviewRow[] = [];

        // Group per item for batch call (one target lang per item dominated by description language)
        const byItem = new Map<string, typeof pairs>();
        for (const p of pairs) {
          if (!byItem.has(p.item.id)) byItem.set(p.item.id, []);
          byItem.get(p.item.id)!.push(p);
        }

        for (const [itemId, itemPairs] of byItem) {
          const sample = itemPairs[0];
          const target = detectTarget(sample.text);
          const fieldsToFetch: Record<string, string> = {};

          for (const p of itemPairs) {
            const cached = p.item.translations?.[p.field]?.[target];
            if (cached) {
              draftRows.push({
                itemId,
                itemNumber: p.item.item_number,
                field: p.field,
                original: p.text,
                translated: cached,
                cached: true,
                selected: true,
              });
            } else {
              fieldsToFetch[p.field] = p.text;
              // placeholder until fetch
              draftRows.push({
                itemId,
                itemNumber: p.item.item_number,
                field: p.field,
                original: p.text,
                translated: "",
                cached: false,
                selected: true,
              });
            }
          }

          if (Object.keys(fieldsToFetch).length > 0) {
            needsFetch.push({
              id: itemId,
              fields: fieldsToFetch,
              targetLanguage: target,
              pairs: itemPairs,
            });
          }
        }

        if (!cancelled) setRows(draftRows);

        // Group fetches by target language for batch calls
        const byTarget = new Map<"ar" | "en", typeof needsFetch>();
        for (const n of needsFetch) {
          if (!byTarget.has(n.targetLanguage)) byTarget.set(n.targetLanguage, []);
          byTarget.get(n.targetLanguage)!.push(n);
        }

        for (const [target, group] of byTarget) {
          const { data, error } = await supabase.functions.invoke("translate-item-description", {
            body: {
              targetLanguage: target,
              items: group.map((g) => ({ id: g.id, fields: g.fields })),
            },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          const results: Array<{ id: string; fields: Record<string, string> }> = data?.results || [];
          if (cancelled) return;

          setRows((prev) =>
            prev.map((r) => {
              const match = results.find((x) => x.id === r.itemId);
              if (!match) return r;
              const t = match.fields?.[r.field];
              if (!t || r.translated) return r;
              return { ...r, translated: t };
            }),
          );
        }
      } catch (e: any) {
        toast({
          title: isArabic ? "تعذرت الترجمة" : "Translation failed",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const toUpdate = new Map<string, any>();
      // Get current item translations for merge
      const itemMap = new Map(items.map((i) => [i.id, i]));

      for (const r of rows) {
        if (!r.selected || !r.translated) continue;
        const target = detectTarget(r.original);
        const existing = toUpdate.get(r.itemId) || { ...(itemMap.get(r.itemId)?.translations || {}) };
        existing[r.field] = { ...(existing[r.field] || {}), [target]: r.translated };
        toUpdate.set(r.itemId, existing);
      }

      const updates: Array<{ id: string; translations: any }> = [];
      for (const [id, translations] of toUpdate) {
        const { error } = await supabase
          .from("project_items")
          .update({ translations })
          .eq("id", id);
        if (error) throw error;
        updates.push({ id, translations });
      }

      onSaved(updates);
      toast({
        title: isArabic ? "تم حفظ الترجمات" : "Translations saved",
        description: isArabic ? `تم تحديث ${updates.length} بند` : `Updated ${updates.length} item(s)`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: isArabic ? "تعذر الحفظ" : "Save failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleRow = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));
  };

  const updateTranslated = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, translated: value } : r)));
  };

  const selectedCount = rows.filter((r) => r.selected && r.translated).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            {isArabic ? "معاينة الترجمة" : "Translation Preview"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "راجع الترجمات قبل الحفظ. يمكنك التعديل أو إلغاء التحديد."
              : "Review translations before saving. You can edit or deselect any row."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {isArabic ? "جاري الترجمة..." : "Translating..."}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {isArabic ? "لا توجد نصوص قابلة للترجمة" : "Nothing to translate"}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {rows.map((r, idx) => (
                <div
                  key={`${r.itemId}-${r.field}`}
                  className="rounded-lg border border-border p-3 space-y-2 bg-card"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Checkbox checked={r.selected} onCheckedChange={() => toggleRow(idx)} />
                    <span className="font-mono bg-muted px-2 py-0.5 rounded">{r.itemNumber}</span>
                    <span className="font-medium">{fieldLabel(r.field, isArabic)}</span>
                    {r.cached && (
                      <span className="ml-auto inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                        {isArabic ? "من الذاكرة" : "Cached"}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">
                        {isArabic ? "النص الأصلي" : "Original"}
                      </div>
                      <div className="text-sm whitespace-pre-wrap p-2 rounded bg-muted/50 min-h-[60px]">
                        {r.original}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">
                        {isArabic ? "الترجمة" : "Translation"}
                      </div>
                      {r.translated ? (
                        <Textarea
                          value={r.translated}
                          onChange={(e) => updateTranslated(idx, e.target.value)}
                          className="text-sm min-h-[60px]"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 min-h-[60px]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isArabic ? "جاري..." : "Translating..."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedCount === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isArabic
              ? `حفظ (${selectedCount})`
              : `Save ${selectedCount} translation${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
