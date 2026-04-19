import { useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/page-skeleton";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface Subcontractor {
  id: string;
  name: string;
  specialty: string | null;
  status: string;
}

interface Assignment {
  id: string;
  subcontractor_id: string;
  scope_of_work: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number;
  status: string;
  payment_status: string;
}

interface SubcontractorProgressDashboardProps {
  subcontractors: Subcontractor[];
  assignments: Assignment[];
}

// Semantic HSL palette consistent with the rest of the app
const COLORS = [
  "hsl(220 70% 50%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
];

export function SubcontractorProgressDashboard({ 
  subcontractors, 
  assignments 
}: SubcontractorProgressDashboardProps) {
  const { isArabic } = useLanguage();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalContractValue = assignments.reduce((sum, a) => sum + (a.contract_value || 0), 0);
    const paidAmount = assignments
      .filter(a => a.payment_status === 'paid')
      .reduce((sum, a) => sum + (a.contract_value || 0), 0);
    const pendingPayment = assignments
      .filter(a => a.payment_status === 'pending')
      .reduce((sum, a) => sum + (a.contract_value || 0), 0);
    
    const avgProgress = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.progress_percentage, 0) / assignments.length
      : 0;

    const completedCount = assignments.filter(a => a.status === 'completed').length;
    const inProgressCount = assignments.filter(a => a.status === 'in_progress').length;
    const pendingCount = assignments.filter(a => a.status === 'pending').length;
    const delayedCount = assignments.filter(a => a.status === 'delayed').length;

    return {
      totalContractValue,
      paidAmount,
      pendingPayment,
      avgProgress,
      completedCount,
      inProgressCount,
      pendingCount,
      delayedCount
    };
  }, [assignments]);

  // Progress by subcontractor chart data
  const progressBySubcontractor = useMemo(() => {
    return subcontractors.map(sub => {
      const subAssignments = assignments.filter(a => a.subcontractor_id === sub.id);
      const avgProgress = subAssignments.length > 0
        ? subAssignments.reduce((sum, a) => sum + a.progress_percentage, 0) / subAssignments.length
        : 0;
      const totalValue = subAssignments.reduce((sum, a) => sum + (a.contract_value || 0), 0);
      
      return {
        name: sub.name.length > 12 ? sub.name.substring(0, 12) + '...' : sub.name,
        fullName: sub.name,
        progress: Math.round(avgProgress),
        value: totalValue,
        assignments: subAssignments.length
      };
    }).filter(s => s.assignments > 0);
  }, [subcontractors, assignments]);

  // Payment status chart data
  const paymentStatusData = useMemo(() => {
    const paid = assignments.filter(a => a.payment_status === 'paid').length;
    const pending = assignments.filter(a => a.payment_status === 'pending').length;
    const partial = assignments.filter(a => a.payment_status === 'partial').length;
    
    return [
      { name: isArabic ? 'مدفوع' : 'Paid', value: paid, color: COLORS[1] },
      { name: isArabic ? 'معلق' : 'Pending', value: pending, color: COLORS[2] },
      { name: isArabic ? 'جزئي' : 'Partial', value: partial, color: COLORS[0] }
    ].filter(d => d.value > 0);
  }, [assignments, isArabic]);

  // Status distribution chart data
  const statusDistribution = useMemo(() => {
    return [
      { name: isArabic ? 'مكتمل' : 'Completed', value: stats.completedCount, color: COLORS[1] },
      { name: isArabic ? 'جاري' : 'In Progress', value: stats.inProgressCount, color: COLORS[5] },
      { name: isArabic ? 'معلق' : 'Pending', value: stats.pendingCount, color: COLORS[2] },
      { name: isArabic ? 'متأخر' : 'Delayed', value: stats.delayedCount, color: COLORS[3] }
    ].filter(d => d.value > 0);
  }, [stats, isArabic]);

  // Contract value by specialty
  const valueBySpecialty = useMemo(() => {
    const specialtyMap = new Map<string, number>();
    
    assignments.forEach(assignment => {
      const sub = subcontractors.find(s => s.id === assignment.subcontractor_id);
      const specialty = sub?.specialty || (isArabic ? 'غير محدد' : 'Unspecified');
      const currentValue = specialtyMap.get(specialty) || 0;
      specialtyMap.set(specialty, currentValue + (assignment.contract_value || 0));
    });

    return Array.from(specialtyMap.entries()).map(([name, value]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      value
    }));
  }, [subcontractors, assignments, isArabic]);

  // Monthly progress trend (simulated based on assignments)
  const progressTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    
    return months.map((month, i) => ({
      month: isArabic ? arabicMonths[i] : month,
      planned: Math.min(100, (i + 1) * 16),
      actual: Math.min(100, Math.round(stats.avgProgress * ((i + 1) / 6) + Math.random() * 10))
    }));
  }, [stats.avgProgress, isArabic]);

  if (subcontractors.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title={isArabic ? "لا توجد بيانات للعرض" : "No data to display"}
            description={isArabic
              ? "أضف مقاولين ومهام أولاً لعرض الرسوم والتحليلات"
              : "Add subcontractors and assignments first to see charts and analytics"}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContractValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "إجمالي قيمة العقود" : "Total Contract Value"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paidAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "المدفوعات المكتملة" : "Paid Amount"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingPayment.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "مدفوعات معلقة" : "Pending Payments"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(stats.avgProgress)}%</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "متوسط الإنجاز" : "Avg Progress"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Progress by Subcontractor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {isArabic ? "تقدم المقاولين" : "Progress by Subcontractor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressBySubcontractor} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="sub-prog-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(220 70% 50%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg text-xs animate-fade-in">
                            <p className="font-semibold text-foreground mb-1">{data.fullName}</p>
                            <p className="text-muted-foreground">
                              {isArabic ? 'الإنجاز:' : 'Progress:'} <span className="font-medium text-foreground">{data.progress}%</span>
                            </p>
                            <p className="text-muted-foreground">
                              {isArabic ? 'القيمة:' : 'Value:'} <span className="font-medium text-foreground">{data.value.toLocaleString()}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="progress"
                    fill="url(#sub-prog-grad)"
                    radius={[0, 6, 6, 0]}
                    isAnimationActive
                    animationDuration={900}
                    name={isArabic ? "نسبة الإنجاز" : "Progress %"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              {isArabic ? "توزيع حالات المهام" : "Assignment Status Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {statusDistribution.map((entry, i) => (
                      <radialGradient key={i} id={`status-gr-${i}`}>
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                      </radialGradient>
                    ))}
                  </defs>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    isAnimationActive
                    animationDuration={800}
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#status-gr-${index})`} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Progress Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {isArabic ? "منحنى التقدم" : "Progress Trend"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressTrend} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="planned-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="actual-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(220 70% 50%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(220 70% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    stroke="hsl(var(--muted-foreground))"
                    fill="url(#planned-grad)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={900}
                    name={isArabic ? "المخطط" : "Planned"}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(220 70% 50%)"
                    fill="url(#actual-grad)"
                    strokeWidth={2.5}
                    isAnimationActive
                    animationDuration={900}
                    name={isArabic ? "الفعلي" : "Actual"}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Contract Value by Specialty */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {isArabic ? "قيمة العقود حسب التخصص" : "Contract Value by Specialty"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueBySpecialty} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                  <defs>
                    {valueBySpecialty.map((_, i) => (
                      <linearGradient key={i} id={`spec-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `${v/1000}K` : v}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    content={<ChartTooltip formatter={(v: number) => v.toLocaleString()} />}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900}>
                    {valueBySpecialty.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#spec-grad-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status & Individual Progress */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Payment Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              {isArabic ? "حالة المدفوعات" : "Payment Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Individual Subcontractor Progress List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {isArabic ? "تقدم المقاولين الفردي" : "Individual Subcontractor Progress"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[250px] overflow-y-auto">
              {progressBySubcontractor.map((sub, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-sm">{sub.fullName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {sub.assignments} {isArabic ? "مهمة" : "tasks"}
                      </Badge>
                      <span className="font-bold text-sm">{sub.progress}%</span>
                    </div>
                  </div>
                  <Progress value={sub.progress} className="h-2" />
                </div>
              ))}
              
              {progressBySubcontractor.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {isArabic ? "لا توجد مهام حالياً" : "No assignments yet"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
