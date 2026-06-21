import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

type Notice = {
  id: string;
  title: string;
  description?: string;
  to?: string;
  ts: string;
};

/**
 * Lightweight notifications center. Derives notices from existing tables:
 *  - Open risks (severity high/critical)
 *  - Contracts ending within 30 days
 *  - Pending procurement items
 * Read-only — no new tables.
 */
export function NotificationsPopover() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Notice[]> => {
      const notices: Notice[] = [];

      try {
        const { data: risks } = await (supabase as any)
          .from("risks")
          .select("id,title,severity,updated_at")
          .in("severity", ["high", "critical"])
          .order("updated_at", { ascending: false })
          .limit(5);
        risks?.forEach((r: any) =>
          notices.push({
            id: `risk-${r.id}`,
            title: isArabic ? `مخاطرة عالية: ${r.title}` : `High risk: ${r.title}`,
            to: "/risk",
            ts: r.updated_at,
          })
        );
      } catch {}

      try {
        const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id,contract_name,end_date")
          .lte("end_date", in30)
          .order("end_date", { ascending: true })
          .limit(5);
        contracts?.forEach((c: any) =>
          notices.push({
            id: `contract-${c.id}`,
            title: isArabic
              ? `عقد ينتهي قريبًا: ${c.contract_name}`
              : `Contract ending soon: ${c.contract_name}`,
            to: "/contracts",
            ts: c.end_date,
          })
        );
      } catch {}

      try {
        const { count } = await supabase
          .from("procurement_items")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (count && count > 0) {
          notices.push({
            id: "proc-pending",
            title: isArabic
              ? `${count} طلب شراء بانتظار المراجعة`
              : `${count} procurement items pending review`,
            to: "/procurement",
            ts: new Date().toISOString(),
          });
        }
      } catch {}

      return notices.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 10);
    },
  });

  const count = data?.length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 z-50 bg-popover">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">
            {isArabic ? "الإشعارات" : "Notifications"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count > 0
              ? isArabic
                ? `${count} عنصر يحتاج الانتباه`
                : `${count} items need attention`
              : isArabic
              ? "لا توجد إشعارات جديدة"
              : "No new notifications"}
          </p>
        </div>
        <ScrollArea className="max-h-80">
          <div className="py-1">
            {(data ?? []).map((n) => (
              <Link
                key={n.id}
                to={n.to ?? "#"}
                className="block px-4 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <p className="text-sm text-foreground truncate">{n.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(n.ts), {
                    addSuffix: true,
                    locale: isArabic ? ar : enUS,
                  })}
                </p>
              </Link>
            ))}
            {count === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {isArabic ? "كل شيء على ما يرام" : "All clear"}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
