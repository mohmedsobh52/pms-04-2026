/**
 * Internal RLS / project-save error log.
 * Stores recent failures in localStorage with a short reference ID
 * the user can share with support.
 */

const STORAGE_KEY = "rls_error_log_v1";
const MAX_ENTRIES = 50;

export interface RlsErrorEntry {
  ref: string;
  timestamp: string;
  table?: string;
  message: string;
  userId?: string | null;
  projectId?: string | null;
  context?: Record<string, unknown>;
}

function genRef(): string {
  // Short, human-friendly: ERR-XXXXXX
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  return `ERR-${t}${rnd}`;
}

function readAll(): RlsErrorEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: RlsErrorEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore quota errors
  }
}

export function logRlsError(input: Omit<RlsErrorEntry, "ref" | "timestamp">): RlsErrorEntry {
  const entry: RlsErrorEntry = {
    ref: genRef(),
    timestamp: new Date().toISOString(),
    ...input,
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  // Also surface in console for developers
  // eslint-disable-next-line no-console
  console.error("[RLS_LOG]", entry);
  return entry;
}

export function getRlsErrorLog(): RlsErrorEntry[] {
  return readAll();
}

export function clearRlsErrorLog() {
  writeAll([]);
}
