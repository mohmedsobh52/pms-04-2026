import React, { useRef, useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileDown, Printer, PieChart, BarChart3, TrendingUp, Target, Loader2 } from 'lucide-react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface PricingStats {
  total: number;
  approved: number;
  pending: number;
  avgDeviation: number;
  estimatedAccuracy: number;
  sourceDistribution: {
    library: number;
    reference: number;
    ai: number;
  };
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topDeviations: Array<{
    item_number: string;
    description: string;
    suggested: number;
    final: number;
    deviation: number;
  }>;
}

interface PricingAccuracyPDFReportProps {
  projectName?: string;
  projectId?: string;
}

const PricingAccuracyPDFReport: React.FC<PricingAccuracyPDFReportProps> = ({ projectName, projectId }) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const sourceChartRef = useRef<any>(null);
  const confidenceChartRef = useRef<any>(null);

  const fetchStats = async () => {
    try {
      let query = supabase.from('pricing_history').select('*');
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = data || [];
      const approved = items.filter(i => i.is_approved && i.final_price);
      const pending = items.filter(i => !i.is_approved);

      // Calculate deviations
      const deviations = approved.map(i => ({
        item_number: i.item_number,
        description: i.item_description || '',
        suggested: i.suggested_price,
        final: i.final_price!,
        deviation: Math.abs(((i.final_price! - i.suggested_price) / i.suggested_price) * 100)
      }));

      const avgDeviation = deviations.length > 0 
        ? deviations.reduce((sum, d) => sum + d.deviation, 0) / deviations.length 
        : 0;

      // Source distribution
      const sourceDistribution = {
        library: items.filter(i => i.source?.toLowerCase() === 'library').length,
        reference: items.filter(i => i.source?.toLowerCase() === 'reference').length,
        ai: items.filter(i => i.source?.toLowerCase() === 'ai').length
      };

      // Confidence distribution
      const confidenceDistribution = {
        high: items.filter(i => i.confidence?.toLowerCase() === 'high').length,
        medium: items.filter(i => i.confidence?.toLowerCase() === 'medium').length,
        low: items.filter(i => i.confidence?.toLowerCase() === 'low').length
      };

      // Estimated accuracy based on sources
      const weightedAccuracy = 
        (sourceDistribution.library * 95 + 
         sourceDistribution.reference * 85 + 
         sourceDistribution.ai * 70) / 
        Math.max(items.length, 1);

      const topDeviations = deviations
        .sort((a, b) => b.deviation - a.deviation)
        .slice(0, 20);

      setStats({
        total: items.length,
        approved: approved.length,
        pending: pending.length,
        avgDeviation,
        estimatedAccuracy: Math.min(100 - avgDeviation, weightedAccuracy),
        sourceDistribution,
        confidenceDistribution,
        topDeviations
      });

      return {
        total: items.length,
        approved: approved.length,
        pending: pending.length,
        avgDeviation,
        estimatedAccuracy: Math.min(100 - avgDeviation, weightedAccuracy),
        sourceDistribution,
        confidenceDistribution,
        topDeviations
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  };

  const sourceChartData = useMemo(() => ({
    labels: [
      isArabic ? 'المكتبة' : 'Library',
      isArabic ? 'مرجعي' : 'Reference',
      isArabic ? 'ذكاء اصطناعي' : 'AI'
    ],
    datasets: [{
      data: stats ? [
        stats.sourceDistribution.library,
        stats.sourceDistribution.reference,
        stats.sourceDistribution.ai
      ] : [0, 0, 0],
      backgroundColor: [
        'hsl(220, 70%, 50%)',
        'hsl(280, 70%, 50%)',
        'hsl(30, 70%, 50%)'
      ],
      borderWidth: 0
    }]
  }), [stats, isArabic]);

  const confidenceChartData = useMemo(() => ({
    labels: [
      isArabic ? 'عالية' : 'High',
      isArabic ? 'متوسطة' : 'Medium',
      isArabic ? 'منخفضة' : 'Low'
    ],
    datasets: [{
      label: isArabic ? 'عدد البنود' : 'Items Count',
      data: stats ? [
        stats.confidenceDistribution.high,
        stats.confidenceDistribution.medium,
        stats.confidenceDistribution.low
      ] : [0, 0, 0],
      backgroundColor: [
        'hsl(142, 70%, 45%)',
        'hsl(45, 90%, 50%)',
        'hsl(0, 70%, 50%)'
      ]
    }]
  }), [stats, isArabic]);

  const chartToImage = async (chartRef: any): Promise<string> => {
    if (!chartRef?.current) return '';
    const canvas = chartRef.current.canvas;
    return canvas.toDataURL('image/png');
  };

  const generatePDF = async () => {
    setIsLoading(true);
    try {
      const currentStats = await fetchStats();
      if (!currentStats) {
        toast.error(isArabic ? 'لا توجد بيانات' : 'No data available');
        return;
      }

      // Wait for charts to render
      await new Promise(resolve => setTimeout(resolve, 500));

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Load company logo from localStorage
      const companyLogo = localStorage.getItem('companyLogo');

      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageWidth, 40, 'F');

      if (companyLogo) {
        try {
          doc.addImage(companyLogo, 'PNG', margin, 8, 25, 25);
        } catch (e) {
          console.warn('Could not add logo');
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      const title = isArabic ? 'تقرير دقة التسعير' : 'Pricing Accuracy Report';
      doc.text(title, pageWidth / 2, 22, { align: 'center' });

      doc.setFontSize(10);
      const dateStr = format(new Date(), 'PPP', { locale: isArabic ? ar : enUS });
      doc.text(dateStr, pageWidth / 2, 32, { align: 'center' });

      if (projectName) {
        doc.text(projectName, pageWidth / 2, 38, { align: 'center' });
      }

      yPos = 50;
      doc.setTextColor(0, 0, 0);

      // KPI Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(isArabic ? 'ملخص المؤشرات' : 'KPI Summary', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [[isArabic ? 'المؤشر' : 'Metric', isArabic ? 'القيمة' : 'Value']],
        body: [
          [isArabic ? 'الدقة المتوقعة' : 'Estimated Accuracy', `${currentStats.estimatedAccuracy.toFixed(1)}%`],
          [isArabic ? 'متوسط الانحراف' : 'Average Deviation', `${currentStats.avgDeviation.toFixed(2)}%`],
          [isArabic ? 'إجمالي البنود' : 'Total Items', currentStats.total.toString()],
          [isArabic ? 'البنود المعتمدة' : 'Approved Items', currentStats.approved.toString()],
          [isArabic ? 'البنود قيد المراجعة' : 'Pending Items', currentStats.pending.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50, halign: 'center' } },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Source Distribution
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(isArabic ? 'توزيع مصادر التسعير' : 'Pricing Source Distribution', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [[isArabic ? 'المصدر' : 'Source', isArabic ? 'العدد' : 'Count', isArabic ? 'النسبة' : 'Percentage']],
        body: [
          [
            isArabic ? 'المكتبة' : 'Library', 
            currentStats.sourceDistribution.library.toString(),
            `${((currentStats.sourceDistribution.library / Math.max(currentStats.total, 1)) * 100).toFixed(1)}%`
          ],
          [
            isArabic ? 'مرجعي' : 'Reference', 
            currentStats.sourceDistribution.reference.toString(),
            `${((currentStats.sourceDistribution.reference / Math.max(currentStats.total, 1)) * 100).toFixed(1)}%`
          ],
          [
            isArabic ? 'ذكاء اصطناعي' : 'AI', 
            currentStats.sourceDistribution.ai.toString(),
            `${((currentStats.sourceDistribution.ai / Math.max(currentStats.total, 1)) * 100).toFixed(1)}%`
          ]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Confidence Distribution
      doc.text(isArabic ? 'توزيع مستويات الثقة' : 'Confidence Level Distribution', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [[isArabic ? 'مستوى الثقة' : 'Confidence', isArabic ? 'العدد' : 'Count', isArabic ? 'النسبة' : 'Percentage']],
        body: [
          [
            isArabic ? 'عالية' : 'High', 
            currentStats.confidenceDistribution.high.toString(),
            `${((currentStats.confidenceDistribution.high / Math.max(currentStats.total, 1)) * 100).toFixed(1)}%`
          ],
          [
            isArabic ? 'متوسطة' : 'Medium', 
            currentStats.confidenceDistribution.medium.toString(),
            `${((currentStats.confidenceDistribution.medium / Math.max(currentStats.total, 1)) * 100).toFixed(1)}%`
          ],
          [
            isArabic ? 'منخفضة' : 'Low', 
            currentStats.confidenceDistribution.low.toString(),
            `${((currentStats.confidenceDistribution.low / Math.max(currentStats.total, 1)) * 100).toFixed(1)}%`
          ]
        ],
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin }
      });

      // New page for top deviations
      if (currentStats.topDeviations.length > 0) {
        doc.addPage();
        yPos = margin;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(isArabic ? 'أعلى 20 بند انحرافاً' : 'Top 20 Items by Deviation', margin, yPos);
        yPos += 10;

        autoTable(doc, {
          startY: yPos,
          head: [[
            '#',
            isArabic ? 'رقم البند' : 'Item #',
            isArabic ? 'الوصف' : 'Description',
            isArabic ? 'المقترح' : 'Suggested',
            isArabic ? 'النهائي' : 'Final',
            isArabic ? 'الانحراف' : 'Deviation'
          ]],
          body: currentStats.topDeviations.map((item, index) => [
            (index + 1).toString(),
            item.item_number,
            item.description.substring(0, 40) + (item.description.length > 40 ? '...' : ''),
            item.suggested.toLocaleString(),
            item.final.toLocaleString(),
            `${item.deviation.toFixed(1)}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 60 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
      }

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `${isArabic ? 'صفحة' : 'Page'} ${i} / ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          isArabic ? 'تم إنشاؤه بواسطة نظام إدارة المشاريع' : 'Generated by PMS',
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save
      const fileName = `Pricing_Accuracy_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success(isArabic ? 'تم تحميل التقرير' : 'Report downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(isArabic ? 'خطأ في إنشاء التقرير' : 'Error generating report');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, projectId]);

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Action Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            {isArabic ? 'تقرير دقة التسعير PDF' : 'Pricing Accuracy PDF Report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={generatePDF} disabled={isLoading} className="min-w-[160px]">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isArabic ? 'جاري الإنشاء...' : 'Generating...'}
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  {isArabic ? 'تحميل PDF' : 'Download PDF'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Charts */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Source Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-5 w-5" />
                {isArabic ? 'توزيع المصادر' : 'Source Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Pie 
                  ref={sourceChartRef}
                  data={sourceChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Confidence Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5" />
                {isArabic ? 'مستويات الثقة' : 'Confidence Levels'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  ref={confidenceChartRef}
                  data={confidenceChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: { beginAtZero: true }
                    }
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {isArabic ? 'ملخص الإحصائيات' : 'Statistics Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.estimatedAccuracy.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'الدقة المتوقعة' : 'Est. Accuracy'}</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{stats.avgDeviation.toFixed(2)}%</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'متوسط الانحراف' : 'Avg Deviation'}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي البنود' : 'Total Items'}</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'معتمد' : 'Approved'}</p>
              </div>
              <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">{isArabic ? 'قيد المراجعة' : 'Pending'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PricingAccuracyPDFReport;
