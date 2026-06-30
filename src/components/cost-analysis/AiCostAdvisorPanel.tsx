import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
}

export interface AiSuggestion {
  itemId: string;
  category: "productivity" | "rent" | "waste" | "scope" | "risk" | "other";
  severity: "low" | "medium" | "high";
  title: string;
  rationale: string;
  suggestedProductivity?: number | null;
  suggestedRent?: number | null;
  estimatedSavingPct?: number | null;
}

type Decision = "pending" | "approved" | "rejected";

interface Stored {
  id: string;
  s: AiSuggestion;
  decision: Decision;
  decidedAt?: string;
  decidedBy?: string;
}

interface Props {
  items: Item[];
  currency: string;
  wastePct: number;
  adminPct: number;
  onApply: (
    itemId: string,
    patch: { dailyProductivity?: number; dailyRent?: number },
  ) => void;
  storageKey?: string;
}

const DEFAULT_KEY = "cost_ai_suggestions_v1";

const SEVERITY_STYLE: Record<AiSuggestion["severity"], string> = {
  high: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const CAT_LABEL: Record<AiSuggestion["category"], string> = {
  productivity: "إنتاجية",
  rent: "إيجار",
  waste: "هالك",
  scope: "نطاق",
  risk: "مخاطرة",
  other: "أخرى",
};

function makeId(s: AiSuggestion) {
  return `${s.itemId}::${s.category}::${s.title}`;
}

export function AiCostAdvisorPanel({
  items,
  currency,
  wastePct,
  adminPct,
  onApply,
  storageKey = DEFAULT_KEY,
}: Props) {
  const [stored, setStored] = useState<Stored[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {}
  }, [stored, storageKey]);

  const persist = (next: Stored[]) => setStored(next);

  const fetchSuggestions = async () => {
    if (items.length === 0) {
      toast.error("لا توجد بنود لتحليلها");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cost-optimizer-ai", {
        body: { items, currency, wastePct, adminPct, language: "ar" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const list: AiSuggestion[] = data?.suggestions ?? [];
      if (list.length === 0) {
        toast.info("لم تُرجع المهمة أي اقتراحات");
        return;
      }
      // Merge: preserve existing decisions for same id
      const existingMap = new Map(stored.map((s) => [s.id, s]));
      const merged: Stored[] = list.map((s) => {
        const id = makeId(s);
        const prev = existingMap.get(id);
        return prev ? { ...prev, s } : { id, s, decision: "pending" as Decision };
      });
      // Keep prior decisions on items no longer suggested
      const newIds = new Set(merged.map((m) => m.id));
      const kept = stored.filter((s) => s.decision !== "pending" && !newIds.has(s.id));
      persist([...merged, ...kept]);
      toast.success(`تم استلام ${list.length} اقتراح من الذكاء الاصطناعي`);
    } catch (e) {
      console.error(e);
      toast.error("فشل توليد الاقتراحات");
    } finally {
      setLoading(false);
    }
  };

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const setDecision = (id: string, decision: Decision) => {
    persist(
      stored.map((s) =>
        s.id === id
          ? { ...s, decision, decidedAt: new Date().toISOString() }
          : s,
      ),
    );
  };

  const applyAndApprove = (st: Stored) => {
    const patch: { dailyProductivity?: number; dailyRent?: number } = {};
    if (typeof st.s.suggestedProductivity === "number")
      patch.dailyProductivity = st.s.suggestedProductivity;
    if (typeof st.s.suggestedRent === "number") patch.dailyRent = st.s.suggestedRent;
    if (Object.keys(patch).length === 0) {
      toast.message("هذا الاقتراح لا يحتوي على قيم رقمية للتطبيق");
      setDecision(st.id, "approved");
      return;
    }
    onApply(st.s.itemId, patch);
    setDecision(st.id, "approved");
    toast.success("تم التطبيق والموافقة");
  };

  const pending = stored.filter((s) => s.decision === "pending");
  const approved = stored.filter((s) => s.decision === "approved");
  const rejected = stored.filter((s) => s.decision === "rejected");

  const renderRow = (st: Stored, allowActions = true) => {
    const item = itemMap.get(st.s.itemId);
    return (
      <div
        key={st.id}
        className="p-3 rounded-md border border-border bg-card hover:bg-muted/30 transition"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${SEVERITY_STYLE[st.s.severity]}`}>
                {st.s.severity === "high" ? "عالي" : st.s.severity === "medium" ? "متوسط" : "منخفض"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {CAT_LABEL[st.s.category]}
              </Badge>
              {typeof st.s.estimatedSavingPct === "number" && st.s.estimatedSavingPct > 0 && (
                <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                  توفير ~{st.s.estimatedSavingPct.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium mt-1 truncate">{st.s.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {st.s.rationale}
            </p>
            {item && (
              <p className="text-[11px] text-muted-foreground mt-1">
                البند: <span className="font-medium text-foreground">{item.name}</span> ·
                تكلفة حالية:{" "}
                <span className="font-mono">
                  {item.costPerUnit.toFixed(2)} {currency}
                </span>
              </p>
            )}
            {(st.s.suggestedProductivity != null || st.s.suggestedRent != null) && (
              <div className="flex gap-2 mt-1 text-[11px]">
                {st.s.suggestedProductivity != null && (
                  <span className="font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    إنتاجية → {st.s.suggestedProductivity}
                  </span>
                )}
                {st.s.suggestedRent != null && (
                  <span className="font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    إيجار → {st.s.suggestedRent}
                  </span>
                )}
              </div>
            )}
          </div>
          {allowActions && (
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => applyAndApprove(st)}
              >
                <Check className="w-3 h-3 ml-1" />
                موافقة وتطبيق
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive"
                onClick={() => setDecision(st.id, "rejected")}
              >
                <X className="w-3 h-3 ml-1" />
                رفض
              </Button>
            </div>
          )}
          {!allowActions && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setDecision(st.id, "pending")}
            >
              <ChevronRight className="w-3 h-3 ml-1" />
              إرجاع
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            مستشار التكاليف الذكي
            <Badge variant="outline" className="text-[10px] gap-1">
              <ShieldCheck className="w-3 h-3" />
              يتطلب الموافقة
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={fetchSuggestions} disabled={loading} className="h-8">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 ml-1" />
            )}
            توليد اقتراحات
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-3">
            <TabsTrigger value="pending" className="text-xs">
              قيد المراجعة ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              موافقة ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              مرفوضة ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ScrollArea className="max-h-[400px] pr-2">
              {pending.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا توجد اقتراحات قيد المراجعة. اضغط "توليد اقتراحات" للبدء.
                </p>
              ) : (
                <div className="space-y-2">{pending.map((s) => renderRow(s, true))}</div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="approved">
            <ScrollArea className="max-h-[400px] pr-2">
              {approved.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا توجد اقتراحات معتمدة بعد.
                </p>
              ) : (
                <div className="space-y-2">{approved.map((s) => renderRow(s, false))}</div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rejected">
            <ScrollArea className="max-h-[400px] pr-2">
              {rejected.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا توجد اقتراحات مرفوضة.
                </p>
              ) : (
                <div className="space-y-2">{rejected.map((s) => renderRow(s, false))}</div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
