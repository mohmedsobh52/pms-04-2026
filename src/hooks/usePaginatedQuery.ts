import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Filter = { column: string; op: "eq" | "ilike" | "gte" | "lte"; value: any };
type PaginatedOpts = {
  table: string;
  select?: string;
  filters?: Filter[];
  orderBy?: { column: string; ascending?: boolean };
  page: number;
  pageSize: number;
  enabled?: boolean;
};

export function usePaginatedQuery<T = any>(opts: PaginatedOpts) {
  const { table, select = "*", filters = [], orderBy, page, pageSize, enabled = true } = opts;
  return useQuery({
    enabled,
    queryKey: ["paginated", table, select, filters, orderBy, page, pageSize],
    queryFn: async () => {
      let q: any = supabase.from(table as any).select(select, { count: "exact" });
      for (const f of filters) q = (q as any)[f.op](f.column, f.value);
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as T[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
