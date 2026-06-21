import { supabase } from "@/integrations/supabase/client";

export type FinancialEntityType =
  | "progress_certificate"
  | "contract_payment"
  | "procurement_item"
  | "contract"
  | "contract_variation"
  | "item_cost"
  | "boq_price";

export interface FinancialAuditEntry {
  entity_type: FinancialEntityType;
  entity_id: string;
  action: string; // create | update | approve | lock | unlock | delete | reject
  project_id?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function logFinancialAction(entry: FinancialAuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("financial_audit_logs" as any).insert({
      user_id: user.id,
      project_id: entry.project_id ?? null,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.warn("[audit] failed to log", err);
  }
}

export async function fetchAuditTrail(entity_type: FinancialEntityType, entity_id: string) {
  const { data, error } = await supabase
    .from("financial_audit_logs" as any)
    .select("*")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
