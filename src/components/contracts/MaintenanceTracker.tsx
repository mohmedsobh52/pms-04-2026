import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Wrench, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  User
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_title: string;
}

interface Warranty {
  id: string;
  warranty_type: string;
  contract_id: string;
}

interface MaintenanceSchedule {
  id: string;
  warranty_id?: string;
  contract_id: string;
  maintenance_type: string;
  description?: string;
  scheduled_date: string;
  completed_date?: string;
  status?: string;
  assigned_to?: string;
  cost?: number;
  notes?: string;
  contracts?: Contract;
}

const maintenanceTypes = [
  { value: "inspection", labelEn: "Inspection", labelAr: "فحص" },
  { value: "repair", labelEn: "Repair", labelAr: "إصلاح" },
  { value: "replacement", labelEn: "Replacement", labelAr: "استبدال" },
  { value: "testing", labelEn: "Testing", labelAr: "اختبار" },
  { value: "cleaning", labelEn: "Cleaning", labelAr: "تنظيف" },
  { value: "calibration", labelEn: "Calibration", labelAr: "معايرة" },
];

export const MaintenanceTracker = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    contract_id: "",
    warranty_id: "",
    maintenance_type: "inspection",
    description: "",
    scheduled_date: "",
    assigned_to: "",
    cost: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchContracts();
      fetchWarranties();
      fetchSchedules();
    }
  }, [user]);

  const fetchContracts = async () => {
    const { data } = await supabase
      .from("contracts")
      .select("id, contract_title")
      .eq("user_id", user?.id)
      .order("contract_title");
    
    setContracts(data || []);
  };

  const fetchWarranties = async () => {
    const { data } = await supabase
      .from("contract_warranties")
      .select("id, warranty_type, contract_id")
      .eq("user_id", user?.id);
    
    setWarranties(data || []);
  };

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*, contracts(id, contract_title)")
        .eq("user_id", user?.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error(isArabic ? "خطأ في تحميل الجداول" : "Error loading schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.contract_id || !formData.scheduled_date) {
      toast.error(isArabic ? "الرجاء ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    try {
      const scheduleData = {
        contract_id: formData.contract_id,
        warranty_id: formData.warranty_id || null,
        user_id: user?.id,
        maintenance_type: formData.maintenance_type,
        description: formData.description || null,
        scheduled_date: formData.scheduled_date,
        assigned_to: formData.assigned_to || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.notes || null,
        status: "scheduled",
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from("maintenance_schedules")
          .update(scheduleData)
          .eq("id", editingSchedule.id);
        if (error) throw error;
        toast.success(isArabic ? "تم تحديث الجدول" : "Schedule updated");
      } else {
        const { error } = await supabase
          .from("maintenance_schedules")
          .insert(scheduleData);
        if (error) throw error;
        toast.success(isArabic ? "تم إضافة الجدول" : "Schedule added");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error(isArabic ? "خطأ في الحفظ" : "Error saving");
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_schedules")
        .update({ 
          status: "completed", 
          completed_date: format(new Date(), "yyyy-MM-dd") 
        })
        .eq("id", id);
      if (error) throw error;
      toast.success(isArabic ? "تم إكمال المهمة" : "Task completed");
      fetchSchedules();
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error(isArabic ? "خطأ في تحديث الحالة" : "Error updating status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("maintenance_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(isArabic ? "تم حذف الجدول" : "Schedule deleted");
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error(isArabic ? "خطأ في الحذف" : "Error deleting");
    }
  };

  const resetForm = () => {
    setFormData({
      contract_id: "",
      warranty_id: "",
      maintenance_type: "inspection",
      description: "",
      scheduled_date: "",
      assigned_to: "",
      cost: "",
      notes: "",
    });
    setEditingSchedule(null);
  };

  const openEditDialog = (schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      contract_id: schedule.contract_id,
      warranty_id: schedule.warranty_id || "",
      maintenance_type: schedule.maintenance_type,
      description: schedule.description || "",
      scheduled_date: schedule.scheduled_date,
      assigned_to: schedule.assigned_to || "",
      cost: schedule.cost?.toString() || "",
      notes: schedule.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    const now = new Date();
    const scheduledDate = new Date(schedule.scheduled_date);
    const daysRemaining = differenceInDays(scheduledDate, now);

    if (schedule.status === "completed") {
      return <Badge className="bg-green-500">{isArabic ? "مكتمل" : "Completed"}</Badge>;
    }
    if (schedule.status === "cancelled") {
      return <Badge variant="secondary">{isArabic ? "ملغي" : "Cancelled"}</Badge>;
    }
    if (daysRemaining < 0) {
      return <Badge variant="destructive">{isArabic ? "متأخر" : "Overdue"}</Badge>;
    }
    if (daysRemaining <= 7) {
      return <Badge className="bg-orange-500">{isArabic ? "قريباً" : "Upcoming"}</Badge>;
    }
    return <Badge className="bg-blue-500">{isArabic ? "مجدول" : "Scheduled"}</Badge>;
  };

  const getMaintenanceTypeLabel = (type: string) => {
    const found = maintenanceTypes.find(m => m.value === type);
    return isArabic ? found?.labelAr : found?.labelEn || type;
  };

  const filteredSchedules = filterStatus === "all"
    ? schedules
    : schedules.filter(s => {
        if (filterStatus === "overdue") {
          return s.status !== "completed" && differenceInDays(new Date(s.scheduled_date), new Date()) < 0;
        }
        return s.status === filterStatus;
      });

  const scheduledCount = schedules.filter(s => s.status === "scheduled").length;
  const completedCount = schedules.filter(s => s.status === "completed").length;
  const overdueCount = schedules.filter(s => s.status !== "completed" && differenceInDays(new Date(s.scheduled_date), new Date()) < 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Wrench className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isArabic ? "جدول الصيانة" : "Maintenance Schedule"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "تتبع مهام الصيانة الدورية" : "Track periodic maintenance tasks"}
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? "إضافة مهمة" : "Add Task"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule 
                  ? (isArabic ? "تعديل المهمة" : "Edit Task")
                  : (isArabic ? "إضافة مهمة صيانة" : "Add Maintenance Task")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>{isArabic ? "العقد *" : "Contract *"}</Label>
                <Select value={formData.contract_id} onValueChange={(v) => setFormData({ ...formData, contract_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? "اختر العقد" : "Select contract"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.contract_title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{isArabic ? "الضمان (اختياري)" : "Warranty (optional)"}</Label>
                <Select value={formData.warranty_id} onValueChange={(v) => setFormData({ ...formData, warranty_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? "ربط بضمان" : "Link to warranty"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isArabic ? "بدون ربط" : "No link"}</SelectItem>
                    {warranties
                      .filter(w => w.contract_id === formData.contract_id)
                      .map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.warranty_type}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{isArabic ? "نوع الصيانة *" : "Maintenance Type *"}</Label>
                <Select value={formData.maintenance_type} onValueChange={(v) => setFormData({ ...formData, maintenance_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {isArabic ? m.labelAr : m.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{isArabic ? "تاريخ الموعد *" : "Scheduled Date *"}</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>

              <div>
                <Label>{isArabic ? "المسؤول" : "Assigned To"}</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder={isArabic ? "اسم الشخص أو الفريق" : "Person or team name"}
                />
              </div>

              <div>
                <Label>{isArabic ? "التكلفة المتوقعة" : "Estimated Cost"}</Label>
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>{isArabic ? "الوصف" : "Description"}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingSchedule 
                  ? (isArabic ? "تحديث" : "Update")
                  : (isArabic ? "إضافة" : "Add")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledCount}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "مجدولة" : "Scheduled"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "مكتملة" : "Completed"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "متأخرة" : "Overdue"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Wrench className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{schedules.length}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>{isArabic ? "تصفية حسب الحالة:" : "Filter by Status:"}</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
            <SelectItem value="scheduled">{isArabic ? "مجدولة" : "Scheduled"}</SelectItem>
            <SelectItem value="completed">{isArabic ? "مكتملة" : "Completed"}</SelectItem>
            <SelectItem value="overdue">{isArabic ? "متأخرة" : "Overdue"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedule Table */}
      <Card>
        <CardContent className="p-0">
          {filteredSchedules.length === 0 ? (
            <div className="p-8 text-center">
              <Wrench className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {isArabic ? "لا توجد مهام صيانة" : "No maintenance tasks found"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "العقد" : "Contract"}</TableHead>
                  <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isArabic ? "الموعد" : "Scheduled"}</TableHead>
                  <TableHead>{isArabic ? "المسؤول" : "Assigned To"}</TableHead>
                  <TableHead>{isArabic ? "التكلفة" : "Cost"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{schedule.contracts?.contract_title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getMaintenanceTypeLabel(schedule.maintenance_type)}</TableCell>
                    <TableCell>
                      {format(new Date(schedule.scheduled_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {schedule.assigned_to ? (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {schedule.assigned_to}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {schedule.cost 
                        ? new Intl.NumberFormat().format(schedule.cost) 
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(schedule)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {schedule.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkComplete(schedule.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {isArabic ? "إكمال" : "Complete"}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(schedule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
