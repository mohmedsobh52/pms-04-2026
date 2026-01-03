import { useState, useMemo, useCallback, useEffect } from "react";
import { Calendar, Clock, Play, ChevronLeft, ChevronRight, Loader2, Brain, Zap, Target, TrendingUp, AlertTriangle, CheckCircle2, Edit3, CalendarDays, Download, FileSpreadsheet, Link2, Unlink, Save, Database, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface TimelineItem extends WBSItem {
  startDay: number;
  duration: number;
  color: string;
  progress: number;
  actualDays?: number;
  status?: "not_started" | "in_progress" | "completed" | "delayed";
  predecessors?: string[];
  isCritical?: boolean;
  isManuallyEdited?: boolean;
}

interface ProjectTimelineProps {
  wbsData: WBSItem[];
  projectName?: string;
  projectId?: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(210, 80%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(30, 85%, 55%)",
  "hsl(180, 65%, 45%)",
  "hsl(330, 70%, 55%)",
];

export function ProjectTimeline({ wbsData, projectName = "المشروع", projectId }: ProjectTimelineProps) {
  const [viewMode, setViewMode] = useState<"weeks" | "months">("weeks");
  const [isGenerating, setIsGenerating] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [startOffset, setStartOffset] = useState(0);
  const [showProgressMode, setShowProgressMode] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [selectedTaskForDeps, setSelectedTaskForDeps] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDuration, setEditingDuration] = useState<{ code: string; value: number } | null>(null);
  const [editingStartDay, setEditingStartDay] = useState<{ code: string; value: number } | null>(null);
  const { toast } = useToast();
  
  // Project date controls
  const [projectStartDate, setProjectStartDate] = useState<Date | undefined>(new Date());
  const [projectEndDate, setProjectEndDate] = useState<Date | undefined>(addDays(new Date(), 90));
  
  // Calculate project duration
  const projectDuration = useMemo(() => {
    if (projectStartDate && projectEndDate) {
      return differenceInDays(projectEndDate, projectStartDate);
    }
    return 90;
  }, [projectStartDate, projectEndDate]);

  // Calculate critical path
  const criticalPath = useMemo(() => {
    if (timelineData.length === 0) return [];
    
    // Find the longest path through dependencies
    const taskMap = new Map(timelineData.map(t => [t.code, t]));
    const endDays = new Map<string, number>();
    
    // Calculate end day for each task considering dependencies
    const calcEndDay = (code: string, visited: Set<string> = new Set()): number => {
      if (visited.has(code)) return 0;
      visited.add(code);
      
      const task = taskMap.get(code);
      if (!task) return 0;
      
      if (endDays.has(code)) return endDays.get(code)!;
      
      let maxPredEnd = 0;
      if (task.predecessors && task.predecessors.length > 0) {
        for (const pred of task.predecessors) {
          maxPredEnd = Math.max(maxPredEnd, calcEndDay(pred, visited));
        }
      }
      
      const endDay = task.startDay + task.duration;
      endDays.set(code, endDay);
      return endDay;
    };
    
    timelineData.forEach(t => calcEndDay(t.code));
    
    // Find tasks on the longest path
    const maxEnd = Math.max(...Array.from(endDays.values()));
    const criticalTasks: string[] = [];
    
    timelineData.forEach(t => {
      const end = endDays.get(t.code) || 0;
      if (end >= maxEnd - 7) { // Within 7 days of critical end
        criticalTasks.push(t.code);
      }
    });
    
    return criticalTasks;
  }, [timelineData]);

  // Update timeline with critical path info
  const timelineWithCriticalPath = useMemo(() => {
    return timelineData.map(t => ({
      ...t,
      isCritical: criticalPath.includes(t.code),
    }));
  }, [timelineData, criticalPath]);

  // Load saved timeline estimates from database
  useEffect(() => {
    if (projectId && timelineData.length > 0) {
      loadSavedEstimates();
    }
  }, [projectId]);

  const loadSavedEstimates = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('timeline_estimates')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      if (data && data.length > 0) {
        setTimelineData(prev => prev.map(task => {
          const saved = data.find(d => d.task_code === task.code);
          if (saved) {
            return {
              ...task,
              duration: saved.custom_duration || task.duration,
              startDay: saved.custom_start_day ?? task.startDay,
              progress: saved.custom_progress || task.progress,
              isManuallyEdited: true,
            };
          }
          return task;
        }));
        
        toast({
          title: "تم تحميل التقديرات",
          description: `تم تحميل ${data.length} تقدير زمني محفوظ`,
        });
      }
    } catch (error) {
      console.error('Error loading estimates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save timeline estimates to database
  const saveEstimates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول للحفظ",
        variant: "destructive",
      });
      return;
    }

    if (!projectId) {
      toast({
        title: "تنبيه",
        description: "يجب حفظ المشروع أولاً لحفظ التقديرات الزمنية",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Delete existing estimates for this project
      await supabase
        .from('timeline_estimates')
        .delete()
        .eq('project_id', projectId);

      // Insert new estimates for manually edited tasks
      const estimatesToSave = timelineData
        .filter(t => t.isManuallyEdited)
        .map(task => ({
          project_id: projectId,
          user_id: user.id,
          task_code: task.code,
          task_title: task.title,
          custom_duration: task.duration,
          custom_start_day: task.startDay,
          custom_progress: task.progress,
        }));

      if (estimatesToSave.length > 0) {
        const { error } = await supabase
          .from('timeline_estimates')
          .insert(estimatesToSave);

        if (error) throw error;
      }

      toast({
        title: "تم الحفظ",
        description: `تم حفظ ${estimatesToSave.length} تقدير زمني`,
      });
    } catch (error) {
      console.error('Error saving estimates:', error);
      toast({
        title: "خطأ",
        description: "فشل حفظ التقديرات الزمنية",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update task duration manually
  const updateTaskDuration = (code: string, newDuration: number) => {
    setTimelineData(prev => prev.map(task => {
      if (task.code !== code) return task;
      return {
        ...task,
        duration: Math.max(1, newDuration),
        isManuallyEdited: true,
      };
    }));
    setEditingDuration(null);
  };

  // Update task start day manually
  const updateTaskStartDay = (code: string, newStartDay: number) => {
    setTimelineData(prev => prev.map(task => {
      if (task.code !== code) return task;
      return {
        ...task,
        startDay: Math.max(0, newStartDay),
        isManuallyEdited: true,
      };
    }));
    setEditingStartDay(null);
  };

  // Add/remove dependency
  const toggleDependency = useCallback((taskCode: string, predecessorCode: string) => {
    setTimelineData(prev => prev.map(task => {
      if (task.code !== taskCode) return task;
      
      const currentPreds = task.predecessors || [];
      const hasPred = currentPreds.includes(predecessorCode);
      
      return {
        ...task,
        predecessors: hasPred 
          ? currentPreds.filter(p => p !== predecessorCode)
          : [...currentPreds, predecessorCode],
      };
    }));
  }, []);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (timelineData.length === 0 || !projectStartDate) return;
    
    const data = timelineData.map(task => {
      const startDate = addDays(projectStartDate, task.startDay);
      const endDate = addDays(startDate, task.duration);
      
      return {
        "الكود": task.code,
        "المهمة": task.title,
        "المستوى": task.level,
        "تاريخ البداية": format(startDate, "yyyy-MM-dd"),
        "تاريخ النهاية": format(endDate, "yyyy-MM-dd"),
        "المدة (أيام)": task.duration,
        "التقدم %": task.progress,
        "الحالة": task.status === "completed" ? "مكتمل" : task.status === "in_progress" ? "قيد التنفيذ" : task.status === "delayed" ? "متأخر" : "لم يبدأ",
        "على المسار الحرج": task.isCritical ? "نعم" : "لا",
        "التبعيات": task.predecessors?.join(", ") || "-",
      };
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "الجدول الزمني");
    
    XLSX.writeFile(wb, `project_timeline_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير الجدول الزمني إلى Excel",
    });
  }, [timelineData, projectStartDate, toast]);

  // Export to PDF with Gantt Chart
  const exportToPDF = useCallback(() => {
    if (timelineData.length === 0 || !projectStartDate) return;
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    
    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Project Timeline - ${projectName}`, margin, 16);
    
    // Date range
    doc.setFontSize(10);
    doc.text(
      `${format(projectStartDate, "yyyy/MM/dd")} - ${projectEndDate ? format(projectEndDate, "yyyy/MM/dd") : "N/A"}`,
      pageWidth - margin,
      16,
      { align: "right" }
    );
    
    // Table data
    const tableData = timelineData.map(task => {
      const startDate = addDays(projectStartDate, task.startDay);
      const endDate = addDays(startDate, task.duration);
      
      return [
        task.code,
        task.title.substring(0, 30) + (task.title.length > 30 ? "..." : ""),
        format(startDate, "MM/dd"),
        format(endDate, "MM/dd"),
        String(task.duration),
        `${task.progress}%`,
        task.isCritical ? "●" : "",
      ];
    });
    
    autoTable(doc, {
      startY: 30,
      head: [["Code", "Task", "Start", "End", "Days", "Progress", "Critical"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: 15, halign: "center", textColor: [220, 38, 38] },
      },
      margin: { left: margin, right: margin },
    });
    
    // Add Gantt Chart visualization on new page
    doc.addPage();
    
    // Gantt Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Gantt Chart", margin, 16);
    
    const ganttStartY = 35;
    const rowHeight = 8;
    const taskColumnWidth = 60;
    const ganttWidth = pageWidth - margin * 2 - taskColumnWidth;
    const totalDays = Math.max(...timelineData.map(t => t.startDay + t.duration), projectDuration);
    
    // Draw header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, ganttStartY, pageWidth - margin * 2, rowHeight, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text("Task", margin + 2, ganttStartY + 5);
    
    // Draw week markers
    const weeksCount = Math.ceil(totalDays / 7);
    for (let i = 0; i <= weeksCount; i++) {
      const x = margin + taskColumnWidth + (i / weeksCount) * ganttWidth;
      doc.setDrawColor(226, 232, 240);
      doc.line(x, ganttStartY, x, ganttStartY + (timelineData.length + 1) * rowHeight);
      if (i < weeksCount) {
        doc.text(`W${i + 1}`, x + 2, ganttStartY + 5);
      }
    }
    
    // Draw tasks
    timelineData.forEach((task, idx) => {
      const y = ganttStartY + (idx + 1) * rowHeight;
      
      // Task name
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(7);
      doc.text(task.title.substring(0, 20), margin + 2, y + 5);
      
      // Task bar
      const barStart = margin + taskColumnWidth + (task.startDay / totalDays) * ganttWidth;
      const barWidth = Math.max((task.duration / totalDays) * ganttWidth, 5);
      
      // Bar color based on status/critical
      if (task.isCritical) {
        doc.setFillColor(220, 38, 38);
      } else if (task.progress === 100) {
        doc.setFillColor(34, 197, 94);
      } else {
        doc.setFillColor(59, 130, 246);
      }
      
      doc.roundedRect(barStart, y + 2, barWidth, rowHeight - 4, 1, 1, "F");
      
      // Progress fill
      if (task.progress > 0 && task.progress < 100) {
        const progressWidth = barWidth * (task.progress / 100);
        doc.setFillColor(255, 255, 255, 0.3);
        doc.roundedRect(barStart, y + 2, progressWidth, rowHeight - 4, 1, 1, "F");
      }
    });
    
    // Legend
    const legendY = ganttStartY + (timelineData.length + 2) * rowHeight;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, legendY, 10, 4, "F");
    doc.text("Normal", margin + 12, legendY + 3);
    
    doc.setFillColor(220, 38, 38);
    doc.rect(margin + 40, legendY, 10, 4, "F");
    doc.text("Critical Path", margin + 52, legendY + 3);
    
    doc.setFillColor(34, 197, 94);
    doc.rect(margin + 95, legendY, 10, 4, "F");
    doc.text("Completed", margin + 107, legendY + 3);
    
    doc.save(`project_timeline_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير الجدول الزمني مع Gantt Chart إلى PDF",
    });
  }, [timelineData, projectStartDate, projectEndDate, projectName, projectDuration, toast]);

  // Calculate project statistics
  const projectStats = useMemo(() => {
    if (timelineData.length === 0) return null;

    const completed = timelineData.filter(t => t.progress === 100).length;
    const inProgress = timelineData.filter(t => t.progress > 0 && t.progress < 100).length;
    const notStarted = timelineData.filter(t => t.progress === 0).length;
    const delayed = timelineData.filter(t => t.status === "delayed").length;
    
    const totalProgress = timelineData.reduce((sum, t) => sum + (t.progress || 0), 0) / timelineData.length;
    
    const expectedProgress = timelineData.reduce((sum, t) => {
      // Simple expected progress based on position in timeline
      const daysPassed = 30; // Assume 30 days have passed
      const taskEnd = t.startDay + t.duration;
      if (daysPassed >= taskEnd) return sum + 100;
      if (daysPassed <= t.startDay) return sum + 0;
      const taskProgress = ((daysPassed - t.startDay) / t.duration) * 100;
      return sum + Math.min(taskProgress, 100);
    }, 0) / timelineData.length;

    const variance = totalProgress - expectedProgress;

    return {
      completed,
      inProgress,
      notStarted,
      delayed,
      totalProgress: Math.round(totalProgress),
      expectedProgress: Math.round(expectedProgress),
      variance: Math.round(variance),
      isAhead: variance > 0,
      isBehind: variance < -10,
    };
  }, [timelineData]);

  // Update task progress
  const updateTaskProgress = (code: string, progress: number) => {
    setTimelineData(prev => prev.map(task => {
      if (task.code !== code) return task;
      
      let status: TimelineItem["status"] = "not_started";
      if (progress === 100) status = "completed";
      else if (progress > 0) status = "in_progress";
      
      // Check if delayed (progress less than expected)
      const daysPassed = 30;
      const taskEnd = task.startDay + task.duration;
      if (daysPassed > task.startDay && progress < 50 && daysPassed > task.startDay + task.duration / 2) {
        status = "delayed";
      }

      return { ...task, progress, status };
    }));
  };

  // Generate basic timeline from WBS with deterministic durations
  const generateBasicTimeline = () => {
    let currentDay = 0;
    const items: TimelineItem[] = wbsData.map((item, idx) => {
      // Calculate duration based on work type and item count
      const duration = calculatePreciseDuration(item);
      const startDay = currentDay;
      
      // Determine overlap based on level
      if (item.level === 1) {
        currentDay += Math.ceil(duration * 0.8);
      } else if (item.level === 2) {
        currentDay += Math.ceil(duration * 0.6);
      } else {
        currentDay += Math.ceil(duration * 0.4);
      }
      
      return {
        ...item,
        startDay,
        duration,
        color: COLORS[idx % COLORS.length],
        progress: 0,
        status: "not_started" as const,
      };
    });
    
    setTimelineData(items);
    toast({
      title: "تم إنشاء الجدول الزمني",
      description: `تم توليد جدول زمني لـ ${items.length} مهمة - إجمالي ${currentDay} يوم`,
    });
  };

  // Calculate precise duration based on work type
  const calculatePreciseDuration = (item: WBSItem): number => {
    const title = item.title.toLowerCase();
    const itemCount = item.items.length;
    
    // Base durations by work type (Saudi market standards)
    if (title.includes('أساسات') || title.includes('foundation')) {
      return Math.max(21, 14 + itemCount * 3);
    }
    if (title.includes('خرسانة') || title.includes('concrete') || title.includes('هيكل') || title.includes('structure')) {
      return Math.max(30, 21 + itemCount * 4);
    }
    if (title.includes('حفر') || title.includes('excavation') || title.includes('ردم')) {
      return Math.max(7, 5 + itemCount * 1);
    }
    if (title.includes('كهرب') || title.includes('electric')) {
      return Math.max(21, 14 + itemCount * 2);
    }
    if (title.includes('تكييف') || title.includes('hvac') || title.includes('ميكانيك')) {
      return Math.max(28, 21 + itemCount * 2);
    }
    if (title.includes('سباك') || title.includes('plumb') || title.includes('صحي')) {
      return Math.max(14, 10 + itemCount * 2);
    }
    if (title.includes('تشطيب') || title.includes('finish') || title.includes('بلاط') || title.includes('دهان')) {
      return Math.max(21, 14 + itemCount * 2);
    }
    if (title.includes('سقف') || title.includes('roof')) {
      return Math.max(14, 10 + itemCount * 3);
    }
    if (title.includes('واجه') || title.includes('facade') || title.includes('نوافذ') || title.includes('أبواب')) {
      return Math.max(21, 14 + itemCount * 2);
    }
    if (title.includes('أعمال خارجي') || title.includes('landscap') || title.includes('تنسيق موقع')) {
      return Math.max(14, 10 + itemCount * 2);
    }
    
    // Default duration based on level
    const baseDuration = item.level === 1 ? 28 : item.level === 2 ? 14 : 7;
    return baseDuration + (itemCount * 2);
  };

  // Generate AI-powered timeline
  const generateAITimeline = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-timeline", {
        body: { wbsData, projectName },
      });

      if (error) throw error;

      if (data.timeline) {
        const enrichedTimeline = data.timeline.map((item: any, idx: number) => ({
          ...wbsData[idx],
          ...item,
          color: COLORS[idx % COLORS.length],
          progress: 0,
          status: "not_started" as const,
        }));
        setTimelineData(enrichedTimeline);
        toast({
          title: "تم التحليل الذكي",
          description: `تم تقدير المدد بناءً على تحليل Gemini`,
        });
      }
    } catch (error) {
      console.error("AI timeline error:", error);
      generateBasicTimeline();
      toast({
        title: "تم استخدام التقدير الأساسي",
        description: "تعذر الاتصال بـ Gemini، تم استخدام التقدير الافتراضي",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate total project duration
  const totalDays = useMemo(() => {
    if (timelineData.length === 0) return 90;
    return Math.max(...timelineData.map(t => t.startDay + t.duration)) + 7;
  }, [timelineData]);

  // Visible columns based on view mode
  const columnWidth = viewMode === "weeks" ? 7 : 30;
  const visibleColumns = viewMode === "weeks" ? 12 : 4;
  const totalColumns = Math.ceil(totalDays / columnWidth);

  // Generate column headers
  const columns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < visibleColumns; i++) {
      const colIndex = startOffset + i;
      if (colIndex >= totalColumns) break;
      
      const label = viewMode === "weeks" 
        ? `أسبوع ${colIndex + 1}`
        : `شهر ${colIndex + 1}`;
      
      cols.push({ index: colIndex, label });
    }
    return cols;
  }, [startOffset, visibleColumns, totalColumns, viewMode]);

  const canScrollLeft = startOffset > 0;
  const canScrollRight = startOffset + visibleColumns < totalColumns;

  // Get status icon
  const getStatusIcon = (status?: TimelineItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "delayed":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case "in_progress":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">الجدول الزمني للمشروع</h3>
              <p className="text-sm text-muted-foreground">
                {timelineData.length > 0 
                  ? `${projectDuration} يوم - ${timelineData.length} مهمة`
                  : "اضغط لتوليد الجدول الزمني"}
              </p>
            </div>
          </div>
          
          {/* Date Pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {projectStartDate ? format(projectStartDate, "yyyy/MM/dd") : "تاريخ البداية"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={projectStartDate}
                  onSelect={setProjectStartDate}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-muted-foreground">→</span>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {projectEndDate ? format(projectEndDate, "yyyy/MM/dd") : "تاريخ النهاية"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={projectEndDate}
                  onSelect={setProjectEndDate}
                  disabled={(date) => projectStartDate ? date < projectStartDate : false}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <div className="px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-sm font-medium text-primary">{projectDuration} يوم</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {timelineData.length === 0 ? (
              <>
                <Button
                  onClick={generateBasicTimeline}
                  variant="outline"
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  توليد سريع
                </Button>
                <Button
                  onClick={generateAITimeline}
                  disabled={isGenerating}
                  className="gap-2 btn-gradient"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  تحليل ذكي بـ Gemini
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowProgressMode(!showProgressMode)}
                  variant={showProgressMode ? "default" : "outline"}
                  size="sm"
                  className="gap-1"
                >
                  <Target className="w-4 h-4" />
                  {showProgressMode ? "إخفاء التقدم" : "تتبع التقدم"}
                </Button>
                
                {/* Dependencies Button */}
                <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Link2 className="w-4 h-4" />
                      التبعيات
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>إدارة تبعيات المهام</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">اختر مهمة ثم حدد المهام السابقة لها:</p>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">اختر المهمة:</label>
                        <select
                          value={selectedTaskForDeps || ""}
                          onChange={(e) => setSelectedTaskForDeps(e.target.value)}
                          className="w-full p-2 border border-border rounded-lg bg-background"
                        >
                          <option value="">اختر مهمة...</option>
                          {timelineWithCriticalPath.map(task => (
                            <option key={task.code} value={task.code}>
                              {task.code} - {task.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedTaskForDeps && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">المهام السابقة (Predecessors):</label>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto border border-border rounded-lg p-2">
                            {timelineWithCriticalPath
                              .filter(t => t.code !== selectedTaskForDeps)
                              .map(task => {
                                const selectedTask = timelineWithCriticalPath.find(t => t.code === selectedTaskForDeps);
                                const isSelected = selectedTask?.predecessors?.includes(task.code) || false;
                                
                                return (
                                  <div key={task.code} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                                    <Checkbox
                                      id={`dep-${task.code}`}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleDependency(selectedTaskForDeps, task.code)}
                                    />
                                    <label htmlFor={`dep-${task.code}`} className="text-sm flex-1 cursor-pointer">
                                      <span className="font-mono text-xs bg-primary/10 text-primary px-1 rounded mr-2">{task.code}</span>
                                      {task.title}
                                      {task.isCritical && (
                                        <span className="ml-2 text-xs text-destructive">(مسار حرج)</span>
                                      )}
                                    </label>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      
                      {/* Critical Path Display */}
                      <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          المسار الحرج
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {criticalPath.length > 0 ? criticalPath.map(code => (
                            <span key={code} className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                              {code}
                            </span>
                          )) : (
                            <span className="text-xs text-muted-foreground">لا توجد تبعيات محددة</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="flex border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("weeks")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium transition-colors",
                      viewMode === "weeks" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    أسابيع
                  </button>
                  <button
                    onClick={() => setViewMode("months")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium transition-colors",
                      viewMode === "months" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    شهور
                  </button>
                </div>
                
                {/* Export Buttons */}
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
                
                {/* Save Button */}
                <Button
                  onClick={saveEstimates}
                  variant="outline"
                  size="sm"
                  disabled={isSaving || !projectId}
                  className="gap-1"
                  title={!projectId ? "يجب حفظ المشروع أولاً" : ""}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  حفظ التقديرات
                </Button>
                
                <Button
                  onClick={generateAITimeline}
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  className="gap-1"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Brain className="w-3 h-3" />
                  )}
                  إعادة تقدير
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      {timelineData.length > 0 && showProgressMode && projectStats && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h4 className="font-display font-semibold">ملخص التقدم</h4>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>التقدم الفعلي</span>
              <span className="font-bold">{projectStats.totalProgress}%</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden relative">
              {/* Expected progress line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-warning z-10"
                style={{ left: `${projectStats.expectedProgress}%` }}
                title={`التقدم المتوقع: ${projectStats.expectedProgress}%`}
              />
              {/* Actual progress */}
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  projectStats.isBehind ? "bg-destructive" : projectStats.isAhead ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${projectStats.totalProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>التقدم المتوقع: {projectStats.expectedProgress}%</span>
              <span className={cn(
                "font-medium",
                projectStats.isBehind ? "text-destructive" : projectStats.isAhead ? "text-success" : "text-foreground"
              )}>
                {projectStats.variance > 0 ? "+" : ""}{projectStats.variance}% 
                {projectStats.isAhead ? " متقدم" : projectStats.isBehind ? " متأخر" : ""}
              </span>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <div>
                <p className="text-lg font-bold text-success">{projectStats.completed}</p>
                <p className="text-xs text-muted-foreground">مكتمل</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-lg font-bold text-primary">{projectStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{projectStats.notStarted}</p>
                <p className="text-xs text-muted-foreground">لم يبدأ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-lg font-bold text-destructive">{projectStats.delayed}</p>
                <p className="text-xs text-muted-foreground">متأخر</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <div className="p-4">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStartOffset(Math.max(0, startOffset - 1))}
              disabled={!canScrollLeft}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {viewMode === "weeks" ? "عرض أسبوعي" : "عرض شهري"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStartOffset(startOffset + 1)}
              disabled={!canScrollRight}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Chart */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="flex border-b border-border">
                <div className="w-48 shrink-0 p-2 font-medium text-sm bg-muted/50">
                  المهمة
                </div>
                {/* Duration/Start Edit Columns */}
                <div className="w-20 shrink-0 p-2 font-medium text-sm bg-muted/50 text-center">
                  البداية
                </div>
                <div className="w-20 shrink-0 p-2 font-medium text-sm bg-muted/50 text-center">
                  المدة
                </div>
                {showProgressMode && (
                  <div className="w-24 shrink-0 p-2 font-medium text-sm bg-muted/50 text-center">
                    التقدم
                  </div>
                )}
                <div className="flex-1 flex">
                  {columns.map(col => (
                    <div
                      key={col.index}
                      className="flex-1 p-2 text-center text-sm font-medium border-r border-border last:border-r-0 bg-muted/30"
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Rows */}
              {timelineData.map((task, idx) => {
                const startCol = Math.floor(task.startDay / columnWidth);
                const endCol = Math.floor((task.startDay + task.duration) / columnWidth);
                
                const visibleStart = Math.max(0, startCol - startOffset);
                const visibleEnd = Math.min(visibleColumns, endCol - startOffset + 1);
                const isVisible = startCol <= startOffset + visibleColumns && endCol >= startOffset;
                
                const barStart = ((task.startDay % columnWidth) / columnWidth) * 100;
                const spanCols = visibleEnd - visibleStart;
                
                return (
                  <div
                    key={task.code}
                    className={cn(
                      "flex border-b border-border/50 hover:bg-muted/20 transition-colors",
                      task.level === 1 && "bg-muted/10",
                      task.status === "delayed" && "bg-destructive/5"
                    )}
                  >
                    {/* Task Name */}
                    <div
                      className={cn(
                        "w-48 shrink-0 p-2 flex items-center gap-2",
                        task.level === 2 && "pr-6",
                        task.level === 3 && "pr-10"
                      )}
                    >
                      {showProgressMode ? (
                        getStatusIcon(task.status)
                      ) : (
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            task.isManuallyEdited && "ring-2 ring-primary ring-offset-1"
                          )}
                          style={{ backgroundColor: task.color }}
                        />
                      )}
                      <span className="text-sm truncate" title={task.title}>
                        {task.title}
                      </span>
                      {task.isManuallyEdited && (
                        <span title="تم تعديله يدوياً">
                          <Pencil className="w-3 h-3 text-primary shrink-0" />
                        </span>
                      )}
                    </div>

                    {/* Start Day Edit */}
                    <div className="w-20 shrink-0 p-1 flex items-center justify-center">
                      {editingStartDay?.code === task.code ? (
                        <Input
                          type="number"
                          value={editingStartDay.value}
                          onChange={(e) => setEditingStartDay({ code: task.code, value: parseInt(e.target.value) || 0 })}
                          onBlur={() => updateTaskStartDay(task.code, editingStartDay.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateTaskStartDay(task.code, editingStartDay.value);
                            if (e.key === 'Escape') setEditingStartDay(null);
                          }}
                          className="w-16 h-7 text-xs text-center p-1"
                          autoFocus
                          min={0}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingStartDay({ code: task.code, value: task.startDay })}
                          className="text-xs font-mono bg-muted/50 hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-1"
                          title="تعديل يوم البداية"
                        >
                          {task.startDay}
                          <Pencil className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      )}
                    </div>

                    {/* Duration Edit */}
                    <div className="w-20 shrink-0 p-1 flex items-center justify-center">
                      {editingDuration?.code === task.code ? (
                        <Input
                          type="number"
                          value={editingDuration.value}
                          onChange={(e) => setEditingDuration({ code: task.code, value: parseInt(e.target.value) || 1 })}
                          onBlur={() => updateTaskDuration(task.code, editingDuration.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateTaskDuration(task.code, editingDuration.value);
                            if (e.key === 'Escape') setEditingDuration(null);
                          }}
                          className="w-16 h-7 text-xs text-center p-1"
                          autoFocus
                          min={1}
                        />
                      ) : (
                        <button
                          onClick={() => setEditingDuration({ code: task.code, value: task.duration })}
                          className="text-xs font-mono bg-muted/50 hover:bg-muted px-2 py-1 rounded transition-colors flex items-center gap-1"
                          title="تعديل المدة (أيام)"
                        >
                          {task.duration}d
                          <Pencil className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      )}
                    </div>

                    {/* Progress Control */}
                    {showProgressMode && (
                      <div className="w-24 shrink-0 p-2 flex items-center gap-1">
                        {editingTask === task.code ? (
                          <div className="w-full">
                            <Slider
                              value={[task.progress]}
                              onValueChange={([value]) => updateTaskProgress(task.code, value)}
                              max={100}
                              step={5}
                              className="w-full"
                            />
                            <button 
                              onClick={() => setEditingTask(null)}
                              className="text-xs text-primary mt-1"
                            >
                              تم
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingTask(task.code)}
                            className={cn(
                              "w-full text-center text-sm font-medium py-1 rounded hover:bg-muted transition-colors flex items-center justify-center gap-1",
                              task.progress === 100 && "text-success",
                              task.status === "delayed" && "text-destructive"
                            )}
                          >
                            {task.progress}%
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Timeline Bars */}
                    <div className="flex-1 flex relative">
                      {columns.map(col => (
                        <div
                          key={col.index}
                          className="flex-1 border-r border-border/30 last:border-r-0 h-10 relative"
                        />
                      ))}
                      
                      {isVisible && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full transition-all duration-300 hover:h-7 cursor-pointer group overflow-hidden"
                          style={{
                            left: `${(visibleStart / visibleColumns) * 100 + (barStart / visibleColumns)}%`,
                            width: `${(spanCols / visibleColumns) * 100}%`,
                            backgroundColor: task.status === "delayed" ? "hsl(var(--destructive))" : `${task.color}`,
                            opacity: task.progress === 100 ? 1 : 0.7,
                            minWidth: '20px',
                          }}
                          title={`${task.title} - ${task.duration} يوم - ${task.progress}%`}
                        >
                          {/* Progress fill */}
                          {showProgressMode && task.progress > 0 && task.progress < 100 && (
                            <div 
                              className="absolute inset-y-0 right-0 bg-white/30 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-medium">
                              {showProgressMode ? `${task.progress}%` : `${task.duration} يوم`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            {showProgressMode ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm">مكتمل</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm">قيد التنفيذ</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">لم يبدأ</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm">متأخر</span>
                </div>
              </>
            ) : (
              timelineData
                .filter(t => t.level === 1)
                .map((task) => (
                  <div key={task.code} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="text-sm">{task.title}</span>
                  </div>
                ))
            )}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-primary">{totalDays}</p>
              <p className="text-sm text-muted-foreground">يوم</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold text-accent">{Math.ceil(totalDays / 7)}</p>
              <p className="text-sm text-muted-foreground">أسبوع</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 text-center">
              <Play className="w-5 h-5 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{timelineData.filter(t => t.level === 1).length}</p>
              <p className="text-sm text-muted-foreground">مراحل رئيسية</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 text-center">
              <Target className="w-5 h-5 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold text-warning">{projectStats?.totalProgress || 0}%</p>
              <p className="text-sm text-muted-foreground">إجمالي التقدم</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {timelineData.length === 0 && !isGenerating && (
        <div className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h4 className="font-display text-lg font-semibold mb-2">لا يوجد جدول زمني</h4>
          <p className="text-sm text-muted-foreground mb-6">
            اضغط على أحد الأزرار أعلاه لتوليد الجدول الزمني بناءً على WBS
          </p>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && timelineData.length === 0 && (
        <div className="p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">جاري تحليل البيانات وتقدير المدد...</p>
        </div>
      )}
    </div>
  );
}
