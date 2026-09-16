import { supabase } from "@/integrations/supabase/client";

export interface PayrollEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  counterparty: string;
  entry_type: string; // contractor_payment | salary
  period_month: string; // YYYY-MM
  gross_amount: number;
  paid_amount: number;
  paid_date: string | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PAYROLL_TYPES = [
  { value: "contractor_payment", ar: "دفعة مقاول", en: "Contractor payment" },
  { value: "salary", ar: "راتب شهري", en: "Monthly salary" },
];

export const payrollTypeLabel = (v: string, isArabic: boolean) =>
  PAYROLL_TYPES.find((t) => t.value === v)?.[isArabic ? "ar" : "en"] ?? v;

export const currentMonthKey = () => new Date().toISOString().slice(0, 7);

/** Load all payroll / contractor payment entries for the signed-in user. */
export async function loadPayroll(): Promise<PayrollEntry[]> {
  const { data, error } = await (supabase.from("payroll_entries") as any)
    .select("*")
    .order("period_month", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PayrollEntry[];
}

export interface PayrollBucket {
  key: string;
  label: string;
  count: number;
  gross: number;
  paid: number;
  outstanding: number;
  salaries: number;
  contractorPayments: number;
}

export function aggregatePayroll(
  entries: PayrollEntry[],
  keyOf: (e: PayrollEntry) => { key: string; label: string } | null,
): PayrollBucket[] {
  const map = new Map<string, PayrollBucket>();
  for (const e of entries) {
    const k = keyOf(e);
    if (!k) continue;
    const b = map.get(k.key) ?? {
      key: k.key, label: k.label, count: 0, gross: 0, paid: 0,
      outstanding: 0, salaries: 0, contractorPayments: 0,
    };
    const gross = Number(e.gross_amount || 0);
    const paid = Number(e.paid_amount || 0);
    b.count += 1;
    b.gross += gross;
    b.paid += paid;
    b.outstanding += Math.max(0, gross - paid);
    if (e.entry_type === "salary") b.salaries += paid;
    else b.contractorPayments += paid;
    map.set(k.key, b);
  }
  return Array.from(map.values());
}

export const payrollByContractor = (e: PayrollEntry[]) =>
  aggregatePayroll(e, (x) => ({ key: x.counterparty || "—", label: x.counterparty || "—" }));

export const payrollByMonth = (e: PayrollEntry[]) =>
  aggregatePayroll(e, (x) => ({ key: x.period_month, label: x.period_month }))
    .sort((a, b) => a.key.localeCompare(b.key));

export const payrollByProject = (e: PayrollEntry[], names: Map<string, string>) =>
  aggregatePayroll(e, (x) => ({
    key: x.project_id ?? "none",
    label: x.project_id ? names.get(x.project_id) ?? "—" : "—",
  }));
