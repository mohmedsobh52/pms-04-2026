import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { Eye, Download, Trash2, FolderOpen, Calendar, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
  created_at: string;
  updated_at: string;
}

interface RecentProjectsTabProps {
  projects: Project[];
  onDeleteProject?: (id: string) => void;
}

export const RecentProjectsTab = ({ projects, onDeleteProject }: RecentProjectsTabProps) => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US').format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewProject = (project: Project) => {
    // Store project data and navigate to analysis page
    localStorage.setItem('analysisData', JSON.stringify(project.analysis_data));
    navigate('/');
    toast.success(isArabic ? "تم تحميل المشروع" : "Project loaded");
  };

  const handleDeleteProject = (id: string) => {
    if (onDeleteProject) {
      onDeleteProject(id);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const summary = project.analysis_data?.summary || {};
        const itemsCount = project.analysis_data?.items?.length || 0;
        const totalValue = summary.total_value || 0;

        return (
          <Card key={project.id} className="border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {isArabic ? "مسودة" : "Draft"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="truncate">{project.file_name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {isArabic ? "البنود:" : "Items:"}
                      </span>
                      <span className="font-medium ml-1">{itemsCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {isArabic ? "القيمة:" : "Value:"}
                      </span>
                      <span className="font-medium ml-1">
                        {formatCurrency(totalValue)} {summary.currency || "SAR"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(project.updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProject(project)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {isArabic ? "عرض" : "View"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info(isArabic ? "جاري التصدير..." : "Exporting...");
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
