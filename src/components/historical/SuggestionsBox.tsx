import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, Trash2, Copy, Download, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  HistoricalSuggestion,
  getHistoricalSuggestions,
  removeHistoricalSuggestion,
  clearHistoricalSuggestions,
} from "@/lib/historical-suggestions";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";

export function SuggestionsBox() {
  const [list, setList] = useState<HistoricalSuggestion[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const refresh = () => setList(getHistoricalSuggestions());
    refresh();
    window.addEventListener("historical-suggestions-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("historical-suggestions-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const handleCopy = (s: HistoricalSuggestion) => {
    const text = `${s.description_ar || s.description || s.item_number} — ${s.unit_price.toLocaleString()} ${s.currency}/${s.unit}`;
    navigator.clipboard?.writeText(text);
    toast({ title: "📋 تم النسخ", description: text });
  };

  const handleExport = () => {
    if (list.length === 0) return;
    const wb = createWorkbook();
    addJsonSheet(
      wb,
      list.map((s) => ({
        المشروع: s.source_project_name,
        البند: s.item_number,
        الوصف: s.description_ar || s.description,
        الوحدة: s.unit,
        "سعر الوحدة": s.unit_price,
        العملة: s.currency,
        "أُضيف في": s.added_at,
      })),
      "الاقتراحات",
    );
    downloadWorkbook(wb, `historical_suggestions_${Date.now()}.xlsx`);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          className="fixed bottom-6 left-6 z-40 shadow-elegant gap-2 rounded-full h-12 px-5"
        >
          <Lightbulb className="w-4 h-4" />
          الاقتراحات
          {list.length > 0 && (
            <Badge variant="secondary" className="rounded-full h-5 min-w-5 px-1.5">
              {list.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[420px] sm:w-[480px]" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            صندوق الاقتراحات ({list.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={list.length === 0} className="gap-1">
            <Download className="w-3 h-3" /> تصدير
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm("مسح جميع الاقتراحات؟")) {
                clearHistoricalSuggestions();
                toast({ title: "تم المسح" });
              }
            }}
            disabled={list.length === 0}
            className="gap-1 text-destructive"
          >
            <Trash className="w-3 h-3" /> مسح الكل
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4 -mx-6 px-6">
          {list.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
              لا توجد اقتراحات بعد
              <p className="text-xs mt-2 opacity-70">
                اضغط 💡 بجانب أي بند في الجداول التاريخية لإضافته هنا
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((s) => (
                <div
                  key={s.id}
                  className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {s.source_project_name}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {s.description_ar || s.description || `بند #${s.item_number}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {s.unit || "—"}
                        </Badge>
                        <Badge variant="default" className="text-[11px] font-bold">
                          {s.unit_price.toLocaleString()} {s.currency}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(s)}
                        title="نسخ"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeHistoricalSuggestion(s.id)}
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
