import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useState } from "react";

interface Props {
  projectId: string;
  projectName?: string;
}

/**
 * Single-button BOQ export. Pulls real project_items rows and writes XLSX.
 * No mock data, no fabricated columns.
 */
export function BoqImportExportBar({ projectId, projectName = "BOQ" }: Props) {
  const { isArabic } = useLanguage();
  const [busy, setBusy] = useState(false);

  const exportXlsx = async () => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any)
        .from("project_items")
        .select(
          "item_number,description,description_ar,unit,quantity,unit_price,total_price,category,subcategory"
        )
        .eq("project_id", projectId)
        .order("item_number", { ascending: true });
      if (error) throw error;

      const rows = (data ?? []).map((r: any) => ({
        "Item No": r.item_number ?? "",
        Description: r.description ?? "",
        "وصف عربي": r.description_ar ?? "",
        Unit: r.unit ?? "",
        Quantity: r.quantity ?? "",
        "Unit Price": r.unit_price ?? "",
        "Total Price": r.total_price ?? "",
        Category: r.category ?? "",
        Subcategory: r.subcategory ?? "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BOQ");
      XLSX.writeFile(wb, `${projectName.replace(/\s+/g, "_")}_BOQ.xlsx`);
      toast.success(isArabic ? "تم تصدير BOQ" : "BOQ exported");
    } catch (e: any) {
      toast.error(e?.message ?? (isArabic ? "فشل التصدير" : "Export failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={exportXlsx}
        disabled={busy}
      >
        <Download className="w-4 h-4" />
        {isArabic ? "تصدير BOQ" : "Export BOQ"}
      </Button>
    </div>
  );
}
