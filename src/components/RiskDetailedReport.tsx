import { useState, useEffect } from "react";
import {
  FileText,
  Shield,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
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
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Risk {
  id: string;
  risk_title: string;
  risk_description: string | null;
  category: string;
  probability: string;
  impact: string;
  risk_score: number | null;
  status: string;
  mitigation_strategy: string | null;
  contingency_plan: string | null;
  risk_owner: string | null;
  identified_date: string;
  review_date: string | null;
}

interface RiskDetailedReportProps {
  projectId?: string;
}

const RISK_COLORS = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const STATUS_COLORS = {
  identified: "#6366f1",
  assessed: "#8b5cf6",
  mitigating: "#f59e0b",
  monitoring: "#3b82f6",
  closed: "#22c55e",
  occurred: "#dc2626",
};

export function RiskDetailedReport({ projectId }: RiskDetailedReportProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const categories = [
    { value: "technical", labelEn: "Technical", labelAr: "تقني" },
    { value: "financial", labelEn: "Financial", labelAr: "مالي" },
    { value: "schedule", labelEn: "Schedule", labelAr: "جدول زمني" },
    { value: "resource", labelEn: "Resource", labelAr: "موارد" },
    { value: "external", labelEn: "External", labelAr: "خارجي" },
    { value: "legal", labelEn: "Legal", labelAr: "قانوني" },
    { value: "safety", labelEn: "Safety", labelAr: "سلامة" },
    { value: "quality", labelEn: "Quality", labelAr: "جودة" },
  ];

  const statuses = [
    { value: "identified", labelEn: "Identified", labelAr: "محدد" },
    { value: "assessed", labelEn: "Assessed", labelAr: "مقيّم" },
    { value: "mitigating", labelEn: "Mitigating", labelAr: "قيد المعالجة" },
    { value: "monitoring", labelEn: "Monitoring", labelAr: "قيد المراقبة" },
    { value: "closed", labelEn: "Closed", labelAr: "مغلق" },
    { value: "occurred", labelEn: "Occurred", labelAr: "حدث" },
  ];

  const getRiskLevel = (score: number): { level: string; levelAr: string; color: string } => {
    if (score <= 4) return { level: "Low", levelAr: "منخفض", color: "bg-green-500" };
    if (score <= 9) return { level: "Medium", levelAr: "متوسط", color: "bg-yellow-500" };
    if (score <= 16) return { level: "High", levelAr: "عالي", color: "bg-orange-500" };
    return { level: "Critical", levelAr: "حرج", color: "bg-red-500" };
  };

  const fetchRisks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("risks")
        .select("*")
        .eq("user_id", user.id)
        .order("risk_score", { ascending: false, nullsFirst: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRisks(data || []);
    } catch (error) {
      console.error("Error fetching risks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [user, projectId]);

  const filteredRisks = risks.filter((risk) => {
    if (filterCategory !== "all" && risk.category !== filterCategory) return false;
    if (filterStatus !== "all" && risk.status !== filterStatus) return false;
    return true;
  });

  // Chart data
  const categoryData = categories.map((cat) => ({
    name: isArabic ? cat.labelAr : cat.labelEn,
    value: risks.filter((r) => r.category === cat.value).length,
  })).filter((d) => d.value > 0);

  const statusData = statuses.map((s) => ({
    name: isArabic ? s.labelAr : s.labelEn,
    value: risks.filter((r) => r.status === s.value).length,
    fill: STATUS_COLORS[s.value as keyof typeof STATUS_COLORS],
  })).filter((d) => d.value > 0);

  const riskLevelData = [
    { name: isArabic ? "حرج" : "Critical", value: risks.filter((r) => (r.risk_score || 0) > 16).length, fill: RISK_COLORS.critical },
    { name: isArabic ? "عالي" : "High", value: risks.filter((r) => (r.risk_score || 0) > 9 && (r.risk_score || 0) <= 16).length, fill: RISK_COLORS.high },
    { name: isArabic ? "متوسط" : "Medium", value: risks.filter((r) => (r.risk_score || 0) > 4 && (r.risk_score || 0) <= 9).length, fill: RISK_COLORS.medium },
    { name: isArabic ? "منخفض" : "Low", value: risks.filter((r) => (r.risk_score || 0) <= 4).length, fill: RISK_COLORS.low },
  ].filter((d) => d.value > 0);

  // Summary stats
  const totalRisks = risks.length;
  const activeRisks = risks.filter((r) => !["closed", "occurred"].includes(r.status)).length;
  const mitigatedRisks = risks.filter((r) => r.status === "closed").length;
  const avgScore = totalRisks > 0 ? risks.reduce((sum, r) => sum + (r.risk_score || 0), 0) / totalRisks : 0;
  const mitigationRate = totalRisks > 0 ? (mitigatedRisks / totalRisks) * 100 : 0;

  const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308"];

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>
                {isArabic ? "تقرير المخاطر التفصيلي" : "Detailed Risk Report"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic
                  ? "تحليل شامل للمخاطر مع تتبع الإجراءات"
                  : "Comprehensive risk analysis with action tracking"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الفئات" : "All Categories"}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {isArabic ? c.labelAr : c.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All Statuses"}</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {isArabic ? s.labelAr : s.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <div className="text-2xl font-bold">{totalRisks}</div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? "إجمالي المخاطر" : "Total Risks"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-2xl font-bold text-amber-600">{activeRisks}</div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? "مخاطر نشطة" : "Active Risks"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <div className="text-2xl font-bold text-green-600">{mitigatedRisks}</div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? "تم المعالجة" : "Mitigated"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-2xl font-bold text-blue-600">{avgScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? "متوسط الدرجة" : "Avg Score"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <div className="text-2xl font-bold text-purple-600">{mitigationRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">
                  {isArabic ? "معدل المعالجة" : "Mitigation Rate"}
                </div>
                <Progress value={mitigationRate} className="h-1 mt-1" />
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Level Distribution */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {isArabic ? "توزيع مستوى المخاطر" : "Risk Level Distribution"}
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={riskLevelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {riskLevelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Distribution */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {isArabic ? "توزيع الفئات" : "Category Distribution"}
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {isArabic ? "توزيع الحالات" : "Status Distribution"}
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "المخاطر" : "Risk"}</TableHead>
                    <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                    <TableHead>{isArabic ? "المستوى" : "Level"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isArabic ? "المسؤول" : "Owner"}</TableHead>
                    <TableHead>{isArabic ? "استراتيجية المعالجة" : "Mitigation"}</TableHead>
                    <TableHead>{isArabic ? "تاريخ المراجعة" : "Review Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map((risk) => {
                    const riskLevel = getRiskLevel(risk.risk_score || 0);
                    const status = statuses.find((s) => s.value === risk.status);
                    const category = categories.find((c) => c.value === risk.category);

                    return (
                      <TableRow key={risk.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{risk.risk_title}</div>
                            {risk.risk_description && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {risk.risk_description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {isArabic ? category?.labelAr : category?.labelEn}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-white", riskLevel.color)}>
                            {risk.risk_score} - {isArabic ? riskLevel.levelAr : riskLevel.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {isArabic ? status?.labelAr : status?.labelEn}
                          </Badge>
                        </TableCell>
                        <TableCell>{risk.risk_owner || "-"}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {risk.mitigation_strategy ? (
                              <div className="text-xs line-clamp-2">{risk.mitigation_strategy}</div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                {isArabic ? "لم يحدد" : "Not defined"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {risk.review_date ? (
                            <span className="text-xs">
                              {format(new Date(risk.review_date), "PP", {
                                locale: isArabic ? ar : enUS,
                              })}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Action Tracking Summary */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                {isArabic ? "ملخص تتبع الإجراءات" : "Action Tracking Summary"}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>
                    {risks.filter((r) => r.mitigation_strategy).length}{" "}
                    {isArabic ? "خطر له استراتيجية معالجة" : "with mitigation strategy"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>
                    {risks.filter((r) => r.contingency_plan).length}{" "}
                    {isArabic ? "خطر له خطة طوارئ" : "with contingency plan"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>
                    {risks.filter((r) => r.risk_owner).length}{" "}
                    {isArabic ? "خطر له مسؤول" : "with assigned owner"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>
                    {risks.filter((r) => r.review_date).length}{" "}
                    {isArabic ? "خطر له تاريخ مراجعة" : "with review date"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
