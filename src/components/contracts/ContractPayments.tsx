import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, DollarSign, CheckCircle, Clock, AlertTriangle, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_title: string;
  contract_value: number | null;
}

interface Payment {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  payment_number: number;
  description: string | null;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  invoice_number: string | null;
  notes: string | null;
}

const statusConfig = {
  pending: { color: "bg-yellow-500", icon: Clock, labelEn: "Pending", labelAr: "معلق" },
  paid: { color: "bg-green-500", icon: CheckCircle, labelEn: "Paid", labelAr: "مدفوع" },
  overdue: { color: "bg-red-500", icon: AlertTriangle, labelEn: "Overdue", labelAr: "متأخر" },
  cancelled: { color: "bg-gray-500", icon: FileText, labelEn: "Cancelled", labelAr: "ملغي" },
};

export const ContractPayments = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    due_date: "",
    payment_date: "",
    status: "pending",
    invoice_number: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedContract) {
      fetchPayments();
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

  const fetchPayments = async () => {
    try {
      const { data } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", selectedContract)
        .order("payment_number", { ascending: true });
      
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.due_date) {
      toast.error(isArabic ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    try {
      if (editingPayment) {
        await supabase
          .from("contract_payments")
          .update({
            description: formData.description || null,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            payment_date: formData.payment_date || null,
            status: formData.status,
            invoice_number: formData.invoice_number || null,
            notes: formData.notes || null,
          })
          .eq("id", editingPayment.id);

        toast.success(isArabic ? "تم تحديث الدفعة بنجاح" : "Payment updated successfully");
      } else {
        await supabase
          .from("contract_payments")
          .insert({
            contract_id: selectedContract,
            user_id: user?.id,
            payment_number: payments.length + 1,
            description: formData.description || null,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date,
            payment_date: formData.payment_date || null,
            status: formData.status,
            invoice_number: formData.invoice_number || null,
            notes: formData.notes || null,
          });

        toast.success(isArabic ? "تم إضافة الدفعة بنجاح" : "Payment added successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error(isArabic ? "حدث خطأ" : "An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) return;

    try {
      await supabase.from("contract_payments").delete().eq("id", id);
      toast.success(isArabic ? "تم الحذف بنجاح" : "Deleted successfully");
      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      description: payment.description || "",
      amount: payment.amount.toString(),
      due_date: payment.due_date,
      payment_date: payment.payment_date || "",
      status: payment.status,
      invoice_number: payment.invoice_number || "",
      notes: payment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const markAsPaid = async (payment: Payment) => {
    try {
      await supabase
        .from("contract_payments")
        .update({
          status: "paid",
          payment_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", payment.id);

      toast.success(isArabic ? "تم تحديث حالة الدفعة" : "Payment status updated");
      fetchPayments();
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const resetForm = () => {
    setEditingPayment(null);
    setFormData({
      description: "",
      amount: "",
      due_date: "",
      payment_date: "",
      status: "pending",
      invoice_number: "",
      notes: "",
    });
  };

  const selectedContractData = contracts.find(c => c.id === selectedContract);
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments.filter(p => p.status === "overdue" || 
    (p.status === "pending" && differenceInDays(new Date(p.due_date), new Date()) < 0)
  ).reduce((sum, p) => sum + p.amount, 0);

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
                  {isArabic ? "إضافة دفعة" : "Add Payment"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment
                      ? (isArabic ? "تعديل الدفعة" : "Edit Payment")
                      : (isArabic ? "إضافة دفعة جديدة" : "Add New Payment")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isArabic ? "الوصف" : "Description"}</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={isArabic ? "مثال: دفعة الأساسات" : "e.g., Foundation Payment"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "المبلغ *" : "Amount *"}</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "رقم الفاتورة" : "Invoice #"}</Label>
                      <Input
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      />
                    </div>
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
                      <Label>{isArabic ? "تاريخ الدفع" : "Payment Date"}</Label>
                      <Input
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
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
                  <Button onClick={handleSubmit} className="w-full">
                    {editingPayment
                      ? (isArabic ? "تحديث" : "Update")
                      : (isArabic ? "إضافة" : "Add")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedContract && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto text-blue-600 mb-2" />
              <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "إجمالي الدفعات" : "Total Payments"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-xl font-bold">{formatCurrency(paidAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "المدفوع" : "Paid"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-yellow-600 mb-2" />
              <p className="text-xl font-bold">{formatCurrency(pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "معلق" : "Pending"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-red-600 mb-2" />
              <p className="text-xl font-bold">{formatCurrency(overdueAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? "متأخر" : "Overdue"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Progress */}
      {selectedContract && totalAmount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{isArabic ? "نسبة المدفوع" : "Payment Progress"}</span>
              <span className="font-medium">{((paidAmount / totalAmount) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(paidAmount / totalAmount) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isArabic ? "جدول الدفعات" : "Payments Schedule"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic ? "لا توجد دفعات لهذا العقد" : "No payments for this contract"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                    <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{isArabic ? "تاريخ الاستحقاق" : "Due Date"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const config = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
                    const isOverdue = payment.status === "pending" && 
                      differenceInDays(new Date(payment.due_date), new Date()) < 0;

                    return (
                      <TableRow key={payment.id} className={isOverdue ? "bg-red-500/5" : ""}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>
                          <div>
                            <p>{payment.description || "-"}</p>
                            {payment.invoice_number && (
                              <p className="text-xs text-muted-foreground">
                                {isArabic ? "فاتورة:" : "Invoice:"} {payment.invoice_number}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          {format(new Date(payment.due_date), "dd MMM yyyy", {
                            locale: isArabic ? ar : enUS,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} text-white`}>
                            {isArabic ? config.labelAr : config.labelEn}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="ml-1">
                              {isArabic ? "متأخر" : "Overdue"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {payment.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsPaid(payment)}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(payment)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
