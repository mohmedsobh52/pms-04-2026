import { useEffect, useState } from "react";
import { RiskManagement } from "@/components/RiskManagement";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

const RiskPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({ total: 0, high: 0, mitigated: 0, avgScore: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("risks")
        .select("risk_score, status")
        .eq("user_id", user.id);
      if (!data) return;
      const scores = data.map((r: any) => Number(r.risk_score) || 0);
      const high = data.filter((r: any) => (Number(r.risk_score) || 0) >= 15).length;
      const mitigated = data.filter((r: any) => r.status === "mitigated" || r.status === "closed").length;
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      setStats({ total: data.length, high, mitigated, avgScore: avg });
    })();
  }, [user]);

  const cards = [
    { icon: ShieldAlert, label: isArabic ? "إجمالي المخاطر" : "Total Risks", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
    { icon: AlertTriangle, label: isArabic ? "مخاطر عالية" : "High Risks", value: stats.high, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
    { icon: ShieldCheck, label: isArabic ? "تمت معالجتها" : "Mitigated", value: stats.mitigated, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Activity, label: isArabic ? "متوسط الخطورة" : "Avg Score", value: stats.avgScore, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    <p className={`text-base font-bold ${s.color} truncate`}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <RiskManagement />
      </div>
    </PageLayout>
  );
};

export default RiskPage;
