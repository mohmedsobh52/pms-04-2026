import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, Home, ChevronRight, Edit, Play, MoreVertical,
  Package, Percent, DollarSign, FileText, Building2, Calendar,
  File, Settings, LayoutList, FolderOpen, Loader2, Search,
  Filter, Download, Trash2, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  total_value: number | null;
  items_count: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
}

interface ProjectAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

const statusConfig = {
  draft: { 
    label: { ar: "مسودة", en: "Draft" }, 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20" 
  },
  in_progress: { 
    label: { ar: "قيد التنفيذ", en: "In Progress" }, 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20" 
  },
  completed: { 
    label: { ar: "مكتمل", en: "Completed" }, 
    color: "bg-green-500/10 text-green-600 border-green-500/20" 
  },
  suspended: { 
    label: { ar: "معلق", en: "Suspended" }, 
    color: "bg-red-500/10 text-red-600 border-red-500/20" 
  },
};

export default function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [itemsSearch, setItemsSearch] = useState("");

  // Fetch project data
  useEffect(() => {
    if (!user || !projectId) return;

    const fetchProjectData = async () => {
      setIsLoading(true);
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("project_data")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from("project_items")
          .select("*")
          .eq("project_id", projectId)
          .order("item_number");

        if (itemsError) throw itemsError;
        setItems(itemsData || []);

        // Fetch attachments from saved_projects if available
        // Note: Attachments are linked via saved_projects table
      } catch (error: any) {
        console.error("Error fetching project:", error);
        toast({
          title: isArabic ? "خطأ في تحميل المشروع" : "Error loading project",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [user, projectId]);

  // Calculate pricing statistics
  const pricingStats = useMemo(() => {
    const totalItems = items.length;
    const pricedItems = items.filter(item => item.unit_price && item.unit_price > 0).length;
    const unpricedItems = totalItems - pricedItems;
    const pricingPercentage = totalItems > 0 ? Math.round((pricedItems / totalItems) * 100) : 0;
    const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    return { totalItems, pricedItems, unpricedItems, pricingPercentage, totalValue };
  }, [items]);

  // Filter items for BOQ tab
  const filteredItems = useMemo(() => {
    if (!itemsSearch) return items;
    const query = itemsSearch.toLowerCase();
    return items.filter(item => 
      item.item_number.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }, [items, itemsSearch]);

  const handleStartPricing = () => {
    if (!project) return;
    sessionStorage.setItem('loadedProject', JSON.stringify({
      analysisData: project.analysis_data,
      wbsData: project.wbs_data,
    }));
    navigate('/analyze');
    toast({
      title: isArabic ? "تم تحميل المشروع" : "Project loaded",
      description: project.name,
    });
  };

  const handleEditProject = () => {
    // Navigate to edit mode or open edit dialog
    navigate(`/projects/${projectId}/edit`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {isArabic ? "يجب تسجيل الدخول لعرض تفاصيل المشروع" : "Please login to view project details"}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {isArabic ? "تسجيل الدخول" : "Sign In"}
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? "المشروع غير موجود" : "Project not found"}
          </h3>
          <Button onClick={() => navigate('/projects')}>
            {isArabic ? "العودة للمشاريع" : "Back to Projects"}
          </Button>
        </div>
      </div>
    );
  }

  const projectStatus = "draft"; // Default status, can be extended with database field
  const statusInfo = statusConfig[projectStatus as keyof typeof statusConfig];

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-sm">
                <Link to="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  {isArabic ? "الرئيسية" : "Home"}
                </Link>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <Link to="/projects" className="text-muted-foreground hover:text-foreground">
                  {isArabic ? "المشاريع" : "Projects"}
                </Link>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium truncate max-w-[200px]">
                  {project.name}
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge variant="outline" className={statusInfo.color}>
                  {isArabic ? statusInfo.label.ar : statusInfo.label.en}
                </Badge>
              </div>
              {project.file_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="w-4 h-4" />
                  {project.file_name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleStartPricing} className="gap-2">
              <Play className="w-4 h-4" />
              {isArabic ? "بدء التسعير" : "Start Pricing"}
            </Button>
            <Button variant="outline" onClick={handleEditProject} className="gap-2">
              <Edit className="w-4 h-4" />
              {isArabic ? "تعديل المشروع" : "Edit Project"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isArabic ? "start" : "end"}>
                <DropdownMenuItem className="gap-2">
                  <Download className="w-4 h-4" />
                  {isArabic ? "تصدير" : "Export"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  {isArabic ? "حذف المشروع" : "Delete Project"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">{pricingStats.totalItems}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي البنود" : "Total Items"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Percent className="w-5 h-5 text-amber-600" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">{pricingStats.pricingPercentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "نسبة التسعير" : "Pricing %"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pricingStats.totalValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.currency || 'SAR'} - {isArabic ? "القيمة الإجمالية" : "Total Value"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">{attachments.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "المستندات" : "Documents"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutList className="w-4 h-4" />
              {isArabic ? "نظرة عامة" : "Overview"}
            </TabsTrigger>
            <TabsTrigger value="boq" className="gap-2">
              <Package className="w-4 h-4" />
              {isArabic ? "جدول الكميات" : "BOQ"}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <File className="w-4 h-4" />
              {isArabic ? "المستندات" : "Documents"}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {isArabic ? "الإعدادات" : "Settings"}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Project Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {isArabic ? "تفاصيل المشروع" : "Project Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {isArabic ? "نوع المشروع" : "Project Type"}
                    </span>
                    <span className="font-medium">Other</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {isArabic ? "تاريخ الإنشاء" : "Created Date"}
                    </span>
                    <span className="font-medium">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {isArabic ? "اسم الملف" : "File Name"}
                    </span>
                    <span className="font-medium truncate max-w-[150px]">{project.file_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {isArabic ? "العملة" : "Currency"}
                    </span>
                    <span className="font-medium">{project.currency || 'SAR'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    {isArabic ? "ملخص التسعير" : "Pricing Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {isArabic ? "البنود المسعرة" : "Priced Items"}
                    </span>
                    <span className="font-medium">{pricingStats.pricedItems} / {pricingStats.totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-500" />
                      {isArabic ? "البنود غير المسعرة" : "Unpriced Items"}
                    </span>
                    <span className="font-medium">{pricingStats.unpricedItems}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2 py-2 border-b border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isArabic ? "التقدم" : "Progress"}</span>
                      <span className="font-medium">{pricingStats.pricingPercentage}%</span>
                    </div>
                    <Progress value={pricingStats.pricingPercentage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {isArabic ? "القيمة الإجمالية" : "Total Value"}
                    </span>
                    <span className="font-bold text-lg text-green-600">
                      {project.currency || 'SAR'} {formatCurrency(pricingStats.totalValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BOQ Tab */}
          <TabsContent value="boq" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {isArabic ? "جدول الكميات" : "Bill of Quantities"}
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                        value={itemsSearch}
                        onChange={(e) => setItemsSearch(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">{isArabic ? "رقم البند" : "Item No."}</TableHead>
                        <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                        <TableHead className="w-[80px]">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                        <TableHead className="w-[100px] text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                        <TableHead className="w-[120px] text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                        <TableHead className="w-[140px] text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {isArabic ? "لا توجد بنود" : "No items found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.slice(0, 50).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{item.description || '-'}</TableCell>
                            <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell className="text-right">{item.quantity?.toLocaleString() || '-'}</TableCell>
                            <TableCell className="text-right">
                              {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total_price ? formatCurrency(item.total_price) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredItems.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    {isArabic 
                      ? `عرض 50 من ${filteredItems.length} بند` 
                      : `Showing 50 of ${filteredItems.length} items`}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  {isArabic ? "المستندات المرفقة" : "Attached Documents"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <div className="text-center py-12">
                    <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">
                      {isArabic ? "لا توجد مستندات" : "No documents"}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {isArabic ? "لم يتم رفع أي مستندات لهذا المشروع" : "No documents have been uploaded for this project"}
                    </p>
                    <Button variant="outline" className="gap-2">
                      <FileText className="w-4 h-4" />
                      {isArabic ? "رفع مستند" : "Upload Document"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.file_size)} • {formatDate(attachment.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {isArabic ? "إعدادات المشروع" : "Project Settings"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isArabic ? "اسم المشروع" : "Project Name"}
                  </label>
                  <Input value={project.name} readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isArabic ? "العملة" : "Currency"}
                  </label>
                  <Input value={project.currency || 'SAR'} readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isArabic ? "آخر تحديث" : "Last Updated"}
                  </label>
                  <Input value={formatDate(project.updated_at)} readOnly />
                </div>
                <div className="pt-4 border-t">
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    {isArabic ? "حذف المشروع" : "Delete Project"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
