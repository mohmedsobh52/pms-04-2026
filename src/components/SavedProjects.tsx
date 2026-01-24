import { useState, useEffect } from "react";
import { FolderOpen, Trash2, Loader2, Calendar, FileText, Sparkles, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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

  const handleStartEdit = (project: SavedProject) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast({
        title: "خطأ",
        description: "اسم المشروع لا يمكن أن يكون فارغاً",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("saved_projects")
        .update({ 
          name: editName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "تم تحديث اسم المشروع",
      });
      setEditingId(null);
      setEditName("");
      fetchProjects();
    } catch (error: any) {
      toast({
        title: "خطأ في تحديث الاسم",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(id);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleLoad = async (project: SavedProject) => {
    // Load project data and sync AI rates with item_costs if available
    const analysisData = project.analysis_data;
    
    // Sync AI rates to item_costs table
    try {
      const { data: projectItems } = await supabase
        .from("project_items")
        .select("id, item_number")
        .eq("project_id", project.id);

      if (projectItems && projectItems.length > 0 && analysisData?.items) {
        let syncedCount = 0;
        
        for (const projectItem of projectItems) {
          const analysisItem = analysisData.items.find(
            (item: any) => item.itemNo === projectItem.item_number || 
                          item.item_number === projectItem.item_number
          );
          
          if (analysisItem?.aiSuggestedRate && analysisItem.aiSuggestedRate > 0) {
            const { error } = await supabase
              .from("item_costs")
              .upsert({
                project_item_id: projectItem.id,
                ai_suggested_rate: analysisItem.aiSuggestedRate
              }, { onConflict: 'project_item_id' });
            
            if (!error) syncedCount++;
          }
        }
        
        if (syncedCount > 0) {
          console.log(`Synced ${syncedCount} AI rates to item_costs`);
        }
      }
    } catch (error) {
      console.error("Error syncing AI rates:", error);
    }

    onLoadProject(analysisData, project.wbs_data, project.id);
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
                {editingId === project.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, project.id)}
                      className="h-8 text-sm"
                      autoFocus
                      disabled={isSaving}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveEdit(project.id)}
                      disabled={isSaving}
                      className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{project.name}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(project)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
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
                      <Sparkles className="w-3 h-3 text-primary" />
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
