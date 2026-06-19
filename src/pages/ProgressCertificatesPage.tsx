import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, Plus, Building2, DollarSign, TrendingUp,
  Trash2, Eye, Edit, Download, FileBarChart
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPDFLetterheadHeader, addPDFLetterheadFooterWithQR } from "@/lib/letterhead-utils";
import { ColorLegend } from "@/components/ui/color-code";
import { SCurveChart } from "@/components/certificates/SCurveChart";

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
  vat_percentage?: number | null;
  vat_amount?: number | null;
  delay_penalty?: number | null;
  materials_on_site_amount?: number | null;
  materials_on_site_percentage?: number | null;
  additional_deductions?: any;
  attachments?: any;
  approval_status?: string | null;
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
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterContractor, setFilterContractor] = useState("");

  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [viewItems, setViewItems] = useState<CertificateItem[]>([]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

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

  const handleViewCertificate = async (cert: Certificate) => {
    setViewingCertificate(cert);
    const { data } = await supabase.from("progress_certificate_items").select("*").eq("certificate_id", cert.id).order("item_number");
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

  const handleExportMonthlyReport = async () => {
    try {
      if (filtered.length === 0) {
        toast.info(isArabic ? "لا توجد مستخلصات" : "No certificates available");
        return;
      }
      // Group by YYYY-MM of period_to (fallback to created_at)
      const groups = new Map<string, Certificate[]>();
      filtered.forEach(c => {
        const d = c.period_to || c.created_at;
        const key = d ? d.substring(0, 7) : "unknown";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      });
      const keys = Array.from(groups.keys()).sort();

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      let y = addPDFLetterheadHeader(doc);
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(30, 64, 175);
      doc.text(isArabic ? "تقرير المستخلصات الشهري المجمع" : "Monthly Consolidated Certificates Report", pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      const fmtNum = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
      let grandNet = 0, grandWork = 0, grandCount = 0;

      for (const key of keys) {
        const items = groups.get(key)!;
        const monthLabel = key === "unknown" ? (isArabic ? "غير محدد" : "Unknown") : key;
        const sumNet = items.reduce((s, c) => s + (c.net_amount || 0), 0);
        const sumWork = items.reduce((s, c) => s + (c.current_work_done || 0), 0);
        grandNet += sumNet; grandWork += sumWork; grandCount += items.length;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 64, 175);
        doc.text(`${monthLabel}  —  ${items.length} ${isArabic ? "مستخلص" : "certs"}`, 15, y); y += 4;

        autoTable(doc, {
          startY: y,
          head: [[
            "#",
            isArabic ? "المقاول" : "Contractor",
            isArabic ? "الفترة" : "Period",
            isArabic ? "الحالة" : "Status",
            isArabic ? "أعمال حالية" : "Current",
            isArabic ? "صافي" : "Net",
          ]],
          body: items.map(c => [
            c.certificate_number,
            c.contractor_name || "-",
            `${c.period_from || '-'} → ${c.period_to || '-'}`,
            c.status,
            fmtNum(c.current_work_done),
            fmtNum(c.net_amount),
          ]),
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1.8 },
          headStyles: { fillColor: [30, 64, 175], textColor: 255 },
          foot: [[
            "", "", "", isArabic ? "إجمالي" : "Subtotal",
            fmtNum(sumWork), fmtNum(sumNet)
          ]],
          footStyles: { fillColor: [240, 245, 255], textColor: 30, fontStyle: 'bold' },
          margin: { left: 10, right: 10 },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
        if (y > 250) { doc.addPage(); y = 20; }
      }

      // Grand totals
      y += 4;
      doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.5); doc.line(15, y, pageWidth - 15, y); y += 7;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 64, 175);
      doc.text(isArabic ? "الإجمالي الكلي" : "Grand Total", 20, y);
      doc.text(`${grandCount} ${isArabic ? "مستخلص" : "certs"}  |  ${fmtNum(grandWork)}  |  ${fmtNum(grandNet)} SAR`, pageWidth - 20, y, { align: 'right' });

      await addPDFLetterheadFooterWithQR(doc, 1, 1);
      doc.save(`monthly-certificates-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(isArabic ? "تم تصدير التقرير الشهري" : "Monthly report exported");
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "فشل تصدير التقرير" : "Export failed");
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
      const title = isArabic ? `مستخلص رقم: ${cert.certificate_number}` : `Progress Certificate #${cert.certificate_number}`;
      doc.text(title, pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const statusLabels: Record<string, string> = { draft: isArabic ? 'مسودة' : 'Draft', submitted: isArabic ? 'مقدم' : 'Submitted', approved: isArabic ? 'معتمد' : 'Approved', paid: isArabic ? 'مدفوع' : 'Paid' };
      const infoLines = [[isArabic ? 'المقاول' : 'Contractor', cert.contractor_name], [isArabic ? 'الفترة' : 'Period', `${cert.period_from || '-'} → ${cert.period_to || '-'}`], [isArabic ? 'الحالة' : 'Status', statusLabels[cert.status] || cert.status]];
      infoLines.forEach(([label, value]) => { doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 15, y); doc.setFont('helvetica', 'normal'); doc.text(value, 55, y); y += 6; });
      y += 4;
      const fmtNum = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
      const tableHeaders = isArabic ? ['المبلغ', 'إجمالي', 'حالي', 'سابق', 'السعر', 'الكمية', 'الوحدة', 'الوصف', 'رقم'] : ['#', 'Description', 'Unit', 'Qty', 'Price', 'Prev', 'Current', 'Total', 'Amount'];
      const tableBody = items.map(item => { const row = [item.item_number, item.description?.substring(0, 40) || '', item.unit || '', fmtNum(item.contract_quantity || 0), fmtNum(item.unit_price || 0), fmtNum(item.previous_quantity || 0), fmtNum(item.current_quantity || 0), fmtNum(item.total_quantity || 0), fmtNum(item.current_amount || 0)]; return isArabic ? row.reverse() : row; });
      autoTable(doc, { startY: y, head: [tableHeaders], body: tableBody, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, halign: isArabic ? 'right' : 'left' }, headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center' }, columnStyles: isArabic ? { 0: { halign: 'right' } } : { 8: { halign: 'right' } }, margin: { left: 10, right: 10 } });
      y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 41, 59);
      doc.text(isArabic ? 'الملخص المالي' : 'Financial Summary', 15, y); y += 8;
      doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.3); doc.line(15, y - 2, pageWidth - 15, y - 2);
      const summaryLines: [string, string][] = [[isArabic ? 'الأعمال الحالية' : 'Current Work Done', fmtNum(cert.current_work_done)], [isArabic ? 'الأعمال السابقة' : 'Previous Work Done', fmtNum(cert.previous_work_done)], [isArabic ? 'إجمالي الأعمال' : 'Total Work Done', fmtNum(cert.total_work_done)]];
      doc.setFontSize(10);
      summaryLines.forEach(([label, value]) => { doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85); doc.text(label, 20, y); doc.setFont('helvetica', 'bold'); doc.text(`${value} SAR`, pageWidth - 20, y, { align: 'right' }); y += 6; });
      y += 2; doc.setDrawColor(200, 200, 200); doc.line(15, y, pageWidth - 15, y); y += 6;
      doc.setTextColor(220, 38, 38);
      const deductions: [string, number][] = [[isArabic ? `الاحتجاز (${cert.retention_percentage || 10}%)` : `Retention (${cert.retention_percentage || 10}%)`, cert.retention_amount], [isArabic ? 'خصم دفعة مقدمة' : 'Advance Deduction', cert.advance_deduction], [isArabic ? 'خصومات أخرى' : 'Other Deductions', cert.other_deductions]];
      deductions.forEach(([label, value]) => { if (value > 0) { doc.setFont('helvetica', 'normal'); doc.text(label, 20, y); doc.setFont('helvetica', 'bold'); doc.text(`-${fmtNum(value)} SAR`, pageWidth - 20, y, { align: 'right' }); y += 6; } });
      y += 2; doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.5); doc.line(15, y, pageWidth - 15, y); y += 8;
      doc.setFontSize(13); doc.setTextColor(30, 64, 175); doc.setFont('helvetica', 'bold');
      doc.text(isArabic ? 'صافي المستحق' : 'Net Amount Due', 20, y);
      doc.text(`${fmtNum(cert.net_amount)} SAR`, pageWidth - 20, y, { align: 'right' });
      await addPDFLetterheadFooterWithQR(doc, 1, 1);
      doc.save(`certificate-${cert.certificate_number}.pdf`);
      toast.success(isArabic ? 'تم تصدير PDF بنجاح' : 'PDF exported successfully');
    } catch (error) { console.error('PDF export error:', error); toast.error(isArabic ? 'خطأ في التصدير' : 'Export error'); }
  };

  const handleExportCertificatePDF = async (cert: Certificate) => {
    const { data } = await supabase.from("progress_certificate_items").select("*").eq("certificate_id", cert.id).order("item_number");
    await handleExportPDF(cert, (data || []) as CertificateItem[]);
  };

  const filtered = certificates.filter(c => {
    if (filterProjectId && filterProjectId !== "all" && c.project_id !== filterProjectId) return false;
    if (filterContractor && filterContractor !== "all" && c.contractor_name !== filterContractor) return false;
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
      <PageSuggestions
        pageKey="certificates"
        suggestions={[
          { id: "new", labelAr: "أنشئ مستخلصاً جديداً", labelEn: "Create a new certificate", icon: Plus, tone: "emerald", to: "/progress-certificates/new" },
          { id: "compare", labelAr: "قارن المستخلصات", labelEn: "Compare certificates", icon: GitCompare, tone: "violet", to: "/progress-certificates/compare" },
          { id: "contracts", labelAr: "اربط بالعقود لمتابعة المالية", labelEn: "Link to contracts for financials", icon: FileSignature, tone: "amber", to: "/contracts" },
        ]}
      />
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
          <div className="flex gap-2">
            <Button variant="outline" size="default" onClick={handleExportMonthlyReport}>
              <FileBarChart className="h-4 w-4 mr-1" />
              {isArabic ? "تقرير شهري" : "Monthly Report"}
            </Button>
            <Link
              to="/progress-certificates/compare"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent"
            >
              {isArabic ? "مقارنة" : "Compare"}
            </Link>
            <Link
              to="/progress-certificates/new"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 relative z-[70] pointer-events-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isArabic ? "مستخلص جديد" : "New Certificate"}
            </Link>
          </div>
        </div>

        <ColorLegend type="status" isArabic={isArabic} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{isArabic ? "إجمالي المستخلصات" : "Total Certificates"}</p><p className="text-2xl font-bold">{filtered.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" /><div><p className="text-sm text-muted-foreground">{isArabic ? "إجمالي صافي" : "Total Net"}</p><p className="text-2xl font-bold">{formatCurrency(totalNet)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" /><div><p className="text-sm text-muted-foreground">{isArabic ? "أعمال حالية" : "Current Work"}</p><p className="text-2xl font-bold">{formatCurrency(totalCurrent)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-purple-600" /><div><p className="text-sm text-muted-foreground">{isArabic ? "معتمدة/مدفوعة" : "Approved/Paid"}</p><p className="text-2xl font-bold">{approvedCount}</p></div></div></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={isArabic ? "كل المشاريع" : "All Projects"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المشاريع" : "All Projects"}</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContractor} onValueChange={setFilterContractor}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={isArabic ? "كل المقاولين" : "All Contractors"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل المقاولين" : "All Contractors"}</SelectItem>
              {contractors.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* S-Curve cumulative progress */}
        {filtered.length > 0 && (
          <SCurveChart
            certificates={filtered.map(c => ({
              id: c.id,
              certificate_number: c.certificate_number,
              period_to: c.period_to,
              current_work_done: c.current_work_done,
            }))}
            isArabic={isArabic}
          />
        )}

        {/* Certificates Table */}
        <Card>
          <CardHeader><CardTitle>{isArabic ? "قائمة المستخلصات" : "Certificates List"}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{isArabic ? "لا توجد مستخلصات" : "No certificates found"}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "رقم" : "#"}</TableHead>
                    <TableHead>{isArabic ? "المقاول" : "Contractor"}</TableHead>
                    <TableHead>{isArabic ? "الفترة" : "Period"}</TableHead>
                    <TableHead>{isArabic ? "الأعمال الحالية" : "Current Work"}</TableHead>
                    <TableHead>{isArabic ? "صافي المستحق" : "Net Amount"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isArabic ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(cert => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.certificate_number}</TableCell>
                      <TableCell>{cert.contractor_name}</TableCell>
                      <TableCell className="text-xs">{cert.period_from && cert.period_to ? `${cert.period_from} → ${cert.period_to}` : '-'}</TableCell>
                      <TableCell>{formatCurrency(cert.current_work_done)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(cert.net_amount)}</TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleViewCertificate(cert)}><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleExportCertificatePDF(cert)}><Download className="h-4 w-4" /></Button>
                          {cert.status === 'draft' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(cert.id, 'submitted')}><Edit className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(cert.id)}><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                          {cert.status === 'submitted' && <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(cert.id, 'approved')}>{isArabic ? "اعتماد" : "Approve"}</Button>}
                          {cert.status === 'approved' && <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(cert.id, 'paid')}>{isArabic ? "مدفوع" : "Paid"}</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        {showViewDialog && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setShowViewDialog(false); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogDescription className="sr-only">View certificate details</DialogDescription>
              <div className="flex items-center justify-between">
                <DialogTitle>{isArabic ? `مستخلص رقم ${viewingCertificate?.certificate_number}` : `Certificate #${viewingCertificate?.certificate_number}`}</DialogTitle>
                {viewingCertificate && (
                  <Button variant="outline" size="sm" onClick={() => handleExportCertificatePDF(viewingCertificate)}>
                    <Download className="h-4 w-4 mr-1" />{isArabic ? "تصدير PDF" : "Export PDF"}
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
                    ))}</TableBody>
                </Table>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>{isArabic ? "الأعمال الحالية" : "Current Work"}</span><span className="font-bold">{formatCurrency(viewingCertificate.current_work_done)}</span></div>
                    {Number(viewingCertificate.materials_on_site_amount) > 0 && (
                      <div className="flex justify-between text-blue-600"><span>{isArabic ? `مواد بالموقع (${viewingCertificate.materials_on_site_percentage || 0}%)` : `Materials on Site (${viewingCertificate.materials_on_site_percentage || 0}%)`}</span><span>+{formatCurrency((Number(viewingCertificate.materials_on_site_amount)||0) * (Number(viewingCertificate.materials_on_site_percentage)||0) / 100)}</span></div>
                    )}
                    <div className="flex justify-between text-destructive"><span>{isArabic ? "الاحتجاز" : "Retention"}</span><span>-{formatCurrency(viewingCertificate.retention_amount)}</span></div>
                    {viewingCertificate.advance_deduction > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "خصم مقدم" : "Advance"}</span><span>-{formatCurrency(viewingCertificate.advance_deduction)}</span></div>}
                    {Number(viewingCertificate.delay_penalty) > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "غرامة تأخير" : "Delay Penalty"}</span><span>-{formatCurrency(Number(viewingCertificate.delay_penalty))}</span></div>}
                    {viewingCertificate.other_deductions > 0 && <div className="flex justify-between text-destructive"><span>{isArabic ? "خصومات أخرى" : "Other Deductions"}</span><span>-{formatCurrency(viewingCertificate.other_deductions)}</span></div>}
                    {Array.isArray(viewingCertificate.additional_deductions) && viewingCertificate.additional_deductions.map((d: any, i: number) => (
                      Number(d?.amount) > 0 ? (
                        <div key={i} className="flex justify-between text-destructive"><span>{d.name || (isArabic ? "خصم" : "Deduction")}</span><span>-{formatCurrency(Number(d.amount))}</span></div>
                      ) : null
                    ))}
                    {Number(viewingCertificate.vat_amount) > 0 && (
                      <div className="flex justify-between text-emerald-700"><span>{isArabic ? `ضريبة القيمة المضافة (${viewingCertificate.vat_percentage || 15}%)` : `VAT (${viewingCertificate.vat_percentage || 15}%)`}</span><span>+{formatCurrency(Number(viewingCertificate.vat_amount))}</span></div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold"><span>{isArabic ? "صافي المستحق" : "Net Amount"}</span><span className="text-primary">{formatCurrency(viewingCertificate.net_amount)}</span></div>
                    {viewingCertificate.approval_status && (
                      <div className="flex justify-between text-xs text-muted-foreground pt-2"><span>{isArabic ? "حالة الاعتماد" : "Approval Status"}</span><span className="font-medium">{viewingCertificate.approval_status}</span></div>
                    )}
                    {Array.isArray(viewingCertificate.attachments) && viewingCertificate.attachments.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">{isArabic ? "المرفقات" : "Attachments"}:</div>
                        <ul className="text-xs space-y-1">
                          {viewingCertificate.attachments.map((a: any, i: number) => (
                            <li key={i}><a href={a.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{a.name}</a></li>
                          ))}
                        </ul>
                      </div>
                    )}
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
