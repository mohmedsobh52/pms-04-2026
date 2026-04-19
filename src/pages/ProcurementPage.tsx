import { useEffect, useState } from "react";
import { ProcurementResourcesSchedule } from "@/components/ProcurementResourcesSchedule";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Building2, Package, FileText, Sparkles, Users, CheckCircle2, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ExternalPartners,
  RequestOfferDialog,
  ProcurementContracts,
} from "@/components/procurement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ExternalPartner } from "@/components/procurement/PartnerCard";

const ProcurementPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [partners, setPartners] = useState<ExternalPartner[]>([]);

  useEffect(() => {
    if (user) {
      fetchPartners();
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
          ];
          return (
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
          );
        })()}

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
