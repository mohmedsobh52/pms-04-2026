import { useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Ruler,
  FileImage,
  Loader2,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Calculator,
  Layers,
  FileSpreadsheet,
  Filter,
  File,
  CircleDot,
  FileType
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";

interface ProjectAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  category: string | null;
  analysis_result: any;
  file_size?: number | null;
}

interface DrawingQuantityExtractorProps {
  attachments: ProjectAttachment[];
  onAnalysisComplete?: () => void;
}

interface ExtractedQuantity {
  item_number: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  measurement_basis: string;
  notes: string;
}

const DRAWING_TYPES = [
  { value: "architectural", labelEn: "Architectural", labelAr: "معماري", icon: "🏛️" },
  { value: "structural", labelEn: "Structural", labelAr: "إنشائي", icon: "🏗️" },
  { value: "mep", labelEn: "MEP (Mechanical/Electrical/Plumbing)", labelAr: "ميكانيكا وكهرباء وسباكة", icon: "⚡" },
  { value: "civil", labelEn: "Civil", labelAr: "مدني", icon: "🛤️" },
  { value: "landscape", labelEn: "Landscape", labelAr: "تنسيق الموقع", icon: "🌳" },
  { value: "general", labelEn: "General", labelAr: "عام", icon: "📄" },
];

const FILE_TYPE_FILTERS = [
  { value: "all", labelEn: "All Files", labelAr: "كل الملفات", color: "bg-slate-500" },
  { value: "pdf", labelEn: "PDF", labelAr: "PDF", color: "bg-red-500" },
  { value: "dwg", labelEn: "DWG/DXF", labelAr: "DWG/DXF", color: "bg-blue-500" },
  { value: "image", labelEn: "Images", labelAr: "صور", color: "bg-purple-500" },
];

export function DrawingQuantityExtractor({ 
  attachments, 
  onAnalysisComplete 
}: DrawingQuantityExtractorProps) {
  const { isArabic } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [drawingType, setDrawingType] = useState("general");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("select");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");

  // Filter drawing files (PDF, DWG-like)
  const drawingFiles = attachments.filter(a => 
    a.file_type?.includes("pdf") || 
    a.file_name.toLowerCase().endsWith(".dwg") ||
    a.file_name.toLowerCase().endsWith(".dxf") ||
    a.file_type?.includes("image") ||
    a.category === "drawings"
  );

  // Filter by file type
  const filteredDrawingFiles = useMemo(() => {
    if (fileTypeFilter === "all") return drawingFiles;
    if (fileTypeFilter === "pdf") return drawingFiles.filter(f => f.file_type?.includes("pdf") || f.file_name.toLowerCase().endsWith(".pdf"));
    if (fileTypeFilter === "dwg") return drawingFiles.filter(f => f.file_name.toLowerCase().endsWith(".dwg") || f.file_name.toLowerCase().endsWith(".dxf"));
    if (fileTypeFilter === "image") return drawingFiles.filter(f => f.file_type?.includes("image"));
    return drawingFiles;
  }, [drawingFiles, fileTypeFilter]);

  // Count files per type
  const fileTypeCounts = useMemo(() => {
    return {
      all: drawingFiles.length,
      pdf: drawingFiles.filter(f => f.file_type?.includes("pdf") || f.file_name.toLowerCase().endsWith(".pdf")).length,
      dwg: drawingFiles.filter(f => f.file_name.toLowerCase().endsWith(".dwg") || f.file_name.toLowerCase().endsWith(".dxf")).length,
      image: drawingFiles.filter(f => f.file_type?.includes("image")).length,
    };
  }, [drawingFiles]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleAllFiltered = () => {
    const filteredIds = filteredDrawingFiles.map(f => f.id);
    const allSelected = filteredIds.every(id => selectedFiles.includes(id));
    
    if (allSelected) {
      setSelectedFiles(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedFiles(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const selectByFileType = (type: string) => {
    let filesToSelect: ProjectAttachment[] = [];
    if (type === "pdf") filesToSelect = drawingFiles.filter(f => f.file_type?.includes("pdf") || f.file_name.toLowerCase().endsWith(".pdf"));
    else if (type === "dwg") filesToSelect = drawingFiles.filter(f => f.file_name.toLowerCase().endsWith(".dwg") || f.file_name.toLowerCase().endsWith(".dxf"));
    else if (type === "image") filesToSelect = drawingFiles.filter(f => f.file_type?.includes("image"));
    
    const newSelected = [...new Set([...selectedFiles, ...filesToSelect.map(f => f.id)])];
    setSelectedFiles(newSelected);
    toast.success(isArabic 
      ? `تم تحديد ${filesToSelect.length} ملف`
      : `Selected ${filesToSelect.length} files`
    );
  };

  const getFileTypeIcon = (file: ProjectAttachment) => {
    if (file.file_type?.includes("pdf") || file.file_name.toLowerCase().endsWith(".pdf")) {
      return <File className="w-4 h-4 text-red-500" />;
    }
    if (file.file_name.toLowerCase().endsWith(".dwg") || file.file_name.toLowerCase().endsWith(".dxf")) {
      return <FileType className="w-4 h-4 text-blue-500" />;
    }
    if (file.file_type?.includes("image")) {
      return <FileImage className="w-4 h-4 text-purple-500" />;
    }
    return <FileImage className="w-4 h-4 text-muted-foreground" />;
  };

  const getFileTypeBadge = (file: ProjectAttachment) => {
    if (file.file_type?.includes("pdf") || file.file_name.toLowerCase().endsWith(".pdf")) {
      return <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-600 border-red-500/30">PDF</Badge>;
    }
    if (file.file_name.toLowerCase().endsWith(".dwg")) {
      return <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-500/30">DWG</Badge>;
    }
    if (file.file_name.toLowerCase().endsWith(".dxf")) {
      return <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-500/30">DXF</Badge>;
    }
    if (file.file_type?.includes("image")) {
      return <Badge variant="outline" className="text-[10px] h-5 bg-purple-500/10 text-purple-600 border-purple-500/30">Image</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] h-5">Drawing</Badge>;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.error(isArabic ? "الرجاء اختيار ملفات للتحليل" : "Please select files to analyze");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setResults([]);
    setActiveTab("results");

    const totalFiles = selectedFiles.length;
    const newResults: any[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileId = selectedFiles[i];
      const file = attachments.find(a => a.id === fileId);
      if (!file) continue;

      setCurrentFile(file.file_name);
      setProgress(((i + 1) / totalFiles) * 100);

      try {
        // Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("project-files")
          .download(file.file_path);

        if (downloadError) throw downloadError;

        // Extract content (for now, using file metadata)
        let content = `Drawing file: ${file.file_name}\nType: ${drawingType}`;
        
        // For PDF files, try to extract text
        if (file.file_type?.includes("pdf")) {
          content = `PDF Drawing: ${file.file_name}\nDrawing Type: ${drawingType}\nFile size: ${fileData.size} bytes`;
        }

        // Call the analysis function
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke("analyze-drawings", {
          body: {
            fileContent: content,
            fileName: file.file_name,
            fileType: file.file_type,
            drawingType
          }
        });

        if (analysisError) throw analysisError;

        if (analysisResult.success) {
          newResults.push({
            fileName: file.file_name,
            fileId: file.id,
            success: true,
            data: analysisResult.analysis
          });

          // Update the attachment with analysis result
          await supabase
            .from("project_attachments")
            .update({
              is_analyzed: true,
              analysis_result: {
                ...file.analysis_result,
                quantity_takeoff: analysisResult.analysis
              }
            })
            .eq("id", file.id);
        } else {
          newResults.push({
            fileName: file.file_name,
            fileId: file.id,
            success: false,
            error: analysisResult.error
          });
        }
      } catch (error: any) {
        console.error(`Error analyzing ${file.file_name}:`, error);
        newResults.push({
          fileName: file.file_name,
          fileId: file.id,
          success: false,
          error: error.message
        });
      }
    }

    setResults(newResults);
    setIsAnalyzing(false);
    setCurrentFile("");
    
    const successCount = newResults.filter(r => r.success).length;
    toast.success(
      isArabic 
        ? `تم تحليل ${successCount} من ${totalFiles} ملفات بنجاح`
        : `Successfully analyzed ${successCount} of ${totalFiles} files`
    );

    if (onAnalysisComplete) {
      onAnalysisComplete();
    }
  };

  const getAllQuantities = (): ExtractedQuantity[] => {
    const quantities: ExtractedQuantity[] = [];
    results.forEach(result => {
      if (result.success && result.data?.quantities) {
        result.data.quantities.forEach((q: ExtractedQuantity) => {
          quantities.push({
            ...q,
            notes: `${q.notes || ''} [Source: ${result.fileName}]`
          });
        });
      }
    });
    return quantities;
  };

  const exportToExcel = async () => {
    const quantities = getAllQuantities();
    if (quantities.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const data = quantities.map((q, index) => ({
      "Item No.": q.item_number || index + 1,
      "Category": q.category,
      "Description": q.description,
      "Quantity": q.quantity,
      "Unit": q.unit,
      "Measurement Basis": q.measurement_basis,
      "Notes": q.notes
    }));

    const wb = createWorkbook();
    addJsonSheet(wb, data, "Quantities");
    await downloadWorkbook(wb, `Quantity_Takeoff_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const exportToPDF = () => {
    const quantities = getAllQuantities();
    if (quantities.length === 0) {
      toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Quantity Takeoff Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    (doc as any).autoTable({
      startY: 40,
      head: [["#", "Category", "Description", "Qty", "Unit", "Notes"]],
      body: quantities.map((q, index) => [
        q.item_number || index + 1,
        q.category,
        q.description.substring(0, 40),
        q.quantity,
        q.unit,
        q.notes.substring(0, 30)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234] }
    });

    doc.save(`Quantity_Takeoff_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(isArabic ? "تم التصدير بنجاح" : "Exported successfully");
  };

  const filteredSelectedCount = filteredDrawingFiles.filter(f => selectedFiles.includes(f.id)).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Ruler className="w-4 h-4" />
          {isArabic ? "حصر الكميات" : "Quantity Takeoff"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span>{isArabic ? "حصر الكميات من المخططات" : "Quantity Takeoff from Drawings"}</span>
              <DialogDescription className="mt-0.5 font-normal">
                {isArabic 
                  ? "استخرج الكميات من مخططات PDF و DWG باستخدام الذكاء الاصطناعي"
                  : "Extract quantities from PDF and DWG drawings using AI"}
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="select" className="gap-2">
              <FileImage className="w-4 h-4" />
              {isArabic ? "اختيار الملفات" : "Select Files"}
            </TabsTrigger>
            <TabsTrigger value="results" disabled={results.length === 0} className="gap-2">
              <Layers className="w-4 h-4" />
              {isArabic ? "النتائج" : "Results"}
              {results.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {results.filter(r => r.success).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            {/* Drawing Type Selection */}
            <div className="space-y-2 flex-shrink-0">
              <label className="text-sm font-medium">
                {isArabic ? "نوع المخططات" : "Drawing Type"}
              </label>
              <Select value={drawingType} onValueChange={setDrawingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAWING_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        {isArabic ? type.labelAr : type.labelEn}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Type Filter Chips */}
            <div className="space-y-3 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                {isArabic ? "فلترة حسب نوع الملف:" : "Filter by File Type:"}
              </div>
              <div className="flex flex-wrap gap-2">
                {FILE_TYPE_FILTERS.map((filter) => {
                  const count = fileTypeCounts[filter.value as keyof typeof fileTypeCounts] || 0;
                  if (filter.value !== "all" && count === 0) return null;
                  
                  const isActive = fileTypeFilter === filter.value;
                  
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setFileTypeFilter(filter.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        "border hover:shadow-sm",
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <span>{isArabic ? filter.labelAr : filter.labelEn}</span>
                      <Badge 
                        variant={isActive ? "secondary" : "outline"} 
                        className={cn("h-5 px-1.5 text-xs", isActive && "bg-primary-foreground/20 text-primary-foreground")}
                      >
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Quick Selection Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {isArabic ? "اختيار سريع:" : "Quick select:"}
                </span>
                {FILE_TYPE_FILTERS.filter(f => f.value !== "all" && (fileTypeCounts[f.value as keyof typeof fileTypeCounts] || 0) > 0).map(filter => (
                  <Button
                    key={filter.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => selectByFileType(filter.value)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <CircleDot className="w-3 h-3" />
                    {isArabic ? `كل ${filter.labelAr}` : `All ${filter.labelEn}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Select All for filtered */}
            <div className="flex items-center justify-between pb-2 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-drawings"
                  checked={filteredDrawingFiles.length > 0 && filteredSelectedCount === filteredDrawingFiles.length}
                  onCheckedChange={toggleAllFiltered}
                />
                <label htmlFor="select-all-drawings" className="text-sm font-medium cursor-pointer">
                  {isArabic ? "تحديد الكل المعروض" : "Select All Shown"}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{filteredDrawingFiles.length} {isArabic ? "ملف" : "files"}</Badge>
                {selectedFiles.length > 0 && (
                  <Badge variant="default">{selectedFiles.length} {isArabic ? "محدد" : "selected"}</Badge>
                )}
              </div>
            </div>

            {/* File Selection */}
            <ScrollArea className="flex-1 min-h-0">
              {filteredDrawingFiles.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <FileImage className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {fileTypeFilter === "all"
                        ? (isArabic ? "لا توجد مخططات. يرجى رفع ملفات PDF أو DWG" : "No drawings found. Please upload PDF or DWG files")
                        : (isArabic ? "لا توجد ملفات من هذا النوع" : "No files of this type")
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 pr-3">
                  {filteredDrawingFiles.map(file => {
                    const isSelected = selectedFiles.includes(file.id);
                    return (
                      <Card 
                        key={file.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          "hover:shadow-md hover:border-primary/50",
                          isSelected && "border-primary bg-primary/5 shadow-sm"
                        )}
                        onClick={() => toggleFileSelection(file.id)}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleFileSelection(file.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0"
                            />
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              isSelected ? "bg-primary/10" : "bg-muted"
                            )}>
                              {getFileTypeIcon(file)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">{file.file_name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {getFileTypeBadge(file)}
                                {file.file_size && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatFileSize(file.file_size)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Progress */}
            {isAnalyzing && (
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    {isArabic ? "جاري التحليل..." : "Analyzing..."}
                  </span>
                  <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                {currentFile && (
                  <p className="text-xs text-muted-foreground truncate">
                    {currentFile}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t flex-shrink-0">
              <Button
                onClick={handleAnalyze}
                disabled={selectedFiles.length === 0 || isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4" />
                )}
                {isArabic 
                  ? `تحليل ${selectedFiles.length} ملف`
                  : `Analyze ${selectedFiles.length} File(s)`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "نجاح" : "Successful"}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "فشل" : "Failed"}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {getAllQuantities().length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "البنود" : "Items"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quantities Table */}
            {getAllQuantities().length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    {isArabic ? "الكميات المستخرجة" : "Extracted Quantities"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                          <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                          <TableHead className="text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                          <TableHead>{isArabic ? "الوحدة" : "Unit"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAllQuantities().map((q, index) => (
                          <TableRow key={index}>
                            <TableCell>{q.item_number || index + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{q.category}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{q.description}</TableCell>
                            <TableCell className="text-right font-medium">{q.quantity}</TableCell>
                            <TableCell>{q.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Buttons */}
            {getAllQuantities().length > 0 && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={exportToExcel} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  {isArabic ? "تصدير Excel" : "Export Excel"}
                </Button>
                <Button variant="outline" onClick={exportToPDF} className="gap-2">
                  <Download className="w-4 h-4" />
                  {isArabic ? "تصدير PDF" : "Export PDF"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
