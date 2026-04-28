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
import { logRlsError } from "@/lib/rls-error-log";

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
    ref?: string;
    autoCreated?: boolean;
  } | null>(null);
  const lastItemsRef = useRef<any[] | null>(null);
  const autoRetriedRef = useRef(false);
  const { toast } = useToast();

  const handleClose = () => {
    if (status === "processing") return;
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setErrorContext(null);
    lastItemsRef.current = null;
    autoRetriedRef.current = false;
    onClose();
  };

  const handleSuccess = () => {
    setSelectedFile(null);
    setStatus("idle");
    setStatusMessage("");
    setErrorContext(null);
    lastItemsRef.current = null;
    autoRetriedRef.current = false;
    onClose();
    onSuccess();
  };

  const saveItemsToProject = useCallback(
    async (items: any[]): Promise<{ autoCreated: boolean; userId: string }> => {
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
      const userId = authData.user.id;

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
      let autoCreated = false;

      // Auto-create the project in saved_projects if it only exists locally
      if (!projectRow) {
        const { data: created, error: createErr } = await supabase
          .from("saved_projects")
          .insert({
            id: projectId,
            user_id: userId,
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
          e._userId = userId;
          e._projectId = projectId;
          throw e;
        }
        projectRow = created;
        sourceTable = "saved_projects";
        autoCreated = true;
      }

      if (projectRow.user_id !== userId) {
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
        e._userId = userId;
        e._projectId = projectId;
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
          e._userId = userId;
          e._projectId = projectId;
          throw e;
        }
        const e: any = new Error(error.message);
        e._ctx = { table: "project_items", canRetry: true };
        e._userId = userId;
        e._projectId = projectId;
        throw e;
      }

      return { autoCreated, userId };
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
        let excelData;
        try {
          excelData = await extractDataFromExcel(selectedFile);
        } catch (xlErr: any) {
          console.error("[BOQUpload] Excel extraction failed:", xlErr);
          const e: any = new Error(
            isArabic
              ? `تعذّر قراءة ملف Excel: ${xlErr?.message || "ملف غير مدعوم أو تالف"}`
              : `Failed to read Excel file: ${xlErr?.message || "Unsupported or corrupt file"}`
          );
          e._ctx = { canRetry: false };
          throw e;
        }

        const localResult = performLocalExcelAnalysis(excelData.items, selectedFile.name);
        console.log("[BOQUpload] Excel local analysis items:", localResult.items.length, "raw:", excelData.items.length);

        if (localResult.items.length > 0) {
          items = localResult.items;
        } else {
          setStatusMessage(isArabic ? "جارٍ تحليل البيانات بالذكاء الاصطناعي..." : "Analyzing with AI...");
          const formatted = formatExcelDataForAnalysis(excelData);
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: formatted, fileName: selectedFile.name, projectId },
          });
          if (error) {
            console.error("[BOQUpload] analyze-boq error (excel):", error);
            throw new Error(
              isArabic
                ? `فشل تحليل الذكاء الاصطناعي: ${error.message || "خطأ غير معروف"}`
                : `AI analysis failed: ${error.message || "Unknown error"}`
            );
          }
          items = data?.items || [];
        }
      } else {
        setStatusMessage(isArabic ? "جارٍ استخراج النص من PDF..." : "Extracting text from PDF...");
        let text = "";
        try {
          text = await extractTextFromPDF(selectedFile);
        } catch (pdfErr) {
          console.warn("[BOQUpload] PDF text extraction failed, falling back to OCR:", pdfErr);
          try {
            text = await extractWithOCROnly(selectedFile);
          } catch (ocrErr: any) {
            console.error("[BOQUpload] OCR also failed:", ocrErr);
            const e: any = new Error(
              isArabic
                ? `تعذّر قراءة ملف PDF: ${ocrErr?.message || "ملف غير مدعوم"}`
                : `Failed to read PDF: ${ocrErr?.message || "Unsupported file"}`
            );
            e._ctx = { canRetry: false };
            throw e;
          }
        }

        if (!text || text.trim().length < 50) {
          try {
            text = await extractWithOCROnly(selectedFile);
          } catch (ocrErr) {
            console.error("[BOQUpload] OCR fallback failed:", ocrErr);
          }
        }

        if (!text || text.trim().length < 20) {
          const e: any = new Error(
            isArabic
              ? "لم يتم العثور على نص قابل للقراءة في الملف. تأكد من جودة الملف أو جرّب ملف Excel."
              : "No readable text found in file. Verify file quality or try an Excel file."
          );
          e._ctx = { canRetry: false };
          throw e;
        }

        const localResult = performLocalTextAnalysis(text, { fileName: selectedFile.name });
        console.log("[BOQUpload] PDF local analysis items:", localResult.items.length, "text length:", text.length);

        if (localResult.items.length > 0) {
          items = localResult.items;
        } else {
          setStatusMessage(isArabic ? "جارٍ تحليل البيانات بالذكاء الاصطناعي..." : "Analyzing with AI...");
          const { data, error } = await supabase.functions.invoke("analyze-boq", {
            body: { boqText: text, fileName: selectedFile.name, projectId },
          });
          if (error) {
            console.error("[BOQUpload] analyze-boq error (pdf):", error);
            throw new Error(
              isArabic
                ? `فشل تحليل الذكاء الاصطناعي: ${error.message || "خطأ غير معروف"}`
                : `AI analysis failed: ${error.message || "Unknown error"}`
            );
          }
          items = data?.items || [];
        }
      }

      console.log("[BOQUpload] Final extracted items count:", items.length);

      if (!items || items.length === 0) {
        const e: any = new Error(
          isArabic
            ? "لم يتم استخراج أي بنود من الملف. تحقق من تنسيق الجدول (يجب أن يحتوي على أعمدة: رقم البند، الوصف، الوحدة، الكمية)."
            : "No items extracted from file. Verify table format (must include: item no, description, unit, quantity)."
        );
        e._ctx = { canRetry: false };
        throw e;
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
      let saveResult: { autoCreated: boolean; userId: string } | null = null;
      try {
        saveResult = await saveItemsToProject(items);
      } catch (firstErr: any) {
        // Auto-retry once if the failure happened on project_items RLS
        // immediately after we just auto-created the project record.
        const ctx = firstErr?._ctx;
        const eligibleAutoRetry =
          !autoRetriedRef.current &&
          ctx?.canRetry &&
          ctx?.table === "project_items";
        if (eligibleAutoRetry) {
          autoRetriedRef.current = true;
          setStatusMessage(
            isArabic ? "إعادة محاولة تلقائية بعد إنشاء المشروع..." : "Auto-retrying after project creation..."
          );
          await new Promise((r) => setTimeout(r, 600));
          saveResult = await saveItemsToProject(items);
        } else {
          throw firstErr;
        }
      }

      setStatus("success");
      setStatusMessage(
        isArabic
          ? `تم استخراج وحفظ ${items.length} بند بنجاح!${
              saveResult?.autoCreated ? (isArabic ? " (تم إنشاء سجل المشروع تلقائياً)" : " (project record auto-created)") : ""
            }`
          : `Successfully extracted and saved ${items.length} items!${
              saveResult?.autoCreated ? " (project record auto-created)" : ""
            }`
      );

      toast({
        title: isArabic ? "تم رفع BOQ بنجاح" : "BOQ Uploaded Successfully",
        description: isArabic
          ? `تم استخراج ${items.length} بند من الملف`
          : `Extracted ${items.length} items from the file`,
      });

      setTimeout(handleSuccess, 1500);
    } catch (err: any) {
      const ctx = err?._ctx || {};
      // Log RLS / save errors with reference number
      let ref: string | undefined;
      if (ctx?.table) {
        const entry = logRlsError({
          table: ctx.table,
          message: err?.message || "Unknown error",
          userId: err?._userId ?? null,
          projectId: err?._projectId ?? projectId ?? null,
          context: { phase: "upload", canRetry: !!ctx.canRetry },
        });
        ref = entry.ref;
      }
      setStatus("error");
      setStatusMessage(
        err?.message ||
          (isArabic ? "حدث خطأ أثناء معالجة الملف" : "An error occurred while processing the file")
      );
      setErrorContext({ ...ctx, ref });
      toast({
        title: isArabic ? "خطأ في الرفع" : "Upload Error",
        description: ref
          ? `${err?.message || ""} (Ref: ${ref})`
          : err?.message || (isArabic ? "حاول مرة أخرى" : "Please try again"),
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
      const ctx = err?._ctx || {};
      let ref: string | undefined;
      if (ctx?.table) {
        const entry = logRlsError({
          table: ctx.table,
          message: err?.message || "Unknown error",
          userId: err?._userId ?? null,
          projectId: err?._projectId ?? projectId ?? null,
          context: { phase: "manual_retry", canRetry: !!ctx.canRetry },
        });
        ref = entry.ref;
      }
      setStatus("error");
      setStatusMessage(err?.message || (isArabic ? "فشل الحفظ" : "Save failed"));
      setErrorContext({ ...ctx, ref });
      toast({
        title: isArabic ? "فشلت إعادة المحاولة" : "Retry failed",
        description: ref ? `${err?.message || ""} (Ref: ${ref})` : err?.message,
        variant: "destructive",
      });
    }
  }, [saveItemsToProject, isArabic, toast, handleAnalyze, projectId]);

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
                {errorContext?.ref && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-destructive/20 mt-2">
                    <span className="font-semibold">
                      {isArabic ? "رقم مرجعي للدعم: " : "Support reference: "}
                    </span>
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono">
                      {errorContext.ref}
                    </code>
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
