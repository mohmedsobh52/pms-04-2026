import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Paperclip, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CostItemBreakdown {
  materials: number;
  labor: number;
  equipment: number;
  subcontractor: number;
  misc: number;
  assumptions: string;
  category: string;
  code: string;
  // Phase 5 additions
  currency: string;
  taxPct: number;
  taxExempt: boolean;
  wastePct: number;
  notes: string;
}

interface LineEntry {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  unit: string;
}

interface Suggestion {
  id: string;
  kind: "productivity" | "rent" | "material" | "supplier";
  message: string;
  suggestedValue: number;
  status: "pending" | "applied" | "dismissed";
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  addedAt: string;
}

interface HistoryEntry {
  at: string;
  totalDirects: number;
  note: string;
}

const BREAKDOWN_KEY = (id: string) => `cost_item_breakdown_${id}`;
const HISTORY_KEY = (id: string) => `cost_item_history_${id}`;
const MATERIALS_KEY = (id: string) => `cost_item_materials_${id}`;
const LABOR_KEY = (id: string) => `cost_item_labor_${id}`;
const EQUIPMENT_KEY = (id: string) => `cost_item_equipment_${id}`;
const SUGGESTIONS_KEY = (id: string) => `cost_item_suggestions_${id}`;
const ATTACHMENTS_KEY = (id: string) => `cost_item_attachments_${id}`;

const empty: CostItemBreakdown = {
  materials: 0,
  labor: 0,
  equipment: 0,
  subcontractor: 0,
  misc: 0,
  assumptions: "",
  category: "",
  code: "",
  currency: "SAR",
  taxPct: 15,
  taxExempt: false,
  wastePct: 0,
  notes: "",
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function loadBreakdown(id: string): CostItemBreakdown {
  return { ...empty, ...loadJSON<Partial<CostItemBreakdown>>(BREAKDOWN_KEY(id), {}) };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemName: string;
  costPerUnit: number;
  currency: string;
}

const CURRENCIES = ["SAR", "USD", "EUR", "AED", "EGP", "KWD", "OMR", "QAR"];

const newId = () => Math.random().toString(36).slice(2, 10);

export function ItemDetailsDrawer({
  open,
  onOpenChange,
  itemId,
  itemName,
  costPerUnit,
  currency,
}: Props) {
  const [data, setData] = useState<CostItemBreakdown>(empty);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [materials, setMaterials] = useState<LineEntry[]>([]);
  const [labor, setLabor] = useState<LineEntry[]>([]);
  const [equipment, setEquipment] = useState<LineEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (itemId) {
      setData(loadBreakdown(itemId));
      setHistory(loadJSON<HistoryEntry[]>(HISTORY_KEY(itemId), []));
      setMaterials(loadJSON<LineEntry[]>(MATERIALS_KEY(itemId), []));
      setLabor(loadJSON<LineEntry[]>(LABOR_KEY(itemId), []));
      setEquipment(loadJSON<LineEntry[]>(EQUIPMENT_KEY(itemId), []));
      setSuggestions(loadJSON<Suggestion[]>(SUGGESTIONS_KEY(itemId), []));
      setAttachments(loadJSON<Attachment[]>(ATTACHMENTS_KEY(itemId), []));
    }
  }, [itemId, open]);

  const sumLines = (arr: LineEntry[]) =>
    arr.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);

  const materialsTotal = sumLines(materials);
  const laborTotal = sumLines(labor);
  const equipmentTotal = sumLines(equipment);
  const linesTotal = materialsTotal + laborTotal + equipmentTotal;

  const directs =
    Number(data.materials || 0) +
    Number(data.labor || 0) +
    Number(data.equipment || 0) +
    Number(data.subcontractor || 0) +
    Number(data.misc || 0);

  const totalWithWaste = directs * (1 + (Number(data.wastePct) || 0) / 100);
  const taxAmount = data.taxExempt ? 0 : totalWithWaste * ((Number(data.taxPct) || 0) / 100);
  const grandTotal = totalWithWaste + taxAmount;

  const save = () => {
    if (!itemId) return;
    localStorage.setItem(BREAKDOWN_KEY(itemId), JSON.stringify(data));
    localStorage.setItem(MATERIALS_KEY(itemId), JSON.stringify(materials));
    localStorage.setItem(LABOR_KEY(itemId), JSON.stringify(labor));
    localStorage.setItem(EQUIPMENT_KEY(itemId), JSON.stringify(equipment));
    localStorage.setItem(SUGGESTIONS_KEY(itemId), JSON.stringify(suggestions));
    localStorage.setItem(ATTACHMENTS_KEY(itemId), JSON.stringify(attachments));
    const entry: HistoryEntry = {
      at: new Date().toISOString(),
      totalDirects: directs,
      note: "حفظ تفاصيل البند",
    };
    const next = [entry, ...history].slice(0, 20);
    localStorage.setItem(HISTORY_KEY(itemId), JSON.stringify(next));
    setHistory(next);
    toast.success("تم حفظ تفاصيل البند");
  };

  const NumField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-sm"
        placeholder="0"
      />
    </div>
  );

  const LineEditor = ({
    title,
    rows,
    setRows,
  }: {
    title: string;
    rows: LineEntry[];
    setRows: (r: LineEntry[]) => void;
  }) => {
    const total = sumLines(rows);
    const add = () =>
      setRows([...rows, { id: newId(), name: "", qty: 1, unitPrice: 0, unit: "" }]);
    const upd = (id: string, patch: Partial<LineEntry>) =>
      setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const del = (id: string) => setRows(rows.filter((r) => r.id !== id));
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{title}</Label>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={add}>
            <Plus className="w-3 h-3" /> إضافة
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-3 border border-dashed rounded">
            لا توجد بنود
          </p>
        ) : (
          <div className="space-y-1">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-1 items-center">
                <Input
                  value={r.name}
                  onChange={(e) => upd(r.id, { name: e.target.value })}
                  className="h-7 text-xs col-span-4"
                  placeholder="الاسم"
                />
                <Input
                  value={r.unit}
                  onChange={(e) => upd(r.id, { unit: e.target.value })}
                  className="h-7 text-xs col-span-2"
                  placeholder="وحدة"
                />
                <Input
                  type="number"
                  value={r.qty || ""}
                  onChange={(e) => upd(r.id, { qty: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-xs col-span-2"
                  placeholder="كمية"
                />
                <Input
                  type="number"
                  value={r.unitPrice || ""}
                  onChange={(e) => upd(r.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-xs col-span-3"
                  placeholder="سعر"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => del(r.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-xs pt-1 border-t">
          <span className="text-muted-foreground">الإجمالي</span>
          <span className="font-mono font-medium">
            {total.toFixed(2)} {data.currency}
          </span>
        </div>
      </div>
    );
  };

  const handleAttach = () => {
    const name = window.prompt("اسم المرفق (وهمي)");
    if (!name) return;
    setAttachments([
      ...attachments,
      { id: newId(), name, size: Math.floor(Math.random() * 500) + 20, addedAt: new Date().toISOString() },
    ]);
  };

  const applySuggestion = (id: string) =>
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status: "applied" } : s)));
  const dismissSuggestion = (id: string) =>
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-base truncate">{itemName || "تفاصيل البند"}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs flex-wrap">
            <Badge variant="secondary" className="font-mono">
              {costPerUnit.toFixed(2)} {currency}
            </Badge>
            <span className="text-muted-foreground">تكلفة/وحدة محسوبة</span>
            <Badge variant="outline" className="font-mono">
              إجمالي: {grandTotal.toFixed(2)} {data.currency}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="basic" className="p-4">
            <TabsList className="grid grid-cols-4 w-full h-9 mb-2">
              <TabsTrigger value="basic" className="text-xs">أساسي</TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs">تفصيل</TabsTrigger>
              <TabsTrigger value="materials" className="text-xs">مواد</TabsTrigger>
              <TabsTrigger value="labor" className="text-xs">عمالة</TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="equipment" className="text-xs">معدات</TabsTrigger>
              <TabsTrigger value="assumptions" className="text-xs">افتراضات</TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs">اقتراحات</TabsTrigger>
              <TabsTrigger value="attachments" className="text-xs">مرفقات</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">كود البند</Label>
                  <Input
                    value={data.code}
                    onChange={(e) => setData({ ...data, code: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="مثال: A.1.2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">التصنيف</Label>
                  <Input
                    value={data.category}
                    onChange={(e) => setData({ ...data, category: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="حفر / خرسانة..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">العملة</Label>
                  <Select
                    value={data.currency}
                    onValueChange={(v) => setData({ ...data, currency: v })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="نسبة الهدر %"
                  value={data.wastePct}
                  onChange={(v) => setData({ ...data, wastePct: v })}
                />
                <NumField
                  label="نسبة الضريبة %"
                  value={data.taxPct}
                  onChange={(v) => setData({ ...data, taxPct: v })}
                />
                <div className="space-y-1 flex items-end">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.taxExempt}
                      onChange={(e) => setData({ ...data, taxExempt: e.target.checked })}
                    />
                    معفى من الضريبة
                  </label>
                </div>
              </div>
              <Separator />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي مباشر</span>
                  <span className="font-mono">{directs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ الهدر ({data.wastePct}%)</span>
                  <span className="font-mono">{totalWithWaste.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    + الضريبة {data.taxExempt ? "(معفى)" : `(${data.taxPct}%)`}
                  </span>
                  <span className="font-mono">{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-primary/5 font-medium">
                  <span>الإجمالي النهائي</span>
                  <span className="font-mono">
                    {grandTotal.toFixed(2)} {data.currency}
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-3 mt-3">
              <NumField
                label={`مواد (${data.currency})`}
                value={data.materials}
                onChange={(v) => setData({ ...data, materials: v })}
              />
              <NumField
                label={`عمالة (${data.currency})`}
                value={data.labor}
                onChange={(v) => setData({ ...data, labor: v })}
              />
              <NumField
                label={`معدات (${data.currency})`}
                value={data.equipment}
                onChange={(v) => setData({ ...data, equipment: v })}
              />
              <NumField
                label={`مقاول باطن (${data.currency})`}
                value={data.subcontractor}
                onChange={(v) => setData({ ...data, subcontractor: v })}
              />
              <NumField
                label={`مصاريف أخرى (${data.currency})`}
                value={data.misc}
                onChange={(v) => setData({ ...data, misc: v })}
              />
              <Separator />
              <div className="flex items-center justify-between p-2 rounded-md bg-primary/5">
                <span className="text-sm font-medium">إجمالي مباشر</span>
                <Badge className="font-mono text-sm">
                  {directs.toFixed(2)} {data.currency}
                </Badge>
              </div>
              {linesTotal > 0 && (
                <div className="text-xs text-muted-foreground flex justify-between p-2 rounded border border-dashed">
                  <span>مجموع البنود التفصيلية (مواد/عمالة/معدات)</span>
                  <span className="font-mono">
                    {linesTotal.toFixed(2)} {data.currency}
                  </span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="mt-3">
              <LineEditor title="بنود المواد" rows={materials} setRows={setMaterials} />
            </TabsContent>

            <TabsContent value="labor" className="mt-3">
              <LineEditor title="بنود العمالة" rows={labor} setRows={setLabor} />
            </TabsContent>

            <TabsContent value="equipment" className="mt-3">
              <LineEditor title="بنود المعدات" rows={equipment} setRows={setEquipment} />
            </TabsContent>

            <TabsContent value="assumptions" className="space-y-2 mt-3">
              <Label className="text-xs">افتراضات وملاحظات</Label>
              <Textarea
                value={data.assumptions}
                onChange={(e) => setData({ ...data, assumptions: e.target.value })}
                rows={5}
                placeholder="مدخلات السعر، مصادر، شروط الموقع، إنتاجية مرجعية..."
                className="text-sm"
              />
              <Label className="text-xs pt-2">ملاحظات داخلية</Label>
              <Textarea
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
                rows={3}
                placeholder="ملاحظات مراجعة داخلية..."
                className="text-sm"
              />
            </TabsContent>

            <TabsContent value="suggestions" className="mt-3 space-y-2">
              {suggestions.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded">
                  <Sparkles className="w-4 h-4 mx-auto mb-1 opacity-50" />
                  لا توجد اقتراحات ذكية بعد
                </div>
              ) : (
                suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="text-xs p-2 rounded border border-border bg-muted/30 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {s.kind}
                      </Badge>
                      <Badge
                        variant={
                          s.status === "applied"
                            ? "default"
                            : s.status === "dismissed"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <p>{s.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-muted-foreground">
                        قيمة مقترحة: {s.suggestedValue}
                      </span>
                      {s.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => applySuggestion(s.id)}
                          >
                            <CheckCircle2 className="w-3 h-3" /> تطبيق
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => dismissSuggestion(s.id)}
                          >
                            <XCircle className="w-3 h-3" /> تجاهل
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-3 space-y-2">
              <Button variant="outline" size="sm" className="w-full gap-1" onClick={handleAttach}>
                <Paperclip className="w-3 h-3" /> إضافة مرفق
              </Button>
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  لا مرفقات
                </p>
              ) : (
                attachments.map((a) => (
                  <div
                    key={a.id}
                    className="text-xs p-2 rounded border border-border bg-muted/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3 h-3 shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {a.size} KB
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() =>
                          setAttachments(attachments.filter((x) => x.id !== a.id))
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

          <div className="p-4 pt-0">
            <div className="border-t pt-3">
              <Label className="text-xs mb-2 block">سجل التعديلات</Label>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  لا يوجد سجل تعديلات بعد
                </p>
              ) : (
                <div className="space-y-1">
                  {history.slice(0, 5).map((h, i) => (
                    <div
                      key={i}
                      className="text-xs p-2 rounded border border-border bg-muted/30"
                    >
                      <div className="flex justify-between">
                        <span>{h.note}</span>
                        <Badge variant="outline" className="font-mono">
                          {h.totalDirects.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {new Date(h.at).toLocaleString("ar-EG")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t">
          <Button onClick={save} className="w-full">
            حفظ التفاصيل
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
