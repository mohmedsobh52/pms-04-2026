import { useState } from 'react';
import { FileText, Download, Filter, Calendar, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { useAnalysisData } from '@/hooks/useAnalysisData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { XLSX } from '@/lib/exceljs-utils';

interface ReportType {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: any;
  color: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'cost-summary',
    name: 'Cost Summary Report',
    nameAr: 'تقرير ملخص التكاليف',
    description: 'Overall cost breakdown and analysis',
    descriptionAr: 'تحليل شامل لتوزيع التكاليف',
    icon: DollarSign,
    color: 'text-green-600',
  },
  {
    id: 'progress-report',
    name: 'Progress Report',
    nameAr: 'تقرير التقدم',
    description: 'Project progress and timeline',
    descriptionAr: 'تقدم المشروع والجدول الزمني',
    icon: TrendingUp,
    color: 'text-blue-600',
  },
  {
    id: 'resource-utilization',
    name: 'Resource Utilization',
    nameAr: 'استغلال الموارد',
    description: 'Resource allocation and usage',
    descriptionAr: 'تخصيص واستخدام الموارد',
    icon: Users,
    color: 'text-purple-600',
  },
  {
    id: 'material-report',
    name: 'Material Report',
    nameAr: 'تقرير المواد',
    description: 'Material quantities and costs',
    descriptionAr: 'كميات وتكاليف المواد',
    icon: Package,
    color: 'text-orange-600',
  },
];

export const AdvancedReports = () => {
  const { language } = useLanguage();
  const { analysisData } = useAnalysisData();
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');

  const generatePDFReport = (reportType: string) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(language === 'ar' ? 'تقرير المشروع' : 'Project Report', 20, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Add report type
    const report = reportTypes.find(r => r.id === reportType);
    if (report) {
      doc.setFontSize(14);
      doc.text(language === 'ar' ? report.nameAr : report.name, 20, 40);
    }

    // Add data table
    if (analysisData?.items && analysisData.items.length > 0) {
      autoTable(doc, {
        startY: 50,
        head: [[
          language === 'ar' ? 'الرقم' : '#',
          language === 'ar' ? 'الوصف' : 'Description',
          language === 'ar' ? 'الكمية' : 'Quantity',
          language === 'ar' ? 'الوحدة' : 'Unit',
          language === 'ar' ? 'سعر الوحدة' : 'Unit Price',
          language === 'ar' ? 'الإجمالي' : 'Total',
        ]],
        body: analysisData.items.map((item, idx) => [
          idx + 1,
          item.description || '-',
          item.quantity || '-',
          item.unit || '-',
          item.unitPrice || '-',
          item.total || '-',
        ]),
      });
    }

    // Save PDF
    doc.save(`${reportType}-${Date.now()}.pdf`);
  };

  const generateExcelReport = (reportType: string) => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      alert(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      analysisData.items.map((item, idx) => ({
        [language === 'ar' ? 'الرقم' : 'Number']: idx + 1,
        [language === 'ar' ? 'الوصف' : 'Description']: item.description,
        [language === 'ar' ? 'الكمية' : 'Quantity']: item.quantity,
        [language === 'ar' ? 'الوحدة' : 'Unit']: item.unit,
        [language === 'ar' ? 'سعر الوحدة' : 'Unit Price']: item.unitPrice,
        [language === 'ar' ? 'الإجمالي' : 'Total']: item.total,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${reportType}-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar'
              ? 'إنشاء وتصدير تقارير مفصلة'
              : 'Generate and export detailed reports'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'ar' ? 'الكل' : 'All Time'}
              </SelectItem>
              <SelectItem value="month">
                {language === 'ar' ? 'هذا الشهر' : 'This Month'}
              </SelectItem>
              <SelectItem value="quarter">
                {language === 'ar' ? 'هزا الربع' : 'This Quarter'}
              </SelectItem>
              <SelectItem value="year">
                {language === 'ar' ? 'هذه السنة' : 'This Year'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-muted`}>
                      <Icon className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {language === 'ar' ? report.nameAr : report.name}
                      </CardTitle>
                      <CardDescription>
                        {language === 'ar' ? report.descriptionAr : report.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => generatePDFReport(report.id)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => generateExcelReport(report.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};