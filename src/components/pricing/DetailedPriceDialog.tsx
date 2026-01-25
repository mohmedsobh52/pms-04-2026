import { useState, useEffect, useMemo } from "react";
import { Package, Users, Truck, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useItemPricingDetails } from "@/hooks/useItemPricingDetails";
import { MaterialsSelectionTab } from "./MaterialsSelectionTab";
import { LaborSelectionTab } from "./LaborSelectionTab";
import { EquipmentSelectionTab } from "./EquipmentSelectionTab";

interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  overhead_percentage?: number | null;
  profit_percentage?: number | null;
  pricing_notes?: string | null;
}

interface DetailedPriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProjectItem | null;
  currency: string;
  onSave: () => void;
}

export function DetailedPriceDialog({
  isOpen,
  onClose,
  item,
  currency,
  onSave,
}: DetailedPriceDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("materials");
  const [overheadPercentage, setOverheadPercentage] = useState(10);
  const [profitPercentage, setProfitPercentage] = useState(15);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    details,
    isLoading,
    addDetail,
    updateDetail,
    deleteDetail,
    totals,
  } = useItemPricingDetails(item?.id || null);

  // Load item settings when dialog opens
  useEffect(() => {
    if (item && isOpen) {
      setOverheadPercentage(item.overhead_percentage ?? 10);
      setProfitPercentage(item.profit_percentage ?? 15);
      setNotes(item.pricing_notes || "");
    }
  }, [item, isOpen]);

  // Calculate costs
  const calculations = useMemo(() => {
    const directCost = totals.direct;
    const overheadAmount = directCost * (overheadPercentage / 100);
    const costBeforeProfit = directCost + overheadAmount;
    const profitAmount = costBeforeProfit * (profitPercentage / 100);
    const unitPrice = costBeforeProfit + profitAmount;
    const totalPrice = unitPrice * (item?.quantity || 1);

    return {
      directCost,
      overheadAmount,
      profitAmount,
      unitPrice,
      totalPrice,
    };
  }, [totals.direct, overheadPercentage, profitPercentage, item?.quantity]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      // Update item with calculated prices and settings
      const { error } = await supabase
        .from("project_items")
        .update({
          unit_price: calculations.unitPrice,
          total_price: calculations.totalPrice,
          overhead_percentage: overheadPercentage,
          profit_percentage: profitPercentage,
          pricing_notes: notes || null,
          is_detailed_priced: true,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ تفاصيل التسعير بنجاح",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ التسعير",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">تحليل السعر التفصيلي</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {item.item_number} - {item.description}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Item Info */}
          <div className="flex gap-4">
            <div className="flex-1 p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">الوحدة</Label>
              <p className="font-medium">{item.unit || "-"}</p>
            </div>
            <div className="flex-1 p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">الكمية</Label>
              <p className="font-medium">
                {formatNumber(item.quantity || 0)}
              </p>
            </div>
          </div>

          {/* Tabs for Materials, Labor, Equipment */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="materials" className="gap-2">
                <Package className="w-4 h-4" />
                المواد
              </TabsTrigger>
              <TabsTrigger value="labor" className="gap-2">
                <Users className="w-4 h-4" />
                العمالة
              </TabsTrigger>
              <TabsTrigger value="equipment" className="gap-2">
                <Truck className="w-4 h-4" />
                المعدات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="materials" className="mt-4">
              <MaterialsSelectionTab
                details={details}
                onAdd={addDetail}
                onUpdate={updateDetail}
                onDelete={deleteDetail}
                currency={currency}
              />
            </TabsContent>

            <TabsContent value="labor" className="mt-4">
              <LaborSelectionTab
                details={details}
                onAdd={addDetail}
                onUpdate={updateDetail}
                onDelete={deleteDetail}
                currency={currency}
              />
            </TabsContent>

            <TabsContent value="equipment" className="mt-4">
              <EquipmentSelectionTab
                details={details}
                onAdd={addDetail}
                onUpdate={updateDetail}
                onDelete={deleteDetail}
                currency={currency}
              />
            </TabsContent>
          </Tabs>

          {/* Overhead and Profit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overhead">نسبة المصاريف العمومية %</Label>
              <Input
                id="overhead"
                type="number"
                value={overheadPercentage}
                onChange={(e) => setOverheadPercentage(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={0.5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit">نسبة الربح %</Label>
              <Input
                id="profit"
                type="number"
                value={profitPercentage}
                onChange={(e) => setProfitPercentage(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={0.5}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية على التسعير..."
              rows={2}
            />
          </div>

          <Separator />

          {/* Cost Summary */}
          <div className="space-y-3">
            <h4 className="font-semibold">ملخص التكاليف</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">تكلفة المواد</span>
                <span>{formatNumber(totals.materials)} {currency}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">تكلفة العمالة</span>
                <span>{formatNumber(totals.labor)} {currency}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">تكلفة المعدات</span>
                <span>{formatNumber(totals.equipment)} {currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1 font-medium">
                <span>التكلفة المباشرة</span>
                <span>{formatNumber(calculations.directCost)} {currency}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  المصاريف العمومية ({overheadPercentage}%)
                </span>
                <span>{formatNumber(calculations.overheadAmount)} {currency}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  الربح ({profitPercentage}%)
                </span>
                <span>{formatNumber(calculations.profitAmount)} {currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-2 font-bold text-base">
                <span>سعر الوحدة النهائي</span>
                <span className="text-primary">
                  {formatNumber(calculations.unitPrice)} {currency}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-lg bg-primary/10 rounded-lg px-3">
                <span>الإجمالي (× {formatNumber(item.quantity || 0)})</span>
                <span className="text-primary">
                  {formatNumber(calculations.totalPrice)} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="w-4 h-4 ml-2" />
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 ml-2" />
            {isSaving ? "جاري الحفظ..." : "حفظ التسعير"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
