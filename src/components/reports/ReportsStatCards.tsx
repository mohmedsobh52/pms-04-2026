import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, DollarSign, CheckCircle, Clock, TrendingUp, FileText } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface ReportsStatCardsProps {
  totalProjects: number;
  inProgressProjects: number;
  totalBOQValue: number;
  completedProjects: number;
  draftProjects: number;
  pendingProjects: number;
}

export const ReportsStatCards = ({
  totalProjects,
  inProgressProjects,
  totalBOQValue,
  completedProjects,
  draftProjects,
  pendingProjects,
}: ReportsStatCardsProps) => {
  const { isArabic } = useLanguage();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US').format(value);
  };

  const stats = [
    {
      title: isArabic ? "إجمالي المشاريع" : "Total Projects",
      value: totalProjects,
      subtitle: isArabic 
        ? `${inProgressProjects} قيد التنفيذ` 
        : `${inProgressProjects} In Progress`,
      icon: FolderOpen,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: isArabic ? "إجمالي قيمة BOQ" : "Total BOQ Value",
      value: formatCurrency(totalBOQValue),
      subtitle: isArabic ? "جميع المشاريع" : "All Projects",
      icon: DollarSign,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
    },
    {
      title: isArabic ? "مشاريع مكتملة" : "Completed Projects",
      value: completedProjects,
      subtitle: isArabic 
        ? `${draftProjects} مسودة` 
        : `${draftProjects} Draft`,
      icon: CheckCircle,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: isArabic ? "مشاريع معلقة" : "Pending Projects",
      value: pendingProjects,
      subtitle: isArabic ? "تحتاج متابعة" : "Need Follow-up",
      icon: Clock,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border-border hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};