import { useState, useEffect } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { PricingDetail, NewPricingDetail } from "@/hooks/useItemPricingDetails";

interface LaborSelectionTabProps {
  details: PricingDetail[];
  onAdd: (detail: NewPricingDetail) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<NewPricingDetail>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  currency: string;
}

interface LaborRate {
  id: string;
  name: string;
  name_ar: string | null;
  category: string | null;
  unit: string;
  unit_rate: number;
  hourly_rate: number | null;
  skill_level: string | null;
}

export function LaborSelectionTab({
  details,
  onAdd,
  onUpdate,
  onDelete,
  currency,
}: LaborSelectionTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabor, setSelectedLabor] = useState<LaborRate | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const laborDetails = details.filter((d) => d.pricing_type === "labor");

  useEffect(() => {
    if (showAddDialog) {
      loadLaborRates();
    }
  }, [showAddDialog]);

  const loadLaborRates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("labor_rates")
        .select("id, name, name_ar, category, unit, unit_rate, hourly_rate, skill_level")
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw error;
      setLaborRates(data || []);
    } catch (error) {
      console.error("Error loading labor rates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLabor = laborRates.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.name_ar && l.name_ar.includes(searchQuery)) ||
      (l.category && l.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!selectedLabor) return;

    const success = await onAdd({
      pricing_type: "labor",
      resource_id: selectedLabor.id,
      resource_name: selectedLabor.name_ar || selectedLabor.name,
      unit: selectedLabor.unit,
      unit_price: selectedLabor.unit_rate,
      quantity: quantity,
      duration: duration,
    });

    if (success) {
      setShowAddDialog(false);
      setSelectedLabor(null);
      setQuantity(1);
      setDuration(1);
      setSearchQuery("");
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">العمالة المختارة</h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة عمالة
        </Button>
      </div>

      {laborDetails.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>لا توجد عمالة مضافة</p>
          <p className="text-xs mt-1">اضغط على "إضافة عمالة" لاختيار من المكتبة</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">العامل</TableHead>
                <TableHead className="text-center">الوحدة</TableHead>
                <TableHead className="text-center">المعدل</TableHead>
                <TableHead className="text-center">العدد</TableHead>
                <TableHead className="text-center">المدة</TableHead>
                <TableHead className="text-center">الإجمالي</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborDetails.map((detail) => (
                <TableRow key={detail.id}>
                  <TableCell className="font-medium">{detail.resource_name}</TableCell>
                  <TableCell className="text-center">{detail.unit}</TableCell>
                  <TableCell className="text-center">
                    {formatNumber(detail.unit_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={detail.quantity}
                      onChange={(e) =>
                        onUpdate(detail.id, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 text-center mx-auto"
                      min={0}
                      step={1}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={detail.duration}
                      onChange={(e) =>
                        onUpdate(detail.id, { duration: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 text-center mx-auto"
                      min={0}
                      step={0.5}
                    />
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {formatNumber(detail.total_cost)} {currency}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(detail.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Labor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>اختيار عمالة من المكتبة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن عمالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : filteredLabor.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">لا توجد عمالة متاحة</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredLabor.map((labor) => (
                    <div
                      key={labor.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLabor?.id === labor.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedLabor(labor)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {labor.name_ar || labor.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {labor.category} {labor.skill_level && `• ${labor.skill_level}`}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-primary">
                            {formatNumber(labor.unit_rate)} {currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            / {labor.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedLabor && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {selectedLabor.name_ar || selectedLabor.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(selectedLabor.unit_rate)} {currency} / {selectedLabor.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">العدد:</span>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    step={1}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">المدة:</span>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
                    className="w-20"
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className="text-left min-w-[120px]">
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="font-bold text-primary">
                    {formatNumber(selectedLabor.unit_rate * quantity * duration)} {currency}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAdd} disabled={!selectedLabor}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
