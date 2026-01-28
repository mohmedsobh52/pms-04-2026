import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Shield, Info, AlertTriangle, Clock, Building2, FileText, Calendar, Calculator, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

// Insurance presets with default rates
const INSURANCE_PRESETS = [
  { 
    value: "car", 
    labelAr: "جميع مخاطر المقاول", 
    labelEn: "Contractor's All Risk (CAR)",
    defaultRate: 0.25,
    descriptionAr: "تغطية شاملة لجميع مخاطر البناء والتشييد",
    descriptionEn: "Comprehensive coverage for all construction risks"
  },
  { 
    value: "third_party", 
    labelAr: "المسؤولية تجاه الغير", 
    labelEn: "Third Party Liability",
    defaultRate: 0.15,
    descriptionAr: "تغطية الأضرار التي قد تلحق بالغير",
    descriptionEn: "Coverage for damages to third parties"
  },
  { 
    value: "workers", 
    labelAr: "تأمين العمال", 
    labelEn: "Workers' Compensation",
    defaultRate: 2.0,
    descriptionAr: "تغطية إصابات وحوادث العمل",
    descriptionEn: "Coverage for worker injuries and accidents"
  },
  { 
    value: "equipment", 
    labelAr: "تأمين المعدات", 
    labelEn: "Equipment Insurance",
    defaultRate: 0.5,
    descriptionAr: "تغطية المعدات والآلات ضد التلف والسرقة",
    descriptionEn: "Coverage for equipment damage and theft"
  },
  { 
    value: "professional", 
    labelAr: "المسؤولية المهنية", 
    labelEn: "Professional Indemnity",
    defaultRate: 0.3,
    descriptionAr: "تغطية الأخطاء المهنية والإهمال",
    descriptionEn: "Coverage for professional errors and negligence"
  },
  { 
    value: "decennial", 
    labelAr: "التأمين العشري", 
    labelEn: "Decennial Insurance",
    defaultRate: 1.5,
    descriptionAr: "تغطية العيوب الإنشائية لمدة 10 سنوات",
    descriptionEn: "10-year structural defects coverage"
  },
  { 
    value: "custom", 
    labelAr: "نوع مخصص", 
    labelEn: "Custom Type",
    defaultRate: 0,
    descriptionAr: "",
    descriptionEn: ""
  },
];

export interface Insurance {
  id: string;
  type: string;
  typeEn: string;
  description: string;
  descriptionAr: string;
  percentage: number;
  baseValue: number;
  premium: number;
  premiumType: "percentage" | "fixed";
  fixedPremium: number;
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
  { value: "allianz", labelAr: "أليانز", labelEn: "Allianz" },
  { value: "gulf_union", labelAr: "الاتحاد التعاوني", labelEn: "Gulf Union" },
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
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  
  const calculateDefaultInsurances = (value: number): Insurance[] => [
    { 
      id: "1", 
      type: "تأمين جميع أخطار المقاولين", 
      typeEn: "Contractor's All Risk (CAR)", 
      description: "Comprehensive coverage for all construction risks",
      descriptionAr: "يغطي الأضرار المادية للمشروع",
      percentage: 0.25, 
      baseValue: value, 
      premium: value * 0.0025,
      premiumType: "percentage",
      fixedPremium: 0,
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
      description: "Coverage for damages to third parties",
      descriptionAr: "يغطي الأضرار التي قد تلحق بالغير",
      percentage: 0.15, 
      baseValue: value, 
      premium: value * 0.0015,
      premiumType: "percentage",
      fixedPremium: 0,
      coverageType: "comprehensive",
      status: "active",
    },
    { 
      id: "3", 
      type: "تأمين العمال", 
      typeEn: "Workers' Compensation", 
      description: "Coverage for worker injuries and accidents",
      descriptionAr: "يغطي إصابات وحوادث العمل",
      percentage: 2.0, 
      baseValue: value * 0.05,
      premium: value * 0.05 * 0.02,
      premiumType: "percentage",
      fixedPremium: 0,
      coverageType: "basic",
      status: "active",
    },
    { 
      id: "4", 
      type: "تأمين المعدات", 
      typeEn: "Equipment Insurance", 
      description: "Coverage for equipment damage and theft",
      descriptionAr: "يغطي المعدات ضد السرقة والتلف",
      percentage: 0.5, 
      baseValue: value * 0.1,
      premium: value * 0.1 * 0.005,
      premiumType: "percentage",
      fixedPremium: 0,
      coverageType: "comprehensive",
      status: "active",
    },
  ];

  const [insurances, setInsurances] = useState<Insurance[]>(
    initialData && initialData.length > 0 ? initialData : calculateDefaultInsurances(baseContractValue)
  );

  useEffect(() => {
    if (initialData && initialData.length > 0 && !isInitialized) {
      // Ensure all new fields have defaults
      const migratedData = initialData.map(ins => ({
        ...ins,
        descriptionAr: ins.descriptionAr || ins.description || "",
        premiumType: ins.premiumType || "percentage" as const,
        fixedPremium: ins.fixedPremium || 0,
      }));
      setInsurances(migratedData);
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
    descriptionAr: "",
    percentage: 0,
    baseValue: 0,
    premiumType: "percentage" as "percentage" | "fixed",
    fixedPremium: 0,
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
    setInsurances(prev => prev.map(ins => {
      if (ins.premiumType === "fixed") return ins;
      return {
        ...ins,
        baseValue: ins.id === "3" ? value * 0.05 : ins.id === "4" ? value * 0.1 : value,
        premium: (ins.id === "3" ? value * 0.05 : ins.id === "4" ? value * 0.1 : value) * (ins.percentage / 100)
      };
    }));
  };

  // Calculate premium based on type
  const calculatePremium = () => {
    if (formData.premiumType === "fixed") {
      return formData.fixedPremium;
    }
    return formData.baseValue * (formData.percentage / 100);
  };

  // Coverage days calculation
  const coverageDays = useMemo(() => {
    if (formData.startDate && formData.expiryDate) {
      return differenceInDays(new Date(formData.expiryDate), new Date(formData.startDate));
    }
    return 0;
  }, [formData.startDate, formData.expiryDate]);

  const daysUntilExpiry = useMemo(() => {
    if (formData.expiryDate) {
      return differenceInDays(new Date(formData.expiryDate), new Date());
    }
    return 0;
  }, [formData.expiryDate]);

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    const preset = INSURANCE_PRESETS.find(p => p.value === presetValue);
    if (preset && presetValue !== "custom") {
      setFormData(prev => ({
        ...prev,
        type: preset.labelAr,
        typeEn: preset.labelEn,
        descriptionAr: preset.descriptionAr,
        description: preset.descriptionEn,
        percentage: preset.defaultRate,
      }));
    }
  };

  const handleAdd = () => {
    setEditingInsurance(null);
    setSelectedPreset("");
    setFormData({ 
      type: "", 
      typeEn: "", 
      description: "", 
      descriptionAr: "",
      percentage: 0, 
      baseValue: baseContractValue,
      premiumType: "percentage",
      fixedPremium: 0,
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
    const preset = INSURANCE_PRESETS.find(p => p.labelAr === insurance.type || p.labelEn === insurance.typeEn);
    setSelectedPreset(preset?.value || "custom");
    setFormData({
      type: insurance.type,
      typeEn: insurance.typeEn,
      description: insurance.description,
      descriptionAr: insurance.descriptionAr || insurance.description,
      percentage: insurance.percentage,
      baseValue: insurance.baseValue,
      premiumType: insurance.premiumType || "percentage",
      fixedPremium: insurance.fixedPremium || 0,
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

  const handleDuplicate = (insurance: Insurance) => {
    const newInsurance: Insurance = {
      ...insurance,
      id: Date.now().toString(),
      policyNumber: "",
      status: "active",
    };
    setInsurances(prev => [...prev, newInsurance]);
  };

  const handleSave = () => {
    const premium = calculatePremium();
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
    <Card className="tender-card-safe">
      <CardHeader className="flex flex-row items-center justify-between tender-card-header">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {isArabic ? "التأمين" : "Insurance"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2 relative z-[65] pointer-events-auto">
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

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "نوع التأمين" : "Insurance Type"}</TableHead>
                <TableHead>{isArabic ? "شركة التأمين" : "Insurer"}</TableHead>
                <TableHead>{isArabic ? "رقم البوليصة" : "Policy #"}</TableHead>
                <TableHead className="text-center">{isArabic ? "طريقة الحساب" : "Calc. Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الانتهاء" : "Expiry"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-center">{isArabic ? "القسط" : "Premium"}</TableHead>
                <TableHead className="w-28">{isArabic ? "إجراءات" : "Actions"}</TableHead>
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
                    <TableCell className="text-center">
                      {insurance.premiumType === "fixed" ? (
                        <Badge variant="outline">{isArabic ? "ثابت" : "Fixed"}</Badge>
                      ) : (
                        <span className="text-sm">{insurance.percentage}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">{insurance.expiryDate || "-"}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(status, isArabic)}</TableCell>
                    <TableCell className="text-center font-medium text-primary">
                      SAR {formatCurrency(insurance.premium)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(insurance)} title={isArabic ? "نسخ" : "Duplicate"}>
                          <Copy className="w-4 h-4" />
                        </Button>
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
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {editingInsurance 
                  ? (isArabic ? "تعديل تأمين" : "Edit Insurance") 
                  : (isArabic ? "إضافة تأمين" : "Add Insurance")}
              </DialogTitle>
              <DialogDescription>
                {isArabic ? "إضافة تغطية تأمينية جديدة للمشروع" : "Add a new insurance coverage for the project"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Row 0: Insurance Type Preset */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  {isArabic ? "نوع التأمين" : "Insurance Type"} <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? "اختر نوع التأمين" : "Select insurance type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {INSURANCE_PRESETS.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {isArabic ? preset.labelAr : preset.labelEn}
                        {preset.defaultRate > 0 && ` (${preset.defaultRate}%)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 1: Custom Type Names (shown when custom is selected) */}
              {selectedPreset === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "اسم التأمين (عربي)" : "Insurance Name (Arabic)"}</Label>
                    <Input
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder={isArabic ? "مثال: تأمين المعدات" : "e.g., تأمين المعدات"}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "اسم التأمين (إنجليزي)" : "Insurance Name (English)"}</Label>
                    <Input
                      value={formData.typeEn}
                      onChange={(e) => setFormData({ ...formData, typeEn: e.target.value })}
                      placeholder="e.g., Equipment Insurance"
                    />
                  </div>
                </div>
              )}

              {/* Row 2: Descriptions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Input
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                    placeholder={isArabic ? "وصف التغطية التأمينية" : "Insurance coverage description"}
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Insurance coverage description"
                  />
                </div>
              </div>

              {/* Row 3: Insurer and Policy */}
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
                  {formData.insurerName && (
                    <Input
                      value={formData.insurerName}
                      onChange={(e) => setFormData({ ...formData, insurerName: e.target.value })}
                      placeholder={isArabic ? "أو أدخل اسم الشركة" : "Or enter company name"}
                      className="mt-2"
                    />
                  )}
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

              {/* Row 4: Coverage Type and Dates */}
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

              {/* Coverage Duration Info */}
              {coverageDays > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {isArabic ? "مدة التغطية:" : "Coverage Duration:"} <strong>{coverageDays}</strong> {isArabic ? "يوم" : "days"}
                  </span>
                  {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {daysUntilExpiry} {isArabic ? "يوم متبقي" : "days left"}
                    </Badge>
                  )}
                </div>
              )}

              {/* Row 5: Premium Calculation Method */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <Calculator className="w-4 h-4" />
                  {isArabic ? "طريقة حساب القسط" : "Premium Calculation Method"}
                </Label>
                <RadioGroup
                  value={formData.premiumType}
                  onValueChange={(value: "percentage" | "fixed") => setFormData({ ...formData, premiumType: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="cursor-pointer">
                      {isArabic ? "نسبة مئوية (%)" : "Percentage (%)"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="cursor-pointer">
                      {isArabic ? "قسط ثابت" : "Fixed Premium"}
                    </Label>
                  </div>
                </RadioGroup>

                {formData.premiumType === "percentage" ? (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? "القيمة المؤمنة (SAR)" : "Insured Value (SAR)"}</Label>
                      <Input
                        type="number"
                        value={formData.baseValue}
                        onChange={(e) => setFormData({ ...formData, baseValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? "معدل القسط (%)" : "Premium Rate (%)"}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.percentage}
                        onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Label>{isArabic ? "قسط ثابت (SAR)" : "Fixed Premium (SAR)"}</Label>
                    <Input
                      type="number"
                      value={formData.fixedPremium}
                      onChange={(e) => setFormData({ ...formData, fixedPremium: parseFloat(e.target.value) || 0 })}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Row 6: Contact */}
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
                    placeholder="+966 5X XXX XXXX"
                  />
                </div>
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
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{isArabic ? "ملخص الحساب" : "Calculation Summary"}</span>
                </div>
                <div className="space-y-2 text-sm">
                  {formData.premiumType === "percentage" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isArabic ? "القيمة المؤمنة" : "Insured Value"}</span>
                        <span>SAR {formatCurrency(formData.baseValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isArabic ? "معدل القسط" : "Premium Rate"}</span>
                        <span>{formData.percentage}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isArabic ? "قسط ثابت" : "Fixed Premium"}</span>
                      <span>SAR {formatCurrency(formData.fixedPremium)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{isArabic ? "إجمالي القسط" : "Total Premium"}</span>
                      <span className="text-xl font-bold text-primary">
                        SAR {formatCurrency(calculatePremium())}
                      </span>
                    </div>
                  </div>
                  {coverageDays > 0 && calculatePremium() > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>{isArabic ? "القسط اليومي" : "Daily Premium"}</span>
                      <span>SAR {formatCurrency(calculatePremium() / coverageDays)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={!formData.type && !selectedPreset}>
                {editingInsurance 
                  ? (isArabic ? "حفظ التغييرات" : "Save Changes")
                  : (isArabic ? "إضافة التأمين" : "Add Insurance")
                }
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
              <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isArabic ? "حذف" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
