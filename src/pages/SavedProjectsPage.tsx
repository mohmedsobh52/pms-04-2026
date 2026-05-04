import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  FolderOpen, Trash2, Calendar, FileText, Search,
  ArrowLeft, Eye, Edit, DollarSign, Package, Filter, X,
  SortAsc, SortDesc, Download, Settings2, FileUp, Plus, BarChart3, Paperclip, Sparkles, Upload,
  CheckSquare, Square, FileSpreadsheet, FileBarChart, Link2, CheckCircle2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SuspenseFallback, ErrorState } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttachmentsTab } from "@/components/projects/AttachmentsTab";
import { ReportsTab } from "@/components/projects/ReportsTab";
import { BOQAnalyzerPanel } from "@/components/BOQAnalyzerPanel";
import { ColorLegend } from "@/components/ui/color-code";
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
import { prefetchRoute } from "@/lib/prefetch-routes";
import { PaginationControls } from "@/components/ui/pagination-controls";

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [contractMap, setContractMap] = useState<Record<string, number>>({});
  const [attachmentMap, setAttachmentMap] = useState<Record<string, number>>({});
  
  // Drag-and-drop state
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
  
  // Tab state - check URL for initial tab and mode
  const urlTab = searchParams.get("tab");
  const urlMode = searchParams.get("mode");
  const initialTab = urlTab === "reports" ? "reports" :
                     urlTab === "attachments" ? "attachments" :
                     urlTab === "analyze" ? "analyze" : "projects";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [extractionMode, setExtractionMode] = useState(urlMode === "extraction");

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    const mode = searchParams.get("mode");
    if (tab === "reports") {
      setActiveTab("reports");
    } else if (tab === "attachments") {
      setActiveTab("attachments");
      if (mode === "extraction") {
        setExtractionMode(true);
      }
    } else if (tab === "analyze") {
      setActiveTab("analyze");
    } else {
      setActiveTab("projects");
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setFetchError(null);
    try {
      // Fetch from both tables in parallel (limited)
      const [savedProjectsRes, projectDataRes] = await Promise.all([
        supabase
          .from("saved_projects")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase
          .from("project_data")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500)
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
      setFetchError(error?.message || "Failed to load projects");
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

  // Load lightweight badges: contract counts and attachment counts per project
  useEffect(() => {
    if (!user || projects.length === 0) return;
    const ids = projects.map((p) => p.id);
    (async () => {
      try {
        const [{ data: contracts }, { data: atts }] = await Promise.all([
          supabase.from("contracts").select("project_id").in("project_id", ids),
          supabase.from("attachment_folders").select("project_id").in("project_id", ids),
        ]);
        const cMap: Record<string, number> = {};
        (contracts || []).forEach((c: any) => {
          if (c.project_id) cMap[c.project_id] = (cMap[c.project_id] || 0) + 1;
        });
        const aMap: Record<string, number> = {};
        (atts || []).forEach((a: any) => {
          if (a.project_id) aMap[a.project_id] = (aMap[a.project_id] || 0) + 1;
        });
        setContractMap(cMap);
        setAttachmentMap(aMap);
      } catch {
        // best-effort badges
      }
    })();
  }, [user, projects]);

  // Auto-reload when a project is saved/overwritten anywhere in the app
  useEffect(() => {
    if (!user) return;
    const handler = () => { fetchProjects(); };
    window.addEventListener("projects:updated", handler);
    const onVis = () => { if (document.visibilityState === "visible") fetchProjects(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("projects:updated", handler);
      document.removeEventListener("visibilitychange", onVis);
    };
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

  // Global drag-and-drop handlers for the projects tab
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.items.length > 0) setIsGlobalDragOver(true);
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsGlobalDragOver(false);
    }
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const isValid = file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (isValid) {
        setDraggedFile(file);
        setActiveTab("analyze");
      }
    }
  }, []);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.file_name?.toLowerCase().includes(query)
      );
    }

    if (currencyFilter !== "all") {
      result = result.filter(p => (p.currency || "SAR") === currencyFilter);
    }
    
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
  }, [projects, searchQuery, sortField, sortDirection, currencyFilter]);

  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => set.add(p.currency || "SAR"));
    return Array.from(set);
  }, [projects]);

  const pageProjects = useMemo(
    () => filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredProjects, currentPage, pageSize],
  );
  const allOnPageSelected = pageProjects.length > 0 && pageProjects.every((p) => selectedIds.has(p.id));
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageProjects.forEach((p) => next.delete(p.id));
      else pageProjects.forEach((p) => next.add(p.id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await supabase.from("project_items").delete().in("project_id", ids);
      await supabase.from("project_data").delete().in("id", ids);
      await supabase.from("saved_projects").delete().in("id", ids);
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? `تم حذف ${ids.length} مشروع` : `${ids.length} project(s) deleted`,
      });
      clearSelection();
      fetchProjects();
    } catch (error: any) {
      toast({
        title: isArabic ? "فشل الحذف الجماعي" : "Bulk delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkExportCsv = () => {
    if (selectedIds.size === 0) return;
    const rows = projects.filter((p) => selectedIds.has(p.id));
    const header = ["name", "file_name", "items_count", "total_value", "currency", "created_at"];
    const escape = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header.join(",")]
      .concat(rows.map((r) => header.map((h) => escape((r as any)[h])).join(",")))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const handleLoadProject = (project: ProjectData) => {
    navigate(`/projects/${project.id}`);
  };


  if (authLoading) {
    return <SuspenseFallback fullPage label={isArabic ? "جاري التحميل..." : "Loading..."} />;
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
        {/* Quick Stats */}
        {(() => {
          const totalProjects = projects.length;
          const totalValue = projects.reduce((s, p) => s + (Number(p.total_value) || 0), 0);
          const totalItems = projects.reduce((s, p) => s + (Number(p.items_count) || 0), 0);
          const recent = projects.filter((p) => {
            const days = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
            return days <= 7;
          }).length;
          const avgValue = totalProjects > 0 ? totalValue / totalProjects : 0;
          const currency = projects[0]?.currency || "SAR";
          const cards = [
            { icon: FolderOpen, label: isArabic ? "إجمالي المشاريع" : "Total Projects", value: String(totalProjects), color: "text-primary", bg: "bg-primary/10" },
            { icon: DollarSign, label: isArabic ? "القيمة الإجمالية" : "Total Value", value: `${totalValue.toLocaleString()} ${currency}`, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: BarChart3, label: isArabic ? "متوسط القيمة" : "Avg. Value", value: `${Math.round(avgValue).toLocaleString()} ${currency}`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
            { icon: Package, label: isArabic ? "إجمالي البنود" : "Total Items", value: String(totalItems), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
            { icon: Sparkles, label: isArabic ? "مشاريع حديثة (7 أيام)" : "Recent (7d)", value: String(recent), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          ];
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {cards.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                      <p className={`text-base font-bold ${s.color} truncate`}>{s.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4 p-1 h-auto tabs-navigation-safe bg-muted/50 backdrop-blur-sm">
              <TabsTrigger
                value="projects"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "المشاريع" : "Projects"}</span>
                {projects.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">
                    {projects.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="analyze"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "تحليل BOQ" : "Analyze BOQ"}</span>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "التقارير" : "Reports"}</span>
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 hover:bg-background/50"
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "المرفقات" : "Attachments"}</span>
              </TabsTrigger>
            </TabsList>

            {activeTab === "projects" && (
              <div className="flex gap-2">
                <Button onClick={() => navigate("/projects/new")} className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{isArabic ? "مشروع جديد" : "New Project"}</span>
                </Button>
              </div>
            )}
          </div>
          
          {/* Projects Tab */}
          <TabsContent
            value="projects"
            className="space-y-6 relative"
            onDragOver={handleGlobalDragOver}
            onDragLeave={handleGlobalDragLeave}
            onDrop={handleGlobalDrop}
          >
            {/* Drag Overlay */}
            {isGlobalDragOver && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl backdrop-blur-sm pointer-events-none">
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-3 text-primary" />
                  <p className="text-xl font-semibold text-primary">
                    {isArabic ? "أفلت الملف لبدء التحليل" : "Drop file to start analysis"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">PDF, Excel</p>
                </div>
              </div>
            )}

            {/* Quick Upload & Analyze Section */}
            <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg">
                        {isArabic ? "رفع وتحليل BOQ جديد" : "Upload & Analyze New BOQ"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isArabic ? "حلل ملفات PDF أو Excel أو Word لاستخراج بنود جدول الكميات تلقائياً" : "Analyze PDF, Excel, or Word files to extract BOQ items automatically"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setActiveTab("analyze")} className="gap-2 btn-gradient shadow-md hover:shadow-lg transition-all">
                    <Sparkles className="w-4 h-4" />
                    {isArabic ? "ابدأ التحليل" : "Start Analysis"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Color legend */}
            <ColorLegend type="status" isArabic={isArabic} className="mb-3" />

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
              {/* Currency filter */}
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={isArabic ? "العملة" : "Currency"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "كل العملات" : "All currencies"}</SelectItem>
                  {availableCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {isArabic ? `محدد: ${selectedIds.size}` : `${selectedIds.size} selected`}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={toggleSelectAllOnPage} className="gap-2">
                  {allOnPageSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                  {allOnPageSelected
                    ? (isArabic ? "إلغاء تحديد الصفحة" : "Unselect page")
                    : (isArabic ? "تحديد الصفحة" : "Select page")}
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkExportCsv} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  {isArabic ? "تصدير CSV" : "Export CSV"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      {isArabic ? "حذف" : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {isArabic ? "حذف جماعي" : "Bulk delete"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {isArabic
                          ? `سيتم حذف ${selectedIds.size} مشروعًا نهائيًا. لا يمكن التراجع.`
                          : `${selectedIds.size} project(s) will be permanently deleted. This cannot be undone.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                        {isArabic ? "حذف" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-2">
                  <X className="w-4 h-4" />
                  {isArabic ? "إلغاء" : "Clear"}
                </Button>
              </div>
            </div>
          )}
          
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
        {fetchError && !isLoading && (
          <div className="mb-4">
            <ErrorState isArabic={isArabic} message={fetchError} onRetry={fetchProjects} />
          </div>
        )}
        {isLoading ? (
          <SuspenseFallback label={isArabic ? "جاري تحميل المشاريع..." : "Loading projects..."} />
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
              <>
                <Button onClick={() => setActiveTab("analyze")} className="gap-2 btn-gradient">
                  <Sparkles className="w-4 h-4" />
                  {isArabic ? "تحليل ملف جديد" : "Analyze New File"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  {isArabic ? "أو اسحب وأفلت ملف PDF/Excel مباشرةً هنا" : "Or drag & drop a PDF/Excel file directly here"}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((project) => (
              <div
                key={project.id}
                onMouseEnter={() => prefetchRoute("/project-details")}
                onFocus={() => prefetchRoute("/project-details")}
                className={`glass-card p-5 hover:border-primary/30 transition-all duration-200 group ${selectedIds.has(project.id) ? "ring-2 ring-primary/50" : ""}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(project.id)}
                      onCheckedChange={() => toggleSelect(project.id)}
                      className="mt-1"
                      aria-label={isArabic ? "تحديد المشروع" : "Select project"}
                    />
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
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(project.items_count || 0) > 0 ? (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Package className="w-3 h-3" />
                      {isArabic ? "BOQ" : "BOQ"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                      {isArabic ? "بدون BOQ" : "No BOQ"}
                    </Badge>
                  )}
                  {(contractMap[project.id] || 0) > 0 && (
                    <Badge variant="default" className="gap-1 text-[10px] bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20">
                      <Link2 className="w-3 h-3" />
                      {isArabic ? `عقد (${contractMap[project.id]})` : `Contract (${contractMap[project.id]})`}
                    </Badge>
                  )}
                  {(attachmentMap[project.id] || 0) > 0 && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Paperclip className="w-3 h-3" />
                      {attachmentMap[project.id]}
                    </Badge>
                  )}
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
                  <div className="p-2 rounded-lg bg-primary/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      {isArabic ? "القيمة" : "Value"}
                    </div>
                    <p className="font-semibold text-primary">
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

                {/* Quick links */}
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1"
                    onClick={() => navigate(`/projects/${project.id}?tab=boq`)}
                  >
                    <Package className="w-3 h-3" /> BOQ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1"
                    onClick={() => navigate(`/contracts?project_id=${project.id}`)}
                  >
                    <Link2 className="w-3 h-3" /> {isArabic ? "العقود" : "Contracts"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1"
                    onClick={() => navigate(`/reports?project_id=${project.id}`)}
                  >
                    <FileBarChart className="w-3 h-3" /> {isArabic ? "تقارير" : "Reports"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {filteredProjects.length > pageSize && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(filteredProjects.length / pageSize)}
              totalItems={filteredProjects.length}
              pageSize={pageSize}
              from={(currentPage - 1) * pageSize}
              to={currentPage * pageSize - 1}
              hasNext={currentPage < Math.ceil(filteredProjects.length / pageSize)}
              hasPrevious={currentPage > 1}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              onNextPage={() => setCurrentPage((p) => p + 1)}
              onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
              pageSizeOptions={[12, 24, 48, 96]}
            />
          )}
          </>
        )}
          </TabsContent>

          {/* Analyze BOQ Tab */}
          <TabsContent value="analyze">
            <BOQAnalyzerPanel
              key={draggedFile?.name ?? "default"}
              initialFile={draggedFile ?? undefined}
              onProjectSaved={(projectId) => {
                setDraggedFile(null);
                fetchProjects();
                setActiveTab("projects");
              }}
              embedded={true}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportsTab isArabic={isArabic} />
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <AttachmentsTab initialExtractionMode={extractionMode} />
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
              <SuspenseFallback size="sm" />
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
