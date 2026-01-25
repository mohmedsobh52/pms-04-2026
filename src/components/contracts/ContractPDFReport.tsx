import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { FileText, Download, FileBarChart, DollarSign, Target, Shield, Building2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Contract {
  id: string;
  contract_title: string;
  contract_number: string;
  contractor_name?: string;
  contract_type?: string;
  contract_value?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  scope_of_work?: string;
  payment_terms?: string;
  notes?: string;
}

interface Milestone {
  id: string;
  milestone_name: string;
  due_date: string;
  status?: string;
  payment_percentage?: number;
  payment_amount?: number;
  completion_date?: string;
}

interface Payment {
  id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  status?: string;
  payment_date?: string;
  description?: string;
}

interface Warranty {
  id: string;
  warranty_type: string;
  description?: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  responsible_party?: string;
  bond_value?: number;
  bond_type?: string;
  status?: string;
}

interface ContractPDFReportProps {
  contract: Contract;
  milestones?: Milestone[];
  payments?: Payment[];
  warranties?: Warranty[];
}

export const ContractPDFReport = ({ 
  contract, 
  milestones = [], 
  payments = [], 
  warranties = [] 
}: ContractPDFReportProps) => {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [sections, setSections] = useState({
    coverPage: true,
    contractDetails: true,
    milestones: true,
    payments: true,
    warranties: true,
    charts: true,
    summary: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (value: number | undefined, currency = "SAR") => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd MMM yyyy", { locale: isArabic ? ar : enUS });
  };

  const getWarrantyTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      defects_liability: { en: "Defects Liability", ar: "فترة العيوب" },
      performance: { en: "Performance", ar: "ضمان الأداء" },
      equipment: { en: "Equipment", ar: "ضمان المعدات" },
      workmanship: { en: "Workmanship", ar: "ضمان التشطيبات" },
      materials: { en: "Materials", ar: "ضمان المواد" },
      structural: { en: "Structural", ar: "ضمان هيكلي" },
    };
    return isArabic ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const getStatusLabel = (status: string | undefined) => {
    const labels: Record<string, { en: string; ar: string }> = {
      active: { en: "Active", ar: "نشط" },
      pending: { en: "Pending", ar: "معلق" },
      completed: { en: "Completed", ar: "مكتمل" },
      paid: { en: "Paid", ar: "مدفوع" },
      overdue: { en: "Overdue", ar: "متأخر" },
      in_progress: { en: "In Progress", ar: "قيد التنفيذ" },
      expired: { en: "Expired", ar: "منتهي" },
      released: { en: "Released", ar: "محرر" },
    };
    return isArabic ? labels[status || ""]?.ar || status : labels[status || ""]?.en || status;
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Get company logo from localStorage
      const companyLogo = localStorage.getItem("company-logo");
      const companyName = localStorage.getItem("company-name") || "";

      // Helper function to add new page if needed
      const checkNewPage = (requiredSpace: number = 30) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Add header with logo
      const addHeader = () => {
        if (companyLogo) {
          try {
            doc.addImage(companyLogo, "PNG", margin, 10, 25, 25);
          } catch (e) {
            console.log("Could not load company logo");
          }
        }
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `${isArabic ? "تاريخ التقرير:" : "Report Date:"} ${format(new Date(), "dd/MM/yyyy")}`,
          pageWidth - margin,
          15,
          { align: "right" }
        );
        if (companyName) {
          doc.text(companyName, pageWidth - margin, 20, { align: "right" });
        }
      };

      // Cover Page
      if (sections.coverPage) {
        addHeader();
        
        // Title
        doc.setFontSize(24);
        doc.setTextColor(41, 98, 255);
        const title = isArabic ? "تقرير العقد الشامل" : "Contract Report";
        doc.text(title, pageWidth / 2, 60, { align: "center" });

        // Contract Title
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text(contract.contract_title, pageWidth / 2, 80, { align: "center" });

        // Contract Number
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`#${contract.contract_number}`, pageWidth / 2, 90, { align: "center" });

        // Key Info Box
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, 110, pageWidth - 2 * margin, 50, 3, 3, "F");
        
        doc.setFontSize(10);
        doc.setTextColor(60);
        
        const infoItems = [
          { label: isArabic ? "المقاول:" : "Contractor:", value: contract.contractor_name || "-" },
          { label: isArabic ? "القيمة:" : "Value:", value: formatCurrency(contract.contract_value, contract.currency) },
          { label: isArabic ? "تاريخ البدء:" : "Start Date:", value: formatDate(contract.start_date) },
          { label: isArabic ? "تاريخ الانتهاء:" : "End Date:", value: formatDate(contract.end_date) },
        ];

        let infoY = 125;
        infoItems.forEach((item, index) => {
          const xPos = index % 2 === 0 ? margin + 10 : pageWidth / 2 + 10;
          if (index === 2) infoY += 15;
          doc.setFont("helvetica", "bold");
          doc.text(item.label, xPos, infoY);
          doc.setFont("helvetica", "normal");
          doc.text(item.value, xPos + 35, infoY);
        });

        // Summary Stats
        doc.setFillColor(41, 98, 255);
        doc.roundedRect(margin, 175, (pageWidth - 2 * margin) / 3 - 5, 25, 2, 2, "F");
        doc.roundedRect(margin + (pageWidth - 2 * margin) / 3, 175, (pageWidth - 2 * margin) / 3 - 5, 25, 2, 2, "F");
        doc.roundedRect(margin + 2 * (pageWidth - 2 * margin) / 3 + 5, 175, (pageWidth - 2 * margin) / 3 - 5, 25, 2, 2, "F");

        doc.setTextColor(255);
        doc.setFontSize(16);
        doc.text(String(milestones.length), margin + 28, 185, { align: "center" });
        doc.text(String(payments.length), pageWidth / 2, 185, { align: "center" });
        doc.text(String(warranties.length), pageWidth - margin - 28, 185, { align: "center" });

        doc.setFontSize(8);
        doc.text(isArabic ? "المعالم" : "Milestones", margin + 28, 195, { align: "center" });
        doc.text(isArabic ? "الدفعات" : "Payments", pageWidth / 2, 195, { align: "center" });
        doc.text(isArabic ? "الضمانات" : "Warranties", pageWidth - margin - 28, 195, { align: "center" });

        doc.addPage();
        yPosition = margin;
      }

      // Contract Details Section
      if (sections.contractDetails) {
        addHeader();
        yPosition = 45;

        doc.setFontSize(14);
        doc.setTextColor(41, 98, 255);
        doc.text(isArabic ? "تفاصيل العقد" : "Contract Details", margin, yPosition);
        yPosition += 10;

        const detailsData = [
          [isArabic ? "رقم العقد" : "Contract Number", contract.contract_number],
          [isArabic ? "عنوان العقد" : "Contract Title", contract.contract_title],
          [isArabic ? "نوع العقد" : "Contract Type", contract.contract_type || "-"],
          [isArabic ? "المقاول" : "Contractor", contract.contractor_name || "-"],
          [isArabic ? "القيمة" : "Value", formatCurrency(contract.contract_value, contract.currency)],
          [isArabic ? "تاريخ البدء" : "Start Date", formatDate(contract.start_date)],
          [isArabic ? "تاريخ الانتهاء" : "End Date", formatDate(contract.end_date)],
          [isArabic ? "الحالة" : "Status", getStatusLabel(contract.status) || "-"],
          [isArabic ? "شروط الدفع" : "Payment Terms", contract.payment_terms || "-"],
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: detailsData,
          theme: "plain",
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 50 },
            1: { cellWidth: "auto" },
          },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        if (contract.scope_of_work) {
          checkNewPage(40);
          doc.setFontSize(12);
          doc.setTextColor(60);
          doc.text(isArabic ? "نطاق العمل:" : "Scope of Work:", margin, yPosition);
          yPosition += 7;
          
          doc.setFontSize(10);
          const scopeLines = doc.splitTextToSize(contract.scope_of_work, pageWidth - 2 * margin);
          doc.text(scopeLines, margin, yPosition);
          yPosition += scopeLines.length * 5 + 10;
        }
      }

      // Milestones Section
      if (sections.milestones && milestones.length > 0) {
        checkNewPage(50);
        
        doc.setFontSize(14);
        doc.setTextColor(41, 98, 255);
        doc.text(isArabic ? "المعالم" : "Milestones", margin, yPosition);
        yPosition += 10;

        const completedMilestones = milestones.filter(m => m.status === "completed").length;
        const completionRate = Math.round((completedMilestones / milestones.length) * 100);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `${isArabic ? "نسبة الإنجاز:" : "Completion Rate:"} ${completionRate}% (${completedMilestones}/${milestones.length})`,
          margin,
          yPosition
        );
        yPosition += 8;

        const milestoneHeaders = isArabic 
          ? ["#", "المعلم", "تاريخ الاستحقاق", "النسبة", "المبلغ", "الحالة"]
          : ["#", "Milestone", "Due Date", "Percentage", "Amount", "Status"];

        const milestoneData = milestones.map((m, i) => [
          String(i + 1),
          m.milestone_name,
          formatDate(m.due_date),
          m.payment_percentage ? `${m.payment_percentage}%` : "-",
          formatCurrency(m.payment_amount, contract.currency),
          getStatusLabel(m.status) || "-",
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [milestoneHeaders],
          body: milestoneData,
          theme: "striped",
          headStyles: { fillColor: [41, 98, 255], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Payments Section
      if (sections.payments && payments.length > 0) {
        checkNewPage(50);

        doc.setFontSize(14);
        doc.setTextColor(41, 98, 255);
        doc.text(isArabic ? "الدفعات" : "Payments", margin, yPosition);
        yPosition += 10;

        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        const paidPayments = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `${isArabic ? "المدفوع:" : "Paid:"} ${formatCurrency(paidPayments, contract.currency)} / ${formatCurrency(totalPayments, contract.currency)}`,
          margin,
          yPosition
        );
        yPosition += 8;

        const paymentHeaders = isArabic
          ? ["#", "الوصف", "المبلغ", "تاريخ الاستحقاق", "تاريخ الدفع", "الحالة"]
          : ["#", "Description", "Amount", "Due Date", "Payment Date", "Status"];

        const paymentData = payments.map(p => [
          String(p.payment_number),
          p.description || `${isArabic ? "دفعة" : "Payment"} #${p.payment_number}`,
          formatCurrency(p.amount, contract.currency),
          formatDate(p.due_date),
          formatDate(p.payment_date),
          getStatusLabel(p.status) || "-",
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [paymentHeaders],
          body: paymentData,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Warranties Section
      if (sections.warranties && warranties.length > 0) {
        checkNewPage(50);

        doc.setFontSize(14);
        doc.setTextColor(41, 98, 255);
        doc.text(isArabic ? "الضمانات" : "Warranties", margin, yPosition);
        yPosition += 10;

        const activeWarranties = warranties.filter(w => w.status === "active").length;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `${isArabic ? "الضمانات النشطة:" : "Active Warranties:"} ${activeWarranties}/${warranties.length}`,
          margin,
          yPosition
        );
        yPosition += 8;

        const warrantyHeaders = isArabic
          ? ["النوع", "المدة", "البدء", "الانتهاء", "قيمة الضمان", "الحالة"]
          : ["Type", "Duration", "Start", "End", "Bond Value", "Status"];

        const warrantyData = warranties.map(w => [
          getWarrantyTypeLabel(w.warranty_type),
          `${w.duration_months} ${isArabic ? "شهر" : "months"}`,
          formatDate(w.start_date),
          formatDate(w.end_date),
          formatCurrency(w.bond_value, contract.currency),
          getStatusLabel(w.status) || "-",
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [warrantyHeaders],
          body: warrantyData,
          theme: "striped",
          headStyles: { fillColor: [168, 85, 247], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Summary Section
      if (sections.summary) {
        checkNewPage(60);

        doc.setFontSize(14);
        doc.setTextColor(41, 98, 255);
        doc.text(isArabic ? "ملخص التقرير" : "Report Summary", margin, yPosition);
        yPosition += 15;

        const totalPaymentsValue = payments.reduce((sum, p) => sum + p.amount, 0);
        const paidValue = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
        const pendingValue = totalPaymentsValue - paidValue;

        const summaryData = [
          [isArabic ? "قيمة العقد" : "Contract Value", formatCurrency(contract.contract_value, contract.currency)],
          [isArabic ? "إجمالي الدفعات" : "Total Payments", formatCurrency(totalPaymentsValue, contract.currency)],
          [isArabic ? "المدفوع" : "Paid", formatCurrency(paidValue, contract.currency)],
          [isArabic ? "المتبقي" : "Pending", formatCurrency(pendingValue, contract.currency)],
          [isArabic ? "عدد المعالم" : "Total Milestones", String(milestones.length)],
          [isArabic ? "المعالم المكتملة" : "Completed Milestones", String(milestones.filter(m => m.status === "completed").length)],
          [isArabic ? "عدد الضمانات" : "Total Warranties", String(warranties.length)],
          [isArabic ? "الضمانات النشطة" : "Active Warranties", String(warranties.filter(w => w.status === "active").length)],
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: summaryData,
          theme: "plain",
          styles: { fontSize: 11, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 80 },
            1: { cellWidth: "auto", halign: "right" },
          },
          margin: { left: margin, right: margin },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `${isArabic ? "صفحة" : "Page"} ${i} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save PDF
      const fileName = `Contract_Report_${contract.contract_number}_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
      
      toast.success(isArabic ? "تم إنشاء التقرير بنجاح" : "Report generated successfully");
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(isArabic ? "خطأ في إنشاء التقرير" : "Error generating report");
    } finally {
      setGenerating(false);
    }
  };

  const sectionOptions = [
    { key: "coverPage" as const, label: isArabic ? "صفحة الغلاف" : "Cover Page", icon: FileText },
    { key: "contractDetails" as const, label: isArabic ? "تفاصيل العقد" : "Contract Details", icon: Building2 },
    { key: "milestones" as const, label: isArabic ? "المعالم" : "Milestones", icon: Target, count: milestones.length },
    { key: "payments" as const, label: isArabic ? "الدفعات" : "Payments", icon: DollarSign, count: payments.length },
    { key: "warranties" as const, label: isArabic ? "الضمانات" : "Warranties", icon: Shield, count: warranties.length },
    { key: "charts" as const, label: isArabic ? "الرسوم البيانية" : "Charts", icon: FileBarChart },
    { key: "summary" as const, label: isArabic ? "الملخص" : "Summary", icon: FileText },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {isArabic ? "تقرير PDF" : "PDF Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {isArabic ? "تقرير العقد الشامل" : "Comprehensive Contract Report"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">{contract.contract_title}</p>
              <p className="text-xs text-muted-foreground">#{contract.contract_number}</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm font-medium">{isArabic ? "اختر الأقسام المطلوبة:" : "Select sections to include:"}</p>
            
            {sectionOptions.map(option => {
              const Icon = option.icon;
              return (
                <div key={option.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={option.key}
                      checked={sections[option.key]}
                      onCheckedChange={() => toggleSection(option.key)}
                    />
                    <Label htmlFor={option.key} className="flex items-center gap-2 cursor-pointer">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {option.label}
                    </Label>
                  </div>
                  {"count" in option && option.count !== undefined && (
                    <span className="text-xs text-muted-foreground">({option.count})</span>
                  )}
                </div>
              );
            })}
          </div>

          <Button 
            onClick={generatePDF} 
            className="w-full gap-2" 
            disabled={generating}
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isArabic ? "جاري الإنشاء..." : "Generating..."}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {isArabic ? "إنشاء التقرير" : "Generate Report"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
