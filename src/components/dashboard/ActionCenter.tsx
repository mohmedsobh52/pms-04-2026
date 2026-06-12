import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, FileSignature, Wallet, Truck, ShieldAlert,
  ChevronRight, CheckCircle2, ListTodo,
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

type Severity = "critical" | "high" | "medium";

interface ActionItem {
  id: string;
  severity: Severity;
  icon: any;
  category: string;
  title: string;
  detail: string;
  href: string;
}

/**
 * Cross-module action center: aggregates time-sensitive items from contracts,
 * payments, procurement, and warranties into a single prioritized to-do list.
 */
export function ActionCenter() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    contracts: any[];
    payments: any[];
    procurement: any[];
    warranties: any[];
  }>({ contracts: [], payments: [], procurement: [], warranties: [] });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

      const [c, p, pr, w] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, contract_title, end_date, status")
          .eq("user_id", user.id)
          .not("end_date", "is", null)
          .lte("end_date", horizon)
          .neq("status", "completed")
          .neq("status", "terminated"),
        supabase
          .from("contract_payments")
          .select("id, contract_id, amount, due_date, status, description")
          .eq("user_id", user.id)
          .neq("status", "paid")
          .neq("status", "cancelled")
          .lte("due_date", horizon),
        supabase
          .from("procurement_items")
          .select("id, boq_item_number, description, delivery_date, lead_time_days, status")
          .eq("user_id", user.id)
          .neq("status", "delivered")
          .not("delivery_date", "is", null)
          .lte("delivery_date", horizon),
        supabase
          .from("contract_warranties")
          .select("id, warranty_type, expiry_date, status")
          .eq("user_id", user.id)
          .neq("status", "expired")
          .not("expiry_date", "is", null)
          .lte("expiry_date", horizon),
      ]);

      setData({
        contracts: c.data || [],
        payments: p.data || [],
        procurement: pr.data || [],
        warranties: w.data || [],
      });
      setLoading(false);
    })();
  }, [user]);

  const items = useMemo<ActionItem[]>(() => {
    const today = new Date();
    const out: ActionItem[] = [];
    const fmt = new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 });

    data.contracts.forEach((c: any) => {
      const days = differenceInDays(parseISO(c.end_date), today);
      const severity: Severity = days < 0 ? "critical" : days <= 30 ? "high" : "medium";
      out.push({
        id: `c-${c.id}`, severity, icon: FileSignature,
        category: isArabic ? "عقد" : "Contract",
        title: c.contract_title,
        detail: days < 0
          ? (isArabic ? `منتهٍ منذ ${Math.abs(days)} يوم` : `expired ${Math.abs(days)}d ago`)
          : (isArabic ? `ينتهي خلال ${days} يوم` : `expires in ${days}d`),
        href: "/contracts",
      });
    });

    data.payments.forEach((p: any) => {
      const days = differenceInDays(parseISO(p.due_date), today);
      const severity: Severity = days < 0 ? "critical" : days <= 14 ? "high" : "medium";
      out.push({
        id: `p-${p.id}`, severity, icon: Wallet,
        category: isArabic ? "دفعة" : "Payment",
        title: p.description || (isArabic ? "دفعة عقد" : "Contract payment"),
        detail: `${fmt.format(Number(p.amount))} · ${
          days < 0
            ? (isArabic ? `متأخرة ${Math.abs(days)}ي` : `${Math.abs(days)}d overdue`)
            : (isArabic ? `خلال ${days}ي` : `in ${days}d`)
        }`,
        href: "/contracts",
      });
    });

    data.procurement.forEach((pr: any) => {
      const days = differenceInDays(parseISO(pr.delivery_date), today);
      const lead = pr.lead_time_days || 0;
      const severity: Severity = days < 0 ? "critical" : days - lead < 0 ? "high" : "medium";
      out.push({
        id: `pr-${pr.id}`, severity, icon: Truck,
        category: isArabic ? "توريد" : "Procurement",
        title: `#${pr.boq_item_number} ${pr.description || ""}`.slice(0, 80),
        detail: days < 0
          ? (isArabic ? `متأخر ${Math.abs(days)}ي` : `${Math.abs(days)}d late`)
          : (isArabic ? `تسليم خلال ${days}ي (مهلة ${lead}ي)` : `delivery in ${days}d (lead ${lead}d)`),
        href: "/procurement",
      });
    });

    data.warranties.forEach((w: any) => {
      const days = differenceInDays(parseISO(w.expiry_date), today);
      const severity: Severity = days < 0 ? "critical" : days <= 30 ? "high" : "medium";
      out.push({
        id: `w-${w.id}`, severity, icon: ShieldAlert,
        category: isArabic ? "ضمان" : "Warranty",
        title: w.warranty_type,
        detail: days < 0
          ? (isArabic ? `منتهٍ منذ ${Math.abs(days)}ي` : `expired ${Math.abs(days)}d ago`)
          : (isArabic ? `ينتهي خلال ${days}ي` : `expires in ${days}d`),
        href: "/contracts",
      });
    });

    const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
    return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [data, isArabic]);

  const counts = useMemo(() => ({
    critical: items.filter((i) => i.severity === "critical").length,
    high: items.filter((i) => i.severity === "high").length,
    medium: items.filter((i) => i.severity === "medium").length,
  }), [items]);

  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 6);

  if (loading) {
    return <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          {isArabic ? "مركز الإجراءات" : "Action Center"}
          <Badge variant="outline" className="ms-auto text-[10px]">
            {items.length} {isArabic ? "بند" : "items"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5">
            <div className="text-xs text-muted-foreground">
              {isArabic ? "حرج" : "Critical"}
            </div>
            <p className="text-lg font-bold text-red-600">{counts.critical}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
            <div className="text-xs text-muted-foreground">
              {isArabic ? "عاجل" : "High"}
            </div>
            <p className="text-lg font-bold text-amber-600">{counts.high}</p>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
            <div className="text-xs text-muted-foreground">
              {isArabic ? "متوسط" : "Medium"}
            </div>
            <p className="text-lg font-bold text-blue-600">{counts.medium}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 p-3 rounded-md bg-emerald-500/5">
            <CheckCircle2 className="w-4 h-4" />
            {isArabic ? "لا توجد إجراءات عاجلة. عمل ممتاز!" : "No urgent actions. All clear!"}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((i) => {
              const Icon = i.icon;
              const color =
                i.severity === "critical" ? "border-red-500/30 hover:bg-red-500/5"
                : i.severity === "high" ? "border-amber-500/30 hover:bg-amber-500/5"
                : "border-blue-500/30 hover:bg-blue-500/5";
              const iconColor =
                i.severity === "critical" ? "text-red-600"
                : i.severity === "high" ? "text-amber-600"
                : "text-blue-600";
              return (
                <Link
                  key={i.id}
                  to={i.href}
                  className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${color}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      <span className="text-muted-foreground me-1.5">[{i.category}]</span>
                      {i.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{i.detail}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {items.length > 6 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? (isArabic ? "عرض أقل" : "Show less")
              : (isArabic ? `عرض الكل (${items.length})` : `Show all (${items.length})`)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
