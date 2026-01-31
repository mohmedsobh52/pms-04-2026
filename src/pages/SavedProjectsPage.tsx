import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { 
  FolderOpen, Trash2, Loader2, Calendar, FileText, Search, 
  ArrowLeft, Eye, Edit, DollarSign, Package, Filter, X,
  SortAsc, SortDesc, Download, Settings2, FileUp, Plus, BarChart3, Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsTab } from "@/components/projects/AttachmentsTab";
import { ReportsTab } from "@/components/projects/ReportsTab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { BOQAnalyzerPanel } from "@/components/BOQAnalyzerPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function SavedProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isArabic, t } = useLanguage();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // Tab state - check URL for initial tab
  const urlTab = searchParams.get("tab");
  const initialTab = urlTab === "analyze" ? "analyze" : 
                     urlTab === "reports" ? "reports" : 
                     urlTab === "attachments" ? "attachments" : "projects";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "analyze") {
      setActiveTab("analyze");
    } else if (tab === "reports") {
      setActiveTab("reports");
    } else if (tab === "attachments") {
      setActiveTab("attachments");
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch from both tables in parallel
      const [savedProjectsRes, projectDataRes] = await Promise.all([
        supabase
          .from("saved_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("project_data")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      ]);

      const savedProjects = savedProjectsRes.data || [];
      const projectDataList = projectDataRes.data || [];

      // Merge projects - use Map to avoid duplicates
      const projectMap = new Map<string, ProjectData>();

      // Add saved_projects first (prioritize)
      savedProjects.forEach((p: any) => {
        const analysisData = p.analysis_data as any;
        projectMap.set(p.id, {
          id: p.id,
          name: p.name,
          file_name: p.file_name,
          analysis_data: p.analysis_data,
          wbs_data: p.wbs_data,
          items_count: analysisData?.items?.length || analysisData?.summary?.total_items || 0,
          total_value: analysisData?.summary?.total_value || 0,
          currency: analysisData?.summary?.currency || 'SAR',
          created_at: p.created_at,
          updated_at: p.updated_at,
        });
      });

      // Add project_data if not already in map
      projectDataList.forEach((p: any) => {
        if (!projectMap.has(p.id)) {
          projectMap.set(p.id, {
            id: p.id,
            name: p.name,
            file_name: p.file_name,
            analysis_data: p.analysis_data,
            wbs_data: p.wbs_data,
            items_count: p.items_count || 0,
            total_value: p.total_value || 0,
            currency: p.currency || 'SAR',
            created_at: p.created_at,
            updated_at: p.updated_at,
          });
        }
      });

      // Convert map to array and sort by created_at
      const allProjects = Array.from(projectMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setProjects(allProjects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: isArabic ? "خطأ في تحميل المشاريع" : "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      // Delete project items first (if any)
      await supabase.from("project_items").delete().eq("project_id", id);
      
      // Delete from project_data
      await supabase.from("project_data").delete().eq("id", id);
      
      // Delete from saved_projects
      await supabase.from("saved_projects").delete().eq("id", id);
      
      toast({
        title: isArabic ? "تم حذف المشروع" : "Project deleted",
      });
      fetchProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في حذف المشروع" : "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = async (project: ProjectData) => {
    setSelectedProject(project);
    setIsLoadingItems(true);
    
    try {
      const { data, error } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", project.id)
        .order("item_number");

      if (error) throw error;
      setProjectItems(data || []);
    } catch (error: any) {
      console.error("Error fetching project items:", error);
      toast({
        title: isArabic ? "خطأ في تحميل البنود" : "Error loading items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleLoadProject = (project: ProjectData) => {
    // Navigate to project details page
    navigate(`/projects/${project.id}`);
  };

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.file_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "total_value":
          aVal = a.total_value || 0;
          bVal = b.total_value || 0;
          break;
        case "items_count":
          aVal = a.items_count || 0;
          bVal = b.items_count || 0;
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }
      
      if (typeof aVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return result;
  }, [projects, searchQuery, sortField, sortDirection]);

  if (authLoading) {
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
            {isArabic ? "يجب تسجيل الدخول لعرض المشاريع المحفوظة" : "Please login to view saved projects"}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {isArabic ? "تسجيل الدخول" : "Sign In"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">
                  {isArabic ? "المشاريع" : "Projects"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "إدارة المشاريع وتحليل ملفات BOQ" : "Manage projects and analyze BOQ files"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4 tabs-navigation-safe">
              <TabsTrigger value="projects" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                {isArabic ? "المشاريع" : "Projects"}
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gap-2">
                <FileUp className="w-4 h-4" />
                {isArabic ? "تحليل BOQ" : "Analyze"}
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                {isArabic ? "التقارير" : "Reports"}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <Paperclip className="w-4 h-4" />
                {isArabic ? "المرفقات" : "Attachments"}
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "projects" && (
              <Button onClick={() => navigate("/projects/new")} className="gap-2">
                <Plus className="w-4 h-4" />
                {isArabic ? "مشروع جديد" : "New Project"}
              </Button>
            )}
          </div>
          
          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="glass-card p-4">
              <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isArabic ? "بحث في المشاريع..." : "Search projects..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={isArabic ? "ترتيب حسب" : "Sort by"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">{isArabic ? "تاريخ الإنشاء" : "Date Created"}</SelectItem>
                  <SelectItem value="name">{isArabic ? "الاسم" : "Name"}</SelectItem>
                  <SelectItem value="total_value">{isArabic ? "القيمة" : "Value"}</SelectItem>
                  <SelectItem value="items_count">{isArabic ? "عدد البنود" : "Items Count"}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              >
                {sortDirection === "asc" ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>{filteredProjects.length} {isArabic ? "مشروع" : "projects"}</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                {isArabic ? "بحث" : "Search"}: {searchQuery}
              </Badge>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold mb-2">
              {isArabic ? "لا توجد مشاريع" : "No projects found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? (isArabic ? "لا توجد نتائج للبحث" : "No results match your search")
                : (isArabic ? "ابدأ بتحليل ملف BOQ لحفظ مشروعك الأول" : "Start by analyzing a BOQ file to save your first project")
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/')}>
                {isArabic ? "تحليل ملف جديد" : "Analyze New File"}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="glass-card p-5 hover:border-primary/30 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    {project.file_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <FileText className="w-3 h-3 shrink-0" />
                        {project.file_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Package className="w-3 h-3" />
                      {isArabic ? "البنود" : "Items"}
                    </div>
                    <p className="font-semibold">{project.items_count || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      {isArabic ? "القيمة" : "Value"}
                    </div>
                    <p className="font-semibold text-green-600">
                      {(project.total_value || 0).toLocaleString()} {project.currency || 'SAR'}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                  <Calendar className="w-3 h-3" />
                  {new Date(project.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleLoadProject(project)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {isArabic ? "تحميل" : "Load"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(project)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir={isArabic ? 'rtl' : 'ltr'}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isArabic ? "حذف المشروع" : "Delete Project"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isArabic 
                            ? `هل أنت متأكد من حذف "${project.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                            : `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
          </TabsContent>
          
          {/* Analyze BOQ Tab */}
          <TabsContent value="analyze">
            <BOQAnalyzerPanel 
              embedded 
              onProjectSaved={(projectId) => {
                setActiveTab("projects");
                fetchProjects();
                navigate(`/projects/${projectId}`);
              }} 
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportsTab isArabic={isArabic} />
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <AttachmentsTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {isLoadingItems ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-primary/5">
                    <p className="text-xs text-muted-foreground">{isArabic ? "البنود" : "Items"}</p>
                    <p className="font-semibold text-lg">{projectItems.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/5">
                    <p className="text-xs text-muted-foreground">{isArabic ? "القيمة الإجمالية" : "Total Value"}</p>
                    <p className="font-semibold text-lg text-green-600">
                      {(selectedProject?.total_value || 0).toLocaleString()} {selectedProject?.currency || 'SAR'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/5">
                    <p className="text-xs text-muted-foreground">{isArabic ? "تاريخ الإنشاء" : "Created"}</p>
                    <p className="font-semibold">
                      {selectedProject && new Date(selectedProject.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">{isArabic ? "الكود" : "Code"}</th>
                        <th className="px-3 py-2 text-left">{isArabic ? "الوصف" : "Description"}</th>
                        <th className="px-3 py-2 text-center">{isArabic ? "الوحدة" : "Unit"}</th>
                        <th className="px-3 py-2 text-center">{isArabic ? "الكمية" : "Qty"}</th>
                        <th className="px-3 py-2 text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</th>
                        <th className="px-3 py-2 text-right">{isArabic ? "الإجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-muted/50">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">{item.item_number}</td>
                          <td className="px-3 py-2 max-w-xs truncate">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.unit}</td>
                          <td className="px-3 py-2 text-center">{item.quantity?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{item.unit_price?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium">{item.total_price?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
