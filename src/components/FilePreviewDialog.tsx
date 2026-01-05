import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  Image,
  FileSpreadsheet,
  Download,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Eye,
  Brain,
  Table,
  ListTree
} from "lucide-react";
import * as XLSX from "xlsx";

interface FilePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
    analysis_result?: any;
    is_analyzed?: boolean;
  } | null;
  onAnalyze?: (file: any) => void;
}

export function FilePreviewDialog({ isOpen, onClose, file, onAnalyze }: FilePreviewDialogProps) {
  const { isArabic } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState("preview");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      loadPreview();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, file]);

  const loadPreview = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setPreviewContent(null);
    setExcelData(null);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from("project-files")
        .download(file.file_path);

      if (downloadError) throw downloadError;

      const fileType = file.file_type || "";

      // Handle different file types
      if (fileType.includes("image")) {
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      } else if (fileType.includes("pdf")) {
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      } else if (fileType.includes("sheet") || fileType.includes("excel") || 
                 file.file_name.endsWith(".xlsx") || file.file_name.endsWith(".xls") ||
                 file.file_name.endsWith(".csv")) {
        // Parse Excel/CSV
        const arrayBuffer = await data.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        setExcelData(jsonData.slice(0, 100)); // Limit to first 100 rows
      } else if (fileType.includes("text") || fileType.includes("json") || 
                 file.file_name.endsWith(".txt") || file.file_name.endsWith(".json") ||
                 file.file_name.endsWith(".xml") || file.file_name.endsWith(".csv")) {
        const text = await data.text();
        setPreviewContent(text.slice(0, 10000)); // Limit text preview
      } else {
        setError(isArabic 
          ? "هذا النوع من الملفات لا يدعم المعاينة" 
          : "This file type doesn't support preview");
      }
    } catch (err) {
      console.error("Preview error:", err);
      setError(isArabic ? "خطأ في تحميل المعاينة" : "Error loading preview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;
    
    try {
      const { data, error } = await supabase.storage
        .from("project-files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <FileText className="w-16 h-16 mb-4 opacity-50" />
          <p>{error}</p>
        </div>
      );
    }

    const fileType = file?.file_type || "";

    // Image preview
    if (fileType.includes("image") && previewUrl) {
      return (
        <div className="relative h-[60vh] overflow-auto flex items-center justify-center bg-muted/30">
          <img
            src={previewUrl}
            alt={file?.file_name}
            className="max-w-full max-h-full object-contain transition-transform"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
            }}
          />
        </div>
      );
    }

    // PDF preview
    if (fileType.includes("pdf") && previewUrl) {
      return (
        <div className="h-[70vh]">
          <iframe
            src={previewUrl}
            className="w-full h-full rounded-lg border"
            title={file?.file_name}
          />
        </div>
      );
    }

    // Excel/CSV preview
    if (excelData) {
      return (
        <ScrollArea className="h-[60vh]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {excelData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    className={cn(
                      rowIndex === 0 ? "bg-primary/10 font-semibold" : "",
                      rowIndex % 2 === 0 ? "bg-muted/30" : ""
                    )}
                  >
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex}
                        className="px-3 py-2 border border-border whitespace-nowrap"
                      >
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {excelData.length >= 100 && (
            <p className="text-center text-muted-foreground text-sm py-2">
              {isArabic ? "يتم عرض أول 100 صف فقط" : "Showing first 100 rows only"}
            </p>
          )}
        </ScrollArea>
      );
    }

    // Text preview
    if (previewContent) {
      return (
        <ScrollArea className="h-[60vh]">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap bg-muted/30 rounded-lg">
            {previewContent}
          </pre>
        </ScrollArea>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p>{isArabic ? "لا تتوفر معاينة لهذا الملف" : "No preview available"}</p>
      </div>
    );
  };

  const renderAnalysisResult = () => {
    if (!file?.analysis_result) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <Brain className="w-16 h-16 mb-4 opacity-50" />
          <p className="mb-4">{isArabic ? "لم يتم تحليل هذا الملف بعد" : "This file hasn't been analyzed yet"}</p>
          {onAnalyze && (
            <Button onClick={() => onAnalyze(file)} className="gap-2">
              <Brain className="w-4 h-4" />
              {isArabic ? "تحليل الآن" : "Analyze Now"}
            </Button>
          )}
        </div>
      );
    }

    const result = file.analysis_result;

    return (
      <ScrollArea className="h-[60vh]">
        <div className="space-y-4 p-4">
          {/* Summary */}
          {result.summary && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <ListTree className="w-4 h-4" />
                {isArabic ? "الملخص" : "Summary"}
              </h4>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>
          )}

          {/* Document Type */}
          {result.document_type && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{isArabic ? "نوع المستند:" : "Document Type:"}</span>
              <Badge variant="secondary">{result.document_type}</Badge>
            </div>
          )}

          {/* Extracted Items */}
          {result.items && result.items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Table className="w-4 h-4" />
                {isArabic ? "البنود المستخرجة" : "Extracted Items"} ({result.items.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 border text-start">#</th>
                      <th className="px-3 py-2 border text-start">{isArabic ? "الوصف" : "Description"}</th>
                      <th className="px-3 py-2 border text-start">{isArabic ? "الكمية" : "Qty"}</th>
                      <th className="px-3 py-2 border text-start">{isArabic ? "الوحدة" : "Unit"}</th>
                      <th className="px-3 py-2 border text-start">{isArabic ? "السعر" : "Price"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.slice(0, 20).map((item: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <td className="px-3 py-2 border">{item.item_number || index + 1}</td>
                        <td className="px-3 py-2 border">{item.description}</td>
                        <td className="px-3 py-2 border">{item.quantity}</td>
                        <td className="px-3 py-2 border">{item.unit}</td>
                        <td className="px-3 py-2 border">{item.total_price?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key Points */}
          {result.key_points && result.key_points.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">{isArabic ? "النقاط الرئيسية" : "Key Points"}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {result.key_points.map((point: string, index: number) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h4 className="font-semibold mb-2">{isArabic ? "التوصيات" : "Recommendations"}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Total Value */}
          {(result.total_value || result.extracted_data?.total_value) && (
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <span className="text-sm font-medium">{isArabic ? "القيمة الإجمالية:" : "Total Value:"}</span>
              <span className="text-lg font-bold mr-2 ml-2">
                {(result.total_value || result.extracted_data?.total_value)?.toLocaleString()}
              </span>
              <span className="text-sm">{result.currency || result.extracted_data?.currency || "SAR"}</span>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  if (!file) return null;

  const fileType = file.file_type || "";
  const isImage = fileType.includes("image");

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate flex-1">
              {fileType.includes("pdf") && <FileText className="w-5 h-5 text-red-500" />}
              {fileType.includes("image") && <Image className="w-5 h-5 text-blue-500" />}
              {(fileType.includes("sheet") || fileType.includes("excel")) && <FileSpreadsheet className="w-5 h-5 text-green-500" />}
              <span className="truncate">{file.file_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              {isArabic ? "معاينة" : "Preview"}
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <Brain className="w-4 h-4" />
              {isArabic ? "التحليل" : "Analysis"}
              {file.is_analyzed && <Badge variant="secondary" className="text-xs">✓</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Image Controls */}
          {activeTab === "preview" && isImage && (
            <div className="flex items-center justify-center gap-2 py-2 border-b">
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(25, z - 25))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm w-16 text-center">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(200, z + 25))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRotation(r => (r + 90) % 360)}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setZoom(100); setRotation(0); }}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          <TabsContent value="preview" className="mt-0">
            {renderPreviewContent()}
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            {renderAnalysisResult()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
