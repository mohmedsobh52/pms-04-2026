import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Target, Search, Filter, RefreshCw, ArrowUpDown } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PriceComparison {
  id: string;
  item_number: string;
  item_description: string | null;
  suggested_price: number;
  final_price: number | null;
  deviation_percent: number | null;
  source: string | null;
  confidence: string | null;
  created_at: string;
  is_approved: boolean | null;
  project_id: string | null;
}

interface ProjectInfo {
  id: string;
  name: string;
}

const PriceComparisonTracker: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'deviation' | 'date' | 'price'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch pricing history
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (pricingError) throw pricingError;
      setComparisons(pricingData || []);

      // Fetch projects for filter
      const { data: projectsData } = await supabase
        .from('saved_projects')
        .select('id, name');
      
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredComparisons = useMemo(() => {
    return comparisons
      .filter(item => {
        if (selectedProject !== 'all' && item.project_id !== selectedProject) return false;
        if (selectedSource !== 'all' && item.source !== selectedSource) return false;
        if (selectedConfidence !== 'all' && item.confidence !== selectedConfidence) return false;
        if (searchQuery && !item.item_description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !item.item_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortField) {
          case 'deviation':
            aVal = Math.abs(a.deviation_percent || 0);
            bVal = Math.abs(b.deviation_percent || 0);
            break;
          case 'price':
            aVal = a.suggested_price;
            bVal = b.suggested_price;
            break;
          case 'date':
          default:
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
        }
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
  }, [comparisons, selectedProject, selectedSource, selectedConfidence, searchQuery, sortField, sortDirection]);

  const stats = useMemo(() => {
    const approved = filteredComparisons.filter(c => c.is_approved && c.final_price);
    const totalDeviation = approved.reduce((sum, c) => sum + Math.abs(c.deviation_percent || 0), 0);
    const avgDeviation = approved.length > 0 ? totalDeviation / approved.length : 0;
    const maxDeviation = approved.length > 0 ? Math.max(...approved.map(c => Math.abs(c.deviation_percent || 0))) : 0;
    const minDeviation = approved.length > 0 ? Math.min(...approved.map(c => Math.abs(c.deviation_percent || 0))) : 0;
    const accuracy = 100 - avgDeviation;

    return {
      total: filteredComparisons.length,
      approved: approved.length,
      avgDeviation: avgDeviation.toFixed(2),
      maxDeviation: maxDeviation.toFixed(2),
      minDeviation: minDeviation.toFixed(2),
      accuracy: accuracy.toFixed(1)
    };
  }, [filteredComparisons]);

  // Chart data - accuracy over time
  const chartData = useMemo(() => {
    const approvedItems = filteredComparisons.filter(c => c.is_approved && c.final_price);
    const groupedByMonth: Record<string, { total: number; count: number }> = {};

    approvedItems.forEach(item => {
      const month = format(new Date(item.created_at), 'yyyy-MM');
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = { total: 0, count: 0 };
      }
      groupedByMonth[month].total += 100 - Math.abs(item.deviation_percent || 0);
      groupedByMonth[month].count += 1;
    });

    const labels = Object.keys(groupedByMonth).sort();
    const accuracyData = labels.map(month => 
      groupedByMonth[month].count > 0 
        ? groupedByMonth[month].total / groupedByMonth[month].count 
        : 0
    );

    return {
      labels: labels.map(l => format(new Date(l), 'MMM yyyy', { locale: isArabic ? ar : enUS })),
      datasets: [
        {
          label: isArabic ? 'دقة التسعير %' : 'Pricing Accuracy %',
          data: accuracyData,
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filteredComparisons, isArabic]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (value: any) => `${value}%` }
      }
    }
  };

  const getDeviationBadge = (deviation: number | null) => {
    if (deviation === null) return null;
    const absDeviation = Math.abs(deviation);
    if (absDeviation <= 5) {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">{deviation.toFixed(1)}%</Badge>;
    } else if (absDeviation <= 15) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">{deviation.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">{deviation.toFixed(1)}%</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: string | null) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return <Badge variant="outline" className="border-green-500 text-green-600">{isArabic ? 'عالية' : 'High'}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">{isArabic ? 'متوسطة' : 'Medium'}</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-red-500 text-red-600">{isArabic ? 'منخفضة' : 'Low'}</Badge>;
      default:
        return <Badge variant="outline">{confidence || '-'}</Badge>;
    }
  };

  const getSourceBadge = (source: string | null) => {
    switch (source?.toLowerCase()) {
      case 'library':
        return <Badge className="bg-blue-500/20 text-blue-700">{isArabic ? 'المكتبة' : 'Library'}</Badge>;
      case 'reference':
        return <Badge className="bg-purple-500/20 text-purple-700">{isArabic ? 'مرجعي' : 'Reference'}</Badge>;
      case 'ai':
        return <Badge className="bg-orange-500/20 text-orange-700">{isArabic ? 'ذكاء اصطناعي' : 'AI'}</Badge>;
      default:
        return <Badge variant="outline">{source || '-'}</Badge>;
    }
  };

  const toggleSort = (field: 'deviation' | 'date' | 'price') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">{isArabic ? 'الدقة المتوقعة' : 'Est. Accuracy'}</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{stats.accuracy}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">{isArabic ? 'أقل انحراف' : 'Min Deviation'}</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">{stats.minDeviation}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-muted-foreground">{isArabic ? 'متوسط الانحراف' : 'Avg Deviation'}</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.avgDeviation}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm text-muted-foreground">{isArabic ? 'أعلى انحراف' : 'Max Deviation'}</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.maxDeviation}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-sm text-muted-foreground">{isArabic ? 'إجمالي البنود' : 'Total Items'}</span>
            <p className="text-2xl font-bold mt-2">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-sm text-muted-foreground">{isArabic ? 'البنود المعتمدة' : 'Approved'}</span>
            <p className="text-2xl font-bold mt-2">{stats.approved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {isArabic ? 'تتبع الدقة عبر الوقت' : 'Accuracy Trend Over Time'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? 'بحث...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isArabic ? 'المشروع' : 'Project'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'جميع المشاريع' : 'All Projects'}</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={isArabic ? 'المصدر' : 'Source'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="library">{isArabic ? 'المكتبة' : 'Library'}</SelectItem>
                <SelectItem value="reference">{isArabic ? 'مرجعي' : 'Reference'}</SelectItem>
                <SelectItem value="ai">{isArabic ? 'ذكاء اصطناعي' : 'AI'}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedConfidence} onValueChange={setSelectedConfidence}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={isArabic ? 'الثقة' : 'Confidence'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="high">{isArabic ? 'عالية' : 'High'}</SelectItem>
                <SelectItem value="medium">{isArabic ? 'متوسطة' : 'Medium'}</SelectItem>
                <SelectItem value="low">{isArabic ? 'منخفضة' : 'Low'}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isArabic ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'مقارنة الأسعار' : 'Price Comparison'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? 'رقم البند' : 'Item #'}</TableHead>
                  <TableHead className="min-w-[200px]">{isArabic ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('price')}>
                    <div className="flex items-center justify-center gap-1">
                      {isArabic ? 'السعر المقترح' : 'Suggested'}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{isArabic ? 'السعر النهائي' : 'Final'}</TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('deviation')}>
                    <div className="flex items-center justify-center gap-1">
                      {isArabic ? 'الانحراف' : 'Deviation'}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{isArabic ? 'المصدر' : 'Source'}</TableHead>
                  <TableHead className="text-center">{isArabic ? 'الثقة' : 'Confidence'}</TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('date')}>
                    <div className="flex items-center justify-center gap-1">
                      {isArabic ? 'التاريخ' : 'Date'}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComparisons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {isArabic ? 'لا توجد بيانات للعرض' : 'No data to display'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComparisons.slice(0, 50).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.item_number}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {item.item_description || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.suggested_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.final_price?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {getDeviationBadge(item.deviation_percent)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getSourceBadge(item.source)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getConfidenceBadge(item.confidence)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {format(new Date(item.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.is_approved ? (
                          <Badge className="bg-green-500/20 text-green-700">
                            {isArabic ? 'معتمد' : 'Approved'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {isArabic ? 'قيد المراجعة' : 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredComparisons.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              {isArabic 
                ? `عرض 50 من ${filteredComparisons.length} بند`
                : `Showing 50 of ${filteredComparisons.length} items`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceComparisonTracker;
