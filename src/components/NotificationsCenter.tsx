import { useEffect, useState } from "react";
import { Bell, AlertTriangle, FileText, ShieldAlert, Clock, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface NotificationItem {
  id: string;
  type: "contract" | "certificate" | "risk" | "overdue";
  title: string;
  description: string;
  date: Date;
  href: string;
}

export function NotificationsCenter() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("notif_dismissed") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const in60 = new Date(now.getTime() + 60 * 86400 * 1000).toISOString();
      const sb = supabase as any;
      const [contracts, certs, risks] = await Promise.all([
        sb.from("contracts")
          .select("id,contract_number,project_name,end_date")
          .eq("user_id", user.id)
          .lte("end_date", in60)
          .gte("end_date", now.toISOString())
          .limit(10),
        sb.from("progress_certificates")
          .select("id,certificate_number,project_name,status,created_at")
          .eq("user_id", user.id)
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(10),
        sb.from("risks")
          .select("id,title,severity,created_at")
          .eq("user_id", user.id)
          .in("severity", ["high", "critical"])
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;
      const next: NotificationItem[] = [];
      contracts.data?.forEach((c: any) => {
        next.push({
          id: `contract-${c.id}`,
          type: "contract",
          title: isArabic ? `عقد يقترب من الانتهاء` : `Contract ending soon`,
          description: `${c.contract_number ?? ""} — ${c.project_name ?? ""}`,
          date: new Date(c.end_date),
          href: "/contracts",
        });
      });
      certs.data?.forEach((c: any) => {
        next.push({
          id: `cert-${c.id}`,
          type: "certificate",
          title: isArabic ? `مستخلص في حالة مسودة` : `Draft certificate`,
          description: `${c.certificate_number ?? ""} — ${c.project_name ?? ""}`,
          date: new Date(c.created_at),
          href: "/progress-certificates",
        });
      });
      risks.data?.forEach((r: any) => {
        next.push({
          id: `risk-${r.id}`,
          type: "risk",
          title: isArabic ? `مخاطرة بمستوى ${r.severity}` : `${r.severity} risk`,
          description: r.title,
          date: new Date(r.created_at),
          href: "/risk",
        });
      });
      next.sort((a, b) => b.date.getTime() - a.date.getTime());
      setItems(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isArabic]);

  const visible = items.filter((i) => !dismissed.has(i.id));
  const persistDismiss = (next: Set<string>) => {
    setDismissed(next);
    localStorage.setItem("notif_dismissed", JSON.stringify(Array.from(next)));
  };
  const markAllRead = () => {
    const next = new Set(dismissed);
    visible.forEach((v) => next.add(v.id));
    persistDismiss(next);
  };
  const iconFor = (t: NotificationItem["type"]) => {
    switch (t) {
      case "contract": return <Clock className="h-4 w-4 text-amber-500" />;
      case "certificate": return <FileText className="h-4 w-4 text-sky-500" />;
      case "risk": return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {visible.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full bg-rose-500 text-white border-0">
              {visible.length > 99 ? "99+" : visible.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">{isArabic ? "الإشعارات" : "Notifications"}</h4>
          {visible.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3" />
              {isArabic ? "تعليم الكل كمقروء" : "Mark all read"}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {isArabic ? "لا توجد إشعارات حالياً" : "No notifications"}
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => navigate(n.href)}
                    className="w-full text-start flex gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">{iconFor(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(n.date, { addSuffix: true, locale: isArabic ? ar : enUS })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
