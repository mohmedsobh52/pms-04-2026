import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  Check,
  ChevronRight,
  Home,
} from "lucide-react";

interface AttachmentFolder {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  name_ar: string | null;
  color: string;
  icon: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

interface AttachmentFoldersProps {
  projectId?: string;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  attachmentsCount?: { [folderId: string]: number };
}

const FOLDER_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
];

export function AttachmentFolders({
  projectId,
  selectedFolderId,
  onSelectFolder,
  attachmentsCount = {},
}: AttachmentFoldersProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [folders, setFolders] = useState<AttachmentFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AttachmentFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderNameAr, setNewFolderNameAr] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchFolders = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from("attachment_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast.error(isArabic ? "خطأ في تحميل المجلدات" : "Error loading folders");
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId, isArabic]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("attachment_folders").insert({
        user_id: user.id,
        project_id: projectId || null,
        name: newFolderName.trim(),
        name_ar: newFolderNameAr.trim() || null,
        color: newFolderColor,
      });

      if (error) throw error;

      toast.success(isArabic ? "تم إنشاء المجلد" : "Folder created");
      setIsCreateDialogOpen(false);
      setNewFolderName("");
      setNewFolderNameAr("");
      setNewFolderColor(FOLDER_COLORS[0]);
      fetchFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error(isArabic ? "خطأ في إنشاء المجلد" : "Error creating folder");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("attachment_folders")
        .update({
          name: newFolderName.trim(),
          name_ar: newFolderNameAr.trim() || null,
          color: newFolderColor,
        })
        .eq("id", editingFolder.id);

      if (error) throw error;

      toast.success(isArabic ? "تم تحديث المجلد" : "Folder updated");
      setIsEditDialogOpen(false);
      setEditingFolder(null);
      setNewFolderName("");
      setNewFolderNameAr("");
      fetchFolders();
    } catch (error) {
      console.error("Error updating folder:", error);
      toast.error(isArabic ? "خطأ في تحديث المجلد" : "Error updating folder");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFolder = async (folder: AttachmentFolder) => {
    if (!confirm(isArabic ? "هل تريد حذف هذا المجلد؟" : "Delete this folder?")) return;

    try {
      // First, move files from this folder to root (null folder_id)
      await supabase
        .from("project_attachments")
        .update({ folder_id: null })
        .eq("folder_id", folder.id);

      // Then delete the folder
      const { error } = await supabase
        .from("attachment_folders")
        .delete()
        .eq("id", folder.id);

      if (error) throw error;

      toast.success(isArabic ? "تم حذف المجلد" : "Folder deleted");
      if (selectedFolderId === folder.id) {
        onSelectFolder(null);
      }
      fetchFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error(isArabic ? "خطأ في حذف المجلد" : "Error deleting folder");
    }
  };

  const openEditDialog = (folder: AttachmentFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderNameAr(folder.name_ar || "");
    setNewFolderColor(folder.color);
    setIsEditDialogOpen(true);
  };

  const rootFilesCount = attachmentsCount["root"] || 0;
  const totalFilesCount = Object.values(attachmentsCount).reduce((a, b) => a + b, 0);

  if (!user) return null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {isArabic ? "المجلدات" : "Folders"}
        </h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <FolderPlus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isArabic ? "إنشاء مجلد جديد" : "Create New Folder"}
              </DialogTitle>
              <DialogDescription>
                {isArabic
                  ? "أضف مجلداً لتنظيم ملفاتك"
                  : "Add a folder to organize your files"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{isArabic ? "اسم المجلد (إنجليزي)" : "Folder Name (English)"}</Label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={isArabic ? "أدخل اسم المجلد" : "Enter folder name"}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "اسم المجلد (عربي)" : "Folder Name (Arabic)"}</Label>
                <Input
                  value={newFolderNameAr}
                  onChange={(e) => setNewFolderNameAr(e.target.value)}
                  placeholder={isArabic ? "اختياري" : "Optional"}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "اللون" : "Color"}</Label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        newFolderColor === color
                          ? "ring-2 ring-offset-2 ring-primary scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewFolderColor(color)}
                    >
                      {newFolderColor === color && (
                        <Check className="w-4 h-4 mx-auto text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isArabic ? "إنشاء" : "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Folders List */}
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1">
          {/* All Files */}
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              selectedFolderId === null
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
            onClick={() => onSelectFolder(null)}
          >
            <Home className="w-4 h-4" />
            <span className="flex-1 text-start">
              {isArabic ? "جميع الملفات" : "All Files"}
            </span>
            <Badge variant="secondary" className="text-xs">
              {totalFilesCount}
            </Badge>
          </button>

          {/* Root (Uncategorized) */}
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              selectedFolderId === "root"
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
            onClick={() => onSelectFolder("root")}
          >
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-start">
              {isArabic ? "غير مصنف" : "Uncategorized"}
            </span>
            <Badge variant="secondary" className="text-xs">
              {rootFilesCount}
            </Badge>
          </button>

          {/* Custom Folders */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            folders.map((folder) => (
              <div
                key={folder.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                  selectedFolderId === folder.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
                onClick={() => onSelectFolder(folder.id)}
              >
                <Folder
                  className="w-4 h-4"
                  style={{ color: folder.color }}
                />
                <span className="flex-1 text-start truncate">
                  {isArabic && folder.name_ar ? folder.name_ar : folder.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {attachmentsCount[folder.id] || 0}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(folder)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      {isArabic ? "تعديل" : "Edit"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteFolder(folder)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isArabic ? "حذف" : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArabic ? "تعديل المجلد" : "Edit Folder"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? "اسم المجلد (إنجليزي)" : "Folder Name (English)"}</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "اسم المجلد (عربي)" : "Folder Name (Arabic)"}</Label>
              <Input
                value={newFolderNameAr}
                onChange={(e) => setNewFolderNameAr(e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "اللون" : "Color"}</Label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      newFolderColor === color
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewFolderColor(color)}
                  >
                    {newFolderColor === color && (
                      <Check className="w-4 h-4 mx-auto text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleEditFolder}
              disabled={!newFolderName.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isArabic ? "حفظ" : "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
