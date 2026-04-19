import { useEffect, useState } from "react";
import { ProcurementResourcesSchedule } from "@/components/ProcurementResourcesSchedule";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Building2, Package, FileText, Sparkles, Users, CheckCircle2, Star, FileSignature, DollarSign, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ExternalPartners,
  RequestOfferDialog,
  ProcurementContracts,
} from "@/components/procurement";
import { ColorLegend } from "@/components/ui/color-code";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ExternalPartner } from "@/components/procurement/PartnerCard";

const ProcurementPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [partners, setPartners] = useState<ExternalPartner[]>([]);
  const [extra, setExtra] = useState({ contracts: 0, contractsValue: 0, offers: 0 });

  useEffect(() => {
    if (user) {
      fetchPartners();
      (async () => {
        const [pc, off] = await Promise.all([
          supabase.from('partner_contracts').select('contract_value').eq('user_id', user.id),
          supabase.from('offer_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        setExtra({
          contracts: pc.data?.length || 0,
          contractsValue: (pc.data || []).reduce((s: number, r: any) => s + (Number(r.contract_value) || 0), 0),
          offers: off.count || 0,
        });
      })();
    }
  }, [user]);

  const fetchPartners = async () => {
    try {
      const { data } = await supabase
        .from("external_partners")
        .select("*")
        .eq("user_id", user?.id) as { data: ExternalPartner[] | null };
      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? "المشتريات" : "Procurement"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isArabic
                ? "إدارة الشركاء والمشتريات والعقود"
                : "Manage partners, procurement, and contracts"}
            </p>
          </div>

          <RequestOfferDialog>
            <Button
              type="button"
              className="relative z-[60] pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              <Sparkles className="w-4 h-4 me-2" />
              {isArabic ? "طلب عرض سعر" : "Request Offer"}
            </Button>
          </RequestOfferDialog>
        </div>

        {/* Quick Stats */}
        {(() => {
          const totalPartners = partners.length;
          const activePartners = partners.filter((p: any) => (p.status || "active") === "active").length;
          const ratings = partners.map((p: any) => Number(p.rating) || 0).filter((r) => r > 0);
          const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
          const itemsCount = analysisData?.items?.length || 0;
          const cards = [
            { icon: Users, label: isArabic ? "إجمالي الشركاء" : "Total Partners", value: String(totalPartners), color: "text-primary", bg: "bg-primary/10" },
            { icon: CheckCircle2, label: isArabic ? "شركاء نشطون" : "Active Partners", value: String(activePartners), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: Star, label: isArabic ? "متوسط التقييم" : "Avg Rating", value: avgRating, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
            { icon: Package, label: isArabic ? "بنود المشتريات" : "Procurement Items", value: String(itemsCount), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
            { icon: FileSignature, label: isArabic ? "عقود الشركاء" : "Partner Contracts", value: String(extra.contracts), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
            { icon: DollarSign, label: isArabic ? "قيمة العقود" : "Contracts Value", value: extra.contractsValue >= 1000 ? `${Math.round(extra.contractsValue / 1000)}K` : String(extra.contractsValue), color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
            { icon: Send, label: isArabic ? "طلبات العروض" : "Offer Requests", value: String(extra.offers), color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
          ];
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
          );
        })()}

        {/* Insights */}
        {partners.length > 0 && (() => {
          const top = [...partners]
            .filter((p: any) => Number(p.rating) > 0)
            .sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
            .slice(0, 5);
          const typeMap = new Map<string, number>();
          partners.forEach((p: any) => {
            const t = p.partner_type || (isArabic ? "غير محدد" : "Other");
            typeMap.set(t, (typeMap.get(t) || 0) + 1);
          });
          const types = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1]);
          const maxT = types[0]?.[1] || 1;
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500" />
                    {isArabic ? "أعلى الشركاء تقييماً" : "Top Rated Partners"}
                  </h3>
                  {top.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{isArabic ? "لا توجد تقييمات" : "No ratings"}</p>
                  ) : (
                    <div className="space-y-2">
                      {top.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <span className="text-sm truncate">{p.name}</span>
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                            <Star className="w-3 h-3 fill-current" />{Number(p.rating).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-primary" />
                    {isArabic ? "توزيع حسب النوع" : "Distribution by Type"}
                  </h3>
                  <div className="space-y-2">
                    {types.slice(0, 6).map(([name, count]) => (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="truncate">{name}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(count / maxT) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        <ColorLegend type="status" isArabic={isArabic} />

        {/* Tabs */}
        <Tabs defaultValue="partners" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="partners" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isArabic ? "الشركاء" : "Partners"}
              </span>
            </TabsTrigger>
            <TabsTrigger value="procurement" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isArabic ? "المشتريات" : "Procurement"}
              </span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isArabic ? "العقود" : "Contracts"}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners">
            <ExternalPartners />
          </TabsContent>

          <TabsContent value="procurement">
            <ProcurementResourcesSchedule
              items={analysisData?.items || []}
              currency={analysisData?.summary?.currency || "SAR"}
            />
          </TabsContent>

          <TabsContent value="contracts">
            <ProcurementContracts />
          </TabsContent>
        </Tabs>
      </div>

    </PageLayout>
  );
};

export default ProcurementPage;
