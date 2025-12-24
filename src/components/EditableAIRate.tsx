import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditableAIRateProps {
  itemNumber: string;
  currentRate?: number;
  onSave: (itemNumber: string, rate: number) => void;
}

export function EditableAIRate({ itemNumber, currentRate, onSave }: EditableAIRateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentRate?.toString() || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(currentRate?.toString() || "");
  }, [currentRate]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onSave(itemNumber, numValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setValue(currentRate?.toString() || "");
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-20 text-xs text-right px-1"
          min={0}
          step={0.01}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 cursor-pointer group px-1 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors",
        currentRate && currentRate > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
      )}
      onClick={() => setIsEditing(true)}
      title="Click to edit AI Rate"
    >
      <span className="text-sm font-medium">
        {currentRate && currentRate > 0 ? currentRate.toLocaleString() : '-'}
      </span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
    </div>
  );
}
