import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, FileCheck, Info, Landmark, AlertTriangle, Clock, Building, Calendar, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { differenceInDays, addMonths, format } from "date-fns";

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
  // New fields
  bankName?: string;
  bankBranch?: string;
  guaranteeNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: "active" | "expiring" | "expired" | "released";
  renewalDate?: string;
  notes?: string;
}

const guaranteeTypes = {
  bid_bond: { ar: "ضمان ابتدائي", en: "Bid Bond" },
  performance_bond: { ar: "ضمان حسن التنفيذ", en: "Performance Bond" },
  advance_payment: { ar: "ضمان الدفعة المقدمة", en: "Advance Payment Bond" },
  retention: { ar: "ضمان المحتجزات", en: "Retention Bond" },
};

const SAUDI_BANKS = [
  { value: "snb", labelAr: "البنك الأهلي السعودي", labelEn: "Saudi National Bank (SNB)" },
  { value: "alrajhi", labelAr: "مصرف الراجحي", labelEn: "Al Rajhi Bank" },
  { value: "riyadh", labelAr: "بنك الرياض", labelEn: "Riyad Bank" },
  { value: "sab", labelAr: "البنك السعودي البريطاني (ساب)", labelEn: "SABB" },
  { value: "anb", labelAr: "البنك العربي الوطني", labelEn: "Arab National Bank (ANB)" },
  { value: "albilad", labelAr: "بنك البلاد", labelEn: "Bank Albilad" },
  { value: "alinma", labelAr: "مصرف الإنماء", labelEn: "Alinma Bank" },
  { value: "bsf", labelAr: "البنك السعودي الفرنسي", labelEn: "Banque Saudi Fransi" },
  { value: "sib", labelAr: "بنك الاستثمار السعودي", labelEn: "Saudi Investment Bank" },
  { value: "jazira", labelAr: "بنك الجزيرة", labelEn: "Bank AlJazira" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

const GUARANTEE_STATUS = [
  { value: "active", labelAr: "نشط", labelEn: "Active", color: "bg-green-500" },
  { value: "expiring", labelAr: "ينتهي قريباً", labelEn: "Expiring Soon", color: "bg-yellow-500" },
  { value: "expired", labelAr: "منتهي", labelEn: "Expired", color: "bg-red-500" },
  { value: "released", labelAr: "محرر", labelEn: "Released", color: "bg-gray-500" },
];

interface GuaranteesTabProps {
  isArabic: boolean;
  contractValue?: number;
  initialData?: Guarantee[];
  onDataChange?: (data: Guarantee[]) => void;
  onTotalChange?: (total: number) => void;
}

const getExpiryStatus = (expiryDate?: string, currentStatus?: string): "active" | "expiring" | "expired" | "released" => {
  if (currentStatus === "released") return "released";
  if (!expiryDate) return "active";
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysLeft = differenceInDays(expiry, today);
  
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring";
  return "active";
};

const getStatusBadge = (status: string, isArabic: boolean) => {
  const statusConfig = GUARANTEE_STATUS.find(s => s.value === status);
  if (!statusConfig) return <Badge variant="secondary">{status}</Badge>;
  
  return (
    <Badge className={`${statusConfig.color} hover:${statusConfig.color}`}>
      {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
    </Badge>
  );
};

export function GuaranteesTab({ isArabic, contractValue = 10000000, initialData, onDataChange, onTotalChange }: GuaranteesTabProps) {
  const [baseContractValue, setBaseContractValue] = useState(contractValue);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const calculateCost = (guaranteeValue: number, bankCharges: number, duration: number) => {
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
      totalCost: calculateCost(value * 0.02, 1.5, 3),
      status: "active",
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
      totalCost: calculateCost(value * 0.10, 1.5, 24),
      status: "active",
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
      totalCost: calculateCost(value * 0.15, 1.5, 12),
      status: "active",
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
      totalCost: calculateCost(value * 0.05, 1.5, 12),
      status: "active",
    },
  ];

  const [guarantees, setGuarantees] = useState<Guarantee[]>(
    initialData && initialData.length > 0 ? initialData : calculateDefaultGuarantees(baseContractValue)
  );

  useEffect(() => {
    if (initialData && initialData.length > 0 && !isInitialized) {
      setGuarantees(initialData);
      setIsInitialized(true);
    } else if (!initialData || initialData.length === 0) {
      setIsInitialized(true);
    }
  }, [initialData]);

  useEffect(() => {
    if (isInitialized) {
      onDataChange?.(guarantees);
    }
  }, [guarantees, isInitialized]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<Guarantee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "bid_bond" as Guarantee["type"],
    percentage: 0,
    bankCharges: 1.5,
    duration: 12,
    bankName: "",
    bankBranch: "",
    guaranteeNumber: "",
    issueDate: "",
    expiryDate: "",
    status: "active" as Guarantee["status"],
    renewalDate: "",
    notes: "",
  });

  // Alert for expiring/expired guarantees
  const alertGuarantees = useMemo(() => {
    return guarantees.filter(g => {
      const status = getExpiryStatus(g.expiryDate, g.status);
      return status === "expiring" || status === "expired";
    });
  }, [guarantees]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const activeCount = guarantees.filter(g => getExpiryStatus(g.expiryDate, g.status) === "active").length;
    const expiringCount = guarantees.filter(g => getExpiryStatus(g.expiryDate, g.status) === "expiring").length;
    const releasedCount = guarantees.filter(g => g.status === "released").length;
    return { activeCount, expiringCount, releasedCount };
  }, [guarantees]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const totalCost = guarantees.reduce((sum, g) => sum + g.totalCost, 0);
  const totalGuaranteeValue = guarantees.reduce((sum, g) => sum + g.guaranteeValue, 0);

  useEffect(() => {
    onTotalChange?.(totalCost);
  }, [totalCost, onTotalChange]);

  const handleContractValueChange = (value: number) => {
    setBaseContractValue(value);
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
    const today = format(new Date(), "yyyy-MM-dd");
    const defaultExpiry = format(addMonths(new Date(), 24), "yyyy-MM-dd");
    setFormData({ 
      type: "bid_bond", 
      percentage: 5, 
      bankCharges: 1.5, 
      duration: 12,
      bankName: "",
      bankBranch: "",
      guaranteeNumber: "",
      issueDate: today,
      expiryDate: defaultExpiry,
      status: "active",
      renewalDate: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (guarantee: Guarantee) => {
    setEditingGuarantee(guarantee);
    setFormData({
      type: guarantee.type,
      percentage: guarantee.percentage,
      bankCharges: guarantee.bankCharges,
      duration: guarantee.duration,
      bankName: guarantee.bankName || "",
      bankBranch: guarantee.bankBranch || "",
      guaranteeNumber: guarantee.guaranteeNumber || "",
      issueDate: guarantee.issueDate || "",
      expiryDate: guarantee.expiryDate || "",
      status: guarantee.status || "active",
      renewalDate: guarantee.renewalDate || "",
      notes: guarantee.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const guaranteeValue = baseContractValue * (formData.percentage / 100);
    const cost = calculateCost(guaranteeValue, formData.bankCharges, formData.duration);
    const status = formData.status === "released" ? "released" : getExpiryStatus(formData.expiryDate, formData.status);
    
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
              totalCost: cost,
              bankName: formData.bankName,
              bankBranch: formData.bankBranch,
              guaranteeNumber: formData.guaranteeNumber,
              issueDate: formData.issueDate,
              expiryDate: formData.expiryDate,
              status,
              renewalDate: formData.renewalDate,
              notes: formData.notes,
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
        totalCost: cost,
        bankName: formData.bankName,
        bankBranch: formData.bankBranch,
        guaranteeNumber: formData.guaranteeNumber,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        status,
        renewalDate: formData.renewalDate,
        notes: formData.notes,
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

  const handleBankChange = (value: string) => {
    const selectedBank = SAUDI_BANKS.find(b => b.value === value);
    if (selectedBank) {
      setFormData({
        ...formData,
        bankName: isArabic ? selectedBank.labelAr : selectedBank.labelEn,
      });
    }
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

  // Current form calculations
  const currentGuaranteeValue = baseContractValue * (formData.percentage / 100);
  const currentTotalCost = calculateCost(currentGuaranteeValue, formData.bankCharges, formData.duration);

  return (
    <Card className="tender-card-safe">
      <CardHeader className="flex flex-row items-center justify-between tender-card-header">
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          {isArabic ? "الضمانات البنكية" : "Bank Guarantees"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2 relative z-[65] pointer-events-auto">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة ضمان" : "Add Guarantee"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Expiry Alerts */}
        {alertGuarantees.length > 0 && (
          <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800 dark:text-orange-200">
              {isArabic ? "تنبيهات الضمانات" : "Guarantee Alerts"}
            </AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              <div className="mt-2 space-y-1">
                {alertGuarantees.map(g => {
                  const daysLeft = g.expiryDate ? differenceInDays(new Date(g.expiryDate), new Date()) : 0;
                  return (
                    <div key={g.id} className="flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">{isArabic ? g.name : g.nameEn}</span>
                      {g.guaranteeNumber && <span className="text-xs">({g.guaranteeNumber})</span>}
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
              <div className="text-xl font-bold text-primary">{guarantees.length}</div>
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
              <div className="text-xl font-bold text-gray-600">{summaryStats.releasedCount}</div>
              <div className="text-xs text-muted-foreground">{isArabic ? "محرر" : "Released"}</div>
            </CardContent>
          </Card>
        </div>

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
                <TableHead>{isArabic ? "نوع الضمان" : "Type"}</TableHead>
                <TableHead>{isArabic ? "البنك" : "Bank"}</TableHead>
                <TableHead>{isArabic ? "رقم الضمان" : "Guarantee #"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الانتهاء" : "Expiry"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-center">{isArabic ? "القيمة" : "Value"}</TableHead>
                <TableHead className="text-center">{isArabic ? "التكلفة" : "Cost"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guarantees.map((guarantee, index) => {
                const status = getExpiryStatus(guarantee.expiryDate, guarantee.status);
                return (
                  <TableRow key={guarantee.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getTypeBadgeColor(guarantee.type)}>
                          {isArabic ? guarantee.name : guarantee.nameEn}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{guarantee.bankName || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">{guarantee.guaranteeNumber || "-"}</TableCell>
                    <TableCell className="text-center text-sm">{guarantee.expiryDate || "-"}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(status, isArabic)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(guarantee.guaranteeValue)}</TableCell>
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
                );
              })}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGuarantee 
                  ? (isArabic ? "تعديل ضمان" : "Edit Guarantee") 
                  : (isArabic ? "إضافة ضمان" : "Add Guarantee")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Row 1: Type and Status */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>{isArabic ? "الحالة" : "Status"}</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value as Guarantee["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GUARANTEE_STATUS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {isArabic ? status.labelAr : status.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Bank Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {isArabic ? "البنك المصدر" : "Issuing Bank"}
                  </Label>
                  <Select onValueChange={handleBankChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={isArabic ? "اختر البنك" : "Select bank"} />
                    </SelectTrigger>
                    <SelectContent>
                      {SAUDI_BANKS.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {isArabic ? bank.labelAr : bank.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "فرع البنك" : "Bank Branch"}</Label>
                  <Input
                    value={formData.bankBranch}
                    onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                    placeholder={isArabic ? "مثال: فرع الرياض" : "e.g., Riyadh Branch"}
                  />
                </div>
              </div>

              {/* Row 3: Guarantee Number */}
              <div className="space-y-2">
                <Label>{isArabic ? "رقم خطاب الضمان" : "Guarantee Number"}</Label>
                <Input
                  value={formData.guaranteeNumber}
                  onChange={(e) => setFormData({ ...formData, guaranteeNumber: e.target.value })}
                  placeholder="LG-2024-001234"
                />
              </div>

              {/* Row 4: Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isArabic ? "تاريخ الإصدار" : "Issue Date"}
                  </Label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {isArabic ? "تاريخ التجديد" : "Renewal Date"}
                  </Label>
                  <Input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 5: Financial */}
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

              {/* Row 6: Notes */}
              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                  rows={3}
                />
              </div>

              {/* Cost Calculation */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    {isArabic ? "حساب التكاليف" : "Cost Calculation"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isArabic ? "قيمة الضمان:" : "Guarantee Value:"}</span>
                      <span className="font-medium">SAR {formatCurrency(currentGuaranteeValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isArabic ? "المعادلة:" : "Formula:"}</span>
                      <span className="font-mono text-xs">{formatCurrency(currentGuaranteeValue)} × {formData.bankCharges}% × {formData.duration}/12</span>
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{isArabic ? "تكلفة الضمان:" : "Guarantee Cost:"}</span>
                      <span className="text-xl font-bold text-primary">SAR {formatCurrency(currentTotalCost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
