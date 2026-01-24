import { useState, useEffect } from "react";
import { FolderOpen, Trash2, Loader2, Calendar, FileText, Sparkles, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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

interface SavedProject {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  created_at: string;
  has_ai_rates?: boolean;
}

interface SavedProjectsProps {
  onLoadProject: (analysisData: any, wbsData: any, projectId?: string) => void;
}

export function SavedProjects({ onLoadProject }: SavedProjectsProps) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch projects from saved_projects table
      const { data: projectsData, error: projectsError } = await supabase
        .from("saved_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Check if analysis_data has AI rates
      const projectsWithRates = (projectsData || []).map((project) => {
        const analysisData = project.analysis_data as { items?: Array<{ aiSuggestedRate?: number }> } | null;
        const hasAiRates = analysisData?.items?.some(
          (item) => item.aiSuggestedRate && item.aiSuggestedRate > 0
        );
        return { ...project, has_ai_rates: hasAiRates || false };
      });

      setProjects(projectsWithRates);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: "خطأ في تحميل المشاريع",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("saved_projects")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "خطأ في حذف المشروع",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم حذف المشروع",
      });
      fetchProjects();
    }
  };

  const handleLoad = (project: SavedProject) => {
    // Load project data directly from saved_projects table
    // AI rates are stored within analysis_data.items
    onLoadProject(project.analysis_data, project.wbs_data, project.id);
    toast({
      title: "تم تحميل المشروع",
      description: project.name,
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">لا توجد مشاريع محفوظة</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-primary" />
        المشاريع المحفوظة
      </h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{project.name}</h4>
                {project.file_name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <FileText className="w-3 h-3" />
                    {project.file_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.created_at).toLocaleDateString("ar-SA")}
                  </p>
                  {project.has_ai_rates && (
                    <Badge variant="secondary" className="gap-1 text-xs px-1.5 py-0 h-5">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      AI
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoad(project)}
                  className="text-primary"
                >
                  فتح
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف المشروع</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف "{project.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(project.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
