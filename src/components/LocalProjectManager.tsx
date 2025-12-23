import { useState } from "react";
import { Save, FolderOpen, Trash2, Calendar, FileText, ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLocalProjects, LocalProject } from "@/hooks/useLocalProjects";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface LocalProjectManagerProps {
  analysisData: any;
  wbsData?: any;
  fileName?: string;
  onLoadProject: (analysisData: any, wbsData: any) => void;
}

export function LocalProjectManager({ 
  analysisData, 
  wbsData, 
  fileName,
  onLoadProject 
}: LocalProjectManagerProps) {
  const { isArabic } = useLanguage();
  const { projects, saveProject, deleteProject, loadProject, projectCount, maxProjects } = useLocalProjects();
  const [projectName, setProjectName] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleSave = async () => {
    if (!projectName.trim()) return;
    
    setIsSaving(true);
    try {
      saveProject(projectName.trim(), analysisData, wbsData, fileName);
      setProjectName("");
      setIsSaveDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (project: LocalProject) => {
    const loaded = loadProject(project.id);
    if (loaded) {
      onLoadProject(loaded.analysisData, loaded.wbsData);
    }
  };

  const handleDelete = (projectId: string) => {
    deleteProject(projectId);
    setProjectToDelete(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: isArabic ? ar : enUS
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Project Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={!analysisData}
          >
            <Save className="w-4 h-4" />
            {isArabic ? "حفظ محلي" : "Save Local"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? "حفظ المشروع محلياً" : "Save Project Locally"}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? `سيتم حفظ المشروع في متصفحك (${projectCount}/${maxProjects} مشاريع محفوظة)`
                : `Project will be saved in your browser (${projectCount}/${maxProjects} projects saved)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isArabic ? "اسم المشروع" : "Project Name"}
              </label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={isArabic ? "أدخل اسم المشروع..." : "Enter project name..."}
                dir={isArabic ? "rtl" : "ltr"}
              />
            </div>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{fileName}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!projectName.trim() || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isArabic ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Project Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            {isArabic ? "تحميل" : "Load"}
            {projects.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {projects.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-popover z-50">
          <DropdownMenuLabel>
            {isArabic ? "المشاريع المحفوظة" : "Saved Projects"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {projects.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <div key={project.id} className="group relative">
                  <DropdownMenuItem
                    onClick={() => handleLoad(project)}
                    className="cursor-pointer pr-10"
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate max-w-[180px]">
                          {project.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(project.savedAt)}</span>
                      </div>
                      {project.fileName && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{project.fileName}</span>
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                  
                  <AlertDialog open={projectToDelete === project.id} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isArabic ? "حذف المشروع" : "Delete Project"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isArabic 
                            ? `هل أنت متأكد من حذف "${project.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                            : `Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {isArabic ? "إلغاء" : "Cancel"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isArabic ? "حذف" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
