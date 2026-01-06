import { useState } from "react";
import { FileText, Download, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AnalyzerResult {
  name: string;
  nameAr: string;
  suggested_price: number;
  confidence: number;
  methodology: string;
  source: string;
}

interface EnhancedSuggestion {
  item_number: string;
  description: string;
  current_price: number;
  analyzers: AnalyzerResult[];
  final_suggested_price: number;
  price_range: { min: number; max: number };
  overall_confidence: number;
  consensus_score: number;
  recommendation: string;
  recommendation_ar: string;
}

interface EnhancedAnalysisPDFReportProps {
  suggestions: EnhancedSuggestion[];
  summary: {
    total_items: number;
    analyzed_items: number;
    analyzers_used: { id: string; name: string; nameAr: string }[];
    average_confidence: number;
    average_consensus: number;
    location: string;
    analyzed_at: string;
  } | null;
  projectName?: string;
}

export function EnhancedAnalysisPDFReport({ suggestions, summary, projectName }: EnhancedAnalysisPDFReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState({
    includeSummary: true,
    includeAnalyzerDetails: true,
    includeRecommendations: true,
    includeVarianceAnalysis: true,
    includePriceRanges: true,
  });
  const { toast } = useToast();

  const generatePDF = async () => {
    if (!suggestions.length) {
      toast({
        title: "لا توجد بيانات",
        description: "يرجى إجراء التحليل المتقدم أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Use Helvetica as it's built-in and supports basic characters
      doc.setFont("helvetica");

      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(59, 130, 246); // Blue
      doc.text("Enhanced Pricing Analysis Report", 105, yPos, { align: "center" });
      yPos += 10;

      // Project Name
      if (projectName) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Project: ${projectName}`, 105, yPos, { align: "center" });
        yPos += 8;
      }

      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US")} ${new Date().toLocaleTimeString("en-US")}`, 105, yPos, { align: "center" });
      yPos += 15;

      // Summary Section
      if (options.includeSummary && summary) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Analysis Summary", 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        const summaryData = [
          ["Total Items Analyzed", summary.analyzed_items.toString()],
          ["Location", summary.location],
          ["Active Analyzers", summary.analyzers_used.length.toString()],
          ["Average Confidence", `${summary.average_confidence}%`],
          ["Average Consensus", `${summary.average_consensus}%`],
          ["Analysis Date", new Date(summary.analyzed_at).toLocaleDateString("en-US")],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Metric", "Value"]],
          body: summaryData,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { fontStyle: "bold" } },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Analyzers Used Section
      if (options.includeAnalyzerDetails && summary) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Analyzers Used", 14, yPos);
        yPos += 8;

        const analyzerData = summary.analyzers_used.map((a, idx) => [
          (idx + 1).toString(),
          a.name,
          a.nameAr,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["#", "Analyzer Name", "Arabic Name"]],
          body: analyzerData,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Main Results Table
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Pricing Analysis Results", 14, yPos);
      yPos += 8;

      const mainTableHeaders = ["Item No.", "Description", "Current", "Suggested", "Variance", "Confidence"];
      if (options.includePriceRanges) {
        mainTableHeaders.push("Price Range");
      }

      const mainTableData = suggestions.map(s => {
        const variance = s.current_price > 0 
          ? ((s.final_suggested_price - s.current_price) / s.current_price * 100).toFixed(1) + "%" 
          : "N/A";
        
        const row = [
          s.item_number,
          s.description.substring(0, 40) + (s.description.length > 40 ? "..." : ""),
          s.current_price.toFixed(2),
          s.final_suggested_price.toFixed(2),
          variance,
          `${s.overall_confidence}%`,
        ];

        if (options.includePriceRanges) {
          row.push(`${s.price_range.min.toFixed(2)} - ${s.price_range.max.toFixed(2)}`);
        }

        return row;
      });

      autoTable(doc, {
        startY: yPos,
        head: [mainTableHeaders],
        body: mainTableData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: "right" },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 18, halign: "center" },
        },
      });

      // Detailed Analyzer Results (new page)
      if (options.includeAnalyzerDetails) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Detailed Analyzer Results per Item", 14, yPos);
        yPos += 10;

        for (const suggestion of suggestions.slice(0, 20)) { // Limit to 20 items for PDF size
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setTextColor(59, 130, 246);
          doc.text(`${suggestion.item_number}: ${suggestion.description.substring(0, 60)}`, 14, yPos);
          yPos += 6;

          const analyzerTableData = suggestion.analyzers.map(a => [
            a.name,
            a.suggested_price.toFixed(2),
            `${a.confidence}%`,
            a.methodology.substring(0, 50) + (a.methodology.length > 50 ? "..." : ""),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [["Analyzer", "Price", "Confidence", "Methodology"]],
            body: analyzerTableData,
            theme: "striped",
            headStyles: { fillColor: [100, 100, 100], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
          });

          yPos = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      // Recommendations Section (new page)
      if (options.includeRecommendations) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Recommendations", 14, yPos);
        yPos += 10;

        const recommendationData = suggestions.map(s => [
          s.item_number,
          s.recommendation,
          `${s.consensus_score}%`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Item No.", "Recommendation", "Consensus"]],
          body: recommendationData,
          theme: "grid",
          headStyles: { fillColor: [234, 179, 8], textColor: 0 },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 130 },
            2: { cellWidth: 25, halign: "center" },
          },
        });
      }

      // Variance Analysis Section
      if (options.includeVarianceAnalysis) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Variance Analysis Summary", 14, yPos);
        yPos += 10;

        // Calculate variance stats
        const variances = suggestions.map(s => 
          s.current_price > 0 ? (s.final_suggested_price - s.current_price) / s.current_price * 100 : 0
        );

        const balanced = variances.filter(v => Math.abs(v) <= 5).length;
        const aboveMarket = variances.filter(v => v > 5).length;
        const belowMarket = variances.filter(v => v < -5).length;

        const statsData = [
          ["Balanced Items (within 5%)", balanced.toString(), `${(balanced / suggestions.length * 100).toFixed(1)}%`],
          ["Above Market (>5%)", aboveMarket.toString(), `${(aboveMarket / suggestions.length * 100).toFixed(1)}%`],
          ["Below Market (<-5%)", belowMarket.toString(), `${(belowMarket / suggestions.length * 100).toFixed(1)}%`],
          ["Total Items", suggestions.length.toString(), "100%"],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [["Category", "Count", "Percentage"]],
          body: statsData,
          theme: "grid",
          headStyles: { fillColor: [139, 92, 246], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 4 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // High variance items
        doc.setFontSize(12);
        doc.text("Items with High Variance (>20%)", 14, yPos);
        yPos += 8;

        const highVarianceItems = suggestions.filter(s => {
          const v = s.current_price > 0 ? Math.abs((s.final_suggested_price - s.current_price) / s.current_price * 100) : 0;
          return v > 20;
        });

        if (highVarianceItems.length > 0) {
          const highVarianceData = highVarianceItems.map(s => {
            const variance = s.current_price > 0 
              ? ((s.final_suggested_price - s.current_price) / s.current_price * 100)
              : 0;
            return [
              s.item_number,
              s.description.substring(0, 40),
              s.current_price.toFixed(2),
              s.final_suggested_price.toFixed(2),
              variance.toFixed(1) + "%",
            ];
          });

          autoTable(doc, {
            startY: yPos,
            head: [["Item No.", "Description", "Current", "Suggested", "Variance"]],
            body: highVarianceData,
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text("No items with variance > 20%", 14, yPos);
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | Generated by BOQ Analysis System`,
          105,
          290,
          { align: "center" }
        );
      }

      // Save PDF
      const fileName = `enhanced_analysis_${projectName || "report"}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "تم إنشاء التقرير",
        description: `تم حفظ الملف: ${fileName}`,
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({
        title: "فشل إنشاء التقرير",
        description: error.message || "حدث خطأ أثناء إنشاء التقرير",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={suggestions.length === 0}>
          <FileText className="w-4 h-4" />
          تقرير PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            تصدير تقرير PDF تفصيلي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اختر المحتوى الذي تريد تضمينه في التقرير:
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="includeSummary"
                checked={options.includeSummary}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeSummary: !!checked }))
                }
              />
              <Label htmlFor="includeSummary">ملخص التحليل</Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="includeAnalyzerDetails"
                checked={options.includeAnalyzerDetails}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeAnalyzerDetails: !!checked }))
                }
              />
              <Label htmlFor="includeAnalyzerDetails">تفاصيل كل محلل لكل بند</Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="includeRecommendations"
                checked={options.includeRecommendations}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeRecommendations: !!checked }))
                }
              />
              <Label htmlFor="includeRecommendations">التوصيات</Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="includeVarianceAnalysis"
                checked={options.includeVarianceAnalysis}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeVarianceAnalysis: !!checked }))
                }
              />
              <Label htmlFor="includeVarianceAnalysis">تحليل الفروقات</Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="includePriceRanges"
                checked={options.includePriceRanges}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includePriceRanges: !!checked }))
                }
              />
              <Label htmlFor="includePriceRanges">نطاقات الأسعار</Label>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={generatePDF} disabled={isGenerating} className="w-full gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري إنشاء التقرير...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  تحميل تقرير PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
