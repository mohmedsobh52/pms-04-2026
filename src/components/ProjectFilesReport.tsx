import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  FileSpreadsheet,
  PieChart,
  TrendingUp,
  Folder,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { XLSX } from "@/lib/exceljs-utils";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ProjectAttachment {
  id: string;
  file_name: string;
  file_type: string | null;
  category: string | null;
  is_analyzed: boolean | null;
  analysis_result: any;
  uploaded_at: string | null;
}

interface ProjectFilesReportProps {
  attachments: ProjectAttachment[];
  projectName?: string;
}

const COLORS = ['#667eea', '#764ba2', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

export function ProjectFilesReport({ attachments, projectName }: ProjectFilesReportProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [reportName, setReportName] = useState(projectName ? `${projectName} Report` : "Project Files Report");

  // Select all analyzed files by default
  const analyzedFiles = attachments.filter(a => a.is_analyzed);

  // Calculate statistics
  const stats = useMemo(() => {
    const selectedAttachments = selectedFiles.length > 0 
      ? attachments.filter(a => selectedFiles.includes(a.id))
      : analyzedFiles;

    const categoryBreakdown: Record<string, number> = {};
    let totalItems = 0;
    let totalValue = 0;
    const allItems: any[] = [];
    const allRecommendations: string[] = [];

    selectedAttachments.forEach(file => {
      // Count by category
      const cat = file.category || 'general';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      // Extract analysis data
      if (file.analysis_result) {
        // Items
        if (file.analysis_result.items) {
          totalItems += file.analysis_result.items.length;
          file.analysis_result.items.forEach((item: any) => {
            allItems.push({
              ...item,
              source_file: file.file_name
            });
            if (item.total_price) {
              totalValue += parseFloat(item.total_price) || 0;
            }
          });
        }

        // Summary data
        if (file.analysis_result.summary?.total_value) {
          totalValue += parseFloat(file.analysis_result.summary.total_value) || 0;
        }
        if (file.analysis_result.summary?.total_items) {
          totalItems += parseInt(file.analysis_result.summary.total_items) || 0;
        }

        // Recommendations
        if (file.analysis_result.recommendations) {
          allRecommendations.push(...file.analysis_result.recommendations);
        }
      }
    });

    return {
      totalFiles: selectedAttachments.length,
      analyzedFiles: selectedAttachments.filter(a => a.is_analyzed).length,
      totalItems,
      totalValue,
      categoryBreakdown,
      allItems,
      allRecommendations: [...new Set(allRecommendations)]
    };
  }, [attachments, selectedFiles, analyzedFiles]);

  const categoryChartData = Object.entries(stats.categoryBreakdown).map(([name, value], index) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[index % COLORS.length]
  }));

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllAnalyzed = () => {
    setSelectedFiles(analyzedFiles.map(f => f.id));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Report Name", reportName],
      ["Generated Date", new Date().toLocaleDateString()],
      ["Total Files", stats.totalFiles],
      ["Analyzed Files", stats.analyzedFiles],
      ["Total Items", stats.totalItems],
      ["Total Value", stats.totalValue],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Items sheet
    if (stats.allItems.length > 0) {
      const itemsWs = XLSX.utils.json_to_sheet(stats.allItems.map((item, index) => ({
        "#": index + 1,
        "Item Number": item.item_number || "",
        "Description": item.description || "",
        "Quantity": item.quantity || "",
        "Unit": item.unit || "",
        "Unit Price": item.unit_price || "",
        "Total Price": item.total_price || "",
        "Category": item.category || "",
        "Source File": item.source_file || ""
      })));
      XLSX.utils.book_append_sheet(wb, itemsWs, "Items");
    }

    // Category breakdown sheet
    const categoryWs = XLSX.utils.json_to_sheet(categoryChartData.map(c => ({
      "Category": c.name,
      "File Count": c.value
    })));
    XLSX.utils.book_append_sheet(wb, categoryWs, "Categories");

    // Recommendations sheet
    if (stats.allRecommendations.length > 0) {
      const recsWs = XLSX.utils.json_to_sheet(stats.allRecommendations.map((rec, i) => ({
        "#": i + 1,
        "Recommendation": rec
      })));
      XLSX.utils.book_append_sheet(wb, recsWs, "Recommendations");
    }

    XLSX.writeFile(wb, `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(reportName, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    // Reset colors
    doc.setTextColor(0, 0, 0);

    // Summary section
    doc.setFontSize(14);
    doc.text("Summary", 14, 55);
    doc.setFontSize(10);
    doc.text(`Total Files: ${stats.totalFiles}`, 14, 65);
    doc.text(`Analyzed Files: ${stats.analyzedFiles}`, 14, 72);
    doc.text(`Total Items: ${stats.totalItems}`, 14, 79);
    doc.text(`Total Value: ${stats.totalValue.toLocaleString()}`, 14, 86);

    // Items table
    if (stats.allItems.length > 0) {
      doc.setFontSize(14);
      doc.text("Items", 14, 100);
      
      (doc as any).autoTable({
        startY: 105,
        head: [["#", "Description", "Qty", "Unit", "Price", "Source"]],
        body: stats.allItems.slice(0, 30).map((item, index) => [
          index + 1,
          (item.description || "").substring(0, 35),
          item.quantity || "",
          item.unit || "",
          item.total_price?.toLocaleString() || "",
          (item.source_file || "").substring(0, 20)
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [102, 126, 234] }
      });
    }

    doc.save(`${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          {isArabic ? "تقرير الملفات" : "Files Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isArabic ? "تقرير شامل من الملفات" : "Comprehensive Files Report"}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? "إنشاء تقرير شامل من جميع الملفات المحللة"
              : "Generate a comprehensive report from all analyzed files"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              {isArabic ? "نظرة عامة" : "Overview"}
            </TabsTrigger>
            <TabsTrigger value="items">
              {isArabic ? "البنود" : "Items"}
            </TabsTrigger>
            <TabsTrigger value="export">
              {isArabic ? "التصدير" : "Export"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <Folder className="w-8 h-8 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">{stats.totalFiles}</div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي الملفات" : "Total Files"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold">{stats.analyzedFiles}</div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "تم تحليلها" : "Analyzed"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold">{stats.totalItems}</div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "البنود" : "Items"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <PieChart className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                  <div className="text-2xl font-bold">
                    {stats.totalValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "القيمة الإجمالية" : "Total Value"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Distribution Chart */}
            {categoryChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {isArabic ? "توزيع الفئات" : "Category Distribution"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#667eea" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {stats.allRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    {isArabic ? "التوصيات" : "Recommendations"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {stats.allRecommendations.slice(0, 5).map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            {stats.allItems.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {isArabic ? `البنود (${stats.allItems.length})` : `Items (${stats.allItems.length})`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                          <TableHead className="text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                          <TableHead>{isArabic ? "الوحدة" : "Unit"}</TableHead>
                          <TableHead className="text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                          <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.allItems.slice(0, 50).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.item_number || index + 1}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.description}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total_price?.toLocaleString()}
                            </TableCell>
                            <TableCell className="max-w-[100px] truncate text-muted-foreground text-xs">
                              {item.source_file}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isArabic 
                      ? "لا توجد بنود مستخرجة. يرجى تحليل الملفات أولاً."
                      : "No items extracted. Please analyze files first."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            {/* Report Name */}
            <div className="space-y-2">
              <Label>{isArabic ? "اسم التقرير" : "Report Name"}</Label>
              <Input 
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder={isArabic ? "أدخل اسم التقرير" : "Enter report name"}
              />
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "الملفات المضمنة" : "Included Files"}</Label>
                <Button variant="ghost" size="sm" onClick={selectAllAnalyzed}>
                  {isArabic ? "تحديد كل المحللة" : "Select All Analyzed"}
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-3">
                {analyzedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedFiles.includes(file.id) || selectedFiles.length === 0}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                    />
                    <span className="text-sm truncate">{file.file_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex gap-2">
              <Button onClick={exportToExcel} className="flex-1 gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {isArabic ? "تصدير Excel" : "Export Excel"}
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="flex-1 gap-2">
                <Download className="w-4 h-4" />
                {isArabic ? "تصدير PDF" : "Export PDF"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
