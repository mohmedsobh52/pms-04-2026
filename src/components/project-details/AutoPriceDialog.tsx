import { useState, useMemo, memo, useEffect, useCallback } from "react";
import {
  Sparkles, Info, AlertTriangle, CheckCircle, Loader2, Wand2,
  History, Download, FileText, RotateCw, X, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { ProjectItem } from "./types";
import { PriceFromHistoryDialog } from "./PriceFromHistoryDialog";

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

interface AIOverride {
  price: number;
  confidence: number;
  source: string;
  sourceName: string;
  reason?: string;
}

interface AuditEntry {
  timestamp: string;
  itemId: string;
  itemNumber: string;
  description: string;
  oldPrice: number;
  oldConfidence: number;
  oldSourceName: string;
  newPrice: number;
  newConfidence: number;
  newSourceName: string;
  source: string;
  reason: string;
  status: "pending" | "applied" | "discarded";
}

interface AICandidate {
  id: string;
  name: string;
  name_ar?: string | null;
  unit?: string | null;
  category?: string | null;
  price: number;
  source: "library" | "labor" | "equipment";
}

interface PendingChunk {
  items: { id: string; description: string; unit: string | null; category: string | null }[];
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
  const [aiAutoAccept, setAiAutoAccept] = useState([90]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState({ done: 0, total: 0 });
  const [aiOverrides, setAiOverrides] = useState<Record<string, AIOverride>>({});
  const [pendingAi, setPendingAi] = useState<Record<string, AIOverride & { oldPrice: number; oldConfidence: number; oldSourceName: string }>>({});
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [pendingChunks, setPendingChunks] = useState<PendingChunk[]>([]);
  const [candidatePool, setCandidatePool] = useState<AICandidate[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

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

  const tokenize = (s: string): string[] =>
    normalizeText(s).split(/[\s,،.\-_/\\()\[\]{}:;|]+/).filter(w => w.length >= 2);

  const jaccardScore = (a: string, b: string): number => {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    A.forEach(t => { if (B.has(t)) inter++; });
    const union = A.size + B.size - inter;
    return union > 0 ? Math.round((inter / union) * 100) : 0;
  };

  const unpricedItems = useMemo(
    () => items.filter(item => !item.unit_price || item.unit_price === 0),
    [items]
  );

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
    const itemNums = extractNumbers(itemDesc);
    const candNums = extractNumbers(candidateText);
    if (itemNums.length && candNums.length) {
      const shared = itemNums.filter(n => candNums.includes(n)).length;
      const ratio = shared / Math.max(itemNums.length, candNums.length);
      score += Math.round(ratio * 15);
      if (shared === 0) score -= 15;
    }
    if (itemUnit && candidateUnit && normalizeText(itemUnit) === normalizeText(candidateUnit)) score += 10;
    else if (itemUnit && candidateUnit) score -= 5;
    if (itemCategory && candidateCategory && normalizeText(itemCategory) === normalizeText(candidateCategory)) score += 8;
    return Math.max(0, Math.min(score, 99));
  }

  // Base local suggestions (no AI overrides yet)
  const baseSuggestions = useMemo((): PricingResult[] => {
    const results: PricingResult[] = [];
    for (const item of unpricedItems) {
      const description = item.description || "";
      let best: { price: number; confidence: number; source: string; sourceName: string } | null = null;

      for (const m of materials) {
        const text = `${m.name} ${m.name_ar || ""} ${m.category || ""}`;
        const c = calculateSimilarity(description, text, item.unit, m.unit, item.category, m.category);
        if (!best || c > best.confidence) best = { price: m.unit_price, confidence: c, source: "library", sourceName: m.name };
      }
      if (!best) {
        const mm = findMatchingPrice(description, item.category || undefined);
        if (mm) {
          const c = calculateSimilarity(description, `${mm.name} ${mm.name_ar || ""}`, item.unit, mm.unit);
          best = { price: mm.unit_price, confidence: c, source: "library", sourceName: mm.name };
        }
      }
      for (const labor of laborRates) {
        const text = `${labor.name} ${labor.name_ar || ""} ${labor.category || ""}`;
        const c = calculateSimilarity(description, text, item.unit, labor.unit);
        if (!best || c > best.confidence) best = { price: labor.unit_rate, confidence: c, source: "labor", sourceName: labor.name };
      }
      for (const eq of equipmentRates) {
        const text = `${eq.name} ${eq.name_ar || ""} ${eq.category || ""}`;
        const c = calculateSimilarity(description, text, item.unit, eq.unit);
        if (!best || c > best.confidence) best = { price: eq.rental_rate, confidence: c, source: "equipment", sourceName: eq.name };
      }

      results.push({
        itemId: item.id,
        itemNumber: item.item_number,
        description: description.slice(0, 80) + (description.length > 80 ? "..." : ""),
        suggestedPrice: best?.price || 0,
        confidence: best?.confidence || 0,
        source: best?.source || "",
        sourceName: best?.sourceName || "",
        hasMatch: !!best && best.confidence > 0,
      });
    }
    return results;
  }, [unpricedItems, materials, laborRates, equipmentRates, findMatchingPrice]);

  // Final suggestions = base + applied AI overrides
  const allSuggestions = useMemo((): PricingResult[] => {
    return baseSuggestions
      .map(r => {
        const ai = aiOverrides[r.itemId];
        if (ai && (!r.hasMatch || ai.confidence > r.confidence)) {
          return {
            ...r,
            suggestedPrice: ai.price,
            confidence: ai.confidence,
            source: ai.source,
            sourceName: ai.sourceName,
            hasMatch: true,
          };
        }
        return r;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }, [baseSuggestions, aiOverrides]);

  const aboveThreshold = useMemo(
    () => allSuggestions.filter(r => r.hasMatch && r.confidence >= confidenceThreshold[0]),
    [allSuggestions, confidenceThreshold]
  );

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

  // --- AI Enhancement with retry + resume ---

  const buildCandidatePool = useCallback((): AICandidate[] => [
    ...materials.map(m => ({
      id: `lib:${m.id}`, name: m.name, name_ar: m.name_ar, unit: m.unit,
      category: m.category, price: m.unit_price, source: "library" as const,
    })),
    ...laborRates.map(l => ({
      id: `lab:${l.id}`, name: l.name, name_ar: l.name_ar, unit: l.unit,
      category: l.category, price: l.unit_rate, source: "labor" as const,
    })),
    ...equipmentRates.map(e => ({
      id: `eq:${e.id}`, name: e.name, name_ar: e.name_ar, unit: e.unit,
      category: e.category, price: e.rental_rate, source: "equipment" as const,
    })),
  ], [materials, laborRates, equipmentRates]);

  const invokeChunkWithRetry = async (
    chunk: PendingChunk,
    candidates: AICandidate[],
    maxRetries = 3,
  ): Promise<any[]> => {
    let attempt = 0;
    let lastErr: any = null;
    while (attempt <= maxRetries) {
      try {
        const { data, error } = await supabase.functions.invoke("ai-auto-price", {
          body: { items: chunk.items, candidates, isArabic },
        });
        if (error) {
          // Extract status from FunctionsHttpError if possible
          const status = (error as any)?.context?.response?.status || 0;
          if (status === 429 || (status >= 500 && status <= 599)) {
            throw Object.assign(new Error(error.message), { retryable: true, status });
          }
          throw error;
        }
        return data?.matches || [];
      } catch (e: any) {
        lastErr = e;
        const retryable = e?.retryable ||
          /429|rate|timeout|fetch|network|503|502|504/i.test(e?.message || "");
        if (!retryable || attempt === maxRetries) throw e;
        const delay = Math.min(8000, 1000 * Math.pow(2, attempt));
        await new Promise(r => setTimeout(r, delay));
        attempt++;
      }
    }
    throw lastErr;
  };

  const processChunks = async (chunks: PendingChunk[], candidates: AICandidate[], startDone: number) => {
    const total = startDone + chunks.length;
    setEnhanceProgress({ done: startDone, total });
    const candMap = new Map(candidates.map(c => [c.id, c]));
    const newPending: typeof pendingAi = {};
    const newLog: AuditEntry[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const matches = await invokeChunkWithRetry(chunk, candidates);
        for (const m of matches) {
          if (!m?.candidateId || (m.confidence ?? 0) <= 0) continue;
          const c = candMap.get(m.candidateId);
          if (!c) continue;
          const base = baseSuggestions.find(b => b.itemId === m.itemId);
          const newConfidence = Math.min(99, Math.round(m.confidence));
          const entry = {
            price: c.price,
            confidence: newConfidence,
            source: c.source,
            sourceName: c.name,
            reason: m.reason || "",
            oldPrice: base?.suggestedPrice || 0,
            oldConfidence: base?.confidence || 0,
            oldSourceName: base?.sourceName || "",
          };
          newPending[m.itemId] = entry;
          newLog.push({
            timestamp: new Date().toISOString(),
            itemId: m.itemId,
            itemNumber: base?.itemNumber || "",
            description: base?.description || "",
            oldPrice: entry.oldPrice,
            oldConfidence: entry.oldConfidence,
            oldSourceName: entry.oldSourceName,
            newPrice: entry.price,
            newConfidence: entry.confidence,
            newSourceName: entry.sourceName,
            source: entry.source,
            reason: entry.reason,
            status: "pending",
          });
        }
        setEnhanceProgress(p => ({ ...p, done: p.done + 1 }));
      } catch (e: any) {
        // Save remaining chunks for resume
        const remaining = chunks.slice(i);
        setPendingChunks(remaining);
        setCandidatePool(candidates);
        const msg = e?.message || (isArabic ? "خطأ غير معروف" : "Unknown error");
        setLastError(msg);
        if (Object.keys(newPending).length > 0) {
          setPendingAi(prev => ({ ...prev, ...newPending }));
          setAuditLog(prev => [...prev, ...newLog]);
        }
        toast.error(
          isArabic
            ? `توقفت العملية: ${msg}. اضغط "متابعة" لاستئنافها (${remaining.length} دفعة متبقية)`
            : `Stopped: ${msg}. Click "Resume" to continue (${remaining.length} batches left)`,
          { duration: 8000 }
        );
        return;
      }
    }

    // All done
    setPendingChunks([]);
    setLastError(null);
    if (Object.keys(newPending).length > 0) {
      setPendingAi(prev => ({ ...prev, ...newPending }));
      setAuditLog(prev => [...prev, ...newLog]);
      toast.success(
        isArabic
          ? `جاهز للمراجعة: ${Object.keys(newPending).length} اقتراح من الذكاء الاصطناعي`
          : `Ready for review: ${Object.keys(newPending).length} AI suggestions`
      );
    } else {
      toast.info(isArabic ? "لم يتم إيجاد تحسينات إضافية" : "No additional improvements found");
    }
  };

  const handleEnhanceWithAI = async () => {
    // Target items with weak or no matches (excluding already-pending)
    const targets = allSuggestions.filter(
      r => (!r.hasMatch || r.confidence < 85) && !pendingAi[r.itemId]
    );
    if (targets.length === 0) {
      toast.info(isArabic ? "كل البنود لديها مطابقة قوية بالفعل" : "All items already have strong matches");
      return;
    }
    const candidates = buildCandidatePool();
    if (candidates.length === 0) {
      toast.error(isArabic ? "لا توجد عناصر في مكتبة الأسعار" : "Price library is empty");
      return;
    }
    const targetItems = unpricedItems.filter(it => targets.some(t => t.itemId === it.id));
    const CHUNK_SIZE = 25;
    const chunks: PendingChunk[] = [];
    for (let i = 0; i < targetItems.length; i += CHUNK_SIZE) {
      chunks.push({
        items: targetItems.slice(i, i + CHUNK_SIZE).map(it => ({
          id: it.id, description: it.description || "",
          unit: it.unit, category: it.category,
        })),
      });
    }

    setLastError(null);
    setCandidatePool(candidates);
    setIsEnhancing(true);
    try {
      await processChunks(chunks, candidates, 0);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleResume = async () => {
    if (pendingChunks.length === 0) return;
    setIsEnhancing(true);
    setLastError(null);
    try {
      const startDone = enhanceProgress.total - pendingChunks.length;
      await processChunks(pendingChunks, candidatePool, startDone);
    } finally {
      setIsEnhancing(false);
    }
  };

  // --- AI preview actions ---

  const applyAIPreview = () => {
    const merged: Record<string, AIOverride> = { ...aiOverrides };
    for (const [id, p] of Object.entries(pendingAi)) {
      merged[id] = { price: p.price, confidence: p.confidence, source: p.source, sourceName: p.sourceName, reason: p.reason };
    }
    setAiOverrides(merged);
    setAuditLog(prev => prev.map(e =>
      pendingAi[e.itemId] && e.status === "pending" ? { ...e, status: "applied" } : e
    ));
    setPendingAi({});
    toast.success(isArabic ? "تم اعتماد اقتراحات الذكاء الاصطناعي" : "AI suggestions applied");
  };

  const discardAIPreview = () => {
    setAuditLog(prev => prev.map(e =>
      pendingAi[e.itemId] && e.status === "pending" ? { ...e, status: "discarded" } : e
    ));
    setPendingAi({});
    toast.info(isArabic ? "تم تجاهل اقتراحات الذكاء الاصطناعي" : "AI suggestions discarded");
  };

  // --- AI auto-accept counts ---
  const aiAutoCounts = useMemo(() => {
    const entries = Object.entries(pendingAi);
    const accept = entries.filter(([, v]) => v.confidence >= aiAutoAccept[0]).length;
    return { accept, manual: entries.length - accept, total: entries.length };
  }, [pendingAi, aiAutoAccept]);

  const acceptOnlyAboveThreshold = () => {
    const merged: Record<string, AIOverride> = { ...aiOverrides };
    const accepted: string[] = [];
    const kept: Record<string, typeof pendingAi[string]> = {};
    for (const [id, p] of Object.entries(pendingAi)) {
      if (p.confidence >= aiAutoAccept[0]) {
        merged[id] = { price: p.price, confidence: p.confidence, source: p.source, sourceName: p.sourceName, reason: p.reason };
        accepted.push(id);
      } else {
        kept[id] = p;
      }
    }
    setAiOverrides(merged);
    setAuditLog(prev => prev.map(e =>
      accepted.includes(e.itemId) && e.status === "pending" ? { ...e, status: "applied" } : e
    ));
    setPendingAi(kept);
    toast.success(
      isArabic
        ? `تم اعتماد ${accepted.length} بند بثقة ≥${aiAutoAccept[0]}% (${Object.keys(kept).length} متبقي للمراجعة)`
        : `Auto-accepted ${accepted.length} items at ≥${aiAutoAccept[0]}% (${Object.keys(kept).length} left for review)`
    );
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

  // --- Exports ---

  const buildExportRows = () => allSuggestions.map(r => {
    const log = [...auditLog].reverse().find(l => l.itemId === r.itemId);
    return {
      itemNumber: r.itemNumber,
      description: r.description,
      sourceName: r.sourceName || "-",
      source: r.source || "-",
      price: r.suggestedPrice,
      confidence: r.confidence,
      reason: log?.reason || "",
      status: pendingAi[r.itemId] ? "pending" : (aiOverrides[r.itemId] ? "ai-applied" : "local"),
    };
  });

  const exportCSV = () => {
    const rows = buildExportRows();
    const header = ["Item No", "Description", "Match", "Source", `Price (${currency})`, "Confidence %", "Status", "AI Reason"];
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "\uFEFF" + [header, ...rows.map(r => [
      r.itemNumber, r.description, r.sourceName, r.source, r.price, r.confidence, r.status, r.reason
    ])].map(row => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auto-pricing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isArabic ? "تم تصدير CSV" : "CSV exported");
  };

  const exportPDF = () => {
    const rows = buildExportRows();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(isArabic ? "Auto Pricing Report" : "Auto Pricing Report", 14, 14);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString(), 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [["Item", "Description", "Match", "Source", `Price (${currency})`, "Conf %", "Status", "AI Reason"]],
      body: rows.map(r => [
        r.itemNumber, r.description, r.sourceName, r.source,
        r.price.toLocaleString(), `${r.confidence}%`, r.status, r.reason.slice(0, 60),
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [34, 94, 70] },
      columnStyles: { 1: { cellWidth: 60 }, 2: { cellWidth: 45 }, 7: { cellWidth: 55 } },
    });
    doc.save(`auto-pricing-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(isArabic ? "تم تصدير PDF" : "PDF exported");
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
      default: return "—";
    }
  };

  const noMatchCount = allSuggestions.filter(r => !r.hasMatch).length;
  const pendingCount = Object.keys(pendingAi).length;
  const hasResume = pendingChunks.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
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

        <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-4 py-4">
          {/* Threshold slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {isArabic ? "الحد الأدنى للثقة (لاختيار البنود تلقائياً)" : "Minimum Confidence (auto-select)"}
              </label>
              <Badge variant="outline" className="text-lg font-bold">{confidenceThreshold[0]}%</Badge>
            </div>
            <Slider value={confidenceThreshold} onValueChange={setConfidenceThreshold} min={30} max={99} step={1} />
          </div>

          {/* AI Enhance progress */}
          {isEnhancing && (
            <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>
                  {isArabic
                    ? `جارٍ التحسين بالذكاء الاصطناعي... (${enhanceProgress.done}/${enhanceProgress.total} دفعة)`
                    : `Enhancing with AI... (${enhanceProgress.done}/${enhanceProgress.total} batches)`}
                </span>
              </div>
              <Progress value={enhanceProgress.total ? (enhanceProgress.done / enhanceProgress.total) * 100 : 0} />
            </div>
          )}

          {/* Resume banner */}
          {hasResume && !isEnhancing && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {isArabic ? `العملية متوقفة (${pendingChunks.length} دفعة متبقية)` : `Paused (${pendingChunks.length} batches left)`}
                  </p>
                  {lastError && <p className="text-xs text-muted-foreground mt-0.5">{lastError}</p>}
                </div>
              </div>
              <Button size="sm" onClick={handleResume} className="gap-2">
                <RotateCw className="w-4 h-4" />
                {isArabic ? "متابعة" : "Resume"}
              </Button>
            </div>
          )}

          {/* AI Preview panel */}
          {pendingCount > 0 && (
            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  {isArabic
                    ? `معاينة اقتراحات الذكاء الاصطناعي (${pendingCount})`
                    : `AI Suggestions Preview (${pendingCount})`}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {isArabic ? "لم تُطبَّق بعد" : "Not applied yet"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isArabic ? "حد الاعتماد التلقائي للذكاء الاصطناعي" : "AI auto-accept threshold"}
                  </span>
                  <Badge variant="outline" className="font-bold">{aiAutoAccept[0]}%</Badge>
                </div>
                <Slider value={aiAutoAccept} onValueChange={setAiAutoAccept} min={50} max={99} step={1} />
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 font-medium">
                    {isArabic ? `سيُقبَل: ${aiAutoCounts.accept}` : `Will accept: ${aiAutoCounts.accept}`}
                  </span>
                  <span className="text-amber-600 font-medium">
                    {isArabic ? `للمراجعة اليدوية: ${aiAutoCounts.manual}` : `For manual review: ${aiAutoCounts.manual}`}
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[180px] rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{isArabic ? "البند" : "Item"}</TableHead>
                      <TableHead className="text-xs">{isArabic ? "السعر القديم" : "Old"}</TableHead>
                      <TableHead className="text-xs">{isArabic ? "السعر الجديد" : "New"}</TableHead>
                      <TableHead className="text-xs">{isArabic ? "الفرق" : "Δ"}</TableHead>
                      <TableHead className="text-xs">{isArabic ? "الثقة" : "Conf"}</TableHead>
                      <TableHead className="text-xs">{isArabic ? "السبب" : "Reason"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(pendingAi).map(([id, p]) => {
                      const base = baseSuggestions.find(b => b.itemId === id);
                      const diff = p.price - p.oldPrice;
                      return (
                        <TableRow key={id}>
                          <TableCell className="text-xs font-mono">{base?.itemNumber}</TableCell>
                          <TableCell className="text-xs">
                            {p.oldPrice > 0 ? p.oldPrice.toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{p.price.toLocaleString()}</TableCell>
                          <TableCell className={`text-xs font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                            {p.oldPrice > 0 ? (diff > 0 ? "+" : "") + diff.toLocaleString() : "+new"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getConfidenceColor(p.confidence)}`}>{p.confidence}%</Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate" title={p.reason}>
                            {p.reason || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={discardAIPreview} className="gap-1">
                  <X className="w-3.5 h-3.5" />
                  {isArabic ? "تجاهل الكل" : "Discard all"}
                </Button>
                <Button size="sm" variant="outline" onClick={acceptOnlyAboveThreshold} className="gap-1" disabled={aiAutoCounts.accept === 0}>
                  <Check className="w-3.5 h-3.5" />
                  {isArabic ? `اعتماد المؤكَّد (${aiAutoCounts.accept})` : `Accept high-conf (${aiAutoCounts.accept})`}
                </Button>
                <Button size="sm" onClick={applyAIPreview} className="gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isArabic ? `اعتماد الكل (${pendingCount})` : `Apply all (${pendingCount})`}
                </Button>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <ul className="space-y-1 text-sm text-muted-foreground flex-1">
                <li>• {isArabic ? "اقتراحات الذكاء الاصطناعي تظهر في معاينة قبل التطبيق" : "AI suggestions appear in preview before applying"}</li>
                <li>• {isArabic ? "في حال 429/5xx تتم إعادة المحاولة تلقائياً مع زر متابعة" : "On 429/5xx errors, auto-retries with a Resume button"}</li>
                <li>• {isArabic ? "كل تغيير يُسجَّل في سجل قابل للمراجعة والتصدير" : "Every change is recorded in an audit log"}</li>
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{unpricedItems.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "غير مسعرة" : "Unpriced"}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <p className="text-2xl font-bold text-green-600">{aboveThreshold.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "فوق الحد" : "Above Threshold"}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">{allSuggestions.filter(r => r.hasMatch).length - aboveThreshold.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "اقتراحات ضعيفة" : "Weak Suggestions"}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{noMatchCount}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "بدون مطابقة" : "No Match"}</p>
            </div>
          </div>

          {/* Audit log */}
          {auditLog.length > 0 && (
            <div className="rounded-lg border">
              <button
                onClick={() => setShowAudit(s => !s)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium flex items-center gap-2 text-sm">
                  <History className="w-4 h-4" />
                  {isArabic ? `سجل تغييرات الذكاء الاصطناعي (${auditLog.length})` : `AI Audit Log (${auditLog.length})`}
                </span>
                <span className="text-xs text-muted-foreground">{showAudit ? "▲" : "▼"}</span>
              </button>
              {showAudit && (
                <ScrollArea className="h-[220px] border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{isArabic ? "الوقت" : "Time"}</TableHead>
                        <TableHead className="text-xs">{isArabic ? "البند" : "Item"}</TableHead>
                        <TableHead className="text-xs">{isArabic ? "قبل" : "Before"}</TableHead>
                        <TableHead className="text-xs">{isArabic ? "بعد" : "After"}</TableHead>
                        <TableHead className="text-xs">{isArabic ? "الثقة" : "Conf"}</TableHead>
                        <TableHead className="text-xs">{isArabic ? "السبب" : "Reason"}</TableHead>
                        <TableHead className="text-xs">{isArabic ? "الحالة" : "Status"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...auditLog].reverse().map((e, idx) => (
                        <TableRow key={`${e.itemId}-${idx}`}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(e.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{e.itemNumber}</TableCell>
                          <TableCell className="text-xs">
                            {e.oldPrice > 0 ? `${e.oldPrice.toLocaleString()} (${e.oldConfidence}%)` : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {e.newPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${getConfidenceColor(e.newConfidence)}`}>{e.newConfidence}%</Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[260px] truncate" title={e.reason}>
                            {e.reason || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              e.status === "applied" ? "default" :
                              e.status === "discarded" ? "secondary" : "outline"
                            } className="text-xs">
                              {e.status === "applied" ? (isArabic ? "مطبّق" : "applied") :
                               e.status === "discarded" ? (isArabic ? "مُتجاهل" : "discarded") :
                               (isArabic ? "معلَّق" : "pending")}
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

          {/* Preview table */}
          {isPreviewMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {isArabic ? "كل الاقتراحات" : "All Suggestions"}
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost"
                    onClick={() => setSelectedIds(new Set(allSuggestions.filter(r => r.hasMatch).map(r => r.itemId)))}>
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
                            {result.sourceName || "—"}
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
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between border-t pt-3">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={handleEnhanceWithAI}
              disabled={isEnhancing || unpricedItems.length === 0}
              className="gap-2"
            >
              {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isArabic ? "تحسين بالذكاء الاصطناعي" : "Enhance with AI"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={allSuggestions.length === 0}>
                  <Download className="w-4 h-4" />
                  {isArabic ? "تصدير" : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportCSV} className="gap-2">
                  <FileText className="w-4 h-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPDF} className="gap-2">
                  <FileText className="w-4 h-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-2">
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
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isArabic ? `تطبيق (${selectedIds.size} بند)` : `Apply (${selectedIds.size} items)`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AutoPriceDialog = memo(AutoPriceDialogComponent);
AutoPriceDialog.displayName = "AutoPriceDialog";

export { AutoPriceDialog };
