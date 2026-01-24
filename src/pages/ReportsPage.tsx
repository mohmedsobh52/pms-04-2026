import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileDown, BarChart3, TrendingUp, GitCompare } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ReportsStatCards } from "@/components/reports/ReportsStatCards";
import { ExportTab } from "@/components/reports/ExportTab";
import { ProjectSummaryTab } from "@/components/reports/ProjectSummaryTab";
import { RecentProjectsTab } from "@/components/reports/RecentProjectsTab";
import { ProjectsComparisonExport } from "@/components/reports/ProjectsComparisonExport";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
  created_at: string;
  updated_at: string;
  status?: string;
}

const ReportsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error(isArabic ? "خطأ في جلب المشاريع" : "Error fetching projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success(isArabic ? "تم حذف المشروع" : "Project deleted");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(isArabic ? "خطأ في حذف المشروع" : "Error deleting project");
    }
  };

  // Calculate statistics based on project status
  const stats = {
    totalProjects: projects.length,
    inProgressProjects: projects.filter(p => p.status === 'in_progress').length,
    totalBOQValue: projects.reduce((sum, p) => 
      sum + (p.analysis_data?.summary?.total_value || 0), 0),
    completedProjects: projects.filter(p => p.status === 'completed').length,
    draftProjects: projects.filter(p => !p.status || p.status === 'draft').length,
    pendingProjects: projects.filter(p => p.status === 'suspended').length,
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header with Breadcrumb */}
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isArabic ? "التقارير" : "Reports"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl font-bold mt-2">
              {isArabic ? "التقارير" : "Reports"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isArabic 
                ? "عرض وتصدير تقارير المشاريع والتسعير" 
                : "View and export project and pricing reports"}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchProjects}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isArabic ? "تحديث" : "Refresh"}
          </Button>
        </div>

        {/* Statistics Cards */}
        <ReportsStatCards
          totalProjects={stats.totalProjects}
          inProgressProjects={stats.inProgressProjects}
          totalBOQValue={stats.totalBOQValue}
          completedProjects={stats.completedProjects}
          draftProjects={stats.draftProjects}
          pendingProjects={stats.pendingProjects}
        />

        {/* Tabs */}
        <Tabs defaultValue="export" className="space-y-4">
          <TabsList>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              {isArabic ? "التصدير" : "Export"}
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              {isArabic ? "مقارنة الأسعار" : "Price Comparison"}
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {isArabic ? "ملخص المشروع" : "Project Summary"}
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isArabic ? "المشاريع الأخيرة" : "Recent Projects"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export">
            <ExportTab projects={projects} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="comparison">
            <ProjectsComparisonExport projects={projects} />
          </TabsContent>

          <TabsContent value="summary">
            <ProjectSummaryTab projects={projects} />
          </TabsContent>

          <TabsContent value="recent">
            <RecentProjectsTab 
              projects={projects} 
              onDeleteProject={handleDeleteProject}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ReportsPage;
