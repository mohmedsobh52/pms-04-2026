import { Columns, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export type ColumnKey =
  | "workItem"
  | "productivity"
  | "aiProductivity"
  | "dailyRent"
  | "aiRent"
  | "costPerUnit"
  | "actions";

export type ColumnVisibility = Record<ColumnKey, boolean>;

export const defaultColumnVisibility: ColumnVisibility = {
  workItem: true,
  productivity: true,
  aiProductivity: true,
  dailyRent: true,
  aiRent: true,
  costPerUnit: true,
  actions: true,
};

const LABELS: Record<ColumnKey, string> = {
  workItem: "اسم البند",
  productivity: "الإنتاجية",
  aiProductivity: "إنتاجية AI",
  dailyRent: "الإيجار",
  aiRent: "إيجار AI",
  costPerUnit: "تكلفة الوحدة",
  actions: "الإجراءات",
};

interface Props {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
}

export function CostColumnVisibility({ visibility, onChange }: Props) {
  const shownCount = Object.values(visibility).filter(Boolean).length;
  const total = Object.keys(visibility).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
          <Columns className="w-3 h-3" />
          الأعمدة ({shownCount}/{total})
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-1">
        <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
          <span>إظهار/إخفاء الأعمدة</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-[10px]"
              onClick={() =>
                onChange(
                  Object.fromEntries(
                    (Object.keys(visibility) as ColumnKey[]).map((k) => [k, true]),
                  ) as ColumnVisibility,
                )
              }
              title="إظهار الكل"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-[10px]"
              onClick={() =>
                onChange({
                  ...(Object.fromEntries(
                    (Object.keys(visibility) as ColumnKey[]).map((k) => [k, false]),
                  ) as ColumnVisibility),
                  workItem: true, // نُبقي اسم البند دائماً
                })
              }
              title="إخفاء الكل"
            >
              <EyeOff className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {(Object.keys(visibility) as ColumnKey[]).map((key) => (
          <label
            key={key}
            className="flex items-center gap-2 text-xs py-1 cursor-pointer hover:bg-muted/50 rounded px-1"
          >
            <Checkbox
              checked={visibility[key]}
              disabled={key === "workItem"}
              onCheckedChange={(v) =>
                onChange({ ...visibility, [key]: v === true })
              }
            />
            <span>{LABELS[key]}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
