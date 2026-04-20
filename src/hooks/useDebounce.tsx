import { useEffect, useState } from "react";

/**
 * Debounce a fast-changing value (e.g. search input) to reduce expensive
 * recomputations like filtering large tables on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
