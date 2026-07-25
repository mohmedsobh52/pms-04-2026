import { useEffect, useMemo, useState } from "react";
import { Ruler, Sparkles, FileImage, Download, Table, Loader2, SkipForward, AlertCircle, CheckCircle2, Search, Layers, ChevronLeft, ChevronRight, Copy, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

// Normalize quantities from AI response to handle different field names and types
const normalizeQuantities = (quantities: any[]): ExtractedQuantity[] => {
  if (!Array.isArray(quantities)) {
    console.warn("Quantities is not an array:", quantities);
    return [];
  }
  
  return quantities.map((q, idx) => {
    // Extract quantity from multiple possible field names
    let qty = 0;
    const rawQty = q?.quantity ?? q?.qty ?? q?.Quantity ?? q?.QTY ?? q?.amount ?? q?.Amount ?? 0;
    
    // Convert to number safely
    if (typeof rawQty === 'number' && !isNaN(rawQty)) {
      qty = rawQty;
    } else if (typeof rawQty === 'string') {
      // Remove commas, Arabic commas, and non-numeric chars except decimal point
      const cleaned = rawQty.replace(/[,،\s]/g, '').replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      qty = isNaN(parsed) ? 0 : parsed;
    }
    
    return {
      item_number: String(q?.item_number || q?.itemNumber || q?.no || q?.num || idx + 1),
      category: q?.category || q?.Category || 'General',
      subcategory: q?.subcategory || q?.subCategory || q?.sub_category || '',
      description: q?.description || q?.Description || q?.desc || q?.name || '',
      quantity: qty,
      unit: q?.unit || q?.Unit || '-',
      measurement_basis: q?.measurement_basis || q?.measurementBasis || q?.basis || '',
      pipe_diameter: q?.pipe_diameter || q?.pipeDiameter || q?.diameter || q?.Diameter || '',
      pipe_material: q?.pipe_material || q?.pipeMaterial || q?.material || q?.Material || '',
      notes: q?.notes || q?.Notes || q?.remarks || ''
    };
  }).filter(q => q.description && q.description.trim() !== '');
};

interface FastExtractionDrawingAnalyzerProps {
  files: UploadedFile[];
  onComplete: (results: DrawingAnalysisResult[]) => void;
  onSkip: () => void;
  onQuantitiesChange?: (quantities: ExtractedQuantity[]) => void;
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
  onQuantitiesChange,
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
  const [searchQ, setSearchQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [wastePct, setWastePct] = useState<number>(0);
  const [showAggregate, setShowAggregate] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  // Push results upward for global suggestions
  useEffect(() => {
    onQuantitiesChange?.(allQuantities);
  }, [allQuantities, onQuantitiesChange]);

  // Reset paging when filters or dataset change
  useEffect(() => { setPage(1); }, [searchQ, categoryFilter, allQuantities]);

  const wasteFactor = 1 + (Number(wastePct) || 0) / 100;

  // Apply waste factor derivation for a displayed quantity
  const displayQty = (q: number | undefined | null) =>
    Math.round(((Number(q) || 0) * wasteFactor) * 100) / 100;

  const categories = useMemo(
    () => Array.from(new Set(allQuantities.map((q) => q.category || "General"))).sort(),
    [allQuantities]
  );

  const filteredQuantities = useMemo(() => {
    const s = searchQ.trim().toLowerCase();
    return allQuantities.filter((q) => {
      if (categoryFilter !== "all" && (q.category || "General") !== categoryFilter) return false;
      if (!s) return true;
      return (
        (q.description || "").toLowerCase().includes(s) ||
        (q.category || "").toLowerCase().includes(s) ||
        (q.subcategory || "").toLowerCase().includes(s) ||
        (q.pipe_material || "").toLowerCase().includes(s) ||
        (q.pipe_diameter || "").toLowerCase().includes(s) ||
        (q.item_number || "").toLowerCase().includes(s)
      );
    });
  }, [allQuantities, searchQ, categoryFilter]);

  // Aggregation: sum quantities grouped by (category, unit) — apply waste factor
  const aggregatedRows = useMemo(() => {
    const map = new Map<string, { category: string; unit: string; qty: number; items: number }>();
    for (const q of filteredQuantities) {
      const cat = q.category || "General";
      const unit = q.unit || "-";
      const key = `${cat}|||${unit}`;
      const row = map.get(key) || { category: cat, unit, qty: 0, items: 0 };
      row.qty += (Number(q.quantity) || 0);
      row.items += 1;
      map.set(key, row);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, qty: Math.round(r.qty * wasteFactor * 100) / 100 }))
      .sort((a, b) => b.qty - a.qty);
  }, [filteredQuantities, wasteFactor]);

  const totalPages = Math.max(1, Math.ceil(filteredQuantities.length / pageSize));
  const pagedQuantities = filteredQuantities.slice((page - 1) * pageSize, page * pageSize);

  const navigate = useNavigate();

  const copyFilteredCsv = async () => {
    const headers = ["#", "Category", "Subcategory", "Description", "Quantity", "WithWaste", "Unit", "Diameter", "Material"];
    const lines = [headers.join(",")];
    filteredQuantities.forEach((q, i) => {
      const base = Number(q.quantity) || 0;
      const row = [
        q.item_number || i + 1,
        q.category || "",
        q.subcategory || "",
        `"${(q.description || "").replace(/"/g, '""')}"`,
        base,
        displayQty(base),
        q.unit || "",
        q.pipe_diameter || "",
        q.pipe_material || "",
      ];
      lines.push(row.join(","));
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success(isArabic ? `تم نسخ ${filteredQuantities.length} بند` : `Copied ${filteredQuantities.length} items`);
    } catch {
      toast.error(isArabic ? "تعذّر النسخ" : "Copy failed");
    }
  };

  const sendToNewProject = () => {
    if (filteredQuantities.length === 0) {
      toast.error(isArabic ? "لا توجد بنود لإرسالها" : "No items to send");
      return;
    }
    const payload = filteredQuantities.map((q, i) => {
      const base = Number(q.quantity) || 0;
      return {
        item_number: String(q.item_number || i + 1),
        description: q.description || "",
        category: q.category || "General",
        unit: q.unit || "",
        quantity: displayQty(base),
        unit_price: 0,
        total_price: 0,
      };
    });
    try {
      sessionStorage.setItem("fast-extraction:pending-items", JSON.stringify({
        items: payload,
        source: "fast-extraction",
        wastePct,
        createdAt: new Date().toISOString(),
      }));
      toast.success(isArabic ? `تم تجهيز ${payload.length} بند لمشروع جديد` : `Prepared ${payload.length} items for new project`);
      navigate("/new-project");
    } catch (e) {
      toast.error(isArabic ? "تعذّر الإرسال" : "Failed to send");
    }
  };


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

        // Normalize quantities from AI response
        const rawQuantities = data.analysis?.quantities || [];
        console.log("Raw AI quantities sample:", JSON.stringify(rawQuantities.slice(0, 2)));
        
        const normalizedQuantities = normalizeQuantities(rawQuantities);
        console.log("Normalized quantities sample:", JSON.stringify(normalizedQuantities.slice(0, 2)));

        const result: DrawingAnalysisResult = {
          fileId: file.id,
          fileName: file.name,
          success: data.success,
          quantities: normalizedQuantities,
          drawingInfo: data.analysis?.drawing_info || { title: file.name, type: drawingType, scale: "N/A" },
          summary: {
            totalItems: normalizedQuantities.length,
            categories: [...new Set(normalizedQuantities.map(q => q.category))],
            ...data.analysis?.summary
          },
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

          {/* Toolbar: search + category filter + waste factor + aggregation toggle */}
          {allQuantities.length > 0 && (
            <Card>
              <CardContent className="py-3 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder={isArabic ? "بحث في الوصف / الفئة / المادة…" : "Search description / category / material…"}
                    className="ps-8 h-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "كل الفئات" : "All categories"}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">
                    {isArabic ? "معامل الهدر %" : "Waste %"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={wastePct}
                    onChange={(e) => setWastePct(Number(e.target.value) || 0)}
                    className="w-20 h-9"
                  />
                </div>
                <Button
                  variant={showAggregate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAggregate((v) => !v)}
                  className="gap-1.5"
                >
                  <Layers className="h-4 w-4" />
                  {isArabic ? "تجميع حسب الفئة/الوحدة" : "Group by category/unit"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Aggregation table */}
          {allQuantities.length > 0 && showAggregate && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {isArabic ? "إجمالي الكميات (مع الهدر)" : "Total Quantities (with waste)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                      <TableHead>{isArabic ? "الوحدة" : "Unit"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "بنود" : "Items"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.category}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.items}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {r.qty.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </UITable>
              </CardContent>
            </Card>
          )}

          {/* Quantities Table - Grouped by Category for Infrastructure */}
          {allQuantities.length > 0 && (
            <Card>
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  {isArabic ? "الكميات المستخرجة" : "Extracted Quantities"}
                  <Badge variant="secondary" className="ms-2">
                    {filteredQuantities.length}/{allQuantities.length}
                  </Badge>
                  {wastePct > 0 && (
                    <Badge variant="outline" className="text-amber-700 border-amber-500/50">
                      +{wastePct}% {isArabic ? "هدر" : "waste"}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={copyFilteredCsv} className="gap-2">
                    <Copy className="h-4 w-4" />
                    {isArabic ? "نسخ CSV" : "Copy CSV"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                    <Download className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button size="sm" onClick={sendToNewProject} className="gap-2">
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    {isArabic ? "إرسال لمشروع جديد" : "Send to New Project"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Category Summary Cards for Infrastructure */}
                {drawingType === "infrastructure" && (
                  <div className="p-4 border-b grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(
                      filteredQuantities.reduce((acc, q) => {
                        const cat = q.category || "Other";
                        if (!acc[cat]) acc[cat] = { count: 0, totalQty: 0, unit: q.unit || '-' };
                        acc[cat].count++;
                        acc[cat].totalQty += (typeof q.quantity === 'number' ? q.quantity : 0);
                        return acc;
                      }, {} as Record<string, { count: number; totalQty: number; unit: string }>)
                    ).map(([category, data]) => {
                      const config = categoryConfig[category] || { icon: "📦", color: "bg-gray-100 text-gray-800", labelEn: category, labelAr: category };
                      const adjusted = Math.round(data.totalQty * wasteFactor * 100) / 100;
                      return (
                        <div key={category} className={cn("p-3 rounded-lg text-center", config.color)}>
                          <div className="text-2xl mb-1">{config.icon}</div>
                          <div className="text-xs font-medium">{isArabic ? config.labelAr : config.labelEn}</div>
                          <div className="text-lg font-bold">{adjusted.toLocaleString()}</div>
                          <div className="text-xs opacity-75">{data.unit} ({data.count} {isArabic ? "بند" : "items"})</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-[520px] overflow-auto">
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
                        {wastePct > 0 && (
                          <TableHead className="text-right">{isArabic ? "بعد الهدر" : "With Waste"}</TableHead>
                        )}
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
                      {pagedQuantities.map((q, idx) => {
                        const globalIdx = (page - 1) * pageSize + idx;
                        const config = categoryConfig[q.category] || { icon: "📦", color: "bg-gray-100 text-gray-800" };
                        const baseQty = typeof q.quantity === 'number' ? q.quantity : 0;
                        return (
                          <TableRow key={globalIdx}>
                            <TableCell className="font-medium">{q.item_number || globalIdx + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1", config.color)}>
                                <span>{config.icon}</span> {q.category}
                              </Badge>
                            </TableCell>
                            {drawingType === "infrastructure" && (
                              <TableCell className="text-sm text-muted-foreground">{q.subcategory || "-"}</TableCell>
                            )}
                            <TableCell className="max-w-[300px] truncate" title={q.description}>{q.description}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{baseQty.toLocaleString()}</TableCell>
                            {wastePct > 0 && (
                              <TableCell className="text-right font-mono text-amber-700">
                                {displayQty(baseQty).toLocaleString()}
                              </TableCell>
                            )}
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
                      {pagedQuantities.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                            {isArabic ? "لا توجد نتائج مطابقة" : "No matching results"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </UITable>
                </div>

                {filteredQuantities.length > pageSize && (
                  <div className="p-3 flex items-center justify-between border-t text-sm">
                    <span className="text-muted-foreground">
                      {isArabic
                        ? `عرض ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredQuantities.length)} من ${filteredQuantities.length}`
                        : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredQuantities.length)} of ${filteredQuantities.length}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        <ChevronRight className={cn("h-4 w-4", !isArabic && "hidden")} />
                        <ChevronLeft className={cn("h-4 w-4", isArabic && "hidden")} />
                      </Button>
                      <span className="tabular-nums">{page} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        <ChevronLeft className={cn("h-4 w-4", !isArabic && "hidden")} />
                        <ChevronRight className={cn("h-4 w-4", isArabic && "hidden")} />
                      </Button>
                    </div>
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
