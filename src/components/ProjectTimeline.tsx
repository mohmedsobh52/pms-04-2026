import { useState, useMemo } from "react";
import { Calendar, Clock, Play, ChevronLeft, ChevronRight, Loader2, Brain, Zap, Target, TrendingUp, AlertTriangle, CheckCircle2, Edit3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

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
}

interface ProjectTimelineProps {
  wbsData: WBSItem[];
  projectName?: string;
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

export function ProjectTimeline({ wbsData, projectName = "المشروع" }: ProjectTimelineProps) {
  const [viewMode, setViewMode] = useState<"weeks" | "months">("weeks");
  const [isGenerating, setIsGenerating] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [startOffset, setStartOffset] = useState(0);
  const [showProgressMode, setShowProgressMode] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
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

  // Generate basic timeline from WBS
  const generateBasicTimeline = () => {
    let currentDay = 0;
    const items: TimelineItem[] = wbsData.map((item, idx) => {
      const baseDuration = item.level === 1 ? 30 : item.level === 2 ? 14 : 7;
      const duration = baseDuration + (item.items.length * 2);
      const startDay = currentDay;
      
      if (item.level === 1) {
        currentDay += Math.max(duration, 7);
      } else if (item.level === 2) {
        currentDay += Math.max(duration / 2, 5);
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
      description: `تم توليد جدول زمني لـ ${items.length} مهمة`,
    });
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
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: task.color }}
                        />
                      )}
                      <span className="text-sm truncate" title={task.title}>
                        {task.title}
                      </span>
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
