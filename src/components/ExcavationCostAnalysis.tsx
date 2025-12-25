import { useState, useMemo, useCallback } from "react";
import { Calculator, Save, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ExcavationItem {
  id: string;
  name: string;
  dailyProductivity: number; // الانتاجية اليومية (م3)
  dailyRent: number; // ايجار/يوم
  costPerCubicMeter: number; // تكلفة المتر المكعب
  isEditable: boolean;
}

interface ExcavationCostAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  itemDescription: string;
  onSave: (totalCost: number, breakdown: ExcavationItem[]) => void;
  currency?: string;
}

const defaultExcavationItems: Omit<ExcavationItem, 'id'>[] = [
  { name: "رص السيقق+الباتر+الانارة+المولد", dailyProductivity: 10, dailyRent: 100, costPerCubicMeter: 10.00, isEditable: true },
  { name: "بوكلين", dailyProductivity: 1300, dailyRent: 150, costPerCubicMeter: 8.67, isEditable: true },
  { name: "ترحيل (تربلا) (25% ترحيل)", dailyProductivity: 75, dailyRent: 20, costPerCubicMeter: 3.75, isEditable: true },
  { name: "قلاب ترحيل داخلي", dailyProductivity: 600, dailyRent: 60, costPerCubicMeter: 10.00, isEditable: true },
  { name: "نزح المياه الجوفية", dailyProductivity: 2, dailyRent: 10, costPerCubicMeter: 5.00, isEditable: true },
  { name: "سند جوانب الحفر", dailyProductivity: 1300, dailyRent: 150, costPerCubicMeter: 8.67, isEditable: true },
  { name: "بوكلين دقاق", dailyProductivity: 300, dailyRent: 50, costPerCubicMeter: 6.00, isEditable: true },
  { name: "تفتيت 30%", dailyProductivity: 0, dailyRent: 0, costPerCubicMeter: 0, isEditable: true },
];

export function ExcavationCostAnalysis({
  isOpen,
  onClose,
  itemDescription,
  onSave,
  currency = "ريال",
}: ExcavationCostAnalysisProps) {
  const [items, setItems] = useState<ExcavationItem[]>(() => 
    defaultExcavationItems.map((item, index) => ({
      ...item,
      id: `item-${index}`,
    }))
  );
  const [wastePercentage, setWastePercentage] = useState(5);
  const [adminPercentage, setAdminPercentage] = useState(10);
  const [newItemName, setNewItemName] = useState("");

  // Calculate cost per cubic meter based on productivity and rent
  const calculateCostPerCubicMeter = useCallback((dailyProductivity: number, dailyRent: number): number => {
    if (dailyProductivity <= 0) return 0;
    return dailyRent / dailyProductivity;
  }, []);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.costPerCubicMeter, 0);
    const wasteAmount = subtotal * (wastePercentage / 100);
    const adminAmount = subtotal * (adminPercentage / 100);
    const grandTotal = subtotal + wasteAmount + adminAmount;
    
    return {
      subtotal,
      wasteAmount,
      adminAmount,
      grandTotal,
    };
  }, [items, wastePercentage, adminPercentage]);

  const handleItemChange = useCallback((id: string, field: keyof ExcavationItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      // Recalculate cost per cubic meter when productivity or rent changes
      if (field === 'dailyProductivity' || field === 'dailyRent') {
        updatedItem.costPerCubicMeter = calculateCostPerCubicMeter(
          field === 'dailyProductivity' ? Number(value) : updatedItem.dailyProductivity,
          field === 'dailyRent' ? Number(value) : updatedItem.dailyRent
        );
      }
      
      return updatedItem;
    }));
  }, [calculateCostPerCubicMeter]);

  const handleAddItem = useCallback(() => {
    if (!newItemName.trim()) {
      toast.error("يرجى إدخال اسم البند");
      return;
    }
    
    const newItem: ExcavationItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      dailyProductivity: 0,
      dailyRent: 0,
      costPerCubicMeter: 0,
      isEditable: true,
    };
    
    setItems(prev => [...prev, newItem]);
    setNewItemName("");
    toast.success("تم إضافة البند بنجاح");
  }, [newItemName]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success("تم حذف البند");
  }, []);

  const handleSave = useCallback(() => {
    onSave(calculations.grandTotal, items);
    toast.success("تم حفظ التحليل بنجاح");
    onClose();
  }, [calculations.grandTotal, items, onSave, onClose]);

  const formatNumber = (num: number) => num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Calculator className="w-5 h-5 text-primary" />
            <span>تحليل تكاليف أعمال الحفر</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-right">{itemDescription}</p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Main Table */}
          <Card className="border-primary/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead className="text-right font-bold text-primary w-[250px]">اعمال الحفر</TableHead>
                    <TableHead className="text-center font-bold text-primary">الانتاجية اليومية (م3)</TableHead>
                    <TableHead className="text-center font-bold text-primary">ايجار/يوم</TableHead>
                    <TableHead className="text-center font-bold text-primary">تكلفة المتر المكعب ({currency})</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="text-right font-medium">
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          className="text-right h-8 border-0 bg-transparent focus:bg-background"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.dailyProductivity || ""}
                          onChange={(e) => handleItemChange(item.id, 'dailyProductivity', parseFloat(e.target.value) || 0)}
                          className="text-center h-8 w-24 mx-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={item.dailyRent || ""}
                          onChange={(e) => handleItemChange(item.id, 'dailyRent', parseFloat(e.target.value) || 0)}
                          className="text-center h-8 w-24 mx-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                          {formatNumber(item.costPerCubicMeter)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Add New Item Row */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={4}>
                      <div className="flex gap-2">
                        <Input
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="أدخل اسم بند جديد..."
                          className="text-right h-8"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddItem}
                          className="gap-1 h-8"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <Table>
                <TableBody>
                  {/* Subtotal */}
                  <TableRow className="border-b-2 border-primary/20">
                    <TableCell className="text-right font-bold text-lg text-primary">الإجمالي</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center">
                      <Badge className="text-lg px-4 py-2 bg-primary text-primary-foreground">
                        {formatNumber(calculations.subtotal)} {currency}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Waste Percentage */}
                  <TableRow>
                    <TableCell className="text-right font-medium">نسبة هالك</TableCell>
                    <TableCell colSpan={2} className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          type="number"
                          value={wastePercentage}
                          onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-center"
                          min="0"
                          max="100"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {formatNumber(calculations.wasteAmount)} {currency}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Admin Percentage */}
                  <TableRow>
                    <TableCell className="text-right font-medium">مصاريف ادارية (تصاريح)</TableCell>
                    <TableCell colSpan={2} className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          type="number"
                          value={adminPercentage}
                          onChange={(e) => setAdminPercentage(parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-center"
                          min="0"
                          max="100"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {formatNumber(calculations.adminAmount)} {currency}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Grand Total */}
                  <TableRow className="bg-primary/10 border-t-2 border-primary">
                    <TableCell className="text-right font-bold text-xl text-primary">إجمال التكلفة</TableCell>
                    <TableCell colSpan={2}></TableCell>
                    <TableCell className="text-center">
                      <Badge className="text-xl px-6 py-3 bg-green-600 text-white">
                        {formatNumber(calculations.grandTotal)} {currency}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            إلغاء
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ التحليل
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
