import { useEffect, useMemo, useRef, useState } from "react";
import { recomputeActivities, type EVMBase, type Override } from "@/lib/evm-worker";

/**
 * Runs EVM recalculation in a Web Worker when supported (large datasets),
 * falls back to inline calc for small lists or environments without Worker.
 */
export function useEvmWorker(base: EVMBase[], overrides: Record<number, Override>) {
  const [result, setResult] = useState<EVMBase[]>(() => recomputeActivities(base, overrides));
  const workerRef = useRef<Worker | null>(null);
  const reqRef = useRef(0);

  // Only spin up a worker when dataset is non-trivial.
  const useWorker = base.length > 200 && typeof Worker !== "undefined";

  useEffect(() => {
    if (!useWorker) return;
    try {
      workerRef.current = new Worker(new URL("../lib/evm-worker.ts", import.meta.url), { type: "module" });
      workerRef.current.onmessage = (e: MessageEvent) => {
        const { requestId, result: r } = e.data || {};
        if (requestId === reqRef.current && r) setResult(r);
      };
    } catch {
      workerRef.current = null;
    }
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, [useWorker]);

  useEffect(() => {
    if (useWorker && workerRef.current) {
      const id = ++reqRef.current;
      workerRef.current.postMessage({ base, overrides, requestId: id });
    } else {
      setResult(recomputeActivities(base, overrides));
    }
  }, [base, overrides, useWorker]);

  return result;
}

/** Heatmap colour helper for performance indices (CPI/SPI). */
export function heatmapClass(value: number, warn: number, crit: number): string {
  if (!isFinite(value) || value === 0) return "bg-muted/30 text-muted-foreground";
  if (value < crit) return "bg-destructive/15 text-destructive font-semibold";
  if (value < warn) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium";
  if (value >= 1) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
  return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
}

/** Generic undo/redo stack for any serialisable state. */
export function useUndoRedo<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useState(0);

  const set = (next: T | ((prev: T) => T), opts?: { silent?: boolean }) => {
    setPresent((prev) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      if (!opts?.silent) {
        past.current.push(prev);
        future.current = [];
        if (past.current.length > 50) past.current.shift();
      }
      return value;
    });
    force((x) => x + 1);
  };

  const undo = () => {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push(present);
    setPresent(prev);
    force((x) => x + 1);
  };

  const redo = () => {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push(present);
    setPresent(next);
    force((x) => x + 1);
  };

  const reset = (value: T) => {
    past.current = [];
    future.current = [];
    setPresent(value);
    force((x) => x + 1);
  };

  return useMemo(
    () => ({
      state: present,
      set,
      undo,
      redo,
      reset,
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    }),
    [present],
  );
}
