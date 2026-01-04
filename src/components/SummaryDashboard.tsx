import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface RiskSummary {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  active: number;
  mitigated: number;
}

interface ContractSummary {
  total: number;
  totalValue: number;
  activeContracts: number;
  completedContracts: number;
  pendingContracts: number;
  expiringSoon: number;
}

interface EVMSummary {
  latestCPI: number;
  latestSPI: number;
  avgCPI: number;
  avgSPI: number;
  projectsAtRisk: number;
  projectsOnTrack: number;
  totalRecords: number;
}

interface SummaryDashboardProps {
  projectId?: string;
}

export function SummaryDashboard({ projectId }: SummaryDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [contractSummary, setContractSummary] = useState<ContractSummary | null>(null);
  const [evmSummary, setEVMSummary] = useState<EVMSummary | null>(null);
  const [recentRisks, setRecentRisks] = useState<any[]>([]);
  const [recentContracts, setRecentContracts] = useState<any[]>([]);

  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const CHART_COLORS = [
    "hsl(var(--destructive))",
    "hsl(38, 92%, 50%)",
    "hsl(142, 76%, 36%)",
    "hsl(var(--primary))",
    "hsl(var(--muted-foreground))"
  ];

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setIsLoading(false);
    }
  }, [user, projectId]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRiskData(),
        fetchContractData(),
        fetchEVMData()
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiskData = async () => {
    try {
      let query = supabase.from("risks").select("*");
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data: risks, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      const highRisk = risks?.filter(r => r.impact === "high" || r.probability === "high").length || 0;
      const mediumRisk = risks?.filter(r => r.impact === "medium" || r.probability === "medium").length || 0;
      const lowRisk = risks?.filter(r => r.impact === "low" && r.probability === "low").length || 0;
      const active = risks?.filter(r => r.status === "active" || r.status === "identified").length || 0;
      const mitigated = risks?.filter(r => r.status === "mitigated" || r.status === "closed").length || 0;

      setRiskSummary({
        total: risks?.length || 0,
        highRisk,
        mediumRisk,
        lowRisk,
        active,
        mitigated
      });

      setRecentRisks(risks?.slice(0, 5) || []);
    } catch (error) {
      console.error("Error fetching risk data:", error);
    }
  };

  const fetchContractData = async () => {
    try {
      let query = supabase.from("contracts").select("*");
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data: contracts, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      const totalValue = contracts?.reduce((sum, c) => sum + (c.contract_value || 0), 0) || 0;
      const activeContracts = contracts?.filter(c => c.status === "active").length || 0;
      const completedContracts = contracts?.filter(c => c.status === "completed").length || 0;
      const pendingContracts = contracts?.filter(c => c.status === "pending" || c.status === "draft").length || 0;
      
      // Contracts expiring within 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringSoon = contracts?.filter(c => {
        if (!c.end_date) return false;
        const endDate = new Date(c.end_date);
        return endDate <= thirtyDaysFromNow && endDate > new Date();
      }).length || 0;

      setContractSummary({
        total: contracts?.length || 0,
        totalValue,
        activeContracts,
        completedContracts,
        pendingContracts,
        expiringSoon
      });

      setRecentContracts(contracts?.slice(0, 5) || []);
    } catch (error) {
      console.error("Error fetching contract data:", error);
    }
  };

  const fetchEVMData = async () => {
    try {
      let query = supabase.from("project_progress_history").select("*");
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data: evmRecords, error } = await query.order("record_date", { ascending: false });
      if (error) throw error;

      if (!evmRecords || evmRecords.length === 0) {
        setEVMSummary(null);
        return;
      }

      const latestCPI = evmRecords[0].cpi || 1;
      const latestSPI = evmRecords[0].spi || 1;
      
      const avgCPI = evmRecords.reduce((sum, r) => sum + (r.cpi || 1), 0) / evmRecords.length;
      const avgSPI = evmRecords.reduce((sum, r) => sum + (r.spi || 1), 0) / evmRecords.length;
      
      // Projects at risk: CPI < 0.9 or SPI < 0.9
      const projectsAtRisk = new Set(
        evmRecords.filter(r => (r.cpi && r.cpi < 0.9) || (r.spi && r.spi < 0.9)).map(r => r.project_id)
      ).size;
      
      // Projects on track: CPI >= 0.95 and SPI >= 0.95
      const projectsOnTrack = new Set(
        evmRecords.filter(r => (r.cpi && r.cpi >= 0.95) && (r.spi && r.spi >= 0.95)).map(r => r.project_id)
      ).size;

      setEVMSummary({
        latestCPI,
        latestSPI,
        avgCPI,
        avgSPI,
        projectsAtRisk,
        projectsOnTrack,
        totalRecords: evmRecords.length
      });
    } catch (error) {
      console.error("Error fetching EVM data:", error);
    }
  };

  const getRiskStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "identified":
        return "destructive";
      case "mitigated":
        return "default";
      case "closed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "pending":
      case "draft":
        return "outline";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getEVMStatusIcon = (value: number) => {
    if (value >= 1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value >= 0.9) return <Activity className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getEVMStatusColor = (value: number) => {
    if (value >= 1) return "text-green-600 dark:text-green-400";
    if (value >= 0.9) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? "يرجى تسجيل الدخول لعرض لوحة المعلومات التجميعية" : "Please sign in to view the summary dashboard"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const riskDistributionData = riskSummary ? [
    { name: isArabic ? "عالية" : "High", value: riskSummary.highRisk, color: CHART_COLORS[0] },
    { name: isArabic ? "متوسطة" : "Medium", value: riskSummary.mediumRisk, color: CHART_COLORS[1] },
    { name: isArabic ? "منخفضة" : "Low", value: riskSummary.lowRisk, color: CHART_COLORS[2] }
  ].filter(d => d.value > 0) : [];

  const contractStatusData = contractSummary ? [
    { name: isArabic ? "نشط" : "Active", value: contractSummary.activeContracts },
    { name: isArabic ? "مكتمل" : "Completed", value: contractSummary.completedContracts },
    { name: isArabic ? "معلق" : "Pending", value: contractSummary.pendingContracts }
  ].filter(d => d.value > 0) : [];

  const evmComparisonData = evmSummary ? [
    { 
      name: "CPI", 
      current: Number(evmSummary.latestCPI.toFixed(2)), 
      average: Number(evmSummary.avgCPI.toFixed(2)),
      target: 1 
    },
    { 
      name: "SPI", 
      current: Number(evmSummary.latestSPI.toFixed(2)), 
      average: Number(evmSummary.avgSPI.toFixed(2)),
      target: 1 
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">
          {isArabic ? "لوحة المعلومات التجميعية" : "Summary Dashboard"}
        </h2>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Risks KPI */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {isArabic ? "المخاطر" : "Risks"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{riskSummary?.total || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">{riskSummary?.highRisk || 0} {isArabic ? "عالية" : "High"}</Badge>
              <Badge variant="outline" className="text-xs">{riskSummary?.active || 0} {isArabic ? "نشطة" : "Active"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contracts KPI */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              {isArabic ? "العقود" : "Contracts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{contractSummary?.total || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {isArabic ? "القيمة الإجمالية:" : "Total Value:"} 
              <span className="font-medium text-foreground ml-1">
                SAR {(contractSummary?.totalValue || 0).toLocaleString()}
              </span>
            </div>
            {contractSummary?.expiringSoon ? (
              <Badge variant="outline" className="mt-2 text-xs text-yellow-600 border-yellow-500">
                <Clock className="h-3 w-3 mr-1" />
                {contractSummary.expiringSoon} {isArabic ? "تنتهي قريباً" : "expiring soon"}
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        {/* CPI KPI */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              {isArabic ? "مؤشر أداء التكلفة" : "Cost Performance (CPI)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${evmSummary ? getEVMStatusColor(evmSummary.latestCPI) : ''}`}>
                {evmSummary?.latestCPI?.toFixed(2) || "-"}
              </span>
              {evmSummary && getEVMStatusIcon(evmSummary.latestCPI)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isArabic ? "المتوسط:" : "Average:"} {evmSummary?.avgCPI?.toFixed(2) || "-"}
            </div>
          </CardContent>
        </Card>

        {/* SPI KPI */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              {isArabic ? "مؤشر أداء الجدول" : "Schedule Performance (SPI)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${evmSummary ? getEVMStatusColor(evmSummary.latestSPI) : ''}`}>
                {evmSummary?.latestSPI?.toFixed(2) || "-"}
              </span>
              {evmSummary && getEVMStatusIcon(evmSummary.latestSPI)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isArabic ? "المتوسط:" : "Average:"} {evmSummary?.avgSPI?.toFixed(2) || "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {isArabic ? "توزيع المخاطر" : "Risk Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskDistributionData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد مخاطر مسجلة" : "No risks recorded"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {isArabic ? "حالة العقود" : "Contract Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractStatusData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contractStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد عقود مسجلة" : "No contracts recorded"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* EVM Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {isArabic ? "مقارنة مؤشرات EVM" : "EVM Indicators"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evmComparisonData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evmComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 1.5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" name={isArabic ? "الحالي" : "Current"} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="average" name={isArabic ? "المتوسط" : "Average"} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name={isArabic ? "الهدف" : "Target"} fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات EVM" : "No EVM data"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {isArabic ? "أحدث المخاطر" : "Recent Risks"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "آخر 5 مخاطر مسجلة" : "Last 5 recorded risks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRisks.length > 0 ? (
              <div className="space-y-3">
                {recentRisks.map((risk) => (
                  <div key={risk.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{risk.risk_title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {risk.risk_description || (isArabic ? "بدون وصف" : "No description")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRiskStatusColor(risk.status)} className="text-xs">
                        {risk.status || (isArabic ? "نشط" : "active")}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${risk.impact === "high" ? "border-red-500 text-red-600" : risk.impact === "medium" ? "border-yellow-500 text-yellow-600" : "border-green-500 text-green-600"}`}
                      >
                        {risk.impact || "-"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isArabic ? "لا توجد مخاطر مسجلة" : "No risks recorded"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Contracts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isArabic ? "أحدث العقود" : "Recent Contracts"}
            </CardTitle>
            <CardDescription>
              {isArabic ? "آخر 5 عقود مسجلة" : "Last 5 recorded contracts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentContracts.length > 0 ? (
              <div className="space-y-3">
                {recentContracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{contract.contract_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {contract.contractor_name || (isArabic ? "بدون مقاول" : "No contractor")} • 
                        <span className="ml-1 font-medium">
                          SAR {(contract.contract_value || 0).toLocaleString()}
                        </span>
                      </p>
                    </div>
                    <Badge variant={getContractStatusColor(contract.status)} className="text-xs">
                      {contract.status || (isArabic ? "معلق" : "pending")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isArabic ? "لا توجد عقود مسجلة" : "No contracts recorded"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk Status Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isArabic ? "تقدم معالجة المخاطر" : "Risk Mitigation Progress"}</CardTitle>
          </CardHeader>
          <CardContent>
            {riskSummary && riskSummary.total > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {riskSummary.mitigated} / {riskSummary.total} {isArabic ? "تم معالجتها" : "mitigated"}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round((riskSummary.mitigated / riskSummary.total) * 100)}%
                  </span>
                </div>
                <Progress value={(riskSummary.mitigated / riskSummary.total) * 100} className="h-2" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
            )}
          </CardContent>
        </Card>

        {/* Contract Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isArabic ? "نسبة إكمال العقود" : "Contract Completion"}</CardTitle>
          </CardHeader>
          <CardContent>
            {contractSummary && contractSummary.total > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {contractSummary.completedContracts} / {contractSummary.total} {isArabic ? "مكتمل" : "completed"}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round((contractSummary.completedContracts / contractSummary.total) * 100)}%
                  </span>
                </div>
                <Progress value={(contractSummary.completedContracts / contractSummary.total) * 100} className="h-2" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
            )}
          </CardContent>
        </Card>

        {/* EVM Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isArabic ? "صحة المشروع (EVM)" : "Project Health (EVM)"}</CardTitle>
          </CardHeader>
          <CardContent>
            {evmSummary ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-lg font-bold">{evmSummary.projectsOnTrack}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "على المسار" : "On Track"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-lg font-bold">{evmSummary.projectsAtRisk}</p>
                    <p className="text-xs text-muted-foreground">{isArabic ? "في خطر" : "At Risk"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
