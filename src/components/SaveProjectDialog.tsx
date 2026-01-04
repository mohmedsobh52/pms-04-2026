import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SaveProjectDialogProps {
  analysisData: any;
  wbsData: any;
  fileName?: string;
  onSaved?: (projectId: string) => void;
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
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لحفظ المشروع",
        variant: "destructive",
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: "اسم المشروع مطلوب",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const { data: savedData, error } = await supabase.from("saved_projects").insert({
      user_id: user.id,
      name: projectName.trim(),
      file_name: fileName || null,
      analysis_data: analysisData,
      wbs_data: wbsData,
    }).select('id').single();

    if (error) {
      toast({
        title: "خطأ في حفظ المشروع",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم حفظ المشروع بنجاح",
      });
      setOpen(false);
      setProjectName("");
      onSaved?.(savedData.id);
    }

    setIsSaving(false);
  };

  return (
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
            <p className="text-sm text-muted-foreground">
              الملف: {fileName}
            </p>
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
  );
}
