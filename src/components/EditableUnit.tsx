import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

// Standard construction units - bilingual
const STANDARD_UNITS = [
  { value: "m³", labelEn: "m³ (Cubic Meter)", labelAr: "م³ (متر مكعب)" },
  { value: "m²", labelEn: "m² (Square Meter)", labelAr: "م² (متر مربع)" },
  { value: "m.l", labelEn: "m.l (Linear Meter)", labelAr: "م.ط (متر طولي)" },
  { value: "m", labelEn: "m (Meter)", labelAr: "م (متر)" },
  { value: "kg", labelEn: "kg (Kilogram)", labelAr: "كجم (كيلوجرام)" },
  { value: "ton", labelEn: "ton (Ton)", labelAr: "طن" },
  { value: "pcs", labelEn: "pcs (Pieces)", labelAr: "قطعة" },
  { value: "nr", labelEn: "nr (Number)", labelAr: "عدد" },
  { value: "ls", labelEn: "ls (Lump Sum)", labelAr: "مقطوعية" },
  { value: "set", labelEn: "set", labelAr: "طقم" },
  { value: "day", labelEn: "day", labelAr: "يوم" },
  { value: "hr", labelEn: "hr (Hour)", labelAr: "ساعة" },
  { value: "l", labelEn: "l (Liter)", labelAr: "لتر" },
  { value: "gal", labelEn: "gal (Gallon)", labelAr: "جالون" },
];

// Common invalid/placeholder unit values
const INVALID_UNITS = ["الوحدة", "unit", "Unit", "-", "", "—", "N/A", "n/a"];

interface EditableUnitProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  disabled?: boolean;
}

export function EditableUnit({ value, onSave, className, disabled }: EditableUnitProps) {
  const { isArabic } = useLanguage();
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCustomInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isCustomInput]);

  const handleSelectUnit = (unit: string) => {
    onSave(unit);
  };

  const handleCustomSave = () => {
    if (customValue.trim()) {
      onSave(customValue.trim());
      setCustomValue("");
      setIsCustomInput(false);
    }
  };

  const handleCustomCancel = () => {
    setCustomValue("");
    setIsCustomInput(false);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCustomSave();
    } else if (e.key === "Escape") {
      handleCustomCancel();
    }
  };

  const isInvalidUnit = INVALID_UNITS.includes(value) || !value;

  // Custom input mode
  if (isCustomInput) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          onBlur={handleCustomSave}
          placeholder={isArabic ? "وحدة مخصصة..." : "Custom unit..."}
          className="w-24 h-7 text-sm text-center"
        />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCustomSave}>
          <Check className="w-3 h-3 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCustomCancel}>
          <X className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 group">
      {disabled ? (
        <span className={cn(
          "text-sm font-medium",
          isInvalidUnit && "text-destructive",
          className
        )}>
          {value || "-"}
        </span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 gap-1 font-medium",
                isInvalidUnit 
                  ? "text-destructive border border-destructive/30 bg-destructive/5" 
                  : "text-slate-700 dark:text-slate-200",
                className
              )}
            >
              {value || (isArabic ? "الوحدة" : "Unit")}
              <ChevronDown className={cn(
                "w-3 h-3 transition-opacity",
                isInvalidUnit ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48 max-h-64 overflow-y-auto bg-popover z-50">
            {STANDARD_UNITS.map((unit) => (
              <DropdownMenuItem
                key={unit.value}
                onClick={() => handleSelectUnit(unit.value)}
                className={cn(
                  "cursor-pointer",
                  value === unit.value && "bg-primary/10 text-primary"
                )}
              >
                {isArabic ? unit.labelAr : unit.labelEn}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsCustomInput(true)}
              className="gap-2 text-muted-foreground"
            >
              <Pencil className="w-3 h-3" />
              {isArabic ? "وحدة مخصصة..." : "Custom unit..."}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
