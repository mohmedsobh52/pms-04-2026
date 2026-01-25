import { ContractManagement } from "@/components/ContractManagement";
import { ContractNotifications } from "@/components/ContractNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Bell, 
  Building2,
  CheckCircle,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ContractsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    totalContractValue: 0,
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
        .select("id, status, contract_value")
        .eq("user_id", user?.id);

      const contractList = contracts || [];

      setStats({
        totalContracts: contractList.length,
        activeContracts: contractList.filter(c => c.status === "active").length,
        completedContracts: contractList.filter(c => c.status === "completed").length,
        totalContractValue: contractList.reduce((sum, c) => sum + (c.contract_value || 0), 0),
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
                ? "إدارة العقود والاتفاقيات" 
                : "Contract and agreement management"}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <TabsList className="grid grid-cols-2 w-full md:w-auto">
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="w-4 h-4" />
              <span>{isArabic ? "العقود" : "Contracts"}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              <span>{isArabic ? "التذكيرات" : "Alerts"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="mt-4">
            <ContractManagement />
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <ContractNotifications />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ContractsPage;
