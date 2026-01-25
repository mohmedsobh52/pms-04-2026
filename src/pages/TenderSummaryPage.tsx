import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Home, ChevronRight, RefreshCw, Calculator,
  Users, Building2, Shield, FileCheck, Settings, FileText,
  Table as TableIcon, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { SiteStaffTab } from "@/components/tender/SiteStaffTab";
import { FacilitiesTab } from "@/components/tender/FacilitiesTab";
import { InsuranceTab } from "@/components/tender/InsuranceTab";
import { GuaranteesTab } from "@/components/tender/GuaranteesTab";

interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  created_at: string;
  updated_at: string;
}

interface TenderSummary {
  directCosts: number;
  indirectCosts: number;
  staffCosts: number;
  facilitiesCosts: number;
  insuranceCosts: number;
  guaranteesCosts: number;
  profitMargin: number;
  totalValue: number;
}

export default function TenderSummaryPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const [activeTab, setActiveTab] = useState("summary");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [tenderSummary, setTenderSummary] = useState<TenderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحميل بيانات المشروع" : "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      // Simulate calculation - in production this would calculate from project items
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Demo summary data
      setTenderSummary({
        directCosts: 0,
        indirectCosts: 0,
        staffCosts: 0,
        facilitiesCosts: 0,
        insuranceCosts: 0,
        guaranteesCosts: 0,
        profitMargin: 10,
        totalValue: 0,
      });

      toast({
        title: isArabic ? "تم الحساب" : "Calculated",
        description: isArabic ? "تم حساب ملخص العطاء بنجاح" : "Tender summary calculated successfully",
      });
    } catch (error) {
      console.error("Error calculating:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في حساب الملخص" : "Failed to calculate summary",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const tabs = [
    { id: "summary", labelAr: "ملخص العطاء", labelEn: "Tender Summary", icon: FileText },
    { id: "staff", labelAr: "طاقم الموقع", labelEn: "Site Staff", icon: Users },
    { id: "facilities", labelAr: "المرافق", labelEn: "Facilities", icon: Building2 },
    { id: "insurance", labelAr: "التأمين", labelEn: "Insurance", icon: Shield },
    { id: "guarantees", labelAr: "الضمانات", labelEn: "Guarantees", icon: FileCheck },
    { id: "indirect", labelAr: "التكاليف غير المباشرة", labelEn: "Indirect Costs", icon: Calculator },
    { id: "settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Right side - Logo and Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">
                  <Home className="w-4 h-4" />
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link to="/projects" className="hover:text-foreground transition-colors">
                  {isArabic ? "المشاريع" : "Projects"}
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link to={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
                  {project?.name || projectId}
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">
                  {isArabic ? "التسعير" : "Pricing"}
                </span>
              </nav>
            </div>

            {/* Center - Title */}
            <div className="flex flex-col items-center">
              <h1 className="text-lg font-bold">
                {isArabic ? "ملخص العطاء" : "Tender Summary"}
              </h1>
              <p className="text-sm text-muted-foreground">{project?.name}</p>
            </div>

            {/* Left side - Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {isCalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isArabic ? "حساب" : "Calculate"}
              </Button>
              <LanguageToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6 bg-muted/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-2 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {isArabic ? tab.labelAr : tab.labelEn}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary">
            {tenderSummary ? (
              <TenderSummaryContent summary={tenderSummary} isArabic={isArabic} />
            ) : (
              <EmptyState onCalculate={handleCalculate} isCalculating={isCalculating} isArabic={isArabic} />
            )}
          </TabsContent>

          {/* Site Staff Tab */}
          <TabsContent value="staff">
            <SiteStaffTab isArabic={isArabic} />
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities">
            <FacilitiesTab isArabic={isArabic} />
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance">
            <InsuranceTab isArabic={isArabic} />
          </TabsContent>

          {/* Guarantees Tab */}
          <TabsContent value="guarantees">
            <GuaranteesTab isArabic={isArabic} />
          </TabsContent>

          {/* Indirect Costs Tab */}
          <TabsContent value="indirect">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  {isArabic ? "التكاليف غير المباشرة" : "Indirect Costs"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  {isArabic ? "قريباً - إدارة التكاليف غير المباشرة" : "Coming soon - Indirect costs management"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {isArabic ? "الإعدادات" : "Settings"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  {isArabic ? "قريباً - إعدادات التسعير" : "Coming soon - Pricing settings"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Empty State Component
function EmptyState({
  onCalculate,
  isCalculating,
  isArabic,
}: {
  onCalculate: () => void;
  isCalculating: boolean;
  isArabic: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center mb-4">
          <TableIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-amber-500 mb-2">
          {isArabic ? "لا يوجد ملخص عطاء" : "No tender summary"}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {isArabic
            ? "انقر على حساب لإنشاء ملخص العطاء"
            : "Click calculate to create tender summary"}
        </p>
        <Button
          onClick={onCalculate}
          disabled={isCalculating}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          {isCalculating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isArabic ? "احسب الآن" : "Calculate Now"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Tender Summary Content Component
function TenderSummaryContent({
  summary,
  isArabic,
}: {
  summary: TenderSummary;
  isArabic: boolean;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const summaryItems = [
    { labelAr: "التكاليف المباشرة", labelEn: "Direct Costs", value: summary.directCosts },
    { labelAr: "تكاليف طاقم الموقع", labelEn: "Staff Costs", value: summary.staffCosts },
    { labelAr: "تكاليف المرافق", labelEn: "Facilities Costs", value: summary.facilitiesCosts },
    { labelAr: "تكاليف التأمين", labelEn: "Insurance Costs", value: summary.insuranceCosts },
    { labelAr: "تكاليف الضمانات", labelEn: "Guarantees Costs", value: summary.guaranteesCosts },
    { labelAr: "التكاليف غير المباشرة", labelEn: "Indirect Costs", value: summary.indirectCosts },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? "ملخص التكاليف" : "Cost Summary"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summaryItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-muted-foreground">
                  {isArabic ? item.labelAr : item.labelEn}
                </span>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-3 border-t-2 font-bold text-lg">
              <span>{isArabic ? "الإجمالي" : "Total"}</span>
              <span className="text-primary">{formatCurrency(summary.totalValue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
