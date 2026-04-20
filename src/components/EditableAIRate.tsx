import { useState, useRef, useEffect, memo } from "react";
import { Check, X, Pencil, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditableAIRateProps {
  itemNumber: string;
  currentRate?: number;
  onSave: (itemNumber: string, rate: number) => void;
  isLoading?: boolean;
  isApplied?: boolean;
}

function EditableAIRateComponent({ itemNumber, currentRate, onSave, isLoading, isApplied }: EditableAIRateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentRate?.toString() || "");
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  // Show confirmation animation when rate is applied
  useEffect(() => {
    if (isApplied && currentRate && currentRate > 0) {
      setShowConfirmation(true);
      const timer = setTimeout(() => setShowConfirmation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentRate, isApplied]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-end gap-2 min-h-[28px] px-2">
        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
        <span className="text-xs text-muted-foreground animate-pulse">Analyzing...</span>
      </div>
    );
  }

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

  const hasRate = currentRate && currentRate > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 cursor-pointer group px-2 py-1 rounded transition-all duration-300 min-h-[28px] relative",
        hasRate 
          ? "text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/30" 
          : "text-muted-foreground hover:bg-muted",
        showConfirmation && "animate-pulse bg-green-100 dark:bg-green-900/30"
      )}
      onClick={() => setIsEditing(true)}
      title={hasRate ? "Click to edit AI Rate" : "Click to add AI Rate or use 'Suggest Rates' button"}
    >
      {/* Sparkle icon for AI rates */}
      {hasRate && (
        <Sparkles className={cn(
          "w-3 h-3",
          showConfirmation ? "text-green-500 animate-bounce" : "text-purple-400"
        )} />
      )}
      
      <span className={cn(
        "text-sm font-medium",
        showConfirmation && "text-green-600 dark:text-green-400"
      )}>
        {hasRate 
          ? currentRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
          : '-'
        }
      </span>
      
      {/* Edit icon */}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      
      {/* Confirmation checkmark */}
      {showConfirmation && (
        <div className="absolute -right-1 -top-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

export const EditableAIRate = memo(EditableAIRateComponent, (prev, next) =>
  prev.itemNumber === next.itemNumber &&
  prev.currentRate === next.currentRate &&
  prev.isLoading === next.isLoading &&
  prev.isApplied === next.isApplied
);
