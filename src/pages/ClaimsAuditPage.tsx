import { useCallback, useEffect, useState } from "react";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { ClaimsPageHeader } from "@/components/claims/ClaimsNav";
import { ClaimAuditTrail, AuditRow } from "@/components/claims/ClaimAuditTrail";
import { Claim } from "@/lib/claims";

export default function ClaimsAuditPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data: claims } = await supabase
      .from("claims")
      .select("id, claim_number, title")
      .order("created_at", { ascending: false });
    const list = (claims || []) as unknown as Pick<Claim, "id" | "claim_number" | "title">[];
    const map = new Map(list.map((c) => [c.id, c]));
    if (list.length === 0) { setRows([]); setLoading(false); return; }

    const { data: events } = await (supabase.from("claim_events") as any)
      .select("*")
      .in("claim_id", list.map((c) => c.id))
      .order("created_at", { ascending: false })
      .limit(2000);

    setRows(
      ((events || []) as AuditRow[]).map((e) => ({
        ...e,
        claim_number: map.get(e.claim_id)?.claim_number,
        claim_title: map.get(e.claim_id)?.title,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageLayout>
      <div className="space-y-4">
        <ClaimsPageHeader
          icon={History}
          title={isArabic ? "سجل تدقيق المطالبات" : "Claims audit trail"}
          subtitle={isArabic
            ? "كل الإجراءات على المطالبات مع التصفية حسب المستخدم والإجراء والوقت"
            : "Every claim action, filterable by user, action and time"}
          actions={
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />{isArabic ? "تحديث" : "Refresh"}
            </Button>
          }
        />
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {isArabic ? "جاري التحميل..." : "Loading..."}
              </p>
            ) : (
              <ClaimAuditTrail events={rows} showClaim />
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
