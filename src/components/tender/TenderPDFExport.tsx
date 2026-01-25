import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TenderPDFExportProps {
  isArabic: boolean;
  projectName: string;
  pricingSettings: {
    contractValue: number;
    profitMargin: number;
    contingency: number;
    projectDuration: number;
    currency: string;
  };
  totals: {
    staffCosts: number;
    facilitiesCosts: number;
    insuranceCosts: number;
    guaranteesCosts: number;
    indirectCosts: number;
  };
  staffData?: any[];
  facilitiesData?: any[];
  insuranceData?: any[];
  guaranteesData?: any[];
  indirectCostsData?: any[];
}

export function TenderPDFExport({
  isArabic,
  projectName,
  pricingSettings,
  totals,
  staffData = [],
  facilitiesData = [],
  insuranceData = [],
  guaranteesData = [],
  indirectCostsData = [],
}: TenderPDFExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState({
    includeStaff: true,
    includeFacilities: true,
    includeInsurance: true,
    includeGuarantees: true,
    includeIndirectCosts: true,
    includeSummary: true,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text("Tender Summary Report", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Project Name
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(projectName, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US")}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Settings Summary
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Project Settings", margin, yPos);
      yPos += 8;

      const settingsData = [
        ["Contract Value", `${pricingSettings.currency} ${formatCurrency(pricingSettings.contractValue)}`],
        ["Profit Margin", `${pricingSettings.profitMargin}%`],
        ["Contingency", `${pricingSettings.contingency}%`],
        ["Duration", `${pricingSettings.projectDuration} months`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [["Setting", "Value"]],
        body: settingsData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Staff Costs
      if (options.includeStaff && staffData.length > 0) {
        doc.setFontSize(12);
        doc.text("Site Staff Costs", margin, yPos);
        yPos += 8;

        const staffTableData = staffData.map((s: any) => [
          s.position || s.positionEn,
          s.count?.toString() || "1",
          formatCurrency(s.monthlySalary || 0),
          formatCurrency(s.totalAnnual || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Position", "Count", "Monthly Salary", "Annual Total"]],
          body: staffTableData,
          foot: [["", "", "Total", formatCurrency(totals.staffCosts)]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Facilities Costs
      if (options.includeFacilities && facilitiesData.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("Facilities Costs", margin, yPos);
        yPos += 8;

        const facilitiesTableData = facilitiesData.map((f: any) => [
          f.name || f.nameEn,
          formatCurrency(f.monthlyCost || 0),
          formatCurrency(f.annualCost || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Facility", "Monthly Cost", "Annual Cost"]],
          body: facilitiesTableData,
          foot: [["", "Total", formatCurrency(totals.facilitiesCosts)]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Insurance Costs
      if (options.includeInsurance && insuranceData.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("Insurance Costs", margin, yPos);
        yPos += 8;

        const insuranceTableData = insuranceData.map((i: any) => [
          i.type || i.typeEn,
          i.percentage ? `${i.percentage}%` : "-",
          formatCurrency(i.premium || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Insurance Type", "Rate", "Premium"]],
          body: insuranceTableData,
          foot: [["", "Total", formatCurrency(totals.insuranceCosts)]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [245, 158, 11] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Guarantees Costs
      if (options.includeGuarantees && guaranteesData.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("Bank Guarantees", margin, yPos);
        yPos += 8;

        const guaranteesTableData = guaranteesData.map((g: any) => [
          g.type || g.typeEn,
          g.percentage ? `${g.percentage}%` : "-",
          formatCurrency(g.cost || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Guarantee Type", "Rate", "Cost"]],
          body: guaranteesTableData,
          foot: [["", "Total", formatCurrency(totals.guaranteesCosts)]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [239, 68, 68] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Indirect Costs
      if (options.includeIndirectCosts && indirectCostsData.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("Indirect Costs", margin, yPos);
        yPos += 8;

        const indirectTableData = indirectCostsData.map((c: any) => [
          c.category || c.categoryEn,
          c.name || c.nameEn,
          c.costType === "percentage" ? `${c.value}%` : formatCurrency(c.value || 0),
          formatCurrency(c.total || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Category", "Item", "Value", "Total"]],
          body: indirectTableData,
          foot: [["", "", "Total", formatCurrency(totals.indirectCosts)]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [139, 92, 246] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Final Summary
      if (options.includeSummary) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text("Financial Summary", margin, yPos);
        yPos += 10;

        const totalIndirect = totals.staffCosts + totals.facilitiesCosts + totals.insuranceCosts + totals.guaranteesCosts + totals.indirectCosts;
        const subtotal = totalIndirect;
        const profit = subtotal * (pricingSettings.profitMargin / 100);
        const contingency = subtotal * (pricingSettings.contingency / 100);
        const grandTotal = subtotal + profit + contingency;

        const summaryData = [
          ["Site Staff Costs", formatCurrency(totals.staffCosts)],
          ["Facilities Costs", formatCurrency(totals.facilitiesCosts)],
          ["Insurance Costs", formatCurrency(totals.insuranceCosts)],
          ["Guarantees Costs", formatCurrency(totals.guaranteesCosts)],
          ["Other Indirect Costs", formatCurrency(totals.indirectCosts)],
          ["─────────────────", "─────────────"],
          ["Total Indirect Costs", formatCurrency(totalIndirect)],
          [`Profit (${pricingSettings.profitMargin}%)`, formatCurrency(profit)],
          [`Contingency (${pricingSettings.contingency}%)`, formatCurrency(contingency)],
          ["═══════════════", "═══════════"],
          ["GRAND TOTAL", `${pricingSettings.currency} ${formatCurrency(grandTotal)}`],
        ];

        autoTable(doc, {
          startY: yPos,
          body: summaryData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 11 },
          columnStyles: {
            0: { fontStyle: "bold" },
            1: { halign: "right" },
          },
          didParseCell: (data) => {
            if (data.row.index === summaryData.length - 1) {
              data.cell.styles.fillColor = [30, 64, 175];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontSize = 12;
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save
      const fileName = `Tender_Summary_${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      setIsOpen(false);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {isArabic ? "تصدير PDF" : "Export PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isArabic ? "تصدير ملخص العطاء" : "Export Tender Summary"}
          </DialogTitle>
          <DialogDescription>
            {isArabic
              ? "اختر الأقسام التي تريد تضمينها في التقرير"
              : "Select sections to include in the report"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {[
            { key: "includeStaff", labelAr: "طاقم الموقع", labelEn: "Site Staff" },
            { key: "includeFacilities", labelAr: "المرافق", labelEn: "Facilities" },
            { key: "includeInsurance", labelAr: "التأمين", labelEn: "Insurance" },
            { key: "includeGuarantees", labelAr: "الضمانات", labelEn: "Guarantees" },
            { key: "includeIndirectCosts", labelAr: "التكاليف غير المباشرة", labelEn: "Indirect Costs" },
            { key: "includeSummary", labelAr: "الملخص المالي", labelEn: "Financial Summary" },
          ].map((item) => (
            <div key={item.key} className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox
                id={item.key}
                checked={options[item.key as keyof typeof options]}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, [item.key]: checked }))
                }
              />
              <Label htmlFor={item.key} className="cursor-pointer">
                {isArabic ? item.labelAr : item.labelEn}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isArabic ? "تصدير" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
