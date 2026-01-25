import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Shield, Info, AlertTriangle, Clock, Building2, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { differenceInDays, addDays, format } from "date-fns";

export interface Insurance {
  id: string;
  type: string;
  typeEn: string;
  description: string;
  percentage: number;
  baseValue: number;
  premium: number;
  // New fields
  insurerName?: string;
  policyNumber?: string;
  coverageType?: string;
  startDate?: string;
  expiryDate?: string;
  status?: "active" | "expiring" | "expired";
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
}

interface InsuranceTabProps {
  isArabic: boolean;
  contractValue?: number;
  initialData?: Insurance[];
  onDataChange?: (data: Insurance[]) => void;
  onTotalChange?: (total: number) => void;
}

const COVERAGE_TYPES = [
  { value: "comprehensive", labelAr: "شاملة", labelEn: "Comprehensive" },
  { value: "basic", labelAr: "أساسية", labelEn: "Basic" },
  { value: "extended", labelAr: "موسعة", labelEn: "Extended" },
  { value: "limited", labelAr: "محدودة", labelEn: "Limited" },
  { value: "named_perils", labelAr: "مخاطر محددة", labelEn: "Named Perils" },
];

const INSURANCE_COMPANIES = [
  { value: "tawuniya", labelAr: "التعاونية للتأمين", labelEn: "Tawuniya" },
  { value: "bupa", labelAr: "بوبا العربية", labelEn: "Bupa Arabia" },
  { value: "medgulf", labelAr: "ميدغلف", labelEn: "Medgulf" },
  { value: "alrajhi_takaful", labelAr: "تكافل الراجحي", labelEn: "Al Rajhi Takaful" },
  { value: "salama", labelAr: "سلامة للتأمين", labelEn: "Salama Insurance" },
  { value: "walaa", labelAr: "ولاء للتأمين", labelEn: "Walaa Insurance" },
  { value: "axa", labelAr: "أكسا", labelEn: "AXA" },
  { value: "zurich", labelAr: "زيوريخ", labelEn: "Zurich" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

const getExpiryStatus = (expiryDate?: string): "active" | "expiring" | "expired" => {
  if (!expiryDate) return "active";
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysLeft = differenceInDays(expiry, today);
  
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring";
  return "active";
};

const getStatusBadge = (status: string, isArabic: boolean) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500 hover:bg-green-600">{isArabic ? "نشط" : "Active"}</Badge>;
    case "expiring":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">{isArabic ? "ينتهي قريباً" : "Expiring"}</Badge>;
    case "expired":
      return <Badge variant="destructive">{isArabic ? "منتهي" : "Expired"}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function InsuranceTab({ isArabic, contractValue = 10000000, initialData, onDataChange, onTotalChange }: InsuranceTabProps) {
  const [baseContractValue, setBaseContractValue] = useState(contractValue);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const calculateDefaultInsurances = (value: number): Insurance[] => [
    { 
      id: "1", 
      type: "تأمين جميع أخطار المقاولين", 
      typeEn: "Contractor's All Risk (CAR)", 
      description: "يغطي الأضرار المادية للمشروع",
      percentage: 0.25, 
      baseValue: value, 
      premium: value * 0.0025,
      insurerName: "",
      policyNumber: "",
      coverageType: "comprehensive",
      startDate: format(new Date(), "yyyy-MM-dd"),
      expiryDate: format(addDays(new Date(), 365), "yyyy-MM-dd"),
      status: "active",
    },
    { 
      id: "2", 
      type: "تأمين المسؤولية تجاه الغير", 
      typeEn: "Third Party Liability", 
      description: "يغطي الأضرار التي قد تلحق بالغير",
      percentage: 0.15, 
      baseValue: value, 
      premium: value * 0.0015,
      coverageType: "comprehensive",
      status: "active",
    },
    { 
      id: "3", 
      type: "تأمين العمال", 
      typeEn: "Workers' Compensation", 
      description: "يغطي إصابات وحوادث العمل",
      percentage: 2.0, 
      baseValue: value * 0.05,
      premium: value * 0.05 * 0.02,
      coverageType: "basic",
      status: "active",
    },
    { 
      id: "4", 
      type: "تأمين المعدات", 
      typeEn: "Equipment Insurance", 
      description: "يغطي المعدات ضد السرقة والتلف",
      percentage: 0.5, 
      baseValue: value * 0.1,
      premium: value * 0.1 * 0.005,
      coverageType: "comprehensive",
      status: "active",
    },
  ];

  const [insurances, setInsurances] = useState<Insurance[]>(
    initialData && initialData.length > 0 ? initialData : calculateDefaultInsurances(baseContractValue)
  );

  useEffect(() => {
    if (initialData && initialData.length > 0 && !isInitialized) {
      setInsurances(initialData);
      setIsInitialized(true);
    } else if (!initialData || initialData.length === 0) {
      setIsInitialized(true);
    }
  }, [initialData]);

  useEffect(() => {
    if (isInitialized) {
      onDataChange?.(insurances);
    }
  }, [insurances, isInitialized]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "",
    typeEn: "",
    description: "",
    percentage: 0,
    baseValue: 0,
    insurerName: "",
    policyNumber: "",
    coverageType: "comprehensive",
    startDate: "",
    expiryDate: "",
    contactPerson: "",
    contactPhone: "",
    notes: "",
  });

  // Alert for expiring/expired insurances
  const alertInsurances = useMemo(() => {
    return insurances.filter(ins => {
      const status = getExpiryStatus(ins.expiryDate);
      return status === "expiring" || status === "expired";
    });
  }, [insurances]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const activeCount = insurances.filter(ins => getExpiryStatus(ins.expiryDate) === "active").length;
    const expiringCount = insurances.filter(ins => getExpiryStatus(ins.expiryDate) === "expiring").length;
    const expiredCount = insurances.filter(ins => getExpiryStatus(ins.expiryDate) === "expired").length;
    return { activeCount, expiringCount, expiredCount };
  }, [insurances]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const totalPremium = insurances.reduce((sum, i) => sum + i.premium, 0);

  useEffect(() => {
    onTotalChange?.(totalPremium);
  }, [totalPremium, onTotalChange]);

  const handleContractValueChange = (value: number) => {
    setBaseContractValue(value);
    setInsurances(prev => prev.map(ins => ({
      ...ins,
      baseValue: ins.id === "3" ? value * 0.05 : ins.id === "4" ? value * 0.1 : value,
      premium: (ins.id === "3" ? value * 0.05 : ins.id === "4" ? value * 0.1 : value) * (ins.percentage / 100)
    })));
  };

  const handleAdd = () => {
    setEditingInsurance(null);
    setFormData({ 
      type: "", 
      typeEn: "", 
      description: "", 
      percentage: 0, 
      baseValue: baseContractValue,
      insurerName: "",
      policyNumber: "",
      coverageType: "comprehensive",
      startDate: format(new Date(), "yyyy-MM-dd"),
      expiryDate: format(addDays(new Date(), 365), "yyyy-MM-dd"),
      contactPerson: "",
      contactPhone: "",
      notes: "",
    });
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
      insurerName: insurance.insurerName || "",
      policyNumber: insurance.policyNumber || "",
      coverageType: insurance.coverageType || "comprehensive",
      startDate: insurance.startDate || "",
      expiryDate: insurance.expiryDate || "",
      contactPerson: insurance.contactPerson || "",
      contactPhone: insurance.contactPhone || "",
      notes: insurance.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const premium = formData.baseValue * (formData.percentage / 100);
    const status = getExpiryStatus(formData.expiryDate);
    
    if (editingInsurance) {
      setInsurances(prev => prev.map(i => 
        i.id === editingInsurance.id 
          ? { ...i, ...formData, premium, status } 
          : i
      ));
    } else {
      const newInsurance: Insurance = {
        id: Date.now().toString(),
        ...formData,
        premium,
        status,
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

  const handleInsurerChange = (value: string) => {
    const selectedInsurer = INSURANCE_COMPANIES.find(c => c.value === value);
    if (selectedInsurer) {
      setFormData({
        ...formData,
        insurerName: isArabic ? selectedInsurer.labelAr : selectedInsurer.labelEn,
      });
    }
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
        {/* Expiry Alerts */}
        {alertInsurances.length > 0 && (
          <Alert variant="destructive" className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              {isArabic ? "تنبيهات التأمين" : "Insurance Alerts"}
            </AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              <div className="mt-2 space-y-1">
                {alertInsurances.map(ins => {
                  const daysLeft = ins.expiryDate ? differenceInDays(new Date(ins.expiryDate), new Date()) : 0;
                  return (
                    <div key={ins.id} className="flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">{isArabic ? ins.type : ins.typeEn}</span>
                      <span>-</span>
                      <span>
                        {daysLeft < 0 
                          ? (isArabic ? `منتهي منذ ${Math.abs(daysLeft)} يوم` : `Expired ${Math.abs(daysLeft)} days ago`)
                          : (isArabic ? `ينتهي خلال ${daysLeft} يوم` : `Expires in ${daysLeft} days`)
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-primary">{insurances.length}</div>
              <div className="text-xs text-muted-foreground">{isArabic ? "إجمالي" : "Total"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-600">{summaryStats.activeCount}</div>
              <div className="text-xs text-muted-foreground">{isArabic ? "نشط" : "Active"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{summaryStats.expiringCount}</div>
              <div className="text-xs text-muted-foreground">{isArabic ? "ينتهي قريباً" : "Expiring"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-red-600">{summaryStats.expiredCount}</div>
              <div className="text-xs text-muted-foreground">{isArabic ? "منتهي" : "Expired"}</div>
            </CardContent>
          </Card>
        </div>

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
                <TableHead>{isArabic ? "شركة التأمين" : "Insurer"}</TableHead>
                <TableHead>{isArabic ? "رقم البوليصة" : "Policy #"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الانتهاء" : "Expiry"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-center">{isArabic ? "القسط" : "Premium"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insurances.map((insurance, index) => {
                const status = getExpiryStatus(insurance.expiryDate);
                return (
                  <TableRow key={insurance.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{isArabic ? insurance.type : insurance.typeEn}</p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? insurance.typeEn : insurance.type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{insurance.insurerName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{insurance.policyNumber || "-"}</TableCell>
                    <TableCell className="text-center text-sm">{insurance.expiryDate || "-"}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(status, isArabic)}</TableCell>
                    <TableCell className="text-center font-medium text-primary">
                      SAR {formatCurrency(insurance.premium)}
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
                );
              })}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInsurance 
                  ? (isArabic ? "تعديل تأمين" : "Edit Insurance") 
                  : (isArabic ? "إضافة تأمين" : "Add Insurance")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Row 1: Type Names */}
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

              {/* Row 2: Insurer and Policy */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {isArabic ? "شركة التأمين" : "Insurance Company"}
                  </Label>
                  <Select onValueChange={handleInsurerChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={isArabic ? "اختر الشركة" : "Select company"} />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_COMPANIES.map((company) => (
                        <SelectItem key={company.value} value={company.value}>
                          {isArabic ? company.labelAr : company.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {isArabic ? "رقم البوليصة" : "Policy Number"}
                  </Label>
                  <Input
                    value={formData.policyNumber}
                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    placeholder="POL-2024-001"
                  />
                </div>
              </div>

              {/* Row 3: Coverage Type and Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التغطية" : "Coverage Type"}</Label>
                  <Select 
                    value={formData.coverageType} 
                    onValueChange={(value) => setFormData({ ...formData, coverageType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COVERAGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {isArabic ? type.labelAr : type.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isArabic ? "تاريخ البداية" : "Start Date"}
                  </Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isArabic ? "تاريخ الانتهاء" : "Expiry Date"}
                  </Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 4: Values */}
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

              {/* Row 5: Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "جهة الاتصال" : "Contact Person"}</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder={isArabic ? "اسم المسؤول" : "Contact name"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "رقم التواصل" : "Contact Phone"}</Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder={isArabic ? "رقم الهاتف" : "Phone number"}
                  />
                </div>
              </div>

              {/* Row 6: Description */}
              <div className="space-y-2">
                <Label>{isArabic ? "الوصف" : "Description"}</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isArabic ? "وصف مختصر للتغطية" : "Brief description of coverage"}
                />
              </div>

              {/* Row 7: Notes */}
              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                  rows={3}
                />
              </div>

              {/* Premium Summary */}
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">{isArabic ? "قسط التأمين المتوقع" : "Expected Premium"}</p>
                <p className="text-xl font-bold text-primary">
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
