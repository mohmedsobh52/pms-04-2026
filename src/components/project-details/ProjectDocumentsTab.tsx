import { useRef } from "react";
import { Upload, File, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectAttachment } from "./types";

interface ProjectDocumentsTabProps {
  attachments: ProjectAttachment[];
  isUploading: boolean;
  isArabic: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (attachment: ProjectAttachment) => void;
  onDelete: (attachment: ProjectAttachment) => void;
  formatFileSize: (bytes: number | null) => string;
  formatDate: (dateString: string) => string;
}

export function ProjectDocumentsTab({
  attachments,
  isUploading,
  isArabic,
  onFileUpload,
  onDownload,
  onDelete,
  formatFileSize,
  formatDate,
}: ProjectDocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string | null) => {
    return <File className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            {isArabic ? "مستندات المشروع" : "Project Documents"}
          </CardTitle>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileUpload}
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isArabic ? "رفع ملف" : "Upload File"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? "لا توجد مستندات مرفقة" : "No documents attached"}</p>
            <p className="text-sm mt-1">
              {isArabic 
                ? "قم برفع مستندات المشروع مثل المخططات والعقود" 
                : "Upload project documents like drawings and contracts"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isArabic ? "اسم الملف" : "File Name"}</TableHead>
                <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                <TableHead>{isArabic ? "الحجم" : "Size"}</TableHead>
                <TableHead>{isArabic ? "تاريخ الرفع" : "Upload Date"}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((attachment) => (
                <TableRow key={attachment.id}>
                  <TableCell className="flex items-center gap-2">
                    {getFileIcon(attachment.file_type)}
                    <span className="truncate max-w-[300px]">{attachment.file_name}</span>
                  </TableCell>
                  <TableCell>{attachment.file_type?.split('/').pop() || '-'}</TableCell>
                  <TableCell>{formatFileSize(attachment.file_size)}</TableCell>
                  <TableCell>{formatDate(attachment.uploaded_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => onDownload(attachment)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(attachment)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
