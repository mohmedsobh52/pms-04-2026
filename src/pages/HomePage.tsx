import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FolderOpen, Building2, DollarSign, AlertTriangle, Layers,
  Settings2, ChevronRight, Package, Loader2, Clock, Briefcase, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PMSLogo } from "@/components/PMSLogo";
import { PageLayout } from "@/components/PageLayout";
import { LifecycleFlow } from "@/components/home/LifecycleFlow";
import { PhaseActionsGrid } from "@/components/home/PhaseActionsGrid";

interface ProjectSummary {
  id: string;
  name: string;
  total_value: number;
  items_count: number;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalProjects: number;
  totalValue: number;
  totalItems: number;
  totalQuotations: number;
  totalContracts: number;
  totalRisks: number;
  activeRisks: number;
  avgCPI: number;
  avgSPI: number;
  totalSubcontractors: number;
  pendingProcurement: number;
}

const mainModules = [
  { icon: FolderOpen, label: { ar: "المشاريع المحفوظة", en: "Saved Projects" }, href: "/projects", count: "totalProjects" },
  { icon: Briefcase, label: { ar: "العقود", en: "Contracts" }, href: "/contracts", count: "totalContracts" },
  { icon: Package, label: { ar: "المشتريات", en: "Procurement" }, href: "/procurement", count: "pendingProcurement" },
  { icon: AlertTriangle, label: { ar: "المخاطر", en: "Risks" }, href: "/risk", count: "activeRisks" },
  { icon: Settings2, label: { ar: "الإعدادات", en: "Settings" }, href: "/settings", count: null },
  { icon: Layers, label: { ar: "المستخلصات", en: "Certificates" }, href: "/progress-certificates", count: null },
];

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [activePhase, setActivePhase] = useState(1);

  const { user, loading: authLoading } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchAllData();
      } else {
        setIsLoading(false);
      }
    }
  }, [user, authLoading]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStats(), fetchRecentProjects()]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [
        { data: projects },
        { data: quotations },
        { data: contracts },
        { data: risks },
        { data: evmData },
        { data: subcontractors },
        { data: procurement }
      ] = await Promise.all([
        supabase.from("saved_projects").select("*"),
        supabase.from("price_quotations").select("*"),
        supabase.from("contracts").select("*"),
        supabase.from("risks").select("*"),
        supabase.from("project_progress_history").select("cpi, spi").not("cpi", "is", null),
        supabase.from("subcontractors").select("*"),
        supabase.from("procurement_items").select("*").eq("status", "pending")
      ]);

      let totalValue = 0;
      let totalItems = 0;
      projects?.forEach(p => {
        const analysis = p.analysis_data as any;
        if (analysis?.summary?.total_value) totalValue += analysis.summary.total_value;
        if (analysis?.items?.length) totalItems += analysis.items.length;
      });

      const avgCPI = evmData?.length ? evmData.reduce((sum, r) => sum + (r.cpi || 1), 0) / evmData.length : 1;
      const avgSPI = evmData?.length ? evmData.reduce((sum, r) => sum + (r.spi || 1), 0) / evmData.length : 1;
      const activeRisks = risks?.filter(r => r.status === "active" || r.status === "identified").length || 0;

      setStats({
        totalProjects: projects?.length || 0,
        totalValue, totalItems,
        totalQuotations: quotations?.length || 0,
        totalContracts: contracts?.length || 0,
        totalRisks: risks?.length || 0,
        activeRisks, avgCPI, avgSPI,
        totalSubcontractors: subcontractors?.length || 0,
        pendingProcurement: procurement?.length || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;

      setRecentProjects((data || []).map(p => {
        const analysis = p.analysis_data as any;
        return {
          id: p.id, name: p.name,
          total_value: analysis?.summary?.total_value || 0,
          items_count: analysis?.items?.length || 0,
          created_at: p.created_at, updated_at: p.updated_at
        };
      }));
    } catch (error) {
      console.error("Error fetching recent projects:", error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value == null) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <PMSLogo size="xl" className="mx-auto" />
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isArabic ? "صباح الخير" : "Good morning";
    if (hour < 18) return isArabic ? "مساء الخير" : "Good afternoon";
    return isArabic ? "مساء الخير" : "Good evening";
  };

  return (
    <PageLayout showBackground>
      <div className="space-y-6">
        {/* Welcome Banner */}
        {user && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {greeting()} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
            </div>
            <PMSLogo size="md" />
          </div>
        )}

        {/* 4 KPI Cards */}
        {user && stats && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  {isArabic ? "المشاريع" : "Projects"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground">{stats.totalItems} {isArabic ? "بند" : "items"}</p>
              </CardContent>
            </Card>

            <Card className="border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  {isArabic ? "القيمة الإجمالية" : "Total Value"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground">SAR</p>
              </CardContent>
            </Card>

            <Card className="border-orange-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  {isArabic ? "العقود" : "Contracts"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalContracts}</div>
              </CardContent>
            </Card>

            <Card className="border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  {isArabic ? "المخاطر النشطة" : "Active Risks"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeRisks}</div>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? `من ${stats.totalRisks}` : `of ${stats.totalRisks}`}
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Recent Projects + Quick Access */}
        {user && stats && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
                </CardTitle>
                <Link to="/projects">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {isArabic ? "الكل" : "All"}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px]">
                  {recentProjects.length > 0 ? (
                    <div className="space-y-2">
                      {recentProjects.map((project) => (
                        <div 
                          key={project.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{project.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {project.items_count} {isArabic ? "بند" : "items"} • {formatDate(project.updated_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(project.total_value)}</p>
                            <p className="text-[10px] text-muted-foreground">SAR</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 py-8">
                      <FolderOpen className="h-8 w-8" />
                      <p className="text-sm">{isArabic ? "لا توجد مشاريع" : "No projects yet"}</p>
                      <Link to="/projects/new">
                        <Button size="sm">{isArabic ? "ابدأ الآن" : "Get Started"}</Button>
                      </Link>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  {isArabic ? "الوصول السريع" : "Quick Access"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mainModules.map((module, index) => (
                    <Link key={index} to={module.href}>
                      <div className="p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer text-center space-y-2 group">
                        <module.icon className="h-5 w-5 mx-auto text-primary group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium">{isArabic ? module.label.ar : module.label.en}</p>
                        {module.count && stats && (
                          <Badge variant="secondary" className="text-[10px]">
                            {stats[module.count as keyof DashboardStats] || 0}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Lifecycle Flow */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-base">
              {isArabic ? "🏗️ دورة حياة المشروع" : "🏗️ Project Lifecycle"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LifecycleFlow 
              activePhase={activePhase} 
              onPhaseChange={setActivePhase}
              projectProgress={Math.round(((activePhase - 1) / 5) * 100)}
            />
          </CardContent>
        </Card>

        {/* Phase Actions */}
        <PhaseActionsGrid activePhase={activePhase} />

        {/* Not logged in */}
        {!user && (
          <Card className="max-w-md mx-auto border-dashed">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold">
                {isArabic ? "ابدأ إدارة مشاريعك الآن" : "Start Managing Your Projects"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isArabic ? "سجل دخولك للوصول إلى جميع الميزات" : "Sign in to access all features"}
              </p>
              <Link to="/auth">
                <Button size="lg" className="w-full">{isArabic ? "تسجيل الدخول" : "Sign In"}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
