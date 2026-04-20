import { lazy, Suspense } from "react";
import { SubcontractorProgressDashboard } from "@/components/SubcontractorProgressDashboard";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ColorLegend } from "@/components/ui/color-code";

const SubcontractorManagement = lazy(() =>
  import("@/components/SubcontractorManagement").then((m) => ({ default: m.SubcontractorManagement }))
);
const SubcontractorBOQLink = lazy(() =>
  import("@/components/SubcontractorBOQLink").then((m) => ({ default: m.SubcontractorBOQLink }))
);
import { 
  Users, 
  LayoutDashboard, 
  Link2, 
  CheckCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Wallet,
  AlertCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Subcontractor {
  id: string;
  name: string;
  specialty: string | null;
  status: string;
}

interface Assignment {
  id: string;
  subcontractor_id: string;
  scope_of_work: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number;
  status: string;
  payment_status: string;
}

const SubcontractorsPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState({
    totalSubcontractors: 0,
    activeSubcontractors: 0,
    activeAssignments: 0,
    completedAssignments: 0,
    totalContractValue: 0,
    avgProgress: 0,
    paidAssignments: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [subcontractorsRes, assignmentsRes] = await Promise.all([
        supabase.from("subcontractors").select("id, name, specialty, status").eq("user_id", user?.id),
        supabase.from("subcontractor_assignments").select("id, subcontractor_id, scope_of_work, contract_value, start_date, end_date, progress_percentage, status, payment_status"),
      ]);

      const subcontractorsList = (subcontractorsRes.data || []) as Subcontractor[];
      const assignmentsList = (assignmentsRes.data || []).map(a => ({
        ...a,
        progress_percentage: a.progress_percentage || 0,
        payment_status: a.payment_status || 'pending'
      })) as Assignment[];

      setSubcontractors(subcontractorsList);
      setAssignments(assignmentsList);

      const activeAssgns = assignmentsList.filter(a => a.status === "in_progress");
      const avgProg = activeAssgns.length
        ? Math.round(activeAssgns.reduce((s, a) => s + (a.progress_percentage || 0), 0) / activeAssgns.length)
        : 0;

      setStats({
        totalSubcontractors: subcontractorsList.length,
        activeSubcontractors: subcontractorsList.filter(s => s.status === "active").length,
        activeAssignments: activeAssgns.length,
        completedAssignments: assignmentsList.filter(a => a.status === "completed").length,
        totalContractValue: assignmentsList.reduce((sum, a) => sum + (a.contract_value || 0), 0),
        avgProgress: avgProg,
        paidAssignments: assignmentsList.filter(a => a.payment_status === "paid").length,
        pendingPayments: assignmentsList.filter(a => a.payment_status === "pending").length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
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
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? "مقاولي الباطن" : "Subcontractors"}
            </h1>
            <p className="text-muted-foreground">
              {isArabic 
                ? "إدارة شاملة لمقاولي الباطن والمهام" 
                : "Comprehensive subcontractor and task management"}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSubcontractors}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "المقاولين" : "Total"}</p>
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
                  <p className="text-2xl font-bold">{stats.activeSubcontractors}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "نشط" : "Active"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeAssignments}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "مهام جارية" : "In Progress"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedAssignments}</p>
                  <p className="text-xs text-muted-foreground">{isArabic ? "مكتمل" : "Completed"}</p>
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
                  <p className="text-xs text-muted-foreground">{isArabic ? "القيمة" : "Value"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress + Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {isArabic ? "متوسط تقدم المهام الجارية" : "Avg Progress (In Progress)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-primary">{stats.avgProgress}%</span>
                <span className="text-xs text-muted-foreground">
                  {stats.activeAssignments} {isArabic ? "مهمة نشطة" : "active tasks"}
                </span>
              </div>
              <Progress value={stats.avgProgress} className="h-3" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                {isArabic ? "حالة المدفوعات" : "Payment Status"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" />{isArabic ? "مدفوعة" : "Paid"}</span>
                <span className="font-bold text-emerald-600">{stats.paidAssignments}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-600" />{isArabic ? "معلقة" : "Pending"}</span>
                <span className="font-bold text-amber-600">{stats.pendingPayments}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Specialty + Top by value */}
        {(subcontractors.length > 0 || assignments.length > 0) && (() => {
          const specMap = new Map<string, number>();
          subcontractors.forEach((s) => {
            const sp = s.specialty || (isArabic ? "غير محدد" : "Other");
            specMap.set(sp, (specMap.get(sp) || 0) + 1);
          });
          const specs = Array.from(specMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
          const maxSpec = specs[0]?.[1] || 1;

          const valueBySub = new Map<string, number>();
          assignments.forEach((a) => {
            valueBySub.set(a.subcontractor_id, (valueBySub.get(a.subcontractor_id) || 0) + (Number(a.contract_value) || 0));
          });
          const topByValue = Array.from(valueBySub.entries())
            .map(([id, v]) => ({ id, name: subcontractors.find((s) => s.id === id)?.name || "—", value: v }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    {isArabic ? "توزيع التخصصات" : "Specialty Distribution"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {specs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
                  ) : specs.map(([name, count]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="truncate">{name}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <Progress value={(count / maxSpec) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-cyan-600" />
                    {isArabic ? "أعلى 5 مقاولين (قيمة العقود)" : "Top 5 by Contract Value"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topByValue.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
                  ) : topByValue.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <span className="text-sm truncate flex-1">{t.name}</span>
                      <span className="text-xs font-bold text-cyan-600">{formatCurrency(t.value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })()}

        <ColorLegend type="category" isArabic={isArabic} />

        {/* Main Tabs - FIDIC removed */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full md:w-auto tabs-navigation-safe">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "المقاولين" : "Subcontractors"}</span>
            </TabsTrigger>
            <TabsTrigger value="boq-link" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden md:inline">{isArabic ? "ربط البنود" : "BOQ Link"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <SubcontractorProgressDashboard 
              subcontractors={subcontractors}
              assignments={assignments}
            />
          </TabsContent>

          <TabsContent value="management" className="mt-4">
            <SubcontractorManagement />
          </TabsContent>

          <TabsContent value="boq-link" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  {isArabic ? "ربط مقاولي الباطن بالبنود" : "Link Subcontractors to BOQ Items"}
                </CardTitle>
                <CardDescription>
                  {isArabic 
                    ? "اربط كل مقاول باطن بالبنود المسؤول عنها في جدول الكميات"
                    : "Link each subcontractor to the BOQ items they are responsible for"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubcontractorBOQLink 
                  boqItems={analysisData?.items || []} 
                  projectId={undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SubcontractorsPage;
