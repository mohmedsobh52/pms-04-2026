import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contract_type: string;
  contract_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  payment_terms: string | null;
  scope_of_work: string | null;
  terms_conditions: string | null;
  notes: string | null;
  created_at: string;
}

interface ContractManagementProps {
  projectId?: string;
}

export function ContractManagement({ projectId }: ContractManagementProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    contract_number: "",
    contract_title: "",
    contractor_name: "",
    contract_type: "fixed_price",
    contract_value: "",
    currency: "SAR",
    start_date: "",
    end_date: "",
    status: "draft",
    payment_terms: "",
    scope_of_work: "",
    notes: "",
  });

  // FIDIC-based contract types
  const contractTypes = [
    { value: "fidic_red", labelEn: "FIDIC Red Book (Construction)", labelAr: "فيديك الكتاب الأحمر (البناء)" },
    { value: "fidic_yellow", labelEn: "FIDIC Yellow Book (Design-Build)", labelAr: "فيديك الكتاب الأصفر (التصميم والبناء)" },
    { value: "fidic_silver", labelEn: "FIDIC Silver Book (EPC/Turnkey)", labelAr: "فيديك الكتاب الفضي (تسليم مفتاح)" },
    { value: "fidic_green", labelEn: "FIDIC Green Book (Short Form)", labelAr: "فيديك الكتاب الأخضر (النموذج القصير)" },
    { value: "fidic_pink", labelEn: "FIDIC Pink Book (MDB)", labelAr: "فيديك الكتاب الوردي (بنوك التنمية)" },
    { value: "fixed_price", labelEn: "Fixed Price", labelAr: "سعر ثابت" },
    { value: "cost_plus", labelEn: "Cost Plus", labelAr: "التكلفة زائد" },
    { value: "time_materials", labelEn: "Time & Materials", labelAr: "الوقت والمواد" },
    { value: "unit_price", labelEn: "Unit Price", labelAr: "سعر الوحدة" },
    { value: "lump_sum", labelEn: "Lump Sum", labelAr: "مبلغ مقطوع" },
  ];

  const statuses = [
    { value: "draft", labelEn: "Draft", labelAr: "مسودة", color: "bg-gray-500" },
    { value: "pending", labelEn: "Pending Approval", labelAr: "بانتظار الموافقة", color: "bg-yellow-500" },
    { value: "active", labelEn: "Active", labelAr: "نشط", color: "bg-green-500" },
    { value: "on_hold", labelEn: "On Hold", labelAr: "معلق", color: "bg-orange-500" },
    { value: "completed", labelEn: "Completed", labelAr: "مكتمل", color: "bg-blue-500" },
    { value: "terminated", labelEn: "Terminated", labelAr: "منتهي", color: "bg-red-500" },
  ];

  const fetchContracts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user, projectId]);

  const handleSave = async () => {
    if (!user || !formData.contract_number || !formData.contract_title) return;
    setSaving(true);
    try {
      const contractData = {
        user_id: user.id,
        project_id: projectId || null,
        contract_number: formData.contract_number,
        contract_title: formData.contract_title,
        contractor_name: formData.contractor_name || null,
        contract_type: formData.contract_type,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        currency: formData.currency,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        payment_terms: formData.payment_terms || null,
        scope_of_work: formData.scope_of_work || null,
        notes: formData.notes || null,
      };

      if (editingContract) {
        const { error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", editingContract.id);
        if (error) throw error;
        toast({ title: isArabic ? "تم التحديث" : "Updated" });
      } else {
        const { error } = await supabase.from("contracts").insert(contractData);
        if (error) throw error;
        toast({ title: isArabic ? "تمت الإضافة" : "Added" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContracts();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({ title: isArabic ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      contract_number: "",
      contract_title: "",
      contractor_name: "",
      contract_type: "fixed_price",
      contract_value: "",
      currency: "SAR",
      start_date: "",
      end_date: "",
      status: "draft",
      payment_terms: "",
      scope_of_work: "",
      notes: "",
    });
    setEditingContract(null);
  };

  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      contract_number: contract.contract_number,
      contract_title: contract.contract_title,
      contractor_name: contract.contractor_name || "",
      contract_type: contract.contract_type,
      contract_value: contract.contract_value?.toString() || "",
      currency: contract.currency,
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      status: contract.status,
      payment_terms: contract.payment_terms || "",
      scope_of_work: contract.scope_of_work || "",
      notes: contract.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getContractProgress = (contract: Contract) => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getDaysRemaining = (contract: Contract) => {
    if (!contract.end_date) return null;
    return differenceInDays(new Date(contract.end_date), new Date());
  };

  const totalValue = contracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const activeContracts = contracts.filter((c) => c.status === "active").length;

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency === "SAR" ? "SAR" : currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>{isArabic ? "إدارة العقود" : "Contract Management"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "إدارة ومتابعة العقود" : "Manage and track contracts"}
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            {isArabic ? "إضافة عقد" : "Add Contract"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-2xl font-bold">{contracts.length}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "إجمالي العقود" : "Total Contracts"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold text-green-600">{activeContracts}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "عقود نشطة" : "Active"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 col-span-2">
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(totalValue, "SAR")}
            </div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "إجمالي القيمة" : "Total Value"}
            </div>
          </div>
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد عقود مسجلة" : "No contracts recorded"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const status = statuses.find((s) => s.value === contract.status);
              const progress = getContractProgress(contract);
              const daysRemaining = getDaysRemaining(contract);

              return (
                <div key={contract.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {contract.contract_number}
                        </Badge>
                        <Badge className={cn("text-white text-xs", status?.color)}>
                          {isArabic ? status?.labelAr : status?.labelEn}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{contract.contract_title}</h4>
                      {contract.contractor_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {contract.contractor_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(contract)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(contract.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    {contract.contract_value && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(contract.contract_value, contract.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {contractTypes.find((t) => t.value === contract.contract_type)?.[isArabic ? "labelAr" : "labelEn"]}
                      </span>
                    </div>
                    {contract.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {format(new Date(contract.start_date), "PP", { locale: isArabic ? ar : enUS })}
                        </span>
                      </div>
                    )}
                    {daysRemaining !== null && (
                      <div className={cn("flex items-center gap-1", daysRemaining < 0 ? "text-red-600" : daysRemaining < 30 ? "text-orange-600" : "")}>
                        <Clock className="w-4 h-4" />
                        <span>
                          {daysRemaining < 0
                            ? isArabic ? `متأخر ${Math.abs(daysRemaining)} يوم` : `${Math.abs(daysRemaining)} days overdue`
                            : isArabic ? `${daysRemaining} يوم متبقي` : `${daysRemaining} days left`}
                        </span>
                      </div>
                    )}
                  </div>

                  {contract.start_date && contract.end_date && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{isArabic ? "التقدم الزمني" : "Time Progress"}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract
                ? isArabic ? "تعديل العقد" : "Edit Contract"
                : isArabic ? "إضافة عقد جديد" : "Add New Contract"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "رقم العقد *" : "Contract Number *"}</Label>
                <Input
                  value={formData.contract_number}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "الحالة" : "Status"}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {isArabic ? s.labelAr : s.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "عنوان العقد *" : "Contract Title *"}</Label>
              <Input
                value={formData.contract_title}
                onChange={(e) => setFormData({ ...formData, contract_title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "اسم المقاول" : "Contractor Name"}</Label>
                <Input
                  value={formData.contractor_name}
                  onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "نوع العقد" : "Contract Type"}</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {isArabic ? t.labelAr : t.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "قيمة العقد" : "Contract Value"}</Label>
                <Input
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "العملة" : "Currency"}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                    <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">EUR - يورو</SelectItem>
                    <SelectItem value="AED">AED - درهم إماراتي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "تاريخ البدء" : "Start Date"}</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "تاريخ الانتهاء" : "End Date"}</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "شروط الدفع" : "Payment Terms"}</Label>
              <Textarea
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "نطاق العمل" : "Scope of Work"}</Label>
              <Textarea
                value={formData.scope_of_work}
                onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.contract_number || !formData.contract_title}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ml-2">{isArabic ? "حفظ" : "Save"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
