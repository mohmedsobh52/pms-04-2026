import { useState, useEffect } from "react";
import { Plus, FolderOpen, Loader2, Check, FileText, ExternalLink } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { UploadedFile } from "./FastExtractionUploader";

interface Project {
  id: string;
  name: string;
  created_at: string;
  files_count: number;
  categories: string[];
}

interface DrawingAnalysisResult {
  fileName: string;
  fileId?: string;
  success: boolean;
  quantities?: any[];
  drawingInfo?: any;
  summary?: any;
}

interface FastExtractionProjectSelectorProps {
  files: UploadedFile[];
  drawingResults?: DrawingAnalysisResult[];
}

export default function FastExtractionProjectSelector({
  files,
  drawingResults = [],
}: FastExtractionProjectSelectorProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const navigate = useNavigate();

  const [mode, setMode] = useState<"existing" | "new">("new");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch projects from project_data (matches project_attachments FK)
      const { data: projectsData, error } = await supabase
        .from("project_data")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        return;
      }

      // Fetch attachment counts and categories
      const { data: attachmentsData } = await supabase
        .from("project_attachments")
        .select("project_id, category")
        .in("project_id", projectsData.map((p) => p.id));

      // Build projects with stats
      const projectsWithStats = projectsData.map((project) => {
        const projectFiles = attachmentsData?.filter((a) => a.project_id === project.id) || [];
        const categories = [...new Set(projectFiles.map((f) => f.category).filter(Boolean))] as string[];
        return {
          ...project,
          files_count: projectFiles.length,
          categories,
        };
      });

      setProjects(projectsWithStats);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const successFiles = files.filter((f) => f.status === "success" && f.storagePath);

    if (successFiles.length === 0) {
      toast.error(isArabic ? "لا توجد ملفات للحفظ" : "No files to save");
      return;
    }

    if (mode === "new" && !newProjectName.trim()) {
      toast.error(isArabic ? "أدخل اسم المشروع" : "Enter project name");
      return;
    }

    if (mode === "existing" && !selectedProjectId) {
      toast.error(isArabic ? "اختر مشروعاً" : "Select a project");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let projectId = selectedProjectId;

      // Create new project in project_data (matches project_attachments FK)
      if (mode === "new") {
        const { data: newProject, error: projectError } = await supabase
          .from("project_data")
          .insert({
            name: newProjectName.trim(),
            user_id: user.id,
          })
          .select()
          .single();

        if (projectError) throw projectError;
        projectId = newProject.id;
      }

      // Save attachments with analysis results
      const attachments = successFiles.map((file) => {
        // Find analysis result for this file
        const analysisResult = drawingResults.find(
          (r) => r.fileName === file.name || r.fileId === file.id
        );

        return {
          project_id: projectId,
          user_id: user.id,
          file_name: file.name,
          file_path: file.storagePath!,
          file_type: file.type,
          file_size: file.size,
          category: file.category || "general",
          is_analyzed: analysisResult?.success ?? false,
          analysis_result: analysisResult
            ? {
                success: analysisResult.success,
                quantities: analysisResult.quantities || [],
                drawing_info: analysisResult.drawingInfo || null,
                summary: analysisResult.summary || null,
              }
            : null,
        };
      });

      const { error: attachError } = await supabase
        .from("project_attachments")
        .insert(attachments);

      if (attachError) throw attachError;

      toast.success(
        <div className="flex flex-col gap-2">
          <span>
            {isArabic
              ? `تم حفظ ${successFiles.length} ملفات بنجاح`
              : `Successfully saved ${successFiles.length} files`}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 w-fit"
            onClick={() => navigate(`/attachments?project=${projectId}`)}
          >
            <ExternalLink className="h-3 w-3" />
            {isArabic ? "عرض الملفات" : "View Files"}
          </Button>
        </div>,
        { duration: 6000 }
      );
    } catch (error) {
      console.error("Save error:", error);
      toast.error(isArabic ? "فشل حفظ الملفات" : "Failed to save files");
    } finally {
      setIsSaving(false);
    }
  };

  const successFiles = files.filter((f) => f.status === "success");
  const successCount = successFiles.length;

  // Build category counts
  const categoryCounts: Record<string, number> = {};
  successFiles.forEach((file) => {
    const cat = file.category || "general";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">
          {isArabic ? "ربط بالمشروع" : "Link to Project"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isArabic
            ? `سيتم حفظ ${successCount} ملفات في المشروع المختار`
            : `${successCount} files will be saved to the selected project`}
        </p>
      </div>

      {/* Mode Selection */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as "existing" | "new")}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <RadioGroupItem value="new" id="new" />
          <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            {isArabic ? "إنشاء مشروع جديد" : "Create new project"}
          </Label>
        </div>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <RadioGroupItem value="existing" id="existing" />
          <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
            <FolderOpen className="h-4 w-4" />
            {isArabic ? "اختيار مشروع موجود" : "Select existing project"}
          </Label>
        </div>
      </RadioGroup>

      {/* New Project Input */}
      {mode === "new" && (
        <div className="space-y-2">
          <Label>{isArabic ? "اسم المشروع" : "Project Name"}</Label>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder={isArabic ? "أدخل اسم المشروع" : "Enter project name"}
          />
        </div>
      )}

      {/* Existing Project Selection */}
      {mode === "existing" && (
        <div className="space-y-2">
          <Label>{isArabic ? "اختر المشروع" : "Select Project"}</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
            </p>
          ) : (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isArabic ? "اختر مشروعاً" : "Select a project"}
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="truncate">{project.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {project.files_count}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Files Summary */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <h4 className="text-sm font-medium mb-2">
          {isArabic ? "ملخص الملفات" : "Files Summary"}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <div key={cat} className="flex justify-between">
              <span className="text-muted-foreground capitalize">{cat}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handleSave}
        disabled={isSaving || successCount === 0}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {isArabic ? "حفظ وإكمال" : "Save & Complete"}
      </Button>
    </div>
  );
}
