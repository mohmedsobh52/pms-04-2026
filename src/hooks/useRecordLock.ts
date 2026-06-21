import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logFinancialAction, FinancialEntityType } from "@/lib/financial-audit";

export function useRecordLock(entityType: FinancialEntityType, entityId?: string | null) {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lockMeta, setLockMeta] = useState<any>(null);

  const refresh = useCallback(async () => {
    if (!entityId) { setLocked(false); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("record_locks" as any)
      .select("*").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle();
    setLocked(!!data);
    setLockMeta(data ?? null);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { refresh(); }, [refresh]);

  const lock = useCallback(async (reason?: string) => {
    if (!entityId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("record_locks" as any).insert({
      entity_type: entityType, entity_id: entityId, locked_by: user.id, reason: reason ?? "Approved",
    });
    await logFinancialAction({ entity_type: entityType, entity_id: entityId, action: "lock", metadata: { reason } });
    await refresh();
  }, [entityType, entityId, refresh]);

  const unlock = useCallback(async () => {
    if (!entityId) return;
    await supabase.from("record_locks" as any).delete()
      .eq("entity_type", entityType).eq("entity_id", entityId);
    await logFinancialAction({ entity_type: entityType, entity_id: entityId, action: "unlock" });
    await refresh();
  }, [entityType, entityId, refresh]);

  return { locked, loading, lockMeta, lock, unlock, refresh };
}
