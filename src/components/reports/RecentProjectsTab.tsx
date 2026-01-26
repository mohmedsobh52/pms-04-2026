import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { Eye, Download, Trash2, FolderOpen, Calendar, FileSpreadsheet, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PROJECT_STATUSES } from "@/lib/project-constants";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
  status?: string;
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

  const getStatusInfo = (status?: string) => {
    const statusObj = PROJECT_STATUSES.find(s => s.value === (status || 'draft'));
    return statusObj || PROJECT_STATUSES[0];
  };

  const getPricingProgress = (items: any[]) => {
    if (!items || items.length === 0) return 0;
    const pricedItems = items.filter((item: any) => 
      item.unit_price && parseFloat(item.unit_price) > 0
    ).length;
    return Math.round((pricedItems / items.length) * 100);
  };

  const handleViewProject = (project: Project) => {
    // Navigate to project details page
    navigate(`/projects/${project.id}`);
  };

  const handleDeleteProject = (id: string) => {
    if (onDeleteProject) {
      onDeleteProject(id);
      toast.success(isArabic ? "تم حذف المشروع" : "Project deleted");
    }
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate('/new-project')}
        >
          {isArabic ? "إنشاء مشروع جديد" : "Create New Project"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const summary = project.analysis_data?.summary || {};
        const items = project.analysis_data?.items || [];
        const itemsCount = items.length;
        const totalValue = summary.total_value || 0;
        const statusInfo = getStatusInfo(project.status);
        const pricingProgress = getPricingProgress(items);

        return (
          <Card key={project.id} className="border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${statusInfo.color}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dotColor}`} />
                      {isArabic ? statusInfo.label : statusInfo.label_en}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
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

                  {/* Pricing Progress */}
                  {itemsCount > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {isArabic ? "نسبة التسعير:" : "Pricing:"}
                      </span>
                      <Progress value={pricingProgress} className="h-2 flex-1 max-w-40" />
                      <span className="text-xs font-medium">{pricingProgress}%</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewProject(project)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {isArabic ? "فتح" : "Open"}
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