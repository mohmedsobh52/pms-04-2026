import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FolderOpen, Building2, DollarSign, AlertTriangle, Layers,
  Settings2, ChevronRight, Package, Loader2, Clock, Briefcase, Zap,
  TrendingUp, TrendingDown, Plus, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PMSLogo } from "@/components/PMSLogo";
import { PageLayout } from "@/components/PageLayout";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
import { LifecycleFlow } from "@/components/home/LifecycleFlow";
import { PhaseActionsGrid } from "@/components/home/PhaseActionsGrid";
import { cn } from "@/lib/utils";

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

const kpiConfig = [
  { 
    key: "totalProjects" as const, 
    icon: FolderOpen, 
    labelAr: "المشاريع", labelEn: "Projects",
    borderClass: "border-t-primary",
    iconBg: "bg-primary/10", iconColor: "text-primary",
    subKey: "totalItems" as const, subLabelAr: "بند", subLabelEn: "items"
  },
  { 
    key: "totalValue" as const, 
    icon: DollarSign,
    labelAr: "القيمة الإجمالية", labelEn: "Total Value",
    borderClass: "border-t-emerald-500",
    iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400",
    subKey: null, subLabelAr: "SAR", subLabelEn: "SAR"
  },
  { 
    key: "totalContracts" as const, 
    icon: Briefcase,
    labelAr: "العقود", labelEn: "Contracts",
    borderClass: "border-t-orange-500",
    iconBg: "bg-orange-500/10", iconColor: "text-orange-600 dark:text-orange-400",
    subKey: null, subLabelAr: "", subLabelEn: ""
  },
  { 
    key: "activeRisks" as const, 
    icon: AlertTriangle,
    labelAr: "المخاطر النشطة", labelEn: "Active Risks",
    borderClass: "border-t-red-500",
    iconBg: "bg-red-500/10", iconColor: "text-red-600 dark:text-red-400",
    subKey: "totalRisks" as const, subLabelAr: "من", subLabelEn: "of"
  },
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

  const getKpiValue = (key: string) => {
    if (!stats) return 0;
    const val = stats[key as keyof DashboardStats];
    if (key === "totalValue") return formatCurrency(val as number);
    return val;
  };

  return (
    <PageLayout showBackground>
      <div className="space-y-6">
        {/* Welcome Banner */}
        {user && (
         <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card/80 backdrop-blur-md p-5 md:p-6">
            <div className="flex items-center justify-between">
              {/* Developer Photo + Greeting */}
              <div className="flex items-center gap-4">
                <img 
                  src={developerPhoto} 
                  alt="Dr.Eng. Mohamed Sobh"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shadow-lg flex-shrink-0"
                />
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {greeting()} 👋
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                  {stats && stats.totalProjects > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-semibold text-foreground">{stats.totalProjects}</span>{" "}
                      {isArabic ? "مشروع نشط" : "active projects"}
                    </p>
                  )}
                </div>
              </div>
              {/* Company Logo + Actions */}
              <div className="flex items-center gap-3">
                <Link to="/projects/new">
                  <Button size="sm" className="gap-2 shadow-md">
                    <Plus className="h-4 w-4" />
                    {isArabic ? "مشروع جديد" : "New Project"}
                  </Button>
                </Link>
                <img 
                  src={alimtyazLogo} 
                  alt="AL IMTYAZ ALWATANIYA"
                  className="w-12 h-12 rounded-lg object-contain border border-border/50 bg-white/90 p-0.5 shadow-sm flex-shrink-0"
                />
                <PMSLogo size="md" />
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
          </div>
        )}

        {/* 4 KPI Cards - Enhanced */}
        {user && stats && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiConfig.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.key} className={cn("border-t-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-card/80 backdrop-blur-md", kpi.borderClass)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", kpi.iconBg)}>
                        <Icon className={cn("h-5 w-5", kpi.iconColor)} />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">
                      {getKpiValue(kpi.key)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isArabic ? kpi.labelAr : kpi.labelEn}
                      {kpi.subKey && stats[kpi.subKey] !== undefined && (
                        <span className="ml-1 rtl:mr-1">
                          {" "}• {kpi.subLabelEn !== "items" ? `${kpi.subLabelEn} ` : ""}{kpi.subKey === "totalItems" ? `${stats[kpi.subKey]} ${isArabic ? kpi.subLabelAr : kpi.subLabelEn}` : `${isArabic ? kpi.subLabelAr : kpi.subLabelEn} ${stats[kpi.subKey]}`}
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {/* Recent Projects + Quick Access */}
        {user && stats && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Projects - Enhanced */}
             <Card className="overflow-hidden bg-card/80 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/10">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-primary" />
                  {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
                </CardTitle>
                <Link to="/projects">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    {isArabic ? "عرض الكل" : "View All"}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[280px]">
                  {recentProjects.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {recentProjects.map((project) => (
                        <div 
                          key={project.id} 
                          className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {project.items_count} {isArabic ? "بند" : "items"} • {formatDate(project.updated_at)}
                              </p>
                              {/* Mini progress bar */}
                              <Progress value={Math.min(project.items_count * 10, 100)} className="h-1 mt-1.5" />
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3 rtl:mr-3">
                            <p className="font-bold text-sm">{formatCurrency(project.total_value)}</p>
                            <Badge variant="outline" className="text-[10px] mt-0.5">SAR</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 py-12">
                      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
                        <FolderOpen className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-medium">{isArabic ? "لا توجد مشاريع بعد" : "No projects yet"}</p>
                      <Link to="/projects/new">
                        <Button size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          {isArabic ? "ابدأ الآن" : "Get Started"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Access - Enhanced */}
             <Card className="overflow-hidden bg-card/80 backdrop-blur-md">
              <CardHeader className="border-b border-border/50 bg-muted/10">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  {isArabic ? "الوصول السريع" : "Quick Access"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mainModules.map((module, index) => (
                    <Link key={index} to={module.href}>
                      <div className="p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer text-center space-y-2.5 group hover:shadow-sm hover:-translate-y-0.5">
                        <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <module.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-xs font-semibold">{isArabic ? module.label.ar : module.label.en}</p>
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
         <Card className="overflow-hidden bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-center text-base">
              {isArabic ? "🏗️ دورة حياة المشروع" : "🏗️ Project Lifecycle"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
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
