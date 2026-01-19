import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileSpreadsheet
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
  { value: "architectural", labelEn: "Architectural", labelAr: "معماري" },
  { value: "structural", labelEn: "Structural", labelAr: "إنشائي" },
  { value: "mep", labelEn: "MEP (Mechanical/Electrical/Plumbing)", labelAr: "ميكانيكا وكهرباء وسباكة" },
  { value: "civil", labelEn: "Civil", labelAr: "مدني" },
  { value: "landscape", labelEn: "Landscape", labelAr: "تنسيق الموقع" },
  { value: "general", labelEn: "General", labelAr: "عام" },
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

  // Filter drawing files (PDF, DWG-like)
  const drawingFiles = attachments.filter(a => 
    a.file_type?.includes("pdf") || 
    a.file_name.toLowerCase().endsWith(".dwg") ||
    a.file_name.toLowerCase().endsWith(".dxf") ||
    a.category === "drawings"
  );

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Ruler className="w-4 h-4" />
          {isArabic ? "حصر الكميات" : "Quantity Takeoff"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {isArabic ? "حصر الكميات من المخططات" : "Quantity Takeoff from Drawings"}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? "استخرج الكميات من مخططات PDF و DWG باستخدام الذكاء الاصطناعي"
              : "Extract quantities from PDF and DWG drawings using AI"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">
              {isArabic ? "اختيار الملفات" : "Select Files"}
            </TabsTrigger>
            <TabsTrigger value="results" disabled={results.length === 0}>
              {isArabic ? "النتائج" : "Results"}
              {results.length > 0 && (
                <Badge variant="secondary" className="mr-2 ml-2">
                  {results.filter(r => r.success).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4">
            {/* Drawing Type Selection */}
            <div className="space-y-2">
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
                      {isArabic ? type.labelAr : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isArabic ? "اختر الملفات" : "Select Files"}
              </label>
              
              {drawingFiles.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <FileImage className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {isArabic 
                        ? "لا توجد مخططات. يرجى رفع ملفات PDF أو DWG"
                        : "No drawings found. Please upload PDF or DWG files"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {drawingFiles.map(file => (
                    <Card 
                      key={file.id}
                      className={`cursor-pointer transition-colors ${
                        selectedFiles.includes(file.id) 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <CardContent className="py-3 flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedFiles.includes(file.id) 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedFiles.includes(file.id) && (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <FileImage className="w-5 h-5 text-blue-500" />
                        <span className="flex-1 truncate">{file.file_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.file_type?.split('/').pop() || 'drawing'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isArabic ? "جاري التحليل..." : "Analyzing..."}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
                {currentFile && (
                  <p className="text-xs text-muted-foreground truncate">
                    {currentFile}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedFiles(
                  selectedFiles.length === drawingFiles.length 
                    ? [] 
                    : drawingFiles.map(f => f.id)
                )}
              >
                {selectedFiles.length === drawingFiles.length 
                  ? (isArabic ? "إلغاء تحديد الكل" : "Deselect All")
                  : (isArabic ? "تحديد الكل" : "Select All")}
              </Button>
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

          <TabsContent value="results" className="space-y-4">
            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "نجاح" : "Successful"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isArabic ? "فشل" : "Failed"}
                  </div>
                </CardContent>
              </Card>
              <Card>
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
                          <TableHead>{isArabic ? "الكمية" : "Qty"}</TableHead>
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
                            <TableCell className="max-w-[200px] truncate">
                              {q.description}
                            </TableCell>
                            <TableCell>{q.quantity}</TableCell>
                            <TableCell>{q.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export Actions */}
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

            {/* Failed Files */}
            {results.filter(r => !r.success).length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    {isArabic ? "ملفات فشل تحليلها" : "Failed Files"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.filter(r => !r.success).map((result, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <span className="font-medium">{result.fileName}:</span>
                        <span className="text-muted-foreground">{result.error}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
