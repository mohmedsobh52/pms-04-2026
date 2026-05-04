/**
 * Audit log for Advanced Analysis save attempts.
 * - Writes immediately to localStorage (fast, offline-resilient)
 * - Asynchronously persists to the analysis_audit_logs table for archival
 *
 * Failures of the remote write are swallowed: the local log remains the
 * source of truth and we never want auditing itself to break the UX.
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "analysis_audit_log_v1";
const MAX_LOCAL_ENTRIES = 200;

export type AuditAction =
  | "inline_edit"
  | "price_update"
  | "quantity_update"
  | "unit_update"
  | "delete_item"
  | "clear_price";

export type AuditStatus = "success" | "failure";

export interface AuditEntry {
  ref: string;
  timestamp: string;
  userId?: string | null;
  projectId?: string | null;
  projectItemId?: string | null;
  itemNumber?: string | null;
  action: AuditAction;
  status: AuditStatus;
  attempts: number;
  changedFields?: Record<string, unknown>;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

function genRef(): string {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  return `AUD-${t}${rnd}`;
}

function readLocal(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: AuditEntry[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_LOCAL_ENTRIES)),
    );
  } catch {
    // ignore quota errors
  }
}

async function persistRemote(entry: AuditEntry): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = entry.userId ?? auth?.user?.id;
    if (!userId) return; // anonymous — keep local only

    await supabase.from("analysis_audit_logs" as any).insert({
      user_id: userId,
      project_id: entry.projectId ?? null,
      project_item_id: entry.projectItemId ?? null,
      item_number: entry.itemNumber ?? null,
      action: entry.action,
      status: entry.status,
      attempts: entry.attempts,
      changed_fields: entry.changedFields ?? null,
      previous_values: entry.previousValues ?? null,
      new_values: entry.newValues ?? null,
      error_code: entry.errorCode ?? null,
      error_message: entry.errorMessage ?? null,
      client_ref: entry.ref,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // best-effort; don't block UX on audit failures
  }
}

export function logAudit(
  input: Omit<AuditEntry, "ref" | "timestamp">,
): AuditEntry {
  const entry: AuditEntry = {
    ref: genRef(),
    timestamp: new Date().toISOString(),
    ...input,
  };
  const all = readLocal();
  all.push(entry);
  writeLocal(all);
  // Fire-and-forget remote write
  void persistRemote(entry);
  // eslint-disable-next-line no-console
  if (entry.status === "failure") console.warn("[AUDIT]", entry);
  return entry;
}

export function getAuditLog(): AuditEntry[] {
  return readLocal();
}

export function clearAuditLog() {
  writeLocal([]);
}
