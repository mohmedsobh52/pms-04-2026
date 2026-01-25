import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Home, ChevronRight, RefreshCw, Calculator,
  Users, Building2, Shield, FileCheck, Settings, FileText,
  Table as TableIcon, Loader2, HardHat
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
import { IndirectCostsTab } from "@/components/tender/IndirectCostsTab";
import { PricingSettingsTab } from "@/components/tender/PricingSettingsTab";
import { TenderCharts } from "@/components/tender/TenderCharts";
import { TenderPDFExport } from "@/components/tender/TenderPDFExport";
import { SaveStatusIndicator } from "@/components/tender/SaveStatusIndicator";
import TenderCostAlerts from "@/components/tender/TenderCostAlerts";
import PricingScenarios from "@/components/tender/PricingScenarios";
import TenderSubcontractorsTab from "@/components/tender/TenderSubcontractorsTab";

interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  created_at: string;
  updated_at: string;
}

interface PricingSettings {
  contractValue: number;
  profitMargin: number;
  contingency: number;
  projectDuration: number;
  currency: string;
  startDate?: string;
  endDate?: string;
}

interface Totals {
  staffCosts: number;
  facilitiesCosts: number;
  insuranceCosts: number;
  guaranteesCosts: number;
  indirectCosts: number;
  subcontractorsCosts: number;
}

interface TenderSubcontractor {
  id: string;
  subcontractorId: string;
  subcontractorName: string;
  linkedItems: string[];
  scope: string;
  contractValue: number;
  paymentTerms: string;
  retentionPercentage: number;
  status: 'draft' | 'negotiating' | 'confirmed' | 'signed';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Centralized state for all data
  const [totals, setTotals] = useState<Totals>({
    staffCosts: 0,
    facilitiesCosts: 0,
    insuranceCosts: 0,
    guaranteesCosts: 0,
    indirectCosts: 0,
    subcontractorsCosts: 0,
  });

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    contractValue: 10000000,
    profitMargin: 10,
    contingency: 5,
    projectDuration: 12,
    currency: "SAR",
  });

  // Section data for persistence
  const [staffData, setStaffData] = useState<any[]>([]);
  const [facilitiesData, setFacilitiesData] = useState<any[]>([]);
  const [insuranceData, setInsuranceData] = useState<any[]>([]);
  const [guaranteesData, setGuaranteesData] = useState<any[]>([]);
  const [indirectCostsData, setIndirectCostsData] = useState<any[]>([]);
  const [subcontractorsData, setSubcontractorsData] = useState<TenderSubcontractor[]>([]);

  // Save status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Load project and pricing data
  useEffect(() => {
    if (projectId && user) {
      loadData();
    }
  }, [projectId, user]);

  const loadData = async () => {
    try {
      // Load project data
      const { data: projectData, error: projectError } = await supabase
        .from("saved_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load pricing data
      const { data: pricingData, error: pricingError } = await supabase
        .from("tender_pricing")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (pricingData) {
        setPricingSettings({
          contractValue: Number(pricingData.contract_value) || 10000000,
          profitMargin: Number(pricingData.profit_margin) || 10,
          contingency: Number(pricingData.contingency) || 5,
          projectDuration: pricingData.project_duration || 12,
          currency: pricingData.currency || "SAR",
          startDate: pricingData.start_date || undefined,
          endDate: pricingData.end_date || undefined,
        });

        setTotals({
          staffCosts: Number(pricingData.total_staff_costs) || 0,
          facilitiesCosts: Number(pricingData.total_facilities_costs) || 0,
          insuranceCosts: Number(pricingData.total_insurance_costs) || 0,
          guaranteesCosts: Number(pricingData.total_guarantees_costs) || 0,
          indirectCosts: Number(pricingData.total_indirect_costs) || 0,
          subcontractorsCosts: Number((pricingData as any).total_subcontractors_costs) || 0,
        });

        setStaffData(Array.isArray(pricingData.staff_data) ? pricingData.staff_data as any[] : []);
        setFacilitiesData(Array.isArray(pricingData.facilities_data) ? pricingData.facilities_data as any[] : []);
        setInsuranceData(Array.isArray(pricingData.insurance_data) ? pricingData.insurance_data as any[] : []);
        setGuaranteesData(Array.isArray(pricingData.guarantees_data) ? pricingData.guarantees_data as any[] : []);
        setIndirectCostsData(Array.isArray(pricingData.indirect_costs_data) ? pricingData.indirect_costs_data as any[] : []);
        setSubcontractorsData(Array.isArray((pricingData as any).subcontractors_data) ? (pricingData as any).subcontractors_data : []);
        
        setLastSaved(new Date(pricingData.updated_at));
      }
      
      setHasLoadedData(true);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في تحميل بيانات المشروع" : "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced save function
  const saveData = useCallback(async () => {
    if (!projectId || !user || !hasLoadedData) return;

    setSaveStatus("saving");

    try {
      const { error } = await supabase
        .from("tender_pricing")
        .upsert({
          project_id: projectId,
          user_id: user.id,
          contract_value: pricingSettings.contractValue,
          profit_margin: pricingSettings.profitMargin,
          contingency: pricingSettings.contingency,
          project_duration: pricingSettings.projectDuration,
          currency: pricingSettings.currency,
          start_date: pricingSettings.startDate || null,
          end_date: pricingSettings.endDate || null,
          staff_data: staffData,
          facilities_data: facilitiesData,
          insurance_data: insuranceData,
          guarantees_data: guaranteesData,
          indirect_costs_data: indirectCostsData,
          subcontractors_data: subcontractorsData as any,
          total_staff_costs: totals.staffCosts,
          total_facilities_costs: totals.facilitiesCosts,
          total_insurance_costs: totals.insuranceCosts,
          total_guarantees_costs: totals.guaranteesCosts,
          total_indirect_costs: totals.indirectCosts,
          total_subcontractors_costs: totals.subcontractorsCosts,
          total_value: calculateTotalValue(),
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "project_id",
        });

      if (error) throw error;

      setSaveStatus("saved");
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving data:", error);
      setSaveStatus("error");
    }
  }, [projectId, user, hasLoadedData, pricingSettings, staffData, facilitiesData, insuranceData, guaranteesData, indirectCostsData, subcontractorsData, totals]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasLoadedData) return;
    
    setSaveStatus("unsaved");
    const timer = setTimeout(() => {
      saveData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [pricingSettings, staffData, facilitiesData, insuranceData, guaranteesData, indirectCostsData, subcontractorsData, totals]);

  const calculateTotalValue = () => {
    const totalIndirect = totals.staffCosts + totals.facilitiesCosts + totals.insuranceCosts + totals.guaranteesCosts + totals.indirectCosts + totals.subcontractorsCosts;
    const profit = totalIndirect * (pricingSettings.profitMargin / 100);
    const contingency = totalIndirect * (pricingSettings.contingency / 100);
    return totalIndirect + profit + contingency;
  };

  const handleSubcontractorsChange = (data: TenderSubcontractor[], total: number) => {
    setSubcontractorsData(data);
    setTotals(prev => ({ ...prev, subcontractorsCosts: total }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      await saveData();
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
    { id: "subcontractors", labelAr: "مقاولو الباطن", labelEn: "Subcontractors", icon: HardHat },
    { id: "settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalIndirect = totals.staffCosts + totals.facilitiesCosts + totals.insuranceCosts + totals.guaranteesCosts + totals.indirectCosts + totals.subcontractorsCosts;
  const profit = totalIndirect * (pricingSettings.profitMargin / 100);
  const contingency = totalIndirect * (pricingSettings.contingency / 100);
  const grandTotal = totalIndirect + profit + contingency;

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

            {/* Center - Title and Save Status */}
            <div className="flex flex-col items-center">
              <h1 className="text-lg font-bold">
                {isArabic ? "ملخص العطاء" : "Tender Summary"}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">{project?.name}</p>
                <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} isArabic={isArabic} />
              </div>
            </div>

            {/* Left side - Actions */}
            <div className="flex items-center gap-2">
              <TenderPDFExport
                isArabic={isArabic}
                projectName={project?.name || "Project"}
                pricingSettings={pricingSettings}
                totals={totals}
                staffData={staffData}
                facilitiesData={facilitiesData}
                insuranceData={insuranceData}
                guaranteesData={guaranteesData}
                indirectCostsData={indirectCostsData}
              />
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
                {isArabic ? "حفظ" : "Save"}
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
            <div className="space-y-6">
              {/* Cost Alerts */}
              <TenderCostAlerts 
                contractValue={pricingSettings.contractValue}
                totals={{
                  totalStaffCosts: totals.staffCosts,
                  totalFacilitiesCosts: totals.facilitiesCosts,
                  totalInsuranceCosts: totals.insuranceCosts,
                  totalGuaranteesCosts: totals.guaranteesCosts,
                  totalIndirectCosts: totals.indirectCosts,
                  totalSubcontractorsCosts: totals.subcontractorsCosts,
                }}
                currency={pricingSettings.currency}
              />

              {/* Charts */}
              <TenderCharts isArabic={isArabic} totals={totals} />

              {/* Pricing Scenarios */}
              <PricingScenarios 
                pricingSettings={pricingSettings}
                totals={{
                  totalStaffCosts: totals.staffCosts,
                  totalFacilitiesCosts: totals.facilitiesCosts,
                  totalInsuranceCosts: totals.insuranceCosts,
                  totalGuaranteesCosts: totals.guaranteesCosts,
                  totalIndirectCosts: totals.indirectCosts,
                  totalSubcontractorsCosts: totals.subcontractorsCosts,
                }}
                currency={pricingSettings.currency}
              />

              {/* Financial Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Indirect Costs Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {isArabic ? "تفاصيل التكاليف غير المباشرة" : "Indirect Costs Breakdown"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { labelAr: "طاقم الموقع", labelEn: "Site Staff", value: totals.staffCosts, color: "bg-blue-500" },
                        { labelAr: "المرافق", labelEn: "Facilities", value: totals.facilitiesCosts, color: "bg-emerald-500" },
                        { labelAr: "التأمين", labelEn: "Insurance", value: totals.insuranceCosts, color: "bg-amber-500" },
                        { labelAr: "الضمانات", labelEn: "Guarantees", value: totals.guaranteesCosts, color: "bg-red-500" },
                        { labelAr: "تكاليف أخرى", labelEn: "Other Indirect", value: totals.indirectCosts, color: "bg-violet-500" },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-sm text-muted-foreground">
                              {isArabic ? item.labelAr : item.labelEn}
                            </span>
                          </div>
                          <span className="font-medium">
                            {pricingSettings.currency} {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-3 border-t font-bold">
                        <span>{isArabic ? "إجمالي غير المباشرة" : "Total Indirect"}</span>
                        <span className="text-primary">
                          {pricingSettings.currency} {formatCurrency(totalIndirect)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Final Summary */}
                <Card className="border-primary/20">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="text-base">
                      {isArabic ? "الملخص المالي" : "Financial Summary"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">
                          {isArabic ? "إجمالي التكاليف غير المباشرة" : "Total Indirect Costs"}
                        </span>
                        <span className="font-medium">
                          {pricingSettings.currency} {formatCurrency(totalIndirect)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">
                          {isArabic ? `الربح (${pricingSettings.profitMargin}%)` : `Profit (${pricingSettings.profitMargin}%)`}
                        </span>
                        <span className="font-medium text-emerald-600">
                          + {pricingSettings.currency} {formatCurrency(profit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">
                          {isArabic ? `الاحتياطي (${pricingSettings.contingency}%)` : `Contingency (${pricingSettings.contingency}%)`}
                        </span>
                        <span className="font-medium text-amber-600">
                          + {pricingSettings.currency} {formatCurrency(contingency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-4 border-t-2 border-primary/20">
                        <span className="text-lg font-bold">
                          {isArabic ? "القيمة الإجمالية" : "Grand Total"}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {pricingSettings.currency} {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Site Staff Tab */}
          <TabsContent value="staff">
            <SiteStaffTab
              isArabic={isArabic}
              initialData={staffData}
              onDataChange={setStaffData}
              onTotalChange={(total) => setTotals(prev => ({ ...prev, staffCosts: total }))}
            />
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities">
            <FacilitiesTab
              isArabic={isArabic}
              initialData={facilitiesData}
              onDataChange={setFacilitiesData}
              onTotalChange={(total) => setTotals(prev => ({ ...prev, facilitiesCosts: total }))}
            />
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance">
            <InsuranceTab
              isArabic={isArabic}
              contractValue={pricingSettings.contractValue}
              initialData={insuranceData}
              onDataChange={setInsuranceData}
              onTotalChange={(total) => setTotals(prev => ({ ...prev, insuranceCosts: total }))}
            />
          </TabsContent>

          {/* Guarantees Tab */}
          <TabsContent value="guarantees">
            <GuaranteesTab
              isArabic={isArabic}
              contractValue={pricingSettings.contractValue}
              initialData={guaranteesData}
              onDataChange={setGuaranteesData}
              onTotalChange={(total) => setTotals(prev => ({ ...prev, guaranteesCosts: total }))}
            />
          </TabsContent>

          {/* Indirect Costs Tab */}
          <TabsContent value="indirect">
            <IndirectCostsTab
              isArabic={isArabic}
              contractValue={pricingSettings.contractValue}
              initialData={indirectCostsData}
              onDataChange={setIndirectCostsData}
              onTotalChange={(total) => setTotals(prev => ({ ...prev, indirectCosts: total }))}
            />
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors">
            <TenderSubcontractorsTab
              projectId={projectId || ""}
              initialData={subcontractorsData}
              contractValue={pricingSettings.contractValue}
              currency={pricingSettings.currency}
              onDataChange={handleSubcontractorsChange}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <PricingSettingsTab
              isArabic={isArabic}
              settings={pricingSettings}
              onSettingsChange={setPricingSettings}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
