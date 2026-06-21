import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { fetchAuditTrail, FinancialEntityType } from "@/lib/financial-audit";
import { History } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: FinancialEntityType;
  entityId?: string | null;
  title?: string;
}

export function AuditTrailDrawer({ open, onOpenChange, entityType, entityId, title }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entityId) return;
    setLoading(true);
    fetchAuditTrail(entityType, entityId).then((d) => { setEntries(d); setLoading(false); });
  }, [open, entityType, entityId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {title ?? "Audit Trail"}</SheetTitle>
          <SheetDescription>All financial actions on this record.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && entries.length === 0 && <p className="text-sm text-muted-foreground">No audit entries yet.</p>}
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="capitalize">{e.action}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                {e.metadata && (
                  <pre className="text-xs bg-muted/50 rounded p-2 mt-1 overflow-x-auto">
                    {JSON.stringify(e.metadata, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
