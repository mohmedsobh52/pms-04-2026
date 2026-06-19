import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, FilePlus2, FileSpreadsheet, ExternalLink, Trash2, Loader2 } from "lucide-react";

type Row = {
  item_number: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
};

const emptyRow = (): Row => ({ item_number: "", description: "", unit: "", quantity: "1", unit_price: "0" });

const rowSchema = z.object({
  item_number: z.string().trim().min(1, "Item No required").max(40),
  description: z.string().trim().max(500).optional(),
  unit: z.string().trim().max(20).optional(),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
});

interface Props {
  projectId: string;
  isArabic: boolean;
  onAdded?: () => void;
}

export function BoqAddMenu({ projectId, isArabic, onAdded }: Props) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const insertRows = async (raw: Array<Partial<Row>>): Promise<number> => {
    const { data: maxRow } = await supabase
      .from("project_items")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    let nextSort = (maxRow?.sort_order ?? 0) + 1;

    const payload: any[] = [];
    const errors: string[] = [];
    raw.forEach((r, idx) => {
      const qty = Number(r.quantity ?? 0) || 0;
      const up = Number(r.unit_price ?? 0) || 0;
      const parsed = rowSchema.safeParse({
        item_number: String(r.item_number ?? "").trim(),
        description: String(r.description ?? "").trim(),
        unit: String(r.unit ?? "").trim(),
        quantity: qty,
        unit_price: up,
      });
      if (!parsed.success) {
        errors.push(`#${idx + 1}: ${parsed.error.issues[0].message}`);
        return;
      }
      payload.push({
        project_id: projectId,
        item_number: parsed.data.item_number,
        description: parsed.data.description || null,
        unit: parsed.data.unit || null,
        quantity: parsed.data.quantity,
        unit_price: parsed.data.unit_price,
        total_price: parsed.data.quantity * parsed.data.unit_price,
        sort_order: nextSort++,
      });
    });
    if (payload.length === 0) {
      throw new Error(errors[0] || t("لا توجد صفوف صالحة", "No valid rows"));
    }
    const { error } = await supabase.from("project_items").insert(payload);
    if (error) throw error;
    if (errors.length) {
      toast.warning(t(`تم تخطي ${errors.length} صف غير صالح`, `Skipped ${errors.length} invalid row(s)`));
    }
    return payload.length;
  };

  const handleQuickSave = async () => {
    const usable = rows.filter((r) => r.item_number.trim());
    if (usable.length === 0) {
      toast.error(t("أضف بنداً واحداً على الأقل", "Add at least one item"));
      return;
    }
    setSaving(true);
    try {
      const n = await insertRows(usable);
      toast.success(t(`تم إضافة ${n} بند إلى BOQ`, `Added ${n} BOQ item(s)`));
      setQuickOpen(false);
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      onAdded?.();
    } catch (e: any) {
      toast.error(e?.message || t("فشل الحفظ", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(t("الحجم الأقصى 10MB", "Max size 10MB"));
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!data.length) throw new Error(t("الملف فارغ", "File is empty"));

      const norm = (k: string) => k.toLowerCase().replace(/[\s_-]+/g, "");
      const mapped: Array<Partial<Row>> = data.map((r) => {
        const o: Record<string, any> = {};
        Object.keys(r).forEach((k) => (o[norm(k)] = r[k]));
        return {
          item_number: String(o.itemno ?? o.item ?? o.itemnumber ?? o.code ?? o.no ?? "").trim(),
          description: String(o.description ?? o.desc ?? o.descriptionar ?? ""),
          unit: String(o.unit ?? o.uom ?? ""),
          quantity: String(o.quantity ?? o.qty ?? "1"),
          unit_price: String(o.unitprice ?? o.price ?? o.rate ?? "0"),
        };
      });
      const n = await insertRows(mapped);
      toast.success(t(`تم استيراد ${n} بند`, `Imported ${n} item(s)`));
      onAdded?.();
    } catch (e: any) {
      toast.error(e?.message || t("فشل الاستيراد", "Import failed"));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImport(f);
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-7 text-xs gap-1" disabled={!projectId || importing}>
            {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {t("إضافة BOQ", "Add BOQ")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover">
          <DropdownMenuItem onClick={() => setQuickOpen(true)} className="gap-2">
            <FilePlus2 className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm">{t("إضافة سريعة (يدوي)", "Quick add (manual)")}</span>
              <span className="text-xs text-muted-foreground">
                {t("أدخل بنوداً سطر-سطر", "Enter items row-by-row")}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()} className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <div className="flex flex-col">
              <span className="text-sm">{t("استيراد من Excel/CSV", "Import from Excel/CSV")}</span>
              <span className="text-xs text-muted-foreground">
                {t("Item No, Description, Unit, Qty, Unit Price", "Item No, Description, Unit, Qty, Unit Price")}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(`/items?projectId=${projectId}&returnTo=cost-control`)} className="gap-2">
            <ExternalLink className="h-4 w-4 text-amber-600" />
            <div className="flex flex-col">
              <span className="text-sm">{t("فتح صفحة BOQ الكاملة", "Open full BOQ page")}</span>
              <span className="text-xs text-muted-foreground">
                {t("تحرير متقدم وتسعير تفصيلي", "Advanced editing & detailed pricing")}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-primary" />
              {t("إضافة سريعة لبنود BOQ", "Quick add BOQ items")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "ستظهر البنود فوراً في حسابات EVM والتحكم في التكلفة.",
                "Items will immediately flow into EVM and cost-control calculations."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-2">{t("رقم البند", "Item No")}</div>
              <div className="col-span-4">{t("الوصف", "Description")}</div>
              <div className="col-span-1">{t("وحدة", "Unit")}</div>
              <div className="col-span-2">{t("الكمية", "Qty")}</div>
              <div className="col-span-2">{t("سعر الوحدة", "Unit Price")}</div>
              <div className="col-span-1" />
            </div>
            {rows.map((r, i) => {
              const qty = Number(r.quantity) || 0;
              const up = Number(r.unit_price) || 0;
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-2 h-8" value={r.item_number} onChange={(e) => updateRow(i, { item_number: e.target.value })} placeholder="1.1" />
                  <Input className="col-span-4 h-8" value={r.description} onChange={(e) => updateRow(i, { description: e.target.value })} placeholder={t("وصف البند", "Description")} />
                  <Input className="col-span-1 h-8" value={r.unit} onChange={(e) => updateRow(i, { unit: e.target.value })} placeholder="m³" />
                  <Input className="col-span-2 h-8" type="number" min="0" value={r.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} />
                  <Input className="col-span-2 h-8" type="number" min="0" value={r.unit_price} onChange={(e) => updateRow(i, { unit_price: e.target.value })} />
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{(qty * up).toLocaleString()}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="gap-1 mt-1" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
              <Plus className="h-3 w-3" />
              {t("إضافة صف", "Add row")}
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuickOpen(false)} disabled={saving}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleQuickSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("حفظ البنود", "Save items")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
