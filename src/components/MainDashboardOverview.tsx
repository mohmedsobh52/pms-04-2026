import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  TrendingUp,
  DollarSign,
  Activity,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Package,
  Receipt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Legend,
  LineChart,
  Line,
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

interface OverviewStats {
  totalProjects: number;
  totalValue: number;
  totalItems: number;
  totalQuotations: number;
  totalContracts: number;
  totalRisks: number;
  activeRisks: number;
  avgCPI: number;
  avgSPI: number;
}

export function MainDashboardOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [projectTrends, setProjectTrends] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);

  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))"
  ];

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

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
      // Fetch saved projects
      const { data: projects } = await supabase
        .from("saved_projects")
        .select("*");

      // Fetch quotations
      const { data: quotations } = await supabase
        .from("price_quotations")
        .select("*");

      // Fetch contracts
      const { data: contracts } = await supabase
        .from("contracts")
        .select("*");

      // Fetch risks
      const { data: risks } = await supabase
        .from("risks")
        .select("*");

      // Fetch EVM data
      const { data: evmData } = await supabase
        .from("project_progress_history")
        .select("cpi, spi")
        .not("cpi", "is", null);

      // Calculate totals
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
        avgSPI
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

      // Group by month
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
    if (value == null) return '0';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  const getPerformanceStatus = (value: number) => {
    if (value >= 1) return { color: "text-green-500", icon: ArrowUpRight, label: isArabic ? "جيد" : "Good" };
    if (value >= 0.9) return { color: "text-yellow-500", icon: Activity, label: isArabic ? "تحذير" : "Warning" };
    return { color: "text-red-500", icon: ArrowDownRight, label: isArabic ? "حرج" : "Critical" };
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
            {isArabic ? "يرجى تسجيل الدخول لعرض لوحة التحكم الرئيسية" : "Please sign in to view the main dashboard"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const cpiStatus = getPerformanceStatus(stats?.avgCPI || 1);
  const spiStatus = getPerformanceStatus(stats?.avgSPI || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">
          {isArabic ? "لوحة التحكم الرئيسية" : "Main Dashboard"}
        </h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              {isArabic ? "المشاريع" : "Projects"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalProjects || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              {isArabic ? "القيمة الإجمالية" : "Total Value"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalValue || 0)}
            </div>
            <div className="text-xs text-muted-foreground">SAR</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              {isArabic ? "البنود" : "Items"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalItems || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-500" />
              {isArabic ? "عروض الأسعار" : "Quotations"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalQuotations || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              {isArabic ? "العقود" : "Contracts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalContracts || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {isArabic ? "المخاطر النشطة" : "Active Risks"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeRisks || 0}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? `من ${stats?.totalRisks || 0} إجمالي` : `of ${stats?.totalRisks || 0} total`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "مؤشر أداء التكلفة (CPI)" : "Cost Performance Index (CPI)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-bold ${cpiStatus.color}`}>
                  {(stats?.avgCPI || 1).toFixed(2)}
                </span>
                <cpiStatus.icon className={`h-6 w-6 ${cpiStatus.color}`} />
              </div>
              <Badge variant={stats?.avgCPI && stats.avgCPI >= 1 ? "default" : "destructive"}>
                {cpiStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "مؤشر أداء الجدول (SPI)" : "Schedule Performance Index (SPI)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-bold ${spiStatus.color}`}>
                  {(stats?.avgSPI || 1).toFixed(2)}
                </span>
                <spiStatus.icon className={`h-6 w-6 ${spiStatus.color}`} />
              </div>
              <Badge variant={stats?.avgSPI && stats.avgSPI >= 1 ? "default" : "destructive"}>
                {spiStatus.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {isArabic ? "اتجاهات المشاريع" : "Project Trends"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectTrends.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectTrends}>
                    <defs>
                      <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات كافية" : "Not enough data"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {isArabic ? "توزيع التكاليف حسب التصنيف" : "Cost Distribution by Category"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryDistribution.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name }) => name.length > 15 ? name.slice(0, 15) + '...' : name}
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value) + ' SAR'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data available"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div 
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.items_count} {isArabic ? "بند" : "items"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(project.total_value)} SAR</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(project.updated_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
