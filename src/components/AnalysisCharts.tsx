import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Maximize2
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface ProjectAttachment {
  id: string;
  file_name: string;
  category: string | null;
  is_analyzed: boolean | null;
  analysis_result: any;
}

interface AnalysisChartsProps {
  attachments: ProjectAttachment[];
}

const COLORS = ['#667eea', '#764ba2', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#eab308', '#06b6d4'];

export function AnalysisCharts({ attachments }: AnalysisChartsProps) {
  const { isArabic } = useLanguage();
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const analyzedFiles = attachments.filter(a => a.is_analyzed);

  // Calculate chart data
  const chartData = useMemo(() => {
    // Category distribution
    const categoryCount: Record<string, number> = {};
    const categoryValue: Record<string, number> = {};
    
    // Items by category
    const allItems: any[] = [];
    
    analyzedFiles.forEach(file => {
      const cat = file.category || 'general';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;

      if (file.analysis_result?.items) {
        file.analysis_result.items.forEach((item: any) => {
          allItems.push({
            ...item,
            source: file.file_name,
            sourceCategory: cat
          });
          const itemCat = item.category || cat;
          categoryValue[itemCat] = (categoryValue[itemCat] || 0) + (parseFloat(item.total_price) || 0);
        });
      }
    });

    // File distribution
    const fileDistribution = Object.entries(categoryCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: COLORS[Object.keys(categoryCount).indexOf(name) % COLORS.length]
    }));

    // Value by category
    const valueByCategory = Object.entries(categoryValue)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Top items by value
    const topItems = allItems
      .filter(item => item.total_price)
      .sort((a, b) => (parseFloat(b.total_price) || 0) - (parseFloat(a.total_price) || 0))
      .slice(0, 10)
      .map(item => ({
        name: (item.description || 'Unknown').substring(0, 20),
        value: parseFloat(item.total_price) || 0,
        quantity: item.quantity || 0
      }));

    // Analysis status
    const analysisStatus = [
      { name: isArabic ? 'محلل' : 'Analyzed', value: analyzedFiles.length, fill: '#22c55e' },
      { name: isArabic ? 'غير محلل' : 'Not Analyzed', value: attachments.length - analyzedFiles.length, fill: '#f97316' }
    ];

    // Radar data for categories
    const radarData = Object.entries(categoryValue).slice(0, 6).map(([name, value]) => ({
      category: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value / 1000) // in thousands
    }));

    return {
      fileDistribution,
      valueByCategory,
      topItems,
      analysisStatus,
      radarData,
      totalValue: Object.values(categoryValue).reduce((a, b) => a + b, 0),
      totalItems: allItems.length
    };
  }, [attachments, analyzedFiles, isArabic]);

  const renderChart = (chartType: string, fullSize = false) => {
    const height = fullSize ? 400 : 250;

    switch (chartType) {
      case 'fileDistribution':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData.fileDistribution}
                cx="50%"
                cy="50%"
                innerRadius={fullSize ? 80 : 50}
                outerRadius={fullSize ? 120 : 80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.fileDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'valueByCategory':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData.valueByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Bar dataKey="value" fill="#667eea" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'topItems':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData.topItems}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Bar dataKey="value" fill="#764ba2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'analysisStatus':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData.analysisStatus}
                cx="50%"
                cy="50%"
                innerRadius={fullSize ? 60 : 40}
                outerRadius={fullSize ? 100 : 70}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.analysisStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={chartData.radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis />
              <Radar
                name={isArabic ? "القيمة (ألف)" : "Value (K)"}
                dataKey="value"
                stroke="#667eea"
                fill="#667eea"
                fillOpacity={0.5}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData.valueByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#667eea" 
                fill="url(#colorGradient)" 
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (analyzedFiles.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isArabic 
              ? "لا توجد ملفات محللة لعرض الرسوم البيانية"
              : "No analyzed files to display charts"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-primary">{analyzedFiles.length}</div>
            <div className="text-sm text-muted-foreground">
              {isArabic ? "ملفات محللة" : "Analyzed Files"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{chartData.totalItems}</div>
            <div className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي البنود" : "Total Items"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {chartData.valueByCategory.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {isArabic ? "الفئات" : "Categories"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(chartData.totalValue / 1000000).toFixed(2)}M
            </div>
            <div className="text-sm text-muted-foreground">
              {isArabic ? "القيمة الإجمالية" : "Total Value"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* File Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                {isArabic ? "توزيع الملفات" : "File Distribution"}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setExpandedChart('fileDistribution')}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart('fileDistribution')}
          </CardContent>
        </Card>

        {/* Value by Category */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {isArabic ? "القيمة حسب الفئة" : "Value by Category"}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setExpandedChart('valueByCategory')}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart('valueByCategory')}
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {isArabic ? "أعلى البنود قيمة" : "Top Items by Value"}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setExpandedChart('topItems')}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart('topItems')}
          </CardContent>
        </Card>

        {/* Analysis Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                {isArabic ? "حالة التحليل" : "Analysis Status"}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setExpandedChart('analysisStatus')}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderChart('analysisStatus')}
          </CardContent>
        </Card>
      </div>

      {/* Expanded Chart Dialog */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {expandedChart === 'fileDistribution' && (isArabic ? 'توزيع الملفات' : 'File Distribution')}
              {expandedChart === 'valueByCategory' && (isArabic ? 'القيمة حسب الفئة' : 'Value by Category')}
              {expandedChart === 'topItems' && (isArabic ? 'أعلى البنود قيمة' : 'Top Items by Value')}
              {expandedChart === 'analysisStatus' && (isArabic ? 'حالة التحليل' : 'Analysis Status')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {expandedChart && renderChart(expandedChart, true)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
