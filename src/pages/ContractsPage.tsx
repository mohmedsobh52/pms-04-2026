import { lazy, Suspense, useEffect, useState } from "react";
import { ContractManagement } from "@/components/ContractManagement";
import { useLanguage } from "@/hooks/useLanguage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ColorLegend } from "@/components/ui/color-code";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Wrench,
  Search,
  Download,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";

// Lazy-load heavy tabs to keep first paint fast
const FIDICContractTemplates = lazy(() =>
  import("@/components/FIDICContractTemplates").then((m) => ({ default: m.FIDICContractTemplates }))
);
const ContractsDashboard = lazy(() =>
  import("@/components/contracts/ContractsDashboard").then((m) => ({ default: m.ContractsDashboard }))
);
const ContractMilestones = lazy(() =>
  import("@/components/contracts/ContractMilestones").then((m) => ({ default: m.ContractMilestones }))
);
const ContractPayments = lazy(() =>
  import("@/components/contracts/ContractPayments").then((m) => ({ default: m.ContractPayments }))
);
const ContractTimeline = lazy(() =>
  import("@/components/contracts/ContractTimeline").then((m) => ({ default: m.ContractTimeline }))
);
const SmartContractAlerts = lazy(() =>
  import("@/components/contracts/SmartContractAlerts").then((m) => ({ default: m.SmartContractAlerts }))
);
const ContractWarranties = lazy(() =>
  import("@/components/contracts/ContractWarranties").then((m) => ({ default: m.ContractWarranties }))
);
const MaintenanceTracker = lazy(() =>
  import("@/components/contracts/MaintenanceTracker").then((m) => ({ default: m.MaintenanceTracker }))
);

const TAB_STORAGE_KEY = "contracts:active-tab";

const TabFallback = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="w-6 h-6 animate-spin me-2" />
    <span>Loading…</span>
  </div>
);

const ContractsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "contracts";
    return localStorage.getItem(TAB_STORAGE_KEY) || "contracts";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    totalContractValue: 0,
    expiringContracts: 0,
    overdueContracts: 0,
    upcomingMilestones: 0,
    duePayments: 0,
    duePaymentsAmount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      const in30 = new Date();
      in30.setDate(today.getDate() + 30);
      const in30Str = in30.toISOString().split("T")[0];
      const todayStr = today.toISOString().split("T")[0];

      const [contractsRes, milestonesRes, paymentsRes] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, status, contract_value, end_date")
          .eq("user_id", user?.id),
        supabase
          .from("contract_milestones")
          .select("id")
          .eq("user_id", user?.id)
          .neq("status", "completed")
          .gte("due_date", todayStr)
          .lte("due_date", in30Str),
        supabase
          .from("contract_payments")
          .select("amount")
          .eq("user_id", user?.id)
          .eq("status", "pending")
          .lte("due_date", in30Str),
      ]);

      const contractList = contractsRes.data || [];

      const expiringContracts = contractList.filter((c) => {
        if (!c.end_date || c.status === "completed" || c.status === "terminated") return false;
        const daysLeft = differenceInDays(new Date(c.end_date), today);
        return daysLeft >= 0 && daysLeft <= 30;
      }).length;

      const overdueContracts = contractList.filter((c) => {
        if (!c.end_date || c.status === "completed" || c.status === "terminated") return false;
        return differenceInDays(new Date(c.end_date), today) < 0;
      }).length;

      const duePaymentsList = paymentsRes.data || [];

      setStats({
        totalContracts: contractList.length,
        activeContracts: contractList.filter((c) => c.status === "active").length,
        completedContracts: contractList.filter((c) => c.status === "completed").length,
        totalContractValue: contractList.reduce((sum, c) => sum + (c.contract_value || 0), 0),
        expiringContracts,
        overdueContracts,
        upcomingMilestones: milestonesRes.data?.length || 0,
        duePayments: duePaymentsList.length,
        duePaymentsAmount: duePaymentsList.reduce((s, p: any) => s + (Number(p.amount) || 0), 0),
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

  const handleExportCSV = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "contract_number, contract_title, contractor_name, contract_value, currency, status, start_date, end_date"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info(isArabic ? "لا توجد عقود للتصدير" : "No contracts to export");
        return;
      }

      const headers = [
        isArabic ? "رقم العقد" : "Number",
        isArabic ? "عنوان العقد" : "Title",
        isArabic ? "المقاول" : "Contractor",
        isArabic ? "القيمة" : "Value",
        isArabic ? "العملة" : "Currency",
        isArabic ? "الحالة" : "Status",
        isArabic ? "البداية" : "Start",
        isArabic ? "النهاية" : "End",
      ];

      const escape = (v: any) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const rows = data.map((c) =>
        [
          c.contract_number,
          c.contract_title,
          c.contractor_name,
          c.contract_value,
          c.currency,
          c.status,
          c.start_date,
          c.end_date,
        ]
          .map(escape)
          .join(",")
      );

      const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contracts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(isArabic ? "تم تصدير العقود" : "Contracts exported");
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "فشل التصدير" : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
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

          {/* Quick search + export */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px] sm:max-w-md sm:ms-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? "بحث سريع في العقود..." : "Quick search contracts..."}
                className="ps-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) setActiveTab("contracts");
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportCSV}
              disabled={isExporting || stats.totalContracts === 0}
              title={isArabic ? "تصدير CSV" : "Export CSV"}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
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

        {/* Alert Banner for expiring/overdue */}
        {(stats.expiringContracts > 0 || stats.overdueContracts > 0) && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border-amber-500/30">
            <CardContent className="p-3 flex items-center gap-3 flex-wrap">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                {stats.overdueContracts > 0 && (
                  <span className="font-semibold text-red-600 me-3">
                    {stats.overdueContracts} {isArabic ? "عقد متأخر" : "overdue contracts"}
                  </span>
                )}
                {stats.expiringContracts > 0 && (
                  <span className="font-semibold text-amber-700">
                    {stats.expiringContracts} {isArabic ? "عقد ينتهي خلال 30 يوم" : "expiring within 30 days"}
                  </span>
                )}
                <span className="text-muted-foreground ms-2">
                  {isArabic ? "— راجع تبويب التنبيهات" : "— check the Alerts tab"}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("alerts")}>
                {isArabic ? "فتح التنبيهات" : "Open Alerts"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming milestones & due payments (next 30 days) */}
        {(stats.upcomingMilestones > 0 || stats.duePayments > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab("milestones")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upcomingMilestones}</p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "معالم قادمة (خلال 30 يوم)" : "Upcoming milestones (next 30 days)"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab("payments")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.duePayments}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {formatCurrency(stats.duePaymentsAmount)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "دفعات مستحقة (خلال 30 يوم)" : "Due payments (next 30 days)"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <ColorLegend type="status" isArabic={isArabic} />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 tabs-navigation-safe">
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
            <ContractManagement initialSearch={searchQuery} />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <ContractsDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="milestones" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <ContractMilestones />
            </Suspense>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <ContractPayments />
            </Suspense>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <ContractTimeline />
            </Suspense>
          </TabsContent>

          <TabsContent value="warranties" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <ContractWarranties />
            </Suspense>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <MaintenanceTracker />
            </Suspense>
          </TabsContent>

          <TabsContent value="fidic" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <FIDICContractTemplates />
            </Suspense>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Suspense fallback={<TabFallback />}>
              <SmartContractAlerts />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ContractsPage;
