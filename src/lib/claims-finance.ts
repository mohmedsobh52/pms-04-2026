import { supabase } from "@/integrations/supabase/client";
import { Claim, CLOSED_STATUSES } from "@/lib/claims";

export interface FinanceClaim extends Claim {
  projectName: string;
}

export const RECEIVED_STATUSES = ["approved", "partially_approved", "closed"];

/** Load claims + linked saved project names in one go. */
export async function loadClaimsFinance(): Promise<FinanceClaim[]> {
  const [{ data: claims }, { data: projects }] = await Promise.all([
    (supabase.from("claims") as any).select("*").order("created_at", { ascending: false }),
    supabase.from("saved_projects").select("id,name"),
  ]);
  const names = new Map<string, string>((projects ?? []).map((p: any) => [p.id, p.name]));
  return ((claims ?? []) as Claim[]).map((c) => ({
    ...c,
    projectName: c.project_id ? names.get(c.project_id) ?? "—" : "—",
  }));
}

export const isOpenClaim = (c: Claim) => !CLOSED_STATUSES.includes(c.status);
export const isReceived = (c: Claim) =>
  RECEIVED_STATUSES.includes(c.status) && Number(c.approved_amount || 0) > 0;

export function isOverdue(c: Claim) {
  if (!isOpenClaim(c) || !c.response_due_date) return false;
  const due = new Date(`${c.response_due_date}T00:00:00`).getTime();
  return due < Date.now();
}

/** Reference date used for period grouping. */
export function claimPeriodDate(c: Claim): Date | null {
  const raw = c.resolved_date || c.submitted_date || c.created_at || null;
  if (!raw) return null;
  const d = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export interface FinanceBucket {
  key: string;
  label: string;
  count: number;
  claimed: number;
  approved: number;
  received: number;
  due: number;
  overdue: number;
  overdueCount: number;
  openCount: number;
  closedCount: number;
  collectionRate: number; // received / claimed
}

function emptyBucket(key: string, label: string): FinanceBucket {
  return {
    key, label, count: 0, claimed: 0, approved: 0, received: 0, due: 0,
    overdue: 0, overdueCount: 0, openCount: 0, closedCount: 0, collectionRate: 0,
  };
}

export function aggregate(claims: FinanceClaim[], keyOf: (c: FinanceClaim) => { key: string; label: string } | null) {
  const map = new Map<string, FinanceBucket>();
  for (const c of claims) {
    const k = keyOf(c);
    if (!k) continue;
    const b = map.get(k.key) ?? emptyBucket(k.key, k.label);
    const claimed = Number(c.claimed_amount || 0);
    const approved = Number(c.approved_amount || 0);
    b.count += 1;
    b.claimed += claimed;
    b.approved += approved;
    if (isReceived(c)) b.received += approved;
    if (isOpenClaim(c)) {
      b.openCount += 1;
      b.due += claimed;
      if (isOverdue(c)) { b.overdue += claimed; b.overdueCount += 1; }
    } else {
      b.closedCount += 1;
    }
    map.set(k.key, b);
  }
  const out = Array.from(map.values());
  out.forEach((b) => { b.collectionRate = b.claimed > 0 ? (b.received / b.claimed) * 100 : 0; });
  return out;
}

export const byProject = (claims: FinanceClaim[]) =>
  aggregate(claims, (c) => ({ key: c.project_id ?? "none", label: c.projectName || "—" }));

export const byContractor = (claims: FinanceClaim[]) =>
  aggregate(claims, (c) => ({ key: c.counterparty || "none", label: c.counterparty || "—" }));

export const byMonth = (claims: FinanceClaim[]) =>
  aggregate(claims, (c) => {
    const d = claimPeriodDate(c);
    return d ? { key: monthKey(d), label: monthKey(d) } : null;
  }).sort((a, b) => a.key.localeCompare(b.key));

export const byYear = (claims: FinanceClaim[]) =>
  aggregate(claims, (c) => {
    const d = claimPeriodDate(c);
    return d ? { key: String(d.getFullYear()), label: String(d.getFullYear()) } : null;
  }).sort((a, b) => a.key.localeCompare(b.key));

export interface FinanceTotals {
  claimed: number; approved: number; received: number; due: number; overdue: number;
  count: number; openCount: number; overdueCount: number; collectionRate: number;
}

export function totals(claims: FinanceClaim[]): FinanceTotals {
  const b = aggregate(claims, () => ({ key: "all", label: "all" }))[0];
  if (!b) return { claimed: 0, approved: 0, received: 0, due: 0, overdue: 0, count: 0, openCount: 0, overdueCount: 0, collectionRate: 0 };
  return {
    claimed: b.claimed, approved: b.approved, received: b.received, due: b.due,
    overdue: b.overdue, count: b.count, openCount: b.openCount,
    overdueCount: b.overdueCount, collectionRate: b.collectionRate,
  };
}

export const fmtMoney = (n: number, currency = "SAR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `${Math.round(n || 0).toLocaleString()} ${currency}`;
  }
};

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function bucketsCsv(buckets: FinanceBucket[], firstHeader: string, isArabic: boolean) {
  const headers = isArabic
    ? [firstHeader, "عدد المطالبات", "المطالب به", "المعتمد", "المُستلم", "المستحق", "المتأخر", "مفتوحة", "مغلقة", "نسبة التحصيل %"]
    : [firstHeader, "Claims", "Claimed", "Approved", "Received", "Due", "Overdue", "Open", "Closed", "Collection %"];
  const lines = [headers.map(esc).join(",")];
  buckets.forEach((b) => {
    lines.push([
      b.label, b.count, b.claimed, b.approved, b.received, b.due, b.overdue,
      b.openCount, b.closedCount, b.collectionRate.toFixed(1),
    ].map(esc).join(","));
  });
  return "\uFEFF" + lines.join("\n");
}

export function rowsCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "\uFEFF";
  const cols = Object.keys(rows[0]);
  const lines = [cols.map(esc).join(",")];
  rows.forEach((r) => lines.push(cols.map((c) => esc(r[c])).join(",")));
  return "\uFEFF" + lines.join("\n");
}
