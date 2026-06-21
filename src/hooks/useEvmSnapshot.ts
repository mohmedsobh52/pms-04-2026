import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EvmPoint = {
  date: string;
  pv: number; // planned value
  ev: number; // earned value
  ac: number; // actual cost
  cpi: number | null;
  spi: number | null;
};

export type EvmSnapshot = {
  bac: number; // budget at completion = total contract value
  pv: number;
  ev: number;
  ac: number;
  cv: number; // cost variance EV - AC
  sv: number; // schedule variance EV - PV
  cpi: number | null;
  spi: number | null;
  eac: number | null; // estimate at completion = BAC / CPI
  vac: number | null; // variance at completion = BAC - EAC
  percentComplete: number;
  series: EvmPoint[];
  hasData: boolean;
};

/**
 * EVM snapshot derived strictly from real DB data:
 *  - BAC: total of project_items.total_price (current contract baseline)
 *  - Time series: project_progress_history (real recorded progress over time)
 *  - Latest point drives PV/EV/AC/CPI/SPI; EAC = BAC/CPI; VAC = BAC - EAC.
 * Returns hasData=false when no progress history exists — UI must show "—".
 */
export function useEvmSnapshot(projectId: string | undefined) {
  return useQuery({
    queryKey: ["evm-snapshot", projectId],
    enabled: !!projectId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<EvmSnapshot> => {
      const empty: EvmSnapshot = {
        bac: 0, pv: 0, ev: 0, ac: 0, cv: 0, sv: 0,
        cpi: null, spi: null, eac: null, vac: null,
        percentComplete: 0, series: [], hasData: false,
      };
      if (!projectId) return empty;

      // BAC = sum(project_items.total_price)
      const { data: items } = await (supabase as any)
        .from("project_items")
        .select("total_price")
        .eq("project_id", projectId);
      const bac = (items ?? []).reduce(
        (s: number, r: any) => s + (Number(r.total_price) || 0),
        0
      );

      // Time series from real progress history
      const { data: hist } = await (supabase as any)
        .from("project_progress_history")
        .select(
          "record_date,actual_progress,planned_progress,actual_cost,cpi,spi"
        )
        .eq("project_id", projectId)
        .order("record_date", { ascending: true });

      const series: EvmPoint[] = (hist ?? []).map((r: any) => {
        const ev = bac * ((Number(r.actual_progress) || 0) / 100);
        const pv = bac * ((Number(r.planned_progress) || 0) / 100);
        const ac = Number(r.actual_cost) || 0;
        return {
          date: r.record_date,
          pv,
          ev,
          ac,
          cpi: r.cpi != null ? Number(r.cpi) : ac > 0 ? ev / ac : null,
          spi: r.spi != null ? Number(r.spi) : pv > 0 ? ev / pv : null,
        };
      });

      if (series.length === 0 || bac === 0) {
        return { ...empty, bac };
      }

      const last = series[series.length - 1];
      const cpi = last.cpi;
      const spi = last.spi;
      const eac = cpi && cpi > 0 ? bac / cpi : null;
      const vac = eac != null ? bac - eac : null;
      const percentComplete = bac > 0 ? (last.ev / bac) * 100 : 0;

      return {
        bac,
        pv: last.pv,
        ev: last.ev,
        ac: last.ac,
        cv: last.ev - last.ac,
        sv: last.ev - last.pv,
        cpi,
        spi,
        eac,
        vac,
        percentComplete,
        series,
        hasData: true,
      };
    },
  });
}
