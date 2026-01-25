import { useState } from "react";
import { Plus, Pencil, Trash2, FileCheck, Info, Landmark } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Guarantee {
  id: string;
  type: "bid_bond" | "performance_bond" | "advance_payment" | "retention";
  name: string;
  nameEn: string;
  percentage: number;
  contractValue: number;
  guaranteeValue: number;
  bankCharges: number;
  duration: number;
  totalCost: number;
}

const guaranteeTypes = {
  bid_bond: { ar: "ضمان ابتدائي", en: "Bid Bond" },
  performance_bond: { ar: "ضمان حسن التنفيذ", en: "Performance Bond" },
  advance_payment: { ar: "ضمان الدفعة المقدمة", en: "Advance Payment Bond" },
  retention: { ar: "ضمان المحتجزات", en: "Retention Bond" },
};

interface GuaranteesTabProps {
  isArabic: boolean;
  contractValue?: number;
  onTotalChange?: (total: number) => void;
}

export function GuaranteesTab({ isArabic, contractValue = 10000000, onTotalChange }: GuaranteesTabProps) {
  const [baseContractValue, setBaseContractValue] = useState(contractValue);
  
  const calculateCost = (guaranteeValue: number, bankCharges: number, duration: number) => {
    // Cost = (Guarantee Value × Bank Commission × Duration in months) / 12
    return (guaranteeValue * (bankCharges / 100) * duration) / 12;
  };

  const calculateDefaultGuarantees = (value: number): Guarantee[] => [
    { 
      id: "1", 
      type: "bid_bond",
      name: "ضمان ابتدائي", 
      nameEn: "Bid Bond", 
      percentage: 2, 
      contractValue: value,
      guaranteeValue: value * 0.02, 
      bankCharges: 1.5,
      duration: 3,
      totalCost: calculateCost(value * 0.02, 1.5, 3)
    },
    { 
      id: "2", 
      type: "performance_bond",
      name: "ضمان حسن التنفيذ", 
      nameEn: "Performance Bond", 
      percentage: 10, 
      contractValue: value,
      guaranteeValue: value * 0.10, 
      bankCharges: 1.5,
      duration: 24,
      totalCost: calculateCost(value * 0.10, 1.5, 24)
    },
    { 
      id: "3", 
      type: "advance_payment",
      name: "ضمان الدفعة المقدمة", 
      nameEn: "Advance Payment Bond", 
      percentage: 15, 
      contractValue: value,
      guaranteeValue: value * 0.15, 
      bankCharges: 1.5,
      duration: 12,
      totalCost: calculateCost(value * 0.15, 1.5, 12)
    },
    { 
      id: "4", 
      type: "retention",
      name: "ضمان المحتجزات", 
      nameEn: "Retention Bond", 
      percentage: 5, 
      contractValue: value,
      guaranteeValue: value * 0.05, 
      bankCharges: 1.5,
      duration: 12,
      totalCost: calculateCost(value * 0.05, 1.5, 12)
    },
  ];

  const [guarantees, setGuarantees] = useState<Guarantee[]>(calculateDefaultGuarantees(baseContractValue));
  const [showDialog, setShowDialog] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<Guarantee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "bid_bond" as Guarantee["type"],
    percentage: 0,
    bankCharges: 1.5,
    duration: 12,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const totalCost = guarantees.reduce((sum, g) => sum + g.totalCost, 0);
  const totalGuaranteeValue = guarantees.reduce((sum, g) => sum + g.guaranteeValue, 0);

  const handleContractValueChange = (value: number) => {
    setBaseContractValue(value);
    // Recalculate all guarantees based on new contract value
    setGuarantees(prev => prev.map(g => {
      const newGuaranteeValue = value * (g.percentage / 100);
      return {
        ...g,
        contractValue: value,
        guaranteeValue: newGuaranteeValue,
        totalCost: calculateCost(newGuaranteeValue, g.bankCharges, g.duration)
      };
    }));
  };

  const handleAdd = () => {
    setEditingGuarantee(null);
    setFormData({ type: "bid_bond", percentage: 5, bankCharges: 1.5, duration: 12 });
    setShowDialog(true);
  };

  const handleEdit = (guarantee: Guarantee) => {
    setEditingGuarantee(guarantee);
    setFormData({
      type: guarantee.type,
      percentage: guarantee.percentage,
      bankCharges: guarantee.bankCharges,
      duration: guarantee.duration,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const guaranteeValue = baseContractValue * (formData.percentage / 100);
    const totalCost = calculateCost(guaranteeValue, formData.bankCharges, formData.duration);
    
    if (editingGuarantee) {
      setGuarantees(prev => prev.map(g => 
        g.id === editingGuarantee.id 
          ? { 
              ...g, 
              type: formData.type,
              name: guaranteeTypes[formData.type].ar,
              nameEn: guaranteeTypes[formData.type].en,
              percentage: formData.percentage,
              contractValue: baseContractValue,
              guaranteeValue,
              bankCharges: formData.bankCharges,
              duration: formData.duration,
              totalCost 
            } 
          : g
      ));
    } else {
      const newGuarantee: Guarantee = {
        id: Date.now().toString(),
        type: formData.type,
        name: guaranteeTypes[formData.type].ar,
        nameEn: guaranteeTypes[formData.type].en,
        percentage: formData.percentage,
        contractValue: baseContractValue,
        guaranteeValue,
        bankCharges: formData.bankCharges,
        duration: formData.duration,
        totalCost,
      };
      setGuarantees(prev => [...prev, newGuarantee]);
    }
    
    setShowDialog(false);
    onTotalChange?.(totalCost);
  };

  const handleDelete = (id: string) => {
    setGuarantees(prev => prev.filter(g => g.id !== id));
    setDeleteId(null);
    onTotalChange?.(totalCost);
  };

  const getTypeBadgeColor = (type: Guarantee["type"]) => {
    switch (type) {
      case "bid_bond": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "performance_bond": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "advance_payment": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "retention": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          {isArabic ? "الضمانات البنكية" : "Bank Guarantees"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة ضمان" : "Add Guarantee"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Contract Value Input */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Landmark className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-sm font-medium">
                {isArabic ? "قيمة العقد" : "Contract Value"}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">SAR</span>
                <Input
                  type="number"
                  value={baseContractValue}
                  onChange={(e) => handleContractValueChange(parseFloat(e.target.value) || 0)}
                  className="max-w-xs"
                />
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {isArabic 
                      ? "تكلفة الضمان = (قيمة الضمان × عمولة البنك × المدة بالأشهر) ÷ 12" 
                      : "Guarantee Cost = (Guarantee Value × Bank Commission × Duration in months) ÷ 12"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "نوع الضمان" : "Guarantee Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "النسبة %" : "Rate %"}</TableHead>
                <TableHead className="text-center">{isArabic ? "قيمة الضمان" : "Guarantee Value"}</TableHead>
                <TableHead className="text-center">{isArabic ? "عمولة البنك" : "Bank Fee"}</TableHead>
                <TableHead className="text-center">{isArabic ? "المدة" : "Duration"}</TableHead>
                <TableHead className="text-center">{isArabic ? "التكلفة" : "Cost"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guarantees.map((guarantee, index) => (
                <TableRow key={guarantee.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={getTypeBadgeColor(guarantee.type)}>
                        {isArabic ? guarantee.name : guarantee.nameEn}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? guarantee.nameEn : guarantee.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{guarantee.percentage}%</TableCell>
                  <TableCell className="text-center">{formatCurrency(guarantee.guaranteeValue)}</TableCell>
                  <TableCell className="text-center">{guarantee.bankCharges}%</TableCell>
                  <TableCell className="text-center">
                    {guarantee.duration} {isArabic ? "شهر" : "mo"}
                  </TableCell>
                  <TableCell className="text-center font-medium text-primary">
                    {formatCurrency(guarantee.totalCost)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(guarantee)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(guarantee.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end gap-4">
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي الضمانات" : "Total Guarantees"}</p>
            <p className="font-semibold">SAR {formatCurrency(totalGuaranteeValue)}</p>
          </div>
          <div className="bg-muted rounded-lg px-6 py-3">
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي تكاليف الضمانات" : "Total Guarantee Costs"}
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
                {editingGuarantee 
                  ? (isArabic ? "تعديل ضمان" : "Edit Guarantee") 
                  : (isArabic ? "إضافة ضمان" : "Add Guarantee")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{isArabic ? "نوع الضمان" : "Guarantee Type"}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Guarantee["type"]) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(guaranteeTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {isArabic ? value.ar : value.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "نسبة الضمان %" : "Guarantee Rate %"}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "عمولة البنك %" : "Bank Fee %"}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.bankCharges}
                    onChange={(e) => setFormData({ ...formData, bankCharges: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "المدة (شهر)" : "Duration (months)"}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? "قيمة الضمان" : "Guarantee Value"}</span>
                  <span>SAR {formatCurrency(baseContractValue * (formData.percentage / 100))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>{isArabic ? "تكلفة الضمان" : "Guarantee Cost"}</span>
                  <span className="text-primary">
                    SAR {formatCurrency(calculateCost(
                      baseContractValue * (formData.percentage / 100),
                      formData.bankCharges,
                      formData.duration
                    ))}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave}>
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
                  ? "هل أنت متأكد من حذف هذا الضمان؟ لا يمكن التراجع عن هذا الإجراء." 
                  : "Are you sure you want to delete this guarantee? This action cannot be undone."}
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
