import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, FileSignature, FileText, Wallet, Truck, Package, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface ActivityEvent {
  id: string;
  ts: string;
  icon: any;
  category: string;
  title: string;
  href: string;
  amount?: number;
}

/**
 * Cross-module recent activity feed: shows the latest 15 events across
 * contracts, certificates, payments, and procurement.
 */
export function RecentActivityFeed() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [contracts, certs, payments, procurement] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, contract_title, created_at, contract_value")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("progress_certificates")
          .select("id, certificate_number, created_at, total_amount")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("contract_payments")
          .select("id, description, amount, updated_at, status")
          .eq("user_id", user.id)
          .eq("status", "paid")
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase
          .from("procurement_items")
          .select("id, description, boq_item_number, updated_at, status")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);

      const out: ActivityEvent[] = [];

      (contracts.data || []).forEach((c: any) => out.push({
        id: `c-${c.id}`, ts: c.created_at, icon: FileSignature,
        category: isArabic ? "عقد جديد" : "New contract",
        title: c.contract_title, href: "/contracts",
        amount: Number(c.contract_value) || undefined,
      }));

      (certs.data || []).forEach((c: any) => out.push({
        id: `cert-${c.id}`, ts: c.created_at, icon: FileText,
        category: isArabic ? "مستخلص" : "Certificate",
        title: `#${c.certificate_number}`, href: "/progress-certificates",
        amount: Number(c.total_amount) || undefined,
      }));

      (payments.data || []).forEach((p: any) => out.push({
        id: `p-${p.id}`, ts: p.updated_at, icon: Wallet,
        category: isArabic ? "دفعة مسددة" : "Payment paid",
        title: p.description || (isArabic ? "دفعة عقد" : "Contract payment"),
        href: "/contracts", amount: Number(p.amount) || undefined,
      }));

      (procurement.data || []).forEach((pr: any) => {
        const isDelivered = pr.status === "delivered";
        out.push({
          id: `pr-${pr.id}`, ts: pr.updated_at,
          icon: isDelivered ? Package : Truck,
          category: isDelivered
            ? (isArabic ? "تم الاستلام" : "Delivered")
            : (isArabic ? "تحديث توريد" : "Procurement update"),
          title: `#${pr.boq_item_number} ${pr.description || ""}`.slice(0, 70),
          href: "/procurement",
        });
      });

      out.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      setEvents(out.slice(0, 15));
      setLoading(false);
    })();
  }, [user, isArabic]);

  const fmt = useMemo(
    () => new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }),
    [isArabic]
  );
  const locale = isArabic ? ar : enUS;

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          {isArabic ? "أحدث النشاط" : "Recent Activity"}
          <Badge variant="outline" className="ms-auto text-[10px]">{events.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isArabic ? "لا يوجد نشاط حديث." : "No recent activity."}
          </p>
        ) : (
          <ol className="relative space-y-2.5 ps-4 border-s border-border">
            {events.map((e) => {
              const Icon = e.icon;
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -start-[1.4rem] top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
                  <Link
                    to={e.href}
                    className="flex items-start gap-2 p-2 rounded-md border hover:bg-muted/40 transition-colors"
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        <span className="text-muted-foreground me-1.5">[{e.category}]</span>
                        {e.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(parseISO(e.ts), { addSuffix: true, locale })}
                        {e.amount ? ` · ${fmt.format(e.amount)} ${isArabic ? "ر.س" : "SAR"}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
