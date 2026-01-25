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
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  DollarSign
} from "lucide-react";
import { format, differenceInDays, addMonths } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_title: string;
  contract_number: string;
}

interface Warranty {
  id: string;
  contract_id: string;
  warranty_type: string;
  description?: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  responsible_party?: string;
  bond_value?: number;
  bond_type?: string;
  status?: string;
  release_date?: string;
  notes?: string;
  contracts?: Contract;
}

const warrantyTypes = [
  { value: "defects_liability", labelEn: "Defects Liability Period (DLP)", labelAr: "فترة العيوب" },
  { value: "performance", labelEn: "Performance Warranty", labelAr: "ضمان الأداء" },
  { value: "equipment", labelEn: "Equipment Warranty", labelAr: "ضمان المعدات" },
  { value: "workmanship", labelEn: "Workmanship Warranty", labelAr: "ضمان التشطيبات" },
  { value: "materials", labelEn: "Materials Warranty", labelAr: "ضمان المواد" },
  { value: "structural", labelEn: "Structural Warranty", labelAr: "ضمان هيكلي" },
];

const bondTypes = [
  { value: "bank_guarantee", labelEn: "Bank Guarantee", labelAr: "ضمان بنكي" },
  { value: "cash_retention", labelEn: "Cash Retention", labelAr: "محتجزات نقدية" },
  { value: "insurance", labelEn: "Insurance", labelAr: "تأمين" },
  { value: "corporate_guarantee", labelEn: "Corporate Guarantee", labelAr: "ضمان مؤسسي" },
];

export const ContractWarranties = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [selectedContract, setSelectedContract] = useState<string>("all");

  const [formData, setFormData] = useState({
    contract_id: "",
    warranty_type: "defects_liability",
    description: "",
    start_date: "",
    duration_months: 12,
    responsible_party: "",
    bond_value: "",
    bond_type: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchContracts();
      fetchWarranties();
    }
  }, [user]);

  const fetchContracts = async () => {
    const { data } = await supabase
      .from("contracts")
      .select("id, contract_title, contract_number")
      .eq("user_id", user?.id)
      .order("contract_title");
    
    setContracts(data || []);
  };

  const fetchWarranties = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_warranties")
        .select("*, contracts(id, contract_title, contract_number)")
        .eq("user_id", user?.id)
        .order("end_date", { ascending: true });

      if (error) throw error;
      setWarranties(data || []);
    } catch (error) {
      console.error("Error fetching warranties:", error);
      toast.error(isArabic ? "خطأ في تحميل الضمانات" : "Error loading warranties");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.contract_id || !formData.start_date) {
      toast.error(isArabic ? "الرجاء ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    try {
      const startDate = new Date(formData.start_date);
      const endDate = addMonths(startDate, formData.duration_months);

      const warrantyData = {
        contract_id: formData.contract_id,
        user_id: user?.id,
        warranty_type: formData.warranty_type,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: format(endDate, "yyyy-MM-dd"),
        duration_months: formData.duration_months,
        responsible_party: formData.responsible_party || null,
        bond_value: formData.bond_value ? parseFloat(formData.bond_value) : null,
        bond_type: formData.bond_type || null,
        notes: formData.notes || null,
        status: "active",
      };

      if (editingWarranty) {
        const { error } = await supabase
          .from("contract_warranties")
          .update(warrantyData)
          .eq("id", editingWarranty.id);
        if (error) throw error;
        toast.success(isArabic ? "تم تحديث الضمان" : "Warranty updated");
      } else {
        const { error } = await supabase
          .from("contract_warranties")
          .insert(warrantyData);
        if (error) throw error;
        toast.success(isArabic ? "تم إضافة الضمان" : "Warranty added");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchWarranties();
    } catch (error) {
      console.error("Error saving warranty:", error);
      toast.error(isArabic ? "خطأ في الحفظ" : "Error saving");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("contract_warranties")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success(isArabic ? "تم حذف الضمان" : "Warranty deleted");
      fetchWarranties();
    } catch (error) {
      console.error("Error deleting warranty:", error);
      toast.error(isArabic ? "خطأ في الحذف" : "Error deleting");
    }
  };

  const handleReleaseWarranty = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contract_warranties")
        .update({ 
          status: "released", 
          release_date: format(new Date(), "yyyy-MM-dd") 
        })
        .eq("id", id);
      if (error) throw error;
      toast.success(isArabic ? "تم تحرير الضمان" : "Warranty released");
      fetchWarranties();
    } catch (error) {
      console.error("Error releasing warranty:", error);
      toast.error(isArabic ? "خطأ في تحرير الضمان" : "Error releasing warranty");
    }
  };

  const resetForm = () => {
    setFormData({
      contract_id: "",
      warranty_type: "defects_liability",
      description: "",
      start_date: "",
      duration_months: 12,
      responsible_party: "",
      bond_value: "",
      bond_type: "",
      notes: "",
    });
    setEditingWarranty(null);
  };

  const openEditDialog = (warranty: Warranty) => {
    setEditingWarranty(warranty);
    setFormData({
      contract_id: warranty.contract_id,
      warranty_type: warranty.warranty_type,
      description: warranty.description || "",
      start_date: warranty.start_date,
      duration_months: warranty.duration_months,
      responsible_party: warranty.responsible_party || "",
      bond_value: warranty.bond_value?.toString() || "",
      bond_type: warranty.bond_type || "",
      notes: warranty.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (warranty: Warranty) => {
    const now = new Date();
    const endDate = new Date(warranty.end_date);
    const daysRemaining = differenceInDays(endDate, now);

    if (warranty.status === "released") {
      return <Badge className="bg-gray-500">{isArabic ? "محرر" : "Released"}</Badge>;
    }
    if (daysRemaining < 0) {
      return <Badge variant="destructive">{isArabic ? "منتهي" : "Expired"}</Badge>;
    }
    if (daysRemaining <= 30) {
      return <Badge className="bg-orange-500">{isArabic ? "ينتهي قريباً" : "Expiring Soon"}</Badge>;
    }
    return <Badge className="bg-green-500">{isArabic ? "نشط" : "Active"}</Badge>;
  };

  const getWarrantyTypeLabel = (type: string) => {
    const found = warrantyTypes.find(w => w.value === type);
    return isArabic ? found?.labelAr : found?.labelEn || type;
  };

  const getBondTypeLabel = (type: string) => {
    const found = bondTypes.find(b => b.value === type);
    return isArabic ? found?.labelAr : found?.labelEn || type;
  };

  const filteredWarranties = selectedContract === "all"
    ? warranties
    : warranties.filter(w => w.contract_id === selectedContract);

  const activeWarranties = warranties.filter(w => w.status === "active" && differenceInDays(new Date(w.end_date), new Date()) >= 0);
  const expiringWarranties = warranties.filter(w => {
    const days = differenceInDays(new Date(w.end_date), new Date());
    return w.status === "active" && days >= 0 && days <= 30;
  });
  const expiredWarranties = warranties.filter(w => w.status !== "released" && differenceInDays(new Date(w.end_date), new Date()) < 0);

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
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isArabic ? "الضمانات والصيانة" : "Warranties & Maintenance"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "تتبع فترات الضمان والصيانة" : "Track warranty periods and maintenance"}
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? "إضافة ضمان" : "Add Warranty"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWarranty 
                  ? (isArabic ? "تعديل الضمان" : "Edit Warranty")
                  : (isArabic ? "إضافة ضمان جديد" : "Add New Warranty")}
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
                <Label>{isArabic ? "نوع الضمان *" : "Warranty Type *"}</Label>
                <Select value={formData.warranty_type} onValueChange={(v) => setFormData({ ...formData, warranty_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantyTypes.map(w => (
                      <SelectItem key={w.value} value={w.value}>
                        {isArabic ? w.labelAr : w.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isArabic ? "تاريخ البدء *" : "Start Date *"}</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{isArabic ? "المدة (أشهر)" : "Duration (months)"}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 12 })}
                  />
                </div>
              </div>

              <div>
                <Label>{isArabic ? "الطرف المسؤول" : "Responsible Party"}</Label>
                <Input
                  value={formData.responsible_party}
                  onChange={(e) => setFormData({ ...formData, responsible_party: e.target.value })}
                  placeholder={isArabic ? "اسم المقاول أو الشركة" : "Contractor or company name"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isArabic ? "قيمة الضمان" : "Bond Value"}</Label>
                  <Input
                    type="number"
                    value={formData.bond_value}
                    onChange={(e) => setFormData({ ...formData, bond_value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>{isArabic ? "نوع الضمان المالي" : "Bond Type"}</Label>
                  <Select value={formData.bond_type} onValueChange={(v) => setFormData({ ...formData, bond_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={isArabic ? "اختر النوع" : "Select type"} />
                    </SelectTrigger>
                    <SelectContent>
                      {bondTypes.map(b => (
                        <SelectItem key={b.value} value={b.value}>
                          {isArabic ? b.labelAr : b.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                {editingWarranty 
                  ? (isArabic ? "تحديث" : "Update")
                  : (isArabic ? "إضافة" : "Add")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeWarranties.length}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "نشطة" : "Active"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringWarranties.length}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "تنتهي قريباً" : "Expiring Soon"}</p>
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
                <p className="text-2xl font-bold">{expiredWarranties.length}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "منتهية" : "Expired"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warranties.length}</p>
                <p className="text-xs text-muted-foreground">{isArabic ? "الإجمالي" : "Total"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>{isArabic ? "تصفية حسب العقد:" : "Filter by Contract:"}</Label>
        <Select value={selectedContract} onValueChange={setSelectedContract}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? "جميع العقود" : "All Contracts"}</SelectItem>
            {contracts.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.contract_title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Warranties Table */}
      <Card>
        <CardContent className="p-0">
          {filteredWarranties.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {isArabic ? "لا توجد ضمانات" : "No warranties found"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "العقد" : "Contract"}</TableHead>
                  <TableHead>{isArabic ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isArabic ? "المدة" : "Duration"}</TableHead>
                  <TableHead>{isArabic ? "البدء" : "Start"}</TableHead>
                  <TableHead>{isArabic ? "الانتهاء" : "End"}</TableHead>
                  <TableHead>{isArabic ? "قيمة الضمان" : "Bond Value"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarranties.map((warranty) => {
                  const daysRemaining = differenceInDays(new Date(warranty.end_date), new Date());
                  return (
                    <TableRow key={warranty.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{warranty.contracts?.contract_title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getWarrantyTypeLabel(warranty.warranty_type)}</TableCell>
                      <TableCell>{warranty.duration_months} {isArabic ? "شهر" : "months"}</TableCell>
                      <TableCell>
                        {format(new Date(warranty.start_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          {format(new Date(warranty.end_date), "dd/MM/yyyy")}
                          {daysRemaining >= 0 && warranty.status !== "released" && (
                            <p className={`text-xs ${daysRemaining <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                              ({daysRemaining} {isArabic ? "يوم" : "days"})
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {warranty.bond_value ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {new Intl.NumberFormat().format(warranty.bond_value)}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(warranty)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(warranty)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {warranty.status === "active" && daysRemaining < 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReleaseWarranty(warranty.id)}
                            >
                              {isArabic ? "تحرير" : "Release"}
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(warranty.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
