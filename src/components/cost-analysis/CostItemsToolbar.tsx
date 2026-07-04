import { Search, X, Filter, SortAsc, SortDesc, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type CostSortField =
  | "none"
  | "name"
  | "costPerUnit"
  | "dailyProductivity"
  | "dailyRent"
  | "aiSuggestedProductivity"
  | "aiSuggestedRent"
  | "gap";

export type CostQuickPreset =
  | "all"
  | "missing"          // costPerUnit == 0 أو غير مكتمل
  | "needsReview"      // اسم موجود لكن بيانات ناقصة
  | "withAi"           // له اقتراح AI
  | "highGap"          // فرق كبير بين المدخل واقتراح AI
  | "topCost"          // أعلى 20% تكلفة
  | "lowCost";         // أدنى 20% تكلفة

export interface CostItemsFilter {
  // نصي
  query: string;
  // نطاق التكلفة
  minCost: string;
  maxCost: string;
  // نطاق الإنتاجية اليومية
  minProductivity?: string;
  maxProductivity?: string;
  // نطاق الإيجار اليومي
  minRent?: string;
  maxRent?: string;
  // فلاتر منطقية
  onlyAi: boolean;
  onlyMissing?: boolean;     // بنود غير مكتملة
  onlyNeedsReview?: boolean; // بنود بحاجة لمراجعة
  onlyWithGap?: boolean;     // فرق ≥ 20% مع اقتراح AI
  hideZeroCost?: boolean;    // إخفاء الصفريّة
  // ترتيب
  sortField?: CostSortField;
  sortDir?: "asc" | "desc";
  // preset سريع
  preset?: CostQuickPreset;
}

interface Props {
  filter: CostItemsFilter;
  onChange: (next: CostItemsFilter) => void;
  total: number;
  visible: number;
}

const SORT_LABELS: Record<CostSortField, string> = {
  none: "بدون ترتيب",
  name: "اسم البند",
  costPerUnit: "تكلفة الوحدة",
  dailyProductivity: "الإنتاجية اليومية",
  dailyRent: "الإيجار اليومي",
  aiSuggestedProductivity: "إنتاجية AI",
  aiSuggestedRent: "إيجار AI",
  gap: "فجوة AI (%)",
};

const PRESET_LABELS: Record<CostQuickPreset, string> = {
  all: "الكل",
  missing: "غير مكتمل",
  needsReview: "بحاجة لمراجعة",
  withAi: "له اقتراح AI",
  highGap: "فجوة عالية",
  topCost: "أعلى تكلفة",
  lowCost: "أدنى تكلفة",
};

export function CostItemsToolbar({ filter, onChange, total, visible }: Props) {
  const sortField = filter.sortField ?? "none";
  const sortDir = filter.sortDir ?? "asc";
  const preset = filter.preset ?? "all";

  const activeCount =
    (filter.query.trim() ? 1 : 0) +
    (filter.minCost ? 1 : 0) +
    (filter.maxCost ? 1 : 0) +
    (filter.minProductivity ? 1 : 0) +
    (filter.maxProductivity ? 1 : 0) +
    (filter.minRent ? 1 : 0) +
    (filter.maxRent ? 1 : 0) +
    (filter.onlyAi ? 1 : 0) +
    (filter.onlyMissing ? 1 : 0) +
    (filter.onlyNeedsReview ? 1 : 0) +
    (filter.onlyWithGap ? 1 : 0) +
    (filter.hideZeroCost ? 1 : 0) +
    (sortField !== "none" ? 1 : 0) +
    (preset !== "all" ? 1 : 0);

  const isActive = activeCount > 0;

  const clear = () =>
    onChange({
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

  const setPreset = (p: CostQuickPreset) => onChange({ ...filter, preset: p });

  return (
    <div className="space-y-2 mb-2 p-2 rounded-md border border-border bg-muted/30">
      {/* السطر الأول: بحث + نطاق تكلفة + ترتيب + إجراءات */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={filter.query}
            onChange={(e) => onChange({ ...filter, query: e.target.value })}
            placeholder="بحث في اسم البند..."
            className="ps-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={filter.minCost}
            onChange={(e) => onChange({ ...filter, minCost: e.target.value })}
            placeholder="تكلفة من"
            className="h-8 w-24 text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="number"
            value={filter.maxCost}
            onChange={(e) => onChange({ ...filter, maxCost: e.target.value })}
            placeholder="إلى"
            className="h-8 w-24 text-xs"
          />
        </div>

        {/* ترتيب */}
        <div className="flex items-center gap-1">
          <Select
            value={sortField}
            onValueChange={(v) => onChange({ ...filter, sortField: v as CostSortField })}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as CostSortField[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={sortField === "none"}
            onClick={() =>
              onChange({ ...filter, sortDir: sortDir === "asc" ? "desc" : "asc" })
            }
            title={sortDir === "asc" ? "تصاعدي" : "تنازلي"}
          >
            {sortDir === "asc" ? (
              <SortAsc className="w-3.5 h-3.5" />
            ) : (
              <SortDesc className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* فلاتر متقدمة */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Filter className="w-3 h-3" />
              فلاتر متقدمة
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <div className="text-xs font-semibold text-foreground">نطاق الإنتاجية اليومية</div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={filter.minProductivity ?? ""}
                onChange={(e) => onChange({ ...filter, minProductivity: e.target.value })}
                placeholder="من"
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="number"
                value={filter.maxProductivity ?? ""}
                onChange={(e) => onChange({ ...filter, maxProductivity: e.target.value })}
                placeholder="إلى"
                className="h-8 text-xs"
              />
            </div>

            <div className="text-xs font-semibold text-foreground">نطاق الإيجار اليومي</div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={filter.minRent ?? ""}
                onChange={(e) => onChange({ ...filter, minRent: e.target.value })}
                placeholder="من"
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="number"
                value={filter.maxRent ?? ""}
                onChange={(e) => onChange({ ...filter, maxRent: e.target.value })}
                placeholder="إلى"
                className="h-8 text-xs"
              />
            </div>

            <div className="text-xs font-semibold text-foreground">حالة البند</div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant={filter.onlyMissing ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onChange({ ...filter, onlyMissing: !filter.onlyMissing })}
              >
                <AlertCircle className="w-3 h-3" />
                غير مكتمل
              </Button>
              <Button
                type="button"
                variant={filter.onlyNeedsReview ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() =>
                  onChange({ ...filter, onlyNeedsReview: !filter.onlyNeedsReview })
                }
              >
                <CheckCircle2 className="w-3 h-3" />
                بحاجة لمراجعة
              </Button>
              <Button
                type="button"
                variant={filter.onlyWithGap ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onChange({ ...filter, onlyWithGap: !filter.onlyWithGap })}
              >
                <Sparkles className="w-3 h-3" />
                فجوة AI ≥ 20%
              </Button>
              <Button
                type="button"
                variant={filter.hideZeroCost ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onChange({ ...filter, hideZeroCost: !filter.hideZeroCost })}
              >
                إخفاء الصفريّة
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant={filter.onlyAi ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => onChange({ ...filter, onlyAi: !filter.onlyAi })}
        >
          <Sparkles className="w-3 h-3" />
          له اقتراح AI
        </Button>

        <Badge variant="secondary" className="text-xs">
          {visible} / {total}
        </Badge>

        {isActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={clear}
          >
            <X className="w-3 h-3" />
            مسح الكل
          </Button>
        )}
      </div>

      {/* السطر الثاني: preset chips سريعة */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-muted-foreground me-1">عرض سريع:</span>
        {(Object.keys(PRESET_LABELS) as CostQuickPreset[]).map((p) => (
          <Button
            key={p}
            type="button"
            variant={preset === p ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setPreset(p)}
          >
            {PRESET_LABELS[p]}
          </Button>
        ))}
      </div>
    </div>
  );
}
