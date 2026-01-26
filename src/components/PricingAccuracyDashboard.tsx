import { useState, useEffect, useMemo } from "react";
import { BarChart3, Database, Bot, BookOpen, TrendingUp, CheckCircle, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";

interface PricingHistoryItem {
  id: string;
  item_number: string;
  suggested_price: number;
  final_price: number | null;
  confidence: string | null;
  source: string | null;
  is_approved: boolean;
  accuracy_score: number | null;
  created_at: string;
}

interface PricingAccuracyDashboardProps {
  projectId?: string;
  className?: string;
}

const SOURCE_COLORS = {
  library: "#22c55e",
  reference: "#3b82f6", 
  ai: "#a855f7"
};

const CONFIDENCE_COLORS = {
  High: "#22c55e",
  Medium: "#f59e0b",
  Low: "#ef4444"
};

export function PricingAccuracyDashboard({ projectId, className }: PricingAccuracyDashboardProps) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [history, setHistory] = useState<PricingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("pricing_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (projectId) {
          query = query.eq("project_id", projectId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error("Error fetching pricing history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user, projectId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = history.length;
    const approved = history.filter(h => h.is_approved).length;
    const pending = total - approved;

    // Source distribution
    const sourceDistribution = {
      library: history.filter(h => h.source === "library").length,
      reference: history.filter(h => h.source === "reference").length,
      ai: history.filter(h => h.source === "ai").length
    };

    // Confidence distribution
    const confidenceDistribution = {
      High: history.filter(h => h.confidence === "High").length,
      Medium: history.filter(h => h.confidence === "Medium").length,
      Low: history.filter(h => h.confidence === "Low").length
    };

    // Calculate accuracy for approved items
    const approvedWithAccuracy = history.filter(h => h.is_approved && h.accuracy_score !== null);
    const avgAccuracy = approvedWithAccuracy.length > 0
      ? approvedWithAccuracy.reduce((sum, h) => sum + (h.accuracy_score || 0), 0) / approvedWithAccuracy.length
      : 0;

    // Estimate accuracy based on confidence levels
    const estimatedAccuracy = total > 0
      ? Math.round(
          ((confidenceDistribution.High * 95) + 
           (confidenceDistribution.Medium * 80) + 
           (confidenceDistribution.Low * 65)) / total
        )
      : 0;

    return {
      total,
      approved,
      pending,
      sourceDistribution,
      confidenceDistribution,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      estimatedAccuracy
    };
  }, [history]);

  // Chart data for source distribution
  const sourceChartData = useMemo(() => [
    { name: isArabic ? "مكتبة محلية" : "Library", value: stats.sourceDistribution.library, color: SOURCE_COLORS.library },
    { name: isArabic ? "مرجعي" : "Reference", value: stats.sourceDistribution.reference, color: SOURCE_COLORS.reference },
    { name: "AI", value: stats.sourceDistribution.ai, color: SOURCE_COLORS.ai }
  ].filter(d => d.value > 0), [stats, isArabic]);

  // Chart data for confidence distribution
  const confidenceChartData = useMemo(() => [
    { name: isArabic ? "عالية" : "High", value: stats.confidenceDistribution.High, color: CONFIDENCE_COLORS.High },
    { name: isArabic ? "متوسطة" : "Medium", value: stats.confidenceDistribution.Medium, color: CONFIDENCE_COLORS.Medium },
    { name: isArabic ? "منخفضة" : "Low", value: stats.confidenceDistribution.Low, color: CONFIDENCE_COLORS.Low }
  ].filter(d => d.value > 0), [stats, isArabic]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">
            {isArabic ? "جارٍ تحميل الإحصائيات..." : "Loading statistics..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {isArabic 
              ? "لا توجد بيانات تسعير بعد. قم بتحليل البنود للحصول على إحصائيات الدقة."
              : "No pricing data yet. Analyze items to see accuracy statistics."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          {isArabic ? "إحصائيات دقة التسعير" : "Pricing Accuracy Statistics"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.estimatedAccuracy}%</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />
              {isArabic ? "الدقة المتوقعة" : "Est. Accuracy"}
            </div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {isArabic ? "إجمالي البنود" : "Total Items"}
            </div>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {isArabic ? "معتمد" : "Approved"}
            </div>
          </div>
          <div className="text-center p-3 bg-amber-500/10 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {isArabic ? "قيد المراجعة" : "Pending"}
            </div>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Database className="w-4 h-4" />
            {isArabic ? "مصادر الأسعار" : "Price Sources"}
          </h4>
          
          <div className="flex items-center gap-6">
            {/* Source bars */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-green-600" />
                <span className="text-sm w-20">{isArabic ? "مكتبة" : "Library"}</span>
                <Progress 
                  value={stats.total > 0 ? (stats.sourceDistribution.library / stats.total) * 100 : 0} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {stats.sourceDistribution.library}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-sm w-20">{isArabic ? "مرجعي" : "Reference"}</span>
                <Progress 
                  value={stats.total > 0 ? (stats.sourceDistribution.reference / stats.total) * 100 : 0} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {stats.sourceDistribution.reference}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600" />
                <span className="text-sm w-20">AI</span>
                <Progress 
                  value={stats.total > 0 ? (stats.sourceDistribution.ai / stats.total) * 100 : 0} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {stats.sourceDistribution.ai}
                </span>
              </div>
            </div>

            {/* Mini pie chart */}
            {sourceChartData.length > 0 && (
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={35}
                    >
                      {sourceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {isArabic ? "مستويات الثقة" : "Confidence Levels"}
          </h4>
          
          <div className="flex items-center gap-4 flex-wrap">
            <Badge 
              variant="outline" 
              className="bg-green-500/10 text-green-600 border-green-500/30 gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-green-600" />
              {isArabic ? "عالية" : "High"}: {stats.confidenceDistribution.High}
              ({stats.total > 0 ? Math.round((stats.confidenceDistribution.High / stats.total) * 100) : 0}%)
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              {isArabic ? "متوسطة" : "Medium"}: {stats.confidenceDistribution.Medium}
              ({stats.total > 0 ? Math.round((stats.confidenceDistribution.Medium / stats.total) * 100) : 0}%)
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-red-500/10 text-red-600 border-red-500/30 gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-red-600" />
              {isArabic ? "منخفضة" : "Low"}: {stats.confidenceDistribution.Low}
              ({stats.total > 0 ? Math.round((stats.confidenceDistribution.Low / stats.total) * 100) : 0}%)
            </Badge>
          </div>
        </div>

        {/* Accuracy meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isArabic ? "مستوى الدقة الإجمالي" : "Overall Accuracy Level"}
            </span>
            <span className="font-bold text-primary">{stats.estimatedAccuracy}%</span>
          </div>
          <div className="relative">
            <Progress value={stats.estimatedAccuracy} className="h-3" />
            <div 
              className="absolute top-0 left-[90%] w-0.5 h-3 bg-green-600"
              title={isArabic ? "الهدف: 90%" : "Target: 90%"}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-green-600 font-medium">
              {isArabic ? "الهدف: 90%" : "Target: 90%"}
            </span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
