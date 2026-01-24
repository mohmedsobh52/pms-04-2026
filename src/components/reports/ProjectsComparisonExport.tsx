import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, GitCompare, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
  status?: string;
}

interface ProjectsComparisonExportProps {
  projects: Project[];
}

export const ProjectsComparisonExport = ({ projects }: ProjectsComparisonExportProps) => {
  const { isArabic } = useLanguage();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(p => p.id));
    }
  };

  const getProjectItems = (project: Project) => {
    return project.analysis_data?.items || [];
  };

  const exportComparisonToExcel = async () => {
    if (selectedProjects.length < 2) {
      toast.error(isArabic ? "يرجى اختيار مشروعين على الأقل للمقارنة" : "Please select at least 2 projects to compare");
      return;
    }

    const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PMS - Project Management System';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet(isArabic ? 'ملخص المقارنة' : 'Comparison Summary');
    
    // Header
    summarySheet.mergeCells('A1:F1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = isArabic ? 'تقرير مقارنة الأسعار بين المشاريع' : 'Projects Price Comparison Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    summarySheet.addRow([]);
    summarySheet.addRow([isArabic ? 'تاريخ التقرير:' : 'Report Date:', new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')]);
    summarySheet.addRow([isArabic ? 'عدد المشاريع:' : 'Projects Count:', selectedProjectsData.length]);
    summarySheet.addRow([]);

    // Projects Summary Table
    const summaryHeaders = [
      isArabic ? 'المشروع' : 'Project',
      isArabic ? 'عدد البنود' : 'Items Count',
      isArabic ? 'القيمة الإجمالية' : 'Total Value',
      isArabic ? 'متوسط سعر الوحدة' : 'Avg Unit Price',
      isArabic ? 'الحالة' : 'Status'
    ];
    
    const headerRow = summarySheet.addRow(summaryHeaders);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    selectedProjectsData.forEach(project => {
      const items = getProjectItems(project);
      const totalValue = project.analysis_data?.summary?.total_value || 
        items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      const avgUnitPrice = items.length > 0 
        ? items.reduce((sum: number, item: any) => sum + (item.unit_price || 0), 0) / items.length 
        : 0;
      
      const statusMap: Record<string, { ar: string; en: string }> = {
        draft: { ar: 'مسودة', en: 'Draft' },
        in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
        completed: { ar: 'مكتمل', en: 'Completed' },
        suspended: { ar: 'معلق', en: 'Suspended' }
      };
      const status = statusMap[project.status || 'draft'] || statusMap.draft;

      summarySheet.addRow([
        project.name,
        items.length,
        totalValue.toFixed(2),
        avgUnitPrice.toFixed(2),
        isArabic ? status.ar : status.en
      ]);
    });

    // Set column widths
    summarySheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 15 }
    ];

    // Detailed Comparison Sheet
    const detailSheet = workbook.addWorksheet(isArabic ? 'مقارنة تفصيلية' : 'Detailed Comparison');

    // Collect all unique items across projects
    const allItems = new Map<string, { description: string; prices: Record<string, number> }>();
    
    selectedProjectsData.forEach(project => {
      const items = getProjectItems(project);
      items.forEach((item: any) => {
        const key = item.item_number || item.description || `item-${Math.random()}`;
        if (!allItems.has(key)) {
          allItems.set(key, {
            description: item.description || key,
            prices: {}
          });
        }
        allItems.get(key)!.prices[project.id] = item.unit_price || 0;
      });
    });

    // Detail headers
    const detailHeaders = [
      isArabic ? 'رقم البند' : 'Item No.',
      isArabic ? 'الوصف' : 'Description',
      ...selectedProjectsData.map(p => p.name),
      isArabic ? 'أقل سعر' : 'Min Price',
      isArabic ? 'أعلى سعر' : 'Max Price',
      isArabic ? 'الفرق %' : 'Variance %'
    ];

    const detailHeaderRow = detailSheet.addRow(detailHeaders);
    detailHeaderRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    let rowIndex = 1;
    allItems.forEach((itemData, key) => {
      const prices = selectedProjectsData.map(p => itemData.prices[p.id] || 0);
      const minPrice = Math.min(...prices.filter(p => p > 0));
      const maxPrice = Math.max(...prices);
      const variance = minPrice > 0 ? ((maxPrice - minPrice) / minPrice * 100).toFixed(1) : '0';

      detailSheet.addRow([
        rowIndex++,
        itemData.description,
        ...prices.map(p => p > 0 ? p.toFixed(2) : '-'),
        minPrice > 0 ? minPrice.toFixed(2) : '-',
        maxPrice > 0 ? maxPrice.toFixed(2) : '-',
        `${variance}%`
      ]);
    });

    // Set column widths for detail sheet
    detailSheet.columns = [
      { width: 10 },
      { width: 40 },
      ...selectedProjectsData.map(() => ({ width: 15 })),
      { width: 12 },
      { width: 12 },
      { width: 12 }
    ];

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isArabic ? 'مقارنة_الأسعار' : 'Price_Comparison'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(isArabic ? 'تم تصدير تقرير المقارنة بنجاح' : 'Comparison report exported successfully');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <GitCompare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">
              {isArabic ? 'مقارنة الأسعار بين المشاريع' : 'Projects Price Comparison'}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isArabic 
                ? 'اختر مشروعين أو أكثر لتصدير تقرير مقارنة الأسعار' 
                : 'Select 2 or more projects to export price comparison report'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Select All */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedProjects.length === projects.length && projects.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-sm font-medium">
              {isArabic ? 'تحديد الكل' : 'Select All'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {isArabic 
              ? `${selectedProjects.length} من ${projects.length} محدد` 
              : `${selectedProjects.length} of ${projects.length} selected`}
          </span>
        </div>

        {/* Projects List */}
        <div className="max-h-48 overflow-y-auto space-y-2">
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              {isArabic ? 'لا توجد مشاريع متاحة' : 'No projects available'}
            </p>
          ) : (
            projects.map(project => {
              const items = getProjectItems(project);
              const totalValue = project.analysis_data?.summary?.total_value || 
                items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);

              return (
                <div 
                  key={project.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleProject(project.id)}
                >
                  <Checkbox 
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} {isArabic ? 'بند' : 'items'} • {totalValue.toLocaleString()} {isArabic ? 'ر.س' : 'SAR'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Export Button */}
        <Button 
          onClick={exportComparisonToExcel}
          disabled={selectedProjects.length < 2}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isArabic ? 'تصدير تقرير المقارنة' : 'Export Comparison Report'}
        </Button>

        {selectedProjects.length === 1 && (
          <p className="text-center text-destructive text-xs">
            {isArabic ? 'يرجى اختيار مشروع آخر على الأقل للمقارنة' : 'Please select at least one more project to compare'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};