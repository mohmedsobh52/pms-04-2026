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
