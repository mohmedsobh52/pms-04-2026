import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableQuantityProps {
  value: number;
  onSave: (newValue: number) => void;
  className?: string;
  disabled?: boolean;
}

export function EditableQuantity({ value, onSave, className, disabled }: EditableQuantityProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  const handleSave = () => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onSave(numValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-20 h-7 text-sm text-center"
        />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
          <Check className="w-3 h-3 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
          <X className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    );
  }

  const isZeroOrMissing = !value || value === 0;

  return (
    <div className="flex items-center justify-center gap-1 group">
      <span className={cn(
        "text-sm font-semibold",
        isZeroOrMissing && "text-destructive",
        className
      )}>
        {value > 0 ? value.toLocaleString() : '0'}
      </span>
      {!disabled && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-5 w-5 transition-opacity",
            isZeroOrMissing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={() => setIsEditing(true)}
        >
          <Pencil className={cn(
            "w-3 h-3",
            isZeroOrMissing ? "text-destructive" : "text-muted-foreground"
          )} />
        </Button>
      )}
    </div>
  );
}
