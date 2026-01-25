import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  Settings2
} from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/project-constants";

interface Project {
  id: string;
  name: string;
  file_name?: string;
  analysis_data: any;
  status?: string;
  created_at: string;
  updated_at: string;
}

const ReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchProjects = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
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
    if (statusFilter === "all") return projects;
    return projects.filter(p => (p.status || "draft") === statusFilter);
  }, [projects, statusFilter]);

  // Calculate stats from all projects (not filtered)
  const stats = {
    totalProjects: projects.length,
    inProgressProjects: projects.filter(p => p.status === "in_progress").length,
    completedProjects: projects.filter(p => p.status === "completed").length,
    draftProjects: projects.filter(p => !p.status || p.status === "draft").length,
    pendingProjects: projects.filter(p => p.status === "suspended").length,
    totalBOQValue: projects.reduce((sum, p) => {
      const value = p.analysis_data?.summary?.total_value || 
                   p.analysis_data?.totalValue || 
                   0;
      return sum + value;
    }, 0),
  };

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
          <div className="flex items-center gap-2">
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
        <Tabs defaultValue="export" className="mt-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
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
            <ProjectSummaryTab projects={filteredProjects} />
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
