import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { FastExtractionPanel } from "@/components/fast-extraction/FastExtractionPanel";
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
import { Button } from "@/components/ui/button";
import { FolderOpen, Paperclip, Filter, Zap, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

interface AttachmentsTabProps {
  initialProjectId?: string;
  initialExtractionMode?: boolean;
}

export function AttachmentsTab({ initialProjectId, initialExtractionMode = false }: AttachmentsTabProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [isLoading, setIsLoading] = useState(false);
  const [showFastExtraction, setShowFastExtraction] = useState(initialExtractionMode);

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

  const handleExtractionComplete = (projectId: string) => {
    setShowFastExtraction(false);
    setSelectedProjectId(projectId);
  };

  const handleFastExtractionToggle = () => {
    console.log("Fast Extraction button clicked, current state:", showFastExtraction);
    setShowFastExtraction(!showFastExtraction);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar - with CSS protection */}
      <div className="flex flex-wrap items-center gap-3 attachments-actions-safe">
        <Button
          onClick={handleFastExtractionToggle}
          variant={showFastExtraction ? "secondary" : "default"}
          className={cn(
            "gap-2 shadow-sm transition-all",
            "relative z-[70] pointer-events-auto",
            showFastExtraction && "bg-primary/10 border-primary/30"
          )}
        >
          {showFastExtraction ? (
            <>
              <X className="w-4 h-4" />
              {isArabic ? "إغلاق الاستخراج" : "Close Extraction"}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {isArabic ? "استخراج سريع" : "Fast Extraction"}
            </>
          )}
        </Button>

        {!showFastExtraction && (
          <>
            {/* Project Filter */}
            <Card className="flex-1 min-w-[280px] glass-card border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Select
                    value={selectedProjectId || "all"}
                    onValueChange={handleProjectChange}
                  >
                    <SelectTrigger className="border-0 bg-transparent shadow-none h-8 px-0 focus:ring-0">
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
                  {selectedProjectId && (
                    <Badge variant="secondary" className="gap-1 flex-shrink-0">
                      <FolderOpen className="w-3 h-3" />
                      {projects.find(p => p.id === selectedProjectId)?.name || ""}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Fast Extraction Panel or Project Attachments */}
      {showFastExtraction ? (
        <FastExtractionPanel
          defaultProjectId={selectedProjectId}
          onComplete={handleExtractionComplete}
          onCancel={() => setShowFastExtraction(false)}
        />
      ) : (
        <ProjectAttachments projectId={selectedProjectId} />
      )}
    </div>
  );
}
