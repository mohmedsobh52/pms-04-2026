import { supabase } from "@/integrations/supabase/client";

let cache: Record<string, number> | null = null;
let cacheAt = 0;

export async function getRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cacheAt < 5 * 60_000) return cache;
  const { data } = await supabase.from("currency_rates" as any).select("code,rate_to_usd");
  const map: Record<string, number> = { USD: 1 };
  (data ?? []).forEach((r: any) => { map[r.code] = Number(r.rate_to_usd) || 1; });
  cache = map;
  cacheAt = Date.now();
  return map;
}

export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (!from || !to || from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  const usd = amount * fromRate;
  return usd / toRate;
}

export function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
