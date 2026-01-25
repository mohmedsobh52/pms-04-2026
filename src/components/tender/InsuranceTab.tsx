import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

export interface Insurance {
  id: string;
  type: string;
  typeEn: string;
  description: string;
  percentage: number;
  baseValue: number;
  premium: number;
}

interface InsuranceTabProps {
  isArabic: boolean;
  contractValue?: number;
  onTotalChange?: (total: number) => void;
}

export function InsuranceTab({ isArabic, contractValue = 10000000, onTotalChange }: InsuranceTabProps) {
  const [baseContractValue, setBaseContractValue] = useState(contractValue);
  
  const calculateDefaultInsurances = (value: number): Insurance[] => [
    { 
      id: "1", 
      type: "تأمين جميع أخطار المقاولين", 
      typeEn: "Contractor's All Risk (CAR)", 
      description: "يغطي الأضرار المادية للمشروع",
      percentage: 0.25, 
      baseValue: value, 
      premium: value * 0.0025 
    },
    { 
      id: "2", 
      type: "تأمين المسؤولية تجاه الغير", 
      typeEn: "Third Party Liability", 
      description: "يغطي الأضرار التي قد تلحق بالغير",
      percentage: 0.15, 
      baseValue: value, 
      premium: value * 0.0015 
    },
    { 
      id: "3", 
      type: "تأمين العمال", 
      typeEn: "Workers' Compensation", 
      description: "يغطي إصابات وحوادث العمل",
      percentage: 2.0, 
      baseValue: value * 0.05, // Assuming labor is 5% of project value
      premium: value * 0.05 * 0.02 
    },
    { 
      id: "4", 
      type: "تأمين المعدات", 
      typeEn: "Equipment Insurance", 
      description: "يغطي المعدات ضد السرقة والتلف",
      percentage: 0.5, 
      baseValue: value * 0.1, // Assuming equipment is 10% of project value
      premium: value * 0.1 * 0.005 
    },
  ];

  const [insurances, setInsurances] = useState<Insurance[]>(calculateDefaultInsurances(baseContractValue));
  const [showDialog, setShowDialog] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "",
    typeEn: "",
    description: "",
    percentage: 0,
    baseValue: 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const totalPremium = insurances.reduce((sum, i) => sum + i.premium, 0);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange?.(totalPremium);
  }, [totalPremium, onTotalChange]);

  const handleContractValueChange = (value: number) => {
    setBaseContractValue(value);
    // Recalculate all premiums based on new contract value
    setInsurances(prev => prev.map(ins => ({
      ...ins,
      baseValue: ins.id === "3" ? value * 0.05 : ins.id === "4" ? value * 0.1 : value,
      premium: (ins.id === "3" ? value * 0.05 : ins.id === "4" ? value * 0.1 : value) * (ins.percentage / 100)
    })));
  };

  const handleAdd = () => {
    setEditingInsurance(null);
    setFormData({ type: "", typeEn: "", description: "", percentage: 0, baseValue: baseContractValue });
    setShowDialog(true);
  };

  const handleEdit = (insurance: Insurance) => {
    setEditingInsurance(insurance);
    setFormData({
      type: insurance.type,
      typeEn: insurance.typeEn,
      description: insurance.description,
      percentage: insurance.percentage,
      baseValue: insurance.baseValue,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const premium = formData.baseValue * (formData.percentage / 100);
    
    if (editingInsurance) {
      setInsurances(prev => prev.map(i => 
        i.id === editingInsurance.id 
          ? { ...i, ...formData, premium } 
          : i
      ));
    } else {
      const newInsurance: Insurance = {
        id: Date.now().toString(),
        ...formData,
        premium,
      };
      setInsurances(prev => [...prev, newInsurance]);
    }
    
    setShowDialog(false);
    onTotalChange?.(totalPremium);
  };

  const handleDelete = (id: string) => {
    setInsurances(prev => prev.filter(i => i.id !== id));
    setDeleteId(null);
    onTotalChange?.(totalPremium);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {isArabic ? "التأمين" : "Insurance"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة تأمين" : "Add Insurance"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Contract Value Input */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">
                {isArabic ? "قيمة العقد الأساسية" : "Base Contract Value"}
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
                      ? "تُحسب أقساط التأمين كنسبة مئوية من قيمة العقد أو الأصول المؤمن عليها" 
                      : "Insurance premiums are calculated as a percentage of the contract value or insured assets"}
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
                <TableHead>{isArabic ? "نوع التأمين" : "Insurance Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "النسبة %" : "Rate %"}</TableHead>
                <TableHead className="text-center">{isArabic ? "القيمة المؤمنة" : "Insured Value"}</TableHead>
                <TableHead className="text-center">{isArabic ? "قسط التأمين" : "Premium"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insurances.map((insurance, index) => (
                <TableRow key={insurance.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isArabic ? insurance.type : insurance.typeEn}</p>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? insurance.typeEn : insurance.type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{insurance.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{insurance.percentage}%</TableCell>
                  <TableCell className="text-center">{formatCurrency(insurance.baseValue)}</TableCell>
                  <TableCell className="text-center font-medium text-primary">
                    {formatCurrency(insurance.premium)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(insurance)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(insurance.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Total */}
        <div className="mt-4 flex justify-end">
          <div className="bg-muted rounded-lg px-6 py-4">
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي أقساط التأمين" : "Total Insurance Premium"}
            </p>
            <p className="text-2xl font-bold text-primary">
              SAR {formatCurrency(totalPremium)}
            </p>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingInsurance 
                  ? (isArabic ? "تعديل تأمين" : "Edit Insurance") 
                  : (isArabic ? "إضافة تأمين" : "Add Insurance")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التأمين (عربي)" : "Insurance Type (Arabic)"}</Label>
                  <Input
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder={isArabic ? "مثال: تأمين المعدات" : "e.g., تأمين المعدات"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التأمين (إنجليزي)" : "Insurance Type (English)"}</Label>
                  <Input
                    value={formData.typeEn}
                    onChange={(e) => setFormData({ ...formData, typeEn: e.target.value })}
                    placeholder={isArabic ? "مثال: Equipment Insurance" : "e.g., Equipment Insurance"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "الوصف" : "Description"}</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isArabic ? "وصف مختصر للتغطية" : "Brief description of coverage"}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "نسبة التأمين %" : "Insurance Rate %"}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "القيمة المؤمنة" : "Insured Value"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.baseValue}
                    onChange={(e) => setFormData({ ...formData, baseValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">{isArabic ? "قسط التأمين المتوقع" : "Expected Premium"}</p>
                <p className="text-xl font-bold">
                  SAR {formatCurrency(formData.baseValue * (formData.percentage / 100))}
                </p>
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
                  ? "هل أنت متأكد من حذف هذا التأمين؟ لا يمكن التراجع عن هذا الإجراء." 
                  : "Are you sure you want to delete this insurance? This action cannot be undone."}
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
