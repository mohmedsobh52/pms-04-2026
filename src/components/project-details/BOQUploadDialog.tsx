import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF, extractWithOCROnly } from "@/lib/pdf-utils";
import { extractDataFromExcel, formatExcelDataForAnalysis } from "@/lib/excel-utils";
import { performLocalExcelAnalysis } from "@/lib/local-excel-analysis";
import { performLocalTextAnalysis } from "@/lib/local-text-analysis";
import type { ExcelExtractionResult } from "@/lib/excel-utils";

interface BOQUploadDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  isArabic: boolean;
  onSuccess: () => void;
}

type UploadStatus = "idle" | "processing" | "success" | "error";

function isExcelFile(file: File): boolean {
  return (
    file.type.includes("spreadsheet") ||
    file.type.includes("excel") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

export function BOQUploadDialog({
  open,
  onClose,
  projectId,
  isArabic,
  onSuccess,
}: BOQUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { toast } = useToast();

  const handleClose = () => {
    if (status === "processing") return;
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    onClose();
  };

  const handleSuccess = () => {
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    onClose();
    onSuccess();
  };

  const saveItemsToProject = useCallback(
    async (items: any[]) => {
      if (!items || items.length === 0) {
        throw new Error(isArabic ? "لم يتم استخراج أي بنود" : "No items extracted");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rows = items.map((item: any, idx: number) => ({
        project_id: projectId,
        user_id: user.id,
        item_number: item.item_number || item.number || String(idx + 1),
        description: item.description || item.desc || "",
        unit: item.unit || "",
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price || item.rate || 0) || null,
        total_price: parseFloat(item.total_price || item.amount || 0) || null,
        sort_order: idx,
      }));

      const { error } = await supabase.from("project_items").insert(rows);
      if (error) throw error;
    },
    [projectId, isArabic]
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setStatus("processing");

    try {
      let items: any[] = [];

      if (isExcelFile(selectedFile)) {
        setStatusMessage(isArabic ? "جارٍ قراءة ملف Excel..." : "Reading Excel file...");
        const excelData = await extractDataFromExcel(selectedFile);
        const localResult = performLocalExcelAnalysis(excelData.items, selectedFile.name);

        if (localResult.items.length > 0) {
          items = localResult.items;
        } else {
          const formatted = formatExcelDataForAnalysis(excelData);
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: formatted, fileName: selectedFile.name, projectId },
          });
          if (error) throw error;
          items = data?.items || [];
        }
      } else {
        setStatusMessage(isArabic ? "جارٍ استخراج النص من PDF..." : "Extracting text from PDF...");
        let text = "";
        try {
          text = await extractTextFromPDF(selectedFile);
        } catch {
          text = await extractWithOCROnly(selectedFile);
        }

        if (!text || text.trim().length < 50) {
          text = await extractWithOCROnly(selectedFile);
        }

        const localResult = performLocalTextAnalysis(text, { fileName: selectedFile.name });
        if (localResult.items.length > 0) {
          items = localResult.items;
        } else {
          setStatusMessage(isArabic ? "جارٍ تحليل البيانات بالذكاء الاصطناعي..." : "Analyzing with AI...");
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: text, fileName: selectedFile.name, projectId },
          });
          if (error) throw error;
          items = data?.items || [];
        }
      }

      setStatusMessage(isArabic ? "جارٍ حفظ البنود..." : "Saving items...");
      await saveItemsToProject(items);

      setStatus("success");
      setStatusMessage(
        isArabic
          ? `تم استخراج وحفظ ${items.length} بند بنجاح!`
          : `Successfully extracted and saved ${items.length} items!`
      );

      toast({
        title: isArabic ? "تم رفع BOQ بنجاح" : "BOQ Uploaded Successfully",
        description: isArabic
          ? `تم استخراج ${items.length} بند من الملف`
          : `Extracted ${items.length} items from the file`,
      });

      setTimeout(handleSuccess, 1500);
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(
        err?.message ||
          (isArabic ? "حدث خطأ أثناء معالجة الملف" : "An error occurred while processing the file")
      );
      toast({
        title: isArabic ? "خطأ في الرفع" : "Upload Error",
        description: err?.message || (isArabic ? "حاول مرة أخرى" : "Please try again"),
        variant: "destructive",
      });
    }
  }, [selectedFile, projectId, isArabic, saveItemsToProject, toast]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-lg"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle>
            {isArabic ? "رفع وتحليل ملف BOQ" : "Upload & Analyze BOQ File"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "ارفع ملف PDF أو Excel لاستخراج بنود جدول الكميات تلقائياً وإضافتها للمشروع"
              : "Upload a PDF or Excel file to automatically extract BOQ items and add them to this project"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === "idle" || status === "error" ? (
            <FileUpload
              onFileSelect={setSelectedFile}
              isProcessing={false}
              selectedFile={selectedFile}
              onClear={() => setSelectedFile(null)}
            />
          ) : null}

          {status === "processing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-medium text-foreground">
                {isArabic ? "جارٍ المعالجة..." : "Processing..."}
              </p>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-medium text-foreground">{statusMessage}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{statusMessage}</p>
            </div>
          )}

          {(status === "idle" || status === "error") && selectedFile && (
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleAnalyze}
                disabled={!selectedFile}
              >
                {isArabic ? "ابدأ التحليل والاستخراج" : "Start Analysis & Extraction"}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          )}

          {status === "idle" && !selectedFile && (
            <Button variant="outline" className="w-full" onClick={handleClose}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
