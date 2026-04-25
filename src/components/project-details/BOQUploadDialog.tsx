import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { Loader2, CheckCircle2, AlertTriangle, RotateCw } from "lucide-react";
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
  projectId?: string;
  isArabic: boolean;
  onSuccess: () => void;
  onSuccessWithData?: (data: any) => void;
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
  onSuccessWithData,
}: BOQUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorContext, setErrorContext] = useState<{
    table?: string;
    hint?: string;
    canRetry?: boolean;
  } | null>(null);
  const lastItemsRef = useRef<any[] | null>(null);
  const { toast } = useToast();

  const handleClose = () => {
    if (status === "processing") return;
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setErrorContext(null);
    lastItemsRef.current = null;
    onClose();
  };

  const handleSuccess = () => {
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setErrorContext(null);
    lastItemsRef.current = null;
    onClose();
    onSuccess();
  };

  const saveItemsToProject = useCallback(
    async (items: any[]) => {
      if (!items || items.length === 0) {
        const e: any = new Error(isArabic ? "لم يتم استخراج أي بنود" : "No items extracted");
        e._ctx = { canRetry: false };
        throw e;
      }
      if (!projectId) {
        const e: any = new Error(isArabic ? "معرّف المشروع غير موجود" : "Project ID is missing");
        e._ctx = {
          canRetry: false,
          hint: isArabic
            ? "أنشئ المشروع من شاشة المشاريع أولاً ثم أعد رفع الملف."
            : "Create the project from the Projects screen first, then re-upload the file.",
        };
        throw e;
      }

      // Verify auth and project ownership before insert (clearer errors than RLS)
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        const e: any = new Error(
          isArabic
            ? "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Session expired. Please sign in again."
        );
        e._ctx = { canRetry: false };
        throw e;
      }

      // Check ownership in either saved_projects or project_data (RLS supports both)
      const [savedRes, dataRes] = await Promise.all([
        supabase.from("saved_projects").select("id, user_id").eq("id", projectId).maybeSingle(),
        supabase.from("project_data").select("id, user_id").eq("id", projectId).maybeSingle(),
      ]);

      let projectRow = savedRes.data || dataRes.data;
      let sourceTable: "saved_projects" | "project_data" = savedRes.data
        ? "saved_projects"
        : dataRes.data
        ? "project_data"
        : "saved_projects";

      // Auto-create the project in saved_projects if it only exists locally
      if (!projectRow) {
        const { data: created, error: createErr } = await supabase
          .from("saved_projects")
          .insert({
            id: projectId,
            user_id: authData.user.id,
            name: isArabic ? "مشروع بدون اسم" : "Untitled project",
            analysis_data: {},
          })
          .select("id, user_id")
          .maybeSingle();

        if (createErr || !created) {
          const e: any = new Error(
            isArabic
              ? `تعذّر إنشاء سجل المشروع في جدول "saved_projects". ${
                  createErr?.message || ""
                }`
              : `Could not create the project record in "saved_projects". ${
                  createErr?.message || ""
                }`
          );
          e._ctx = {
            table: "saved_projects",
            canRetry: true,
            hint: isArabic
              ? "خطوات الإصلاح: ١) تأكد من تسجيل الدخول. ٢) أنشئ المشروع من شاشة المشاريع. ٣) اضغط إعادة المحاولة."
              : "Fix: 1) Confirm you are signed in. 2) Recreate the project from the Projects screen. 3) Click Retry.",
          };
          throw e;
        }
        projectRow = created;
        sourceTable = "saved_projects";
      }

      if (projectRow.user_id !== authData.user.id) {
        const e: any = new Error(
          isArabic
            ? `ليس لديك صلاحية لإضافة بنود إلى هذا المشروع (الجدول: ${sourceTable}).`
            : `You don't have permission to add items to this project (table: ${sourceTable}).`
        );
        e._ctx = {
          table: sourceTable,
          canRetry: false,
          hint: isArabic
            ? "هذا المشروع مملوك لمستخدم آخر. سجّل الدخول بالحساب المالك أو أنشئ مشروعاً جديداً."
            : "This project belongs to another user. Sign in with the owning account or create a new project.",
        };
        throw e;
      }

      const rows = items.map((item: any, idx: number) => ({
        project_id: projectId,
        item_number: item.item_number || item.number || String(idx + 1),
        description: item.description || item.desc || "",
        unit: item.unit || "",
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price || item.rate || 0) || null,
        total_price: parseFloat(item.total_price || item.amount || 0) || null,
        sort_order: idx,
      }));

      const { error } = await supabase.from("project_items").insert(rows);
      if (error) {
        const isRls = error.message?.toLowerCase().includes("row-level security");
        if (isRls) {
          const e: any = new Error(
            isArabic
              ? `فشل حفظ البنود في جدول "project_items" بسبب سياسة الأمان (RLS). المشروع موجود في جدول "${sourceTable}".`
              : `Saving items to "project_items" failed due to RLS. The project exists in "${sourceTable}".`
          );
          e._ctx = {
            table: "project_items",
            canRetry: true,
            hint: isArabic
              ? `خطوات الإصلاح: ١) تأكد أن المشروع تم إنشاؤه بنفس حسابك في "${sourceTable}". ٢) سجّل الخروج والدخول مجدداً. ٣) اضغط إعادة المحاولة.`
              : `Fix: 1) Ensure the project in "${sourceTable}" belongs to your account. 2) Sign out and back in. 3) Click Retry.`,
          };
          throw e;
        }
        const e: any = new Error(error.message);
        e._ctx = { table: "project_items", canRetry: true };
        throw e;
      }
    },
    [projectId, isArabic]
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setStatus("processing");
    setErrorContext(null);

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

      lastItemsRef.current = items;

      if (!projectId) {
        // لا يوجد مشروع — نمرر البيانات مباشرة للـ context
        onSuccessWithData?.({ items, file_name: selectedFile.name });
        setStatus("success");
        setStatusMessage(
          isArabic
            ? `تم استخراج ${items.length} بند بنجاح!`
            : `Successfully extracted ${items.length} items!`
        );
        toast({
          title: isArabic ? "تم تحليل BOQ بنجاح" : "BOQ Analyzed Successfully",
          description: isArabic
            ? `تم استخراج ${items.length} بند من الملف`
            : `Extracted ${items.length} items from the file`,
        });
        setTimeout(handleSuccess, 1500);
        return;
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
      setErrorContext(err?._ctx || null);
      toast({
        title: isArabic ? "خطأ في الرفع" : "Upload Error",
        description: err?.message || (isArabic ? "حاول مرة أخرى" : "Please try again"),
        variant: "destructive",
      });
    }
  }, [selectedFile, projectId, isArabic, saveItemsToProject, toast]);

  const handleRetrySave = useCallback(async () => {
    const items = lastItemsRef.current;
    if (!items || items.length === 0) {
      // No cached items — re-run full analysis
      handleAnalyze();
      return;
    }
    setStatus("processing");
    setStatusMessage(isArabic ? "إعادة محاولة الحفظ..." : "Retrying save...");
    setErrorContext(null);
    try {
      await saveItemsToProject(items);
      setStatus("success");
      setStatusMessage(
        isArabic
          ? `تم حفظ ${items.length} بند بنجاح!`
          : `Successfully saved ${items.length} items!`
      );
      toast({
        title: isArabic ? "تم الحفظ" : "Saved",
        description: isArabic ? "نجحت إعادة المحاولة" : "Retry succeeded",
      });
      setTimeout(handleSuccess, 1200);
    } catch (err: any) {
      setStatus("error");
      setStatusMessage(err?.message || (isArabic ? "فشل الحفظ" : "Save failed"));
      setErrorContext(err?._ctx || null);
      toast({
        title: isArabic ? "فشلت إعادة المحاولة" : "Retry failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  }, [saveItemsToProject, isArabic, toast, handleAnalyze]);

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
              <CheckCircle2 className="w-10 h-10 text-primary" />
              <p className="font-medium text-foreground">{statusMessage}</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-destructive font-medium">{statusMessage}</p>
                {errorContext?.table && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">
                      {isArabic ? "الجدول المتأثر: " : "Affected table: "}
                    </span>
                    <code className="px-1 py-0.5 rounded bg-muted">{errorContext.table}</code>
                  </p>
                )}
                {errorContext?.hint && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {errorContext.hint}
                  </p>
                )}
              </div>
            </div>
          )}

          {(status === "idle" || status === "error") && selectedFile && (
            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1 min-w-[160px]"
                onClick={handleAnalyze}
                disabled={!selectedFile}
              >
                {isArabic ? "ابدأ التحليل والاستخراج" : "Start Analysis & Extraction"}
              </Button>
              {status === "error" && errorContext?.canRetry && lastItemsRef.current && (
                <Button
                  variant="secondary"
                  onClick={handleRetrySave}
                  className="gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  {isArabic ? "إعادة محاولة الحفظ" : "Retry Save"}
                </Button>
              )}
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
