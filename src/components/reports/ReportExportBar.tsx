import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { exportNodeToPdf, exportRowsToExcel } from "@/lib/report-export";
import { useState, RefObject } from "react";
import { toast } from "sonner";

interface Props {
  targetRef: RefObject<HTMLDivElement>;
  rows: Record<string, unknown>[];
  title: string;
  fileSlug: string;
}

export function ReportExportBar({ targetRef, rows, title, fileSlug }: Props) {
  const { isArabic } = useLanguage();
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);

  const onPdf = async () => {
    if (!targetRef.current) return;
    setBusy("pdf");
    try {
      await exportNodeToPdf(targetRef.current, { title, fileName: fileSlug, isArabic });
      toast.success(isArabic ? "تم تصدير PDF" : "PDF exported");
    } catch (e: any) {
      toast.error(e?.message ?? (isArabic ? "فشل التصدير" : "Export failed"));
    } finally {
      setBusy(null);
    }
  };

  const onXlsx = () => {
    setBusy("xlsx");
    try {
      exportRowsToExcel(rows, title, fileSlug);
      toast.success(isArabic ? "تم تصدير Excel" : "Excel exported");
    } catch (e: any) {
      toast.error(e?.message ?? (isArabic ? "فشل التصدير" : "Export failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={onPdf} disabled={!!busy}>
        {busy === "pdf" ? <Loader2 className="h-4 w-4 me-1.5 animate-spin" /> : <FileDown className="h-4 w-4 me-1.5" />}
        {isArabic ? "تصدير PDF" : "Export PDF"}
      </Button>
      <Button size="sm" variant="outline" onClick={onXlsx} disabled={!!busy || rows.length === 0}>
        <FileSpreadsheet className="h-4 w-4 me-1.5" />
        {isArabic ? "تصدير Excel" : "Export Excel"}
      </Button>
    </div>
  );
}
