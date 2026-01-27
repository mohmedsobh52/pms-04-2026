import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { 
  RefreshCw, 
  Filter, 
  FileDown, 
  BarChart3, 
  GitCompare, 
  FileText, 
  Clock,
  Settings2,
  Search
} from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/project-constants";
import { useEffect } from "react";

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

interface ReportsTabProps {
  isArabic: boolean;
}

export function ReportsTab({ isArabic }: ReportsTabProps) {
  const { user } = useAuth();
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

    return {
      totalProjects: projects.length,
      inProgressProjects: projects.filter(p => p.status === "in_progress").length,
      completedProjects: projects.filter(p => p.status === "completed").length,
      draftProjects: projects.filter(p => !p.status || p.status === "draft").length,
      pendingProjects: projects.filter(p => p.status === "suspended").length,
      totalBOQValue,
    };
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {isArabic ? "التقارير" : "Reports"}
          </h2>
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

      {/* Tabs */}
      <Tabs defaultValue="export">
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
  );
}
