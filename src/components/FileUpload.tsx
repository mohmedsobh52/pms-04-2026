import { useState, useCallback } from "react";
import { Upload, FileText, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  selectedFile: File | null;
  onClear: () => void;
  acceptedTypes?: string[];
}

const ACCEPTED_TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
};

function getFileIcon(file: File) {
  const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || 
                  file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  return isExcel ? FileSpreadsheet : FileText;
}

function isAcceptedFile(file: File): boolean {
  const acceptedMimes = Object.values(ACCEPTED_TYPES);
  const acceptedExtensions = ['.pdf', '.xlsx', '.xls'];
  
  return acceptedMimes.includes(file.type) || 
         acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

export function FileUpload({ onFileSelect, isProcessing, selectedFile, onClear }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const FileIcon = selectedFile ? getFileIcon(selectedFile) : FileText;

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && isAcceptedFile(files[0])) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  if (selectedFile) {
    return (
      <div className="glass-card p-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {isProcessing ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <FileIcon className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClear}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
        {isProcessing && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent animate-shimmer bg-[length:200%_100%]" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('extractingText')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "upload-zone text-center",
        isDragOver && "dragover"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".pdf,.xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer block">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground mb-2">
          {t('uploadBOQ')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('dragDropText')}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
            <FileText className="w-4 h-4" />
            PDF
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </span>
        </div>
      </label>
    </div>
  );
}
