import { useState, useEffect, useMemo, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, Plus, Building2, DollarSign, TrendingUp, X,
  Calendar, Trash2, Eye, Percent, Calculator, Edit, Download,
  AlertCircle, FileCheck, Link2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPDFLetterheadHeader, addPDFLetterheadFooterWithQR } from "@/lib/letterhead-utils";

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

interface ContractOption {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_value: number | null;
  retention_percentage: number | null;
  advance_payment_percentage: number | null;
}

interface PreviousCertsSummary {
  count: number;
  totalWorkDone: number;
  totalNetPaid: number;
  lastCert: {
    number: number;
    date: string | null;
    status: string;
  } | null;
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
  const createDialogCloseRef = useRef<HTMLButtonElement>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [viewItems, setViewItems] = useState<CertificateItem[]>([]);

  // Form state
  const [formProjectId, setFormProjectId] = useState("");
  const [formContractor, setFormContractor] = useState("");
  const [formContractId, setFormContractId] = useState("");
  const [formPeriodFrom, setFormPeriodFrom] = useState("");
  const [formPeriodTo, setFormPeriodTo] = useState("");
  const [formRetention, setFormRetention] = useState(10);
  const [formAdvanceDeduction, setFormAdvanceDeduction] = useState(0);
  const [formOtherDeductions, setFormOtherDeductions] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<CertificateItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // New states for contracts and previous certs
  const [availableContracts, setAvailableContracts] = useState<ContractOption[]>([]);
  const [previousCertsSummary, setPreviousCertsSummary] = useState<PreviousCertsSummary | null>(null);
  const [advancePercentage, setAdvancePercentage] = useState(0);
  const [selectedContractValue, setSelectedContractValue] = useState<number | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // Auto-calculate advance deduction when currentWorkDone or advancePercentage changes
  useEffect(() => {
    if (advancePercentage > 0) {
      setFormAdvanceDeduction(Math.round(currentWorkDone * advancePercentage / 100 * 100) / 100);
    }
  }, [formItems, advancePercentage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certRes, projRes, subRes] = await Promise.all([
        supabase.from("progress_certificates").select("*").order("created_at", { ascending: false }),
        supabase.from("project_data").select("id, name").order("created_at", { ascending: false }),
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

  const loadContractsForSelection = async (projectId: string, contractorName: string) => {
    if (!projectId || !contractorName) {
      setAvailableContracts([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, contract_title, contract_value, retention_percentage, advance_payment_percentage")
        .eq("project_id", projectId)
        .eq("contractor_name", contractorName)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAvailableContracts(data as ContractOption[]);
        // Auto-select if only one contract
        if (data.length === 1) {
          handleContractSelect(data[0] as ContractOption);
        }
      } else {
        setAvailableContracts([]);
      }
    } catch (err) {
      console.error("Error loading contracts:", err);
    }
  };

  const loadPreviousCertsSummary = async (projectId: string, contractorName: string) => {
    if (!projectId || !contractorName) {
      setPreviousCertsSummary(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("progress_certificates")
        .select("certificate_number, status, current_work_done, net_amount, period_to, created_at")
        .eq("project_id", projectId)
        .eq("contractor_name", contractorName)
        .in("status", ["approved", "paid"])
        .order("certificate_number", { ascending: false });

      if (!error && data && data.length > 0) {
        const totalWork = data.reduce((s, c) => s + (c.current_work_done || 0), 0);
        const totalNet = data.reduce((s, c) => s + (c.net_amount || 0), 0);
        setPreviousCertsSummary({
          count: data.length,
          totalWorkDone: totalWork,
          totalNetPaid: totalNet,
          lastCert: {
            number: data[0].certificate_number,
            date: data[0].period_to,
            status: data[0].status
          }
        });
      } else {
        setPreviousCertsSummary(null);
      }
    } catch (err) {
      console.error("Error loading previous certs:", err);
    }
  };

  const handleContractSelect = (contract: ContractOption) => {
    setFormContractId(contract.id);
    setFormRetention(contract.retention_percentage ?? 10);
    setAdvancePercentage(contract.advance_payment_percentage ?? 0);
    setSelectedContractValue(contract.contract_value);
  };

  const handleContractChange = (contractId: string) => {
    const contract = availableContracts.find(c => c.id === contractId);
    if (contract) {
      handleContractSelect(contract);
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
    setFormContractId("");
    setAvailableContracts([]);
    setSelectedContractValue(null);
    setAdvancePercentage(0);
    if (projectId && formContractor) {
      loadProjectItems(projectId);
      loadContractsForSelection(projectId, formContractor);
      loadPreviousCertsSummary(projectId, formContractor);
    }
  };

  const handleContractorChange = (name: string) => {
    setFormContractor(name);
    setFormContractId("");
    setAvailableContracts([]);
    setSelectedContractValue(null);
    setAdvancePercentage(0);
    if (formProjectId && name) {
      loadProjectItems(formProjectId);
      loadContractsForSelection(formProjectId, name);
      loadPreviousCertsSummary(formProjectId, name);
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
          contract_id: formContractId || null,
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
      createDialogCloseRef.current?.click();
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
    setFormContractId("");
    setFormPeriodFrom("");
    setFormPeriodTo("");
    setFormRetention(10);
    setFormAdvanceDeduction(0);
    setFormOtherDeductions(0);
    setFormNotes("");
    setFormItems([]);
    setAvailableContracts([]);
    setPreviousCertsSummary(null);
    setAdvancePercentage(0);
    setSelectedContractValue(null);
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

  const handleExportPDF = async (cert: Certificate, items: CertificateItem[]) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;

      let y = addPDFLetterheadHeader(doc);
      y += 4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      const title = isArabic
        ? `مستخلص رقم: ${cert.certificate_number}`
        : `Progress Certificate #${cert.certificate_number}`;
      doc.text(title, pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      const statusLabels: Record<string, string> = {
        draft: isArabic ? 'مسودة' : 'Draft',
        submitted: isArabic ? 'مقدم' : 'Submitted',
        approved: isArabic ? 'معتمد' : 'Approved',
        paid: isArabic ? 'مدفوع' : 'Paid',
      };

      const infoLines = [
        [isArabic ? 'المقاول' : 'Contractor', cert.contractor_name],
        [isArabic ? 'الفترة' : 'Period', `${cert.period_from || '-'} → ${cert.period_to || '-'}`],
        [isArabic ? 'الحالة' : 'Status', statusLabels[cert.status] || cert.status],
      ];

      infoLines.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 55, y);
        y += 6;
      });
      y += 4;

      const fmtNum = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

      const tableHeaders = isArabic
        ? ['المبلغ', 'إجمالي', 'حالي', 'سابق', 'السعر', 'الكمية', 'الوحدة', 'الوصف', 'رقم']
        : ['#', 'Description', 'Unit', 'Qty', 'Price', 'Prev', 'Current', 'Total', 'Amount'];

      const tableBody = items.map(item => {
        const row = [
          item.item_number,
          item.description?.substring(0, 40) || '',
          item.unit || '',
          fmtNum(item.contract_quantity || 0),
          fmtNum(item.unit_price || 0),
          fmtNum(item.previous_quantity || 0),
          fmtNum(item.current_quantity || 0),
          fmtNum(item.total_quantity || 0),
          fmtNum(item.current_amount || 0),
        ];
        return isArabic ? row.reverse() : row;
      });

      autoTable(doc, {
        startY: y,
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, halign: isArabic ? 'right' : 'left' },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: isArabic
          ? { 0: { halign: 'right' } }
          : { 8: { halign: 'right' } },
        margin: { left: 10, right: 10 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(isArabic ? 'الملخص المالي' : 'Financial Summary', 15, y);
      y += 8;

      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.3);
      doc.line(15, y - 2, pageWidth - 15, y - 2);

      const summaryLines: [string, string, boolean?][] = [
        [isArabic ? 'الأعمال الحالية' : 'Current Work Done', fmtNum(cert.current_work_done)],
        [isArabic ? 'الأعمال السابقة' : 'Previous Work Done', fmtNum(cert.previous_work_done)],
        [isArabic ? 'إجمالي الأعمال' : 'Total Work Done', fmtNum(cert.total_work_done)],
      ];

      doc.setFontSize(10);
      summaryLines.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'bold');
        doc.text(`${value} SAR`, pageWidth - 20, y, { align: 'right' });
        y += 6;
      });

      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);
      y += 6;

      doc.setTextColor(220, 38, 38);
      const deductions: [string, number][] = [
        [isArabic ? `الاحتجاز (${cert.retention_percentage || 10}%)` : `Retention (${cert.retention_percentage || 10}%)`, cert.retention_amount],
        [isArabic ? 'خصم دفعة مقدمة' : 'Advance Deduction', cert.advance_deduction],
        [isArabic ? 'خصومات أخرى' : 'Other Deductions', cert.other_deductions],
      ];

      deductions.forEach(([label, value]) => {
        if (value > 0) {
          doc.setFont('helvetica', 'normal');
          doc.text(label, 20, y);
          doc.setFont('helvetica', 'bold');
          doc.text(`-${fmtNum(value)} SAR`, pageWidth - 20, y, { align: 'right' });
          y += 6;
        }
      });

      y += 2;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
      y += 8;

      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
      doc.text(isArabic ? 'صافي المستحق' : 'Net Amount Due', 20, y);
      doc.text(`${fmtNum(cert.net_amount)} SAR`, pageWidth - 20, y, { align: 'right' });

      await addPDFLetterheadFooterWithQR(doc, 1, 1);

      doc.save(`certificate-${cert.certificate_number}.pdf`);
      toast.success(isArabic ? 'تم تصدير PDF بنجاح' : 'PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(isArabic ? 'خطأ في التصدير' : 'Export error');
    }
  };

  const handleExportCertificatePDF = async (cert: Certificate) => {
    const { data } = await supabase
      .from("progress_certificate_items")
      .select("*")
      .eq("certificate_id", cert.id)
      .order("item_number");
    await handleExportPDF(cert, (data || []) as CertificateItem[]);
  };

  const filtered = certificates.filter(c => {
    if (filterProjectId && c.project_id !== filterProjectId) return false;
    if (filterContractor && c.contractor_name !== filterContractor) return false;
    return true;
  });

  const formatCurrency = (v: number) => {
    if (v == null) return '0.00';
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

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
          <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } else { setShowCreateDialog(true); } }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                {isArabic ? "مستخلص جديد" : "New Certificate"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  {isArabic ? "إنشاء مستخلص جديد" : "Create New Certificate"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Create a new progress certificate
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Section 1: Project, Contractor, Contract */}
                <Card className="border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {isArabic ? "المشروع والمقاول والعقد" : "Project, Contractor & Contract"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
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

                    {/* Contract Selection */}
                    {availableContracts.length > 0 && (
                      <div>
                        <Label className="flex items-center gap-1">
                          <Link2 className="h-3.5 w-3.5" />
                          {isArabic ? "العقد المرتبط" : "Linked Contract"}
                        </Label>
                        <Select value={formContractId} onValueChange={handleContractChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={isArabic ? "اختر العقد" : "Select contract"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableContracts.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.contract_number} - {c.contract_title}
                                {c.contract_value ? ` (${formatCurrency(c.contract_value)})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedContractValue && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {isArabic ? "قيمة العقد:" : "Contract Value:"} <span className="font-semibold text-primary">{formatCurrency(selectedContractValue)}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {formProjectId && formContractor && availableContracts.length === 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {isArabic ? "لا توجد عقود مسجلة لهذا المقاول في هذا المشروع" : "No contracts found for this contractor in this project"}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 2: Previous Certificates Summary */}
                {previousCertsSummary && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        {isArabic ? "ملخص المستخلصات السابقة" : "Previous Certificates Summary"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-background rounded border">
                          <p className="text-xs text-muted-foreground">{isArabic ? "عدد المستخلصات" : "Certificates"}</p>
                          <p className="text-lg font-bold">{previousCertsSummary.count}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي الأعمال" : "Total Work"}</p>
                          <p className="text-sm font-bold">{formatCurrency(previousCertsSummary.totalWorkDone)}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي المدفوع" : "Total Paid"}</p>
                          <p className="text-sm font-bold text-green-600">{formatCurrency(previousCertsSummary.totalNetPaid)}</p>
                        </div>
                        {previousCertsSummary.lastCert && (
                          <div className="text-center p-2 bg-background rounded border">
                            <p className="text-xs text-muted-foreground">{isArabic ? "آخر مستخلص" : "Last Cert"}</p>
                            <p className="text-sm font-bold">#{previousCertsSummary.lastCert.number}</p>
                            <p className="text-xs text-muted-foreground">{previousCertsSummary.lastCert.date || '-'}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Section 3: Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {isArabic ? "من تاريخ" : "Period From"}
                    </Label>
                    <Input type="date" value={formPeriodFrom} onChange={e => setFormPeriodFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {isArabic ? "إلى تاريخ" : "Period To"}
                    </Label>
                    <Input type="date" value={formPeriodTo} onChange={e => setFormPeriodTo(e.target.value)} />
                  </div>
                </div>

                {/* Section 4: Items Table */}
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

                {/* Section 5: Deductions */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      {isArabic ? "نسبة الاحتجاز %" : "Retention %"}
                      {formContractId && <span className="text-xs text-muted-foreground">({isArabic ? "من العقد" : "from contract"})</span>}
                    </Label>
                    <Input type="number" value={formRetention} onChange={e => setFormRetention(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      {isArabic ? "خصم دفعة مقدمة" : "Advance Deduction"}
                      {advancePercentage > 0 && <span className="text-xs text-muted-foreground">({advancePercentage}%)</span>}
                    </Label>
                    <Input type="number" value={formAdvanceDeduction} onChange={e => { setFormAdvanceDeduction(parseFloat(e.target.value) || 0); setAdvancePercentage(0); }} />
                    {advancePercentage > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isArabic ? "محسوب تلقائياً من العقد" : "Auto-calculated from contract"} ({advancePercentage}%)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>{isArabic ? "خصومات أخرى" : "Other Deductions"}</Label>
                    <Input type="number" value={formOtherDeductions} onChange={e => setFormOtherDeductions(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Section 6: Summary */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between"><span>{isArabic ? "الأعمال الحالية" : "Current Work Done"}</span><span className="font-bold">{formatCurrency(currentWorkDone)}</span></div>
                    <div className="flex justify-between"><span>{isArabic ? "الأعمال السابقة" : "Previous Work Done"}</span><span>{formatCurrency(previousWorkDone)}</span></div>
                    <div className="flex justify-between"><span>{isArabic ? "إجمالي الأعمال" : "Total Work Done"}</span><span>{formatCurrency(totalWorkDone)}</span></div>
                    <Separator />
                    <div className="flex justify-between text-destructive"><span>{isArabic ? "الاحتجاز" : "Retention"} ({formRetention}%)</span><span>-{formatCurrency(retentionAmount)}</span></div>
                    {formAdvanceDeduction > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "خصم دفعة مقدمة" : "Advance"}{advancePercentage > 0 ? ` (${advancePercentage}%)` : ''}</span><span>-{formatCurrency(formAdvanceDeduction)}</span></div>}
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
                <DialogClose asChild>
                  <Button variant="outline" ref={createDialogCloseRef}>{isArabic ? "إلغاء" : "Cancel"}</Button>
                </DialogClose>
                <Button onClick={handleCreateCertificate} disabled={!formProjectId || !formContractor}>
                  {isArabic ? "حفظ المستخلص" : "Save Certificate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {/* View Dialog */}
        {showViewDialog && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setShowViewDialog(false); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogDescription className="sr-only">View certificate details</DialogDescription>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {isArabic ? `مستخلص رقم ${viewingCertificate?.certificate_number}` : `Certificate #${viewingCertificate?.certificate_number}`}
                </DialogTitle>
                {viewingCertificate && (
                  <Button variant="outline" size="sm" onClick={() => handleExportCertificatePDF(viewingCertificate)}>
                    <Download className="h-4 w-4 mr-1" />
                    {isArabic ? "تصدير PDF" : "Export PDF"}
                  </Button>
                )}
              </div>
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
        )}
      </div>
    </PageLayout>
  );
};

export default ProgressCertificatesPage;
