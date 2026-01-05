import { useState, useCallback, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Trash2,
  Download,
  Eye,
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Sparkles,
  GitCompare,
  Layers,
  FileOutput,
  RefreshCw,
  Combine,
  FolderInput
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { AnalysisExportDialog } from "./AnalysisExportDialog";
import { FilesComparisonDialog } from "./FilesComparisonDialog";
import { BatchAnalysisDialog } from "./BatchAnalysisDialog";
import { ReAnalyzeDialog } from "./ReAnalyzeDialog";
import { MergedAnalysisReport } from "./MergedAnalysisReport";
import { DrawingQuantityExtractor } from "./DrawingQuantityExtractor";
import { ProjectFilesReport } from "./ProjectFilesReport";
import { AnalysisPreferencesDialog } from "./AnalysisPreferencesDialog";
import { ScheduledReportsDialog } from "./ScheduledReportsDialog";
import { AnalysisCharts } from "./AnalysisCharts";
import { CloudStorageIntegration } from "./CloudStorageIntegration";
import { AttachmentFolders } from "./AttachmentFolders";
import { AdvancedFilters, FilterState } from "./AdvancedFilters";
import { useAnalysisNotifications } from "@/hooks/useAnalysisNotifications";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface ProjectAttachment {
  id: string;
  project_id: string | null;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  category: string | null;
  description: string | null;
  is_analyzed: boolean | null;
  analysis_result: any;
  uploaded_at: string | null;
  updated_at: string | null;
  folder_id: string | null;
}

interface AttachmentFolder {
  id: string;
  name: string;
  name_ar: string | null;
  color: string;
}

interface ProjectAttachmentsProps {
  projectId?: string;
  onFileAnalyze?: (file: ProjectAttachment) => void;
}

const FILE_CATEGORIES = [
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
  if (!fileType) return <File className="w-5 h-5" />;
  
  if (fileType.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (fileType.includes("image")) return <Image className="w-5 h-5 text-blue-500" />;
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv")) {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  }
  if (fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="w-5 h-5 text-blue-600" />;
  }
  return <File className="w-5 h-5 text-muted-foreground" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ProjectAttachments({ projectId, onFileAnalyze }: ProjectAttachmentsProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [folders, setFolders] = useState<AttachmentFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedUploadFolder, setSelectedUploadFolder] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isReAnalyzeDialogOpen, setIsReAnalyzeDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedFileForReAnalysis, setSelectedFileForReAnalysis] = useState<ProjectAttachment | null>(null);
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    fileType: "all",
    dateFrom: undefined,
    dateTo: undefined,
    sizeMin: "",
    sizeMax: "",
    isAnalyzed: "all",
  });

  const { startTask, completeTask } = useAnalysisNotifications({
    enabled: true,
    onComplete: () => fetchAttachments()
  });

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.fileType !== "all") count++;
    if (advancedFilters.dateFrom) count++;
    if (advancedFilters.dateTo) count++;
    if (advancedFilters.sizeMin) count++;
    if (advancedFilters.sizeMax) count++;
    if (advancedFilters.isAnalyzed !== "all") count++;
    return count;
  }, [advancedFilters]);

  // Calculate folder counts for sidebar
  const folderCounts = useMemo(() => {
    const counts: { [key: string]: number } = { root: 0 };
    attachments.forEach((attachment) => {
      if (!attachment.folder_id) {
        counts.root = (counts.root || 0) + 1;
      } else {
        counts[attachment.folder_id] = (counts[attachment.folder_id] || 0) + 1;
      }
    });
    return counts;
  }, [attachments]);

  const analyzedFiles = attachments.filter(a => a.is_analyzed);
  const unanalyzedFiles = attachments.filter(a => !a.is_analyzed);

  const fetchAttachments = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from("project_attachments")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast.error(isArabic ? "خطأ في تحميل الملفات" : "Error loading files");
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId, isArabic]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from("attachment_folders")
        .select("id, name, name_ar, color")
        .eq("user_id", user.id);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchAttachments();
    fetchFolders();
  }, [fetchAttachments, fetchFolders]);

  const extractFileContent = async (file: File): Promise<string> => {
    const fileType = file.type;
    
    // Handle text files
    if (fileType.includes("text") || file.name.endsWith(".txt") || 
        file.name.endsWith(".json") || file.name.endsWith(".xml") ||
        file.name.endsWith(".csv")) {
      return await file.text();
    }
    
    // Handle Excel files
    if (fileType.includes("sheet") || fileType.includes("excel") ||
        file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      let content = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        content += `\n=== Sheet: ${sheetName} ===\n`;
        content += XLSX.utils.sheet_to_csv(sheet);
      });
      return content;
    }
    
    // For PDF and other files, return a placeholder
    // In production, you'd use OCR or PDF parsing
    return `[File: ${file.name}, Type: ${fileType}]`;
  };

  const handleAnalyzeFile = async (attachment: ProjectAttachment) => {
    if (!user) return;
    
    setAnalyzingFileId(attachment.id);
    startTask(attachment.id, attachment.file_name);
    
    try {
      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("project-files")
        .download(attachment.file_path);

      if (downloadError) throw downloadError;

      // Extract content based on file type
      const blob = fileData as Blob;
      const file = new window.File([blob], attachment.file_name, { type: attachment.file_type || "" });
      const content = await extractFileContent(file);

      // Determine analysis type based on category
      let analysisType = "extract_data";
      if (attachment.category === "boq") {
        analysisType = "extract_boq";
      } else if (attachment.category === "quotations") {
        analysisType = "cost_analysis";
      }

      // Call the analysis function
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke("analyze-attachment", {
        body: {
          fileContent: content.slice(0, 50000), // Limit content size
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          analysisType
        }
      });

      if (analysisError) throw analysisError;

      if (analysisResult.error) {
        throw new Error(analysisResult.error);
      }

      // Update the attachment with analysis result
      const { error: updateError } = await supabase
        .from("project_attachments")
        .update({
          is_analyzed: true,
          analysis_result: analysisResult.analysis
        })
        .eq("id", attachment.id);

      if (updateError) throw updateError;

      completeTask(attachment.id, true);
      fetchAttachments();
    } catch (error: any) {
      console.error("Analysis error:", error);
      completeTask(attachment.id, false, error.message);
    } finally {
      setAnalyzingFileId(null);
    }
  };

  const handleReAnalyze = (attachment: ProjectAttachment) => {
    setSelectedFileForReAnalysis(attachment);
    setIsReAnalyzeDialogOpen(true);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from("project_attachments")
          .insert({
            user_id: user.id,
            project_id: projectId || null,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            category: selectedCategory,
            description: description || null,
            folder_id: selectedUploadFolder || null,
          });

        if (dbError) throw dbError;

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      toast.success(
        isArabic 
          ? `تم رفع ${totalFiles} ملف بنجاح` 
          : `${totalFiles} file(s) uploaded successfully`
      );
      
      setIsUploadDialogOpen(false);
      setDescription("");
      setSelectedCategory("general");
      setSelectedUploadFolder(null);
      fetchAttachments();
      fetchFolders();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(isArabic ? "خطأ في رفع الملفات" : "Error uploading files");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (attachment: ProjectAttachment) => {
    if (!user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("project_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      toast.success(isArabic ? "تم حذف الملف" : "File deleted");
      fetchAttachments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(isArabic ? "خطأ في حذف الملف" : "Error deleting file");
    }
  };

  const handleDownload = async (attachment: ProjectAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("project-files")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(isArabic ? "خطأ في تحميل الملف" : "Error downloading file");
    }
  };

  const handlePreview = (attachment: ProjectAttachment) => {
    setPreviewFile(attachment);
    setIsPreviewOpen(true);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // Move file to folder
  const handleMoveToFolder = async (attachment: ProjectAttachment, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("project_attachments")
        .update({ folder_id: folderId })
        .eq("id", attachment.id);

      if (error) throw error;

      toast.success(isArabic ? "تم نقل الملف" : "File moved");
      fetchAttachments();
    } catch (error) {
      console.error("Error moving file:", error);
      toast.error(isArabic ? "خطأ في نقل الملف" : "Error moving file");
    }
  };

  // Advanced filtering logic
  const filteredAttachments = useMemo(() => {
    return attachments.filter((attachment) => {
      // Search filter
      const matchesSearch = attachment.file_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory =
        categoryFilter === "all" || attachment.category === categoryFilter;
      
      // Folder filter
      let matchesFolder = true;
      if (selectedFolderId === "root") {
        matchesFolder = !attachment.folder_id;
      } else if (selectedFolderId) {
        matchesFolder = attachment.folder_id === selectedFolderId;
      }
      
      // File type filter
      let matchesFileType = true;
      if (advancedFilters.fileType !== "all") {
        const fileType = attachment.file_type?.toLowerCase() || "";
        switch (advancedFilters.fileType) {
          case "pdf":
            matchesFileType = fileType.includes("pdf");
            break;
          case "image":
            matchesFileType = fileType.includes("image");
            break;
          case "excel":
            matchesFileType = fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv");
            break;
          case "word":
            matchesFileType = fileType.includes("word") || fileType.includes("document");
            break;
          case "text":
            matchesFileType = fileType.includes("text") || attachment.file_name.endsWith(".txt");
            break;
        }
      }
      
      // Date filter
      let matchesDate = true;
      if (advancedFilters.dateFrom && attachment.uploaded_at) {
        const uploadDate = new Date(attachment.uploaded_at);
        matchesDate = uploadDate >= advancedFilters.dateFrom;
      }
      if (matchesDate && advancedFilters.dateTo && attachment.uploaded_at) {
        const uploadDate = new Date(attachment.uploaded_at);
        const dateTo = new Date(advancedFilters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        matchesDate = uploadDate <= dateTo;
      }
      
      // Size filter
      let matchesSize = true;
      if (advancedFilters.sizeMin && attachment.file_size) {
        matchesSize = attachment.file_size >= parseInt(advancedFilters.sizeMin);
      }
      if (matchesSize && advancedFilters.sizeMax && attachment.file_size) {
        matchesSize = attachment.file_size <= parseInt(advancedFilters.sizeMax);
      }
      
      // Analysis status filter
      let matchesAnalysis = true;
      if (advancedFilters.isAnalyzed === "analyzed") {
        matchesAnalysis = attachment.is_analyzed === true;
      } else if (advancedFilters.isAnalyzed === "not_analyzed") {
        matchesAnalysis = !attachment.is_analyzed;
      }
      
      return matchesSearch && matchesCategory && matchesFolder && matchesFileType && matchesDate && matchesSize && matchesAnalysis;
    });
  }, [attachments, searchQuery, categoryFilter, selectedFolderId, advancedFilters]);

  const getCategoryLabel = (value: string | null) => {
    const category = FILE_CATEGORIES.find((c) => c.value === value);
    return category ? (isArabic ? category.labelAr : category.labelEn) : value;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? "يرجى تسجيل الدخول لرفع الملفات" : "Please login to upload files"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {isArabic ? "مرفقات المشروع" : "Project Attachments"}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quantity Takeoff */}
              <DrawingQuantityExtractor 
                attachments={attachments} 
                onAnalysisComplete={fetchAttachments}
              />
              
              {/* Files Report */}
              <ProjectFilesReport attachments={attachments} />
              
              {/* Analysis Preferences */}
              <AnalysisPreferencesDialog />
              
              {/* Scheduled Reports */}
              <ScheduledReportsDialog projectId={projectId} />
              
              {/* Batch Analysis Button */}
              {unanalyzedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsBatchDialogOpen(true)}
                >
                  <Layers className="w-4 h-4" />
                  {isArabic ? `تحليل ${unanalyzedFiles.length} ملفات` : `Analyze ${unanalyzedFiles.length} Files`}
                </Button>
              )}
              
              {/* Compare Button */}
              {analyzedFiles.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsCompareDialogOpen(true)}
                >
                  <GitCompare className="w-4 h-4" />
                  {isArabic ? "مقارنة" : "Compare"}
                </Button>
              )}
              
              {/* Merge Button */}
              {analyzedFiles.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsMergeDialogOpen(true)}
                >
                  <Combine className="w-4 h-4" />
                  {isArabic ? "دمج" : "Merge"}
                </Button>
              )}
              
              {/* Export Button */}
              {analyzedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsExportDialogOpen(true)}
                >
                  <FileOutput className="w-4 h-4" />
                  {isArabic ? "تصدير" : "Export"}
                </Button>
              )}
              
              {/* Cloud Storage Button */}
              <CloudStorageIntegration projectId={projectId} />
              
              {/* Upload Button */}
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    {isArabic ? "رفع ملفات" : "Upload Files"}
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {isArabic ? "رفع ملفات جديدة" : "Upload New Files"}
                  </DialogTitle>
                  <DialogDescription>
                    {isArabic
                      ? "اسحب الملفات هنا أو اختر من جهازك"
                      : "Drag files here or choose from your device"}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label>{isArabic ? "التصنيف" : "Category"}</Label>
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
                  </div>

                  {/* Folder Selection */}
                  <div className="space-y-2">
                    <Label>{isArabic ? "المجلد" : "Folder"}</Label>
                    <Select 
                      value={selectedUploadFolder || "root"} 
                      onValueChange={(v) => setSelectedUploadFolder(v === "root" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? "بدون مجلد" : "No folder"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">
                          {isArabic ? "بدون مجلد" : "No folder"}
                        </SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: folder.color }} />
                              {isArabic && folder.name_ar ? folder.name_ar : folder.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>{isArabic ? "وصف (اختياري)" : "Description (optional)"}</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={isArabic ? "أضف وصفاً للملفات..." : "Add description..."}
                    />
                  </div>

                  {/* Upload Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {isUploading ? (
                      <div className="space-y-3">
                        <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? "جاري الرفع..." : "Uploading..."}
                        </p>
                        <Progress value={uploadProgress} className="w-full" />
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-3">
                          {isArabic
                            ? "اسحب الملفات هنا أو"
                            : "Drag files here or"}
                        </p>
                        <label>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files)}
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.csv,.xml,.json,.txt"
                          />
                          <Button variant="outline" size="sm" asChild>
                            <span className="cursor-pointer">
                              {isArabic ? "اختر ملفات" : "Choose Files"}
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-muted-foreground mt-3">
                          {isArabic
                            ? "PDF, Excel, Word, صور (حد أقصى 50MB)"
                            : "PDF, Excel, Word, Images (max 50MB)"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                isArabic ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={isArabic ? "بحث في الملفات..." : "Search files..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isArabic ? "pr-9" : "pl-9"}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={isArabic ? "التصنيف" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isArabic ? "جميع التصنيفات" : "All Categories"}
                </SelectItem>
                {FILE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {isArabic ? cat.labelAr : cat.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Advanced Filters */}
            <AdvancedFilters
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-6">
            {/* Folders Sidebar */}
            <div className="hidden md:block w-56 flex-shrink-0 border-r pr-4">
              <AttachmentFolders
                projectId={projectId}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                attachmentsCount={folderCounts}
              />
            </div>

            {/* Files List */}
            <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredAttachments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== "all"
                  ? isArabic
                    ? "لا توجد نتائج"
                    : "No results found"
                  : isArabic
                  ? "لا توجد ملفات مرفوعة"
                  : "No files uploaded"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    "hover:bg-muted/50 transition-colors group cursor-pointer"
                  )}
                  onClick={() => handlePreview(attachment)}
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {getFileIcon(attachment.file_type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {attachment.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {getCategoryLabel(attachment.category)}
                      </Badge>
                      {attachment.folder_id && (
                        <>
                          <span>•</span>
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 gap-1"
                            style={{ 
                              borderColor: folders.find(f => f.id === attachment.folder_id)?.color,
                              color: folders.find(f => f.id === attachment.folder_id)?.color
                            }}
                          >
                            {(() => {
                              const folder = folders.find(f => f.id === attachment.folder_id);
                              return folder ? (isArabic && folder.name_ar ? folder.name_ar : folder.name) : "";
                            })()}
                          </Badge>
                        </>
                      )}
                      {attachment.is_analyzed && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 gap-1 bg-green-500/10 text-green-600">
                            <Sparkles className="w-3 h-3" />
                            {isArabic ? "تم التحليل" : "Analyzed"}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(attachment);
                      }}
                      title={isArabic ? "معاينة" : "Preview"}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!attachment.is_analyzed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeFile(attachment);
                        }}
                        disabled={analyzingFileId === attachment.id}
                        title={isArabic ? "تحليل AI" : "AI Analysis"}
                      >
                        {analyzingFileId === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(attachment);
                      }}
                      title={isArabic ? "تحميل" : "Download"}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(attachment)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {isArabic ? "معاينة" : "Preview"}
                        </DropdownMenuItem>
                        {!attachment.is_analyzed ? (
                          <DropdownMenuItem onClick={() => handleAnalyzeFile(attachment)}>
                            <Brain className="w-4 h-4 mr-2" />
                            {isArabic ? "تحليل AI" : "AI Analysis"}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleReAnalyze(attachment)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isArabic ? "إعادة التحليل" : "Re-Analyze"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownload(attachment)}>
                          <Download className="w-4 h-4 mr-2" />
                          {isArabic ? "تحميل" : "Download"}
                        </DropdownMenuItem>
                        
                        {/* Move to Folder */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderInput className="w-4 h-4 mr-2" />
                            {isArabic ? "نقل إلى مجلد" : "Move to Folder"}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem 
                                onClick={() => handleMoveToFolder(attachment, null)}
                                className={!attachment.folder_id ? "bg-muted" : ""}
                              >
                                {isArabic ? "بدون مجلد" : "No folder"}
                              </DropdownMenuItem>
                              {folders.map((folder) => (
                                <DropdownMenuItem 
                                  key={folder.id}
                                  onClick={() => handleMoveToFolder(attachment, folder.id)}
                                  className={attachment.folder_id === folder.id ? "bg-muted" : ""}
                                >
                                  <span 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: folder.color }} 
                                  />
                                  {isArabic && folder.name_ar ? folder.name_ar : folder.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(attachment)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isArabic ? "حذف" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {isArabic
                  ? `${attachments.length} ملف • ${attachments.filter(a => a.is_analyzed).length} تم تحليله`
                  : `${attachments.length} file(s) • ${attachments.filter(a => a.is_analyzed).length} analyzed`}
              </span>
              <span>
                {formatFileSize(
                  attachments.reduce((acc, f) => acc + (f.file_size || 0), 0)
                )}
              </span>
            </div>
          )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
        file={previewFile}
        onAnalyze={handleAnalyzeFile}
      />

      {/* Export Dialog */}
      <AnalysisExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        analyzedFiles={analyzedFiles}
      />

      {/* Comparison Dialog */}
      <FilesComparisonDialog
        isOpen={isCompareDialogOpen}
        onClose={() => setIsCompareDialogOpen(false)}
        analyzedFiles={analyzedFiles}
      />

      {/* Batch Analysis Dialog */}
      <BatchAnalysisDialog
        isOpen={isBatchDialogOpen}
        onClose={() => setIsBatchDialogOpen(false)}
        files={attachments}
        onComplete={fetchAttachments}
      />

      {/* Re-Analyze Dialog */}
      <ReAnalyzeDialog
        isOpen={isReAnalyzeDialogOpen}
        onClose={() => {
          setIsReAnalyzeDialogOpen(false);
          setSelectedFileForReAnalysis(null);
        }}
        file={selectedFileForReAnalysis}
        onComplete={fetchAttachments}
      />

      {/* Merged Analysis Report Dialog */}
      <MergedAnalysisReport
        isOpen={isMergeDialogOpen}
        onClose={() => setIsMergeDialogOpen(false)}
        analyzedFiles={analyzedFiles}
      />

      {/* Analysis Charts */}
      {analyzedFiles.length > 0 && (
        <div className="mt-6">
          <AnalysisCharts attachments={attachments} />
        </div>
      )}
    </>
  );
}
