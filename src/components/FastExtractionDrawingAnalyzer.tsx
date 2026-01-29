import { useState } from "react";
import { Ruler, Sparkles, FileImage, Download, Table, Loader2, SkipForward, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UploadedFile } from "./FastExtractionUploader";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface ExtractedQuantity {
  item_number: string;
  category: string;
  subcategory?: string;
  description: string;
  quantity: number;
  unit: string;
  measurement_basis?: string;
  pipe_diameter?: string;
  pipe_material?: string;
  notes?: string;
}

interface DrawingAnalysisResult {
  fileId: string;
  fileName: string;
  success: boolean;
  error?: string;
  quantities: ExtractedQuantity[];
  drawingInfo: {
    title: string;
    type: string;
    scale: string;
    date?: string;
  };
  summary: {
    totalItems: number;
    categories: string[];
    estimatedArea?: string;
    estimatedVolume?: string;
  };
}

interface FastExtractionDrawingAnalyzerProps {
  files: UploadedFile[];
  onComplete: (results: DrawingAnalysisResult[]) => void;
  onSkip: () => void;
}

const drawingTypes = [
  { id: "architectural", labelEn: "Architectural", labelAr: "معماري" },
  { id: "structural", labelEn: "Structural", labelAr: "إنشائي" },
  { id: "mechanical", labelEn: "Mechanical", labelAr: "ميكانيكا" },
  { id: "electrical", labelEn: "Electrical", labelAr: "كهرباء" },
  { id: "civil", labelEn: "Civil", labelAr: "مدني" },
  { id: "plumbing", labelEn: "Plumbing", labelAr: "صحي" },
  { id: "infrastructure", labelEn: "Infrastructure/Networks", labelAr: "شبكات وبنية تحتية" },
  { id: "general", labelEn: "General", labelAr: "عام" },
];

// Category icons and colors for infrastructure analysis
const categoryConfig: Record<string, { icon: string; color: string; labelEn: string; labelAr: string }> = {
  "Excavation": { icon: "⛏️", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", labelEn: "Excavation Works", labelAr: "أعمال الحفر" },
  "Backfilling": { icon: "🏗️", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", labelEn: "Backfilling Works", labelAr: "أعمال الردم" },
  "Pipes": { icon: "🔧", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", labelEn: "Pipes", labelAr: "المواسير" },
  "Fittings": { icon: "⚙️", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200", labelEn: "Fittings & Accessories", labelAr: "القطع والتركيبات" },
  "Manholes": { icon: "🕳️", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", labelEn: "Manholes", labelAr: "غرف التفتيش" },
  "Valves": { icon: "🚰", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200", labelEn: "Valves", labelAr: "المحابس" },
};

export default function FastExtractionDrawingAnalyzer({
  files,
  onComplete,
  onSkip,
}: FastExtractionDrawingAnalyzerProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const drawingFiles = files.filter((f) => f.category === "drawings" && f.status === "success");
  
  const [selectedFiles, setSelectedFiles] = useState<string[]>(drawingFiles.map((f) => f.id));
  const [drawingType, setDrawingType] = useState("general");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [results, setResults] = useState<DrawingAnalysisResult[]>([]);
  const [allQuantities, setAllQuantities] = useState<ExtractedQuantity[]>([]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  // Convert PDF page to base64 image
  const pageToImage = async (page: any, scale: number = 2): Promise<string> => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Cannot create canvas context');
    }
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    return canvas.toDataURL('image/png');
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.error(isArabic ? "اختر ملفاً واحداً على الأقل" : "Select at least one file");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setResults([]);
    setAllQuantities([]);

    const analysisResults: DrawingAnalysisResult[] = [];
    const filesToAnalyze = drawingFiles.filter((f) => selectedFiles.includes(f.id));

    for (let i = 0; i < filesToAnalyze.length; i++) {
      const file = filesToAnalyze[i];
      setCurrentFile(file.name);
      setProgress(((i) / filesToAnalyze.length) * 100);

      try {
        // Get the file URL from storage
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from("project-files")
          .createSignedUrl(file.storagePath || "", 3600);

        if (urlError) throw urlError;

        let images: string[] = [];
        
        // Check if it's a PDF - need to convert to images
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setCurrentFile(`${file.name} (${isArabic ? 'تحويل الصفحات...' : 'Converting pages...'})`);
          
          // Fetch the PDF and convert pages to images
          const pdfResponse = await fetch(signedUrlData.signedUrl);
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          
          const pdf = await pdfjsLib.getDocument({
            data: pdfArrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
            cMapPacked: true,
          }).promise;
          
          const numPages = pdf.numPages;
          const maxPages = Math.min(numPages, 10); // Limit to 10 pages for analysis
          
          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const imageBase64 = await pageToImage(page, 1.5); // Lower scale for faster processing
            images.push(imageBase64);
          }
          
          console.log(`Converted ${images.length} pages from PDF to images`);
        }

        // Call the analyze-drawings edge function
        const { data, error } = await supabase.functions.invoke("analyze-drawings", {
          body: {
            images: images.length > 0 ? images : undefined,
            fileUrl: images.length === 0 ? signedUrlData.signedUrl : undefined,
            fileName: file.name,
            fileType: file.type,
            drawingType,
            language,
          },
        });

        if (error) throw error;

        const result: DrawingAnalysisResult = {
          fileId: file.id,
          fileName: file.name,
          success: data.success,
          quantities: data.analysis?.quantities || [],
          drawingInfo: data.analysis?.drawing_info || { title: file.name, type: drawingType, scale: "N/A" },
          summary: data.analysis?.summary || { totalItems: 0, categories: [] },
        };

        analysisResults.push(result);
      } catch (error) {
        console.error("Error analyzing drawing:", error);
        analysisResults.push({
          fileId: file.id,
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : "Analysis failed",
          quantities: [],
          drawingInfo: { title: file.name, type: drawingType, scale: "N/A" },
          summary: { totalItems: 0, categories: [] },
        });
      }
    }

    setProgress(100);
    setResults(analysisResults);

    // Combine all quantities
    const combined = analysisResults.flatMap((r) => r.quantities);
    setAllQuantities(combined);

    setIsAnalyzing(false);

    const successCount = analysisResults.filter((r) => r.success).length;
    if (successCount > 0) {
      toast.success(
        isArabic
          ? `تم تحليل ${successCount} من ${analysisResults.length} ملفات بنجاح`
          : `Successfully analyzed ${successCount} of ${analysisResults.length} files`
      );
    }
  };

  const exportToExcel = async () => {
    if (allQuantities.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(isArabic ? "الكميات المستخرجة" : "Extracted Quantities");

    // Header row - include infrastructure columns
    sheet.columns = [
      { header: isArabic ? "م" : "#", key: "item_number", width: 8 },
      { header: isArabic ? "الفئة" : "Category", key: "category", width: 18 },
      { header: isArabic ? "الفئة الفرعية" : "Subcategory", key: "subcategory", width: 20 },
      { header: isArabic ? "الوصف" : "Description", key: "description", width: 40 },
      { header: isArabic ? "الكمية" : "Quantity", key: "quantity", width: 12 },
      { header: isArabic ? "الوحدة" : "Unit", key: "unit", width: 10 },
      { header: isArabic ? "القطر" : "Diameter", key: "pipe_diameter", width: 15 },
      { header: isArabic ? "المادة" : "Material", key: "pipe_material", width: 15 },
      { header: isArabic ? "أساس القياس" : "Measurement Basis", key: "measurement_basis", width: 30 },
      { header: isArabic ? "ملاحظات" : "Notes", key: "notes", width: 30 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Add data
    allQuantities.forEach((q, idx) => {
      sheet.addRow({
        item_number: q.item_number || String(idx + 1),
        category: q.category,
        subcategory: q.subcategory || "",
        description: q.description,
        quantity: q.quantity,
        unit: q.unit,
        pipe_diameter: q.pipe_diameter || "",
        pipe_material: q.pipe_material || "",
        measurement_basis: q.measurement_basis || "",
        notes: q.notes || "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${isArabic ? "كميات_المخططات" : "drawing_quantities"}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(isArabic ? "تم تصدير الملف بنجاح" : "File exported successfully");
  };

  const exportToPDF = () => {
    if (allQuantities.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(isArabic ? "Extracted Quantities from Drawings" : "Extracted Quantities from Drawings", 14, 20);

    const headers = ["#", "Category", "Subcategory", "Description", "Qty", "Unit", "Diameter", "Material"];
    const rows = allQuantities.map((q, idx) => [
      q.item_number || String(idx + 1),
      q.category,
      q.subcategory || "",
      q.description.substring(0, 40),
      String(q.quantity),
      q.unit,
      q.pipe_diameter || "-",
      q.pipe_material || "-",
      q.measurement_basis?.substring(0, 30) || "",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${isArabic ? "كميات_المخططات" : "drawing_quantities"}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success(isArabic ? "تم تصدير الملف بنجاح" : "File exported successfully");
  };

  const handleComplete = () => {
    onComplete(results);
  };

  // If no drawing files, show skip message
  if (drawingFiles.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileImage className="h-16 w-16 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">
            {isArabic ? "لا توجد ملفات مخططات" : "No Drawing Files"}
          </h3>
          <p className="text-muted-foreground mt-2">
            {isArabic
              ? "لم يتم العثور على ملفات مصنفة كرسومات. يمكنك تخطي هذه الخطوة."
              : "No files classified as drawings were found. You can skip this step."}
          </p>
        </div>
        <Button onClick={onSkip} className="gap-2">
          <SkipForward className="h-4 w-4" />
          {isArabic ? "تخطي" : "Skip"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            {isArabic ? "تحليل المخططات لحصر الكميات" : "Drawing Quantity Analysis"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? "استخراج الكميات تلقائياً من المخططات باستخدام الذكاء الاصطناعي"
              : "Automatically extract quantities from drawings using AI"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSkip} className="gap-2">
            <SkipForward className="h-4 w-4" />
            {isArabic ? "تخطي" : "Skip"}
          </Button>
        </div>
      </div>

      {/* Drawing Type Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">
          {isArabic ? "نوع المخطط:" : "Drawing Type:"}
        </label>
        <Select value={drawingType} onValueChange={setDrawingType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {drawingTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {isArabic ? type.labelAr : type.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Files Selection */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">
            {isArabic
              ? `الملفات المتاحة للتحليل (${drawingFiles.length})`
              : `Available Files for Analysis (${drawingFiles.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {drawingFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                selectedFiles.includes(file.id)
                  ? "bg-primary/5 border-primary"
                  : "hover:bg-muted/50"
              )}
              onClick={() => toggleFileSelection(file.id)}
            >
              <Checkbox
                checked={selectedFiles.includes(file.id)}
                onCheckedChange={() => toggleFileSelection(file.id)}
              />
              <FileImage className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {isArabic ? "رسومات" : "Drawings"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="border-primary/50">
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {isArabic ? `جاري تحليل: ${currentFile}` : `Analyzing: ${currentFile}`}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {Math.round(progress)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && !isAnalyzing && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">{allQuantities.length}</p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "إجمالي البنود" : "Total Items"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {results.filter((r) => r.success).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "ملفات ناجحة" : "Successful Files"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {[...new Set(allQuantities.map((q) => q.category))].length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "الفئات" : "Categories"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">
                  {[...new Set(allQuantities.map((q) => q.unit))].length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "الوحدات" : "Units"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Status */}
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.fileId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  result.success ? "bg-primary/5 border-primary/30" : "bg-destructive/5 border-destructive/30"
                )}
              >
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="flex-1 text-sm">{result.fileName}</span>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success
                    ? isArabic
                      ? `${result.quantities.length} بند`
                      : `${result.quantities.length} items`
                    : isArabic
                    ? "فشل"
                    : "Failed"}
                </Badge>
              </div>
            ))}
          </div>

          {/* Quantities Table - Grouped by Category for Infrastructure */}
          {allQuantities.length > 0 && (
            <Card>
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  {isArabic ? "الكميات المستخرجة" : "Extracted Quantities"}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                    <Download className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Category Summary Cards for Infrastructure */}
                {drawingType === "infrastructure" && (
                  <div className="p-4 border-b grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(
                      allQuantities.reduce((acc, q) => {
                        const cat = q.category || "Other";
                        if (!acc[cat]) acc[cat] = { count: 0, totalQty: 0, unit: q.unit };
                        acc[cat].count++;
                        acc[cat].totalQty += q.quantity || 0;
                        return acc;
                      }, {} as Record<string, { count: number; totalQty: number; unit: string }>)
                    ).map(([category, data]) => {
                      const config = categoryConfig[category] || { icon: "📦", color: "bg-gray-100 text-gray-800", labelEn: category, labelAr: category };
                      return (
                        <div key={category} className={cn("p-3 rounded-lg text-center", config.color)}>
                          <div className="text-2xl mb-1">{config.icon}</div>
                          <div className="text-xs font-medium">{isArabic ? config.labelAr : config.labelEn}</div>
                          <div className="text-lg font-bold">{data.totalQty.toLocaleString()}</div>
                          <div className="text-xs opacity-75">{data.unit} ({data.count} {isArabic ? "بند" : "items"})</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="max-h-[400px] overflow-auto">
                  <UITable>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">{isArabic ? "م" : "#"}</TableHead>
                        <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                        {drawingType === "infrastructure" && (
                          <TableHead>{isArabic ? "الفئة الفرعية" : "Subcategory"}</TableHead>
                        )}
                        <TableHead className="min-w-[200px]">{isArabic ? "الوصف" : "Description"}</TableHead>
                        <TableHead className="text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                        <TableHead>{isArabic ? "الوحدة" : "Unit"}</TableHead>
                        {drawingType === "infrastructure" && (
                          <>
                            <TableHead>{isArabic ? "القطر" : "Diameter"}</TableHead>
                            <TableHead>{isArabic ? "المادة" : "Material"}</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allQuantities.slice(0, 50).map((q, idx) => {
                        const config = categoryConfig[q.category] || { icon: "📦", color: "bg-gray-100 text-gray-800" };
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{q.item_number || idx + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1", config.color)}>
                                <span>{config.icon}</span> {q.category}
                              </Badge>
                            </TableCell>
                            {drawingType === "infrastructure" && (
                              <TableCell className="text-sm text-muted-foreground">{q.subcategory || "-"}</TableCell>
                            )}
                            <TableCell className="max-w-[300px] truncate">{q.description}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{q.quantity.toLocaleString()}</TableCell>
                            <TableCell>{q.unit}</TableCell>
                            {drawingType === "infrastructure" && (
                              <>
                                <TableCell className="font-mono text-sm">{q.pipe_diameter || "-"}</TableCell>
                                <TableCell className="text-sm">{q.pipe_material || "-"}</TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </UITable>
                </div>
                {allQuantities.length > 50 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">
                    {isArabic
                      ? `عرض 50 من ${allQuantities.length} بند. صدّر الملف لرؤية الكل.`
                      : `Showing 50 of ${allQuantities.length} items. Export to see all.`}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {isArabic
            ? `${selectedFiles.length} ملفات محددة للتحليل`
            : `${selectedFiles.length} files selected for analysis`}
        </p>
        <div className="flex gap-2">
          {results.length === 0 ? (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || selectedFiles.length === 0}
              className="gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isArabic ? "تحليل المخططات" : "Analyze Drawings"}
            </Button>
          ) : (
            <Button onClick={handleComplete} className="gap-2">
              {isArabic ? "التالي" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
