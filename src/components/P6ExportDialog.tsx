import { useState } from "react";
import {
  Calendar,
  Download,
  Loader2,
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { XLSX } from '@/lib/exceljs-utils';

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

interface P6Activity {
  activity_id: string;
  activity_name: string;
  wbs_id: string;
  wbs_name: string;
  original_duration: number;
  remaining_duration: number;
  start_date: string;
  finish_date: string;
  activity_type: string;
  resource_assignments: string[];
  budget_cost: number;
  actual_cost: number;
  at_completion_cost: number;
  physical_percent: number;
  status: string;
  predecessor_ids: string[];
  successor_ids: string[];
}

interface WBSElement {
  wbs_id: string;
  wbs_name: string;
  parent_wbs_id: string | null;
  level: number;
}

interface P6ExportResult {
  wbs_structure: WBSElement[];
  activities: P6Activity[];
  project_info: {
    name: string;
    start_date: string;
    finish_date: string;
    total_budget: number;
    currency: string;
  };
  summary: {
    total_activities: number;
    total_duration_days: number;
    critical_activities: number;
  };
}

interface P6ExportDialogProps {
  items: BOQItem[];
  projectName?: string;
  trigger?: React.ReactNode;
}

export function P6ExportDialog({ items, projectName = "Project", trigger }: P6ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<P6ExportResult | null>(null);
  const [settings, setSettings] = useState({
    startDate: new Date().toISOString().split('T')[0],
    workingDaysPerWeek: 6,
    hoursPerDay: 8,
    includeResources: true,
    includeCosts: true,
    calculateCriticalPath: true,
    exportFormat: 'xlsx' as 'xlsx' | 'xer' | 'xml'
  });

  const { toast } = useToast();
  const { isArabic } = useLanguage();

  const generateP6Export = async () => {
    if (items.length === 0) {
      toast({
        title: isArabic ? "لا توجد بنود" : "No items",
        description: isArabic ? "يرجى إضافة بنود للتصدير" : "Please add items to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-p6-export', {
        body: {
          boq_items: items,
          project_name: projectName,
          start_date: settings.startDate,
          working_days_per_week: settings.workingDaysPerWeek,
          hours_per_day: settings.hoursPerDay,
          include_resources: settings.includeResources,
          include_costs: settings.includeCosts
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setExportResult(data);

      toast({
        title: isArabic ? "تم إنشاء هيكل P6" : "P6 structure generated",
        description: isArabic 
          ? `${data.activities?.length || 0} نشاط و ${data.wbs_structure?.length || 0} عنصر WBS`
          : `${data.activities?.length || 0} activities and ${data.wbs_structure?.length || 0} WBS elements`
      });

    } catch (error) {
      console.error("P6 export error:", error);
      toast({
        title: isArabic ? "خطأ في التصدير" : "Export error",
        description: error instanceof Error ? error.message : isArabic ? "حدث خطأ" : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExcel = () => {
    if (!exportResult) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Project Info sheet
    const projectInfo = [
      [isArabic ? "معلومات المشروع" : "Project Information"],
      [""],
      [isArabic ? "اسم المشروع" : "Project Name", exportResult.project_info.name],
      [isArabic ? "تاريخ البداية" : "Start Date", exportResult.project_info.start_date],
      [isArabic ? "تاريخ النهاية" : "Finish Date", exportResult.project_info.finish_date],
      [isArabic ? "الميزانية الإجمالية" : "Total Budget", exportResult.project_info.total_budget],
      [isArabic ? "العملة" : "Currency", exportResult.project_info.currency],
      [""],
      [isArabic ? "الملخص" : "Summary"],
      [isArabic ? "إجمالي الأنشطة" : "Total Activities", exportResult.summary.total_activities],
      [isArabic ? "إجمالي المدة (أيام)" : "Total Duration (days)", exportResult.summary.total_duration_days],
      [isArabic ? "الأنشطة الحرجة" : "Critical Activities", exportResult.summary.critical_activities]
    ];
    const wsProject = XLSX.utils.aoa_to_sheet(projectInfo);
    XLSX.utils.book_append_sheet(wb, wsProject, isArabic ? "معلومات المشروع" : "Project Info");

    // WBS sheet
    const wbsHeaders = [
      isArabic ? "رمز WBS" : "WBS ID",
      isArabic ? "اسم WBS" : "WBS Name",
      isArabic ? "WBS الأب" : "Parent WBS",
      isArabic ? "المستوى" : "Level"
    ];
    const wbsData = exportResult.wbs_structure.map(wbs => [
      wbs.wbs_id,
      wbs.wbs_name,
      wbs.parent_wbs_id || "",
      wbs.level
    ]);
    const wsWBS = XLSX.utils.aoa_to_sheet([wbsHeaders, ...wbsData]);
    XLSX.utils.book_append_sheet(wb, wsWBS, "WBS");

    // Activities sheet
    const activityHeaders = [
      isArabic ? "رمز النشاط" : "Activity ID",
      isArabic ? "اسم النشاط" : "Activity Name",
      isArabic ? "رمز WBS" : "WBS ID",
      isArabic ? "المدة الأصلية" : "Original Duration",
      isArabic ? "تاريخ البداية" : "Start Date",
      isArabic ? "تاريخ النهاية" : "Finish Date",
      isArabic ? "نوع النشاط" : "Activity Type",
      isArabic ? "تكلفة الميزانية" : "Budget Cost",
      isArabic ? "نسبة الإنجاز" : "Physical %",
      isArabic ? "الحالة" : "Status",
      isArabic ? "السابقين" : "Predecessors"
    ];
    const activityData = exportResult.activities.map(act => [
      act.activity_id,
      act.activity_name,
      act.wbs_id,
      act.original_duration,
      act.start_date,
      act.finish_date,
      act.activity_type,
      act.budget_cost,
      act.physical_percent,
      act.status,
      act.predecessor_ids.join(", ")
    ]);
    const wsActivities = XLSX.utils.aoa_to_sheet([activityHeaders, ...activityData]);
    XLSX.utils.book_append_sheet(wb, wsActivities, isArabic ? "الأنشطة" : "Activities");

    // Download
    XLSX.writeFile(wb, `${projectName}_P6_Export.xlsx`);

    toast({
      title: isArabic ? "تم التحميل" : "Downloaded",
      description: isArabic ? "تم تحميل ملف Excel بنجاح" : "Excel file downloaded successfully"
    });
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadXER = () => {
    if (!exportResult) return;
    const today = new Date().toISOString().split("T")[0];
    const tab = "\t";
    const lines: string[] = [];
    // XER header
    lines.push(`ERMHDR${tab}18.8${tab}${today}${tab}Project${tab}Lovable${tab}Lovable${tab}dbxDatabaseNoName${tab}Project Management${tab}USD`);

    // PROJECT
    lines.push(`%T${tab}PROJECT`);
    lines.push(`%F${tab}proj_id${tab}proj_short_name${tab}plan_start_date${tab}plan_end_date`);
    lines.push(`%R${tab}1${tab}${(exportResult.project_info.name || "PROJ").replace(/\s+/g, "_").slice(0, 20)}${tab}${exportResult.project_info.start_date}${tab}${exportResult.project_info.finish_date}`);

    // PROJWBS
    lines.push(`%T${tab}PROJWBS`);
    lines.push(`%F${tab}wbs_id${tab}proj_id${tab}parent_wbs_id${tab}wbs_short_name${tab}wbs_name`);
    exportResult.wbs_structure.forEach((w, i) => {
      lines.push(`%R${tab}${i + 1}${tab}1${tab}${w.parent_wbs_id ?? ""}${tab}${w.wbs_id}${tab}${w.wbs_name}`);
    });

    // TASK
    lines.push(`%T${tab}TASK`);
    lines.push(`%F${tab}task_id${tab}proj_id${tab}wbs_id${tab}task_code${tab}task_name${tab}target_drtn_hr_cnt${tab}target_start_date${tab}target_end_date${tab}status_code${tab}phys_complete_pct`);
    exportResult.activities.forEach((a, i) => {
      const hrs = Math.round(a.original_duration * settings.hoursPerDay);
      lines.push(`%R${tab}${i + 1}${tab}1${tab}${a.wbs_id}${tab}${a.activity_id}${tab}${a.activity_name}${tab}${hrs}${tab}${a.start_date}${tab}${a.finish_date}${tab}${a.status || "TK_NotStart"}${tab}${a.physical_percent || 0}`);
    });

    // TASKPRED
    if (exportResult.activities.some((a) => a.predecessor_ids?.length)) {
      lines.push(`%T${tab}TASKPRED`);
      lines.push(`%F${tab}task_pred_id${tab}task_id${tab}pred_task_id${tab}pred_type`);
      let pid = 1;
      exportResult.activities.forEach((a, i) => {
        (a.predecessor_ids || []).forEach((pred) => {
          const predIdx = exportResult.activities.findIndex((x) => x.activity_id === pred);
          if (predIdx >= 0) {
            lines.push(`%R${tab}${pid++}${tab}${i + 1}${tab}${predIdx + 1}${tab}PR_FS`);
          }
        });
      });
    }
    lines.push(`%E`);
    triggerDownload(lines.join("\n"), `${projectName}_P6.xer`, "text/plain");
    toast({
      title: isArabic ? "تم التحميل" : "Downloaded",
      description: isArabic ? "تم إنشاء ملف XER" : "XER file generated",
    });
  };

  const downloadXML = () => {
    if (!exportResult) return;
    const esc = (s: string) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
    const wbsXml = exportResult.wbs_structure.map((w) => `
    <WBS ObjectId="${esc(w.wbs_id)}">
      <Code>${esc(w.wbs_id)}</Code>
      <Name>${esc(w.wbs_name)}</Name>
      <ParentObjectId>${esc(w.parent_wbs_id || "")}</ParentObjectId>
      <SequenceNumber>${w.level}</SequenceNumber>
    </WBS>`).join("");
    const actXml = exportResult.activities.map((a) => `
    <Activity ObjectId="${esc(a.activity_id)}">
      <Id>${esc(a.activity_id)}</Id>
      <Name>${esc(a.activity_name)}</Name>
      <WBSObjectId>${esc(a.wbs_id)}</WBSObjectId>
      <PlannedDuration>${a.original_duration * settings.hoursPerDay}</PlannedDuration>
      <PlannedStartDate>${a.start_date}</PlannedStartDate>
      <PlannedFinishDate>${a.finish_date}</PlannedFinishDate>
      <Status>${esc(a.status || "Not Started")}</Status>
      <PercentComplete>${a.physical_percent || 0}</PercentComplete>
      <PlannedTotalCost>${a.budget_cost || 0}</PlannedTotalCost>
      ${(a.predecessor_ids || []).map((p) => `<Predecessor><ActivityObjectId>${esc(p)}</ActivityObjectId><Type>Finish to Start</Type></Predecessor>`).join("")}
    </Activity>`).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<APIBusinessObjects xmlns="http://xmlns.oracle.com/Primavera/P6/V19.12/API/BusinessObjects" Version="19.12">
  <Project ObjectId="1">
    <Id>${esc(exportResult.project_info.name)}</Id>
    <Name>${esc(exportResult.project_info.name)}</Name>
    <PlannedStartDate>${exportResult.project_info.start_date}</PlannedStartDate>
    <MustFinishByDate>${exportResult.project_info.finish_date}</MustFinishByDate>
    <Currency>${esc(exportResult.project_info.currency)}</Currency>${wbsXml}${actXml}
  </Project>
</APIBusinessObjects>`;
    triggerDownload(xml, `${projectName}_P6.xml`, "application/xml");
    toast({
      title: isArabic ? "تم التحميل" : "Downloaded",
      description: isArabic ? "تم إنشاء ملف XML" : "XML file generated",
    });
  };

  const handleDownload = () => {
    if (settings.exportFormat === "xer") downloadXER();
    else if (settings.exportFormat === "xml") downloadXML();
    else downloadExcel();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            {isArabic ? "تصدير P6" : "P6 Export"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isArabic ? "تصدير إلى Primavera P6" : "Export to Primavera P6"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  {isArabic ? "إعدادات التصدير" : "Export Settings"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "تاريخ بداية المشروع" : "Project Start Date"}</Label>
                  <Input
                    type="date"
                    value={settings.startDate}
                    onChange={(e) => setSettings(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{isArabic ? "أيام العمل في الأسبوع" : "Working Days per Week"}</Label>
                  <Select 
                    value={settings.workingDaysPerWeek.toString()}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, workingDaysPerWeek: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{isArabic ? "ساعات العمل اليومية" : "Hours per Day"}</Label>
                  <Select 
                    value={settings.hoursPerDay.toString()}
                    onValueChange={(v) => setSettings(prev => ({ ...prev, hoursPerDay: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{isArabic ? "صيغة التصدير" : "Export Format"}</Label>
                  <Select 
                    value={settings.exportFormat}
                    onValueChange={(v: any) => setSettings(prev => ({ ...prev, exportFormat: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="xer">Primavera XER (.xer)</SelectItem>
                      <SelectItem value="xml">Primavera XML (.xml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between col-span-2">
                  <Label>{isArabic ? "تضمين الموارد" : "Include Resources"}</Label>
                  <Switch
                    checked={settings.includeResources}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeResources: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between col-span-2">
                  <Label>{isArabic ? "تضمين التكاليف" : "Include Costs"}</Label>
                  <Switch
                    checked={settings.includeCosts}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeCosts: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      {isArabic ? "معلومات التصدير" : "Export Information"}
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 mt-1">
                      {isArabic 
                        ? `سيتم تحويل ${items.length} بند من جدول الكميات إلى أنشطة وهيكل WBS متوافق مع Primavera P6`
                        : `${items.length} BOQ items will be converted to activities and WBS structure compatible with Primavera P6`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            {!exportResult && (
              <Button 
                onClick={generateP6Export} 
                disabled={isExporting || items.length === 0}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isArabic ? "جاري التحويل..." : "Converting..."}
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    {isArabic ? "إنشاء هيكل P6" : "Generate P6 Structure"}
                  </>
                )}
              </Button>
            )}

            {/* Results */}
            {exportResult && (
              <div className="space-y-4">
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                          {isArabic ? "تم إنشاء الهيكل بنجاح" : "Structure generated successfully"}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{exportResult.summary.total_activities} {isArabic ? "نشاط" : "activities"}</Badge>
                          <Badge variant="outline">{exportResult.wbs_structure.length} WBS</Badge>
                          <Badge variant="outline">{exportResult.summary.total_duration_days} {isArabic ? "يوم" : "days"}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {isArabic ? "معاينة الأنشطة" : "Activities Preview"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[200px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="p-2 text-start">{isArabic ? "الرمز" : "ID"}</th>
                            <th className="p-2 text-start">{isArabic ? "النشاط" : "Activity"}</th>
                            <th className="p-2 text-start">{isArabic ? "المدة" : "Duration"}</th>
                            <th className="p-2 text-start">{isArabic ? "البداية" : "Start"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exportResult.activities.slice(0, 10).map((act, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 font-mono text-xs">{act.activity_id}</td>
                              <td className="p-2">{act.activity_name.slice(0, 40)}...</td>
                              <td className="p-2">{act.original_duration}d</td>
                              <td className="p-2">{act.start_date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {exportResult.activities.length > 10 && (
                        <p className="text-center text-muted-foreground text-sm mt-2">
                          +{exportResult.activities.length - 10} {isArabic ? "نشاط آخر" : "more activities"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {exportResult && (
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              {isArabic ? `تحميل ${settings.exportFormat.toUpperCase()}` : `Download ${settings.exportFormat.toUpperCase()}`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            {isArabic ? "إغلاق" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
