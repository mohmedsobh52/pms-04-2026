import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
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

export interface StaffMember {
  id: string;
  position: string;
  positionEn: string;
  count: number;
  monthlySalary: number;
  duration: number;
  total: number;
}

const defaultStaff: StaffMember[] = [
  { id: "1", position: "مدير مشروع", positionEn: "Project Manager", count: 1, monthlySalary: 25000, duration: 12, total: 300000 },
  { id: "2", position: "مهندس موقع", positionEn: "Site Engineer", count: 2, monthlySalary: 15000, duration: 12, total: 360000 },
  { id: "3", position: "مساح", positionEn: "Surveyor", count: 1, monthlySalary: 8000, duration: 12, total: 96000 },
  { id: "4", position: "مشرف سلامة", positionEn: "Safety Officer", count: 1, monthlySalary: 10000, duration: 12, total: 120000 },
  { id: "5", position: "محاسب", positionEn: "Accountant", count: 1, monthlySalary: 7000, duration: 12, total: 84000 },
  { id: "6", position: "سكرتير", positionEn: "Secretary", count: 1, monthlySalary: 5000, duration: 12, total: 60000 },
  { id: "7", position: "سائق", positionEn: "Driver", count: 2, monthlySalary: 3500, duration: 12, total: 84000 },
  { id: "8", position: "حارس", positionEn: "Security Guard", count: 3, monthlySalary: 2500, duration: 12, total: 90000 },
];

interface SiteStaffTabProps {
  isArabic: boolean;
  onTotalChange?: (total: number) => void;
}

export function SiteStaffTab({ isArabic, onTotalChange }: SiteStaffTabProps) {
  const [staff, setStaff] = useState<StaffMember[]>(defaultStaff);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    position: "",
    positionEn: "",
    count: 1,
    monthlySalary: 0,
    duration: 12,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const totalCost = staff.reduce((sum, s) => sum + s.total, 0);

  const handleAdd = () => {
    setEditingStaff(null);
    setFormData({ position: "", positionEn: "", count: 1, monthlySalary: 0, duration: 12 });
    setShowDialog(true);
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      position: member.position,
      positionEn: member.positionEn,
      count: member.count,
      monthlySalary: member.monthlySalary,
      duration: member.duration,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const total = formData.count * formData.monthlySalary * formData.duration;
    
    if (editingStaff) {
      setStaff(prev => prev.map(s => 
        s.id === editingStaff.id 
          ? { ...s, ...formData, total } 
          : s
      ));
    } else {
      const newStaff: StaffMember = {
        id: Date.now().toString(),
        ...formData,
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "الوظيفة" : "Position"}</TableHead>
                <TableHead className="text-center">{isArabic ? "العدد" : "Count"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الراتب الشهري" : "Monthly Salary"}</TableHead>
                <TableHead className="text-center">{isArabic ? "المدة (شهر)" : "Duration (months)"}</TableHead>
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
                  <TableCell className="text-center">{member.duration}</TableCell>
                  <TableCell className="text-center font-medium">{formatCurrency(member.total)}</TableCell>
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

        {/* Total */}
        <div className="mt-4 flex justify-end">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStaff 
                  ? (isArabic ? "تعديل موظف" : "Edit Staff") 
                  : (isArabic ? "إضافة موظف" : "Add Staff")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الوظيفة (عربي)" : "Position (Arabic)"}</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder={isArabic ? "مثال: مهندس موقع" : "e.g., مهندس موقع"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوظيفة (إنجليزي)" : "Position (English)"}</Label>
                  <Input
                    value={formData.positionEn}
                    onChange={(e) => setFormData({ ...formData, positionEn: e.target.value })}
                    placeholder={isArabic ? "مثال: Site Engineer" : "e.g., Site Engineer"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "العدد" : "Count"}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.count}
                    onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الراتب الشهري" : "Monthly Salary"}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })}
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
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">{isArabic ? "الإجمالي المتوقع" : "Expected Total"}</p>
                <p className="text-xl font-bold">
                  SAR {formatCurrency(formData.count * formData.monthlySalary * formData.duration)}
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
