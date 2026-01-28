import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Building2, CalendarDays, Truck, Download, Upload, BarChart3 } from "lucide-react";
import { exportFacilitiesToExcel, importFacilitiesFromExcel } from "@/lib/facilities-excel-utils";
import { FacilitiesChartsReport } from "./FacilitiesChartsReport";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

export interface Facility {
  id: string;
  name: string;
  nameEn: string;
  facilityType: string;
  type: "rent" | "purchase";
  description: string;
  descriptionAr: string;
  unitCost: number;
  quantity: number;
  duration: number;
  total: number;
  notes: string;
  // New fields
  supplier: string;
  contractNumber: string;
  startDate: string;
  status: "active" | "expired" | "pending";
  installationCost: number;
  monthlyCost: number;
}

const FACILITY_TYPES = [
  { value: "office", labelAr: "مكاتب", labelEn: "Offices" },
  { value: "accommodation", labelAr: "سكن", labelEn: "Accommodation" },
  { value: "storage", labelAr: "مخازن", labelEn: "Storage" },
  { value: "equipment", labelAr: "معدات", labelEn: "Equipment" },
  { value: "utilities", labelAr: "مرافق عامة", labelEn: "Utilities" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

const FACILITY_STATUS = [
  { value: "active", labelAr: "نشط", labelEn: "Active", color: "bg-green-500" },
  { value: "pending", labelAr: "معلق", labelEn: "Pending", color: "bg-yellow-500" },
  { value: "expired", labelAr: "منتهي", labelEn: "Expired", color: "bg-gray-500" },
];

const defaultFacilities: Facility[] = [
  { 
    id: "1", 
    name: "مكتب الموقع", 
    nameEn: "Site Office", 
    facilityType: "office", 
    type: "rent", 
    description: "Site Office Container", 
    descriptionAr: "حاوية مكتب الموقع", 
    unitCost: 5000, 
    quantity: 1, 
    duration: 12, 
    total: 62000, 
    notes: "",
    supplier: "شركة الحاويات المتحدة",
    contractNumber: "CONT-2024-001",
    startDate: "2024-01-01",
    status: "active",
    installationCost: 2000,
    monthlyCost: 5000,
  },
  { 
    id: "2", 
    name: "مخيم العمال", 
    nameEn: "Workers Camp", 
    facilityType: "accommodation", 
    type: "rent", 
    description: "Workers accommodation", 
    descriptionAr: "سكن عمال", 
    unitCost: 10000, 
    quantity: 1, 
    duration: 12, 
    total: 125000, 
    notes: "",
    supplier: "مؤسسة المخيمات الحديثة",
    contractNumber: "CONT-2024-002",
    startDate: "2024-01-15",
    status: "active",
    installationCost: 5000,
    monthlyCost: 10000,
  },
  { 
    id: "3", 
    name: "مستودع مواد", 
    nameEn: "Materials Store", 
    facilityType: "storage", 
    type: "rent", 
    description: "Materials storage", 
    descriptionAr: "مخزن مواد", 
    unitCost: 3000, 
    quantity: 2, 
    duration: 12, 
    total: 75000, 
    notes: "",
    supplier: "شركة التخزين السعودية",
    contractNumber: "CONT-2024-003",
    startDate: "2024-02-01",
    status: "active",
    installationCost: 3000,
    monthlyCost: 6000,
  },
  { 
    id: "4", 
    name: "كرفان مهندسين", 
    nameEn: "Engineers Caravan", 
    facilityType: "office", 
    type: "purchase", 
    description: "Engineers office", 
    descriptionAr: "مكتب مهندسين", 
    unitCost: 25000, 
    quantity: 2, 
    duration: 1, 
    total: 54000, 
    notes: "",
    supplier: "مصنع الكرفانات الوطني",
    contractNumber: "PO-2024-001",
    startDate: "2024-01-20",
    status: "active",
    installationCost: 4000,
    monthlyCost: 0,
  },
  { 
    id: "5", 
    name: "حمامات متنقلة", 
    nameEn: "Portable Toilets", 
    facilityType: "utilities", 
    type: "rent", 
    description: "Portable toilets", 
    descriptionAr: "حمامات متنقلة", 
    unitCost: 1000, 
    quantity: 4, 
    duration: 12, 
    total: 50000, 
    notes: "",
    supplier: "شركة النظافة المتكاملة",
    contractNumber: "CONT-2024-004",
    startDate: "2024-01-01",
    status: "active",
    installationCost: 2000,
    monthlyCost: 4000,
  },
  { 
    id: "6", 
    name: "مولد كهرباء", 
    nameEn: "Power Generator", 
    facilityType: "equipment", 
    type: "purchase", 
    description: "Power generator", 
    descriptionAr: "مولد كهرباء", 
    unitCost: 50000, 
    quantity: 1, 
    duration: 1, 
    total: 55000, 
    notes: "",
    supplier: "شركة المولدات الصناعية",
    contractNumber: "PO-2024-002",
    startDate: "2024-02-15",
    status: "active",
    installationCost: 5000,
    monthlyCost: 0,
  },
  { 
    id: "7", 
    name: "خزان مياه", 
    nameEn: "Water Tank", 
    facilityType: "utilities", 
    type: "purchase", 
    description: "Water tank", 
    descriptionAr: "خزان مياه", 
    unitCost: 15000, 
    quantity: 2, 
    duration: 1, 
    total: 33000, 
    notes: "",
    supplier: "مصنع الخزانات المعدنية",
    contractNumber: "PO-2024-003",
    startDate: "2024-03-01",
    status: "pending",
    installationCost: 3000,
    monthlyCost: 0,
  },
];

interface FacilitiesTabProps {
  isArabic: boolean;
  initialData?: Facility[];
  onDataChange?: (data: Facility[]) => void;
  onTotalChange?: (total: number) => void;
}

export function FacilitiesTab({ isArabic, initialData, onDataChange, onTotalChange }: FacilitiesTabProps) {
  const [facilities, setFacilities] = useState<Facility[]>(initialData && initialData.length > 0 ? initialData : defaultFacilities);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync with initial data
  useEffect(() => {
    if (initialData && initialData.length > 0 && !isInitialized) {
      setFacilities(initialData);
      setIsInitialized(true);
    } else if (!initialData || initialData.length === 0) {
      setIsInitialized(true);
    }
  }, [initialData]);

  // Notify parent of data changes
  useEffect(() => {
    if (isInitialized) {
      onDataChange?.(facilities);
    }
  }, [facilities, isInitialized]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    facilityType: "other",
    type: "rent" as "rent" | "purchase",
    description: "",
    descriptionAr: "",
    unitCost: 0,
    quantity: 1,
    duration: 12,
    notes: "",
    supplier: "",
    contractNumber: "",
    startDate: "",
    status: "active" as "active" | "expired" | "pending",
    installationCost: 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const totalCost = facilities.reduce((sum, f) => sum + f.total, 0);
  const rentTotal = facilities.filter(f => f.type === "rent").reduce((sum, f) => sum + f.total, 0);
  const purchaseTotal = facilities.filter(f => f.type === "purchase").reduce((sum, f) => sum + f.total, 0);
  const installationTotal = facilities.reduce((sum, f) => sum + (f.installationCost || 0), 0);
  const activeCount = facilities.filter(f => f.status === "active").length;
  const pendingCount = facilities.filter(f => f.status === "pending").length;

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange?.(totalCost);
  }, [totalCost, onTotalChange]);

  const calculateTotal = (data: typeof formData) => {
    const baseCost = data.type === "purchase" 
      ? data.unitCost * data.quantity 
      : data.unitCost * data.quantity * data.duration;
    return baseCost + data.installationCost;
  };

  const calculateMonthlyCost = (data: typeof formData) => {
    return data.unitCost * data.quantity;
  };

  const handleAdd = () => {
    setEditingFacility(null);
    setFormData({ 
      name: "", 
      nameEn: "", 
      facilityType: "other", 
      type: "rent", 
      description: "", 
      descriptionAr: "", 
      unitCost: 0, 
      quantity: 1, 
      duration: 12, 
      notes: "",
      supplier: "",
      contractNumber: "",
      startDate: "",
      status: "active",
      installationCost: 0,
    });
    setShowDialog(true);
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      nameEn: facility.nameEn,
      facilityType: facility.facilityType || "other",
      type: facility.type,
      description: facility.description || "",
      descriptionAr: facility.descriptionAr || "",
      unitCost: facility.unitCost,
      quantity: facility.quantity,
      duration: facility.duration,
      notes: facility.notes || "",
      supplier: facility.supplier || "",
      contractNumber: facility.contractNumber || "",
      startDate: facility.startDate || "",
      status: facility.status || "active",
      installationCost: facility.installationCost || 0,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const total = calculateTotal(formData);
    const monthlyCost = calculateMonthlyCost(formData);
    
    // Use description as name if name is not provided
    const finalData = {
      ...formData,
      name: formData.name || formData.descriptionAr || formData.description,
      nameEn: formData.nameEn || formData.description || formData.descriptionAr,
      monthlyCost: formData.type === "rent" ? monthlyCost : 0,
    };
    
    if (editingFacility) {
      setFacilities(prev => prev.map(f => 
        f.id === editingFacility.id 
          ? { ...f, ...finalData, total } 
          : f
      ));
    } else {
      const newFacility: Facility = {
        id: Date.now().toString(),
        ...finalData,
        total,
      };
      setFacilities(prev => [...prev, newFacility]);
    }
    
    setShowDialog(false);
    onTotalChange?.(totalCost);
  };

  const handleDelete = (id: string) => {
    setFacilities(prev => prev.filter(f => f.id !== id));
    setDeleteId(null);
    onTotalChange?.(totalCost);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = FACILITY_STATUS.find(s => s.value === status);
    if (!statusInfo) return null;
    
    return (
      <Badge 
        variant="outline" 
        className={`${statusInfo.color} text-white border-0`}
      >
        {isArabic ? statusInfo.labelAr : statusInfo.labelEn}
      </Badge>
    );
  };

  return (
    <Card className="tender-card-safe">
      <CardHeader className="flex flex-row items-center justify-between tender-card-header">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {isArabic ? "المرافق" : "Facilities"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2 relative z-[65] pointer-events-auto">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة مرفق" : "Add Facility"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "المرفق" : "Facility"}</TableHead>
                <TableHead>{isArabic ? "المورد" : "Supplier"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-center">{isArabic ? "النوع" : "Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "التكلفة" : "Cost"}</TableHead>
                <TableHead className="text-center">{isArabic ? "العدد" : "Qty"}</TableHead>
                <TableHead className="text-center">{isArabic ? "المدة" : "Duration"}</TableHead>
                <TableHead className="text-center">{isArabic ? "ت. شهرية" : "Monthly"}</TableHead>
                <TableHead className="text-center">{isArabic ? "ت. تركيب" : "Install"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((facility, index) => (
                <TableRow key={facility.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isArabic ? facility.name : facility.nameEn}</p>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? facility.nameEn : facility.name}
                      </p>
                      {facility.contractNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          #{facility.contractNumber}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{facility.supplier || "-"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(facility.status || "active")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={facility.type === "rent" ? "outline" : "secondary"}>
                      {facility.type === "rent" 
                        ? (isArabic ? "إيجار" : "Rent") 
                        : (isArabic ? "شراء" : "Purchase")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{formatCurrency(facility.unitCost)}</TableCell>
                  <TableCell className="text-center">{facility.quantity}</TableCell>
                  <TableCell className="text-center">
                    {facility.type === "rent" 
                      ? `${facility.duration} ${isArabic ? "شهر" : "mo"}` 
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {facility.type === "rent" 
                      ? formatCurrency(facility.monthlyCost || facility.unitCost * facility.quantity)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCurrency(facility.installationCost || 0)}
                  </TableCell>
                  <TableCell className="text-center font-medium">{formatCurrency(facility.total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(facility)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(facility.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Totals */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "إيجارات" : "Rentals"}</p>
            <p className="font-semibold text-blue-600">SAR {formatCurrency(rentTotal)}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "مشتريات" : "Purchases"}</p>
            <p className="font-semibold text-purple-600">SAR {formatCurrency(purchaseTotal)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "تكلفة التركيب" : "Installation"}</p>
            <p className="font-semibold text-orange-600">SAR {formatCurrency(installationTotal)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "مرافق نشطة" : "Active"}</p>
            <p className="font-semibold text-green-600">{activeCount} / {facilities.length}</p>
          </div>
          <div className="bg-primary/10 rounded-lg px-6 py-3 text-center">
            <p className="text-sm text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</p>
            <p className="text-2xl font-bold text-primary">SAR {formatCurrency(totalCost)}</p>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFacility 
                  ? (isArabic ? "تعديل مرفق" : "Edit Facility") 
                  : (isArabic ? "إضافة مرفق" : "Add Facility")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Facility Type, Cost Type & Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع المرفق *" : "Facility Type *"}</Label>
                  <Select
                    value={formData.facilityType}
                    onValueChange={(value) => setFormData({ ...formData, facilityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>
                          {isArabic ? ft.labelAr : ft.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التكلفة" : "Cost Type"}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "rent" | "purchase") => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">{isArabic ? "إيجار شهري" : "Monthly Rent"}</SelectItem>
                      <SelectItem value="purchase">{isArabic ? "شراء" : "Purchase"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الحالة" : "Status"}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "expired" | "pending") => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {isArabic ? s.labelAr : s.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (عربي) *" : "Description (Arabic) *"}</Label>
                  <Input
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                    placeholder={isArabic ? "مثال: حاوية مكتب الموقع" : "e.g., حاوية مكتب الموقع"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={isArabic ? "مثال: Site Office Container" : "e.g., Site Office Container"}
                  />
                </div>
              </div>

              {/* Quantity, Cost, Duration, Start Date */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الكمية" : "Quantity"}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {formData.type === "rent" 
                      ? (isArabic ? "تكلفة الوحدة/شهر *" : "Unit Cost/Month *") 
                      : (isArabic ? "سعر الوحدة *" : "Unit Price *")}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "المدة (أشهر)" : "Duration (months)"}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                    disabled={formData.type === "purchase"}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {isArabic ? "تاريخ البداية" : "Start Date"}
                  </Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Installation Cost & Supplier */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {isArabic ? "تكلفة التركيب/النقل" : "Installation/Transport Cost"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.installationCost}
                    onChange={(e) => setFormData({ ...formData, installationCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "المورد/المقاول" : "Supplier/Contractor"}</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder={isArabic ? "اسم الشركة أو المورد" : "Company or supplier name"}
                  />
                </div>
              </div>

              {/* Contract Number */}
              <div className="space-y-2">
                <Label>{isArabic ? "رقم العقد/الفاتورة" : "Contract/Invoice Number"}</Label>
                <Input
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  placeholder={isArabic ? "مثال: CONT-2024-001" : "e.g., CONT-2024-001"}
                />
              </div>

              {/* Notes - Textarea */}
              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات اختيارية..." : "Optional notes..."}
                  rows={3}
                />
              </div>

              {/* Enhanced Summary */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm border-b pb-2">
                  {isArabic ? "ملخص التكاليف" : "Cost Summary"}
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? "تكلفة الوحدة" : "Unit Cost"}</span>
                    <span>SAR {formatCurrency(formData.unitCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? "الكمية" : "Quantity"}</span>
                    <span>{formData.quantity}</span>
                  </div>
                  {formData.type === "rent" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isArabic ? "التكلفة الشهرية" : "Monthly Cost"}</span>
                        <span className="text-blue-600 font-medium">SAR {formatCurrency(calculateMonthlyCost(formData))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{isArabic ? "المدة" : "Duration"}</span>
                        <span>{formData.duration} {isArabic ? "شهر" : "months"}</span>
                      </div>
                    </>
                  )}
                  {formData.installationCost > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">{isArabic ? "تكلفة التركيب/النقل" : "Installation/Transport"}</span>
                      <span className="text-orange-600">+ SAR {formatCurrency(formData.installationCost)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{isArabic ? "إجمالي التكلفة" : "Total Cost"}</span>
                    <span className="text-2xl font-bold text-primary">SAR {formatCurrency(calculateTotal(formData))}</span>
                  </div>
                  {formData.type === "rent" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      = ({formatCurrency(formData.unitCost)} × {formData.quantity} × {formData.duration}) + {formatCurrency(formData.installationCost)}
                    </p>
                  )}
                  {formData.type === "purchase" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      = ({formatCurrency(formData.unitCost)} × {formData.quantity}) + {formatCurrency(formData.installationCost)}
                    </p>
                  )}
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
                  ? "هل أنت متأكد من حذف هذا المرفق؟ لا يمكن التراجع عن هذا الإجراء." 
                  : "Are you sure you want to delete this facility? This action cannot be undone."}
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
