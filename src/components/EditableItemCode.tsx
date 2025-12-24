import { useState, useEffect, useRef } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditableItemCodeProps {
  itemNumber: string;
  code: string;
  onSave: (itemNumber: string, code: string) => void;
}

export function EditableItemCode({ itemNumber, code, onSave }: EditableItemCodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(code);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(code);
  }, [code]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(itemNumber, editValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(code);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 w-24 text-xs font-mono px-2"
          placeholder="Enter code"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-success hover:text-success"
          onClick={handleSave}
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={handleCancel}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-1 cursor-pointer group",
        !code && "text-muted-foreground"
      )}
      onClick={() => setIsEditing(true)}
      title={code ? `كود البند: ${code}` : "انقر لإضافة كود البند"}
    >
      <span className={cn(
        "text-xs font-mono px-2 py-1 rounded transition-colors",
        code 
          ? "bg-primary/20 text-primary font-semibold border border-primary/30" 
          : "bg-muted/50 text-muted-foreground hover:bg-muted border border-dashed border-muted-foreground/30"
      )}>
        {code || "—"}
      </span>
      <Edit2 className={cn(
        "w-3 h-3 transition-opacity",
        code ? "opacity-0 group-hover:opacity-70" : "opacity-30 group-hover:opacity-70"
      )} />
    </div>
  );
}
