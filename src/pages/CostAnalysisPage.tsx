import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Calculator, Save, Plus, Trash2, Download, FileSpreadsheet, FileText, Copy, PieChart as PieChartIcon, Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Zap, GripVertical, Edit2, ArrowRight, Upload, FileUp, RotateCcw, Link2, ArrowLeftRight, Info } from "lucide-react";
import { extractDataFromExcel } from "@/lib/excel-utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { XLSX } from '@/lib/exceljs-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ThemeToggle } from "@/components/ThemeToggle";
import { ColorLegend } from "@/components/ui/color-code";
import { useLanguage } from "@/hooks/useLanguage";
import { SmartCostEnginePanel } from "@/components/cost-engine/SmartCostEnginePanel";
import { ProjectInfoBar, type CostAnalysisMeta } from "@/components/cost-analysis/ProjectInfoBar";
import { CostKpiGrid } from "@/components/cost-analysis/CostKpiGrid";
import { CostItemsToolbar, type CostItemsFilter } from "@/components/cost-analysis/CostItemsToolbar";
import { ItemDetailsDrawer } from "@/components/cost-analysis/ItemDetailsDrawer";
import { SensitivityScenarios } from "@/components/cost-analysis/SensitivityScenarios";
import { AiCostAdvisorPanel } from "@/components/cost-analysis/AiCostAdvisorPanel";
import { CostVersionsPanel } from "@/components/cost-analysis/CostVersionsPanel";
import { AnomalyDetectorPanel } from "@/components/cost-analysis/AnomalyDetectorPanel";
import { Phase7ToolsPanel } from "@/components/cost-analysis/Phase7ToolsPanel";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import { buildAllForCostAnalysis } from "@/lib/suggestion-generators";
import { Phase8CollaborationPanel } from "@/components/cost-analysis/Phase8CollaborationPanel";
import { SystemTipsPanel } from "@/components/cost-analysis/SystemTipsPanel";
import { MarketComparisonPanel } from "@/components/cost-analysis/MarketComparisonPanel";
import { CostBulkActionsBar } from "@/components/cost-analysis/CostBulkActionsBar";
import {
  CostColumnVisibility,
  defaultColumnVisibility,
  type ColumnVisibility,
  type ColumnKey,
} from "@/components/cost-analysis/CostColumnVisibility";
import { Checkbox } from "@/components/ui/checkbox";
import { deriveTotals } from "@/lib/cost-analysis/derive-totals";
import { CostAnalysisShell } from "@/components/cost-analysis/CostAnalysisShell";
import { IntegrationsHub } from "@/components/cost-analysis/IntegrationsHub";




interface CostItem {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
  isEditable: boolean;
  aiSuggestedProductivity?: number;
  aiSuggestedRent?: number;
  isLoadingAI?: boolean;
}

interface CostTemplate {
  id: string;
  name: string;
  items: Omit<CostItem, 'id'>[];
  wastePercentage: number;
  adminPercentage: number;
  headers: HeaderConfig;
  createdAt: string;
}

interface HeaderConfig {
  workItem: string;
  productivity: string;
  aiProductivity: string;
  dailyRent: string;
  aiRent: string;
  costPerUnit: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];
const STORAGE_KEY = 'cost_analysis_data';
const TEMPLATES_KEY = 'cost_analysis_templates';
const COLUMN_WIDTHS_KEY = 'cost_analysis_column_widths';

interface ColumnWidths {
  drag: number;
  workItem: number;
  productivity: number;
  aiProductivity: number;
  dailyRent: number;
  aiRent: number;
  costPerUnit: number;
  actions: number;
}

const defaultColumnWidths: ColumnWidths = {
  drag: 44,
  workItem: 340,
  productivity: 130,
  aiProductivity: 120,
  dailyRent: 130,
  aiRent: 120,
  costPerUnit: 130,
  actions: 110,
};

// Shared storage keys for linking with main analysis
const SHARED_ITEMS_KEY = 'shared_boq_items';
const COST_ANALYSIS_EXPORT_KEY = 'cost_analysis_export';

const defaultItems: Omit<CostItem, 'id'>[] = [
  { name: "رص السيقق+الباتر+الانارة+المولد", dailyProductivity: 10, dailyRent: 100, costPerUnit: 10.00, isEditable: true },
  { name: "بوكلين", dailyProductivity: 1300, dailyRent: 150, costPerUnit: 0.12, isEditable: true },
  { name: "ترحيل (تربلا) (25% ترحيل)", dailyProductivity: 75, dailyRent: 20, costPerUnit: 0.27, isEditable: true },
  { name: "قلاب ترحيل داخلي", dailyProductivity: 600, dailyRent: 60, costPerUnit: 0.10, isEditable: true },
];

const defaultHeaders: HeaderConfig = {
  workItem: "اعمال الحفر",
  productivity: "الانتاجية (م3)",
  aiProductivity: "AI إنتاجية",
  dailyRent: "ايجار/يوم",
  aiRent: "AI إيجار",
  costPerUnit: "تكلفة/م3",
};

// Sortable Row Component
interface SortableRowProps {
  item: CostItem;
  handleItemChange: (id: string, field: keyof CostItem, value: string | number) => void;
  handleRemoveItem: (id: string) => void;
  handleCopyItem: (id: string) => void;
  handleOpenDetails?: (id: string) => void;
  analyzeWithAI: (id: string, name: string) => void;
  applyAISuggestion: (id: string, field: 'productivity' | 'rent') => void;
  calculateDifference: (manual: number, ai: number | undefined) => { value: number; type: 'up' | 'down' | 'same' } | null;
  formatNumber: (num: number) => string;
  selected?: boolean;
  onToggleSelect?: (id: string, checked: boolean) => void;
  visibility?: ColumnVisibility;
}

function SortableRow({
  item,
  handleItemChange,
  handleRemoveItem,
  handleCopyItem,
  handleOpenDetails,
  analyzeWithAI,
  applyAISuggestion,
  calculateDifference,
  formatNumber,
  selected,
  onToggleSelect,
  visibility,
}: SortableRowProps) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const v = visibility ?? defaultColumnVisibility;
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/50 ${selected ? "bg-primary/5" : ""}`}
      data-state={selected ? "selected" : undefined}
    >
      <TableCell className="flex items-center gap-1 w-[60px]">
        {onToggleSelect && (
          <Checkbox
            checked={!!selected}
            onCheckedChange={(c) => onToggleSelect(item.id, c === true)}
            aria-label="تحديد البند"
          />
        )}
        <span className="cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </span>
      </TableCell>
      {v.workItem && (
        <TableCell className="text-right font-medium">
          <Input
            value={item.name}
            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
            className="text-right h-7 text-sm border-0 bg-transparent focus:bg-background"
          />
        </TableCell>
      )}

      {v.productivity && (
        <TableCell className="text-center">
          <Input
            type="number"
            value={item.dailyProductivity || ""}
            onChange={(e) => handleItemChange(item.id, 'dailyProductivity', parseFloat(e.target.value) || 0)}
            className="text-center h-7 w-24 mx-auto text-sm tabular-nums"
            placeholder="0"
          />
        </TableCell>
      )}
      {v.aiProductivity && (
        <TableCell className="text-center">
          {item.isLoadingAI ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
          ) : item.aiSuggestedProductivity ? (
            <div className="flex flex-col items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyAISuggestion(item.id, 'productivity')}
                className="h-5 px-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700"
              >
                {item.aiSuggestedProductivity}
              </Button>
              {(() => {
                const diff = calculateDifference(item.dailyProductivity, item.aiSuggestedProductivity);
                if (!diff) return null;
                return (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 ${
                      diff.type === 'up' ? 'text-green-600 border-green-300 bg-green-50' :
                      diff.type === 'down' ? 'text-red-600 border-red-300 bg-red-50' :
                      'text-muted-foreground'
                    }`}
                  >
                    {diff.type === 'up' && <TrendingUp className="w-2 h-2 mr-0.5" />}
                    {diff.type === 'down' && <TrendingDown className="w-2 h-2 mr-0.5" />}
                    {diff.type === 'same' && <Minus className="w-2 h-2 mr-0.5" />}
                    {diff.value.toFixed(0)}%
                  </Badge>
                );
              })()}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => analyzeWithAI(item.id, item.name)}
              className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
            >
              <Sparkles className="w-3 h-3" />
            </Button>
          )}
        </TableCell>
      )}
      {v.dailyRent && (
        <TableCell className="text-center">
          <Input
            type="number"
            value={item.dailyRent || ""}
            onChange={(e) => handleItemChange(item.id, 'dailyRent', parseFloat(e.target.value) || 0)}
            className="text-center h-7 w-24 mx-auto text-sm tabular-nums"
            placeholder="0"
          />
        </TableCell>
      )}
      {v.aiRent && (
        <TableCell className="text-center">
          {item.isLoadingAI ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
          ) : item.aiSuggestedRent ? (
            <div className="flex flex-col items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyAISuggestion(item.id, 'rent')}
                className="h-5 px-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700"
              >
                {item.aiSuggestedRent}
              </Button>
              {(() => {
                const diff = calculateDifference(item.dailyRent, item.aiSuggestedRent);
                if (!diff) return null;
                return (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-4 ${
                      diff.type === 'up' ? 'text-red-600 border-red-300 bg-red-50' :
                      diff.type === 'down' ? 'text-green-600 border-green-300 bg-green-50' :
                      'text-muted-foreground'
                    }`}
                  >
                    {diff.type === 'up' && <TrendingUp className="w-2 h-2 mr-0.5" />}
                    {diff.type === 'down' && <TrendingDown className="w-2 h-2 mr-0.5" />}
                    {diff.type === 'same' && <Minus className="w-2 h-2 mr-0.5" />}
                    {diff.value.toFixed(0)}%
                  </Badge>
                );
              })()}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => analyzeWithAI(item.id, item.name)}
              className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
              disabled={item.aiSuggestedProductivity !== undefined}
            >
              <Sparkles className="w-3 h-3" />
            </Button>
          )}
        </TableCell>
      )}
      {v.costPerUnit && (
        <TableCell className="text-center">
          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 tabular-nums whitespace-nowrap">
            {formatNumber(item.costPerUnit)}
          </Badge>
        </TableCell>
      )}
      {v.actions && (
        <TableCell>
          <div className="flex gap-1">
            {handleOpenDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDetails(item.id)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                title="تفاصيل البند"
              >
                <Info className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyItem(item.id)}
              className="h-6 w-6 p-0 text-primary hover:text-primary hover:bg-primary/10"
              title="نسخ الصف"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(item.id)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="حذف الصف"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>

  );
}

export default function CostAnalysisPage() {
  const [meta, setMeta] = useState<CostAnalysisMeta | null>(null);
  const currency = meta?.currency || "ريال";
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  // Load items from localStorage or use defaults
  const [items, setItems] = useState<CostItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.items || defaultItems.map((item, index) => ({
          ...item,
          id: `item-${index}-${Date.now()}`,
        }));
      }
    } catch {}
    return defaultItems.map((item, index) => ({
      ...item,
      id: `item-${index}-${Date.now()}`,
    }));
  });

  // Sync suggestions into the global unified inbox
  const { replaceBySource } = useGlobalSuggestions();
  useEffect(() => {
    const mapped = items.map((it: any) => ({
      id: it.id,
      description_ar: it.name || it.description_ar,
      description: it.name || it.description,
      unit: it.unit,
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unitPrice ?? it.unit_price) || 0,
      total_price: Number(it.total ?? it.total_price) || 0,
      ai_rent: Number(it.aiSuggestedRent ?? it.ai_rent) || 0,
      ai_productivity: Number(it.aiSuggestedProductivity ?? it.ai_productivity) || 0,
    }));
    const drafts = buildAllForCostAnalysis(mapped, {
      hasBaseline: !!localStorage.getItem("cost-analysis-baseline"),
      lastExportAt: localStorage.getItem("cost-analysis-last-export"),
    });
    replaceBySource("cost-analysis", drafts);
  }, [items, replaceBySource]);

  const [wastePercentage, setWastePercentage] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored).wastePercentage || 5;
    } catch {}
    return 5;
  });

  const [adminPercentage, setAdminPercentage] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored).adminPercentage || 10;
    } catch {}
    return 10;
  });

  const [headers, setHeaders] = useState<HeaderConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored).headers || defaultHeaders;
    } catch {}
    return defaultHeaders;
  });

  const [newTemplateName, setNewTemplateName] = useState("");
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [editingHeaders, setEditingHeaders] = useState(false);
  
  const [savedTemplates, setSavedTemplates] = useState<CostTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const stored = localStorage.getItem(COLUMN_WIDTHS_KEY);
      return stored ? { ...defaultColumnWidths, ...JSON.parse(stored) } : defaultColumnWidths;
    } catch {
      return defaultColumnWidths;
    }
  });
  const [hasUnsavedColumnWidths, setHasUnsavedColumnWidths] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<keyof ColumnWidths | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Phase 3: Items filter (search / cost-range / AI / sort / presets)
  const [itemsFilter, setItemsFilter] = useState<CostItemsFilter>({
    query: "",
    minCost: "",
    maxCost: "",
    minProductivity: "",
    maxProductivity: "",
    minRent: "",
    maxRent: "",
    onlyAi: false,
    onlyMissing: false,
    onlyNeedsReview: false,
    onlyWithGap: false,
    hideZeroCost: false,
    sortField: "none",
    sortDir: "asc",
    preset: "all",
  });

  const visibleItems = useMemo(() => {
    const q = itemsFilter.query.trim().toLowerCase();
    const min = itemsFilter.minCost === "" ? null : parseFloat(itemsFilter.minCost);
    const max = itemsFilter.maxCost === "" ? null : parseFloat(itemsFilter.maxCost);
    const minP = itemsFilter.minProductivity ? parseFloat(itemsFilter.minProductivity) : null;
    const maxP = itemsFilter.maxProductivity ? parseFloat(itemsFilter.maxProductivity) : null;
    const minR = itemsFilter.minRent ? parseFloat(itemsFilter.minRent) : null;
    const maxR = itemsFilter.maxRent ? parseFloat(itemsFilter.maxRent) : null;

    // نحسب عتبات topCost/lowCost بناءً على 20%
    const costs = items.map((i) => i.costPerUnit).filter((c) => c > 0).sort((a, b) => a - b);
    const p20 = costs.length ? costs[Math.floor(costs.length * 0.2)] : 0;
    const p80 = costs.length ? costs[Math.floor(costs.length * 0.8)] : 0;

    const gapPct = (a: number, b?: number) =>
      b == null || a === 0 ? 0 : Math.abs((b - a) / a) * 100;

    let result = items.filter((it) => {
      if (q && !String(it.name ?? "").toLowerCase().includes(q)) return false;
      if (min != null && !Number.isNaN(min) && it.costPerUnit < min) return false;
      if (max != null && !Number.isNaN(max) && it.costPerUnit > max) return false;
      if (minP != null && !Number.isNaN(minP) && it.dailyProductivity < minP) return false;
      if (maxP != null && !Number.isNaN(maxP) && it.dailyProductivity > maxP) return false;
      if (minR != null && !Number.isNaN(minR) && it.dailyRent < minR) return false;
      if (maxR != null && !Number.isNaN(maxR) && it.dailyRent > maxR) return false;
      if (itemsFilter.onlyAi && it.aiSuggestedProductivity == null && it.aiSuggestedRent == null)
        return false;
      if (itemsFilter.hideZeroCost && it.costPerUnit === 0) return false;
      if (
        itemsFilter.onlyMissing &&
        it.costPerUnit > 0 &&
        it.dailyProductivity > 0 &&
        it.dailyRent > 0 &&
        !!it.name?.trim()
      )
        return false;
      if (
        itemsFilter.onlyNeedsReview &&
        !(it.name?.trim() && (it.costPerUnit === 0 || it.dailyProductivity === 0))
      )
        return false;
      if (
        itemsFilter.onlyWithGap &&
        Math.max(
          gapPct(it.dailyProductivity, it.aiSuggestedProductivity),
          gapPct(it.dailyRent, it.aiSuggestedRent),
        ) < 20
      )
        return false;

      // presets
      switch (itemsFilter.preset) {
        case "missing":
          if (it.costPerUnit > 0 && it.dailyProductivity > 0 && it.dailyRent > 0) return false;
          break;
        case "needsReview":
          if (!(it.name?.trim() && (it.costPerUnit === 0 || it.dailyProductivity === 0)))
            return false;
          break;
        case "withAi":
          if (it.aiSuggestedProductivity == null && it.aiSuggestedRent == null) return false;
          break;
        case "highGap":
          if (
            Math.max(
              gapPct(it.dailyProductivity, it.aiSuggestedProductivity),
              gapPct(it.dailyRent, it.aiSuggestedRent),
            ) < 20
          )
            return false;
          break;
        case "topCost":
          if (!p80 || it.costPerUnit < p80) return false;
          break;
        case "lowCost":
          if (!p20 || it.costPerUnit > p20) return false;
          break;
      }
      return true;
    });

    // ترتيب
    const sf = itemsFilter.sortField ?? "none";
    if (sf !== "none") {
      const dir = itemsFilter.sortDir === "desc" ? -1 : 1;
      result = [...result].sort((a, b) => {
        const va =
          sf === "gap"
            ? Math.max(
                gapPct(a.dailyProductivity, a.aiSuggestedProductivity),
                gapPct(a.dailyRent, a.aiSuggestedRent),
              )
            : (a as any)[sf];
        const vb =
          sf === "gap"
            ? Math.max(
                gapPct(b.dailyProductivity, b.aiSuggestedProductivity),
                gapPct(b.dailyRent, b.aiSuggestedRent),
              )
            : (b as any)[sf];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }

    return result;
  }, [items, itemsFilter]);

  const isFilterActive =
    itemsFilter.query.trim() !== "" ||
    itemsFilter.minCost !== "" ||
    itemsFilter.maxCost !== "" ||
    !!itemsFilter.minProductivity ||
    !!itemsFilter.maxProductivity ||
    !!itemsFilter.minRent ||
    !!itemsFilter.maxRent ||
    itemsFilter.onlyAi ||
    !!itemsFilter.onlyMissing ||
    !!itemsFilter.onlyNeedsReview ||
    !!itemsFilter.onlyWithGap ||
    !!itemsFilter.hideZeroCost ||
    (itemsFilter.sortField ?? "none") !== "none" ||
    (itemsFilter.preset ?? "all") !== "all";


  // Phase 4: row selection + column visibility (+ page size)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    try {
      const stored = localStorage.getItem("cost_analysis_columns_visible");
      return stored ? { ...defaultColumnVisibility, ...JSON.parse(stored) } : defaultColumnVisibility;
    } catch {
      return defaultColumnVisibility;
    }
  });
  useEffect(() => {
    localStorage.setItem("cost_analysis_columns_visible", JSON.stringify(columnVisibility));
  }, [columnVisibility]);
  const [pageSize, setPageSize] = useState<number>(() => {
    const s = Number(localStorage.getItem("cost_analysis_page_size"));
    return [25, 50, 100, 200, 500, 9999].includes(s) ? s : 9999;
  });
  useEffect(() => {
    localStorage.setItem("cost_analysis_page_size", String(pageSize));
  }, [pageSize]);

  const pagedItems = useMemo(
    () => (pageSize >= 9999 ? visibleItems : visibleItems.slice(0, pageSize)),
    [visibleItems, pageSize],
  );

  const toggleRowSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(visibleItems.map((it) => it.id)));
  }, [visibleItems]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Phase 3: Item details drawer
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);
  const detailsItem = detailsItemId ? items.find((it) => it.id === detailsItemId) ?? null : null;



  // Debug log for items changes
  useEffect(() => {
    console.log('Items updated. Current count:', items.length, 'Items:', items);
  }, [items]);

  // Auto-save to localStorage whenever items, headers, or percentages change
  useEffect(() => {
    const dataToSave = {
      items,
      wastePercentage,
      adminPercentage,
      headers,
      lastSaved: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [items, wastePercentage, adminPercentage, headers]);

  // Column resizing mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return;
      
      // RTL adjustment - reverse direction
      const diff = startX - e.clientX;
      const newWidth = Math.max(40, startWidth + diff);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
      setHasUnsavedColumnWidths(true);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth]);

  const handleColumnResizeStart = useCallback((e: React.MouseEvent, column: keyof ColumnWidths) => {
    e.preventDefault();
    setResizingColumn(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
  }, [columnWidths]);

  const saveColumnWidths = useCallback(() => {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
    setHasUnsavedColumnWidths(false);
    toast.success("تم حفظ عرض الأعمدة");
  }, [columnWidths]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths(defaultColumnWidths);
    localStorage.removeItem(COLUMN_WIDTHS_KEY);
    setHasUnsavedColumnWidths(false);
    toast.success("تم إعادة تعيين عرض الأعمدة");
  }, []);

  // Import items from main BOQ analysis
  const importFromBOQ = useCallback(() => {
    try {
      const stored = localStorage.getItem(SHARED_ITEMS_KEY);
      if (!stored) {
        toast.error("لا توجد بنود للاستيراد. يرجى تحليل ملف BOQ أولاً");
        return;
      }
      
      const boqData = JSON.parse(stored);
      if (!boqData.items || boqData.items.length === 0) {
        toast.error("لا توجد بنود في البيانات المحفوظة");
        return;
      }
      
      const newItems: CostItem[] = boqData.items.map((item: any, index: number) => ({
        id: `imported-${Date.now()}-${index}`,
        name: item.description || item.item_number || `بند ${index + 1}`,
        dailyProductivity: item.quantity || 0,
        dailyRent: item.unit_price || 0,
        costPerUnit: item.unit_price && item.quantity ? item.unit_price / item.quantity : 0,
        isEditable: true,
      }));
      
      setItems(prev => [...prev, ...newItems]);
      toast.success(`تم استيراد ${newItems.length} بند من تحليل BOQ`);
    } catch (error) {
      console.error("Import from BOQ error:", error);
      toast.error("فشل استيراد البنود");
    }
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex((item) => item.id === active.id);
        const newIndex = prevItems.findIndex((item) => item.id === over.id);
        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  }, []);

  const handleCopyItem = useCallback((id: string) => {
    setItems(prevItems => {
      const itemToCopy = prevItems.find(item => item.id === id);
      if (!itemToCopy) return prevItems;
      
      const newItem: CostItem = {
        ...itemToCopy,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${itemToCopy.name} (نسخة)`,
      };
      
      const index = prevItems.findIndex(item => item.id === id);
      const newItems = [...prevItems];
      newItems.splice(index + 1, 0, newItem);
      return newItems;
    });
    toast.success("تم نسخ البند بنجاح");
  }, []);

  const handleAddNewItem = useCallback(() => {
    const newItem: CostItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "بند جديد",
      dailyProductivity: 0,
      dailyRent: 0,
      costPerUnit: 0,
      isEditable: true,
    };
    console.log('Adding new item:', newItem);
    setItems(prevItems => {
      const updated = [...prevItems, newItem];
      console.log('Updated items count:', updated.length);
      return updated;
    });
    toast.success("تم إضافة صف جديد");
    
    // Scroll to bottom after adding
    setTimeout(() => {
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // Handle file import for cost items
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isPDF = file.name.endsWith('.pdf');

    if (!isExcel && !isPDF) {
      toast.error("يُرجى اختيار ملف Excel أو PDF");
      return;
    }

    try {
      if (isExcel) {
        const result = await extractDataFromExcel(file);
        console.log('Excel extraction result:', result);
        
        if (result.items.length > 0) {
          const newItems: CostItem[] = result.items.map((item, index) => ({
            id: `imported-${Date.now()}-${index}`,
            name: item.description || item.itemNo || `بند ${index + 1}`,
            dailyProductivity: item.quantity || 0,
            dailyRent: item.unitPrice || 0,
            costPerUnit: item.unitPrice && item.quantity ? item.unitPrice / item.quantity : 0,
            isEditable: true,
          }));

          console.log('New items to import:', newItems.length);
          setItems(prev => {
            const updated = [...prev, ...newItems];
            console.log('Total items after import:', updated.length);
            return updated;
          });
          toast.success(`تم استيراد ${newItems.length} بند من ملف Excel`);
        } else {
          toast.error("لم يتم العثور على بنود في الملف");
        }
      } else if (isPDF) {
        toast.info("جاري معالجة ملف PDF...");
        toast.error("استيراد PDF قيد التطوير، يُرجى استخدام ملف Excel");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("فشل استيراد الملف");
    }

    event.target.value = '';
  }, []);

  const calculateDifference = useCallback((manual: number, ai: number | undefined): { value: number; type: 'up' | 'down' | 'same' } | null => {
    if (!ai || ai === 0) return null;
    if (manual === 0) return { value: 100, type: 'up' };
    const diff = ((ai - manual) / manual) * 100;
    if (Math.abs(diff) < 0.1) return { value: 0, type: 'same' };
    return { value: Math.abs(diff), type: diff > 0 ? 'up' : 'down' };
  }, []);

  // Local heuristic fallback — Saudi market defaults for common excavation & site items.
  // Guarantees a non-zero suggestion even when the AI endpoint fails or returns 0.
  const getLocalSuggestion = useCallback((itemName: string): { productivity: number; rent: number; reason: string } => {
    const n = (itemName || "").toLowerCase().trim();
    const dict: Array<{ keys: string[]; productivity: number; rent: number; reason: string }> = [
      { keys: ['بوكلين', 'حفارة', 'excavator'], productivity: 1200, rent: 1500, reason: 'حفارة متوسطة — إنتاجية عالية' },
      { keys: ['شيول', 'لودر', 'loader'], productivity: 900, rent: 1200, reason: 'لودر — أعمال تحميل' },
      { keys: ['بلدوزر', 'دوزر', 'bulldozer'], productivity: 700, rent: 1400, reason: 'بلدوزر — تسوية' },
      { keys: ['قلاب', 'شاحنة', 'truck', 'دينا'], productivity: 600, rent: 800, reason: 'قلاب ترحيل داخلي' },
      { keys: ['تربلا', 'ترحيل خارجي', 'trailer'], productivity: 75, rent: 1200, reason: 'ترحيل خارجي بتربلا' },
      { keys: ['رص', 'دك', 'compactor', 'كباس'], productivity: 400, rent: 600, reason: 'دك وتسوية' },
      { keys: ['حفر يدوي', 'يدوي'], productivity: 8, rent: 250, reason: 'حفر يدوي بعمالة' },
      { keys: ['نزح', 'مضخة', 'pump'], productivity: 50, rent: 300, reason: 'نزح مياه بمضخة' },
      { keys: ['خرسانة', 'صب', 'concrete'], productivity: 60, rent: 2500, reason: 'صب خرسانة جاهزة' },
      { keys: ['حديد', 'تسليح', 'rebar', 'steel'], productivity: 1500, rent: 350, reason: 'أعمال حدادة تسليح' },
      { keys: ['شدة', 'قالب', 'formwork'], productivity: 40, rent: 220, reason: 'شدة معدنية/خشبية' },
      { keys: ['طابوق', 'بلوك', 'block'], productivity: 25, rent: 200, reason: 'بناء طابوق' },
      { keys: ['أسفلت', 'اسفلت', 'asphalt'], productivity: 800, rent: 2200, reason: 'رصف أسفلت' },
      { keys: ['بلاط', 'سيراميك', 'tile'], productivity: 30, rent: 220, reason: 'أعمال بلاط' },
      { keys: ['دهان', 'طلاء', 'paint'], productivity: 120, rent: 180, reason: 'أعمال دهان' },
      { keys: ['عزل', 'insulation'], productivity: 200, rent: 250, reason: 'أعمال عزل' },
    ];
    for (const entry of dict) {
      if (entry.keys.some((k) => n.includes(k))) return entry;
    }
    return { productivity: 100, rent: 300, reason: 'تقدير عام مبدئي — يرجى المراجعة' };
  }, []);




  const analyzeWithAI = useCallback(async (itemId: string, itemName: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, isLoadingAI: true } : item
    ));

    const applySuggestion = (prod: number, rent: number) => {
      setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          aiSuggestedProductivity: prod || 0,
          aiSuggestedRent: rent || 0,
          isLoadingAI: false,
        };
      }));
    };

    try {
      const { data, error } = await supabase.functions.invoke('analyze-costs', {
        body: { itemName, type: 'excavation_productivity' }
      });

      if (error) throw error;

      let prod = Number(data?.suggestedProductivity) || 0;
      let rent = Number(data?.suggestedRent) || 0;
      // If AI returned nothing useful, fall back to local heuristic
      if (prod <= 0 || rent <= 0) {
        const local = getLocalSuggestion(itemName);
        if (prod <= 0) prod = local.productivity;
        if (rent <= 0) rent = local.rent;
      }
      applySuggestion(prod, rent);
      toast.success("تم تحليل البند بواسطة AI");
    } catch (error) {
      console.error('AI analysis error:', error);
      // Never leave the user without a suggestion — use local heuristic
      const local = getLocalSuggestion(itemName);
      applySuggestion(local.productivity, local.rent);
      toast.message("تم استخدام تقدير محلي (تعذر الاتصال بـ AI)");
    }
  }, [getLocalSuggestion]);

  const analyzeAllWithAI = useCallback(async () => {
    setIsAnalyzingAll(true);
    const itemsToAnalyze = items.filter(item => !item.aiSuggestedProductivity && !item.aiSuggestedRent && item.name.trim());
    
    if (itemsToAnalyze.length === 0) {
      toast.info("جميع البنود تم تحليلها بالفعل");
      setIsAnalyzingAll(false);
      return;
    }

    setItems(prev => prev.map(item => 
      itemsToAnalyze.some(i => i.id === item.id) ? { ...item, isLoadingAI: true } : item
    ));

    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToAnalyze) {
      let prod = 0;
      let rent = 0;
      let usedFallback = false;
      try {
        const { data, error } = await supabase.functions.invoke('analyze-costs', {
          body: { itemName: item.name, type: 'excavation_productivity' }
        });
        if (error) throw error;
        prod = Number(data?.suggestedProductivity) || 0;
        rent = Number(data?.suggestedRent) || 0;
      } catch (error) {
        console.error(`AI analysis error for ${item.name}:`, error);
        failCount++;
      }

      if (prod <= 0 || rent <= 0) {
        const local = getLocalSuggestion(item.name);
        if (prod <= 0) prod = local.productivity;
        if (rent <= 0) rent = local.rent;
        usedFallback = true;
      }

      setItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, aiSuggestedProductivity: prod, aiSuggestedRent: rent, isLoadingAI: false }
          : i
      ));
      if (!usedFallback) successCount++;
    }

    setIsAnalyzingAll(false);
    const fallbackCount = itemsToAnalyze.length - successCount;
    if (successCount > 0 && fallbackCount === 0) {
      toast.success(`تم تحليل ${successCount} بند بواسطة AI`);
    } else if (successCount > 0) {
      toast.success(`AI: ${successCount} · تقدير محلي: ${fallbackCount}`);
    } else {
      toast.message(`تم توليد ${fallbackCount} اقتراح محلي (تعذّر الوصول لـ AI)`);
    }
  }, [items, getLocalSuggestion]);

  const applyAISuggestion = useCallback((itemId: string, field: 'productivity' | 'rent') => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const newProductivity = field === 'productivity' && item.aiSuggestedProductivity 
        ? item.aiSuggestedProductivity 
        : item.dailyProductivity;
      const newRent = field === 'rent' && item.aiSuggestedRent 
        ? item.aiSuggestedRent 
        : item.dailyRent;
      
      return {
        ...item,
        dailyProductivity: newProductivity,
        dailyRent: newRent,
        costPerUnit: newRent > 0 && newProductivity > 0 ? newRent / newProductivity : 0
      };
    }));
    toast.success("تم تطبيق اقتراح AI");
  }, []);

  const applyAllAISuggestions = useCallback(() => {
    setItems(prev => prev.map(item => {
      if (!item.aiSuggestedProductivity && !item.aiSuggestedRent) return item;
      
      const newProductivity = item.aiSuggestedProductivity || item.dailyProductivity;
      const newRent = item.aiSuggestedRent || item.dailyRent;
      
      return {
        ...item,
        dailyProductivity: newProductivity,
        dailyRent: newRent,
        costPerUnit: newRent > 0 && newProductivity > 0 ? newRent / newProductivity : 0
      };
    }));
    toast.success("تم تطبيق جميع اقتراحات AI");
  }, []);

  const calculateCostPerUnit = useCallback((dailyProductivity: number, dailyRent: number): number => {
    if (dailyProductivity <= 0 || dailyRent <= 0) return 0;
    const raw = dailyRent / dailyProductivity;
    // Preserve precision for small values (<1) — round to 4 decimals, otherwise 2
    return raw < 1 ? Math.round(raw * 10000) / 10000 : Math.round(raw * 100) / 100;
  }, []);

  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.costPerUnit, 0);
    const wasteAmount = subtotal * (wastePercentage / 100);
    const adminAmount = subtotal * (adminPercentage / 100);
    const grandTotal = subtotal + wasteAmount + adminAmount;
    
    return { subtotal, wasteAmount, adminAmount, grandTotal };
  }, [items, wastePercentage, adminPercentage]);

  // Export analysis to main BOQ (must be after calculations)
  const exportToBOQ = useCallback(() => {
    try {
      const exportData = {
        items: items.map(item => ({
          item_number: item.id,
          description: item.name,
          quantity: item.dailyProductivity,
          unit_price: item.costPerUnit,
          total_price: item.costPerUnit * item.dailyProductivity,
          unit: "م3",
          daily_rent: item.dailyRent,
          ai_suggested_productivity: item.aiSuggestedProductivity,
          ai_suggested_rent: item.aiSuggestedRent,
        })),
        summary: {
          subtotal: calculations.subtotal,
          waste_amount: calculations.wasteAmount,
          admin_amount: calculations.adminAmount,
          grand_total: calculations.grandTotal,
          waste_percentage: wastePercentage,
          admin_percentage: adminPercentage,
        },
        exported_at: new Date().toISOString(),
      };
      
      localStorage.setItem(COST_ANALYSIS_EXPORT_KEY, JSON.stringify(exportData));
      toast.success("تم تصدير التحليل. يمكنك الآن استخدامه في شاشة البنود الرئيسية");
    } catch (error) {
      console.error("Export to BOQ error:", error);
      toast.error("فشل تصدير التحليل");
    }
  }, [items, calculations, wastePercentage, adminPercentage]);

  const chartData = useMemo(() => {
    const data = items
      .filter(item => item.costPerUnit > 0)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        fullName: item.name,
        value: item.costPerUnit,
        percentage: (item.costPerUnit / calculations.subtotal * 100).toFixed(1)
      }));
    
    if (calculations.wasteAmount > 0) {
      data.push({
        name: 'نسبة هالك',
        fullName: 'نسبة هالك',
        value: calculations.wasteAmount,
        percentage: (calculations.wasteAmount / calculations.grandTotal * 100).toFixed(1)
      });
    }
    if (calculations.adminAmount > 0) {
      data.push({
        name: 'مصاريف إدارية',
        fullName: 'مصاريف إدارية',
        value: calculations.adminAmount,
        percentage: (calculations.adminAmount / calculations.grandTotal * 100).toFixed(1)
      });
    }
    
    return data;
  }, [items, calculations]);

  const handleItemChange = useCallback((id: string, field: keyof CostItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      if (field === 'dailyProductivity' || field === 'dailyRent') {
        updatedItem.costPerUnit = calculateCostPerUnit(
          field === 'dailyProductivity' ? Number(value) : updatedItem.dailyProductivity,
          field === 'dailyRent' ? Number(value) : updatedItem.dailyRent
        );
      }
      
      return updatedItem;
    }));
  }, [calculateCostPerUnit]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success("تم حذف البند");
  }, []);

  // Template management with headers
  const saveTemplate = useCallback(() => {
    if (!newTemplateName.trim()) {
      toast.error("يرجى إدخال اسم القالب");
      return;
    }

    const template: CostTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      items: items.map(({ id, ...rest }) => rest),
      wastePercentage,
      adminPercentage,
      headers,
      createdAt: new Date().toISOString(),
    };

    const updatedTemplates = [...savedTemplates, template];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
    setNewTemplateName("");
    setShowTemplateInput(false);
    toast.success("تم حفظ القالب مع إعدادات الهيدر بنجاح");
  }, [newTemplateName, items, wastePercentage, adminPercentage, headers, savedTemplates]);

  const loadTemplate = useCallback((templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (!template) return;

    setItems(template.items.map((item, index) => ({
      ...item,
      id: `item-${index}-${Date.now()}`,
    })));
    setWastePercentage(template.wastePercentage);
    setAdminPercentage(template.adminPercentage);
    if (template.headers) {
      setHeaders(template.headers);
    }
    toast.success("تم تحميل القالب بنجاح");
  }, [savedTemplates]);

  const deleteTemplate = useCallback((templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
    toast.success("تم حذف القالب");
  }, [savedTemplates]);

  const exportToExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    
    const itemsData = items.map(item => ({
      [headers.workItem]: item.name,
      [headers.productivity]: item.dailyProductivity,
      [headers.dailyRent]: item.dailyRent,
      [headers.costPerUnit]: item.costPerUnit.toFixed(2),
      ...(item.aiSuggestedProductivity ? { [headers.aiProductivity]: item.aiSuggestedProductivity } : {}),
      ...(item.aiSuggestedRent ? { [headers.aiRent]: item.aiSuggestedRent } : {}),
    }));
    
    itemsData.push(
      { [headers.workItem]: 'الإجمالي', [headers.productivity]: 0, [headers.dailyRent]: 0, [headers.costPerUnit]: calculations.subtotal.toFixed(2) },
      { [headers.workItem]: `نسبة هالك (${wastePercentage}%)`, [headers.productivity]: 0, [headers.dailyRent]: 0, [headers.costPerUnit]: calculations.wasteAmount.toFixed(2) },
      { [headers.workItem]: `مصاريف إدارية (${adminPercentage}%)`, [headers.productivity]: 0, [headers.dailyRent]: 0, [headers.costPerUnit]: calculations.adminAmount.toFixed(2) },
      { [headers.workItem]: 'إجمال التكلفة', [headers.productivity]: 0, [headers.dailyRent]: 0, [headers.costPerUnit]: calculations.grandTotal.toFixed(2) }
    );

    const ws = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'تحليل التكاليف');

    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    XLSX.writeFile(workbook, `تحليل_التكاليف_${currentDate}.xlsx`);
    toast.success("تم تصدير Excel بنجاح");
  }, [items, calculations, wastePercentage, adminPercentage, headers]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const currentDate = new Date().toLocaleDateString('ar-SA');

    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Cost Analysis Report', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(currentDate, pageWidth / 2, 20, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);

    let yPos = 35;

    const tableData = items.map(item => [
      item.name,
      item.dailyProductivity.toString(),
      item.dailyRent.toString(),
      item.costPerUnit.toFixed(2)
    ]);

    tableData.push(
      ['Subtotal', '', '', calculations.subtotal.toFixed(2)],
      [`Waste (${wastePercentage}%)`, '', '', calculations.wasteAmount.toFixed(2)],
      [`Admin (${adminPercentage}%)`, '', '', calculations.adminAmount.toFixed(2)],
      ['Grand Total', '', '', calculations.grandTotal.toFixed(2)]
    );

    autoTable(doc, {
      startY: yPos,
      head: [[headers.workItem, headers.productivity, headers.dailyRent, `${headers.costPerUnit} (${currency})`]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.row.index >= items.length) {
          data.cell.styles.fontStyle = 'bold';
          if (data.row.index === items.length + 3) {
            data.cell.styles.fillColor = [124, 58, 237];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    doc.save(`تحليل_التكاليف_${currentDate.replace(/\//g, '-')}.pdf`);
    toast.success("تم تصدير PDF بنجاح");
  }, [items, calculations, wastePercentage, adminPercentage, currency, headers]);

  const formatNumber = (num: number) => {
    if (!Number.isFinite(num)) return "0";
    const abs = Math.abs(num);
    // Smart precision: keep 3 decimals for very small numbers, 2 for medium, 0 for large
    const fractionDigits = abs === 0 ? 2 : abs < 1 ? 3 : abs < 1000 ? 2 : abs < 100000 ? 1 : 0;
    return num.toLocaleString('ar-SA', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="font-medium text-sm">{payload[0].payload.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {formatNumber(payload[0].value)} {currency} ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <CostAnalysisShell
      title="تحليل تكاليف البنود"
      subtitle={meta?.projectName ? `مشروع: ${meta.projectName}` : "محرك تحليل ذكي متكامل"}
      currency={currency}
    >
      <div className="hidden">
        <ColorLegend type="category" isArabic={false} />
      </div>

      {/* Project info bar + extended KPIs (Phase 1) */}
      <div id="section-overview" className="scroll-mt-32 space-y-4">
        {/* Project info bar + extended KPIs (Phase 1) */}
        <ProjectInfoBar onChange={setMeta} />

        <CostKpiGrid
          totals={deriveTotals(
            items.map((i) => ({
              costPerUnit: i.costPerUnit,
              dailyProductivity: i.dailyProductivity,
              dailyRent: i.dailyRent,
              name: i.name,
            })),
            { wastePct: wastePercentage, adminPct: adminPercentage, taxPct: meta?.taxPct ?? 0 },
          )}
          currency={currency}
        />

        {/* Quick Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">عدد البنود</p>
                <p className="text-base font-bold text-primary truncate">{items.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <PieChartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">المجموع الفرعي</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 truncate">
                  {formatNumber(calculations.subtotal)} {currency}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">هالك + إداري</p>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 truncate">
                  {formatNumber(calculations.wasteAmount + calculations.adminAmount)} {currency}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">الإجمالي الكلي</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {formatNumber(calculations.grandTotal)} {currency}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* /section-overview */}

      {/* Smart Cost Engine */}
      <div id="section-engine" className="scroll-mt-32 mb-6">


          <SmartCostEnginePanel
            pageRows={items.map((i) => ({
              id: i.id,
              name: i.name,
              dailyProductivity: i.dailyProductivity,
              dailyRent: i.dailyRent,
            }))}
            wastePct={wastePercentage}
            currency={currency}
            onApply={(rowId, patch) => {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === rowId
                    ? {
                        ...it,
                        ...(patch.dailyProductivity !== undefined
                          ? { dailyProductivity: patch.dailyProductivity }
                          : {}),
                        ...(patch.dailyRent !== undefined ? { dailyRent: patch.dailyRent } : {}),
                        costPerUnit:
                          (patch.dailyProductivity ?? it.dailyProductivity) > 0
                            ? (patch.dailyRent ?? it.dailyRent) /
                              (patch.dailyProductivity ?? it.dailyProductivity)
                            : 0,
                      }
                    : it,
                ),
              );
            }}
          />
        </div>

        {/* Phase 4: Sensitivity & Scenarios */}
        <div id="section-sensitivity" className="scroll-mt-32" />
        <SensitivityScenarios
          items={items.map((i) => ({
            name: i.name,
            costPerUnit: i.costPerUnit,
            dailyProductivity: i.dailyProductivity,
            dailyRent: i.dailyRent,
          }))}
          wastePct={wastePercentage}
          adminPct={adminPercentage}
          taxPct={meta?.taxPct ?? 0}
          currency={currency}
        />

        {/* Proactive system tips + Anomalies */}
        <div id="section-anomalies" className="scroll-mt-32" />
        <SystemTipsPanel
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            dailyProductivity: i.dailyProductivity,
            dailyRent: i.dailyRent,
            costPerUnit: i.costPerUnit,
            aiSuggestedProductivity: i.aiSuggestedProductivity,
            aiSuggestedRent: i.aiSuggestedRent,
          }))}
          wastePct={wastePercentage}
          adminPct={adminPercentage}
          currency={currency}
        />

        {/* Phase 6: Anomaly detection (15 rules) */}
        <AnomalyDetectorPanel
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            dailyProductivity: i.dailyProductivity,
            dailyRent: i.dailyRent,
            costPerUnit: i.costPerUnit,
            aiSuggestedProductivity: i.aiSuggestedProductivity,
            aiSuggestedRent: i.aiSuggestedRent,
          }))}
          currency={currency}
          onFocusItem={(id) => setDetailsItemId(id)}
          onApply={(rowId, patch) => {
            setItems((prev) =>
              prev.map((it) => {
                if (it.id !== rowId) return it;
                const next = { ...it, ...patch };
                if (patch.dailyProductivity !== undefined || patch.dailyRent !== undefined) {
                  next.costPerUnit =
                    next.dailyProductivity > 0 ? next.dailyRent / next.dailyProductivity : 0;
                }
                return next;
              }),
            );
          }}
        />

        {/* Integrations Hub — link with the rest of the program */}
        <div id="section-integrations" className="scroll-mt-32 rounded-2xl bg-card border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1.5 h-6 bg-accent rounded-full" />
            <Link2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold">الربط والتقارير</h2>
              <p className="text-[11px] text-muted-foreground">
                ربط تحليل التكاليف مع BOQ ومكتبة الأسعار والموردين والعقود والتقارير.
              </p>
            </div>
          </div>
          <IntegrationsHub
            itemCount={items.length}
            grandTotal={items.reduce((s, it) => s + (it.costPerUnit || 0), 0)}
            currency={currency}
            onExportExcel={exportToExcel}
            onExportPdf={exportToPDF}
            onImportBoq={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".xlsx,.xls,.pdf";
              input.onchange = (e) => handleFileImport(e as unknown as React.ChangeEvent<HTMLInputElement>);
              input.click();
            }}
            onSyncPrices={() => {
              try {
                const exportData = {
                  items: items.map((it) => ({
                    name: it.name,
                    unit_price: it.costPerUnit,
                    productivity: it.dailyProductivity,
                    daily_rent: it.dailyRent,
                  })),
                  currency,
                  savedAt: new Date().toISOString(),
                };
                localStorage.setItem(COST_ANALYSIS_EXPORT_KEY, JSON.stringify(exportData));
                toast.success("تم تحضير البنود للربط مع مكتبة الأسعار");
              } catch {
                toast.error("تعذر تحضير البيانات");
              }
            }}
            onSendToContracts={() => {
              try {
                const baseline = {
                  items: items.map((it) => ({
                    name: it.name,
                    unit_price: it.costPerUnit,
                  })),
                  currency,
                  createdAt: new Date().toISOString(),
                  source: "cost-analysis",
                };
                localStorage.setItem("cost_control_baseline_pending", JSON.stringify(baseline));
                toast.success("تم تجهيز خط الأساس للترحيل إلى مراقبة التكلفة");
              } catch {
                toast.error("تعذر تجهيز خط الأساس");
              }
            }}
            onSendToSuppliers={() => {
              try {
                localStorage.setItem(
                  "suppliers_rfq_pending",
                  JSON.stringify({
                    items: items.map((it) => ({ name: it.name, unit_price: it.costPerUnit })),
                    currency,
                    createdAt: new Date().toISOString(),
                  }),
                );
                toast.success("تم إرسال البنود لطلب عروض من الموردين");
              } catch {
                toast.error("تعذر الإرسال");
              }
            }}
          />

        </div>



        {/* Phase 7: Suppliers · Templates · Import · Reports */}
        <Phase7ToolsPanel
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            dailyProductivity: i.dailyProductivity,
            dailyRent: i.dailyRent,
            costPerUnit: i.costPerUnit,
            aiSuggestedProductivity: i.aiSuggestedProductivity,
            aiSuggestedRent: i.aiSuggestedRent,
          }))}
          currency={currency}
          wastePct={wastePercentage}
          adminPct={adminPercentage}
          projectName={meta?.projectName}
          onImportItems={(rows) =>
            setItems((prev) => [
              ...prev,
              ...rows.map((r, idx) => ({
                id: `imp7-${Date.now()}-${idx}`,
                name: r.name,
                dailyProductivity: r.dailyProductivity,
                dailyRent: r.dailyRent,
                costPerUnit: r.costPerUnit,
                isEditable: true,
              })),
            ])
          }
          onLoadTemplate={(tpl) => {
            setItems(
              tpl.items.map((it, idx) => ({
                id: `tpl7-${Date.now()}-${idx}`,
                name: it.name,
                dailyProductivity: it.dailyProductivity,
                dailyRent: it.dailyRent,
                costPerUnit: it.costPerUnit,
                isEditable: true,
              })),
            );
            setWastePercentage(tpl.wastePct);
            setAdminPercentage(tpl.adminPct);
          }}
        />

        {/* Phase 8: Approval workflow, comments, permissions, activity */}
        <div id="section-collab" className="scroll-mt-32" />
        <Phase8CollaborationPanel
          analysisKey={meta?.projectName || "default"}
          projectId={null}
        />

        {/* Phase 5: AI Advisor with approval workflow */}
        <div id="section-suggestions" className="scroll-mt-32" />
        <AiCostAdvisorPanel
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            dailyProductivity: i.dailyProductivity,
            dailyRent: i.dailyRent,
            costPerUnit: i.costPerUnit,
          }))}
          currency={currency}
          wastePct={wastePercentage}
          adminPct={adminPercentage}
          onApply={(rowId, patch) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === rowId
                  ? {
                      ...it,
                      ...(patch.dailyProductivity !== undefined
                        ? { dailyProductivity: patch.dailyProductivity }
                        : {}),
                      ...(patch.dailyRent !== undefined
                        ? { dailyRent: patch.dailyRent }
                        : {}),
                      costPerUnit:
                        (patch.dailyProductivity ?? it.dailyProductivity) > 0
                          ? (patch.dailyRent ?? it.dailyRent) /
                            (patch.dailyProductivity ?? it.dailyProductivity)
                          : 0,
                    }
                  : it,
              ),
            );
          }}
        />

        {/* Market comparison against material_prices library */}
        <div id="section-market" className="scroll-mt-32" />
        <MarketComparisonPanel
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            costPerUnit: i.costPerUnit,
            dailyProductivity: i.dailyProductivity,
            dailyRent: i.dailyRent,
          }))}
          currency={currency}
          onApplyMarketPrice={(rowId, newRent) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === rowId
                  ? {
                      ...it,
                      dailyRent: newRent,
                      costPerUnit:
                        it.dailyProductivity > 0 ? newRent / it.dailyProductivity : it.costPerUnit,
                    }
                  : it,
              ),
            );
          }}
        />


        <div id="section-versions" className="scroll-mt-32" />
        <CostVersionsPanel
          items={items as unknown as Parameters<typeof CostVersionsPanel>[0]["items"]}
          wastePercentage={wastePercentage}
          adminPercentage={adminPercentage}
          taxPct={meta?.taxPct ?? 0}
          currency={currency}
          onRestore={(snap) => {
            setItems(snap.items as unknown as CostItem[]);
            setWastePercentage(snap.wastePercentage);
            setAdminPercentage(snap.adminPercentage);
          }}
        />

        <div id="section-table" className="scroll-mt-32 space-y-6">

          {/* Main Table - full width */}
          <div className="space-y-4 min-w-0">
            {/* Template Management */}
            <Card className="border-dashed border-accent/50 bg-accent/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-accent-foreground" />
                    <h4 className="font-semibold text-sm">قوالب التحليل</h4>
                  </div>
                  <Badge variant="secondary" className="text-xs">{savedTemplates.length} قالب</Badge>
                </div>

                {savedTemplates.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <Select onValueChange={loadTemplate}>
                      <SelectTrigger className="w-48 h-8">
                        <SelectValue placeholder="تحميل قالب..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select onValueChange={deleteTemplate}>
                      <SelectTrigger className="w-32 h-8 border-destructive/50 text-destructive">
                        <SelectValue placeholder="حذف قالب" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showTemplateInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="اسم القالب..."
                      className="flex-1 h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
                    />
                    <Button variant="default" size="sm" onClick={saveTemplate} className="h-8">
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowTemplateInput(false)} className="h-8">
                      حذف
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowTemplateInput(true)} className="w-full gap-1">
                    <Plus className="w-3 h-3" />
                    حفظ كقالب جديد
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Link with BOQ Items */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <h4 className="font-semibold text-sm">ربط مع شاشة البنود</h4>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={importFromBOQ}
                      className="gap-1 h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-300"
                    >
                      <Download className="w-3 h-3 text-blue-600" />
                      استيراد من البنود
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToBOQ}
                      className="gap-1 h-8 text-xs bg-green-50 hover:bg-green-100 border-green-300"
                    >
                      <ArrowLeftRight className="w-3 h-3 text-green-600" />
                      تصدير للبنود
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Bulk Actions */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="font-semibold text-sm">تحليل AI السريع</h4>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        let count = 0;
                        setItems(prev => prev.map(it => {
                          if (!it.name.trim()) return it;
                          if (it.aiSuggestedProductivity && it.aiSuggestedRent) return it;
                          const local = getLocalSuggestion(it.name);
                          count++;
                          return {
                            ...it,
                            aiSuggestedProductivity: it.aiSuggestedProductivity || local.productivity,
                            aiSuggestedRent: it.aiSuggestedRent || local.rent,
                          };
                        }));
                        if (count > 0) toast.success(`تم توليد ${count} اقتراح محلي فوري`);
                        else toast.info("جميع البنود لديها اقتراحات");
                      }}
                      className="gap-1 h-8 text-xs"
                      title="اقتراحات فورية بدون الحاجة للاتصال بـ AI"
                    >
                      <Zap className="w-3 h-3 text-amber-600" />
                      تقدير محلي سريع
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        let count = 0;
                        setItems(prev => prev.map(it => {
                          if (!it.name.trim()) return it;
                          if (it.dailyProductivity > 0 && it.dailyRent > 0) return it;
                          const local = getLocalSuggestion(it.name);
                          count++;
                          return {
                            ...it,
                            dailyProductivity: it.dailyProductivity > 0 ? it.dailyProductivity : local.productivity,
                            dailyRent: it.dailyRent > 0 ? it.dailyRent : local.rent,
                          };
                        }));
                        if (count > 0) toast.success(`تم ملء ${count} بند بقيم افتراضية محلية`);
                        else toast.info("جميع البنود مملوءة");
                      }}
                      className="gap-1 h-8 text-xs"
                      title="يملأ البنود الفارغة مباشرة بقيم افتراضية دون تحويلها لاقتراح"
                    >
                      <Zap className="w-3 h-3 text-emerald-600" />
                      ملء الفارغ فوراً
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={analyzeAllWithAI}
                      disabled={isAnalyzingAll}
                      className="gap-1 h-8 text-xs bg-amber-50 hover:bg-amber-100 border-amber-300"
                    >
                      {isAnalyzingAll ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          جاري التحليل...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          تحليل جميع البنود
                        </>
                      )}
                    </Button>
                    {items.some(i => i.aiSuggestedProductivity || i.aiSuggestedRent) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={applyAllAISuggestions}
                        className="gap-1 h-8 text-xs"
                      >
                        <TrendingUp className="w-3 h-3" />
                        تطبيق جميع الاقتراحات
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Table */}
            <Card className="border-primary/20">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-2 border-b bg-muted/30 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewItem}
                      className="gap-1 h-7 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة صف
                    </Button>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.pdf"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs pointer-events-none"
                        asChild
                      >
                        <span>
                          <FileUp className="w-3 h-3" />
                          استيراد ملف
                        </span>
                      </Button>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => setPageSize(Number(v))}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 / صفحة</SelectItem>
                        <SelectItem value="50">50 / صفحة</SelectItem>
                        <SelectItem value="100">100 / صفحة</SelectItem>
                        <SelectItem value="200">200 / صفحة</SelectItem>
                        <SelectItem value="500">500 / صفحة</SelectItem>
                        <SelectItem value="9999">الكل (ديناميكي)</SelectItem>
                      </SelectContent>
                    </Select>
                    <CostColumnVisibility
                      visibility={columnVisibility}
                      onChange={setColumnVisibility}
                    />
                    {hasUnsavedColumnWidths && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={saveColumnWidths}
                        className="gap-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-3 h-3" />
                        حفظ عرض الأعمدة
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetColumnWidths}
                      className="gap-1 h-7 text-xs"
                      title="إعادة تعيين عرض الأعمدة"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHeaders(!editingHeaders)}
                      className="gap-1 h-7 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      {editingHeaders ? "إنهاء تعديل الهيدر" : "تعديل الهيدر"}
                    </Button>
                  </div>
                </div>
                <CostItemsToolbar
                  filter={itemsFilter}
                  onChange={setItemsFilter}
                  total={items.length}
                  visible={visibleItems.length}
                />
                <CostBulkActionsBar
                  selectedCount={selectedIds.size}
                  totalVisible={visibleItems.length}
                  onClear={clearSelection}
                  onSelectAllVisible={selectAllVisible}
                  onCopy={() => {
                    const ids = new Set(selectedIds);
                    setItems((prev) => {
                      const copies: CostItem[] = [];
                      prev.forEach((it) => {
                        if (ids.has(it.id)) {
                          copies.push({
                            ...it,
                            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            name: `${it.name} (نسخة)`,
                          });
                        }
                      });
                      return [...prev, ...copies];
                    });
                    toast.success(`تم نسخ ${ids.size} بند`);
                  }}
                  onDelete={() => {
                    if (!confirm(`حذف ${selectedIds.size} بند؟`)) return;
                    const ids = new Set(selectedIds);
                    setItems((prev) => prev.filter((it) => !ids.has(it.id)));
                    clearSelection();
                    toast.success(`تم الحذف`);
                  }}
                  onAnalyzeAi={async () => {
                    const targets = items.filter(
                      (it) =>
                        selectedIds.has(it.id) &&
                        it.aiSuggestedProductivity == null &&
                        it.aiSuggestedRent == null,
                    );
                    if (targets.length === 0) {
                      toast.info("جميع البنود المحددة لها اقتراح AI");
                      return;
                    }
                    toast.info(`تحليل ${targets.length} بند...`);
                    for (const it of targets) {
                      await analyzeWithAI(it.id, it.name);
                    }
                  }}
                  onApplyAi={() => {
                    setItems((prev) =>
                      prev.map((it) => {
                        if (!selectedIds.has(it.id)) return it;
                        if (!it.aiSuggestedProductivity && !it.aiSuggestedRent) return it;
                        const p = it.aiSuggestedProductivity || it.dailyProductivity;
                        const r = it.aiSuggestedRent || it.dailyRent;
                        return {
                          ...it,
                          dailyProductivity: p,
                          dailyRent: r,
                          costPerUnit: p > 0 ? r / p : 0,
                        };
                      }),
                    );
                    toast.success("تم تطبيق اقتراحات AI على المحدد");
                  }}
                  onExport={() => {
                    const rows = items.filter((it) => selectedIds.has(it.id));
                    if (rows.length === 0) return;
                    const csv = [
                      ["اسم البند", "الإنتاجية", "الإيجار", "تكلفة الوحدة"].join(","),
                      ...rows.map((r) =>
                        [
                          `"${(r.name ?? "").replace(/"/g, '""')}"`,
                          r.dailyProductivity,
                          r.dailyRent,
                          r.costPerUnit,
                        ].join(","),
                      ),
                    ].join("\n");
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `cost-items-${Date.now()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`تم تصدير ${rows.length} بند`);
                  }}
                />

                {isFilterActive && visibleItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-2 p-2 rounded-md border border-primary/30 bg-primary/5">
                    <span className="text-xs font-medium">
                      إجراءات على البنود الظاهرة ({visibleItems.length}):
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={async () => {
                        const targets = visibleItems.filter(
                          (it) => it.aiSuggestedProductivity == null && it.aiSuggestedRent == null,
                        );
                        if (targets.length === 0) {
                          toast.info("جميع البنود الظاهرة تحتوي على اقتراح AI");
                          return;
                        }
                        toast.info(`تحليل ${targets.length} بند بالذكاء الاصطناعي...`);
                        for (const it of targets) {
                          await analyzeWithAI(it.id, it.name);
                        }
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                      تحليل بـ AI
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        if (!confirm(`حذف ${visibleItems.length} بند؟`)) return;
                        const ids = new Set(visibleItems.map((it) => it.id));
                        setItems((prev) => prev.filter((it) => !ids.has(it.id)));
                        toast.success(`تم حذف ${ids.size} بند`);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </Button>
                  </div>
                )}
                <ScrollArea className="max-h-[calc(100vh-250px)] min-h-[800px]">
                  <div ref={scrollViewportRef} data-radix-scroll-area-viewport="" className="h-full w-full rounded-[inherit]" style={{ overflow: 'hidden scroll' }}>
                    <div className="overflow-x-auto -mx-2 px-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ minWidth: '900px', display: 'table', width: '100%' }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow className="bg-primary/10">
                          <TableHead style={{ width: 60 }} className="relative">
                            <Checkbox
                              checked={
                                visibleItems.length > 0 &&
                                visibleItems.every((it) => selectedIds.has(it.id))
                              }
                              onCheckedChange={(c) => {
                                if (c === true) selectAllVisible();
                                else clearSelection();
                              }}
                              aria-label="تحديد كل الظاهرة"
                            />
                          </TableHead>

                          {columnVisibility.workItem && (
                            <TableHead style={{ width: columnWidths.workItem }} className="text-right font-bold text-primary relative whitespace-nowrap">
                              {editingHeaders ? (
                                <Input
                                  value={headers.workItem}
                                  onChange={(e) => setHeaders(prev => ({ ...prev, workItem: e.target.value }))}
                                  className="h-6 text-xs text-right"
                                />
                              ) : headers.workItem}
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'workItem')}
                              />
                            </TableHead>
                          )}
                          {columnVisibility.productivity && (
                            <TableHead style={{ width: columnWidths.productivity }} className="text-center font-bold text-primary relative whitespace-nowrap">
                              {editingHeaders ? (
                                <Input
                                  value={headers.productivity}
                                  onChange={(e) => setHeaders(prev => ({ ...prev, productivity: e.target.value }))}
                                  className="h-6 text-xs text-center"
                                />
                              ) : headers.productivity}
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'productivity')}
                              />
                            </TableHead>
                          )}
                          {columnVisibility.aiProductivity && (
                            <TableHead style={{ width: columnWidths.aiProductivity }} className="text-center font-bold text-primary relative whitespace-nowrap">
                              {editingHeaders ? (
                                <Input
                                  value={headers.aiProductivity}
                                  onChange={(e) => setHeaders(prev => ({ ...prev, aiProductivity: e.target.value }))}
                                  className="h-6 text-xs text-center"
                                />
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  {headers.aiProductivity}
                                </div>
                              )}
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'aiProductivity')}
                              />
                            </TableHead>
                          )}
                          {columnVisibility.dailyRent && (
                            <TableHead style={{ width: columnWidths.dailyRent }} className="text-center font-bold text-primary relative whitespace-nowrap">
                              {editingHeaders ? (
                                <Input
                                  value={headers.dailyRent}
                                  onChange={(e) => setHeaders(prev => ({ ...prev, dailyRent: e.target.value }))}
                                  className="h-6 text-xs text-center"
                                />
                              ) : headers.dailyRent}
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'dailyRent')}
                              />
                            </TableHead>
                          )}
                          {columnVisibility.aiRent && (
                            <TableHead style={{ width: columnWidths.aiRent }} className="text-center font-bold text-primary relative whitespace-nowrap">
                              {editingHeaders ? (
                                <Input
                                  value={headers.aiRent}
                                  onChange={(e) => setHeaders(prev => ({ ...prev, aiRent: e.target.value }))}
                                  className="h-6 text-xs text-center"
                                />
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  {headers.aiRent}
                                </div>
                              )}
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'aiRent')}
                              />
                            </TableHead>
                          )}
                          {columnVisibility.costPerUnit && (
                            <TableHead style={{ width: columnWidths.costPerUnit }} className="text-center font-bold text-primary relative whitespace-nowrap">
                              {editingHeaders ? (
                                <Input
                                  value={headers.costPerUnit}
                                  onChange={(e) => setHeaders(prev => ({ ...prev, costPerUnit: e.target.value }))}
                                  className="h-6 text-xs text-center"
                                />
                              ) : headers.costPerUnit}
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'costPerUnit')}
                              />
                            </TableHead>
                          )}
                          {columnVisibility.actions && (
                            <TableHead style={{ width: columnWidths.actions }} className="relative whitespace-nowrap">
                              إجراءات
                              <div
                                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                                onMouseDown={(e) => handleColumnResizeStart(e, 'actions')}
                              />
                            </TableHead>
                          )}

                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext
                          items={pagedItems.map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {pagedItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                                {isFilterActive ? "لا توجد بنود مطابقة للفلتر" : "لا توجد بنود"}
                              </TableCell>
                            </TableRow>
                          ) : pagedItems.map((item) => (
                            <SortableRow
                              key={item.id}
                              item={item}
                              handleItemChange={handleItemChange}
                              handleRemoveItem={handleRemoveItem}
                              handleCopyItem={handleCopyItem}
                              handleOpenDetails={setDetailsItemId}
                              analyzeWithAI={analyzeWithAI}
                              applyAISuggestion={applyAISuggestion}
                              calculateDifference={calculateDifference}
                              formatNumber={formatNumber}
                              selected={selectedIds.has(item.id)}
                              onToggleSelect={toggleRowSelect}
                              visibility={columnVisibility}
                            />
                          ))}
                        </SortableContext>
                        {pageSize < 9999 && visibleItems.length > pageSize && (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-xs text-muted-foreground py-3"
                            >
                              يعرض {pagedItems.length} من {visibleItems.length} — غيّر حجم الصفحة لعرض المزيد
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>

                    </Table>
                  </DndContext>
                    </div>
                    </div>
                  </div>

                </ScrollArea>
              </CardContent>
            </Card>

            {/* Summary Section */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <Table>
                  <TableBody>
                    <TableRow className="border-b-2 border-primary/20">
                      <TableCell className="text-right font-bold text-primary">الإجمالي</TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="text-center">
                        <Badge className="px-3 py-1 bg-primary text-primary-foreground">
                          {formatNumber(calculations.subtotal)} {currency}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className="text-right font-medium">نسبة هالك</TableCell>
                      <TableCell colSpan={2} className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            value={wastePercentage}
                            onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-center text-sm"
                            min="0"
                            max="100"
                          />
                          <span className="text-muted-foreground text-sm">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatNumber(calculations.wasteAmount)} {currency}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className="text-right font-medium">مصاريف ادارية (تصاريح)</TableCell>
                      <TableCell colSpan={2} className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            value={adminPercentage}
                            onChange={(e) => setAdminPercentage(parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-center text-sm"
                            min="0"
                            max="100"
                          />
                          <span className="text-muted-foreground text-sm">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatNumber(calculations.adminAmount)} {currency}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow className="bg-primary/10 border-t-2 border-primary">
                      <TableCell className="text-right font-bold text-lg text-primary">إجمال التكلفة</TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-lg px-4 py-2 bg-green-600 text-white">
                          {formatNumber(calculations.grandTotal)} {currency}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Below-table row: pie chart (wide) + export/autosave */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChartIcon className="w-4 h-4 text-primary" />
                  توزيع التكاليف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="35%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={130}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        formatter={(value) => <span className="text-xs">{value}</span>}
                        wrapperStyle={{ fontSize: '12px', paddingInlineStart: 16 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
            {/* Export Buttons */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4 text-primary" />
                  تصدير التقرير
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  className="w-full gap-2 justify-start"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  تصدير إلى Excel
                </Button>
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  className="w-full gap-2 justify-start"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  تصدير إلى PDF
                </Button>
              </CardContent>
            </Card>

            {/* Auto-save indicator */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Save className="w-4 h-4" />
                  <span className="text-sm">يتم الحفظ تلقائياً</span>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

      

      <ItemDetailsDrawer
        open={detailsItemId !== null}
        onOpenChange={(o) => !o && setDetailsItemId(null)}
        itemId={detailsItemId}
        itemName={detailsItem?.name ?? ""}
        costPerUnit={detailsItem?.costPerUnit ?? 0}
        currency={currency}
      />
    </CostAnalysisShell>

  );
}
