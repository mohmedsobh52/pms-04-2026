import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  FileText,
  Combine,
  CalendarClock,
  Download,
  Loader2,
  Paperclip,
  Mail,
  Clock,
  Play,
  Trash2,
  FolderOpen,
  CheckCircle2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { XLSX } from "@/lib/exceljs-utils";

interface Project {
  id: string;
  name: string;
  analysis_data: any;
  file_name?: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  is_analyzed: boolean | null;
  uploaded_at: string;
}

interface ScheduledReport {
  id: string;
  report_name: string;
  report_type: string;
  schedule_type: string;
  recipient_emails: string[];
  is_active: boolean | null;
  last_sent_at: string | null;
  next_scheduled_at: string | null;
}

interface AdvancedReportsTabProps {
  projects: Project[];
}

interface ReportType {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: any;
  color: string;
  bgColor: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'cost-summary',
    name: 'Cost Summary',
    nameAr: 'ملخص التكاليف',
    description: 'Overall cost breakdown and analysis',
    descriptionAr: 'تحليل شامل لتوزيع التكاليف',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'progress-report',
    name: 'Progress Report',
    nameAr: 'تقرير التقدم',
    description: 'Project progress and timeline',
    descriptionAr: 'تقدم المشروع والجدول الزمني',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'resource-utilization',
    name: 'Resource Utilization',
    nameAr: 'استغلال الموارد',
    description: 'Resource allocation and usage',
    descriptionAr: 'تخصيص واستخدام الموارد',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'material-report',
    name: 'Material Report',
    nameAr: 'تقرير المواد',
    description: 'Material quantities and costs',
    descriptionAr: 'كميات وتكاليف المواد',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
];

export const AdvancedReportsTab = React.forwardRef<HTMLDivElement, AdvancedReportsTabProps>(
  ({ projects }, ref) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  
  // Files Report State
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  
  // Merge Analysis State
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  
  // Scheduled Reports State
  const [showScheduledDialog, setShowScheduledDialog] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [newReportName, setNewReportName] = useState("");
  const [newReportType, setNewReportType] = useState("summary");
  const [newScheduleType, setNewScheduleType] = useState("weekly");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const analysisData = selectedProject?.analysis_data;

  // Fetch attachments when dialog opens
  useEffect(() => {
    if (showFilesDialog && selectedProjectId && user) {
      fetchAttachments();
    }
  }, [showFilesDialog, selectedProjectId, user]);

  // Fetch scheduled reports
  useEffect(() => {
    if (showScheduledDialog && user) {
      fetchScheduledReports();
    }
  }, [showScheduledDialog, user]);

  const fetchAttachments = async () => {
    if (!user) return;
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from("project_attachments")
        .select("id, file_name, file_type, file_size, category, is_analyzed, uploaded_at")
        .eq("project_id", selectedProjectId)
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setAttachments((data || []) as Attachment[]);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast.error(isArabic ? "خطأ في جلب الملفات" : "Error fetching files");
    } finally {
      setLoadingAttachments(false);
    }
  };

  const fetchScheduledReports = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScheduledReports((data || []) as ScheduledReport[]);
    } catch (error) {
      console.error("Error fetching scheduled reports:", error);
    }
  };

  const generatePDFReport = async (reportType: string) => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    setGeneratingReport(reportType);
    
    try {
      const doc = new jsPDF();
      const report = reportTypes.find(r => r.id === reportType);
      
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(isArabic ? report?.nameAr || '' : report?.name || '', 14, 20);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`${isArabic ? "التاريخ:" : "Date:"} ${new Date().toLocaleDateString()}`, 14, 40);
      doc.text(`${isArabic ? "المشروع:" : "Project:"} ${selectedProject?.name}`, 14, 48);

      autoTable(doc, {
        startY: 60,
        head: [[
          isArabic ? 'م' : '#',
          isArabic ? 'الوصف' : 'Description',
          isArabic ? 'الكمية' : 'Quantity',
          isArabic ? 'الوحدة' : 'Unit',
          isArabic ? 'السعر' : 'Price',
          isArabic ? 'الإجمالي' : 'Total',
        ]],
        body: analysisData.items.map((item: any, idx: number) => [
          idx + 1,
          (item.description || '-').substring(0, 40),
          item.quantity || '-',
          item.unit || '-',
          item.unit_price || '-',
          item.total_price || '-',
        ]),
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      doc.save(`${reportType}-${selectedProject?.name}-${Date.now()}.pdf`);
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في التصدير" : "Export error");
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateExcelReport = async (reportType: string) => {
    if (!analysisData?.items || analysisData.items.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    setGeneratingReport(reportType);

    try {
      const worksheet = XLSX.utils.json_to_sheet(
        analysisData.items.map((item: any, idx: number) => ({
          [isArabic ? 'م' : '#']: idx + 1,
          [isArabic ? 'الوصف' : 'Description']: item.description,
          [isArabic ? 'الكمية' : 'Quantity']: item.quantity,
          [isArabic ? 'الوحدة' : 'Unit']: item.unit,
          [isArabic ? 'السعر' : 'Unit Price']: item.unit_price,
          [isArabic ? 'الإجمالي' : 'Total']: item.total_price,
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${reportType}-${selectedProject?.name}-${Date.now()}.xlsx`);
      
      toast.success(isArabic ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(isArabic ? "خطأ في التصدير" : "Export error");
    } finally {
      setGeneratingReport(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const exportFilesReport = () => {
    if (attachments.length === 0) {
      toast.error(isArabic ? "لا توجد ملفات" : "No files to export");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(isArabic ? "تقرير الملفات المرفقة" : "Attachments Report", 14, 20);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`${isArabic ? "المشروع:" : "Project:"} ${selectedProject?.name}`, 14, 40);
    doc.text(`${isArabic ? "عدد الملفات:" : "Total Files:"} ${attachments.length}`, 14, 48);
    doc.text(`${isArabic ? "المحللة:" : "Analyzed:"} ${attachments.filter(a => a.is_analyzed).length}`, 14, 56);

    autoTable(doc, {
      startY: 65,
      head: [[
        '#',
        isArabic ? 'اسم الملف' : 'File Name',
        isArabic ? 'النوع' : 'Type',
        isArabic ? 'الحجم' : 'Size',
        isArabic ? 'التصنيف' : 'Category',
        isArabic ? 'محلل' : 'Analyzed',
      ]],
      body: attachments.map((file, idx) => [
        idx + 1,
        file.file_name.substring(0, 30),
        file.file_type || '-',
        formatFileSize(file.file_size),
        file.category || '-',
        file.is_analyzed ? '✓' : '✗',
      ]),
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 },
    });

    doc.save(`files-report-${selectedProject?.name}.pdf`);
    toast.success(isArabic ? "تم تصدير التقرير" : "Report exported");
  };

  const toggleMergeSelection = (projectId: string) => {
    setSelectedForMerge(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleMergeAnalysis = () => {
    if (selectedForMerge.length < 2) {
      toast.error(isArabic ? "اختر مشروعين على الأقل" : "Select at least 2 projects");
      return;
    }

    setMerging(true);
    
    try {
      const selectedProjects = projects.filter(p => selectedForMerge.includes(p.id));
      const allItems: any[] = [];
      
      selectedProjects.forEach(project => {
        const items = project.analysis_data?.items || [];
        items.forEach((item: any) => {
          allItems.push({
            ...item,
            source_project: project.name,
          });
        });
      });

      // Remove duplicates based on description
      const uniqueItems = allItems.reduce((acc: any[], item) => {
        const exists = acc.find(i => 
          i.description?.toLowerCase() === item.description?.toLowerCase()
        );
        if (!exists) acc.push(item);
        return acc;
      }, []);

      // Export to Excel
      const worksheet = XLSX.utils.json_to_sheet(
        uniqueItems.map((item, idx) => ({
          [isArabic ? 'م' : '#']: idx + 1,
          [isArabic ? 'المصدر' : 'Source']: item.source_project,
          [isArabic ? 'رقم البند' : 'Item #']: item.item_number,
          [isArabic ? 'الوصف' : 'Description']: item.description,
          [isArabic ? 'الكمية' : 'Quantity']: item.quantity,
          [isArabic ? 'الوحدة' : 'Unit']: item.unit,
          [isArabic ? 'السعر' : 'Price']: item.unit_price,
          [isArabic ? 'الإجمالي' : 'Total']: item.total_price,
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Merged Analysis');
      XLSX.writeFile(workbook, `merged-analysis-${Date.now()}.xlsx`);
      
      toast.success(
        isArabic 
          ? `تم دمج ${allItems.length} بند (${uniqueItems.length} فريد)` 
          : `Merged ${allItems.length} items (${uniqueItems.length} unique)`
      );
      setShowMergeDialog(false);
      setSelectedForMerge([]);
    } catch (error) {
      console.error("Merge error:", error);
      toast.error(isArabic ? "خطأ في الدمج" : "Merge error");
    } finally {
      setMerging(false);
    }
  };

  const handleCreateScheduledReport = async () => {
    if (!newReportName.trim() || !recipientEmails.trim()) {
      toast.error(isArabic ? "أدخل جميع البيانات المطلوبة" : "Fill all required fields");
      return;
    }

    if (!user) return;

    setSavingSchedule(true);
    try {
      const emails = recipientEmails.split(',').map(e => e.trim()).filter(e => e);
      
      const { error } = await supabase
        .from("scheduled_reports")
        .insert({
          user_id: user.id,
          project_id: selectedProjectId || null,
          report_name: newReportName,
          report_type: newReportType,
          schedule_type: newScheduleType,
          recipient_emails: emails,
          is_active: true,
        });

      if (error) throw error;

      toast.success(isArabic ? "تم إنشاء التقرير المجدول" : "Scheduled report created");
      setNewReportName("");
      setRecipientEmails("");
      fetchScheduledReports();
    } catch (error) {
      console.error("Error creating scheduled report:", error);
      toast.error(isArabic ? "خطأ في الإنشاء" : "Error creating report");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSendNow = async (report: ScheduledReport) => {
    try {
      const project = projects.find(p => p.id === selectedProjectId);
      
      const { error } = await supabase.functions.invoke("send-scheduled-report", {
        body: {
          report_id: report.id,
          recipient_emails: report.recipient_emails,
          report_name: report.report_name,
          report_type: report.report_type,
          project_name: project?.name || 'N/A',
        }
      });

      if (error) throw error;
      toast.success(isArabic ? "تم إرسال التقرير" : "Report sent successfully");
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error(isArabic ? "خطأ في الإرسال" : "Error sending report");
    }
  };

  const handleDeleteScheduledReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
      toast.success(isArabic ? "تم الحذف" : "Deleted successfully");
      fetchScheduledReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error(isArabic ? "خطأ في الحذف" : "Error deleting");
    }
  };

  const additionalTools = [
    {
      id: "files-report",
      title: isArabic ? "تقرير الملفات" : "Files Report",
      description: isArabic ? "تقرير شامل من جميع الملفات المحللة" : "Comprehensive report from analyzed files",
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-500/10",
      onClick: () => setShowFilesDialog(true),
    },
    {
      id: "merge-analysis",
      title: isArabic ? "دمج التحليلات" : "Merge Analysis",
      description: isArabic ? "دمج نتائج تحليل عدة ملفات" : "Merge analysis results from multiple files",
      icon: Combine,
      color: "text-pink-600",
      bgColor: "bg-pink-500/10",
      onClick: () => setShowMergeDialog(true),
    },
    {
      id: "scheduled-reports",
      title: isArabic ? "تقارير مجدولة" : "Scheduled Reports",
      description: isArabic ? "إنشاء تقارير تلقائية ترسل بالبريد" : "Create automatic email reports",
      icon: CalendarClock,
      color: "text-cyan-600",
      bgColor: "bg-cyan-500/10",
      onClick: () => setShowScheduledDialog(true),
    },
  ];

  return (
    <div ref={ref} className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {isArabic ? "التقارير المتقدمة" : "Advanced Reports"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isArabic ? "إنشاء وتصدير تقارير مفصلة" : "Generate and export detailed reports"}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={isArabic ? "اختر المشروع" : "Select Project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "الكل" : "All Time"}</SelectItem>
              <SelectItem value="month">{isArabic ? "هذا الشهر" : "This Month"}</SelectItem>
              <SelectItem value="quarter">{isArabic ? "هذا الربع" : "This Quarter"}</SelectItem>
              <SelectItem value="year">{isArabic ? "هذه السنة" : "This Year"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isGenerating = generatingReport === report.id;
          
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${report.bgColor}`}>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {isArabic ? report.nameAr : report.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {isArabic ? report.descriptionAr : report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!selectedProjectId || isGenerating}
                    onClick={() => generatePDFReport(report.id)}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!selectedProjectId || isGenerating}
                    onClick={() => generateExcelReport(report.id)}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Tools */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {isArabic ? "أدوات إضافية" : "Additional Tools"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {additionalTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card 
                key={tool.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={tool.onClick}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                      <Icon className={`h-5 w-5 ${tool.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tool.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {!selectedProjectId && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {isArabic 
            ? "الرجاء اختيار مشروع لإنشاء التقارير المتقدمة" 
            : "Please select a project to generate advanced reports"}
        </p>
      )}

      {/* Files Report Dialog */}
      <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-indigo-600" />
              {isArabic ? "تقرير الملفات المرفقة" : "Files Report"}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? `${attachments.length} ملف مرفق - ${attachments.filter(a => a.is_analyzed).length} محلل`
                : `${attachments.length} files attached - ${attachments.filter(a => a.is_analyzed).length} analyzed`}
            </DialogDescription>
          </DialogHeader>

          {loadingAttachments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {isArabic ? "لا توجد ملفات مرفقة" : "No attachments found"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {attachments.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {file.category || '-'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={file.is_analyzed ? "default" : "secondary"}>
                    {file.is_analyzed 
                      ? (isArabic ? "محلل" : "Analyzed") 
                      : (isArabic ? "قيد الانتظار" : "Pending")}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilesDialog(false)}>
              {isArabic ? "إغلاق" : "Close"}
            </Button>
            <Button onClick={exportFilesReport} disabled={attachments.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              {isArabic ? "تصدير PDF" : "Export PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Analysis Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Combine className="h-5 w-5 text-pink-600" />
              {isArabic ? "دمج نتائج التحليل" : "Merge Analysis Results"}
            </DialogTitle>
            <DialogDescription>
              {isArabic 
                ? "اختر المشاريع التي تريد دمج بنودها"
                : "Select projects to merge their items"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-auto">
            {projects.map((project) => {
              const itemsCount = project.analysis_data?.items?.length || 0;
              return (
                <div 
                  key={project.id} 
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedForMerge.includes(project.id) ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => toggleMergeSelection(project.id)}
                >
                  <Checkbox 
                    checked={selectedForMerge.includes(project.id)}
                    onCheckedChange={() => toggleMergeSelection(project.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {itemsCount} {isArabic ? "بند" : "items"}
                    </p>
                  </div>
                  {selectedForMerge.includes(project.id) && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              onClick={handleMergeAnalysis} 
              disabled={selectedForMerge.length < 2 || merging}
            >
              {merging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isArabic ? `دمج (${selectedForMerge.length})` : `Merge (${selectedForMerge.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scheduled Reports Dialog */}
      <Dialog open={showScheduledDialog} onOpenChange={setShowScheduledDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-cyan-600" />
              {isArabic ? "التقارير المجدولة" : "Scheduled Reports"}
            </DialogTitle>
          </DialogHeader>

          {/* Create New Scheduled Report */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium text-sm">
                {isArabic ? "إنشاء تقرير مجدول جديد" : "Create New Scheduled Report"}
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم التقرير" : "Report Name"}</Label>
                  <Input 
                    value={newReportName}
                    onChange={(e) => setNewReportName(e.target.value)}
                    placeholder={isArabic ? "تقرير أسبوعي" : "Weekly Report"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التقرير" : "Report Type"}</Label>
                  <Select value={newReportType} onValueChange={setNewReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">{isArabic ? "ملخص" : "Summary"}</SelectItem>
                      <SelectItem value="pricing">{isArabic ? "تسعير" : "Pricing"}</SelectItem>
                      <SelectItem value="progress">{isArabic ? "تقدم" : "Progress"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "التكرار" : "Frequency"}</Label>
                  <Select value={newScheduleType} onValueChange={setNewScheduleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{isArabic ? "يومي" : "Daily"}</SelectItem>
                      <SelectItem value="weekly">{isArabic ? "أسبوعي" : "Weekly"}</SelectItem>
                      <SelectItem value="monthly">{isArabic ? "شهري" : "Monthly"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "البريد الإلكتروني" : "Email Recipients"}</Label>
                  <Input 
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    placeholder="email@example.com, other@example.com"
                  />
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={handleCreateScheduledReport}
                disabled={savingSchedule}
              >
                {savingSchedule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isArabic ? "إنشاء التقرير المجدول" : "Create Scheduled Report"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Scheduled Reports */}
          {scheduledReports.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">
                {isArabic ? "التقارير المجدولة الحالية" : "Existing Scheduled Reports"}
              </h4>
              {scheduledReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{report.report_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.schedule_type} • {report.recipient_emails.length} {isArabic ? "مستلم" : "recipients"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={report.is_active ? "default" : "secondary"}>
                      {report.is_active ? (isArabic ? "نشط" : "Active") : (isArabic ? "متوقف" : "Paused")}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleSendNow(report)}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteScheduledReport(report.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduledDialog(false)}>
              {isArabic ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  }
);

AdvancedReportsTab.displayName = "AdvancedReportsTab";
