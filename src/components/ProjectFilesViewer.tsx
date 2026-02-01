import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  CheckCircle,
  Clock,
  X,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProjectAttachment {
  id: string;
  project_id: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  is_analyzed: boolean | null;
  analysis_result: unknown;
  uploaded_at: string | null;
}

interface Project {
  id: string;
  name: string;
  created_at: string;
  files_count: number;
  categories: string[];
}

interface ProjectFilesViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILE_CATEGORIES = [
  { value: "all", labelEn: "All Files", labelAr: "جميع الملفات" },
  { value: "boq", labelEn: "Bill of Quantities", labelAr: "جدول الكميات" },
  { value: "drawings", labelEn: "Drawings", labelAr: "الرسومات" },
  { value: "specifications", labelEn: "Specifications", labelAr: "المواصفات" },
  { value: "contracts", labelEn: "Contracts", labelAr: "العقود" },
  { value: "quotations", labelEn: "Quotations", labelAr: "عروض الأسعار" },
  { value: "reports", labelEn: "Reports", labelAr: "التقارير" },
  { value: "schedules", labelEn: "Schedules", labelAr: "الجداول الزمنية" },
  { value: "general", labelEn: "General", labelAr: "عام" },
];

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return <File className="w-4 h-4" />;
  if (fileType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType.includes("image")) return <Image className="w-4 h-4 text-blue-500" />;
  if (fileType.includes("sheet") || fileType.includes("excel")) {
    return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
  }
  return <File className="w-4 h-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ProjectFilesViewer({ isOpen, onClose }: ProjectFilesViewerProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [files, setFiles] = useState<ProjectAttachment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Fetch projects with file statistics
  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchProjectsWithStats = async () => {
      setIsLoadingProjects(true);
      try {
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("saved_projects")
          .select("id, name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (projectsError) throw projectsError;

        if (!projectsData || projectsData.length === 0) {
          setProjects([]);
          return;
        }

        // Fetch attachment counts and categories
        const { data: attachmentsData, error: attachmentsError } = await supabase
          .from("project_attachments")
          .select("project_id, category")
          .in("project_id", projectsData.map((p) => p.id));

        if (attachmentsError) throw attachmentsError;

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
        setIsLoadingProjects(false);
      }
    };

    fetchProjectsWithStats();
  }, [user, isOpen]);

  // Fetch files for selected project
  useEffect(() => {
    if (!user || !selectedProjectId) {
      setFiles([]);
      return;
    }

    const fetchFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const { data, error } = await supabase
          .from("project_attachments")
          .select("id, project_id, file_name, file_type, file_size, category, is_analyzed, analysis_result, uploaded_at")
          .eq("project_id", selectedProjectId)
          .order("category", { ascending: true });

        if (error) throw error;
        setFiles(data || []);
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [user, selectedProjectId]);

  // Group files by category
  const groupedFiles = useMemo(() => {
    const filtered = selectedCategory === "all" 
      ? files 
      : files.filter((f) => f.category === selectedCategory);
    
    return filtered.reduce((acc, file) => {
      const cat = file.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(file);
      return acc;
    }, {} as Record<string, ProjectAttachment[]>);
  }, [files, selectedCategory]);

  const handleViewAllFiles = () => {
    if (selectedProjectId) {
      navigate(`/attachments?project=${selectedProjectId}`);
      onClose();
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side={isArabic ? "left" : "right"} 
        className="w-full sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {isArabic ? "ملفات المشاريع" : "Project Files"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Project Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isArabic ? "اختر المشروع" : "Select Project"}
            </label>
            {isLoadingProjects ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedProjectId || ""}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isArabic ? "اختر مشروعاً" : "Select a project"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{project.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {project.files_count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedProject && (
            <>
              {/* Project Stats */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{selectedProject.name}</span>
                  <Badge>{selectedProject.files_count} {isArabic ? "ملف" : "files"}</Badge>
                </div>
                {selectedProject.categories.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {selectedProject.categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs capitalize">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {isArabic ? cat.labelAr : cat.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Files List */}
              <ScrollArea className="h-[400px]">
                {isLoadingFiles ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : Object.keys(groupedFiles).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد ملفات" : "No files found"}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedFiles).map(([category, categoryFiles]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium mb-2 capitalize flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {categoryFiles.length}
                          </Badge>
                          {category}
                        </h4>
                        <div className="space-y-2">
                          {categoryFiles.map((file) => {
                            const result = file.analysis_result as { quantities?: any[]; summary?: { totalItems?: number } } | null;
                            const quantitiesCount = 
                              result?.quantities?.length || 
                              result?.summary?.totalItems || 
                              0;
                            
                            return (
                              <div
                                key={file.id}
                                className="flex items-center gap-3 p-2 rounded-lg bg-background border hover:bg-muted/50 transition-colors"
                              >
                                {getFileIcon(file.file_type)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {file.file_name}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatFileSize(file.file_size)}</span>
                                    {quantitiesCount > 0 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                        {quantitiesCount} {isArabic ? "بند" : "items"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {file.is_analyzed ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* View All Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleViewAllFiles}
              >
                <ExternalLink className="h-4 w-4" />
                {isArabic ? "عرض جميع الملفات" : "View All Files"}
              </Button>
            </>
          )}

          {!selectedProjectId && projects.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic
                ? "اختر مشروعاً لعرض ملفاته"
                : "Select a project to view its files"}
            </div>
          )}

          {!isLoadingProjects && projects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
