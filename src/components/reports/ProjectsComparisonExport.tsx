import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText, CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useLanguage } from "@/hooks/useLanguage";
import { getStatusInfo } from "@/lib/project-constants";

interface Project {
  id: string;
  name: string;
  file_name?: string;
  analysis_data: any;
  status?: string;
}

interface ProjectsComparisonExportProps {
  projects: Project[];
}

export const ProjectsComparisonExport = React.forwardRef<HTMLDivElement, ProjectsComparisonExportProps>(
  ({ projects }, ref) => {
    const { isArabic } = useLanguage();
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);

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

    const selectedProjectsData = useMemo(() => {
      return projects.filter(p => selectedProjects.includes(p.id));
    }, [projects, selectedProjects]);

    const getProjectItems = (project: Project) => {
      return project.analysis_data?.items || [];
    };

    const getProjectTotalValue = (project: Project) => {
      return project.analysis_data?.summary?.total_value || 
             project.analysis_data?.totalValue || 
             getProjectItems(project).reduce((sum: number, item: any) => 
               sum + (item.totalPrice || item.total_price || 0), 0);
    };

    const exportComparisonToExcel = async () => {
      if (selectedProjectsData.length < 2) {
        toast.error(isArabic ? "يرجى اختيار مشروعين على الأقل" : "Please select at least 2 projects");
        return;
      }

      setExportingExcel(true);
      try {
        const workbook = new ExcelJS.Workbook();
        
        // Summary Sheet
        const summarySheet = workbook.addWorksheet(isArabic ? "ملخص المقارنة" : "Comparison Summary");
        
        summarySheet.columns = [
          { header: isArabic ? "المشروع" : "Project", key: "name", width: 30 },
          { header: isArabic ? "عدد البنود" : "Items Count", key: "items", width: 15 },
          { header: isArabic ? "القيمة الإجمالية" : "Total Value", key: "total", width: 20 },
          { header: isArabic ? "متوسط سعر الوحدة" : "Avg Unit Price", key: "avg", width: 20 },
          { header: isArabic ? "الحالة" : "Status", key: "status", width: 15 },
        ];

        selectedProjectsData.forEach(project => {
          const items = getProjectItems(project);
          const totalValue = getProjectTotalValue(project);
          const avgUnitPrice = items.length > 0 
            ? items.reduce((sum: number, item: any) => sum + (item.unitPrice || item.unit_price || 0), 0) / items.length 
            : 0;
          const statusInfo = getStatusInfo(project.status);

          summarySheet.addRow({
            name: project.name,
            items: items.length,
            total: totalValue.toFixed(2),
            avg: avgUnitPrice.toFixed(2),
            status: isArabic ? statusInfo.label : statusInfo.label_en,
          });
        });

        // Detailed Comparison Sheet
        const detailSheet = workbook.addWorksheet(isArabic ? "المقارنة التفصيلية" : "Detailed Comparison");
        
        const headers = [
          isArabic ? "#" : "#",
          isArabic ? "الوصف" : "Description",
          ...selectedProjectsData.map(p => p.name),
          isArabic ? "أقل سعر" : "Min Price",
          isArabic ? "أعلى سعر" : "Max Price",
          isArabic ? "الفرق %" : "Variance %",
        ];

        detailSheet.addRow(headers);

        // Collect all unique items
        const allItems = new Map<string, { description: string; prices: Map<string, number> }>();
        
        selectedProjectsData.forEach(project => {
          getProjectItems(project).forEach((item: any) => {
            const key = item.itemNo || item.item_number || item.description;
            const description = item.description || item.itemDescription || key;
            const price = item.unitPrice || item.unit_price || 0;
            
            if (!allItems.has(key)) {
              allItems.set(key, { description, prices: new Map() });
            }
            allItems.get(key)!.prices.set(project.id, price);
          });
        });

        let rowNum = 1;
        allItems.forEach((itemData, key) => {
          const prices = selectedProjectsData.map(p => itemData.prices.get(p.id) || 0);
          const nonZeroPrices = prices.filter(p => p > 0);
          const minPrice = nonZeroPrices.length > 0 ? Math.min(...nonZeroPrices) : 0;
          const maxPrice = Math.max(...prices);
          const variance = minPrice > 0 ? ((maxPrice - minPrice) / minPrice * 100).toFixed(1) : "0";

          detailSheet.addRow([
            rowNum++,
            itemData.description,
            ...prices.map(p => p.toFixed(2)),
            minPrice.toFixed(2),
            maxPrice.toFixed(2),
            `${variance}%`,
          ]);
        });

        // Style headers
        [summarySheet, detailSheet].forEach(sheet => {
          const headerRow = sheet.getRow(1);
          headerRow.font = { bold: true };
          headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
          };
          headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${isArabic ? "مقارنة_الأسعار" : "price_comparison"}_${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
      } catch (error) {
        console.error("Error exporting to Excel:", error);
        toast.error(isArabic ? "خطأ في تصدير التقرير" : "Error exporting report");
      } finally {
        setExportingExcel(false);
      }
    };

    const exportComparisonToPDF = async () => {
      if (selectedProjectsData.length < 2) {
        toast.error(isArabic ? "يرجى اختيار مشروعين على الأقل" : "Please select at least 2 projects");
        return;
      }

      setExportingPDF(true);
      try {
        const doc = new jsPDF({ orientation: "landscape" });
        
        // Title
        doc.setFontSize(18);
        doc.text(
          "Price Comparison Report",
          doc.internal.pageSize.width / 2,
          15,
          { align: "center" }
        );

        // Report info
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 25);
        doc.text(`Projects: ${selectedProjectsData.length}`, 14, 32);

        // Generate chart data
        const chartData = selectedProjectsData.map(p => ({
          name: p.name.substring(0, 20),
          value: getProjectTotalValue(p),
        }));

        // Draw simple bar chart
        const chartStartY = 45;
        const chartHeight = 50;
        const barWidth = Math.min(40, (doc.internal.pageSize.width - 40) / chartData.length - 10);
        const maxValue = Math.max(...chartData.map(d => d.value));
        const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

        doc.setFontSize(12);
        doc.text("Total Value Comparison", 14, chartStartY - 5);

        chartData.forEach((item, i) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
          const x = 20 + i * (barWidth + 15);
          const y = chartStartY + chartHeight - barHeight;
          
          // Draw bar
          const color = colors[i % colors.length];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          doc.setFillColor(r, g, b);
          doc.rect(x, y, barWidth, barHeight, "F");
          
          // Project name
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0);
          doc.text(item.name, x + barWidth / 2, chartStartY + chartHeight + 8, { align: "center" });
          
          // Value on top
          doc.setFontSize(6);
          doc.text(item.value.toLocaleString(), x + barWidth / 2, y - 2, { align: "center" });
        });

        // Summary table
        const summaryData = selectedProjectsData.map(project => {
          const items = getProjectItems(project);
          const totalValue = getProjectTotalValue(project);
          const avgUnitPrice = items.length > 0 
            ? items.reduce((sum: number, item: any) => sum + (item.unitPrice || item.unit_price || 0), 0) / items.length 
            : 0;
          const statusInfo = getStatusInfo(project.status);

          return [
            project.name,
            items.length.toString(),
            totalValue.toLocaleString(),
            avgUnitPrice.toFixed(2),
            statusInfo.label_en,
          ];
        });

        autoTable(doc, {
          startY: chartStartY + chartHeight + 25,
          head: [["Project", "Items", "Total Value", "Avg Unit Price", "Status"]],
          body: summaryData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [68, 114, 196] },
        });

        // New page for detailed comparison
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Detailed Price Comparison", 14, 15);

        // Collect all items
        const allItems = new Map<string, { description: string; prices: Map<string, number> }>();
        
        selectedProjectsData.forEach(project => {
          getProjectItems(project).forEach((item: any) => {
            const key = item.itemNo || item.item_number || item.description;
            const description = item.description || item.itemDescription || key;
            const price = item.unitPrice || item.unit_price || 0;
            
            if (!allItems.has(key)) {
              allItems.set(key, { description, prices: new Map() });
            }
            allItems.get(key)!.prices.set(project.id, price);
          });
        });

        const detailHeaders = [
          "#",
          "Description",
          ...selectedProjectsData.map(p => p.name.substring(0, 15)),
          "Min",
          "Max",
          "Var %",
        ];

        const detailData: (string | number)[][] = [];
        let rowNum = 1;
        
        allItems.forEach((itemData) => {
          const prices = selectedProjectsData.map(p => itemData.prices.get(p.id) || 0);
          const nonZeroPrices = prices.filter(p => p > 0);
          const minPrice = nonZeroPrices.length > 0 ? Math.min(...nonZeroPrices) : 0;
          const maxPrice = Math.max(...prices);
          const variance = minPrice > 0 ? ((maxPrice - minPrice) / minPrice * 100).toFixed(1) : "0";

          detailData.push([
            rowNum++,
            itemData.description.substring(0, 40),
            ...prices.map(p => p.toFixed(0)),
            minPrice.toFixed(0),
            maxPrice.toFixed(0),
            `${variance}%`,
          ]);
        });

        autoTable(doc, {
          startY: 25,
          head: [detailHeaders],
          body: detailData.slice(0, 50), // Limit rows for PDF
          styles: { fontSize: 6, cellPadding: 1 },
          headStyles: { fillColor: [68, 114, 196] },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 50 },
          },
        });

        if (detailData.length > 50) {
          doc.setFontSize(8);
          doc.text(`... and ${detailData.length - 50} more items (see Excel export for full data)`, 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`${isArabic ? "مقارنة_الأسعار" : "price_comparison"}_${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
      } catch (error) {
        console.error("Error exporting to PDF:", error);
        toast.error(isArabic ? "خطأ في تصدير التقرير" : "Error exporting report");
      } finally {
        setExportingPDF(false);
      }
    };

    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            {isArabic ? "مقارنة أسعار المشاريع" : "Projects Price Comparison"}
          </CardTitle>
          <CardDescription>
            {isArabic 
              ? "اختر مشروعين أو أكثر لمقارنة الأسعار وتصدير التقرير"
              : "Select two or more projects to compare prices and export report"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedProjects.length === projects.length && projects.length > 0}
                onCheckedChange={selectAll}
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                {isArabic ? "تحديد الكل" : "Select All"}
              </label>
            </div>
            <Badge variant="secondary">
              {selectedProjects.length} / {projects.length}
            </Badge>
          </div>

          <ScrollArea className="h-64 rounded-md border p-2">
            <div className="space-y-2">
              {projects.map(project => {
                const items = getProjectItems(project);
                const totalValue = getProjectTotalValue(project);
                const statusInfo = getStatusInfo(project.status);

                return (
                  <div
                    key={project.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProjects.includes(project.id) 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() => toggleProject(project.id)}
                  >
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={() => toggleProject(project.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{items.length} {isArabic ? "بند" : "items"}</span>
                        <span>•</span>
                        <span>{totalValue.toLocaleString()}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor} mr-1`} />
                      {isArabic ? statusInfo.label : statusInfo.label_en}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedProjects.length === 1 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {isArabic 
                ? "⚠️ يرجى اختيار مشروع آخر على الأقل للمقارنة"
                : "⚠️ Please select at least one more project for comparison"
              }
            </p>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={exportComparisonToExcel} 
              disabled={selectedProjects.length < 2 || exportingExcel}
              className="flex-1"
            >
              {exportingExcel ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              {isArabic ? "تصدير Excel" : "Export Excel"}
            </Button>
            <Button 
              onClick={exportComparisonToPDF} 
              disabled={selectedProjects.length < 2 || exportingPDF}
              variant="outline"
              className="flex-1"
            >
              {exportingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isArabic ? "تصدير PDF" : "Export PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ProjectsComparisonExport.displayName = "ProjectsComparisonExport";
