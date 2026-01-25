import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
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
}

const FACILITY_TYPES = [
  { value: "office", labelAr: "مكاتب", labelEn: "Offices" },
  { value: "accommodation", labelAr: "سكن", labelEn: "Accommodation" },
  { value: "storage", labelAr: "مخازن", labelEn: "Storage" },
  { value: "equipment", labelAr: "معدات", labelEn: "Equipment" },
  { value: "utilities", labelAr: "مرافق عامة", labelEn: "Utilities" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

const defaultFacilities: Facility[] = [
  { id: "1", name: "مكتب الموقع", nameEn: "Site Office", facilityType: "office", type: "rent", description: "Site Office Container", descriptionAr: "حاوية مكتب الموقع", unitCost: 5000, quantity: 1, duration: 12, total: 60000, notes: "" },
  { id: "2", name: "مخيم العمال", nameEn: "Workers Camp", facilityType: "accommodation", type: "rent", description: "Workers accommodation", descriptionAr: "سكن عمال", unitCost: 10000, quantity: 1, duration: 12, total: 120000, notes: "" },
  { id: "3", name: "مستودع مواد", nameEn: "Materials Store", facilityType: "storage", type: "rent", description: "Materials storage", descriptionAr: "مخزن مواد", unitCost: 3000, quantity: 2, duration: 12, total: 72000, notes: "" },
  { id: "4", name: "كرفان مهندسين", nameEn: "Engineers Caravan", facilityType: "office", type: "purchase", description: "Engineers office", descriptionAr: "مكتب مهندسين", unitCost: 25000, quantity: 2, duration: 1, total: 50000, notes: "" },
  { id: "5", name: "حمامات متنقلة", nameEn: "Portable Toilets", facilityType: "utilities", type: "rent", description: "Portable toilets", descriptionAr: "حمامات متنقلة", unitCost: 1000, quantity: 4, duration: 12, total: 48000, notes: "" },
  { id: "6", name: "مولد كهرباء", nameEn: "Power Generator", facilityType: "equipment", type: "purchase", description: "Power generator", descriptionAr: "مولد كهرباء", unitCost: 50000, quantity: 1, duration: 1, total: 50000, notes: "" },
  { id: "7", name: "خزان مياه", nameEn: "Water Tank", facilityType: "utilities", type: "purchase", description: "Water tank", descriptionAr: "خزان مياه", unitCost: 15000, quantity: 2, duration: 1, total: 30000, notes: "" },
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
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const totalCost = facilities.reduce((sum, f) => sum + f.total, 0);
  const rentTotal = facilities.filter(f => f.type === "rent").reduce((sum, f) => sum + f.total, 0);
  const purchaseTotal = facilities.filter(f => f.type === "purchase").reduce((sum, f) => sum + f.total, 0);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange?.(totalCost);
  }, [totalCost, onTotalChange]);

  const calculateTotal = (data: typeof formData) => {
    if (data.type === "purchase") {
      return data.unitCost * data.quantity;
    }
    return data.unitCost * data.quantity * data.duration;
  };

  const handleAdd = () => {
    setEditingFacility(null);
    setFormData({ name: "", nameEn: "", facilityType: "other", type: "rent", description: "", descriptionAr: "", unitCost: 0, quantity: 1, duration: 12, notes: "" });
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
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const total = calculateTotal(formData);
    // Use description as name if name is not provided
    const finalData = {
      ...formData,
      name: formData.name || formData.descriptionAr || formData.description,
      nameEn: formData.nameEn || formData.description || formData.descriptionAr,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {isArabic ? "المرافق" : "Facilities"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة مرفق" : "Add Facility"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "المرفق" : "Facility"}</TableHead>
                <TableHead className="text-center">{isArabic ? "النوع" : "Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "التكلفة" : "Cost"}</TableHead>
                <TableHead className="text-center">{isArabic ? "العدد" : "Qty"}</TableHead>
                <TableHead className="text-center">{isArabic ? "المدة" : "Duration"}</TableHead>
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
                    </div>
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

        {/* Totals */}
        <div className="mt-4 flex justify-end gap-4">
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "إيجارات" : "Rentals"}</p>
            <p className="font-semibold">SAR {formatCurrency(rentTotal)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">{isArabic ? "مشتريات" : "Purchases"}</p>
            <p className="font-semibold">SAR {formatCurrency(purchaseTotal)}</p>
          </div>
          <div className="bg-muted rounded-lg px-6 py-3">
            <p className="text-sm text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</p>
            <p className="text-2xl font-bold text-primary">SAR {formatCurrency(totalCost)}</p>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFacility 
                  ? (isArabic ? "تعديل مرفق" : "Edit Facility") 
                  : (isArabic ? "إضافة مرفق" : "Add Facility")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Facility Type & Cost Type */}
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="rent">{isArabic ? "شهري" : "Monthly"}</SelectItem>
                      <SelectItem value="purchase">{isArabic ? "شراء" : "Purchase"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف *" : "Description *"}</Label>
                  <Input
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                    placeholder={isArabic ? "مثال: حاوية مكتب الموقع" : "e.g., حاوية مكتب الموقع"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={isArabic ? "مثال: Site Office Container" : "e.g., Site Office Container"}
                  />
                </div>
              </div>

              {/* Cost, Quantity, Duration */}
              <div className="grid grid-cols-3 gap-4">
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
                      ? (isArabic ? "تكلفة الوحدة *" : "Unit Cost *") 
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
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات اختيارية..." : "Optional notes..."}
                />
              </div>

              {/* Summary */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? "تكلفة الوحدة" : "Unit Cost"}</span>
                  <span>{formatCurrency(formData.unitCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? "الكمية" : "Quantity"}</span>
                  <span>{formData.quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? "المدة" : "Duration"}</span>
                  <span>{formData.duration} {isArabic ? "أشهر" : "months"}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? "إجمالي التكلفة" : "Total Cost"}</span>
                    <span className="text-xl font-bold">SAR {formatCurrency(calculateTotal(formData))}</span>
                  </div>
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
