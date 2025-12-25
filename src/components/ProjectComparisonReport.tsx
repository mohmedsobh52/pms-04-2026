import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, TrendingUp, TrendingDown, Minus, Download, Printer, GitCompare, Loader2, Save, FolderOpen, Trash2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SavedProject {
  id: string;
  name: string;
  created_at: string;
  analysis_data: any;
  wbs_data: any;
}

interface SavedComparisonReport {
  id: string;
  name: string;
  description: string | null;
  project_ids: string[];
  comparison_data: any;
  created_at: string;
  updated_at: string;
}

interface ProjectComparisonReportProps {
  isArabic?: boolean;
}

export function ProjectComparisonReport({ isArabic: propIsArabic }: ProjectComparisonReportProps) {
  const { user } = useAuth();
  const { isArabic: contextIsArabic } = useLanguage();
  const isArabic = propIsArabic ?? contextIsArabic;
  
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"new" | "saved">("new");
  const [savedReports, setSavedReports] = useState<SavedComparisonReport[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchProjects();
      fetchSavedReports();
    }
  }, [isOpen, user]);

  const fetchSavedReports = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("comparison_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedReports((data as SavedComparisonReport[]) || []);
    } catch (error) {
      console.error("Error fetching saved reports:", error);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error(isArabic ? "خطأ في جلب المشاريع" : "Error fetching projects");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      }
      if (prev.length >= 5) {
        toast.warning(isArabic ? "الحد الأقصى 5 مشاريع" : "Maximum 5 projects");
        return prev;
      }
      return [...prev, projectId];
    });
  };

  const generateComparison = () => {
    if (selectedProjects.length < 2) {
      toast.warning(isArabic ? "اختر مشروعين على الأقل" : "Select at least 2 projects");
      return;
    }

    const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
    
    const comparison = selectedProjectsData.map(project => {
      const analysisData = project.analysis_data as any;
      const items = analysisData?.items || [];
      const summary = analysisData?.summary || {};
      
      // Calculate metrics
      const totalItems = items.length;
      const totalValue = summary.total_value || items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      const avgUnitPrice = totalItems > 0 
        ? items.reduce((sum: number, item: any) => sum + (item.unit_price || 0), 0) / totalItems 
        : 0;
      const categories = [...new Set(items.map((item: any) => item.category || "غير مصنف"))];
      const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      
      // Category breakdown
      const categoryBreakdown = categories.map((cat: string) => {
        const catItems = items.filter((item: any) => (item.category || "غير مصنف") === cat);
        const catTotal = catItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
        return { category: cat, total: catTotal, count: catItems.length };
      });

      return {
        id: project.id,
        name: project.name,
        createdAt: project.created_at,
        totalItems,
        totalValue,
        avgUnitPrice,
        categories: categories.length,
        totalQuantity,
        categoryBreakdown,
        currency: summary.currency || "SAR",
      };
    });

    // Calculate differences
    const baseProject = comparison[0];
    const withDifferences = comparison.map((project, index) => ({
      ...project,
      valueDiff: index === 0 ? 0 : ((project.totalValue - baseProject.totalValue) / (baseProject.totalValue || 1)) * 100,
      itemsDiff: index === 0 ? 0 : project.totalItems - baseProject.totalItems,
      avgPriceDiff: index === 0 ? 0 : ((project.avgUnitPrice - baseProject.avgUnitPrice) / (baseProject.avgUnitPrice || 1)) * 100,
    }));

    setComparisonData({
      projects: withDifferences,
      chartData: withDifferences.map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
        fullName: p.name,
        [isArabic ? "إجمالي القيمة" : "Total Value"]: p.totalValue,
        [isArabic ? "عدد البنود" : "Items"]: p.totalItems * 1000, // Scale for visibility
        [isArabic ? "متوسط السعر" : "Avg Price"]: p.avgUnitPrice,
      })),
      radarData: [
        { metric: isArabic ? "القيمة" : "Value", ...Object.fromEntries(withDifferences.map(p => [p.name.substring(0, 10), Math.min(p.totalValue / 10000, 100)])) },
        { metric: isArabic ? "البنود" : "Items", ...Object.fromEntries(withDifferences.map(p => [p.name.substring(0, 10), Math.min(p.totalItems, 100)])) },
        { metric: isArabic ? "الفئات" : "Categories", ...Object.fromEntries(withDifferences.map(p => [p.name.substring(0, 10), p.categories * 10])) },
        { metric: isArabic ? "الكمية" : "Quantity", ...Object.fromEntries(withDifferences.map(p => [p.name.substring(0, 10), Math.min(p.totalQuantity / 100, 100)])) },
      ],
    });
    setLoadedReportId(null);
  };

  const saveComparisonReport = async () => {
    if (!user || !comparisonData || !reportName.trim()) {
      toast.error(isArabic ? "يرجى إدخال اسم التقرير" : "Please enter report name");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("comparison_reports")
        .insert({
          user_id: user.id,
          name: reportName.trim(),
          description: reportDescription.trim() || null,
          project_ids: selectedProjects,
          comparison_data: comparisonData,
        });

      if (error) throw error;

      toast.success(isArabic ? "تم حفظ التقرير بنجاح" : "Report saved successfully");
      setShowSaveDialog(false);
      setReportName("");
      setReportDescription("");
      fetchSavedReports();
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error(isArabic ? "خطأ في حفظ التقرير" : "Error saving report");
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedReport = (report: SavedComparisonReport) => {
    setComparisonData(report.comparison_data);
    setSelectedProjects(report.project_ids);
    setLoadedReportId(report.id);
    setActiveTab("new");
    toast.success(isArabic ? "تم تحميل التقرير" : "Report loaded");
  };

  const deleteSavedReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("comparison_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;

      toast.success(isArabic ? "تم حذف التقرير" : "Report deleted");
      fetchSavedReports();
      
      if (loadedReportId === reportId) {
        setLoadedReportId(null);
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error(isArabic ? "خطأ في حذف التقرير" : "Error deleting report");
    }
  };

  const formatCurrency = (value: number, currency: string = "SAR") => {
    return `${value.toLocaleString()} ${currency}`;
  };

  const getDiffBadge = (diff: number, isPercentage: boolean = true) => {
    if (diff === 0) return null;
    const isPositive = diff > 0;
    const formattedDiff = isPercentage ? `${diff.toFixed(1)}%` : diff.toString();
    
    return (
      <Badge variant={isPositive ? "default" : "secondary"} className={`text-xs ${isPositive ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
        {isPositive ? <TrendingUp className="w-3 h-3 me-1" /> : <TrendingDown className="w-3 h-3 me-1" />}
        {isPositive ? "+" : ""}{formattedDiff}
      </Badge>
    );
  };

  const exportToPDF = () => {
    if (!comparisonData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text(isArabic ? "تقرير مقارنة المشاريع" : "Project Comparison Report", pageWidth / 2, 20, { align: "center" });

    // Date
    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString("en-US"), pageWidth / 2, 28, { align: "center" });

    // Comparison Table
    autoTable(doc, {
      startY: 35,
      head: [[
        isArabic ? "المشروع" : "Project",
        isArabic ? "البنود" : "Items",
        isArabic ? "الفئات" : "Categories",
        isArabic ? "إجمالي القيمة" : "Total Value",
        isArabic ? "متوسط السعر" : "Avg Price",
        isArabic ? "الفرق %" : "Diff %"
      ]],
      body: comparisonData.projects.map((p: any) => [
        p.name,
        p.totalItems.toString(),
        p.categories.toString(),
        formatCurrency(p.totalValue, p.currency),
        formatCurrency(Math.round(p.avgUnitPrice), p.currency),
        p.valueDiff === 0 ? "-" : `${p.valueDiff > 0 ? "+" : ""}${p.valueDiff.toFixed(1)}%`
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    doc.save("project-comparison-report.pdf");
    toast.success(isArabic ? "تم تصدير التقرير" : "Report exported");
  };

  const printReport = () => {
    if (!comparisonData) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isArabic ? "تقرير مقارنة المشاريع" : "Project Comparison Report"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
          h1 { text-align: center; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; }
          th { background-color: #3b82f6; color: white; }
          .positive { color: #ef4444; }
          .negative { color: #22c55e; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${isArabic ? "تقرير مقارنة المشاريع" : "Project Comparison Report"}</h1>
        <p style="text-align: center; color: #666;">${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}</p>
        <table>
          <thead>
            <tr>
              <th>${isArabic ? "المشروع" : "Project"}</th>
              <th>${isArabic ? "البنود" : "Items"}</th>
              <th>${isArabic ? "الفئات" : "Categories"}</th>
              <th>${isArabic ? "إجمالي القيمة" : "Total Value"}</th>
              <th>${isArabic ? "متوسط السعر" : "Avg Price"}</th>
              <th>${isArabic ? "الفرق" : "Difference"}</th>
            </tr>
          </thead>
          <tbody>
            ${comparisonData.projects.map((p: any) => `
              <tr>
                <td>${p.name}</td>
                <td>${p.totalItems}</td>
                <td>${p.categories}</td>
                <td>${formatCurrency(p.totalValue, p.currency)}</td>
                <td>${formatCurrency(Math.round(p.avgUnitPrice), p.currency)}</td>
                <td class="${p.valueDiff > 0 ? 'positive' : 'negative'}">${p.valueDiff === 0 ? '-' : `${p.valueDiff > 0 ? '+' : ''}${p.valueDiff.toFixed(1)}%`}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const CHART_COLORS = [
    "hsl(221, 83%, 53%)",
    "hsl(142, 71%, 45%)",
    "hsl(24, 95%, 53%)",
    "hsl(271, 81%, 56%)",
    "hsl(340, 82%, 52%)",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitCompare className="w-4 h-4" />
          {isArabic ? "مقارنة المشاريع" : "Compare Projects"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {isArabic ? "تقرير مقارنة المشاريع" : "Project Comparison Report"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[75vh]">
          {!comparisonData ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "saved")} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mb-4">
                <TabsTrigger value="new" className="gap-2">
                  <GitCompare className="w-4 h-4" />
                  {isArabic ? "مقارنة جديدة" : "New Comparison"}
                </TabsTrigger>
                <TabsTrigger value="saved" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  {isArabic ? "التقارير المحفوظة" : "Saved Reports"}
                  {savedReports.length > 0 && (
                    <Badge variant="secondary" className="text-xs ms-1">{savedReports.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="flex-1 overflow-hidden mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  {isArabic ? "اختر المشاريع للمقارنة (2-5 مشاريع):" : "Select projects to compare (2-5 projects):"}
                </p>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
                  </div>
                ) : (
                  <ScrollArea className="h-[45vh] pe-4">
                    <div className="space-y-2">
                      {projects.map(project => {
                        const analysisData = project.analysis_data as any;
                        const itemsCount = analysisData?.items?.length || 0;
                        const totalValue = analysisData?.summary?.total_value || 0;
                        
                        return (
                          <div
                            key={project.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                              selectedProjects.includes(project.id) 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => toggleProject(project.id)}
                          >
                            <Checkbox
                              checked={selectedProjects.includes(project.id)}
                              onCheckedChange={() => toggleProject(project.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{project.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(project.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                              </p>
                            </div>
                            <div className="text-end">
                              <Badge variant="secondary">{itemsCount} {isArabic ? "بند" : "items"}</Badge>
                              {totalValue > 0 && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {totalValue.toLocaleString()} SAR
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedProjects.length} {isArabic ? "مشاريع مختارة" : "projects selected"}
                  </span>
                  <Button 
                    onClick={generateComparison}
                    disabled={selectedProjects.length < 2}
                    className="gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {isArabic ? "إنشاء المقارنة" : "Generate Comparison"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="flex-1 overflow-hidden mt-0">
                {savedReports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{isArabic ? "لا توجد تقارير محفوظة" : "No saved reports"}</p>
                    <p className="text-sm mt-2">{isArabic ? "قم بإنشاء مقارنة واحفظها للرجوع إليها لاحقاً" : "Create a comparison and save it for later reference"}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[55vh] pe-4">
                    <div className="space-y-3">
                      {savedReports.map(report => (
                        <div
                          key={report.id}
                          className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{report.name}</h4>
                              {report.description && (
                                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(report.created_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {report.project_ids.length} {isArabic ? "مشاريع" : "projects"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => loadSavedReport(report)}
                                className="gap-1"
                              >
                                <FolderOpen className="w-4 h-4" />
                                {isArabic ? "فتح" : "Open"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSavedReport(report.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-6 pe-4">
                {/* Actions */}
                <div className="flex justify-between items-center">
                  <Button variant="ghost" size="sm" onClick={() => setComparisonData(null)}>
                    {isArabic ? "← اختيار مشاريع أخرى" : "← Select different projects"}
                  </Button>
                  <div className="flex gap-2">
                    {!loadedReportId && (
                      <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} className="gap-2">
                        <Save className="w-4 h-4" />
                        {isArabic ? "حفظ التقرير" : "Save Report"}
                      </Button>
                    )}
                    {loadedReportId && (
                      <Badge variant="secondary" className="h-9 px-3 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {isArabic ? "تقرير محفوظ" : "Saved Report"}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={printReport} className="gap-2">
                      <Printer className="w-4 h-4" />
                      {isArabic ? "طباعة" : "Print"}
                    </Button>
                    <Button variant="default" size="sm" onClick={exportToPDF} className="gap-2">
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                  </div>
                </div>

                {/* Save Dialog */}
                {showSaveDialog && (
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        {isArabic ? "حفظ تقرير المقارنة" : "Save Comparison Report"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isArabic ? "اسم التقرير *" : "Report Name *"}</label>
                        <Input
                          value={reportName}
                          onChange={(e) => setReportName(e.target.value)}
                          placeholder={isArabic ? "مثال: مقارنة مشاريع 2024" : "e.g., 2024 Projects Comparison"}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isArabic ? "الوصف (اختياري)" : "Description (optional)"}</label>
                        <Textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          placeholder={isArabic ? "أضف ملاحظات أو وصف للتقرير..." : "Add notes or description..."}
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                          {isArabic ? "إلغاء" : "Cancel"}
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={saveComparisonReport}
                          disabled={isSaving || !reportName.trim()}
                          className="gap-2"
                        >
                          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                          <Save className="w-4 h-4" />
                          {isArabic ? "حفظ" : "Save"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comparisonData.projects.map((project: any, index: number) => (
                    <Card key={project.id} className={index === 0 ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="truncate">{project.name}</span>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              {isArabic ? "المرجع" : "Base"}
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(project.createdAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{isArabic ? "البنود" : "Items"}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{project.totalItems}</span>
                            {index > 0 && getDiffBadge(project.itemsDiff, false)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{isArabic ? "الفئات" : "Categories"}</span>
                          <span className="font-semibold">{project.categories}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{isArabic ? "إجمالي القيمة" : "Total Value"}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">
                              {formatCurrency(project.totalValue, project.currency)}
                            </span>
                            {index > 0 && getDiffBadge(project.valueDiff)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{isArabic ? "متوسط السعر" : "Avg Price"}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {formatCurrency(Math.round(project.avgUnitPrice), project.currency)}
                            </span>
                            {index > 0 && getDiffBadge(project.avgPriceDiff)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {isArabic ? "مقارنة القيم" : "Value Comparison"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number, name: string) => {
                              if (name.includes("Items") || name.includes("البنود")) {
                                return [Math.round(value / 1000), name];
                              }
                              return [value.toLocaleString(), name];
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey={isArabic ? "إجمالي القيمة" : "Total Value"} 
                            fill={CHART_COLORS[0]} 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {isArabic ? "ملخص المقارنة" : "Comparison Summary"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start p-2">{isArabic ? "المشروع" : "Project"}</th>
                            <th className="text-center p-2">{isArabic ? "البنود" : "Items"}</th>
                            <th className="text-center p-2">{isArabic ? "الفئات" : "Categories"}</th>
                            <th className="text-end p-2">{isArabic ? "إجمالي القيمة" : "Total Value"}</th>
                            <th className="text-end p-2">{isArabic ? "متوسط السعر" : "Avg Price"}</th>
                            <th className="text-center p-2">{isArabic ? "الفرق عن المرجع" : "Diff from Base"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.projects.map((project: any, index: number) => (
                            <tr key={project.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{project.name}</td>
                              <td className="p-2 text-center">{project.totalItems}</td>
                              <td className="p-2 text-center">{project.categories}</td>
                              <td className="p-2 text-end font-semibold">
                                {formatCurrency(project.totalValue, project.currency)}
                              </td>
                              <td className="p-2 text-end">
                                {formatCurrency(Math.round(project.avgUnitPrice), project.currency)}
                              </td>
                              <td className="p-2 text-center">
                                {index === 0 ? (
                                  <Badge variant="outline">{isArabic ? "المرجع" : "Base"}</Badge>
                                ) : (
                                  getDiffBadge(project.valueDiff)
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
