import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportTab } from "@/components/reports/ExportTab";
import { PriceAnalysisTab } from "@/components/reports/PriceAnalysisTab";
import { ProjectSummaryTab } from "@/components/reports/ProjectSummaryTab";
import { RecentProjectsTab } from "@/components/reports/RecentProjectsTab";
import { ProjectsComparisonExport } from "@/components/reports/ProjectsComparisonExport";
import { AdvancedReportsTab } from "@/components/reports/AdvancedReportsTab";
import { ReportsStatCards } from "@/components/reports/ReportsStatCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  Filter, 
  FileDown, 
  BarChart3, 
  GitCompare, 
  FileText, 
  Clock,
  Settings2,
  Search,
  Layers,
  Trophy
} from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/project-constants";

interface Project {
  id: string;
  name: string;
  file_name?: string;
  analysis_data: any;
  status?: string;
  project_type?: string;
  created_at: string;
  updated_at: string;
  items_count?: number;
  total_value?: number;
  currency?: string;
}

interface TenderPricing {
  project_id: string;
  contract_value?: number;
  total_direct_costs?: number;
  total_indirect_costs?: number;
  profit_margin?: number;
}

const ReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tenderData, setTenderData] = useState<TenderPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch saved_projects and project_data in parallel
    const [savedProjectsRes, projectDataRes, tenderPricingRes] = await Promise.all([
      supabase
        .from("saved_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("project_data")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("tender_pricing")
        .select("project_id, contract_value, total_direct_costs, total_indirect_costs, profit_margin")
        .eq("user_id", user.id)
    ]);

    const savedProjects = savedProjectsRes.data || [];
    const projectData = projectDataRes.data || [];
    const tenderPricing = (tenderPricingRes.data || []) as TenderPricing[];

    // Merge project data - prioritize saved_projects but include project_data
    const projectMap = new Map<string, Project>();
    
    // Add saved_projects first
    savedProjects.forEach(p => {
      const analysisData = p.analysis_data as any;
      projectMap.set(p.id, {
        ...p,
        items_count: analysisData?.items?.length || 0,
        total_value: analysisData?.summary?.total_value || 0,
      });
    });

    // Add project_data if not already in map
    projectData.forEach(p => {
      if (!projectMap.has(p.id)) {
        projectMap.set(p.id, {
          ...p,
          analysis_data: p.analysis_data || { items: [], summary: {} },
          status: 'draft',
        });
      }
    });

    setProjects(Array.from(projectMap.values()));
    setTenderData(tenderPricing);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleDeleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from("saved_projects")
      .delete()
      .eq("id", projectId);

    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  const filteredProjects = useMemo(() => {
    let result = projects;
    
    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(p => (p.status || "draft") === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.file_name?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [projects, statusFilter, searchQuery]);

  // Calculate stats from all projects with tender data
  const stats = useMemo(() => {
    const totalBOQValue = projects.reduce((sum, p) => {
      // Check tender_pricing first for accurate values
      const tender = tenderData.find(t => t.project_id === p.id);
      if (tender?.contract_value) {
        return sum + tender.contract_value;
      }
      const analysisData = p.analysis_data as any;
      const value = p.total_value || 
                   analysisData?.summary?.total_value ||
                   analysisData?.totalValue || 
                   0;
      return sum + value;
    }, 0);

    const totalTenderValue = tenderData.reduce((sum, t) => sum + (t.contract_value || 0), 0);

    return {
      totalProjects: projects.length,
      inProgressProjects: projects.filter(p => p.status === "in_progress").length,
      completedProjects: projects.filter(p => p.status === "completed").length,
      draftProjects: projects.filter(p => !p.status || p.status === "draft").length,
      pendingProjects: projects.filter(p => p.status === "suspended").length,
      totalBOQValue,
      totalTenderValue,
    };
  }, [projects, tenderData]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      const t = p.project_type || (isArabic ? "غير محدد" : "Uncategorized");
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [projects, isArabic]);

  const topProjects = useMemo(() => {
    return projects
      .map((p) => {
        const tender = tenderData.find((t) => t.project_id === p.id);
        const value = tender?.contract_value || p.total_value || (p.analysis_data as any)?.summary?.total_value || 0;
        return { id: p.id, name: p.name, value };
      })
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [projects, tenderData]);

  const tabs = [
    { 
      value: "export", 
      label: isArabic ? "التصدير" : "Export",
      icon: FileDown 
    },
    { 
      value: "price-analysis", 
      label: isArabic ? "تحليل الأسعار" : "Price Analysis",
      icon: BarChart3 
    },
    { 
      value: "comparison", 
      label: isArabic ? "مقارنة المشاريع" : "Compare Projects",
      icon: GitCompare 
    },
    { 
      value: "summary", 
      label: isArabic ? "ملخص" : "Summary",
      icon: FileText 
    },
    { 
      value: "recent", 
      label: isArabic ? "الأخيرة" : "Recent",
      icon: Clock 
    },
    { 
      value: "advanced", 
      label: isArabic ? "متقدم" : "Advanced",
      icon: Settings2 
    },
  ];

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {isArabic ? "التقارير" : "Reports"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic 
                ? "عرض وتصدير تقارير المشاريع والتسعير" 
                : "View and export project and pricing reports"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? "بحث..." : "Search..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-40"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All Status"}</SelectItem>
                {PROJECT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                      {isArabic ? status.label : status.label_en}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchProjects} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <ReportsStatCards 
          totalProjects={stats.totalProjects}
          inProgressProjects={stats.inProgressProjects}
          completedProjects={stats.completedProjects}
          draftProjects={stats.draftProjects}
          pendingProjects={stats.pendingProjects}
          totalBOQValue={stats.totalBOQValue}
        />

        {/* Insights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي قيمة العطاءات" : "Total Tender Value"}</p>
              <p className="text-lg font-bold text-primary">
                {stats.totalTenderValue.toLocaleString()} {isArabic ? "ريال" : "SAR"}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary/40" />
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{isArabic ? "متوسط قيمة المشروع" : "Avg Project Value"}</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.totalProjects > 0 ? Math.round(stats.totalBOQValue / stats.totalProjects).toLocaleString() : 0} {isArabic ? "ريال" : "SAR"}
              </p>
            </div>
            <FileText className="w-8 h-8 text-emerald-600/40" />
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{isArabic ? "نتائج الفلتر الحالي" : "Filtered Results"}</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {filteredProjects.length} / {projects.length}
              </p>
            </div>
            <Filter className="w-8 h-8 text-amber-600/40" />
          </div>
        </div>

        {/* Type Breakdown + Top Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {isArabic ? "توزيع المشاريع حسب النوع" : "Projects by Type"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {typeBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
              )}
              {typeBreakdown.map((t, i) => {
                const max = Math.max(1, ...typeBreakdown.map((x) => x.count));
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate">{t.name}</span>
                      <span className="font-semibold">{t.count}</span>
                    </div>
                    <Progress value={(t.count / max) * 100} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                {isArabic ? "أعلى 5 مشاريع قيمة" : "Top 5 Projects by Value"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topProjects.length === 0 && (
                <p className="text-sm text-muted-foreground">{isArabic ? "لا توجد بيانات" : "No data"}</p>
              )}
              {topProjects.map((p, i) => {
                const max = topProjects[0]?.value || 1;
                return (
                  <div
                    key={p.id}
                    className="space-y-1 cursor-pointer hover:bg-accent/50 rounded p-1 transition-colors"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate font-medium">
                        {i + 1}. {p.name}
                      </span>
                      <span className="font-semibold whitespace-nowrap">
                        {p.value.toLocaleString()} {isArabic ? "ريال" : "SAR"}
                      </span>
                    </div>
                    <Progress value={(p.value / max) * 100} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="export" className="mt-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 tabs-navigation-safe">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.label.split(' ')[0]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="export" className="mt-4">
            <ExportTab projects={filteredProjects} isLoading={loading} />
          </TabsContent>

          <TabsContent value="price-analysis" className="mt-4">
            <PriceAnalysisTab projects={filteredProjects} />
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <ProjectsComparisonExport projects={filteredProjects} />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <ProjectSummaryTab projects={filteredProjects} tenderData={tenderData} />
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            <RecentProjectsTab 
              projects={filteredProjects} 
              onDeleteProject={handleDeleteProject}
            />
          </TabsContent>

          <TabsContent value="advanced" className="mt-4">
            <AdvancedReportsTab projects={filteredProjects} />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ReportsPage;