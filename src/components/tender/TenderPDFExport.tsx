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

interface DirectCosts {
  materials: number;
  labor: number;
  equipment: number;
  totalBoq: number;
  overhead?: number;
  profit?: number;
}

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
    subcontractorsCosts: number;
  };
  staffData?: any[];
  facilitiesData?: any[];
  insuranceData?: any[];
  guaranteesData?: any[];
  indirectCostsData?: any[];
  subcontractorsData?: any[];
  directCosts?: DirectCosts;
  projectArea?: number;
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
  subcontractorsData = [],
  directCosts,
  projectArea = 0,
}: TenderPDFExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState({
    includeDirectCosts: true,
    includeStaff: true,
    includeFacilities: true,
    includeInsurance: true,
    includeGuarantees: true,
    includeIndirectCosts: true,
    includeSubcontractors: true,
    includePricePerSqm: true,
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

      if (projectArea > 0) {
        settingsData.push(["Built Area", `${formatCurrency(projectArea)} m²`]);
      }

      autoTable(doc, {
        startY: yPos,
        head: [["Setting", "Value"]],
        body: settingsData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Direct Costs Section (NEW)
      if (options.includeDirectCosts && directCosts) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94);
        doc.text("Direct Costs (BOQ)", margin, yPos);
        yPos += 8;

        const directCostsData = [
          ["Materials", `${pricingSettings.currency} ${formatCurrency(directCosts.materials)}`],
          ["Labor", `${pricingSettings.currency} ${formatCurrency(directCosts.labor)}`],
          ["Equipment", `${pricingSettings.currency} ${formatCurrency(directCosts.equipment)}`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Category", "Amount"]],
          body: directCostsData,
          foot: [["Total Direct Costs (BOQ)", `${pricingSettings.currency} ${formatCurrency(directCosts.totalBoq)}`]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [34, 197, 94] },
          footStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Staff Costs
      if (options.includeStaff && staffData.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Site Staff Costs", margin, yPos);
        yPos += 8;

        const staffTableData = staffData.map((s: any) => [
          s.position || s.positionEn,
          s.count?.toString() || "1",
          formatCurrency(s.monthlySalary || 0),
          formatCurrency(s.totalAnnual || s.total || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Position", "Count", "Monthly Salary", "Total"]],
          body: staffTableData,
          foot: [["", "", "Total", `${pricingSettings.currency} ${formatCurrency(totals.staffCosts)}`]],
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
          formatCurrency(f.annualCost || f.total || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Facility", "Monthly Cost", "Total"]],
          body: facilitiesTableData,
          foot: [["", "Total", `${pricingSettings.currency} ${formatCurrency(totals.facilitiesCosts)}`]],
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
          formatCurrency(i.premium || i.total || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Insurance Type", "Rate", "Premium"]],
          body: insuranceTableData,
          foot: [["", "Total", `${pricingSettings.currency} ${formatCurrency(totals.insuranceCosts)}`]],
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
          formatCurrency(g.cost || g.total || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Guarantee Type", "Rate", "Cost"]],
          body: guaranteesTableData,
          foot: [["", "Total", `${pricingSettings.currency} ${formatCurrency(totals.guaranteesCosts)}`]],
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
          foot: [["", "", "Total", `${pricingSettings.currency} ${formatCurrency(totals.indirectCosts)}`]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [139, 92, 246] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Subcontractors
      if (options.includeSubcontractors && subcontractorsData.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text("Subcontractors", margin, yPos);
        yPos += 8;

        const subcontractorsTableData = subcontractorsData.map((s: any) => [
          s.subcontractorName || s.name || s.nameEn,
          s.scope || s.specialty || "-",
          formatCurrency(s.contractValue || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Subcontractor", "Scope", "Contract Value"]],
          body: subcontractorsTableData,
          foot: [["", "Total", `${pricingSettings.currency} ${formatCurrency(totals.subcontractorsCosts)}`]],
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [236, 72, 153] },
          footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Final Summary
      if (options.includeSummary) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text("Financial Summary", margin, yPos);
        yPos += 10;

        const directCostsTotal = directCosts?.totalBoq || 0;
        const totalIndirect = totals.staffCosts + totals.facilitiesCosts + totals.insuranceCosts + totals.guaranteesCosts + totals.indirectCosts + totals.subcontractorsCosts;
        const allCosts = directCostsTotal + totalIndirect;
        const profit = allCosts * (pricingSettings.profitMargin / 100);
        const contingency = allCosts * (pricingSettings.contingency / 100);
        const grandTotal = allCosts + profit + contingency;
        const pricePerSqm = projectArea > 0 ? grandTotal / projectArea : 0;

        const summaryData: [string, string][] = [
          ["Direct Costs (BOQ)", `${pricingSettings.currency} ${formatCurrency(directCostsTotal)}`],
          ["  - Materials", `${pricingSettings.currency} ${formatCurrency(directCosts?.materials || 0)}`],
          ["  - Labor", `${pricingSettings.currency} ${formatCurrency(directCosts?.labor || 0)}`],
          ["  - Equipment", `${pricingSettings.currency} ${formatCurrency(directCosts?.equipment || 0)}`],
          ["─────────────────", "─────────────"],
          ["Site Staff Costs", `${pricingSettings.currency} ${formatCurrency(totals.staffCosts)}`],
          ["Facilities Costs", `${pricingSettings.currency} ${formatCurrency(totals.facilitiesCosts)}`],
          ["Insurance Costs", `${pricingSettings.currency} ${formatCurrency(totals.insuranceCosts)}`],
          ["Guarantees Costs", `${pricingSettings.currency} ${formatCurrency(totals.guaranteesCosts)}`],
          ["Other Indirect Costs", `${pricingSettings.currency} ${formatCurrency(totals.indirectCosts)}`],
          ["Subcontractors Costs", `${pricingSettings.currency} ${formatCurrency(totals.subcontractorsCosts)}`],
          ["─────────────────", "─────────────"],
          ["Total Indirect Costs", `${pricingSettings.currency} ${formatCurrency(totalIndirect)}`],
          ["═══════════════", "═══════════"],
          ["TOTAL ALL COSTS", `${pricingSettings.currency} ${formatCurrency(allCosts)}`],
          [`Profit (${pricingSettings.profitMargin}%)`, `+ ${pricingSettings.currency} ${formatCurrency(profit)}`],
          [`Contingency (${pricingSettings.contingency}%)`, `+ ${pricingSettings.currency} ${formatCurrency(contingency)}`],
          ["═══════════════", "═══════════"],
          ["GRAND TOTAL", `${pricingSettings.currency} ${formatCurrency(grandTotal)}`],
        ];

        // Add price per sqm if area is provided
        if (options.includePricePerSqm && projectArea > 0) {
          summaryData.push(["─────────────────", "─────────────"]);
          summaryData.push(["Built Area", `${formatCurrency(projectArea)} m²`]);
          summaryData.push(["Price per m²", `${pricingSettings.currency} ${formatCurrency(pricePerSqm)}`]);
        }

        autoTable(doc, {
          startY: yPos,
          body: summaryData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: "bold" },
            1: { halign: "right" },
          },
          didParseCell: (data) => {
            // Grand Total row styling
            if (data.row.index === 18) {
              data.cell.styles.fillColor = [30, 64, 175];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontSize = 12;
              data.cell.styles.fontStyle = "bold";
            }
            // Total All Costs row
            if (data.row.index === 14) {
              data.cell.styles.fillColor = [240, 240, 240];
              data.cell.styles.fontStyle = "bold";
            }
            // Direct Costs row
            if (data.row.index === 0) {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.fontStyle = "bold";
            }
            // Price per sqm row
            if (projectArea > 0 && data.row.index === summaryData.length - 1) {
              data.cell.styles.fillColor = [219, 234, 254];
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
            { key: "includeDirectCosts", labelAr: "التكاليف المباشرة (BOQ)", labelEn: "Direct Costs (BOQ)" },
            { key: "includeStaff", labelAr: "طاقم الموقع", labelEn: "Site Staff" },
            { key: "includeFacilities", labelAr: "المرافق", labelEn: "Facilities" },
            { key: "includeInsurance", labelAr: "التأمين", labelEn: "Insurance" },
            { key: "includeGuarantees", labelAr: "الضمانات", labelEn: "Guarantees" },
            { key: "includeIndirectCosts", labelAr: "التكاليف غير المباشرة", labelEn: "Indirect Costs" },
            { key: "includeSubcontractors", labelAr: "مقاولي الباطن", labelEn: "Subcontractors" },
            { key: "includePricePerSqm", labelAr: "سعر المتر المربع", labelEn: "Price per m²" },
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
