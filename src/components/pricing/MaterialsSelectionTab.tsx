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

interface MaterialsSelectionTabProps {
  details: PricingDetail[];
  onAdd: (detail: NewPricingDetail) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<NewPricingDetail>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  currency: string;
}

interface MaterialPrice {
  id: string;
  name: string;
  name_ar: string | null;
  category: string;
  unit: string;
  unit_price: number;
}

export function MaterialsSelectionTab({
  details,
  onAdd,
  onUpdate,
  onDelete,
  currency,
}: MaterialsSelectionTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [materials, setMaterials] = useState<MaterialPrice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialPrice | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const materialDetails = details.filter((d) => d.pricing_type === "material");

  useEffect(() => {
    if (showAddDialog) {
      loadMaterials();
    }
  }, [showAddDialog]);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("material_prices")
        .select("id, name, name_ar, category, unit, unit_price")
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error loading materials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name_ar && m.name_ar.includes(searchQuery)) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedMaterial) return;

    const success = await onAdd({
      pricing_type: "material",
      resource_id: selectedMaterial.id,
      resource_name: selectedMaterial.name_ar || selectedMaterial.name,
      unit: selectedMaterial.unit,
      unit_price: selectedMaterial.unit_price,
      quantity: quantity,
      duration: 1,
    });

    if (success) {
      setShowAddDialog(false);
      setSelectedMaterial(null);
      setQuantity(1);
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
        <h3 className="text-sm font-medium text-muted-foreground">المواد المختارة</h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة مادة
        </Button>
      </div>

      {materialDetails.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>لا توجد مواد مضافة</p>
          <p className="text-xs mt-1">اضغط على "إضافة مادة" لاختيار من المكتبة</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المادة</TableHead>
                <TableHead className="text-center">الوحدة</TableHead>
                <TableHead className="text-center">سعر الوحدة</TableHead>
                <TableHead className="text-center">الكمية</TableHead>
                <TableHead className="text-center">الإجمالي</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialDetails.map((detail) => (
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
                      className="w-20 text-center mx-auto"
                      min={0}
                      step={0.01}
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

      {/* Add Material Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>اختيار مادة من المكتبة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مادة..."
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
              ) : filteredMaterials.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">لا توجد مواد متاحة</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMaterial?.id === material.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedMaterial(material)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {material.name_ar || material.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {material.category}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-primary">
                            {formatNumber(material.unit_price)} {currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            / {material.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedMaterial && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {selectedMaterial.name_ar || selectedMaterial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(selectedMaterial.unit_price)} {currency} / {selectedMaterial.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">الكمية:</span>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-24"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="text-left min-w-[120px]">
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="font-bold text-primary">
                    {formatNumber(selectedMaterial.unit_price * quantity)} {currency}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAdd} disabled={!selectedMaterial}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
