import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FolderOpen, 
  Building2, 
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  Layers,
  Settings2,
  ChevronRight,
  Package,
  Loader2,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingUp,
  Receipt,
  Briefcase,
  FileUp,
  Zap,
  Search
} from "lucide-react";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { PMSLogo } from "@/components/PMSLogo";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { useAuth } from "@/hooks/useAuth";
import BackgroundImage from "@/components/BackgroundImage";
import { HeroSection } from "@/components/home/HeroSection";
import { LifecycleFlow } from "@/components/home/LifecycleFlow";
import { PhaseActionsGrid } from "@/components/home/PhaseActionsGrid";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area
} from "recharts";

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
  { icon: Receipt, label: { ar: "عروض الأسعار", en: "Quotations" }, href: "/quotations", count: "totalQuotations" },
  { icon: Briefcase, label: { ar: "العقود", en: "Contracts" }, href: "/contracts", count: "totalContracts" },
  { icon: Package, label: { ar: "المشتريات", en: "Procurement" }, href: "/procurement", count: "pendingProcurement" },
  { icon: AlertTriangle, label: { ar: "المخاطر", en: "Risks" }, href: "/risk", count: "activeRisks" },
  { icon: Settings2, label: { ar: "الإعدادات", en: "Settings" }, href: "/settings", count: null },
];

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [projectTrends, setProjectTrends] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [activePhase, setActivePhase] = useState(1);

  const { user, loading: authLoading } = useAuth();
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const { setIsOpen: setSearchOpen } = useGlobalSearch();

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))"
  ];

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
      await Promise.all([
        fetchStats(),
        fetchRecentProjects(),
        fetchProjectTrends()
      ]);
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
        if (analysis?.summary?.total_value) {
          totalValue += analysis.summary.total_value;
        }
        if (analysis?.items?.length) {
          totalItems += analysis.items.length;
        }
      });

      const avgCPI = evmData?.length 
        ? evmData.reduce((sum, r) => sum + (r.cpi || 1), 0) / evmData.length 
        : 1;
      const avgSPI = evmData?.length 
        ? evmData.reduce((sum, r) => sum + (r.spi || 1), 0) / evmData.length 
        : 1;

      const activeRisks = risks?.filter(r => 
        r.status === "active" || r.status === "identified"
      ).length || 0;

      setStats({
        totalProjects: projects?.length || 0,
        totalValue,
        totalItems,
        totalQuotations: quotations?.length || 0,
        totalContracts: contracts?.length || 0,
        totalRisks: risks?.length || 0,
        activeRisks,
        avgCPI,
        avgSPI,
        totalSubcontractors: subcontractors?.length || 0,
        pendingProcurement: procurement?.length || 0
      });

      // Category distribution
      const categories: Record<string, number> = {};
      projects?.forEach(p => {
        const analysis = p.analysis_data as any;
        analysis?.items?.forEach((item: any) => {
          const cat = item.category || (isArabic ? "غير مصنف" : "Uncategorized");
          categories[cat] = (categories[cat] || 0) + (item.total_price || 0);
        });
      });

      const categoryData = Object.entries(categories)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setCategoryDistribution(categoryData);
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

      const projects: ProjectSummary[] = (data || []).map(p => {
        const analysis = p.analysis_data as any;
        return {
          id: p.id,
          name: p.name,
          total_value: analysis?.summary?.total_value || 0,
          items_count: analysis?.items?.length || 0,
          created_at: p.created_at,
          updated_at: p.updated_at
        };
      });

      setRecentProjects(projects);
    } catch (error) {
      console.error("Error fetching recent projects:", error);
    }
  };

  const fetchProjectTrends = async () => {
    try {
      const { data } = await supabase
        .from("saved_projects")
        .select("created_at, analysis_data")
        .order("created_at", { ascending: true });

      const monthlyData: Record<string, { projects: number; value: number }> = {};
      
      data?.forEach(p => {
        const date = new Date(p.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { projects: 0, value: 0 };
        }
        
        monthlyData[monthKey].projects++;
        const analysis = p.analysis_data as any;
        monthlyData[monthKey].value += analysis?.summary?.total_value || 0;
      });

      const trendData = Object.entries(monthlyData)
        .slice(-6)
        .map(([month, data]) => ({
          month: month.split('-')[1] + '/' + month.split('-')[0].slice(2),
          projects: data.projects,
          value: Math.round(data.value / 1000)
        }));

      setProjectTrends(trendData);
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const getPerformanceStatus = (value: number) => {
    if (value >= 1) return { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10", icon: ArrowUpRight, label: isArabic ? "جيد" : "Good" };
    if (value >= 0.9) return { color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-500/10", icon: Activity, label: isArabic ? "تحذير" : "Warning" };
    return { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10", icon: ArrowDownRight, label: isArabic ? "حرج" : "Critical" };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BackgroundImage activePhase={1} />
        <div className="text-center space-y-4 relative z-10">
          <PMSLogo size="xl" className="mx-auto" />
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const cpiStatus = getPerformanceStatus(stats?.avgCPI || 1);
  const spiStatus = getPerformanceStatus(stats?.avgSPI || 1);

  // Recent actions based on most common user flows
  const recentActions = [
    { icon: FileUp, label: { ar: "تحليل BOQ", en: "Analyze BOQ" }, href: "/projects?tab=analyze" },
    { icon: Receipt, label: { ar: "عروض الأسعار", en: "Quotations" }, href: "/quotations" },
    { icon: Briefcase, label: { ar: "العقود", en: "Contracts" }, href: "/contracts" },
  ];

  return (
    <div className="min-h-screen bg-transparent relative" dir={isArabic ? 'rtl' : 'ltr'}>
      <BackgroundImage activePhase={activePhase} />
      
      {/* Header - New Professional Design */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Company Logo - Always show Alimtyaz logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/50 bg-white p-1 shadow-sm">
                  <img 
                    src={alimtyazLogo} 
                    alt="Alimtyaz" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden md:block">
                  <h1 className="font-display text-lg font-bold gradient-text">PMS</h1>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "نظام إدارة المشاريع" : "Project Management"}
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Advanced Search Box - Always Visible (Using button for better click handling) */}
            <button 
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex-1 max-w-xl mx-4 group hidden sm:flex header-search-box
                relative h-10 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm
                items-center text-sm text-muted-foreground text-left
                hover:border-primary/50 hover:bg-background/80 transition-all duration-200
                shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary/20
                cursor-pointer"
              aria-label={isArabic ? "فتح البحث" : "Open search"}
            >
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
              <span className="pl-10 pr-16 flex-1 pointer-events-none">
                {isArabic ? "بحث في البرنامج..." : "Search the application..."}
              </span>
              <kbd className="absolute right-3 hidden md:inline-flex h-6 items-center gap-1 rounded border border-border/60 bg-muted/50 px-2 text-xs text-muted-foreground pointer-events-none">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="sm:hidden h-9 w-9 relative z-[56] pointer-events-auto"
              onClick={() => setSearchOpen(true)}
              aria-label={isArabic ? "فتح البحث" : "Open search"}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Right: Developer Photo + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {user && <RealtimeNotifications />}
              
              {/* Quick Actions */}
              <div className="hidden sm:flex items-center gap-1">
                <LanguageToggle />
                <ThemeToggle />
              </div>
              
              <Link to="/settings" className="hidden sm:block">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </Link>
              
              {/* Developer Photo */}
              <Link to="/about" className="group">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-primary/30 
                  hover:border-primary transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg">
                  <img 
                    src={developerPhoto} 
                    alt="Developer" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              
              {/* User Menu */}
              {user ? (
                <UserMenu />
              ) : (
                <Link to="/auth">
                  <Button size="sm">{isArabic ? "دخول" : "Login"}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-5 relative z-10">
        {/* Hero Section */}
        <HeroSection 
          stats={stats ? {
            totalProjects: stats.totalProjects,
            totalItems: stats.totalItems,
            totalValue: stats.totalValue
          } : undefined}
          recentTrend={projectTrends.map(t => ({ value: t.projects * 10 }))}
          projectDistribution={stats ? [
            { name: isArabic ? "نشط" : "Active", value: Math.max(1, Math.floor(stats.totalProjects * 0.45)), color: "#22c55e" },
            { name: isArabic ? "معلق" : "Pending", value: Math.max(1, Math.floor(stats.totalProjects * 0.25)), color: "#f59e0b" },
            { name: isArabic ? "مكتمل" : "Completed", value: Math.max(1, Math.floor(stats.totalProjects * 0.30)), color: "#3b82f6" }
          ] : undefined}
        />

        {/* Lifecycle Flow */}
        <section>
          <Card className="bg-card/70 backdrop-blur-md border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-lg">
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
        </section>

        {/* Recent Actions Shortcuts */}
        {user && (
          <section className="flex items-center justify-center gap-2 flex-wrap animate-fade-in">
            <span className="text-xs text-muted-foreground px-2">
              {isArabic ? "اختصارات سريعة:" : "Quick shortcuts:"}
            </span>
            {recentActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <Button variant="outline" size="sm" className="gap-2 bg-card/60 backdrop-blur-sm hover:bg-primary/10 transition-all">
                  <action.icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{isArabic ? action.label.ar : action.label.en}</span>
                </Button>
              </Link>
            ))}
          </section>
        )}

        {/* Phase Actions Grid */}
        <section>
          <PhaseActionsGrid activePhase={activePhase} />
        </section>

        {user && stats && (
          <>
            {/* KPI Summary Cards */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {isArabic ? "المشاريع" : "Projects"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalProjects}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    {isArabic ? "القيمة الإجمالية" : "Total Value"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                  <div className="text-xs text-muted-foreground">SAR</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {isArabic ? "البنود" : "Items"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalItems}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    {isArabic ? "عروض الأسعار" : "Quotations"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalQuotations}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 backdrop-blur-sm">
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

              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    {isArabic ? "المخاطر النشطة" : "Active Risks"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activeRisks}</div>
                  <div className="text-xs text-muted-foreground">
                    {isArabic ? `من ${stats.totalRisks} إجمالي` : `of ${stats.totalRisks} total`}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Performance & Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Indicators */}
              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {isArabic ? "مؤشرات الأداء" : "Performance Indicators"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${cpiStatus.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{isArabic ? "مؤشر أداء التكلفة" : "CPI"}</span>
                      <Badge variant={stats.avgCPI >= 1 ? "default" : "destructive"}>{cpiStatus.label}</Badge>
                    </div>
                    <div className={`text-3xl font-bold ${cpiStatus.color}`}>
                      {stats.avgCPI.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${spiStatus.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{isArabic ? "مؤشر أداء الجدول" : "SPI"}</span>
                      <Badge variant={stats.avgSPI >= 1 ? "default" : "destructive"}>{spiStatus.label}</Badge>
                    </div>
                    <div className={`text-3xl font-bold ${spiStatus.color}`}>
                      {stats.avgSPI.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Trends Chart */}
              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {isArabic ? "اتجاهات المشاريع" : "Project Trends"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectTrends.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectTrends}>
                          <defs>
                            <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="projects" 
                            stroke="hsl(var(--primary))" 
                            fillOpacity={1} 
                            fill="url(#colorProjects)" 
                            name={isArabic ? "المشاريع" : "Projects"}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد بيانات كافية" : "Not enough data"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    {isArabic ? "توزيع التكاليف" : "Cost Distribution"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryDistribution.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد بيانات" : "No data available"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Recent Projects & Modules */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
                  </CardTitle>
                  <Link to="/projects">
                    <Button variant="ghost" size="sm" className="gap-1">
                      {isArabic ? "عرض الكل" : "View All"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    {recentProjects.length > 0 ? (
                      <div className="space-y-3">
                        {recentProjects.map((project) => (
                          <div 
                            key={project.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
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
                              <p className="text-xs text-muted-foreground">SAR</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                        <FolderOpen className="h-10 w-10" />
                        <p>{isArabic ? "لا توجد مشاريع" : "No projects yet"}</p>
                        <Link to="/analyze">
                          <Button size="sm">{isArabic ? "ابدأ الآن" : "Get Started"}</Button>
                        </Link>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* All Modules Grid */}
              <Card className="bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    {isArabic ? "الوصول السريع" : "Quick Access"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mainModules.map((module, index) => (
                      <Link key={index} to={module.href}>
                        <div className="p-4 rounded-lg border bg-card/50 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer text-center space-y-2 group">
                          <module.icon className="h-6 w-6 mx-auto text-primary group-hover:scale-110 transition-transform" />
                          <p className="text-xs font-medium">{isArabic ? module.label.ar : module.label.en}</p>
                          {module.count && stats && (
                            <Badge variant="secondary" className="text-xs">
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
          </>
        )}

        {!user && (
          <section className="text-center py-12">
            <Card className="max-w-md mx-auto border-dashed bg-card/70 backdrop-blur-sm">
              <CardContent className="p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">
                  {isArabic ? "ابدأ إدارة مشاريعك الآن" : "Start Managing Your Projects Now"}
                </h3>
                <p className="text-muted-foreground">
                  {isArabic 
                    ? "سجل دخولك للوصول إلى جميع ميزات النظام المتقدمة"
                    : "Sign in to access all advanced system features"
                  }
                </p>
                <Link to="/auth">
                  <Button size="lg" className="w-full">
                    {isArabic ? "تسجيل الدخول" : "Sign In"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-12 relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PMSLogo size="sm" />
              <span className="text-sm text-muted-foreground">
                © 2024 PMS - {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">
                {isArabic ? "حول" : "About"}
              </Link>
              <Link to="/changelog" className="hover:text-foreground transition-colors">
                {isArabic ? "سجل التحديثات" : "Changelog"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
