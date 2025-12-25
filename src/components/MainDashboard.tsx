import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from "recharts";

interface DashboardStats {
  totalProjects: number;
  totalQuotations: number;
  totalValue: number;
  averageQuotationValue: number;
  recentProjects: any[];
  recentQuotations: any[];
  quotationsByStatus: { status: string; count: number }[];
  monthlyActivity: { month: string; projects: number; quotations: number }[];
}

interface MainDashboardProps {
  onLoadProject?: (analysisData: any, wbsData: any) => void;
}

export function MainDashboard({ onLoadProject }: MainDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { user } = useAuth();
  const { isArabic, t } = useLanguage();

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(142, 76%, 36%)",
    "hsl(38, 92%, 50%)",
    "hsl(0, 84%, 60%)"
  ];

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const exportToPDF = () => {
    if (!stats) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.text(isArabic ? "تقرير لوحة التحكم" : "Dashboard Report", pageWidth / 2, 20, { align: "center" });
    
    // Date
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString("en-US"), pageWidth / 2, 28, { align: "center" });

    // Stats Summary
    doc.setFontSize(14);
    doc.text(isArabic ? "ملخص الإحصائيات" : "Statistics Summary", 14, 40);

    autoTable(doc, {
      startY: 45,
      head: [[isArabic ? "البند" : "Item", isArabic ? "القيمة" : "Value"]],
      body: [
        [isArabic ? "إجمالي المشاريع" : "Total Projects", stats.totalProjects.toString()],
        [isArabic ? "عروض الأسعار" : "Quotations", stats.totalQuotations.toString()],
        [isArabic ? "إجمالي القيمة" : "Total Value", `SAR ${stats.totalValue.toLocaleString("en-US")}`],
        [isArabic ? "متوسط العرض" : "Avg. Quotation", `SAR ${stats.averageQuotationValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`],
      ],
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Recent Projects
    const finalY1 = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(14);
    doc.text(isArabic ? "المشاريع الأخيرة" : "Recent Projects", 14, finalY1 + 15);

    if (stats.recentProjects.length > 0) {
      autoTable(doc, {
        startY: finalY1 + 20,
        head: [[isArabic ? "اسم المشروع" : "Project Name", isArabic ? "التاريخ" : "Date"]],
        body: stats.recentProjects.map(p => [
          p.name,
          new Date(p.created_at).toLocaleDateString("en-US")
        ]),
        theme: "striped",
        headStyles: { fillColor: [245, 158, 11] },
      });
    }

    // Recent Quotations
    const finalY2 = (doc as any).lastAutoTable.finalY || finalY1 + 40;
    doc.setFontSize(14);
    doc.text(isArabic ? "العروض الأخيرة" : "Recent Quotations", 14, finalY2 + 15);

    if (stats.recentQuotations.length > 0) {
      autoTable(doc, {
        startY: finalY2 + 20,
        head: [[isArabic ? "اسم العرض" : "Quotation", isArabic ? "المورد" : "Supplier", isArabic ? "المبلغ" : "Amount"]],
        body: stats.recentQuotations.map(q => [
          q.name,
          q.supplier_name || "-",
          q.total_amount ? `SAR ${q.total_amount.toLocaleString("en-US")}` : "-"
        ]),
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
      });
    }

    doc.save("dashboard-report.pdf");
    toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
  };

  const applyDateFilter = () => {
    fetchDashboardData();
    setIsFilterOpen(false);
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    fetchDashboardData();
    setIsFilterOpen(false);
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch projects with date filter
      let projectsQuery = supabase
        .from("saved_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateFrom) {
        projectsQuery = projectsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        projectsQuery = projectsQuery.lte("created_at", dateTo + "T23:59:59");
      }

      const { data: projects, error: projectsError } = await projectsQuery;

      if (projectsError) throw projectsError;

      // Fetch quotations with date filter
      let quotationsQuery = supabase
        .from("price_quotations")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateFrom) {
        quotationsQuery = quotationsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        quotationsQuery = quotationsQuery.lte("created_at", dateTo + "T23:59:59");
      }

      const { data: quotations, error: quotationsError } = await quotationsQuery;

      if (quotationsError) throw quotationsError;

      // Calculate stats
      const totalValue = quotations?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;
      const averageValue = quotations?.length ? totalValue / quotations.length : 0;

      // Group quotations by status
      const statusCounts: Record<string, number> = {};
      quotations?.forEach(q => {
        const status = q.status || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const quotationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status: getStatusLabel(status),
        count
      }));

      // Calculate monthly activity (last 6 months)
      const monthlyActivity = calculateMonthlyActivity(projects || [], quotations || []);

      setStats({
        totalProjects: projects?.length || 0,
        totalQuotations: quotations?.length || 0,
        totalValue,
        averageQuotationValue: averageValue,
        recentProjects: projects?.slice(0, 5) || [],
        recentQuotations: quotations?.slice(0, 5) || [],
        quotationsByStatus,
        monthlyActivity
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: isArabic ? "قيد الانتظار" : "Pending",
      approved: isArabic ? "معتمد" : "Approved",
      rejected: isArabic ? "مرفوض" : "Rejected",
      under_review: isArabic ? "قيد المراجعة" : "Under Review"
    };
    return labels[status] || status;
  };

  const calculateMonthlyActivity = (projects: any[], quotations: any[]) => {
    const months: Record<string, { projects: number; quotations: number }> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { projects: 0, quotations: 0 };
    }

    // Count projects
    projects.forEach(p => {
      const date = new Date(p.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].projects++;
      }
    });

    // Count quotations
    quotations.forEach(q => {
      const date = new Date(q.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].quotations++;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month: formatMonth(month),
      ...data
    }));
  };

  const formatMonth = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short' });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LayoutDashboard className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {isArabic ? "سجل الدخول لعرض لوحة التحكم" : "Sign in to view dashboard"}
          </h3>
          <p className="text-muted-foreground text-center">
            {isArabic 
              ? "قم بتسجيل الدخول لعرض ملخص مشاريعك وعروض الأسعار"
              : "Sign in to see a summary of your projects and quotations"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {isArabic ? "لوحة التحكم" : "Dashboard"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "ملخص جميع المشاريع والعروض" : "Overview of all projects and quotations"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={dateFrom || dateTo ? "border-primary" : ""}>
                <Filter className="w-4 h-4 me-2" />
                {isArabic ? "فلترة" : "Filter"}
                {(dateFrom || dateTo) && (
                  <Badge variant="secondary" className="ms-2 text-xs">
                    {isArabic ? "مفعّل" : "Active"}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">{isArabic ? "فلترة حسب التاريخ" : "Filter by Date"}</h4>
                <div className="space-y-2">
                  <Label>{isArabic ? "من تاريخ" : "From Date"}</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "إلى تاريخ" : "To Date"}</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyDateFilter} className="flex-1">
                    {isArabic ? "تطبيق" : "Apply"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearDateFilter}>
                    {isArabic ? "مسح" : "Clear"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export PDF */}
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="w-4 h-4 me-2" />
            {isArabic ? "تصدير PDF" : "Export PDF"}
          </Button>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <Activity className="w-4 h-4 me-2" />
            {isArabic ? "تحديث" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm hover:shadow-md transition-shadow rounded-2xl border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {isArabic ? "إجمالي المشاريع" : "Total Projects"}
                </p>
                <p className="text-4xl font-bold text-foreground">{stats.totalProjects}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <FolderOpen className="w-7 h-7 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm hover:shadow-md transition-shadow rounded-2xl border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {isArabic ? "عروض الأسعار" : "Quotations"}
                </p>
                <p className="text-4xl font-bold text-foreground">{stats.totalQuotations}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Receipt className="w-7 h-7 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm hover:shadow-md transition-shadow rounded-2xl border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {isArabic ? "إجمالي القيمة" : "Total Value"}
                </p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm hover:shadow-md transition-shadow rounded-2xl border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {isArabic ? "متوسط العرض" : "Avg. Quotation"}
                </p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.averageQuotationValue)}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {isArabic ? "النشاط الشهري" : "Monthly Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyActivity}>
                  <defs>
                    <linearGradient id="projectsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="quotationsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="projects"
                    name={isArabic ? "المشاريع" : "Projects"}
                    stroke="hsl(var(--primary))"
                    fill="url(#projectsGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="quotations"
                    name={isArabic ? "العروض" : "Quotations"}
                    stroke="hsl(var(--accent))"
                    fill="url(#quotationsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quotations by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              {isArabic ? "حالة العروض" : "Quotation Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {stats.quotationsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={stats.quotationsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {stats.quotationsByStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {isArabic ? "لا توجد عروض أسعار" : "No quotations yet"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentProjects.length > 0 ? (
              <div className="space-y-3">
                {stats.recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => onLoadProject?.(project.analysis_data, project.wbs_data)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(project.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Quotations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              {isArabic ? "العروض الأخيرة" : "Recent Quotations"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentQuotations.length > 0 ? (
              <div className="space-y-3">
                {stats.recentQuotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">{quotation.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {quotation.supplier_name || (isArabic ? 'مورد غير محدد' : 'Unknown supplier')}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusLabel(quotation.status || 'pending')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="font-semibold text-primary">
                        {quotation.total_amount ? formatCurrency(quotation.total_amount) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(quotation.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isArabic ? "لا توجد عروض أسعار" : "No quotations yet"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
