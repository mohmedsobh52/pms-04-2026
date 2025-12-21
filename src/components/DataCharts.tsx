import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { BarChart3, PieChartIcon, TrendingUp, Sparkles, Loader2, Brain, AreaChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface DataChartsProps {
  items: BOQItem[];
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
}

interface AIInsight {
  title: string;
  description: string;
  type: "info" | "warning" | "success";
  recommendation?: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(210, 80%, 60%)",
  "hsl(280, 70%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(180, 70%, 50%)",
  "hsl(330, 70%, 55%)",
];

export function DataCharts({ items, summary }: DataChartsProps) {
  const [activeChart, setActiveChart] = useState<"pie" | "bar" | "line" | "area">("pie");
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const { toast } = useToast();

  // Prepare data for charts
  const categoryData = items.reduce((acc, item) => {
    const category = item.category || "غير مصنف";
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
    name: cat.name.length > 15 ? cat.name.slice(0, 15) + "..." : cat.name,
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
      name: `بند ${idx + 1}`,
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
          categoryData: Object.values(categoryData),
        },
      });

      if (error) throw error;
      
      if (data.insights) {
        setAiInsights(data.insights);
        toast({
          title: "تم التحليل الذكي",
          description: `تم استخراج ${data.insights.length} رؤى من البيانات`,
        });
      }
    } catch (error) {
      console.error("AI insights error:", error);
      toast({
        title: "خطأ في التحليل الذكي",
        description: "تعذر الحصول على تحليلات Gemini",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const chartTabs = [
    { id: "pie", label: "دائري", icon: <PieChartIcon className="w-4 h-4" /> },
    { id: "bar", label: "أعمدة", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "line", label: "خطي", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "area", label: "مساحي", icon: <AreaChartIcon className="w-4 h-4" /> },
  ] as const;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{payload[0].payload.fullName || label}</p>
          <p className="text-sm text-muted-foreground">
            العدد: <span className="text-foreground font-medium">{payload[0].payload.count}</span>
          </p>
          {payload[0].payload.value > 0 && (
            <p className="text-sm text-muted-foreground">
              القيمة: <span className="text-foreground font-medium">{payload[0].payload.value.toLocaleString()}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">الإحصائيات والرسوم البيانية</h3>
              <p className="text-sm text-muted-foreground">تحليل مرئي للبيانات</p>
            </div>
          </div>
          
          <Button
            onClick={fetchAIInsights}
            disabled={isLoadingInsights}
            className="gap-2 btn-gradient"
          >
            {isLoadingInsights ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            تحليل بـ Gemini
          </Button>
        </div>

        <div className="flex gap-2 mt-4">
          {chartTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeChart === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
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
          <div className="bg-muted/30 rounded-xl p-4 min-h-[350px]">
            <h4 className="font-medium mb-4 text-center">توزيع الفئات</h4>
            <ResponsiveContainer width="100%" height={300}>
              {activeChart === "pie" ? (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : activeChart === "bar" ? (
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              ) : activeChart === "line" ? (
                <LineChart data={topItemsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              ) : (
                <AreaChart data={topItemsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 min-h-[350px]">
            <h4 className="font-medium mb-4 text-center">القيم حسب الفئة</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
            <p className="text-2xl font-bold text-primary">{pieData.length}</p>
            <p className="text-sm text-muted-foreground">فئات</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 text-center">
            <p className="text-2xl font-bold text-accent">{items.length}</p>
            <p className="text-sm text-muted-foreground">عناصر</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 text-center">
            <p className="text-2xl font-bold text-success">
              {summary?.total_value?.toLocaleString() || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">إجمالي القيمة</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 text-center">
            <p className="text-2xl font-bold text-warning">
              {Math.max(...Object.values(categoryData).map(c => c.count))}
            </p>
            <p className="text-sm text-muted-foreground">أكبر فئة</p>
          </div>
        </div>

        {/* AI Insights */}
        {aiInsights.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h4 className="font-display font-semibold">تحليلات Gemini الذكية</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-xl border",
                    insight.type === "success" && "bg-success/5 border-success/20",
                    insight.type === "warning" && "bg-warning/5 border-warning/20",
                    insight.type === "info" && "bg-primary/5 border-primary/20"
                  )}
                >
                  <h5 className="font-medium mb-1">{insight.title}</h5>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  {insight.recommendation && (
                    <p className="text-sm mt-2 font-medium text-primary">
                      💡 {insight.recommendation}
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
