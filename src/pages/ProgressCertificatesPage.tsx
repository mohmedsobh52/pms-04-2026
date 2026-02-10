import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, Plus, Building2, DollarSign, TrendingUp, 
  Calendar, Trash2, Eye, Percent, Calculator, Edit
} from "lucide-react";

interface Certificate {
  id: string;
  project_id: string | null;
  contract_id: string | null;
  contractor_name: string;
  certificate_number: number;
  period_from: string | null;
  period_to: string | null;
  total_work_done: number;
  previous_work_done: number;
  current_work_done: number;
  retention_percentage: number;
  retention_amount: number;
  advance_deduction: number;
  other_deductions: number;
  net_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface CertificateItem {
  id?: string;
  certificate_id?: string;
  project_item_id: string | null;
  item_number: string;
  description: string;
  unit: string;
  contract_quantity: number;
  unit_price: number;
  previous_quantity: number;
  current_quantity: number;
  total_quantity: number;
  current_amount: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

const ProgressCertificatesPage = () => {
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterContractor, setFilterContractor] = useState("");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [viewItems, setViewItems] = useState<CertificateItem[]>([]);

  // Form state
  const [formProjectId, setFormProjectId] = useState("");
  const [formContractor, setFormContractor] = useState("");
  const [formPeriodFrom, setFormPeriodFrom] = useState("");
  const [formPeriodTo, setFormPeriodTo] = useState("");
  const [formRetention, setFormRetention] = useState(10);
  const [formAdvanceDeduction, setFormAdvanceDeduction] = useState(0);
  const [formOtherDeductions, setFormOtherDeductions] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<CertificateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certRes, projRes, subRes] = await Promise.all([
        supabase.from("progress_certificates").select("*").order("created_at", { ascending: false }),
        supabase.from("saved_projects").select("id, name").order("created_at", { ascending: false }),
        supabase.from("subcontractors").select("id, name, specialty").order("name")
      ]);

      if (certRes.data) setCertificates(certRes.data as Certificate[]);
      if (projRes.data) setProjects(projRes.data);
      if (subRes.data) setContractors(subRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectItems = async (projectId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("project_items")
        .select("id, item_number, description, unit, quantity, unit_price, total_price, is_section")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const items = (data || [])
        .filter(i => !i.is_section)
        .map(i => ({
          project_item_id: i.id,
          item_number: i.item_number || "",
          description: i.description || "",
          unit: i.unit || "",
          contract_quantity: i.quantity || 0,
          unit_price: i.unit_price || 0,
          previous_quantity: 0,
          current_quantity: 0,
          total_quantity: 0,
          current_amount: 0
        }));

      // Load previous quantities from approved certificates
      const { data: prevCerts } = await supabase
        .from("progress_certificates")
        .select("id")
        .eq("project_id", projectId)
        .eq("contractor_name", formContractor)
        .in("status", ["approved", "paid"]);

      if (prevCerts && prevCerts.length > 0) {
        const certIds = prevCerts.map(c => c.id);
        const { data: prevItems } = await supabase
          .from("progress_certificate_items")
          .select("project_item_id, current_quantity")
          .in("certificate_id", certIds);

        if (prevItems) {
          const prevMap = new Map<string, number>();
          prevItems.forEach(pi => {
            const key = pi.project_item_id || "";
            prevMap.set(key, (prevMap.get(key) || 0) + (pi.current_quantity || 0));
          });
          items.forEach(item => {
            item.previous_quantity = prevMap.get(item.project_item_id || "") || 0;
            item.total_quantity = item.previous_quantity;
          });
        }
      }

      setFormItems(items);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setFormProjectId(projectId);
    if (projectId && formContractor) {
      loadProjectItems(projectId);
    }
  };

  const handleContractorChange = (name: string) => {
    setFormContractor(name);
    if (formProjectId && name) {
      loadProjectItems(formProjectId);
    }
  };

  const updateItemQuantity = (index: number, qty: number) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const total = item.previous_quantity + qty;
      return {
        ...item,
        current_quantity: qty,
        total_quantity: total,
        current_amount: qty * item.unit_price
      };
    }));
  };

  const currentWorkDone = useMemo(() => formItems.reduce((s, i) => s + i.current_amount, 0), [formItems]);
  const previousWorkDone = useMemo(() => formItems.reduce((s, i) => s + (i.previous_quantity * i.unit_price), 0), [formItems]);
  const totalWorkDone = currentWorkDone + previousWorkDone;
  const retentionAmount = (currentWorkDone * formRetention) / 100;
  const netAmount = currentWorkDone - retentionAmount - formAdvanceDeduction - formOtherDeductions;

  const handleCreateCertificate = async () => {
    if (!user || !formProjectId || !formContractor) {
      toast.error(isArabic ? "يرجى اختيار المشروع والمقاول" : "Select project and contractor");
      return;
    }

    try {
      // Get next certificate number
      const { data: existing } = await supabase
        .from("progress_certificates")
        .select("certificate_number")
        .eq("project_id", formProjectId)
        .eq("contractor_name", formContractor)
        .order("certificate_number", { ascending: false })
        .limit(1);

      const nextNumber = (existing?.[0]?.certificate_number || 0) + 1;

      const { data: cert, error: certError } = await supabase
        .from("progress_certificates")
        .insert({
          user_id: user.id,
          project_id: formProjectId,
          contractor_name: formContractor,
          certificate_number: nextNumber,
          period_from: formPeriodFrom || null,
          period_to: formPeriodTo || null,
          total_work_done: totalWorkDone,
          previous_work_done: previousWorkDone,
          current_work_done: currentWorkDone,
          retention_percentage: formRetention,
          retention_amount: retentionAmount,
          advance_deduction: formAdvanceDeduction,
          other_deductions: formOtherDeductions,
          net_amount: netAmount,
          status: "draft",
          notes: formNotes || null
        })
        .select()
        .single();

      if (certError) throw certError;

      // Save items
      const itemsToInsert = formItems
        .filter(i => i.current_quantity > 0)
        .map(i => ({
          certificate_id: cert.id,
          project_item_id: i.project_item_id,
          item_number: i.item_number,
          description: i.description,
          unit: i.unit,
          contract_quantity: i.contract_quantity,
          unit_price: i.unit_price,
          previous_quantity: i.previous_quantity,
          current_quantity: i.current_quantity,
          total_quantity: i.total_quantity,
          current_amount: i.current_amount
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("progress_certificate_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      toast.success(isArabic ? `تم إنشاء المستخلص رقم ${nextNumber}` : `Certificate #${nextNumber} created`);
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error(isArabic ? "حدث خطأ" : "Error occurred");
    }
  };

  const resetForm = () => {
    setFormProjectId("");
    setFormContractor("");
    setFormPeriodFrom("");
    setFormPeriodTo("");
    setFormRetention(10);
    setFormAdvanceDeduction(0);
    setFormOtherDeductions(0);
    setFormNotes("");
    setFormItems([]);
  };

  const handleViewCertificate = async (cert: Certificate) => {
    setViewingCertificate(cert);
    const { data } = await supabase
      .from("progress_certificate_items")
      .select("*")
      .eq("certificate_id", cert.id)
      .order("item_number");
    setViewItems((data || []) as CertificateItem[]);
    setShowViewDialog(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("progress_certificates").update({ status }).eq("id", id);
    if (!error) {
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(isArabic ? "تم تحديث الحالة" : "Status updated");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("progress_certificates").delete().eq("id", id);
    if (!error) {
      setCertificates(prev => prev.filter(c => c.id !== id));
      toast.success(isArabic ? "تم الحذف" : "Deleted");
    }
  };

  const filtered = certificates.filter(c => {
    if (filterProjectId && c.project_id !== filterProjectId) return false;
    if (filterContractor && c.contractor_name !== filterContractor) return false;
    return true;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      draft: { label: isArabic ? "مسودة" : "Draft", variant: "secondary" },
      submitted: { label: isArabic ? "مقدم" : "Submitted", variant: "outline" },
      approved: { label: isArabic ? "معتمد" : "Approved", variant: "default" },
      paid: { label: isArabic ? "مدفوع" : "Paid", variant: "default" }
    };
    const cfg = map[status] || map.draft;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const totalNet = filtered.reduce((s, c) => s + (c.net_amount || 0), 0);
  const totalCurrent = filtered.reduce((s, c) => s + (c.current_work_done || 0), 0);
  const approvedCount = filtered.filter(c => c.status === 'approved' || c.status === 'paid').length;

  return (
    <PageLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {isArabic ? "المستخلصات" : "Progress Certificates"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isArabic ? "إدارة مستخلصات المقاولين ومقاولي الباطن" : "Manage contractor & subcontractor invoices"}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {isArabic ? "مستخلص جديد" : "New Certificate"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-sm text-muted-foreground">{isArabic ? "إجمالي المستخلصات" : "Total Certificates"}</p><p className="text-2xl font-bold">{filtered.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-sm text-muted-foreground">{isArabic ? "الأعمال الحالية" : "Current Work"}</p><p className="text-2xl font-bold">{formatCurrency(totalCurrent)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-sm text-muted-foreground">{isArabic ? "صافي المستحق" : "Net Amount"}</p><p className="text-2xl font-bold">{formatCurrency(totalNet)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-sm text-muted-foreground">{isArabic ? "معتمد / مدفوع" : "Approved/Paid"}</p><p className="text-2xl font-bold">{approvedCount}</p></div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder={isArabic ? "كل المشاريع" : "All Projects"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المشاريع" : "All Projects"}</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContractor} onValueChange={setFilterContractor}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder={isArabic ? "كل المقاولين" : "All Contractors"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المقاولين" : "All Contractors"}</SelectItem>
              {contractors.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Certificates Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "رقم" : "#"}</TableHead>
                  <TableHead>{isArabic ? "المقاول" : "Contractor"}</TableHead>
                  <TableHead>{isArabic ? "الفترة" : "Period"}</TableHead>
                  <TableHead>{isArabic ? "الأعمال الحالية" : "Current Work"}</TableHead>
                  <TableHead>{isArabic ? "الخصومات" : "Deductions"}</TableHead>
                  <TableHead>{isArabic ? "صافي المستحق" : "Net Amount"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد مستخلصات" : "No certificates found"}
                  </TableCell></TableRow>
                ) : filtered.map(cert => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">{cert.certificate_number}</TableCell>
                    <TableCell>{cert.contractor_name}</TableCell>
                    <TableCell className="text-sm">
                      {cert.period_from && cert.period_to ? `${cert.period_from} → ${cert.period_to}` : "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(cert.current_work_done)}</TableCell>
                    <TableCell>{formatCurrency(cert.retention_amount + cert.advance_deduction + cert.other_deductions)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(cert.net_amount)}</TableCell>
                    <TableCell>{getStatusBadge(cert.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewCertificate(cert)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {cert.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleUpdateStatus(cert.id, 'submitted')}>
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(cert.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {cert.status === 'submitted' && (
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(cert.id, 'approved')}>
                            {isArabic ? "اعتماد" : "Approve"}
                          </Button>
                        )}
                        {cert.status === 'approved' && (
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(cert.id, 'paid')}>
                            {isArabic ? "تم الدفع" : "Mark Paid"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isArabic ? "إنشاء مستخلص جديد" : "Create New Certificate"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isArabic ? "المشروع" : "Project"}</Label>
                  <Select value={formProjectId} onValueChange={handleProjectChange}>
                    <SelectTrigger><SelectValue placeholder={isArabic ? "اختر المشروع" : "Select project"} /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{isArabic ? "المقاول" : "Contractor"}</Label>
                  <Select value={formContractor} onValueChange={handleContractorChange}>
                    <SelectTrigger><SelectValue placeholder={isArabic ? "اختر المقاول" : "Select contractor"} /></SelectTrigger>
                    <SelectContent>
                      {contractors.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isArabic ? "من تاريخ" : "Period From"}</Label>
                  <Input type="date" value={formPeriodFrom} onChange={e => setFormPeriodFrom(e.target.value)} />
                </div>
                <div>
                  <Label>{isArabic ? "إلى تاريخ" : "Period To"}</Label>
                  <Input type="date" value={formPeriodTo} onChange={e => setFormPeriodTo(e.target.value)} />
                </div>
              </div>

              {/* Items Table */}
              {formItems.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">{isArabic ? "بنود المشروع" : "Project Items"}</Label>
                  <ScrollArea className="h-[300px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">{isArabic ? "رقم" : "#"}</TableHead>
                          <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                          <TableHead className="w-[60px]">{isArabic ? "وحدة" : "Unit"}</TableHead>
                          <TableHead className="w-[80px]">{isArabic ? "الكمية" : "Qty"}</TableHead>
                          <TableHead className="w-[90px]">{isArabic ? "سعر" : "Price"}</TableHead>
                          <TableHead className="w-[80px]">{isArabic ? "سابق" : "Prev"}</TableHead>
                          <TableHead className="w-[100px]">{isArabic ? "حالي" : "Current"}</TableHead>
                          <TableHead className="w-[80px]">{isArabic ? "إجمالي" : "Total"}</TableHead>
                          <TableHead className="w-[100px]">{isArabic ? "المبلغ" : "Amount"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{item.item_number}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{item.description}</TableCell>
                            <TableCell className="text-xs">{item.unit}</TableCell>
                            <TableCell className="text-xs">{item.contract_quantity}</TableCell>
                            <TableCell className="text-xs">{item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">{item.previous_quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-7 text-xs w-[80px]"
                                value={item.current_quantity || ""}
                                onChange={e => updateItemQuantity(idx, parseFloat(e.target.value) || 0)}
                                max={item.contract_quantity - item.previous_quantity}
                              />
                            </TableCell>
                            <TableCell className="text-xs font-medium">{item.total_quantity}</TableCell>
                            <TableCell className="text-xs font-bold">{formatCurrency(item.current_amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {loadingItems && <p className="text-center text-muted-foreground py-4">{isArabic ? "جاري تحميل البنود..." : "Loading items..."}</p>}

              <Separator />

              {/* Deductions */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{isArabic ? "نسبة الاحتجاز %" : "Retention %"}</Label>
                  <Input type="number" value={formRetention} onChange={e => setFormRetention(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>{isArabic ? "خصم دفعة مقدمة" : "Advance Deduction"}</Label>
                  <Input type="number" value={formAdvanceDeduction} onChange={e => setFormAdvanceDeduction(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>{isArabic ? "خصومات أخرى" : "Other Deductions"}</Label>
                  <Input type="number" value={formOtherDeductions} onChange={e => setFormOtherDeductions(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between"><span>{isArabic ? "الأعمال الحالية" : "Current Work Done"}</span><span className="font-bold">{formatCurrency(currentWorkDone)}</span></div>
                  <div className="flex justify-between"><span>{isArabic ? "الأعمال السابقة" : "Previous Work Done"}</span><span>{formatCurrency(previousWorkDone)}</span></div>
                  <div className="flex justify-between"><span>{isArabic ? "إجمالي الأعمال" : "Total Work Done"}</span><span>{formatCurrency(totalWorkDone)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-destructive"><span>{isArabic ? "الاحتجاز" : "Retention"} ({formRetention}%)</span><span>-{formatCurrency(retentionAmount)}</span></div>
                  {formAdvanceDeduction > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "خصم دفعة مقدمة" : "Advance"}</span><span>-{formatCurrency(formAdvanceDeduction)}</span></div>}
                  {formOtherDeductions > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "خصومات أخرى" : "Other"}</span><span>-{formatCurrency(formOtherDeductions)}</span></div>}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold"><span>{isArabic ? "صافي المستحق" : "Net Amount"}</span><span className="text-primary">{formatCurrency(netAmount)}</span></div>
                </CardContent>
              </Card>

              <div>
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleCreateCertificate} disabled={!formProjectId || !formContractor}>
                {isArabic ? "حفظ المستخلص" : "Save Certificate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isArabic ? `مستخلص رقم ${viewingCertificate?.certificate_number}` : `Certificate #${viewingCertificate?.certificate_number}`}
              </DialogTitle>
            </DialogHeader>
            {viewingCertificate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">{isArabic ? "المقاول:" : "Contractor:"}</span> <strong>{viewingCertificate.contractor_name}</strong></div>
                  <div><span className="text-muted-foreground">{isArabic ? "الحالة:" : "Status:"}</span> {getStatusBadge(viewingCertificate.status)}</div>
                  <div><span className="text-muted-foreground">{isArabic ? "الفترة:" : "Period:"}</span> {viewingCertificate.period_from} → {viewingCertificate.period_to}</div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "رقم" : "#"}</TableHead>
                      <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{isArabic ? "وحدة" : "Unit"}</TableHead>
                      <TableHead>{isArabic ? "سابق" : "Prev"}</TableHead>
                      <TableHead>{isArabic ? "حالي" : "Current"}</TableHead>
                      <TableHead>{isArabic ? "إجمالي" : "Total"}</TableHead>
                      <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{item.item_number}</TableCell>
                        <TableCell className="text-xs">{item.description}</TableCell>
                        <TableCell className="text-xs">{item.unit}</TableCell>
                        <TableCell className="text-xs">{item.previous_quantity}</TableCell>
                        <TableCell className="text-xs font-medium">{item.current_quantity}</TableCell>
                        <TableCell className="text-xs">{item.total_quantity}</TableCell>
                        <TableCell className="text-xs font-bold">{formatCurrency(item.current_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>{isArabic ? "الأعمال الحالية" : "Current Work"}</span><span className="font-bold">{formatCurrency(viewingCertificate.current_work_done)}</span></div>
                    <div className="flex justify-between text-destructive"><span>{isArabic ? "الاحتجاز" : "Retention"}</span><span>-{formatCurrency(viewingCertificate.retention_amount)}</span></div>
                    {viewingCertificate.advance_deduction > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "خصم مقدم" : "Advance"}</span><span>-{formatCurrency(viewingCertificate.advance_deduction)}</span></div>}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold"><span>{isArabic ? "صافي المستحق" : "Net Amount"}</span><span className="text-primary">{formatCurrency(viewingCertificate.net_amount)}</span></div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default ProgressCertificatesPage;
