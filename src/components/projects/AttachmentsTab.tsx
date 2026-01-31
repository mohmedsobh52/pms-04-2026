import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Paperclip, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
}

interface AttachmentsTabProps {
  initialProjectId?: string;
}

export function AttachmentsTab({ initialProjectId }: AttachmentsTabProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch projects for the filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch from both tables
        const [savedProjectsRes, projectDataRes] = await Promise.all([
          supabase
            .from("saved_projects")
            .select("id, name")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false }),
          supabase
            .from("project_data")
            .select("id, name")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        ]);

        const savedProjects = savedProjectsRes.data || [];
        const projectDataList = projectDataRes.data || [];

        // Merge and deduplicate
        const projectMap = new Map<string, Project>();
        savedProjects.forEach((p) => {
          projectMap.set(p.id, { id: p.id, name: p.name });
        });
        projectDataList.forEach((p) => {
          if (!projectMap.has(p.id)) {
            projectMap.set(p.id, { id: p.id, name: p.name });
          }
        });

        setProjects(Array.from(projectMap.values()));
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value === "all" ? undefined : value);
  };

  return (
    <div className="space-y-6">
      {/* Project Filter Card */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {isArabic ? "تصفية حسب المشروع" : "Filter by Project"}
            </CardTitle>
            {selectedProjectId && (
              <Badge variant="secondary" className="gap-1">
                <FolderOpen className="w-3 h-3" />
                {projects.find(p => p.id === selectedProjectId)?.name || ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProjectId || "all"}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder={isArabic ? "اختر مشروع..." : "Select a project..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  {isArabic ? "جميع المرفقات" : "All Attachments"}
                </div>
              </SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {isArabic 
              ? "اختر مشروعاً لعرض مرفقاته فقط، أو اعرض جميع المرفقات"
              : "Select a project to view its attachments, or view all attachments"
            }
          </p>
        </CardContent>
      </Card>

      {/* Project Attachments Component */}
      <ProjectAttachments projectId={selectedProjectId} />
    </div>
  );
}
