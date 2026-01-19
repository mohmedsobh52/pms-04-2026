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
  CalendarDays,
  FileSpreadsheet,
  TrendingUpDown,
  Printer,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  X,
  GitCompare,
  ShieldAlert,
  FileSignature,
  Calculator,
  Link2
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
import { XLSX } from '@/lib/exceljs-utils';
import { ProjectComparisonReport } from "./ProjectComparisonReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskManagement } from "./RiskManagement";
import { ContractManagement } from "./ContractManagement";
import { CostBenefitAnalysis } from "./CostBenefitAnalysis";
import { ContractLinkage } from "./ContractLinkage";
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
  onLoadProject?: (analysisData: any, wbsData: any, projectId?: string) => void;
}

// Budget settings interface
interface BudgetSettings {
  maxBudget: number;
  alertThreshold: number; // percentage (e.g., 80 means alert at 80%)
}

export function MainDashboard({ onLoadProject }: MainDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Budget settings
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(() => {
    const saved = localStorage.getItem("dashboard_budget_settings");
    return saved ? JSON.parse(saved) : { maxBudget: 1000000, alertThreshold: 80 };
  });
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);
  
  // Image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(() => {
    return localStorage.getItem("dashboard_uploaded_image");
  });
  const [isDragOver, setIsDragOver] = useState(false);
  
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

  const exportToExcel = () => {
    if (!stats) return;

    const wb = XLSX.utils.book_new();

    // Stats Summary Sheet
    const summaryData = [
      [isArabic ? "البند" : "Item", isArabic ? "القيمة" : "Value"],
      [isArabic ? "إجمالي المشاريع" : "Total Projects", stats.totalProjects],
      [isArabic ? "عروض الأسعار" : "Quotations", stats.totalQuotations],
      [isArabic ? "إجمالي القيمة" : "Total Value", stats.totalValue],
      [isArabic ? "متوسط العرض" : "Avg. Quotation", Math.round(stats.averageQuotationValue)],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, isArabic ? "الملخص" : "Summary");

    // Projects Sheet
    if (stats.recentProjects.length > 0) {
      const projectsData = [
        [isArabic ? "اسم المشروع" : "Project Name", isArabic ? "التاريخ" : "Date"],
        ...stats.recentProjects.map(p => [
          p.name,
          new Date(p.created_at).toLocaleDateString("en-US")
        ])
      ];
      const projectsSheet = XLSX.utils.aoa_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(wb, projectsSheet, isArabic ? "المشاريع" : "Projects");
    }

    // Quotations Sheet
    if (stats.recentQuotations.length > 0) {
      const quotationsData = [
        [isArabic ? "اسم العرض" : "Quotation", isArabic ? "المورد" : "Supplier", isArabic ? "المبلغ" : "Amount"],
        ...stats.recentQuotations.map(q => [
          q.name,
          q.supplier_name || "-",
          q.total_amount || 0
        ])
      ];
      const quotationsSheet = XLSX.utils.aoa_to_sheet(quotationsData);
      XLSX.utils.book_append_sheet(wb, quotationsSheet, isArabic ? "العروض" : "Quotations");
    }

    // Monthly Activity Sheet
    const activityData = [
      [isArabic ? "الشهر" : "Month", isArabic ? "المشاريع" : "Projects", isArabic ? "العروض" : "Quotations"],
      ...stats.monthlyActivity.map(m => [m.month, m.projects, m.quotations])
    ];
    const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
    XLSX.utils.book_append_sheet(wb, activitySheet, isArabic ? "النشاط الشهري" : "Monthly Activity");

    XLSX.writeFile(wb, "dashboard-report.xlsx");
    toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
  };

  // Direct print function
  const printReport = () => {
    if (!stats) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isArabic ? "تقرير لوحة التحكم" : "Dashboard Report"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
          h1 { text-align: center; color: #1e40af; }
          h2 { color: #374151; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; }
          th { background-color: #3b82f6; color: white; }
          .stat-card { display: inline-block; width: 23%; margin: 1%; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
          .stat-label { color: #6b7280; font-size: 14px; }
          .date { text-align: center; color: #6b7280; margin-bottom: 20px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${isArabic ? "تقرير لوحة التحكم" : "Dashboard Report"}</h1>
        <p class="date">${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</p>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <div class="stat-card">
            <div class="stat-value">${stats.totalProjects}</div>
            <div class="stat-label">${isArabic ? "المشاريع" : "Projects"}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalQuotations}</div>
            <div class="stat-label">${isArabic ? "العروض" : "Quotations"}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">SAR ${stats.totalValue.toLocaleString()}</div>
            <div class="stat-label">${isArabic ? "إجمالي القيمة" : "Total Value"}</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">SAR ${Math.round(stats.averageQuotationValue).toLocaleString()}</div>
            <div class="stat-label">${isArabic ? "متوسط العرض" : "Avg. Quotation"}</div>
          </div>
        </div>

        <h2>${isArabic ? "المشاريع الأخيرة" : "Recent Projects"}</h2>
        <table>
          <thead>
            <tr>
              <th>${isArabic ? "اسم المشروع" : "Project Name"}</th>
              <th>${isArabic ? "التاريخ" : "Date"}</th>
            </tr>
          </thead>
          <tbody>
            ${stats.recentProjects.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${new Date(p.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>${isArabic ? "عروض الأسعار الأخيرة" : "Recent Quotations"}</h2>
        <table>
          <thead>
            <tr>
              <th>${isArabic ? "اسم العرض" : "Quotation"}</th>
              <th>${isArabic ? "المورد" : "Supplier"}</th>
              <th>${isArabic ? "المبلغ" : "Amount"}</th>
            </tr>
          </thead>
          <tbody>
            ${stats.recentQuotations.map(q => `
              <tr>
                <td>${q.name}</td>
                <td>${q.supplier_name || '-'}</td>
                <td>${q.total_amount ? `SAR ${q.total_amount.toLocaleString()}` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
    toast.success(isArabic ? "جاري الطباعة..." : "Printing...");
  };

  // Save budget settings
  const saveBudgetSettings = (newSettings: BudgetSettings) => {
    setBudgetSettings(newSettings);
    localStorage.setItem("dashboard_budget_settings", JSON.stringify(newSettings));
    setShowBudgetSettings(false);
    toast.success(isArabic ? "تم حفظ إعدادات الميزانية" : "Budget settings saved");
  };

  // Check budget alerts
  const checkBudgetAlert = (): { isOverBudget: boolean; isNearThreshold: boolean; percentage: number } => {
    if (!stats) return { isOverBudget: false, isNearThreshold: false, percentage: 0 };
    
    const percentage = (stats.totalValue / budgetSettings.maxBudget) * 100;
    const isOverBudget = percentage >= 100;
    const isNearThreshold = percentage >= budgetSettings.alertThreshold && percentage < 100;
    
    return { isOverBudget, isNearThreshold, percentage };
  };

  // Image upload handlers
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(isArabic ? "يرجى تحميل صورة فقط" : "Please upload an image only");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isArabic ? "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" : "Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      localStorage.setItem("dashboard_uploaded_image", result);
      toast.success(isArabic ? "تم رفع الصورة بنجاح" : "Image uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    localStorage.removeItem("dashboard_uploaded_image");
    toast.success(isArabic ? "تم حذف الصورة" : "Image removed");
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
      {/* Tabs for different management sections */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "المخاطر" : "Risks"}</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "العقود" : "Contracts"}</span>
          </TabsTrigger>
          <TabsTrigger value="cost-benefit" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "التكلفة/العائد" : "Cost/Benefit"}</span>
          </TabsTrigger>
          <TabsTrigger value="linkage" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? "الربط" : "Linkage"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
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

          {/* Print Report */}
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="w-4 h-4 me-2" />
            {isArabic ? "طباعة" : "Print"}
          </Button>

          {/* Export PDF */}
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="w-4 h-4 me-2" />
            PDF
          </Button>

          {/* Export Excel */}
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 me-2" />
            Excel
          </Button>

          {/* Budget Settings */}
          <Popover open={showBudgetSettings} onOpenChange={setShowBudgetSettings}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={checkBudgetAlert().isOverBudget || checkBudgetAlert().isNearThreshold ? "border-destructive" : ""}>
                <AlertTriangle className={`w-4 h-4 me-2 ${checkBudgetAlert().isOverBudget ? 'text-destructive' : checkBudgetAlert().isNearThreshold ? 'text-amber-500' : ''}`} />
                {isArabic ? "الميزانية" : "Budget"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">{isArabic ? "إعدادات الميزانية" : "Budget Settings"}</h4>
                <div className="space-y-2">
                  <Label>{isArabic ? "الحد الأقصى للميزانية (ر.س)" : "Max Budget (SAR)"}</Label>
                  <Input
                    type="number"
                    value={budgetSettings.maxBudget}
                    onChange={(e) => setBudgetSettings({...budgetSettings, maxBudget: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نسبة التنبيه (%)" : "Alert Threshold (%)"}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={budgetSettings.alertThreshold}
                    onChange={(e) => setBudgetSettings({...budgetSettings, alertThreshold: Number(e.target.value)})}
                  />
                </div>
                <Button size="sm" onClick={() => saveBudgetSettings(budgetSettings)} className="w-full">
                  {isArabic ? "حفظ" : "Save"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Project Comparison Report */}
          <ProjectComparisonReport isArabic={isArabic} />

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <Activity className="w-4 h-4 me-2" />
            {isArabic ? "تحديث" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Budget Alert Banner */}
      {(checkBudgetAlert().isOverBudget || checkBudgetAlert().isNearThreshold) && (
        <Card className={`${checkBudgetAlert().isOverBudget ? 'bg-destructive/10 border-destructive' : 'bg-amber-500/10 border-amber-500'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${checkBudgetAlert().isOverBudget ? 'text-destructive' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className="font-medium">
                {checkBudgetAlert().isOverBudget 
                  ? (isArabic ? "تجاوزت الميزانية المحددة!" : "Budget exceeded!")
                  : (isArabic ? "اقتربت من الحد الأقصى للميزانية" : "Approaching budget limit")
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {isArabic 
                  ? `إجمالي القيمة: ${formatCurrency(stats.totalValue)} (${checkBudgetAlert().percentage.toFixed(1)}% من الميزانية)`
                  : `Total value: ${formatCurrency(stats.totalValue)} (${checkBudgetAlert().percentage.toFixed(1)}% of budget)`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            {isArabic ? "رفع صورة" : "Upload Image"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedImage ? (
            <div className="relative">
              <img 
                src={uploadedImage} 
                alt="Uploaded" 
                className="w-full max-h-64 object-contain rounded-lg border border-border"
              />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 end-2"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => document.getElementById('image-upload-input')?.click()}
            >
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              />
              <div className="flex justify-center gap-2 mb-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
                <FileText className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-medium text-foreground">
                {isArabic ? "اسحب الملف هنا أو انقر للاختيار" : "Drag file here or click to choose"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
              {isArabic ? "الحد الأقصى 5 ميجابايت • صور فقط" : "Max 5MB • Images only"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Monthly Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpDown className="w-5 h-5 text-primary" />
            {isArabic ? "مقارنة النشاط بين الشهور" : "Monthly Comparison"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyActivity} barGap={8}>
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
                <Bar
                  dataKey="projects"
                  name={isArabic ? "المشاريع" : "Projects"}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="quotations"
                  name={isArabic ? "العروض" : "Quotations"}
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
                    onClick={() => onLoadProject?.(project.analysis_data, project.wbs_data, project.id)}
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
  </TabsContent>

  {/* Risks Tab */}
  <TabsContent value="risks">
    <RiskManagement />
  </TabsContent>

  {/* Contracts Tab */}
  <TabsContent value="contracts">
    <ContractManagement />
  </TabsContent>

  {/* Cost Benefit Tab */}
  <TabsContent value="cost-benefit">
    <CostBenefitAnalysis />
  </TabsContent>

  {/* Linkage Tab */}
  <TabsContent value="linkage">
    <ContractLinkage />
  </TabsContent>
</Tabs>
</div>
);
}
