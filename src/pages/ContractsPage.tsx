import { ContractManagement } from "@/components/ContractManagement";
import { FIDICContractTemplates } from "@/components/FIDICContractTemplates";
import { ContractsDashboard } from "@/components/contracts/ContractsDashboard";
import { ContractMilestones } from "@/components/contracts/ContractMilestones";
import { ContractPayments } from "@/components/contracts/ContractPayments";
import { ContractTimeline } from "@/components/contracts/ContractTimeline";
import { SmartContractAlerts } from "@/components/contracts/SmartContractAlerts";
import { ContractWarranties } from "@/components/contracts/ContractWarranties";
import { MaintenanceTracker } from "@/components/contracts/MaintenanceTracker";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Bell, 
  Building2,
  CheckCircle,
  DollarSign,
  BookOpen,
  AlertTriangle,
  Clock,
  BarChart3,
  Target,
  Calendar,
  Shield,
  Wrench
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

const ContractsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    totalContractValue: 0,
    expiringContracts: 0,
    overdueContracts: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, status, contract_value, end_date")
        .eq("user_id", user?.id);

      const contractList = contracts || [];
      const now = new Date();

      const expiringContracts = contractList.filter(c => {
        if (!c.end_date || c.status === 'completed' || c.status === 'terminated') return false;
        const daysLeft = differenceInDays(new Date(c.end_date), now);
        return daysLeft >= 0 && daysLeft <= 30;
      }).length;

      const overdueContracts = contractList.filter(c => {
        if (!c.end_date || c.status === 'completed' || c.status === 'terminated') return false;
        return differenceInDays(new Date(c.end_date), now) < 0;
      }).length;

      setStats({
        totalContracts: contractList.length,
        activeContracts: contractList.filter(c => c.status === "active").length,
        completedContracts: contractList.filter(c => c.status === "completed").length,
        totalContractValue: contractList.reduce((sum, c) => sum + (c.contract_value || 0), 0),
        expiringContracts,
        overdueContracts,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Building2 className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? "العقود" : "Contracts"}
            </h1>
            <p className="text-muted-foreground">
              {isArabic 
                ? "إدارة العقود والاتفاقيات وقوالب FIDIC" 
                : "Contract, agreement and FIDIC template management"}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "العقود" : "Contracts"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "نشطة" : "Active"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "مكتملة" : "Completed"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expiringContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "تنتهي قريباً" : "Expiring"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.overdueContracts}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "متأخرة" : "Overdue"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <DollarSign className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalContractValue)}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="contracts" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "العقود" : "Contracts"}</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "المعالم" : "Milestones"}</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "الدفعات" : "Payments"}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "الجدول الزمني" : "Timeline"}</span>
            </TabsTrigger>
            <TabsTrigger value="warranties" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "الضمانات" : "Warranties"}</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "الصيانة" : "Maintenance"}</span>
            </TabsTrigger>
            <TabsTrigger value="fidic" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "FIDIC" : "FIDIC"}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? "التنبيهات" : "Alerts"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="mt-4">
            <ContractManagement />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <ContractsDashboard />
          </TabsContent>

          <TabsContent value="milestones" className="mt-4">
            <ContractMilestones />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <ContractPayments />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <ContractTimeline />
          </TabsContent>

          <TabsContent value="warranties" className="mt-4">
            <ContractWarranties />
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <MaintenanceTracker />
          </TabsContent>

          <TabsContent value="fidic" className="mt-4">
            <FIDICContractTemplates />
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <SmartContractAlerts />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ContractsPage;
