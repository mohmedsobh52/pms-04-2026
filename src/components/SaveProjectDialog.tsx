import { useState } from "react";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SaveProjectDialogProps {
  analysisData: any;
  wbsData: any;
  fileName?: string;
  onSaved?: (projectId: string) => void;
}

interface DuplicateProject {
  id: string;
  name: string;
}

export function SaveProjectDialog({
  analysisData,
  wbsData,
  fileName,
  onSaved,
}: SaveProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateProject, setDuplicateProject] = useState<DuplicateProject | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const saveProject = async (overwrite: boolean, existingId?: string) => {
    if (!user) return;

    const trimmedName = projectName.trim();
    setIsSaving(true);

    try {
      if (overwrite && existingId) {
        // Update existing project
        const { error } = await supabase
          .from("saved_projects")
          .update({
            file_name: fileName || null,
            analysis_data: analysisData,
            wbs_data: wbsData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);

        if (error) throw error;

        toast({ title: "تم تحديث المشروع بنجاح" });
        setOpen(false);
        setProjectName("");
        onSaved?.(existingId);
      } else {
        // Create new project
        const { data: savedData, error } = await supabase
          .from("saved_projects")
          .insert({
            user_id: user.id,
            name: trimmedName,
            file_name: fileName || null,
            analysis_data: analysisData,
            wbs_data: wbsData,
          })
          .select("id")
          .single();

        if (error) throw error;

        toast({ title: "تم حفظ المشروع بنجاح" });
        setOpen(false);
        setProjectName("");
        onSaved?.(savedData.id);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في حفظ المشروع",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setDuplicateDialogOpen(false);
      setDuplicateProject(null);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لحفظ المشروع",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      toast({
        title: "اسم المشروع مطلوب",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    // Check for duplicate project name
    const { data: existingProjects } = await supabase
      .from("saved_projects")
      .select("id, name")
      .eq("user_id", user.id)
      .ilike("name", trimmedName);

    setIsSaving(false);

    if (existingProjects && existingProjects.length > 0) {
      // Show duplicate dialog with options
      setDuplicateProject(existingProjects[0]);
      setDuplicateDialogOpen(true);
      return;
    }

    // No duplicate, save directly
    await saveProject(false);
  };

  const handleOverwrite = () => {
    if (duplicateProject) {
      saveProject(true, duplicateProject.id);
    }
  };

  const handleSaveWithNewName = () => {
    // Generate unique name with timestamp
    const timestamp = new Date().toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setProjectName(`${projectName.trim()} (${timestamp})`);
    setDuplicateDialogOpen(false);
    setDuplicateProject(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            حفظ المشروع
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حفظ المشروع</DialogTitle>
            <DialogDescription>
              أدخل اسماً للمشروع لحفظه واسترجاعه لاحقاً
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">اسم المشروع</Label>
              <Input
                id="project-name"
                placeholder="مشروع بناء..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground">الملف: {fileName}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !projectName.trim()}
              className="btn-gradient gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              يوجد مشروع بنفس الاسم
            </AlertDialogTitle>
            <AlertDialogDescription>
              يوجد مشروع محفوظ باسم "{duplicateProject?.name}". ماذا تريد أن تفعل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <AlertDialogCancel disabled={isSaving}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveWithNewName}
              disabled={isSaving}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              حفظ باسم جديد
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleOverwrite}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              استبدال القديم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
