import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Calculator, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface IndirectCost {
  id: string;
  category: string;
  categoryEn: string;
  name: string;
  nameEn: string;
  costType: "fixed" | "percentage";
  value: number;
  total: number;
}

const categories = {
  headquarters: { ar: "المكتب الرئيسي", en: "Headquarters" },
  operational: { ar: "مصاريف تشغيلية", en: "Operational Expenses" },
  financial: { ar: "مصاريف مالية", en: "Financial Costs" },
  reserve: { ar: "احتياطي", en: "Reserve" },
};

interface IndirectCostsTabProps {
  isArabic: boolean;
  contractValue?: number;
  onTotalChange?: (total: number) => void;
}

export function IndirectCostsTab({ 
  isArabic, 
  contractValue = 10000000, 
  onTotalChange 
}: IndirectCostsTabProps) {
  const calculateTotal = (costType: "fixed" | "percentage", value: number) => {
    return costType === "percentage" ? (contractValue * value) / 100 : value;
  };

  const createDefaultCosts = (): IndirectCost[] => [
    {
      id: "1",
      category: "headquarters",
      categoryEn: "Headquarters",
      name: "مصاريف إدارية",
      nameEn: "Administrative Expenses",
      costType: "percentage",
      value: 3,
      total: calculateTotal("percentage", 3),
    },
    {
      id: "2",
      category: "headquarters",
      categoryEn: "Headquarters",
      name: "دعم فني",
      nameEn: "Technical Support",
      costType: "percentage",
      value: 1.5,
      total: calculateTotal("percentage", 1.5),
    },
    {
      id: "3",
      category: "headquarters",
      categoryEn: "Headquarters",
      name: "تنسيق وإشراف",
      nameEn: "Coordination & Supervision",
      costType: "percentage",
      value: 1,
      total: calculateTotal("percentage", 1),
    },
    {
      id: "4",
      category: "operational",
      categoryEn: "Operational",
      name: "اتصالات وإنترنت",
      nameEn: "Communications & Internet",
      costType: "fixed",
      value: 24000,
      total: 24000,
    },
    {
      id: "5",
      category: "operational",
      categoryEn: "Operational",
      name: "كهرباء ومياه",
      nameEn: "Electricity & Water",
      costType: "fixed",
      value: 36000,
      total: 36000,
    },
    {
      id: "6",
      category: "operational",
      categoryEn: "Operational",
      name: "قرطاسية ومطبوعات",
      nameEn: "Stationery & Printing",
      costType: "fixed",
      value: 12000,
      total: 12000,
    },
    {
      id: "7",
      category: "financial",
      categoryEn: "Financial",
      name: "عمولات بنكية",
      nameEn: "Bank Commissions",
      costType: "percentage",
      value: 0.5,
      total: calculateTotal("percentage", 0.5),
    },
    {
      id: "8",
      category: "financial",
      categoryEn: "Financial",
      name: "فوائد تمويل",
      nameEn: "Financing Interest",
      costType: "percentage",
      value: 2,
      total: calculateTotal("percentage", 2),
    },
    {
      id: "9",
      category: "reserve",
      categoryEn: "Reserve",
      name: "احتياطي طوارئ",
      nameEn: "Contingency Reserve",
      costType: "percentage",
      value: 2,
      total: calculateTotal("percentage", 2),
    },
  ];

  const [costs, setCosts] = useState<IndirectCost[]>(createDefaultCosts);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<IndirectCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: "headquarters" as keyof typeof categories,
    name: "",
    nameEn: "",
    costType: "fixed" as "fixed" | "percentage",
    value: 0,
  });

  // Recalculate totals when contract value changes
  useEffect(() => {
    setCosts(prev => prev.map(cost => ({
      ...cost,
      total: calculateTotal(cost.costType, cost.value),
    })));
  }, [contractValue]);

  const totalCost = costs.reduce((sum, c) => sum + c.total, 0);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange?.(totalCost);
  }, [totalCost, onTotalChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const handleAdd = () => {
    setEditingCost(null);
    setFormData({
      category: "headquarters",
      name: "",
      nameEn: "",
      costType: "fixed",
      value: 0,
    });
    setShowDialog(true);
  };

  const handleEdit = (cost: IndirectCost) => {
    setEditingCost(cost);
    setFormData({
      category: cost.category as keyof typeof categories,
      name: cost.name,
      nameEn: cost.nameEn,
      costType: cost.costType,
      value: cost.value,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const total = calculateTotal(formData.costType, formData.value);
    
    if (editingCost) {
      setCosts(prev => prev.map(c =>
        c.id === editingCost.id
          ? {
              ...c,
              category: formData.category,
              categoryEn: categories[formData.category].en,
              name: formData.name,
              nameEn: formData.nameEn,
              costType: formData.costType,
              value: formData.value,
              total,
            }
          : c
      ));
    } else {
      const newCost: IndirectCost = {
        id: Date.now().toString(),
        category: formData.category,
        categoryEn: categories[formData.category].en,
        name: formData.name,
        nameEn: formData.nameEn,
        costType: formData.costType,
        value: formData.value,
        total,
      };
      setCosts(prev => [...prev, newCost]);
    }

    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    setCosts(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "headquarters": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "operational": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "financial": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "reserve": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "";
    }
  };

  // Group costs by category
  const groupedCosts = costs.reduce((acc, cost) => {
    if (!acc[cost.category]) {
      acc[cost.category] = [];
    }
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, IndirectCost[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {isArabic ? "التكاليف غير المباشرة" : "Indirect Costs"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة بند" : "Add Item"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Contract Value Reference */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Calculator className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "قيمة العقد المرجعية" : "Reference Contract Value"}
              </p>
              <p className="text-xl font-bold">SAR {formatCurrency(contractValue)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                <TableHead className="text-center">{isArabic ? "النوع" : "Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "القيمة" : "Value"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost, index) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(cost.category)}>
                      {isArabic 
                        ? categories[cost.category as keyof typeof categories]?.ar || cost.category
                        : categories[cost.category as keyof typeof categories]?.en || cost.categoryEn}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isArabic ? cost.name : cost.nameEn}</p>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? cost.nameEn : cost.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {cost.costType === "percentage" 
                        ? (isArabic ? "نسبة" : "Percentage") 
                        : (isArabic ? "ثابت" : "Fixed")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {cost.costType === "percentage" 
                      ? `${cost.value}%` 
                      : formatCurrency(cost.value)}
                  </TableCell>
                  <TableCell className="text-center font-medium text-primary">
                    {formatCurrency(cost.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cost)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(cost.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Category Summaries */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(categories).map(([key, value]) => {
            const categoryTotal = groupedCosts[key]?.reduce((sum, c) => sum + c.total, 0) || 0;
            return (
              <div key={key} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {isArabic ? value.ar : value.en}
                </p>
                <p className="font-semibold">SAR {formatCurrency(categoryTotal)}</p>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-4 flex justify-end">
          <div className="bg-muted rounded-lg px-6 py-3">
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي التكاليف غير المباشرة" : "Total Indirect Costs"}
            </p>
            <p className="text-2xl font-bold text-primary">
              SAR {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCost
                  ? (isArabic ? "تعديل بند" : "Edit Item")
                  : (isArabic ? "إضافة بند" : "Add Item")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{isArabic ? "الفئة" : "Category"}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: keyof typeof categories) => 
                    setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categories).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {isArabic ? value.ar : value.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم البند (عربي)" : "Item Name (Arabic)"}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isArabic ? "أدخل الاسم بالعربي" : "Enter Arabic name"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم البند (إنجليزي)" : "Item Name (English)"}</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder={isArabic ? "أدخل الاسم بالإنجليزي" : "Enter English name"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التكلفة" : "Cost Type"}</Label>
                  <Select
                    value={formData.costType}
                    onValueChange={(value: "fixed" | "percentage") => 
                      setFormData({ ...formData, costType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">{isArabic ? "مبلغ ثابت" : "Fixed Amount"}</SelectItem>
                      <SelectItem value="percentage">{isArabic ? "نسبة مئوية" : "Percentage"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {formData.costType === "percentage" 
                      ? (isArabic ? "النسبة %" : "Percentage %")
                      : (isArabic ? "المبلغ" : "Amount")}
                  </Label>
                  <Input
                    type="number"
                    step={formData.costType === "percentage" ? "0.1" : "1"}
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>{isArabic ? "الإجمالي" : "Total"}</span>
                  <span className="text-primary">
                    SAR {formatCurrency(calculateTotal(formData.costType, formData.value))}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={!formData.name || !formData.nameEn}>
                {isArabic ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isArabic
                  ? "هل أنت متأكد من حذف هذا البند؟ لا يمكن التراجع عن هذا الإجراء."
                  : "Are you sure you want to delete this item? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
                {isArabic ? "حذف" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
