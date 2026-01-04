import { useState } from "react";
import { FileText, Download, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { generateWordDocument, downloadWordDocument } from "@/lib/docx-utils";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface TimelineItem {
  code: string;
  title: string;
  level: number;
  startDay: number;
  duration: number;
  progress: number;
  isCritical?: boolean;
}

interface ResourceItem {
  name: string;
  type: string;
  quantity: number;
  unit?: string;
  rate_per_day?: number;
  total_cost?: number;
  category?: string;
}

interface ProcurementItem {
  boq_item_number: string;
  description?: string;
  quantity?: number;
  unit?: string;
  estimated_cost?: number;
  lead_time_days?: number;
  status?: string;
  priority?: string;
}

interface WordExportDialogProps {
  projectName: string;
  boqItems?: BOQItem[];
  timelineItems?: TimelineItem[];
  resourceItems?: ResourceItem[];
  procurementItems?: ProcurementItem[];
  currency?: string;
  companyName?: string;
}

export function WordExportDialog({
  projectName,
  boqItems = [],
  timelineItems = [],
  resourceItems = [],
  procurementItems = [],
  currency = "SAR",
  companyName,
}: WordExportDialogProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fileName, setFileName] = useState(projectName || "project_report");
  
  const [sections, setSections] = useState({
    coverPage: true,
    tableOfContents: true,
    executiveSummary: true,
    boq: true,
    procurement: true,
    resources: true,
    timeline: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateWordDocument({
        projectName,
        boqItems,
        timelineItems,
        resourceItems,
        procurementItems,
        currency,
        companyName,
        includeSections: sections,
      });

      downloadWordDocument(blob, fileName);

      toast({
        title: isArabic ? "تم التصدير بنجاح" : "Export Successful",
        description: isArabic 
          ? "تم تحميل ملف Word بنجاح" 
          : "Word document downloaded successfully",
      });
      setOpen(false);
    } catch (error) {
      console.error("Word export error:", error);
      toast({
        title: isArabic ? "خطأ في التصدير" : "Export Error",
        description: isArabic 
          ? "فشل في إنشاء ملف Word" 
          : "Failed to generate Word document",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sectionLabels = {
    coverPage: isArabic ? "صفحة الغلاف" : "Cover Page",
    tableOfContents: isArabic ? "جدول المحتويات" : "Table of Contents",
    executiveSummary: isArabic ? "الملخص التنفيذي" : "Executive Summary",
    boq: isArabic ? "جدول الكميات" : "Bill of Quantities",
    procurement: isArabic ? "جدول المشتريات" : "Procurement Schedule",
    resources: isArabic ? "الموارد" : "Resources",
    timeline: isArabic ? "الجدول الزمني" : "Timeline",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 px-2 py-1.5 h-auto">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>{isArabic ? "تصدير Word احترافي" : "Professional Word Export"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {isArabic ? "تصدير Word مع جداول قابلة للتعديل" : "Export Word with Editable Tables"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Name */}
          <div className="space-y-2">
            <Label htmlFor="fileName">
              {isArabic ? "اسم الملف" : "File Name"}
            </Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="project_report"
            />
          </div>

          {/* Sections Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {isArabic ? "الأقسام المضمنة" : "Included Sections"}
            </Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
              {(Object.keys(sections) as (keyof typeof sections)[]).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={sections[key]}
                    onCheckedChange={() => toggleSection(key)}
                  />
                  <Label htmlFor={key} className="text-sm cursor-pointer">
                    {sectionLabels[key]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Data Summary */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-300">
              {isArabic ? "ملخص البيانات:" : "Data Summary:"}
            </p>
            <ul className="text-blue-600 dark:text-blue-400 space-y-0.5">
              <li>• {boqItems.length} {isArabic ? "بند في جدول الكميات" : "BOQ items"}</li>
              <li>• {procurementItems.length} {isArabic ? "بند مشتريات" : "procurement items"}</li>
              <li>• {resourceItems.length} {isArabic ? "مورد" : "resources"}</li>
              <li>• {timelineItems.length} {isArabic ? "مهمة زمنية" : "timeline tasks"}</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleExport} disabled={isGenerating} className="gap-2">
            <Download className="w-4 h-4" />
            {isGenerating 
              ? (isArabic ? "جاري التصدير..." : "Exporting...") 
              : (isArabic ? "تصدير Word" : "Export Word")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
