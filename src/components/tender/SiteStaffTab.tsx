import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

export interface StaffMember {
  id: string;
  position: string;
  positionEn: string;
  count: number;
  monthlySalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  duration: number;
  notes: string;
  monthlyPerPerson: number;
  monthlyTotal: number;
  total: number;
}

const defaultStaff: StaffMember[] = [
  { id: "1", position: "مدير مشروع", positionEn: "Project Manager", count: 1, monthlySalary: 25000, housingAllowance: 5000, transportAllowance: 2000, otherAllowances: 1000, duration: 12, notes: "", monthlyPerPerson: 33000, monthlyTotal: 33000, total: 396000 },
  { id: "2", position: "مهندس موقع", positionEn: "Site Engineer", count: 2, monthlySalary: 15000, housingAllowance: 3000, transportAllowance: 1500, otherAllowances: 500, duration: 12, notes: "", monthlyPerPerson: 20000, monthlyTotal: 40000, total: 480000 },
  { id: "3", position: "مساح", positionEn: "Surveyor", count: 1, monthlySalary: 8000, housingAllowance: 2000, transportAllowance: 1000, otherAllowances: 0, duration: 12, notes: "", monthlyPerPerson: 11000, monthlyTotal: 11000, total: 132000 },
  { id: "4", position: "مشرف سلامة", positionEn: "Safety Officer", count: 1, monthlySalary: 10000, housingAllowance: 2500, transportAllowance: 1000, otherAllowances: 500, duration: 12, notes: "", monthlyPerPerson: 14000, monthlyTotal: 14000, total: 168000 },
  { id: "5", position: "محاسب", positionEn: "Accountant", count: 1, monthlySalary: 7000, housingAllowance: 2000, transportAllowance: 800, otherAllowances: 0, duration: 12, notes: "", monthlyPerPerson: 9800, monthlyTotal: 9800, total: 117600 },
  { id: "6", position: "سكرتير", positionEn: "Secretary", count: 1, monthlySalary: 5000, housingAllowance: 1500, transportAllowance: 500, otherAllowances: 0, duration: 12, notes: "", monthlyPerPerson: 7000, monthlyTotal: 7000, total: 84000 },
  { id: "7", position: "سائق", positionEn: "Driver", count: 2, monthlySalary: 3500, housingAllowance: 1000, transportAllowance: 0, otherAllowances: 0, duration: 12, notes: "", monthlyPerPerson: 4500, monthlyTotal: 9000, total: 108000 },
  { id: "8", position: "حارس", positionEn: "Security Guard", count: 3, monthlySalary: 2500, housingAllowance: 800, transportAllowance: 0, otherAllowances: 0, duration: 12, notes: "", monthlyPerPerson: 3300, monthlyTotal: 9900, total: 118800 },
];

interface SiteStaffTabProps {
  isArabic: boolean;
  initialData?: StaffMember[];
  onDataChange?: (data: StaffMember[]) => void;
  onTotalChange?: (total: number) => void;
}

export function SiteStaffTab({ isArabic, initialData, onDataChange, onTotalChange }: SiteStaffTabProps) {
  const [staff, setStaff] = useState<StaffMember[]>(initialData && initialData.length > 0 ? initialData : defaultStaff);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync with initial data
  useEffect(() => {
    if (initialData && initialData.length > 0 && !isInitialized) {
      setStaff(initialData);
      setIsInitialized(true);
    } else if (!initialData || initialData.length === 0) {
      setIsInitialized(true);
    }
  }, [initialData]);

  // Notify parent of data changes
  useEffect(() => {
    if (isInitialized) {
      onDataChange?.(staff);
    }
  }, [staff, isInitialized]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    position: "",
    positionEn: "",
    count: 1,
    monthlySalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowances: 0,
    duration: 12,
    notes: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const calculateMonthlyPerPerson = (data: typeof formData) => {
    return data.monthlySalary + data.housingAllowance + data.transportAllowance + data.otherAllowances;
  };

  const calculateMonthlyTotal = (data: typeof formData) => {
    return calculateMonthlyPerPerson(data) * data.count;
  };

  const calculateTotal = (data: typeof formData) => {
    return calculateMonthlyTotal(data) * data.duration;
  };

  const totalCost = staff.reduce((sum, s) => sum + s.total, 0);
  const totalMonthlyAll = staff.reduce((sum, s) => sum + s.monthlyTotal, 0);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange?.(totalCost);
  }, [totalCost, onTotalChange]);

  const handleAdd = () => {
    setEditingStaff(null);
    setFormData({ 
      position: "", 
      positionEn: "", 
      count: 1, 
      monthlySalary: 0, 
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      duration: 12,
      notes: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      position: member.position,
      positionEn: member.positionEn,
      count: member.count,
      monthlySalary: member.monthlySalary,
      housingAllowance: member.housingAllowance || 0,
      transportAllowance: member.transportAllowance || 0,
      otherAllowances: member.otherAllowances || 0,
      duration: member.duration,
      notes: member.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const monthlyPerPerson = calculateMonthlyPerPerson(formData);
    const monthlyTotal = calculateMonthlyTotal(formData);
    const total = calculateTotal(formData);
    
    if (editingStaff) {
      setStaff(prev => prev.map(s => 
        s.id === editingStaff.id 
          ? { ...s, ...formData, monthlyPerPerson, monthlyTotal, total } 
          : s
      ));
    } else {
      const newStaff: StaffMember = {
        id: Date.now().toString(),
        ...formData,
        monthlyPerPerson,
        monthlyTotal,
        total,
      };
      setStaff(prev => [...prev, newStaff]);
    }
    
    setShowDialog(false);
    onTotalChange?.(totalCost);
  };

  const handleDelete = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    onTotalChange?.(totalCost);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {isArabic ? "طاقم الموقع" : "Site Staff"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة موظف" : "Add Staff"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "الوظيفة" : "Position"}</TableHead>
                <TableHead className="text-center">{isArabic ? "العدد" : "Count"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الراتب" : "Salary"}</TableHead>
                <TableHead className="text-center">{isArabic ? "بدل السكن" : "Housing"}</TableHead>
                <TableHead className="text-center">{isArabic ? "بدل النقل" : "Transport"}</TableHead>
                <TableHead className="text-center">{isArabic ? "بدلات أخرى" : "Other"}</TableHead>
                <TableHead className="text-center">{isArabic ? "شهري/فرد" : "Monthly/Person"}</TableHead>
                <TableHead className="text-center">{isArabic ? "المدة" : "Duration"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                <TableHead className="w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member, index) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isArabic ? member.position : member.positionEn}</p>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? member.positionEn : member.position}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{member.count}</TableCell>
                  <TableCell className="text-center">{formatCurrency(member.monthlySalary)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(member.housingAllowance || 0)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(member.transportAllowance || 0)}</TableCell>
                  <TableCell className="text-center">{formatCurrency(member.otherAllowances || 0)}</TableCell>
                  <TableCell className="text-center text-primary font-medium">
                    {formatCurrency(member.monthlyPerPerson || (member.monthlySalary + (member.housingAllowance || 0) + (member.transportAllowance || 0) + (member.otherAllowances || 0)))}
                  </TableCell>
                  <TableCell className="text-center">{member.duration} {isArabic ? "شهر" : "mo"}</TableCell>
                  <TableCell className="text-center font-bold">{formatCurrency(member.total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(member.id)}>
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
            <p className="text-xs text-muted-foreground">
              {isArabic ? "الإجمالي الشهري" : "Monthly Total"}
            </p>
            <p className="font-semibold">SAR {formatCurrency(totalMonthlyAll)}</p>
          </div>
          <div className="bg-muted rounded-lg px-6 py-4">
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي تكاليف طاقم الموقع" : "Total Site Staff Cost"}
            </p>
            <p className="text-2xl font-bold text-primary">
              SAR {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingStaff 
                  ? (isArabic ? "تعديل موظف" : "Edit Staff") 
                  : (isArabic ? "إضافة موظف" : "Add Staff")}
              </DialogTitle>
              <DialogDescription>
                {isArabic ? "إضافة موظف جديد لإدارة الموقع" : "Add a new staff member for site management"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Position Names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "المنصب *" : "Position *"}</Label>
                  <Input
                    value={formData.positionEn}
                    onChange={(e) => setFormData({ ...formData, positionEn: e.target.value })}
                    placeholder={isArabic ? "مثال: Site Engineer" : "e.g., Site Engineer"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "المنصب (عربي)" : "Position (Arabic)"}</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder={isArabic ? "مثال: مهندس موقع" : "e.g., مهندس موقع"}
                  />
                </div>
              </div>

              {/* Count, Salary, Duration */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الكمية" : "Count"}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.count}
                    onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الراتب الشهري *" : "Monthly Salary *"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })}
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

              {/* Allowances */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "بدل السكن" : "Housing Allowance"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.housingAllowance}
                    onChange={(e) => setFormData({ ...formData, housingAllowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "بدل النقل" : "Transport Allowance"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.transportAllowance}
                    onChange={(e) => setFormData({ ...formData, transportAllowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "بدلات أخرى" : "Other Allowances"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.otherAllowances}
                    onChange={(e) => setFormData({ ...formData, otherAllowances: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات اختيارية..." : "Optional notes..."}
                  rows={2}
                />
              </div>

              <Separator />

              {/* Calculation Summary */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? "الإجمالي الشهري (للشخص)" : "Monthly Total (per person)"}</span>
                  <span>{formatCurrency(calculateMonthlyPerPerson(formData))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isArabic ? `الإجمالي الشهري (${formData.count} موظف)` : `Monthly Total (${formData.count} staff)`}
                  </span>
                  <span>{formatCurrency(calculateMonthlyTotal(formData))}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>{isArabic ? `إجمالي التكلفة (${formData.duration} شهور)` : `Total Cost (${formData.duration} months)`}</span>
                  <span className="text-primary">{formatCurrency(calculateTotal(formData))}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave}>
                {isArabic ? "إضافة موظف" : "Add Staff"}
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
                  ? "هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء." 
                  : "Are you sure you want to delete this staff member? This action cannot be undone."}
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
