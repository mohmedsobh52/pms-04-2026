import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Filter,
  Calendar as CalendarIcon,
  FileType,
  HardDrive,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export interface FilterState {
  fileType: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sizeMin: string;
  sizeMax: string;
  isAnalyzed: string;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeFiltersCount: number;
}

const FILE_TYPES = [
  { value: "all", labelEn: "All Types", labelAr: "جميع الأنواع" },
  { value: "pdf", labelEn: "PDF", labelAr: "PDF" },
  { value: "image", labelEn: "Images", labelAr: "صور" },
  { value: "excel", labelEn: "Excel/CSV", labelAr: "Excel/CSV" },
  { value: "word", labelEn: "Word", labelAr: "Word" },
  { value: "text", labelEn: "Text", labelAr: "نص" },
];

const ANALYSIS_STATUS = [
  { value: "all", labelEn: "All", labelAr: "الكل" },
  { value: "analyzed", labelEn: "Analyzed", labelAr: "تم التحليل" },
  { value: "not_analyzed", labelEn: "Not Analyzed", labelAr: "لم يتم التحليل" },
];

const SIZE_OPTIONS = [
  { value: "", labelEn: "Any", labelAr: "أي حجم" },
  { value: "1024", labelEn: "1 KB", labelAr: "1 KB" },
  { value: "102400", labelEn: "100 KB", labelAr: "100 KB" },
  { value: "1048576", labelEn: "1 MB", labelAr: "1 MB" },
  { value: "5242880", labelEn: "5 MB", labelAr: "5 MB" },
  { value: "10485760", labelEn: "10 MB", labelAr: "10 MB" },
  { value: "52428800", labelEn: "50 MB", labelAr: "50 MB" },
];

export function AdvancedFilters({
  filters,
  onFiltersChange,
  activeFiltersCount,
}: AdvancedFiltersProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState<"from" | "to" | null>(null);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      fileType: "all",
      dateFrom: undefined,
      dateTo: undefined,
      sizeMin: "",
      sizeMax: "",
      isAnalyzed: "all",
    });
  };

  const getFileTypeLabel = (value: string) => {
    const type = FILE_TYPES.find((t) => t.value === value);
    return type ? (isArabic ? type.labelAr : type.labelEn) : value;
  };

  const getAnalysisLabel = (value: string) => {
    const status = ANALYSIS_STATUS.find((s) => s.value === value);
    return status ? (isArabic ? status.labelAr : status.labelEn) : value;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2",
            activeFiltersCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="w-4 h-4" />
          {isArabic ? "فلاتر متقدمة" : "Advanced Filters"}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {isArabic ? "فلاتر متقدمة" : "Advanced Filters"}
            </h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearFilters}
              >
                <X className="w-3 h-3 mr-1" />
                {isArabic ? "مسح الكل" : "Clear All"}
              </Button>
            )}
          </div>

          {/* File Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <FileType className="w-3 h-3" />
              {isArabic ? "نوع الملف" : "File Type"}
            </Label>
            <Select
              value={filters.fileType}
              onValueChange={(value) => updateFilter("fileType", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {isArabic ? type.labelAr : type.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <CalendarIcon className="w-3 h-3" />
              {isArabic ? "تاريخ الرفع" : "Upload Date"}
            </Label>
            <div className="flex gap-2">
              <Popover open={datePickerOpen === "from"} onOpenChange={(open) => setDatePickerOpen(open ? "from" : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 h-8 text-xs justify-start",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    {filters.dateFrom
                      ? format(filters.dateFrom, "dd/MM/yyyy")
                      : isArabic
                      ? "من"
                      : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => {
                      updateFilter("dateFrom", date);
                      setDatePickerOpen(null);
                    }}
                    locale={isArabic ? ar : enUS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover open={datePickerOpen === "to"} onOpenChange={(open) => setDatePickerOpen(open ? "to" : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 h-8 text-xs justify-start",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    {filters.dateTo
                      ? format(filters.dateTo, "dd/MM/yyyy")
                      : isArabic
                      ? "إلى"
                      : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => {
                      updateFilter("dateTo", date);
                      setDatePickerOpen(null);
                    }}
                    locale={isArabic ? ar : enUS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* File Size */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <HardDrive className="w-3 h-3" />
              {isArabic ? "حجم الملف" : "File Size"}
            </Label>
            <div className="flex gap-2">
              <Select
                value={filters.sizeMin}
                onValueChange={(value) => updateFilter("sizeMin", value)}
              >
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder={isArabic ? "الحد الأدنى" : "Min"} />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((size) => (
                    <SelectItem key={`min-${size.value}`} value={size.value}>
                      {isArabic ? size.labelAr : size.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sizeMax}
                onValueChange={(value) => updateFilter("sizeMax", value)}
              >
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder={isArabic ? "الحد الأقصى" : "Max"} />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((size) => (
                    <SelectItem key={`max-${size.value}`} value={size.value}>
                      {isArabic ? size.labelAr : size.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Analysis Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3 h-3" />
              {isArabic ? "حالة التحليل" : "Analysis Status"}
            </Label>
            <Select
              value={filters.isAnalyzed}
              onValueChange={(value) => updateFilter("isAnalyzed", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_STATUS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {isArabic ? status.labelAr : status.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {filters.fileType !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {getFileTypeLabel(filters.fileType)}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter("fileType", "all")}
                  />
                </Badge>
              )}
              {filters.dateFrom && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {isArabic ? "من:" : "From:"} {format(filters.dateFrom, "dd/MM")}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter("dateFrom", undefined)}
                  />
                </Badge>
              )}
              {filters.dateTo && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {isArabic ? "إلى:" : "To:"} {format(filters.dateTo, "dd/MM")}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter("dateTo", undefined)}
                  />
                </Badge>
              )}
              {filters.sizeMin && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {">"} {SIZE_OPTIONS.find(s => s.value === filters.sizeMin)?.labelEn}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter("sizeMin", "")}
                  />
                </Badge>
              )}
              {filters.sizeMax && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {"<"} {SIZE_OPTIONS.find(s => s.value === filters.sizeMax)?.labelEn}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter("sizeMax", "")}
                  />
                </Badge>
              )}
              {filters.isAnalyzed !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {getAnalysisLabel(filters.isAnalyzed)}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => updateFilter("isAnalyzed", "all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
