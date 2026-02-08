import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Home } from "lucide-react";
import { PartnerOverview } from "@/components/procurement/PartnerOverview";
import { PartnerContracts } from "@/components/procurement/PartnerContracts";
import { PartnerPerformance } from "@/components/procurement/PartnerPerformance";
import { PartnerReviews } from "@/components/procurement/PartnerReviews";
import { ExternalPartner } from "@/components/procurement/PartnerCard";

interface SavedProject {
  id: string;
  name: string;
}

const PartnerDetailsPage = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { user } = useAuth();

  const [partner, setPartner] = useState<ExternalPartner | null>(null);
  const [associatedProjects, setAssociatedProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && partnerId) {
      fetchPartnerDetails();
    }
  }, [user, partnerId]);

  const fetchPartnerDetails = async () => {
    try {
      // Fetch partner data
      const { data: partnerData, error: partnerError } = await supabase
        .from("external_partners")
        .select("*")
        .eq("id", partnerId)
        .eq("user_id", user?.id)
        .single();

      if (partnerError) throw partnerError;
      setPartner(partnerData as ExternalPartner);

      // Fetch associated projects from contracts
      const { data: contractsData } = await supabase
        .from("partner_contracts")
        .select("project_id")
        .eq("partner_id", partnerId)
        .eq("user_id", user?.id)
        .not("project_id", "is", null);

      if (contractsData && contractsData.length > 0) {
        const projectIds = [...new Set(contractsData.map(c => c.project_id).filter(Boolean))];
        
        if (projectIds.length > 0) {
          const { data: projectsData } = await supabase
            .from("saved_projects")
            .select("id, name")
            .in("id", projectIds);

          setAssociatedProjects(projectsData || []);
        }
      }
    } catch (error) {
      console.error("Error fetching partner:", error);
      toast.error(isArabic ? "خطأ في تحميل بيانات الشريك" : "Error loading partner data");
      navigate("/procurement");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPartner = async () => {
    if (!partnerId || !user) return;
    
    const { data } = await supabase
      .from("external_partners")
      .select("*")
      .eq("id", partnerId)
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setPartner(data as ExternalPartner);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            {isArabic ? "الشريك غير موجود" : "Partner not found"}
          </h2>
          <Button onClick={() => navigate("/procurement")}>
            {isArabic ? "العودة للمشتريات" : "Back to Procurement"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/procurement")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{partner.name}</h1>
            <Breadcrumb className="mt-1">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    {isArabic ? "الرئيسية" : "Home"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/procurement">
                    {isArabic ? "المشتريات" : "Procurement"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{partner.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Overview Section */}
        <PartnerOverview partner={partner} />

        {/* Associated Projects */}
        {associatedProjects.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {isArabic ? "المشاريع المرتبطة" : "Associated Projects"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {associatedProjects.map((project) => (
                <Badge
                  key={project.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contracts Section */}
        <div className="mt-8">
          <PartnerContracts partnerId={partner.id} />
        </div>

        {/* Performance Metrics */}
        <div className="mt-8">
          <PartnerPerformance partnerId={partner.id} />
        </div>

        {/* Manager Reviews */}
        <div className="mt-8">
          <PartnerReviews partnerId={partner.id} onReviewChange={refreshPartner} />
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailsPage;
