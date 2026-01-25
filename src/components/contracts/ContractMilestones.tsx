import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_title: string;
  contract_value: number | null;
}

interface Milestone {
  id: string;
  contract_id: string;
  milestone_name: string;
  description: string | null;
  due_date: string;
  payment_percentage: number | null;
  payment_amount: number | null;
  status: string;
  completion_date: string | null;
  notes: string | null;
  sort_order: number;
}

const statusConfig = {
  pending: { color: "bg-gray-500", icon: Clock, labelEn: "Pending", labelAr: "معلق" },
  in_progress: { color: "bg-blue-500", icon: Target, labelEn: "In Progress", labelAr: "قيد التنفيذ" },
  completed: { color: "bg-green-500", icon: CheckCircle, labelEn: "Completed", labelAr: "مكتمل" },
  overdue: { color: "bg-red-500", icon: AlertTriangle, labelEn: "Overdue", labelAr: "متأخر" },
};

export const ContractMilestones = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    milestone_name: "",
    description: "",
    due_date: "",
    payment_percentage: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedContract) {
      fetchMilestones();
    }
  }, [selectedContract]);

  const fetchContracts = async () => {
    try {
      const { data } = await supabase
        .from("contracts")
        .select("id, contract_title, contract_value")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      setContracts(data || []);
      if (data && data.length > 0) {
        setSelectedContract(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const { data } = await supabase
        .from("contract_milestones")
        .select("*")
        .eq("contract_id", selectedContract)
        .order("sort_order", { ascending: true });
      
      setMilestones(data || []);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.milestone_name || !formData.due_date) {
      toast.error(isArabic ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    const contract = contracts.find(c => c.id === selectedContract);
    const paymentAmount = formData.payment_percentage && contract?.contract_value
      ? (parseFloat(formData.payment_percentage) / 100) * contract.contract_value
      : null;

    try {
      if (editingMilestone) {
        await supabase
          .from("contract_milestones")
          .update({
            milestone_name: formData.milestone_name,
            description: formData.description || null,
            due_date: formData.due_date,
            payment_percentage: formData.payment_percentage ? parseFloat(formData.payment_percentage) : null,
            payment_amount: paymentAmount,
            status: formData.status,
            notes: formData.notes || null,
            completion_date: formData.status === "completed" ? new Date().toISOString().split("T")[0] : null,
          })
          .eq("id", editingMilestone.id);

        toast.success(isArabic ? "تم تحديث المعلم بنجاح" : "Milestone updated successfully");
      } else {
        await supabase
          .from("contract_milestones")
          .insert({
            contract_id: selectedContract,
            user_id: user?.id,
            milestone_name: formData.milestone_name,
            description: formData.description || null,
            due_date: formData.due_date,
            payment_percentage: formData.payment_percentage ? parseFloat(formData.payment_percentage) : null,
            payment_amount: paymentAmount,
            status: formData.status,
            notes: formData.notes || null,
            sort_order: milestones.length,
          });

        toast.success(isArabic ? "تم إضافة المعلم بنجاح" : "Milestone added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMilestones();
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast.error(isArabic ? "حدث خطأ" : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) return;

    try {
      await supabase.from("contract_milestones").delete().eq("id", id);
      toast.success(isArabic ? "تم الحذف بنجاح" : "Deleted successfully");
      fetchMilestones();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      milestone_name: milestone.milestone_name,
      description: milestone.description || "",
      due_date: milestone.due_date,
      payment_percentage: milestone.payment_percentage?.toString() || "",
      status: milestone.status,
      notes: milestone.notes || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingMilestone(null);
    setFormData({
      milestone_name: "",
      description: "",
      due_date: "",
      payment_percentage: "",
      status: "pending",
      notes: "",
    });
  };

  const selectedContractData = contracts.find(c => c.id === selectedContract);
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const totalPercentage = milestones.reduce((sum, m) => sum + (m.payment_percentage || 0), 0);
  const completedPercentage = milestones
    .filter(m => m.status === "completed")
    .reduce((sum, m) => sum + (m.payment_percentage || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 max-w-md">
              <Label>{isArabic ? "اختر العقد" : "Select Contract"}</Label>
              <Select value={selectedContract} onValueChange={setSelectedContract}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر عقد" : "Select a contract"} />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.contract_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "إضافة معلم" : "Add Milestone"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingMilestone
                      ? (isArabic ? "تعديل المعلم" : "Edit Milestone")
                      : (isArabic ? "إضافة معلم جديد" : "Add New Milestone")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isArabic ? "اسم المعلم *" : "Milestone Name *"}</Label>
                    <Input
                      value={formData.milestone_name}
                      onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
                      placeholder={isArabic ? "مثال: تسليم التصميم" : "e.g., Design Delivery"}
                    />
                  </div>
                  <div>
                    <Label>{isArabic ? "الوصف" : "Description"}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "تاريخ الاستحقاق *" : "Due Date *"}</Label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "نسبة الدفع %" : "Payment %"}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.payment_percentage}
                        onChange={(e) => setFormData({ ...formData, payment_percentage: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{isArabic ? "الحالة" : "Status"}</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {isArabic ? config.labelAr : config.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingMilestone
                      ? (isArabic ? "تحديث" : "Update")
                      : (isArabic ? "إضافة" : "Add")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {selectedContract && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{milestones.length}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "إجمالي المعالم" : "Total Milestones"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{completedMilestones}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "مكتملة" : "Completed"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalPercentage.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "إجمالي النسب" : "Total Percentage"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{completedPercentage.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "نسبة الإنجاز" : "Progress"}
                </p>
              </div>
            </div>
            <Progress value={(completedMilestones / (milestones.length || 1)) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Milestones List */}
      <div className="space-y-3">
        {milestones.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {isArabic ? "لا توجد معالم لهذا العقد" : "No milestones for this contract"}
            </CardContent>
          </Card>
        ) : (
          milestones.map((milestone, index) => {
            const config = statusConfig[milestone.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = config.icon;
            const daysUntilDue = differenceInDays(new Date(milestone.due_date), new Date());
            const isOverdue = daysUntilDue < 0 && milestone.status !== "completed";

            return (
              <Card key={milestone.id} className={`transition-all ${isOverdue ? "border-red-500/50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${config.color}/20`}>
                        <StatusIcon className={`w-5 h-5 ${config.color.replace("bg-", "text-")}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{index + 1}. {milestone.milestone_name}</span>
                          <Badge variant="outline" className={`${config.color} text-white text-xs`}>
                            {isArabic ? config.labelAr : config.labelEn}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              {isArabic ? "متأخر" : "Overdue"}
                            </Badge>
                          )}
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(milestone.due_date), "dd MMM yyyy", {
                              locale: isArabic ? ar : enUS,
                            })}
                          </span>
                          {milestone.payment_percentage && (
                            <span className="text-blue-600 font-medium">
                              {milestone.payment_percentage}%
                              {milestone.payment_amount && ` (${formatCurrency(milestone.payment_amount)})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(milestone)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(milestone.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
