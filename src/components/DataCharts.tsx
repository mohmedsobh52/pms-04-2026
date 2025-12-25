import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { BarChart3, PieChartIcon, TrendingUp, Sparkles, Loader2, Brain, AreaChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  notes?: string;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface DataChartsProps {
  items: BOQItem[];
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
  wbsData?: WBSItem[];
}

interface AIInsight {
  title: string;
  description: string;
  type: "info" | "warning" | "success";
  recommendation?: string;
}

const CHART_COLORS = [
  "hsl(16, 85%, 57%)",
  "hsl(260, 60%, 55%)",
  "hsl(145, 65%, 42%)",
  "hsl(210, 85%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(180, 70%, 45%)",
  "hsl(330, 70%, 55%)",
  "hsl(280, 70%, 60%)",
];

export function DataCharts({ items, summary, wbsData }: DataChartsProps) {
  const [activeChart, setActiveChart] = useState<"pie" | "bar" | "line" | "area">("pie");
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const { toast } = useToast();
  const { language, isArabic } = useLanguage();

  const t = {
    title: isArabic ? "الإحصائيات والرسوم البيانية" : "Statistics & Charts",
    subtitle: isArabic ? "تحليل مرئي للبيانات" : "Visual data analysis",
    analyzeBtn: isArabic ? "تحليل بـ Gemini" : "Analyze with Gemini",
    pieChart: isArabic ? "دائري" : "Pie",
    barChart: isArabic ? "أعمدة" : "Bar",
    lineChart: isArabic ? "خطي" : "Line",
    areaChart: isArabic ? "مساحي" : "Area",
    categoryDist: isArabic ? "توزيع الفئات" : "Category Distribution",
    valueByCategory: isArabic ? "القيم حسب الفئة" : "Values by Category",
    categories: isArabic ? "فئات" : "Categories",
    itemsLabel: isArabic ? "عناصر" : "Items",
    totalValue: isArabic ? "إجمالي القيمة" : "Total Value",
    largestCategory: isArabic ? "أكبر فئة" : "Largest Category",
    aiInsights: isArabic ? "تحليلات Gemini الذكية" : "Gemini AI Insights",
    analysisSuccess: isArabic ? "تم التحليل الذكي" : "Analysis Complete",
    insightsExtracted: isArabic ? "تم استخراج رؤى من البيانات" : "Insights extracted from data",
    analysisError: isArabic ? "خطأ في التحليل الذكي" : "Analysis Error",
    errorMsg: isArabic ? "تعذر الحصول على تحليلات Gemini" : "Failed to get Gemini analysis",
    uncategorized: isArabic ? "غير مصنف" : "Uncategorized",
    item: isArabic ? "بند" : "Item",
    count: isArabic ? "العدد" : "Count",
    value: isArabic ? "القيمة" : "Value",
  };

  // Prepare data for charts
  const categoryData = items.reduce((acc, item) => {
    const category = item.category || t.uncategorized;
    if (!acc[category]) {
      acc[category] = { name: category, count: 0, value: 0 };
    }
    acc[category].count += 1;
    acc[category].value += item.total_price || 0;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number }>);

  const pieData = Object.values(categoryData).map((cat, idx) => ({
    ...cat,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const barData = Object.values(categoryData).map((cat) => ({
    name: cat.name.length > 12 ? cat.name.slice(0, 12) + "..." : cat.name,
    fullName: cat.name,
    count: cat.count,
    value: cat.value,
  }));

  // Top items by value for line/area charts
  const topItemsData = items
    .filter(item => item.total_price && item.total_price > 0)
    .sort((a, b) => (b.total_price || 0) - (a.total_price || 0))
    .slice(0, 10)
    .map((item, idx) => ({
      name: `${t.item} ${idx + 1}`,
      value: item.total_price || 0,
      description: item.description.slice(0, 30),
    }));

  const fetchAIInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-charts", {
        body: { 
          items, 
          summary,
          wbsData,
          categoryData: Object.values(categoryData),
          language,
        },
      });

      if (error) throw error;
      
      if (data.insights) {
        setAiInsights(data.insights);
        toast({
          title: t.analysisSuccess,
          description: `${t.insightsExtracted} (${data.insights.length})`,
        });
      }
    } catch (error) {
      console.error("AI insights error:", error);
      toast({
        title: t.analysisError,
        description: t.errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const chartTabs = [
    { id: "pie", label: t.pieChart, icon: <PieChartIcon className="w-4 h-4" /> },
    { id: "bar", label: t.barChart, icon: <BarChart3 className="w-4 h-4" /> },
    { id: "line", label: t.lineChart, icon: <TrendingUp className="w-4 h-4" /> },
    { id: "area", label: t.areaChart, icon: <AreaChartIcon className="w-4 h-4" /> },
  ] as const;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <p className="font-semibold text-sm text-foreground mb-2">{data.fullName || data.name || label}</p>
          {data.count !== undefined && (
            <p className="text-sm text-muted-foreground flex justify-between gap-4">
              <span>{t.count}:</span>
              <span className="text-foreground font-medium">{data.count}</span>
            </p>
          )}
          {data.value !== undefined && data.value > 0 && (
            <p className="text-sm text-muted-foreground flex justify-between gap-4">
              <span>{t.value}:</span>
              <span className="text-primary font-bold">{data.value.toLocaleString(isArabic ? 'ar-SA' : 'en-US')}</span>
            </p>
          )}
          {data.description && (
            <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{data.description}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card overflow-hidden animate-slide-up" dir={isArabic ? "rtl" : "ltr"}>
      <div className="border-b border-border p-5 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          
          <Button
            onClick={fetchAIInsights}
            disabled={isLoadingInsights}
            className="gap-2 btn-gradient shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {isLoadingInsights ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Brain className="w-5 h-5" />
            )}
            {t.analyzeBtn}
          </Button>
        </div>

        <div className="flex gap-2 mt-5 flex-wrap">
          {chartTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                activeChart === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl p-5 min-h-[450px] border border-border/50 shadow-sm">
            <h4 className="font-semibold mb-4 text-center text-lg">{t.categoryDist}</h4>
            <ResponsiveContainer width="100%" height={280}>
              {activeChart === "pie" ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    animationBegin={0}
                    animationDuration={800}
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : activeChart === "bar" ? (
                <BarChart data={barData} layout="vertical">
                  <defs>
                    <linearGradient id="barGradient1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(16, 85%, 57%)" />
                      <stop offset="100%" stopColor="hsl(28, 90%, 60%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={90}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="url(#barGradient1)" 
                    radius={[0, 8, 8, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              ) : activeChart === "line" ? (
                <LineChart data={topItemsData}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(16, 85%, 57%)" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="hsl(16, 85%, 57%)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(16, 85%, 57%)" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(16, 85%, 57%)", r: 5, strokeWidth: 2, stroke: "white" }}
                    activeDot={{ r: 8, stroke: "hsl(16, 85%, 57%)", strokeWidth: 2, fill: "white" }}
                    animationDuration={800}
                  />
                </LineChart>
              ) : (
                <AreaChart data={topItemsData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(16, 85%, 57%)" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="hsl(16, 85%, 57%)" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(16, 85%, 57%)" 
                    fill="url(#areaGradient)"
                    strokeWidth={3}
                    animationDuration={800}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            {activeChart === "pie" && (
              <div className="mt-4 max-h-[120px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {pieData.slice(0, 8).map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="truncate text-muted-foreground" title={entry.name}>
                        {entry.name.length > 18 ? entry.name.slice(0, 18) + "..." : entry.name}
                      </span>
                      <span className="text-foreground font-medium ms-auto">({entry.count})</span>
                    </div>
                  ))}
                  {pieData.length > 8 && (
                    <div className="col-span-2 text-center text-xs text-muted-foreground">
                      +{pieData.length - 8} {isArabic ? "فئات أخرى" : "more categories"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl p-5 min-h-[450px] border border-border/50 shadow-sm">
            <h4 className="font-semibold mb-5 text-center text-lg">{t.valueByCategory}</h4>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData}>
                <defs>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(260, 60%, 55%)" />
                    <stop offset="100%" stopColor="hsl(280, 70%, 60%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="url(#barGradient2)" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
            <p className="text-3xl font-bold text-primary">{pieData.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.categories}</p>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/20">
            <p className="text-3xl font-bold text-accent">{items.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.itemsLabel}</p>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-success/15 to-success/5 border border-success/20 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-success/20">
            <p className="text-3xl font-bold text-success">
              {summary?.total_value?.toLocaleString(isArabic ? 'ar-SA' : 'en-US') || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{t.totalValue}</p>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-warning/15 to-warning/5 border border-warning/20 text-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-warning/20">
            <p className="text-3xl font-bold text-warning">
              {Math.max(...Object.values(categoryData).map(c => c.count), 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{t.largestCategory}</p>
          </div>
        </div>

        {/* AI Insights */}
        {aiInsights.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-display font-bold text-lg">{t.aiInsights}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all hover:scale-[1.02]",
                    insight.type === "success" && "bg-success/5 border-success/30 hover:shadow-lg hover:shadow-success/10",
                    insight.type === "warning" && "bg-warning/5 border-warning/30 hover:shadow-lg hover:shadow-warning/10",
                    insight.type === "info" && "bg-primary/5 border-primary/30 hover:shadow-lg hover:shadow-primary/10"
                  )}
                >
                  <h5 className="font-semibold mb-2 text-foreground">{insight.title}</h5>
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                  {insight.recommendation && (
                    <p className="text-sm mt-3 font-medium text-primary flex items-center gap-2">
                      <span className="text-lg">💡</span> {insight.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
