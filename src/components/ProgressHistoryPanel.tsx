import { useState } from "react";
import { 
  History, 
  Save, 
  Trash2, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useProgressHistory } from "@/hooks/useProgressHistory";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProgressHistoryPanelProps {
  projectId?: string;
  currentProgress?: number;
  currentSpent?: number;
  plannedProgress?: number;
  totalBudget?: number;
  spi?: number;
  cpi?: number;
  currency?: string;
  onLoadProgress?: (progress: number, spent: number) => void;
}

export function ProgressHistoryPanel({
  projectId,
  currentProgress = 0,
  currentSpent = 0,
  plannedProgress = 0,
  totalBudget = 0,
  spi,
  cpi,
  currency = "SAR",
  onLoadProgress,
}: ProgressHistoryPanelProps) {
  const { isArabic } = useLanguage();
  const { history, loading, saving, saveProgress, deleteRecord } = useProgressHistory(projectId);
  const [notes, setNotes] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = async () => {
    await saveProgress({
      projectId,
      actualProgress: currentProgress,
      actualSpentPercentage: currentSpent,
      actualCost: totalBudget * (currentSpent / 100),
      plannedProgress,
      spi,
      cpi,
      notes: notes || undefined,
      recordDate: new Date(recordDate),
    });
    setNotes("");
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M ${currency}`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K ${currency}`;
    }
    return `${value.toFixed(0)} ${currency}`;
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <History className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>
                {isArabic ? "سجل التقدم الفعلي" : "Progress History"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "تتبع التقدم والتكاليف عبر الزمن" : "Track progress and costs over time"}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Save Current Progress */}
        <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isArabic ? "حفظ التقدم الحالي" : "Save Current Progress"}
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-2 rounded bg-background border">
              <span className="text-muted-foreground block text-xs">
                {isArabic ? "التقدم" : "Progress"}
              </span>
              <span className="font-medium">{currentProgress.toFixed(1)}%</span>
            </div>
            <div className="p-2 rounded bg-background border">
              <span className="text-muted-foreground block text-xs">
                {isArabic ? "الإنفاق" : "Spent"}
              </span>
              <span className="font-medium">{currentSpent.toFixed(1)}%</span>
            </div>
            {spi !== undefined && (
              <div className="p-2 rounded bg-background border">
                <span className="text-muted-foreground block text-xs">SPI</span>
                <span className={cn("font-medium", spi >= 1 ? "text-green-600" : "text-red-600")}>
                  {spi.toFixed(2)}
                </span>
              </div>
            )}
            {cpi !== undefined && (
              <div className="p-2 rounded bg-background border">
                <span className="text-muted-foreground block text-xs">CPI</span>
                <span className={cn("font-medium", cpi >= 1 ? "text-green-600" : "text-red-600")}>
                  {cpi.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{isArabic ? "تاريخ السجل" : "Record Date"}</Label>
              <Input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isArabic ? "ملاحظات (اختياري)" : "Notes (optional)"}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isArabic ? "أضف ملاحظة..." : "Add a note..."}
                className="h-9"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isArabic ? "حفظ التقدم" : "Save Progress"}
          </Button>
        </div>

        {/* History List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {isArabic ? "السجلات السابقة" : "Previous Records"}
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </h4>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {isArabic ? "لا توجد سجلات سابقة" : "No previous records"}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {history.map((record) => (
                <AccordionItem 
                  key={record.id} 
                  value={record.id}
                  className="border rounded-lg px-3 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(record.record_date), "PPP", { 
                            locale: isArabic ? ar : enUS 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {record.actual_progress}%
                        </Badge>
                        {record.spi && (
                          <Badge 
                            variant={record.spi >= 1 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            SPI: {record.spi.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground block">
                          {isArabic ? "التقدم الفعلي" : "Actual Progress"}
                        </span>
                        <span className="font-medium flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {record.actual_progress}%
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-xs text-muted-foreground block">
                          {isArabic ? "الإنفاق" : "Spent"}
                        </span>
                        <span className="font-medium flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {record.actual_spent_percentage}%
                        </span>
                      </div>
                      {record.spi && (
                        <div className="p-2 rounded bg-muted/50">
                          <span className="text-xs text-muted-foreground block">SPI</span>
                          <span className={cn(
                            "font-medium",
                            record.spi >= 1 ? "text-green-600" : "text-red-600"
                          )}>
                            {record.spi.toFixed(3)}
                          </span>
                        </div>
                      )}
                      {record.cpi && (
                        <div className="p-2 rounded bg-muted/50">
                          <span className="text-xs text-muted-foreground block">CPI</span>
                          <span className={cn(
                            "font-medium",
                            record.cpi >= 1 ? "text-green-600" : "text-red-600"
                          )}>
                            {record.cpi.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {record.notes && (
                      <div className="p-2 rounded bg-muted/30 text-sm mb-3">
                        <span className="text-muted-foreground">{isArabic ? "ملاحظات:" : "Notes:"}</span>
                        <p>{record.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {onLoadProgress && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onLoadProgress(record.actual_progress, record.actual_spent_percentage)}
                          className="flex-1"
                        >
                          {isArabic ? "تحميل القيم" : "Load Values"}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {isArabic ? "حذف السجل؟" : "Delete Record?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {isArabic 
                                ? "هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء." 
                                : "Are you sure you want to delete this record? This action cannot be undone."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {isArabic ? "إلغاء" : "Cancel"}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRecord(record.id)}>
                              {isArabic ? "حذف" : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
