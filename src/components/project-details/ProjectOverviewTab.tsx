import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PricingDistributionChart,
  CategoryDistributionChart,
  TopItemsChart,
} from "@/components/charts/ChartJsCharts";
import { PricingAccuracyDashboard } from "@/components/PricingAccuracyDashboard";
import { ProjectData, PricingStats } from "./types";

interface ProjectOverviewTabProps {
  project: ProjectData;
  pricingStats: PricingStats;
  pricingDistributionData: { name: string; value: number; color: string }[];
  categoryDistribution: { name: string; value: number }[];
  topValueItems: { name: string; value: number }[];
  isArabic: boolean;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
  projectId: string;
}

export function ProjectOverviewTab({
  project,
  pricingStats,
  pricingDistributionData,
  categoryDistribution,
  topValueItems,
  isArabic,
  formatCurrency,
  formatDate,
  projectId,
}: ProjectOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "توزيع التسعير" : "Pricing Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PricingDistributionChart data={pricingDistributionData} isArabic={isArabic} />
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "التصنيفات" : "Categories"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDistributionChart 
              data={categoryDistribution} 
              isArabic={isArabic}
            />
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "أعلى البنود قيمة" : "Top Value Items"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopItemsChart data={topValueItems} isArabic={isArabic} formatCurrency={formatCurrency} />
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              {isArabic ? "تفاصيل المشروع" : "Project Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                {isArabic ? "تاريخ الإنشاء" : "Created"}
              </span>
              <span className="font-medium">{formatDate(project.created_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                {isArabic ? "آخر تحديث" : "Last Updated"}
              </span>
              <span className="font-medium">{formatDate(project.updated_at)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                {isArabic ? "العملة" : "Currency"}
              </span>
              <span className="font-medium">{project.currency || 'SAR'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">
                {isArabic ? "الملف المصدر" : "Source File"}
              </span>
              <span className="font-medium truncate max-w-[200px]">
                {project.file_name || (isArabic ? "غير متوفر" : "N/A")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">
              {isArabic ? "ملخص التسعير" : "Pricing Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isArabic ? "التقدم" : "Progress"}</span>
                <span className="font-bold">{pricingStats.pricingPercentage}%</span>
              </div>
              <Progress value={pricingStats.pricingPercentage} className="h-2" />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                {isArabic ? "بنود مسعرة" : "Priced Items"}
              </span>
              <span className="font-medium text-green-600">{pricingStats.pricedItems}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">
                {isArabic ? "بنود غير مسعرة" : "Unpriced Items"}
              </span>
              <span className="font-medium text-amber-600">{pricingStats.unpricedItems}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">
                {isArabic ? "إجمالي القيمة" : "Total Value"}
              </span>
              <span className="font-bold text-lg text-green-600">
                {project.currency || 'SAR'} {formatCurrency(pricingStats.totalValue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Accuracy Dashboard */}
      <PricingAccuracyDashboard projectId={projectId} />
    </div>
  );
}
