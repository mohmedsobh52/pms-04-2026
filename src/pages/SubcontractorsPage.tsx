import { SubcontractorManagement } from "@/components/SubcontractorManagement";
import { SubcontractorBOQLink } from "@/components/SubcontractorBOQLink";
import { SubcontractorProgressDashboard } from "@/components/SubcontractorProgressDashboard";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, 
  LayoutDashboard, 
  Link2, 
  CheckCircle,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { useEffect, useState } from "react";
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

      setStats({
        totalSubcontractors: subcontractorsList.length,
        activeSubcontractors: subcontractorsList.filter(s => s.status === "active").length,
        activeAssignments: assignmentsList.filter(a => a.status === "in_progress").length,
        completedAssignments: assignmentsList.filter(a => a.status === "completed").length,
        totalContractValue: assignmentsList.reduce((sum, a) => sum + (a.contract_value || 0), 0),
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

        {/* Main Tabs - FIDIC removed */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
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
