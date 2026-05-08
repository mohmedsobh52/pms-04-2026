// Web Worker for heavy EVM recalculations.
// Receives base activities + overrides, returns recomputed activities.

export interface EVMBase {
  sn: number;
  pv: number;
  progress: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac1: number;
  eac2: number;
  eac3: number;
  eacByPert: number;
  etc: number;
  tcpi: number;
  [k: string]: any;
}

export type Override = { progress?: number; ac?: number };

export function recomputeActivities(
  base: EVMBase[],
  overrides: Record<number, Override>,
): EVMBase[] {
  return base.map((a) => {
    const ov = overrides[a.sn];
    if (!ov) return a;
    const progress = ov.progress ?? a.progress;
    const ac = ov.ac ?? a.ac;
    const ev = a.pv * (progress / 100);
    const cv = ev - ac;
    const sv = ev - a.pv;
    const cpi = ac > 0 ? ev / ac : 0;
    const spi = a.pv > 0 ? ev / a.pv : 0;
    const bac = a.pv;
    const eac1 = cpi > 0 ? bac / cpi : bac;
    const eac2 = ac + (bac - ev);
    const eac3 = cpi > 0 && spi > 0 ? ac + (bac - ev) / (cpi * spi) : bac;
    const eacByPert = (eac1 + 4 * eac2 + eac3) / 6;
    const etc = eacByPert - ac;
    const tcpi = bac - ev > 0 ? (bac - ev) / (bac - ac) : 0;
    return { ...a, progress, ev, ac, cv, sv, cpi, spi, eac1, eac2, eac3, eacByPert, etc, tcpi };
  });
}

// Worker bootstrap (only runs in worker context)
declare const self: Worker;
if (typeof self !== "undefined" && typeof (self as any).window === "undefined") {
  self.onmessage = (e: MessageEvent) => {
    const { base, overrides, requestId } = e.data || {};
    try {
      const result = recomputeActivities(base, overrides);
      self.postMessage({ requestId, result });
    } catch (err: any) {
      self.postMessage({ requestId, error: String(err?.message || err) });
    }
  };
}
