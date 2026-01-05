import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Mail,
  Clock,
  Trash2,
  Plus,
  Loader2,
  Send,
  CalendarClock
} from "lucide-react";

interface ScheduledReport {
  id: string;
  report_name: string;
  report_type: string;
  schedule_type: string;
  schedule_day: number;
  schedule_hour: number;
  recipient_emails: string[];
  include_charts: boolean;
  include_comparison: boolean;
  is_active: boolean;
  last_sent_at: string | null;
  next_scheduled_at: string | null;
}

interface ScheduledReportsDialogProps {
  projectId?: string;
  projectName?: string;
  reportData?: any;
}

const SCHEDULE_TYPES = [
  { value: "daily", labelEn: "Daily", labelAr: "يومي" },
  { value: "weekly", labelEn: "Weekly", labelAr: "أسبوعي" },
  { value: "monthly", labelEn: "Monthly", labelAr: "شهري" },
];

const REPORT_TYPES = [
  { value: "summary", labelEn: "Summary Report", labelAr: "تقرير ملخص" },
  { value: "detailed", labelEn: "Detailed Report", labelAr: "تقرير تفصيلي" },
  { value: "comparison", labelEn: "Comparison Report", labelAr: "تقرير مقارنة" },
];

const DAYS_OF_WEEK = [
  { value: 0, labelEn: "Sunday", labelAr: "الأحد" },
  { value: 1, labelEn: "Monday", labelAr: "الاثنين" },
  { value: 2, labelEn: "Tuesday", labelAr: "الثلاثاء" },
  { value: 3, labelEn: "Wednesday", labelAr: "الأربعاء" },
  { value: 4, labelEn: "Thursday", labelAr: "الخميس" },
  { value: 5, labelEn: "Friday", labelAr: "الجمعة" },
  { value: 6, labelEn: "Saturday", labelAr: "السبت" },
];

export function ScheduledReportsDialog({ projectId, projectName, reportData }: ScheduledReportsDialogProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);

  // Form state
  const [reportName, setReportName] = useState(projectName ? `${projectName} Report` : "");
  const [reportType, setReportType] = useState("summary");
  const [scheduleType, setScheduleType] = useState("weekly");
  const [scheduleDay, setScheduleDay] = useState(1);
  const [scheduleHour, setScheduleHour] = useState(9);
  const [recipientEmails, setRecipientEmails] = useState("");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeComparison, setIncludeComparison] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchSchedules();
    }
  }, [isOpen, user]);

  const fetchSchedules = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("scheduled_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextScheduled = (type: string, day: number, hour: number): Date => {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, 0, 0, 0);

    switch (type) {
      case "daily":
        if (now.getHours() >= hour) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case "weekly":
        const currentDay = now.getDay();
        let daysUntilNext = day - currentDay;
        if (daysUntilNext < 0 || (daysUntilNext === 0 && now.getHours() >= hour)) {
          daysUntilNext += 7;
        }
        next.setDate(next.getDate() + daysUntilNext);
        break;
      case "monthly":
        next.setDate(day);
        if (now.getDate() > day || (now.getDate() === day && now.getHours() >= hour)) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  };

  const handleSave = async () => {
    if (!user) return;

    const emails = recipientEmails.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast.error(isArabic ? "يرجى إدخال بريد إلكتروني واحد على الأقل" : "Please enter at least one email");
      return;
    }

    if (!reportName.trim()) {
      toast.error(isArabic ? "يرجى إدخال اسم التقرير" : "Please enter report name");
      return;
    }

    setIsSaving(true);
    try {
      const nextScheduled = calculateNextScheduled(scheduleType, scheduleDay, scheduleHour);

      const { error } = await supabase
        .from("scheduled_reports")
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          report_name: reportName,
          report_type: reportType,
          schedule_type: scheduleType,
          schedule_day: scheduleDay,
          schedule_hour: scheduleHour,
          recipient_emails: emails,
          include_charts: includeCharts,
          include_comparison: includeComparison,
          next_scheduled_at: nextScheduled.toISOString(),
          is_active: true
        });

      if (error) throw error;

      toast.success(isArabic ? "تم إنشاء التقرير المجدول" : "Scheduled report created");
      setReportName("");
      setRecipientEmails("");
      fetchSchedules();
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(isArabic ? "خطأ في الحفظ" : "Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      fetchSchedules();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(isArabic ? "تم الحذف" : "Deleted");
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleSendNow = async (schedule: ScheduledReport) => {
    setIsSending(schedule.id);
    try {
      const { error } = await supabase.functions.invoke("send-scheduled-report", {
        body: {
          report_id: schedule.id,
          recipient_emails: schedule.recipient_emails,
          report_name: schedule.report_name,
          report_type: schedule.report_type,
          project_name: projectName,
          report_data: reportData || { summary: { total_items: 0, analyzed_files: 0 } }
        }
      });

      if (error) throw error;

      toast.success(isArabic ? "تم إرسال التقرير" : "Report sent successfully");
      fetchSchedules();
    } catch (error: any) {
      console.error("Error sending report:", error);
      toast.error(isArabic ? "خطأ في الإرسال" : "Error sending report");
    } finally {
      setIsSending(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarClock className="w-4 h-4" />
          {isArabic ? "تقارير مجدولة" : "Scheduled Reports"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isArabic ? "التقارير المجدولة" : "Scheduled Reports"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "إنشاء تقارير تلقائية ترسل عبر البريد الإلكتروني"
              : "Create automatic reports sent via email"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {isArabic ? "إنشاء تقرير مجدول جديد" : "Create New Scheduled Report"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم التقرير" : "Report Name"}</Label>
                  <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder={isArabic ? "التقرير الأسبوعي" : "Weekly Report"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التقرير" : "Report Type"}</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {isArabic ? type.labelAr : type.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "التكرار" : "Frequency"}</Label>
                  <Select value={scheduleType} onValueChange={setScheduleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {isArabic ? type.labelAr : type.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {scheduleType === "weekly" && (
                  <div className="space-y-2">
                    <Label>{isArabic ? "اليوم" : "Day"}</Label>
                    <Select value={scheduleDay.toString()} onValueChange={(v) => setScheduleDay(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {isArabic ? day.labelAr : day.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scheduleType === "monthly" && (
                  <div className="space-y-2">
                    <Label>{isArabic ? "اليوم من الشهر" : "Day of Month"}</Label>
                    <Select value={scheduleDay.toString()} onValueChange={(v) => setScheduleDay(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{isArabic ? "الساعة" : "Hour"}</Label>
                  <Select value={scheduleHour.toString()} onValueChange={(v) => setScheduleHour(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isArabic ? "البريد الإلكتروني للمستلمين" : "Recipient Emails"}</Label>
                <Input
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "افصل بين العناوين بفاصلة" : "Separate multiple emails with commas"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{isArabic ? "تضمين الرسوم البيانية" : "Include charts"}</Label>
                  <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{isArabic ? "تضمين المقارنات" : "Include comparisons"}</Label>
                  <Switch checked={includeComparison} onCheckedChange={setIncludeComparison} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isArabic ? "إنشاء التقرير المجدول" : "Create Scheduled Report"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Schedules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isArabic ? "التقارير المجدولة الحالية" : "Current Scheduled Reports"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : schedules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {isArabic ? "لا توجد تقارير مجدولة" : "No scheduled reports"}
                </p>
              ) : (
                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <div 
                      key={schedule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{schedule.report_name}</span>
                          <Badge variant={schedule.is_active ? "default" : "secondary"}>
                            {schedule.is_active
                              ? (isArabic ? "نشط" : "Active")
                              : (isArabic ? "متوقف" : "Paused")}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type)?.[isArabic ? 'labelAr' : 'labelEn']}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {schedule.recipient_emails.length} {isArabic ? "مستلم" : "recipients"}
                          </span>
                        </div>
                        {schedule.last_sent_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {isArabic ? "آخر إرسال:" : "Last sent:"} {new Date(schedule.last_sent_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSendNow(schedule)}
                          disabled={isSending === schedule.id}
                        >
                          {isSending === schedule.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
