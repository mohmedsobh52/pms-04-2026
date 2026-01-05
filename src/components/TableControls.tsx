import { useState, useEffect } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  Pin, 
  PinOff, 
  RotateCcw, 
  Settings2,
  Columns
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface TableControlsProps {
  onZoomChange: (zoom: number) => void;
  onPinnedColumnsChange: (columns: string[]) => void;
  availableColumns: { id: string; label: string; labelAr: string }[];
  className?: string;
}

const ZOOM_STORAGE_KEY = "boq_table_zoom";
const PINNED_COLUMNS_KEY = "boq_pinned_columns";

export function TableControls({
  onZoomChange,
  onPinnedColumnsChange,
  availableColumns,
  className
}: TableControlsProps) {
  const { isArabic } = useLanguage();
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
    return saved ? parseFloat(saved) : 100;
  });
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(PINNED_COLUMNS_KEY);
    return saved ? JSON.parse(saved) : ["item_number", "description"];
  });

  useEffect(() => {
    localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
    onZoomChange(zoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    localStorage.setItem(PINNED_COLUMNS_KEY, JSON.stringify(pinnedColumns));
    onPinnedColumnsChange(pinnedColumns);
  }, [pinnedColumns, onPinnedColumnsChange]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(150, prev + 10));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(50, prev - 10));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const togglePinnedColumn = (columnId: string) => {
    setPinnedColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const resetPinnedColumns = () => {
    setPinnedColumns(["item_number", "description"]);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomOut}
          disabled={zoom <= 50}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 min-w-[60px]">
              {zoom}%
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="center">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "التكبير" : "Zoom"}</Label>
                <span className="text-sm font-mono">{zoom}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={50}
                max={150}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50%</span>
                <span>100%</span>
                <span>150%</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetZoom}
                className="w-full gap-2"
              >
                <RotateCcw className="h-3 w-3" />
                {isArabic ? "إعادة تعيين" : "Reset"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomIn}
          disabled={zoom >= 150}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Pin Columns Control */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? "تثبيت الأعمدة" : "Pin Columns"}
            </span>
            {pinnedColumns.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pinnedColumns.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {isArabic ? "الأعمدة المثبتة" : "Pinned Columns"}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPinnedColumns}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                {isArabic ? "إعادة تعيين" : "Reset"}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {isArabic 
                ? "اختر الأعمدة التي تريد تثبيتها أثناء التمرير الأفقي"
                : "Select columns to pin while scrolling horizontally"}
            </p>

            <div className="space-y-2">
              {availableColumns.map((column) => (
                <div
                  key={column.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-colors",
                    pinnedColumns.includes(column.id)
                      ? "bg-primary/10 border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {pinnedColumns.includes(column.id) ? (
                      <Pin className="h-4 w-4 text-primary" />
                    ) : (
                      <PinOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {isArabic ? column.labelAr : column.label}
                    </span>
                  </div>
                  <Switch
                    checked={pinnedColumns.includes(column.id)}
                    onCheckedChange={() => togglePinnedColumn(column.id)}
                  />
                </div>
              ))}
            </div>

            {pinnedColumns.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? `${pinnedColumns.length} عمود مثبت`
                    : `${pinnedColumns.length} column(s) pinned`}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Export available columns configuration
export const BOQ_TABLE_COLUMNS = [
  { id: "index", label: "#", labelAr: "#" },
  { id: "item_number", label: "Item No.", labelAr: "رقم البند" },
  { id: "item_code", label: "Item Code", labelAr: "كود البند" },
  { id: "description", label: "Description", labelAr: "الوصف" },
  { id: "unit", label: "Unit", labelAr: "الوحدة" },
  { id: "quantity", label: "Qty", labelAr: "الكمية" },
  { id: "unit_price", label: "Unit Price", labelAr: "سعر الوحدة" },
  { id: "total", label: "Total", labelAr: "الإجمالي" },
  { id: "ai_rate", label: "AI Rate", labelAr: "سعر AI" },
  { id: "calc_price", label: "Calc. Price", labelAr: "السعر المحسوب" },
];
