import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Package, Layers, Upload, FileDown, Plus, Trash2, Check, Star,
  Archive, Copy as CopyIcon, FileSpreadsheet, FileText, ClipboardCheck, GitCompare,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface Phase7Item {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
  aiSuggestedProductivity?: number;
  aiSuggestedRent?: number;
}

interface Props {
  items: Phase7Item[];
  currency: string;
  wastePct: number;
  adminPct: number;
  projectName?: string;
  onImportItems: (rows: Omit<Phase7Item, "id">[]) => void;
  onLoadTemplate: (tpl: {
    items: Omit<Phase7Item, "id">[];
    wastePct: number;
    adminPct: number;
  }) => void;
}

// ============ Supplier Offers ============
interface Offer {
  id: string;
  supplier: string;
  unitPrice: number;
  date: string;
  notes?: string;
  approved?: boolean;
}
const OFFERS_KEY = (itemId: string) => `cost_offers_${itemId}`;

function SupplierOffersTab({ items, currency }: { items: Phase7Item[]; currency: string }) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? "");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState({ supplier: "", unitPrice: "", notes: "" });

  useEffect(() => {
    if (!selectedId) return setOffers([]);
    try {
      const raw = localStorage.getItem(OFFERS_KEY(selectedId));
      setOffers(raw ? JSON.parse(raw) : []);
    } catch { setOffers([]); }
  }, [selectedId]);

  const persist = (next: Offer[]) => {
    setOffers(next);
    localStorage.setItem(OFFERS_KEY(selectedId), JSON.stringify(next));
  };

  const addOffer = () => {
    const price = parseFloat(form.unitPrice);
    if (!form.supplier.trim() || !Number.isFinite(price) || price <= 0) {
      return toast.error("أدخل اسم المورد وسعراً صحيحاً");
    }
    persist([
      ...offers,
      {
        id: crypto.randomUUID(),
        supplier: form.supplier.trim(),
        unitPrice: price,
        date: new Date().toISOString().slice(0, 10),
        notes: form.notes.trim() || undefined,
      },
    ]);
    setForm({ supplier: "", unitPrice: "", notes: "" });
    toast.success("تمت إضافة العرض");
  };

  const removeOffer = (id: string) => persist(offers.filter((o) => o.id !== id));
  const approveOffer = (id: string) =>
    persist(offers.map((o) => ({ ...o, approved: o.id === id })));

  const stats = useMemo(() => {
    if (offers.length === 0) return null;
    const sorted = [...offers].sort((a, b) => a.unitPrice - b.unitPrice);
    const lowest = sorted[0];
    const avg = sorted.reduce((s, o) => s + o.unitPrice, 0) / sorted.length;
    return { lowest, avg, count: sorted.length };
  }, [offers]);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">لا توجد بنود لعرض عروض الأسعار عليها.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">البند</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {stats && (
          <div className="flex items-end gap-2 text-xs">
            <Badge variant="outline" className="border-emerald-500/40">
              أدنى: {stats.lowest.unitPrice.toFixed(2)} {currency} — {stats.lowest.supplier}
            </Badge>
            <Badge variant="outline">
              متوسط: {stats.avg.toFixed(2)} {currency}
            </Badge>
            <Badge variant="secondary">{stats.count} عرض</Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 rounded-md border border-border bg-muted/30">
        <Input placeholder="اسم المورد" value={form.supplier}
          onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="h-8 text-xs" />
        <Input placeholder={`السعر (${currency})`} type="number" value={form.unitPrice}
          onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="h-8 text-xs" />
        <Input placeholder="ملاحظات" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-8 text-xs" />
        <Button size="sm" className="h-8" onClick={addOffer}>
          <Plus className="w-3.5 h-3.5 ml-1" /> إضافة عرض
        </Button>
      </div>

      <ScrollArea className="max-h-[320px] pr-2">
        {offers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">لا توجد عروض لهذا البند بعد.</p>
        ) : (
          <div className="space-y-1.5">
            {[...offers].sort((a, b) => a.unitPrice - b.unitPrice).map((o, i) => (
              <div key={o.id} className={`flex items-center justify-between gap-2 p-2 rounded border ${
                o.approved ? "border-primary bg-primary/5" : i === 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{o.supplier}</span>
                    {i === 0 && <Badge className="h-5 text-[10px] bg-emerald-600 hover:bg-emerald-600">الأقل</Badge>}
                    {o.approved && <Badge className="h-5 text-[10px]"><Check className="w-3 h-3 ml-0.5" />معتمد</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                    <span className="font-mono">{o.unitPrice.toFixed(2)} {currency}</span>
                    <span>· {o.date}</span>
                    {o.notes && <span className="truncate">· {o.notes}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2"
                    onClick={() => approveOffer(o.id)} title="اعتماد">
                    <Star className={`w-3.5 h-3.5 ${o.approved ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                    onClick={() => removeOffer(o.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============ Templates ============
interface Template {
  id: string;
  name: string;
  items: Omit<Phase7Item, "id">[];
  wastePct: number;
  adminPct: number;
  createdAt: string;
  archived?: boolean;
}
const TEMPLATES_KEY = "cost_phase7_templates_v1";

function TemplatesTab({
  items, wastePct, adminPct, onLoadTemplate,
}: {
  items: Phase7Item[]; wastePct: number; adminPct: number;
  onLoadTemplate: Props["onLoadTemplate"];
}) {
  const [templates, setTemplates] = useState<Template[]>(() => {
    try { const r = localStorage.getItem(TEMPLATES_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
  });
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const persist = (next: Template[]) => {
    setTemplates(next);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  };

  const createTemplate = () => {
    if (!name.trim()) return toast.error("أدخل اسم القالب");
    if (items.length === 0) return toast.error("لا توجد بنود لحفظها");
    const tpl: Template = {
      id: crypto.randomUUID(),
      name: name.trim(),
      items: items.map(({ id, ...rest }) => rest),
      wastePct, adminPct,
      createdAt: new Date().toISOString(),
    };
    persist([tpl, ...templates]);
    setName("");
    toast.success(`تم حفظ القالب "${tpl.name}"`);
  };

  const duplicate = (t: Template) => {
    persist([{ ...t, id: crypto.randomUUID(), name: `${t.name} (نسخة)`, createdAt: new Date().toISOString(), archived: false }, ...templates]);
    toast.success("تم نسخ القالب");
  };

  const toggleArchive = (id: string) =>
    persist(templates.map((t) => t.id === id ? { ...t, archived: !t.archived } : t));

  const remove = (id: string) => {
    if (!confirm("حذف القالب نهائياً؟")) return;
    persist(templates.filter((t) => t.id !== id));
  };

  const share = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(t, null, 2));
      toast.success("تم نسخ القالب للحافظة (JSON)");
    } catch { toast.error("تعذر النسخ للحافظة"); }
  };

  const apply = (t: Template) => {
    onLoadTemplate({ items: t.items, wastePct: t.wastePct, adminPct: t.adminPct });
    toast.success(`تم تحميل قالب "${t.name}"`);
  };

  const visible = templates.filter((t) => showArchived ? true : !t.archived);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">اسم قالب جديد</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="مثال: قالب مشروع سكني" className="h-8 text-xs" />
        </div>
        <Button size="sm" className="h-8" onClick={createTemplate}>
          <Plus className="w-3.5 h-3.5 ml-1" /> حفظ الحالي كقالب
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "إخفاء المؤرشفة" : "عرض المؤرشفة"}
        </Button>
      </div>

      <ScrollArea className="max-h-[320px] pr-2">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">لا توجد قوالب.</p>
        ) : (
          <div className="space-y-1.5">
            {visible.map((t) => (
              <div key={t.id} className={`flex items-center justify-between gap-2 p-2 rounded border ${
                t.archived ? "border-muted bg-muted/30 opacity-70" : "border-border"
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2">
                    <span>{t.items.length} بند</span>
                    <span>· هالك {t.wastePct}%</span>
                    <span>· إداري {t.adminPct}%</span>
                    <span>· {new Date(t.createdAt).toLocaleDateString("ar-EG")}</span>
                    {t.archived && <Badge variant="outline" className="h-4 text-[10px]">مؤرشف</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" className="h-7 px-2 text-xs" onClick={() => apply(t)}>تحميل</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => duplicate(t)} title="نسخ">
                    <CopyIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => share(t)} title="مشاركة (JSON)">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toggleArchive(t.id)} title="أرشفة">
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => remove(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============ Advanced Import ============
type ImportField = "name" | "dailyProductivity" | "dailyRent" | "costPerUnit" | "ignore";
const FIELD_LABELS: Record<ImportField, string> = {
  name: "اسم البند",
  dailyProductivity: "الإنتاجية اليومية",
  dailyRent: "الإيجار اليومي",
  costPerUnit: "تكلفة الوحدة",
  ignore: "تجاهل",
};

function guessField(header: string): ImportField {
  const h = header.toLowerCase();
  if (/name|بند|وصف|item/.test(h)) return "name";
  if (/prod|إنتاج/.test(h)) return "dailyProductivity";
  if (/rent|إيجار/.test(h)) return "dailyRent";
  if (/cost|price|تكلفة|سعر/.test(h)) return "costPerUnit";
  return "ignore";
}

function ImportTab({ onImportItems }: { onImportItems: Props["onImportItems"] }) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, ImportField>>({});
  const [lastImport, setLastImport] = useState<Omit<Phase7Item, "id">[] | null>(null);

  const onFile = async (f: File | null) => {
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const first = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(first, { defval: "" });
      if (json.length === 0) return toast.error("الملف فارغ");
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setMapping(Object.fromEntries(hdrs.map((h) => [h, guessField(h)])));
      setRows(json);
      toast.success(`تم تحميل ${json.length} صف — راجع مطابقة الأعمدة`);
    } catch (e) {
      toast.error("فشل قراءة الملف");
    }
  };

  const doImport = () => {
    const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    if (!nameCol) return toast.error("يجب مطابقة عمود لاسم البند");
    const num = (v: any) => { const n = parseFloat(String(v).replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
    const imported: Omit<Phase7Item, "id">[] = rows
      .filter((r) => String(r[nameCol] ?? "").trim())
      .map((r) => {
        const getCol = (f: ImportField) => {
          const col = Object.entries(mapping).find(([, v]) => v === f)?.[0];
          return col ? r[col] : "";
        };
        return {
          name: String(r[nameCol]).trim(),
          dailyProductivity: num(getCol("dailyProductivity")),
          dailyRent: num(getCol("dailyRent")),
          costPerUnit: num(getCol("costPerUnit")),
        };
      });
    if (imported.length === 0) return toast.error("لا توجد صفوف صالحة");
    setLastImport(imported);
    onImportItems(imported);
    toast.success(`تم استيراد ${imported.length} بند`);
  };

  const undo = () => {
    if (!lastImport) return;
    // Signal undo by importing an empty array with a special marker toast
    toast.info(`استخدم زر التراجع في الجدول لحذف آخر ${lastImport.length} بند مستورد`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="h-8 text-xs" />
        {rows.length > 0 && (
          <>
            <Button size="sm" className="h-8" onClick={doImport}>
              <Upload className="w-3.5 h-3.5 ml-1" /> استيراد
            </Button>
            {lastImport && (
              <Button size="sm" variant="ghost" className="h-8" onClick={undo}>تراجع</Button>
            )}
          </>
        )}
      </div>

      {headers.length > 0 && (
        <div className="rounded-md border border-border p-2">
          <p className="text-xs font-medium mb-2">مطابقة الأعمدة ({rows.length} صف)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground truncate flex-1" title={h}>{h}</span>
                <Select value={mapping[h]} onValueChange={(v: ImportField) => setMapping({ ...mapping, [h]: v })}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_LABELS) as ImportField[]).map((f) => (
                      <SelectItem key={f} value={f} className="text-xs">{FIELD_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-md border border-border">
          <p className="text-xs font-medium p-2 border-b border-border">معاينة (أول 5 صفوف)</p>
          <ScrollArea className="max-h-[200px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>{headers.map((h) => <th key={h} className="p-1.5 text-right font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {headers.map((h) => <td key={h} className="p-1.5 truncate max-w-[160px]">{String(r[h] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ============ Reports Export ============
type ReportKind = "summary" | "detailed" | "executive" | "technical" | "review" | "variance";
const REPORT_META: Record<ReportKind, { title: string; desc: string; icon: any }> = {
  summary: { title: "تقرير مختصر", desc: "الإجماليات والمؤشرات الرئيسية", icon: FileText },
  detailed: { title: "تقرير تفصيلي", desc: "جميع البنود مع الأرقام الكاملة", icon: FileSpreadsheet },
  executive: { title: "تقرير تنفيذي", desc: "ملخص للإدارة العليا", icon: Star },
  technical: { title: "تقرير فني", desc: "الإنتاجية والإيجار لكل بند", icon: ClipboardCheck },
  review: { title: "تقرير مراجعة", desc: "البنود التي تحتاج انتباه (اقتراحات AI)", icon: Check },
  variance: { title: "تقرير فروقات", desc: "الفرق بين القيم الحالية واقتراحات AI", icon: GitCompare },
};

function ReportsTab({
  items, currency, wastePct, adminPct, projectName,
}: { items: Phase7Item[]; currency: string; wastePct: number; adminPct: number; projectName?: string }) {

  const generatePdf = (kind: ReportKind) => {
    if (items.length === 0) return toast.error("لا توجد بنود");
    const meta = REPORT_META[kind];
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text(`${meta.title}${projectName ? ` — ${projectName}` : ""}`, 105, 15, { align: "center" });
    doc.setFontSize(9);
    doc.text(`${meta.desc} · ${new Date().toLocaleDateString("ar-EG")}`, 105, 22, { align: "center" });

    const rowsForKind = () => {
      switch (kind) {
        case "summary": {
          const total = items.reduce((s, i) => s + (i.costPerUnit || 0), 0);
          return [
            ["عدد البنود", String(items.length)],
            ["مجموع تكلفة الوحدات", `${total.toFixed(2)} ${currency}`],
            ["الهالك %", `${wastePct}`],
            ["الإداري %", `${adminPct}`],
          ];
        }
        case "detailed":
          return items.map((i) => [
            i.name, i.dailyProductivity.toString(), i.dailyRent.toFixed(2),
            i.costPerUnit.toFixed(2), currency,
          ]);
        case "executive": {
          const total = items.reduce((s, i) => s + (i.costPerUnit || 0), 0);
          const avg = total / (items.length || 1);
          const min = Math.min(...items.map((i) => i.costPerUnit || 0));
          const max = Math.max(...items.map((i) => i.costPerUnit || 0));
          return [
            ["إجمالي البنود", String(items.length)],
            ["متوسط تكلفة البند", `${avg.toFixed(2)} ${currency}`],
            ["أدنى تكلفة", `${min.toFixed(2)} ${currency}`],
            ["أعلى تكلفة", `${max.toFixed(2)} ${currency}`],
            ["مجموع", `${total.toFixed(2)} ${currency}`],
          ];
        }
        case "technical":
          return items.map((i) => [i.name, i.dailyProductivity.toString(), i.dailyRent.toFixed(2)]);
        case "review":
          return items
            .filter((i) => i.aiSuggestedProductivity != null || i.aiSuggestedRent != null)
            .map((i) => [
              i.name,
              i.aiSuggestedProductivity != null ? `${i.dailyProductivity} → ${i.aiSuggestedProductivity}` : "-",
              i.aiSuggestedRent != null ? `${i.dailyRent} → ${i.aiSuggestedRent}` : "-",
            ]);
        case "variance":
          return items
            .filter((i) => i.aiSuggestedProductivity != null || i.aiSuggestedRent != null)
            .map((i) => {
              const dp = i.aiSuggestedProductivity != null ? i.aiSuggestedProductivity - i.dailyProductivity : 0;
              const dr = i.aiSuggestedRent != null ? i.aiSuggestedRent - i.dailyRent : 0;
              return [i.name, dp.toFixed(2), dr.toFixed(2)];
            });
      }
    };

    const headForKind = () => {
      switch (kind) {
        case "summary":
        case "executive":
          return [["البند", "القيمة"]];
        case "detailed": return [["البند", "الإنتاجية", "الإيجار", "تكلفة الوحدة", "العملة"]];
        case "technical": return [["البند", "الإنتاجية", "الإيجار"]];
        case "review": return [["البند", "إنتاجية (حالي → AI)", "إيجار (حالي → AI)"]];
        case "variance": return [["البند", "Δ إنتاجية", "Δ إيجار"]];
      }
    };

    const body = rowsForKind();
    if (!body || body.length === 0) {
      return toast.error("لا توجد بيانات لهذا التقرير");
    }

    autoTable(doc, {
      head: headForKind(),
      body,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2, halign: "right" },
      headStyles: { fillColor: [24, 106, 106] },
    });

    doc.save(`${meta.title}${projectName ? `-${projectName}` : ""}.pdf`);
    toast.success(`تم تصدير: ${meta.title}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {(Object.keys(REPORT_META) as ReportKind[]).map((k) => {
        const m = REPORT_META[k];
        const Icon = m.icon;
        return (
          <button key={k} onClick={() => generatePdf(k)}
            className="text-right p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition group">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{m.title}</span>
              <FileDown className="w-3.5 h-3.5 mr-auto opacity-0 group-hover:opacity-100 transition" />
            </div>
            <p className="text-[11px] text-muted-foreground">{m.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

// ============ Main Panel ============
export function Phase7ToolsPanel(props: Props) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          الموردون · القوالب · الاستيراد · التقارير
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="suppliers">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-3">
            <TabsTrigger value="suppliers" className="text-xs gap-1">
              <Package className="w-3.5 h-3.5" /> عروض الموردين
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1">
              <Layers className="w-3.5 h-3.5" /> القوالب
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs gap-1">
              <Upload className="w-3.5 h-3.5" /> استيراد
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs gap-1">
              <FileDown className="w-3.5 h-3.5" /> تقارير
            </TabsTrigger>
          </TabsList>
          <TabsContent value="suppliers">
            <SupplierOffersTab items={props.items} currency={props.currency} />
          </TabsContent>
          <TabsContent value="templates">
            <TemplatesTab items={props.items} wastePct={props.wastePct} adminPct={props.adminPct}
              onLoadTemplate={props.onLoadTemplate} />
          </TabsContent>
          <TabsContent value="import">
            <ImportTab onImportItems={props.onImportItems} />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab items={props.items} currency={props.currency}
              wastePct={props.wastePct} adminPct={props.adminPct} projectName={props.projectName} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
