import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Edit3, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Props {
  projectId: string;
}

/**
 * BOQ version panel — lists baselines as snapshots and recent price edits.
 * All real data from cost_control_baselines + edited_boq_prices.
 */
export function BoqVersionPanel({ projectId }: Props) {
  const { isArabic } = useLanguage();

  const { data: baselines, isLoading: bL } = useQuery({
    queryKey: ["boq-baselines", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cost_control_baselines")
        .select("id,name,notes,is_active,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: edits, isLoading: eL } = useQuery({
    queryKey: ["boq-edits", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("edited_boq_prices")
        .select("id,item_number,edited_unit_price,edited_total_price,updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            {isArabic ? "الإصدارات (Baselines)" : "Baselines"}
          </h3>
          {bL ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (baselines ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isArabic ? "لا توجد إصدارات محفوظة" : "No baselines saved"}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {baselines!.map((b: any) => (
                <li
                  key={b.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/60 text-sm"
                >
                  <span className="flex-1 truncate">{b.name}</span>
                  {b.is_active && (
                    <Badge variant="secondary" className="text-[10px]">
                      {isArabic ? "نشط" : "Active"}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(b.created_at), {
                      addSuffix: true,
                      locale: isArabic ? ar : enUS,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
            {isArabic ? "آخر تعديلات الأسعار" : "Recent Price Edits"}
          </h3>
          {eL ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (edits ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isArabic ? "لا توجد تعديلات" : "No edits"}
            </p>
          ) : (
            <ul className="space-y-1">
              {edits!.map((e: any) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 text-xs py-1 border-b border-border/40"
                >
                  <span className="font-mono text-muted-foreground w-16 truncate">
                    {e.item_number}
                  </span>
                  <span className="flex-1 tabular-nums">
                    {Number(e.edited_unit_price ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(e.updated_at), {
                      addSuffix: true,
                      locale: isArabic ? ar : enUS,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
