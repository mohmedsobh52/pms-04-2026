import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface HistoricalFile {
  id: string;
  file_name: string;
  project_name: string;
  project_location: string | null;
  project_date: string | null;
  currency: string;
  items: any[];
  items_count: number;
  total_value: number;
  notes: string | null;
  is_verified: boolean;
  created_at: string;
}

interface EnhancedSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  final_suggested_price: number;
  price_range: { min: number; max: number };
  overall_confidence: number;
  consensus_score: number;
  recommendation: string;
  recommendation_ar: string;
}

interface HistoricalPricingPDFReportProps {
  historicalFiles: HistoricalFile[];
  suggestions?: EnhancedSuggestion[];
  projectName?: string;
}

const LOCATION_LABELS: Record<string, string> = {
  "Riyadh": "الرياض",
  "Jeddah": "جدة",
  "Dammam": "الدمام",
  "Makkah": "مكة المكرمة",
  "Madinah": "المدينة المنورة",
  "Khobar": "الخبر",
  "Tabuk": "تبوك",
  "Other": "أخرى",
};

export function HistoricalPricingPDFReport({ historicalFiles, suggestions, projectName }: HistoricalPricingPDFReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState({
    includeSummary: true,
    includeHistoricalList: true,
    includeComparison: true,
    includeStats: true,
    includeRecommendations: true,
  });
  const { toast } = useToast();

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Historical Pricing Analysis Report", 105, yPos, { align: "center" });
      yPos += 10;

      if (projectName) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Project: ${projectName}`, 105, yPos, { align: "center" });
        yPos += 8;
      }

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPos, { align: "center" });
      yPos += 15;

      // Summary Section
      if (options.includeSummary) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Summary", 15, yPos);
        yPos += 8;

        const totalItems = historicalFiles.reduce((sum, f) => sum + f.items_count, 0);
        const totalValue = historicalFiles.reduce((sum, f) => sum + f.total_value, 0);
        const verifiedCount = historicalFiles.filter(f => f.is_verified).length;
        const locations = new Set(historicalFiles.map(f => f.project_location).filter(Boolean)).size;

        const summaryData = [
          ["Total Historical Files", historicalFiles.length.toString()],
          ["Total Items", totalItems.toLocaleString()],
          ["Total Value", `${totalValue.toLocaleString()} SAR`],
          ["Verified Files", verifiedCount.toString()],
          ["Different Locations", locations.toString()],
        ];

        (doc as any).autoTable({
          startY: yPos,
          head: [["Metric", "Value"]],
          body: summaryData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 15, right: 15 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Historical Files List
      if (options.includeHistoricalList && historicalFiles.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Historical Files Database", 15, yPos);
        yPos += 8;

        const filesData = historicalFiles.map(file => [
          file.project_name,
          LOCATION_LABELS[file.project_location || ""] || file.project_location || "-",
          file.project_date ? new Date(file.project_date).toLocaleDateString() : "-",
          file.items_count.toString(),
          file.total_value.toLocaleString(),
          file.is_verified ? "Yes" : "No",
        ]);

        (doc as any).autoTable({
          startY: yPos,
          head: [["Project Name", "Location", "Date", "Items", "Value", "Verified"]],
          body: filesData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 18 },
            4: { cellWidth: 30 },
            5: { cellWidth: 18 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Price Comparison
      if (options.includeComparison && suggestions && suggestions.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Price Comparison: Historical vs Suggested", 15, yPos);
        yPos += 8;

        const comparisonData = suggestions.slice(0, 30).map(s => {
          const variance = s.current_price > 0 
            ? (((s.final_suggested_price - s.current_price) / s.current_price) * 100).toFixed(1) 
            : "N/A";
          return [
            s.item_number,
            s.description.substring(0, 40) + (s.description.length > 40 ? "..." : ""),
            s.current_price.toFixed(2),
            s.final_suggested_price.toFixed(2),
            variance + "%",
            s.overall_confidence + "%",
          ];
        });

        (doc as any).autoTable({
          startY: yPos,
          head: [["Item #", "Description", "Current", "Suggested", "Variance", "Confidence"]],
          body: comparisonData,
          theme: "striped",
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 60 },
            2: { cellWidth: 22 },
            3: { cellWidth: 22 },
            4: { cellWidth: 22 },
            5: { cellWidth: 22 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Statistics by Location
      if (options.includeStats && historicalFiles.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Statistics by Location", 15, yPos);
        yPos += 8;

        const locationStats: Record<string, { count: number; totalValue: number; totalItems: number }> = {};
        historicalFiles.forEach(file => {
          const loc = file.project_location || "Unknown";
          if (!locationStats[loc]) {
            locationStats[loc] = { count: 0, totalValue: 0, totalItems: 0 };
          }
          locationStats[loc].count += 1;
          locationStats[loc].totalValue += file.total_value || 0;
          locationStats[loc].totalItems += file.items_count || 0;
        });

        const statsData = Object.entries(locationStats).map(([location, data]) => [
          LOCATION_LABELS[location] || location,
          data.count.toString(),
          data.totalItems.toLocaleString(),
          data.totalValue.toLocaleString(),
          (data.totalValue / data.count).toLocaleString(),
        ]);

        (doc as any).autoTable({
          startY: yPos,
          head: [["Location", "Files", "Total Items", "Total Value", "Avg Value/File"]],
          body: statsData,
          theme: "striped",
          headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 15, right: 15 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Recommendations
      if (options.includeRecommendations && suggestions && suggestions.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Recommendations Summary", 15, yPos);
        yPos += 8;

        const highVarianceItems = suggestions.filter(s => {
          if (s.current_price <= 0) return false;
          const variance = Math.abs((s.final_suggested_price - s.current_price) / s.current_price * 100);
          return variance > 15;
        }).slice(0, 10);

        if (highVarianceItems.length > 0) {
          doc.setFontSize(10);
          doc.text("Items with >15% price variance requiring attention:", 15, yPos);
          yPos += 6;

          const recData = highVarianceItems.map(s => {
            const variance = ((s.final_suggested_price - s.current_price) / s.current_price * 100).toFixed(1);
            return [
              s.item_number,
              s.description.substring(0, 50) + (s.description.length > 50 ? "..." : ""),
              variance + "%",
              s.recommendation || "Review pricing",
            ];
          });

          (doc as any).autoTable({
            startY: yPos,
            head: [["Item #", "Description", "Variance", "Recommendation"]],
            body: recData,
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68] },
            margin: { left: 15, right: 15 },
            styles: { fontSize: 8 },
          });
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Page ${i} of ${pageCount} - Generated by BOQ Analysis System`,
          105,
          285,
          { align: "center" }
        );
      }

      // Save
      const fileName = `historical-pricing-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "✅ تم إنشاء التقرير",
        description: `تم حفظ التقرير بنجاح: ${fileName}`,
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({
        title: "خطأ في إنشاء التقرير",
        description: error.message || "فشل في إنشاء ملف PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          تقرير PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            تقرير مقارنة الأسعار التاريخية
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اختر الأقسام المراد تضمينها في التقرير:
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="summary"
                checked={options.includeSummary}
                onCheckedChange={(checked) => setOptions(o => ({ ...o, includeSummary: !!checked }))}
              />
              <Label htmlFor="summary" className="cursor-pointer">ملخص البيانات</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="historical"
                checked={options.includeHistoricalList}
                onCheckedChange={(checked) => setOptions(o => ({ ...o, includeHistoricalList: !!checked }))}
              />
              <Label htmlFor="historical" className="cursor-pointer">قائمة الملفات التاريخية</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="comparison"
                checked={options.includeComparison}
                onCheckedChange={(checked) => setOptions(o => ({ ...o, includeComparison: !!checked }))}
                disabled={!suggestions || suggestions.length === 0}
              />
              <Label htmlFor="comparison" className={`cursor-pointer ${!suggestions?.length ? 'text-muted-foreground' : ''}`}>
                مقارنة الأسعار الحالية والمقترحة
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="stats"
                checked={options.includeStats}
                onCheckedChange={(checked) => setOptions(o => ({ ...o, includeStats: !!checked }))}
              />
              <Label htmlFor="stats" className="cursor-pointer">إحصائيات حسب الموقع</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="recommendations"
                checked={options.includeRecommendations}
                onCheckedChange={(checked) => setOptions(o => ({ ...o, includeRecommendations: !!checked }))}
                disabled={!suggestions || suggestions.length === 0}
              />
              <Label htmlFor="recommendations" className={`cursor-pointer ${!suggestions?.length ? 'text-muted-foreground' : ''}`}>
                التوصيات والتحذيرات
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                تحميل التقرير
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
