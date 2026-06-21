import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LockBadge({ locked, label }: { locked: boolean; label?: string }) {
  if (!locked) {
    return (
      <Badge variant="outline" className="gap-1">
        <Unlock className="h-3 w-3" /> {label ?? "Editable"}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <Lock className="h-3 w-3" /> {label ?? "Locked"}
    </Badge>
  );
}
