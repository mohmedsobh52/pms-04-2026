import { PageLayout } from "@/components/PageLayout";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip, FolderOpen } from "lucide-react";

const AttachmentsPage = () => {
  const { isArabic } = useLanguage();
  
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8" dir={isArabic ? "rtl" : "ltr"}>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Paperclip className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {isArabic ? "مرفقات المشروع" : "Project Attachments"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isArabic 
                  ? "رفع وإدارة جميع ملفات ومستندات المشروع"
                  : "Upload and manage all project files and documents"
                }
              </p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {isArabic ? "إدارة الملفات" : "File Management"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ProjectAttachments />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default AttachmentsPage;
