import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, Package, Percent } from "lucide-react";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
  created_at: string;
  updated_at: string;
}

interface TenderPricing {
  project_id: string;
  contract_value?: number;
  total_direct_costs?: number;
  total_indirect_costs?: number;
  profit_margin?: number;
}

interface ProjectSummaryTabProps {
  projects: Project[];
  tenderData?: TenderPricing[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ProjectSummaryTab = React.forwardRef<HTMLDivElement, ProjectSummaryTabProps>(
  ({ projects, tenderData = [] }, ref) => {
    const { isArabic } = useLanguage();
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const analysisData = selectedProject?.analysis_data;
    const items = analysisData?.items || [];
    const summary = analysisData?.summary || {};
    const tender = tenderData.find(t => t.project_id === selectedProjectId);

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US').format(value);
    };

    // Group items by category for charts
    const categoryData = items.reduce((acc: any[], item: any) => {
      const category = item.category || (isArabic ? "غير مصنف" : "Uncategorized");
      const existing = acc.find(c => c.name === category);
      const value = parseFloat(item.total_price) || (parseFloat(item.quantity) * parseFloat(item.unit_price)) || 0;
      
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ name: category, value });
      }
      return acc;
    }, []);

    // Top 10 items by value
    const topItems = [...items]
      .sort((a: any, b: any) => (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0))
      .slice(0, 10)
      .map((item: any, idx: number) => ({
        name: `${idx + 1}. ${(item.description || '').substring(0, 20)}...`,
        value: parseFloat(item.total_price) || 0,
      }));

    const financialSummary = [
      {
        label: isArabic ? "التكاليف المباشرة" : "Direct Costs",
        value: tender?.total_direct_costs || summary.total_value || 0,
        icon: Package,
        color: "text-blue-600",
        bgColor: "bg-blue-500/10",
      },
      {
        label: isArabic ? "التكاليف غير المباشرة" : "Indirect Costs",
        value: tender?.total_indirect_costs || 0,
        icon: TrendingUp,
        color: "text-orange-600",
        bgColor: "bg-orange-500/10",
      },
      {
        label: isArabic ? "هامش الربح" : "Profit Margin",
        value: tender?.profit_margin || 0,
        icon: Percent,
        color: "text-green-600",
        bgColor: "bg-green-500/10",
        isPercentage: true,
      },
      {
        label: isArabic ? "القيمة النهائية" : "Final Value",
        value: tender?.contract_value || summary.total_value || 0,
        icon: DollarSign,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
    ];

    const basicStats = [
      {
        label: isArabic ? "إجمالي البنود" : "Total Items",
        value: items.length,
      },
      {
        label: isArabic ? "إجمالي القيمة" : "Total Value",
        value: formatCurrency(summary.total_value || 0),
      },
      {
        label: isArabic ? "العملة" : "Currency",
        value: summary.currency || "SAR",
      },
      {
        label: isArabic ? "عدد الأقسام" : "Categories",
        value: categoryData.length,
      },
    ];

    return (
      <div ref={ref} className="space-y-6">
        {/* Project Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">
                {isArabic ? "اختر المشروع:" : "Select Project:"}
              </label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={isArabic ? "اختر المشروع" : "Choose Project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedProject ? (
          <>
            {/* Financial Summary Cards */}
            {tender && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {financialSummary.map((stat, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold">
                            {stat.isPercentage 
                              ? `${stat.value}%` 
                              : formatCurrency(stat.value)
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {basicStats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "توزيع القيمة حسب القسم" : "Value Distribution by Category"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد بيانات" : "No data available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart - Category Percentages */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "نسب الأقسام" : "Category Percentages"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد بيانات" : "No data available"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Items Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    {isArabic ? "أعلى 10 بنود قيمة" : "Top 10 Items by Value"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topItems} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 9 }} 
                          width={150}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {isArabic ? "لا توجد بيانات" : "No data available"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isArabic ? "معلومات المشروع" : "Project Information"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{isArabic ? "اسم المشروع" : "Project Name"}</p>
                    <p className="font-medium">{selectedProject.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isArabic ? "اسم الملف" : "File Name"}</p>
                    <p className="font-medium">{selectedProject.file_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isArabic ? "تاريخ الإنشاء" : "Created At"}</p>
                    <p className="font-medium">
                      {new Date(selectedProject.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{isArabic ? "آخر تحديث" : "Last Updated"}</p>
                    <p className="font-medium">
                      {new Date(selectedProject.updated_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {isArabic ? "الرجاء اختيار مشروع لعرض الملخص" : "Please select a project to view summary"}
          </div>
        )}
      </div>
    );
  }
);

ProjectSummaryTab.displayName = "ProjectSummaryTab";
