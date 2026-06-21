import { useEffect, useState, useCallback } from "react";
import { getRates, convert, formatMoney } from "@/lib/currency";

export function useCurrency(displayCurrency: string = "USD") {
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getRates().then((r) => { if (alive) { setRates(r); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const normalize = useCallback(
    (amount: number, from: string) => convert(amount, from || displayCurrency, displayCurrency, rates),
    [rates, displayCurrency]
  );
  const format = useCallback(
    (amount: number, from?: string) => formatMoney(from ? normalize(amount, from) : amount, displayCurrency),
    [normalize, displayCurrency]
  );

  return { rates, loading, normalize, format, displayCurrency };
}
