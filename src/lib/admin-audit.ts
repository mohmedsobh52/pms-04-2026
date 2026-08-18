import { supabase } from "@/integrations/supabase/client";

/** Admin dashboard actions worth recording in the audit trail. */
export type AdminAuditAction =
  | "admin_dashboard_refresh"
  | "admin_dashboard_export_pdf"
  | "admin_dashboard_filter_change"
  | "admin_report_sent"
  | "admin_role_assigned"
  | "admin_role_updated"
  | "admin_role_removed"
  | "admin_settings_saved";

export interface AdminAuditEntry {
  action: AdminAuditAction;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort audit logging for admin dashboard operations.
 * Never throws — auditing must not break the UI flow.
 */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("financial_audit_logs" as any).insert({
      user_id: user.id,
      entity_type: "admin_dashboard",
      entity_id: entry.entityId ?? null,
      action: entry.action,
      metadata: entry.metadata ?? null,
    });

  } catch (err) {
    console.warn("[admin-audit] failed to log", err);
  }
}
