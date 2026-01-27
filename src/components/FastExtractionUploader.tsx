import { useState, useCallback } from "react";
import { Upload, FileText, Image, FileSpreadsheet, File, X, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "success" | "error";
  progress: number;
  storagePath?: string;
  category?: string;
}

interface FastExtractionUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  onUploadComplete: () => void;
}

const getFileIcon = (type: string) => {
  if (type.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
  if (type.includes("image")) return <Image className="h-8 w-8 text-blue-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) 
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function FastExtractionUploader({ files, onFilesChange, onUploadComplete }: FastExtractionUploaderProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const [isDragging, setIsDragging] = useState(false);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  const uploadFile = async (file: File, tempId: string) => {
    try {
      // Check file size before upload
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        throw new Error(
          isArabic 
            ? `حجم الملف (${sizeMB} ميجا) يتجاوز الحد الأقصى المسموح (500 ميجا)`
            : `File size (${sizeMB}MB) exceeds maximum allowed size (500MB)`
        );
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(isArabic ? "يجب تسجيل الدخول أولاً" : "Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // Handle specific storage errors
        if (uploadError.message?.includes("exceeded the maximum allowed size")) {
          throw new Error(
            isArabic 
              ? "حجم الملف يتجاوز الحد الأقصى المسموح"
              : "File size exceeds maximum allowed size"
          );
        }
        throw uploadError;
      }

      return fileName;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const newUploadedFiles: UploadedFile[] = fileArray.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
      progress: 0,
    }));

    const allFiles = [...files, ...newUploadedFiles];
    onFilesChange(allFiles);

    // Upload files
    for (const uploadedFile of newUploadedFiles) {
      try {
        // Simulate progress
        for (let i = 0; i <= 80; i += 20) {
          await new Promise((r) => setTimeout(r, 100));
          onFilesChange((currentFiles) =>
            currentFiles.map((f) => (f.id === uploadedFile.id ? { ...f, progress: i } : f))
          );
        }

        const storagePath = await uploadFile(uploadedFile.file, uploadedFile.id);

        onFilesChange((currentFiles) =>
          currentFiles.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: "success" as const, progress: 100, storagePath }
              : f
          )
        );
      } catch (error) {
        onFilesChange((currentFiles) =>
          currentFiles.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "error" as const, progress: 0 } : f
          )
        );
        toast.error(isArabic ? `فشل رفع ${uploadedFile.name}` : `Failed to upload ${uploadedFile.name}`);
      }
    }
  }, [files, onFilesChange, isArabic]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 transition-all text-center",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50"
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">
              {isArabic ? "اسحب وأفلت الملفات هنا" : "Drag and drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic ? "أو انقر لاختيار الملفات" : "or click to select files"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-red-500" /> PDF
            </span>
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-4 w-4 text-green-500" /> Excel/CSV
            </span>
            <span className="flex items-center gap-1">
              <Image className="h-4 w-4 text-blue-500" /> Images
            </span>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            style={{ position: "relative" }}
          />
          <Button variant="outline" className="relative">
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {isArabic ? "اختر الملفات" : "Select Files"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isArabic ? "الحد الأقصى: 500 ميجا" : "Max size: 500MB"}
          </p>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {isArabic ? "الملفات المرفوعة" : "Uploaded Files"} ({successCount}/{files.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {file.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === "error" && (
                    <span className="text-xs text-destructive">
                      {isArabic ? "فشل" : "Failed"}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
