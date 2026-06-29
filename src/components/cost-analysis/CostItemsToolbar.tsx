import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CostItemsFilter {
  query: string;
  minCost: string;
  maxCost: string;
  onlyAi: boolean;
}

interface Props {
  filter: CostItemsFilter;
  onChange: (next: CostItemsFilter) => void;
  total: number;
  visible: number;
}

export function CostItemsToolbar({ filter, onChange, total, visible }: Props) {
  const isActive =
    filter.query.trim() !== "" ||
    filter.minCost !== "" ||
    filter.maxCost !== "" ||
    filter.onlyAi;

  const clear = () =>
    onChange({ query: "", minCost: "", maxCost: "", onlyAi: false });

  return (
    <div className="flex flex-wrap items-center gap-2 mb-2 p-2 rounded-md border border-border bg-muted/30">
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
      <Button
        type="button"
        variant={filter.onlyAi ? "default" : "outline"}
        size="sm"
        className="h-8 text-xs gap-1"
        onClick={() => onChange({ ...filter, onlyAi: !filter.onlyAi })}
      >
        <Filter className="w-3 h-3" />
        لها اقتراح AI
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
          مسح
        </Button>
      )}
    </div>
  );
}
