import { useState, useMemo } from "react";
import { 
  Activity, CheckCircle, AlertTriangle, XCircle, Clock, 
  TrendingUp, BarChart3, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Cpu, Zap, Database, Filter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { useAnalysisTracking, AnalysisRecord, AnalysisStatus } from "@/hooks/useAnalysisTracking";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const STATUS_CONFIG: Record<AnalysisStatus, { icon: typeof CheckCircle; color: string; bgColor: string; label: { en: string; ar: string } }> = {
  pending: { 
    icon: Clock, 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: { en: 'In Progress', ar: 'قيد التنفيذ' }
  },
  success: { 
    icon: CheckCircle, 
    color: 'text-green-500', 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: { en: 'Success (AI)', ar: 'ناجح (AI)' }
  },
  fallback: { 
    icon: AlertTriangle, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: { en: 'Fallback', ar: 'بديل' }
  },
  error: { 
    icon: XCircle, 
    color: 'text-red-500', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: { en: 'Error', ar: 'خطأ' }
  },
};

const FUNCTION_LABELS: Record<string, { en: string; ar: string }> = {
  'analyze-boq': { en: 'BOQ Analysis', ar: 'تحليل BOQ' },
  'suggest-market-rates': { en: 'Market Rates', ar: 'أسعار السوق' },
  'analyze-costs': { en: 'Cost Analysis', ar: 'تحليل التكاليف' },
  'analyze-resources': { en: 'Resources', ar: 'الموارد' },
  'analyze-procurement': { en: 'Procurement', ar: 'المشتريات' },
  'analyze-quotation': { en: 'Quotations', ar: 'عروض الأسعار' },
  'analyze-drawings': { en: 'Drawings', ar: 'الرسومات' },
  'analyze-attachment': { en: 'Attachments', ar: 'المرفقات' },
  'ocr-extract': { en: 'OCR', ar: 'استخراج النص' },
  'generate-timeline': { en: 'Timeline', ar: 'الجدول الزمني' },
};

export function AnalysisStatusDashboard() {
  const { isArabic } = useLanguage();
  const { records, clearRecords, getStatistics, getModelDisplayName, getModelDisplayNameAr } = useAnalysisTracking();
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'details'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  
  const stats = useMemo(() => getStatistics(), [records, getStatistics]);
  
  // Prepare chart data
  const pieData = useMemo(() => [
    { name: isArabic ? 'ناجح (AI)' : 'Success (AI)', value: stats.successCount, color: '#22c55e' },
    { name: isArabic ? 'بديل' : 'Fallback', value: stats.fallbackCount, color: '#f97316' },
    { name: isArabic ? 'خطأ' : 'Error', value: stats.errorCount, color: '#ef4444' },
  ].filter(d => d.value > 0), [stats, isArabic]);

  const functionBarData = useMemo(() => 
    Object.entries(stats.byFunction).map(([func, data]) => ({
      name: isArabic ? (FUNCTION_LABELS[func]?.ar || func) : (FUNCTION_LABELS[func]?.en || func),
      success: data.success,
      fallback: data.fallback,
      error: data.error,
    }))
  , [stats.byFunction, isArabic]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = [...records].reverse();
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filtered;
  }, [records, statusFilter]);

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {isArabic ? "لوحة تتبع التحليلات" : "Analysis Tracking Dashboard"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isArabic ? "لا توجد تحليلات مسجلة بعد" : "No analyses recorded yet"}</p>
            <p className="text-sm mt-2">
              {isArabic 
                ? "ستظهر هنا حالة كل تحليل بمجرد بدء استخدام الأدوات"
                : "Analysis status will appear here once you start using the tools"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {isArabic ? "لوحة تتبع التحليلات" : "Analysis Tracking Dashboard"}
            </CardTitle>
            <CardDescription>
              {isArabic 
                ? `${stats.totalAnalyses} تحليل مسجل - نسبة النجاح ${stats.successRate.toFixed(1)}%`
                : `${stats.totalAnalyses} analyses recorded - ${stats.successRate.toFixed(1)}% success rate`
              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={clearRecords}>
            <Trash2 className="h-4 w-4 mr-1" />
            {isArabic ? "مسح" : "Clear"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Custom Tab Navigation - Avoids Recharts interference with Radix Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'overview' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isArabic ? "نظرة عامة" : "Overview"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'history' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isArabic ? "السجل" : "History"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'details' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isArabic ? "التفاصيل" : "Details"}
          </button>
        </div>

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">{isArabic ? 'نجاح AI' : 'AI Success'}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.aiRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.successCount} {isArabic ? 'تحليل' : 'analyses'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium">{isArabic ? 'بديل' : 'Fallback'}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.fallbackRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.fallbackCount} {isArabic ? 'تحليل' : 'analyses'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">{isArabic ? 'متوسط الوقت' : 'Avg Duration'}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatDuration(stats.averageDuration)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-medium">{isArabic ? 'البنود' : 'Items'}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalItemsAnalyzed}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {isArabic ? 'توزيع نتائج التحليل' : 'Analysis Results Distribution'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
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

              {/* Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {isArabic ? 'التحليلات حسب الوظيفة' : 'Analyses by Function'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={functionBarData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="success" stackId="a" fill="#22c55e" name={isArabic ? 'ناجح' : 'Success'} />
                        <Bar dataKey="fallback" stackId="a" fill="#f97316" name={isArabic ? 'بديل' : 'Fallback'} />
                        <Bar dataKey="error" stackId="a" fill="#ef4444" name={isArabic ? 'خطأ' : 'Error'} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI vs Fallback Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {isArabic ? 'نسبة التحليل الحقيقي vs البديل' : 'Real AI vs Fallback Rate'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-green-500" />
                      {isArabic ? 'تحليل AI حقيقي' : 'Real AI Analysis'}
                    </span>
                    <span className="font-medium">{stats.aiRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.aiRate} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      {isArabic ? 'حسابات بديلة' : 'Fallback Calculations'}
                    </span>
                    <span className="font-medium">{stats.fallbackRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.fallbackRate} className="h-3 [&>div]:bg-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="success">{isArabic ? 'ناجح' : 'Success'}</SelectItem>
                  <SelectItem value="fallback">{isArabic ? 'بديل' : 'Fallback'}</SelectItem>
                  <SelectItem value="error">{isArabic ? 'خطأ' : 'Error'}</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredRecords.length} {isArabic ? 'سجل' : 'records'}
              </Badge>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredRecords.map((record) => {
                  const statusConfig = STATUS_CONFIG[record.status];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Collapsible
                      key={record.id}
                      open={expandedRecord === record.id}
                      onOpenChange={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                    >
                      <div className={`p-3 rounded-lg border ${statusConfig.bgColor}`}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                              <div className="text-left">
                                <p className="font-medium text-sm">
                                  {isArabic ? record.displayNameAr : record.displayName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(record.startTime)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {isArabic ? getModelDisplayNameAr(record.model) : getModelDisplayName(record.model)}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {formatDuration(record.duration)}
                              </Badge>
                              {expandedRecord === record.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{isArabic ? 'مصدر البيانات' : 'Data Source'}</span>
                              <Badge variant={record.dataSource === 'ai' ? 'default' : 'secondary'}>
                                {record.dataSource === 'ai' ? (isArabic ? 'ذكاء اصطناعي' : 'AI') : (isArabic ? 'حسابات بديلة' : 'Fallback')}
                              </Badge>
                            </div>
                            {record.itemsAnalyzed && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{isArabic ? 'البنود المحللة' : 'Items Analyzed'}</span>
                                <span>{record.itemsAnalyzed}</span>
                              </div>
                            )}
                            {record.confidence && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{isArabic ? 'الثقة' : 'Confidence'}</span>
                                <span>{record.confidence}%</span>
                              </div>
                            )}
                            {record.error && (
                              <div className="text-red-500 text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded">
                                {record.error}
                              </div>
                            )}
                            {record.details && (
                              <div className="text-xs mt-2 p-2 bg-muted rounded">
                                {record.details}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Details Tab Content */}
        {activeTab === 'details' && (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? 'الوظيفة' : 'Function'}</TableHead>
                  <TableHead>{isArabic ? 'الإجمالي' : 'Total'}</TableHead>
                  <TableHead className="text-green-600">{isArabic ? 'ناجح' : 'Success'}</TableHead>
                  <TableHead className="text-orange-600">{isArabic ? 'بديل' : 'Fallback'}</TableHead>
                  <TableHead className="text-red-600">{isArabic ? 'خطأ' : 'Error'}</TableHead>
                  <TableHead>{isArabic ? 'نسبة النجاح' : 'Success Rate'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.byFunction).map(([func, data]) => (
                  <TableRow key={func}>
                    <TableCell className="font-medium">
                      {isArabic ? (FUNCTION_LABELS[func]?.ar || func) : (FUNCTION_LABELS[func]?.en || func)}
                    </TableCell>
                    <TableCell>{data.total}</TableCell>
                    <TableCell className="text-green-600">{data.success}</TableCell>
                    <TableCell className="text-orange-600">{data.fallback}</TableCell>
                    <TableCell className="text-red-600">{data.error}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={data.total > 0 ? (data.success / data.total) * 100 : 0} 
                          className="h-2 w-16" 
                        />
                        <span className="text-xs">
                          {data.total > 0 ? ((data.success / data.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
