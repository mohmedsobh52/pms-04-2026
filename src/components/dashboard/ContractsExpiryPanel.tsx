import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSignature, ChevronRight, CalendarClock } from "lucide-react";
import { computeContractExpiryAlert } from "@/lib/contract-alerts";

interface ContractRow {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  end_date: string | null;
  status: string | null;
}

const levelStyle: Record<string, string> = {
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  "30": "bg-destructive/15 text-destructive border-destructive/30",
  "60": "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  "90": "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
};

export const ContractsExpiryPanel = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [rows, setRows] = useState<Array<ContractRow & { _days: number; _level: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return setLoading(false);
      const { data } = await supabase
        .from("contracts")
        .select("id,contract_number,contract_title,contractor_name,end_date,status")
        .eq("user_id", user.id)
        .not("end_date", "is", null)
        .neq("status", "closed")
        .neq("status", "terminated");
      if (cancelled) return;
      const mapped = (data || [])
        .map((c) => {
          const a = computeContractExpiryAlert(c.end_date);
          return { ...c, _days: a?.daysRemaining ?? 9999, _level: a?.level ?? "none" };
        })
        .filter((c) => c._level !== "none")
        .sort((a, b) => a._days - b._days)
        .slice(0, 5);
      setRows(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border/60">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-orange-500" />
          {isArabic ? "عقود قاربت على الانتهاء" : "Contracts Expiring Soon"}
        </CardTitle>
        <Link to="/contracts" className="text-xs text-primary hover:underline flex items-center gap-1">
          {isArabic ? "عرض الكل" : "View all"}
          <ChevronRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : rows.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <FileSignature className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {isArabic ? "لا توجد عقود قاربت على الانتهاء" : "No contracts nearing expiry"}
          </div>
        ) : (
          rows.map((c) => (
            <Link
              key={c.id}
              to="/contracts"
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.contract_title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.contract_number} • {c.contractor_name || "—"}
                </p>
              </div>
              <Badge variant="outline" className={`shrink-0 ${levelStyle[c._level] || ""}`}>
                {c._level === "expired"
                  ? isArabic ? "منتهٍ" : "Expired"
                  : isArabic ? `${c._days} يوم` : `${c._days}d`}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
};
