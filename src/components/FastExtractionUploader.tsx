import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Image, FileSpreadsheet, File, X, CheckCircle2, Loader2, FolderUp } from "lucide-react";
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
  relativePath?: string;
}

interface FastExtractionUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  onUploadComplete: () => void;
}

// Accepted file extensions
const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.webp'];
// System files to exclude
const EXCLUDED_PATTERNS = ['.ds_store', 'thumbs.db', '__macosx', '.gitkeep', 'desktop.ini'];

const isAcceptedFileType = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  
  // Exclude system files
  if (EXCLUDED_PATTERNS.some(pattern => fileName.includes(pattern))) {
    return false;
  }
  
  // Check extension
  return ACCEPTED_EXTENSIONS.some(ext => fileName.endsWith(ext));
};

const getFileFromEntry = (entry: FileSystemFileEntry): Promise<File> => {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
};

const readDirectory = async (directory: FileSystemDirectoryEntry): Promise<File[]> => {
  const files: File[] = [];
  const reader = directory.createReader();
  
  const readEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  };
  
  let entries = await readEntries();
  while (entries.length > 0) {
    for (const entry of entries) {
      if (entry.isFile) {
        try {
          const file = await getFileFromEntry(entry as FileSystemFileEntry);
          if (isAcceptedFileType(file)) {
            files.push(file);
          }
        } catch (error) {
          console.error("Error reading file:", error);
        }
      } else if (entry.isDirectory) {
        // Read subdirectories recursively
        const subFiles = await readDirectory(entry as FileSystemDirectoryEntry);
        files.push(...subFiles);
      }
    }
    entries = await readEntries();
  }
  
  return files;
};

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
  const [isProcessingFolder, setIsProcessingFolder] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Filter accepted files
    const acceptedFiles = fileArray.filter(file => isAcceptedFileType(file));
    
    if (acceptedFiles.length === 0) {
      toast.error(
        isArabic 
          ? "لا توجد ملفات مدعومة" 
          : "No supported files found"
      );
      return;
    }

    const newUploadedFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
      progress: 0,
      relativePath: (file as any).webkitRelativePath || file.name,
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

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    setIsProcessingFolder(true);
    
    try {
      const fileArray = Array.from(inputFiles);
      const acceptedFiles = fileArray.filter(file => isAcceptedFileType(file));
      
      if (acceptedFiles.length === 0) {
        toast.error(
          isArabic 
            ? "لا توجد ملفات مدعومة في هذا المجلد" 
            : "No supported files found in this folder"
        );
        return;
      }

      toast.success(
        isArabic 
          ? `تم تحميل ${acceptedFiles.length} ملف من المجلد` 
          : `Loaded ${acceptedFiles.length} files from folder`
      );

      await handleFiles(acceptedFiles);
    } finally {
      setIsProcessingFolder(false);
      // Reset input to allow re-selecting the same folder
      if (folderInputRef.current) {
        folderInputRef.current.value = "";
      }
    }
  }, [handleFiles, isArabic]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
      return;
    }

    setIsProcessingFolder(true);
    const allFiles: File[] = [];
    
    try {
      // Process folders and files
      const promises: Promise<void>[] = [];
      
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            if (entry.isDirectory) {
              // Read folder contents
              promises.push(
                readDirectory(entry as FileSystemDirectoryEntry).then(folderFiles => {
                  allFiles.push(...folderFiles);
                })
              );
            } else {
              const file = item.getAsFile();
              if (file && isAcceptedFileType(file)) {
                allFiles.push(file);
              }
            }
          } else {
            // Fallback for browsers that don't support webkitGetAsEntry
            const file = item.getAsFile();
            if (file && isAcceptedFileType(file)) {
              allFiles.push(file);
            }
          }
        }
      }

      await Promise.all(promises);

      if (allFiles.length > 0) {
        const hasFolders = Array.from(items).some(item => {
          const entry = item.webkitGetAsEntry?.();
          return entry?.isDirectory;
        });

        if (hasFolders) {
          toast.success(
            isArabic 
              ? `تم تحميل ${allFiles.length} ملف من المجلد` 
              : `Loaded ${allFiles.length} files from folder`
          );
        }
        
        await handleFiles(allFiles);
      } else {
        toast.error(
          isArabic 
            ? "لا توجد ملفات مدعومة" 
            : "No supported files found"
        );
      }
    } catch (error) {
      console.error("Error processing dropped items:", error);
      toast.error(
        isArabic 
          ? "حدث خطأ أثناء معالجة الملفات" 
          : "Error processing files"
      );
    } finally {
      setIsProcessingFolder(false);
    }
  }, [handleFiles, isArabic]);

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
      {/* Hidden folder input */}
      <input
        type="file"
        ref={folderInputRef}
        // @ts-ignore - webkitdirectory is a non-standard attribute
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

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
            {isProcessingFolder ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <p className="text-lg font-medium">
              {isArabic ? "اسحب وأفلت الملفات أو المجلدات هنا" : "Drag and drop files or folders here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic ? "أو انقر لاختيار الملفات أو المجلدات" : "or click to select files or folders"}
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
          
          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFolder}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isArabic ? "اختر الملفات" : "Select Files"}
            </Button>
            <Button 
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessingFolder}
            >
              {isProcessingFolder ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderUp className="h-4 w-4 mr-2" />
              )}
              {isArabic ? "اختر مجلد" : "Select Folder"}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {isArabic ? "الحد الأقصى: 500 ميجا لكل ملف" : "Max size: 500MB per file"}
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
                    {file.relativePath && file.relativePath !== file.name && (
                      <span className="ml-2 text-primary/60">
                        ({file.relativePath.split('/').slice(0, -1).join('/')})
                      </span>
                    )}
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
