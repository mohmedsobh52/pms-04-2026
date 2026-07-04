import { Copy, Trash2, Sparkles, CheckCircle2, X, Archive, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  selectedCount: number;
  totalVisible: number;
  onClear: () => void;
  onSelectAllVisible: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onAnalyzeAi: () => void;
  onApplyAi: () => void;
  onExport: () => void;
  onArchive?: () => void;
}

export function CostBulkActionsBar({
  selectedCount,
  totalVisible,
  onClear,
  onSelectAllVisible,
  onCopy,
  onDelete,
  onAnalyzeAi,
  onApplyAi,
  onExport,
  onArchive,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 mb-2 p-2 rounded-md border border-primary bg-primary/10 shadow-sm">
      <Badge variant="default" className="text-xs">
        {selectedCount} محدّد
      </Badge>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={onSelectAllVisible}
      >
        تحديد كل الظاهرة ({totalVisible})
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={onCopy}
      >
        <Copy className="w-3 h-3" />
        نسخ
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={onAnalyzeAi}
      >
        <Sparkles className="w-3 h-3" />
        تحليل AI
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={onApplyAi}
      >
        <CheckCircle2 className="w-3 h-3" />
        تطبيق اقتراح AI
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={onExport}
      >
        <Download className="w-3 h-3" />
        تصدير المحدد
      </Button>

      {onArchive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onArchive}
        >
          <Archive className="w-3 h-3" />
          أرشفة
        </Button>
      )}

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3" />
        حذف
      </Button>

      <div className="ms-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onClear}
        >
          <X className="w-3 h-3" />
          إلغاء التحديد
        </Button>
      </div>
    </div>
  );
}
