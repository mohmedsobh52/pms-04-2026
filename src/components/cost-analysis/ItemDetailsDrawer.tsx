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

export interface CostItemBreakdown {
  materials: number;
  labor: number;
  equipment: number;
  subcontractor: number;
  misc: number;
  assumptions: string;
  category: string;
  code: string;
}

interface HistoryEntry {
  at: string;
  totalDirects: number;
  note: string;
}

const BREAKDOWN_KEY = (id: string) => `cost_item_breakdown_${id}`;
const HISTORY_KEY = (id: string) => `cost_item_history_${id}`;

const empty: CostItemBreakdown = {
  materials: 0,
  labor: 0,
  equipment: 0,
  subcontractor: 0,
  misc: 0,
  assumptions: "",
  category: "",
  code: "",
};

function loadBreakdown(id: string): CostItemBreakdown {
  try {
    const raw = localStorage.getItem(BREAKDOWN_KEY(id));
    if (raw) return { ...empty, ...JSON.parse(raw) };
  } catch {}
  return empty;
}

function loadHistory(id: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(id));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemName: string;
  costPerUnit: number;
  currency: string;
}

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

  useEffect(() => {
    if (itemId) {
      setData(loadBreakdown(itemId));
      setHistory(loadHistory(itemId));
    }
  }, [itemId, open]);

  const directs =
    Number(data.materials || 0) +
    Number(data.labor || 0) +
    Number(data.equipment || 0) +
    Number(data.subcontractor || 0) +
    Number(data.misc || 0);

  const save = () => {
    if (!itemId) return;
    localStorage.setItem(BREAKDOWN_KEY(itemId), JSON.stringify(data));
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-base truncate">{itemName || "تفاصيل البند"}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="font-mono">
              {costPerUnit.toFixed(2)} {currency}
            </Badge>
            <span className="text-muted-foreground">تكلفة/وحدة محسوبة</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="basic" className="p-4">
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="basic" className="text-xs">أساسي</TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs">تفصيل</TabsTrigger>
              <TabsTrigger value="assumptions" className="text-xs">افتراضات</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">سجل</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-3">
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
                  placeholder="حفر / خرسانة / كهرباء..."
                />
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-3 mt-3">
              <NumField
                label={`مواد (${currency})`}
                value={data.materials}
                onChange={(v) => setData({ ...data, materials: v })}
              />
              <NumField
                label={`عمالة (${currency})`}
                value={data.labor}
                onChange={(v) => setData({ ...data, labor: v })}
              />
              <NumField
                label={`معدات (${currency})`}
                value={data.equipment}
                onChange={(v) => setData({ ...data, equipment: v })}
              />
              <NumField
                label={`مقاول باطن (${currency})`}
                value={data.subcontractor}
                onChange={(v) => setData({ ...data, subcontractor: v })}
              />
              <NumField
                label={`مصاريف أخرى (${currency})`}
                value={data.misc}
                onChange={(v) => setData({ ...data, misc: v })}
              />
              <Separator />
              <div className="flex items-center justify-between p-2 rounded-md bg-primary/5">
                <span className="text-sm font-medium">إجمالي مباشر</span>
                <Badge className="font-mono text-sm">
                  {directs.toFixed(2)} {currency}
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="assumptions" className="space-y-2 mt-3">
              <Label className="text-xs">افتراضات وملاحظات</Label>
              <Textarea
                value={data.assumptions}
                onChange={(e) => setData({ ...data, assumptions: e.target.value })}
                rows={8}
                placeholder="مدخلات السعر، مصادر، شروط الموقع، إنتاجية مرجعية..."
                className="text-sm"
              />
            </TabsContent>

            <TabsContent value="history" className="mt-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا يوجد سجل تعديلات بعد
                </p>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="text-xs p-2 rounded border border-border bg-muted/30">
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
                ))
              )}
            </TabsContent>
          </Tabs>
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
