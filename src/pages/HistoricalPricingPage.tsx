import { useState, useEffect, lazy, Suspense } from "react";
import { Database, Upload, FileSpreadsheet, FileText, Trash2, Eye, Calendar, MapPin, CheckCircle, XCircle, Plus, Search, Filter, ArrowLeft, BarChart3, Loader2, Download, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { extractRawDataFromExcel } from "@/lib/excel-utils";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";
import * as pdfjsLib from 'pdfjs-dist';
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { HistoricalPricingStats } from "@/components/HistoricalPricingStats";
import { HistoricalPricingPDFReport } from "@/components/HistoricalPricingPDFReport";
import { ImportFromSavedProjects } from "@/components/ImportFromSavedProjects";
import { HistoricalItemsTable } from "@/components/HistoricalItemsTable";
import { ColorLegend } from "@/components/ui/color-code";
import { normalizeHistoricalItems, NormalizedHistoricalItem } from "@/lib/historical-data-utils";
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

interface RawDataItem {
  [key: string]: any;
}

const LOCATIONS = [
  { value: "Riyadh", label: "الرياض" },
  { value: "Jeddah", label: "جدة" },
  { value: "Dammam", label: "الدمام" },
  { value: "Makkah", label: "مكة المكرمة" },
  { value: "Madinah", label: "المدينة المنورة" },
  { value: "Khobar", label: "الخبر" },
  { value: "Tabuk", label: "تبوك" },
  { value: "Other", label: "أخرى" },
];

export default function HistoricalPricingPage() {
  const [files, setFiles] = useState<HistoricalFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<HistoricalFile | null>(null);
  const [activeTab, setActiveTab] = useState("files");
  
  // Upload form state
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [notes, setNotes] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<NormalizedHistoricalItem[]>([]);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [pdfPagePreviews, setPdfPagePreviews] = useState<string[]>([]);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("historical_pricing_files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      
      const formattedData = (data || []).map(file => ({
        ...file,
        items: Array.isArray(file.items) ? file.items : []
      }));
      
      setFiles(formattedData);
    } catch (error: any) {
      console.error("Failed to load historical files:", error);
      toast({
        title: "خطأ في التحميل",
        description: error.message || "فشل في تحميل الملفات التاريخية",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadedFileName(file.name);
      
      const isPDF = file.name.toLowerCase().endsWith('.pdf');
      
      if (isPDF) {
        // Handle PDF with OCR
        await handlePDFUpload(file);
      } else {
        // Handle Excel files - extract raw data then normalize
        const result = await extractRawDataFromExcel(file);
        
        if (result.rows && result.rows.length > 0) {
          const normalized = normalizeHistoricalItems(result.rows, result.headers);
          setUploadedItems(normalized);
          setUploadedHeaders(result.headers);
          toast({
            title: "✅ تم قراءة الملف",
            description: `تم استخراج ${normalized.length} بند من الملف`,
          });
        } else {
          toast({
            title: "لا توجد بيانات",
            description: "لم يتم العثور على بيانات في الملف",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({
        title: "خطأ في قراءة الملف",
        description: error.message || "فشل في استخراج البيانات",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePDFUpload = async (file: File) => {
    try {
      toast({
        title: "جاري معالجة PDF...",
        description: "قد يستغرق هذا بعض الوقت حسب حجم الملف",
      });

      // Generate PDF page previews first
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const previews: string[] = [];
        
        const numPages = Math.min(pdf.numPages, 5); // Preview first 5 pages
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
          
          previews.push(canvas.toDataURL('image/jpeg', 0.7));
        }
        
        setPdfPagePreviews(previews);
        setShowPdfPreview(true);
      } catch (previewError) {
        console.warn("Could not generate PDF previews:", previewError);
      }

      // Convert file to base64 for extraction
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(byte => binary += String.fromCharCode(byte));
      const pdfBase64 = btoa(binary);

      toast({
        title: "جاري استخراج البنود...",
        description: "استخدام الذكاء الاصطناعي لتحليل المستند",
      });

      // Call edge function to process PDF
      const { data, error } = await supabase.functions.invoke('process-pdf-boq', {
        body: {
          pdfBase64,
          fileName: file.name
        }
      });

      if (error) throw error;

      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        const rawItems = data.items;
        const headers = data.headers && Array.isArray(data.headers) && data.headers.length > 0
          ? data.headers
          : Object.keys(rawItems[0] || {});
        
        const normalized = normalizeHistoricalItems(rawItems, headers);
        setUploadedItems(normalized);
        setUploadedHeaders(headers);
        toast({
          title: "✅ تم استخراج البيانات",
          description: `تم استخراج ${normalized.length} بند من ملف PDF`,
        });
      } else {
        toast({
          title: "لم يتم العثور على بيانات",
          description: "حاول رفع ملف PDF يحتوي على جدول واضح",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("PDF processing error:", error);
      throw error;
    }
  };

  // Export extracted data to Excel
  const handleExportToExcel = () => {
    if (uploadedItems.length === 0) return;

    const wb = createWorkbook();
    const exportData = uploadedItems.map(item => ({ ...item } as Record<string, unknown>));
    addJsonSheet(wb, exportData, 'Extracted Data');
    
    const fileName = uploadedFileName ? 
      `extracted_${uploadedFileName.replace(/\.[^/.]+$/, '')}.xlsx` : 
      'extracted_data.xlsx';
    
    downloadWorkbook(wb, fileName);
    
    toast({
      title: "✅ تم التصدير",
      description: `تم تصدير ${uploadedItems.length} صف إلى Excel`,
    });
  };

  // Export saved file data to Excel
  const handleExportSavedToExcel = (file: HistoricalFile) => {
    if (!file.items || file.items.length === 0) return;

    const headers = Object.keys(file.items[0] || {});
    const wb = createWorkbook();
    addJsonSheet(wb, file.items, 'Data', { header: headers });
    
    const fileName = `${file.project_name.replace(/[^a-zA-Z0-9أ-ي]/g, '_')}.xlsx`;
    downloadWorkbook(wb, fileName);
    
    toast({
      title: "✅ تم التصدير",
      description: `تم تصدير ${file.items.length} صف إلى Excel`,
    });
  };

  const handleSaveFile = async () => {
    if (!user) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول لحفظ الملفات",
        variant: "destructive",
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: "اسم المشروع مطلوب",
        description: "يرجى إدخال اسم المشروع",
        variant: "destructive",
      });
      return;
    }

    if (uploadedItems.length === 0) {
      toast({
        title: "لا توجد بنود",
        description: "يرجى رفع ملف يحتوي على بنود",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate total from normalized items
      const totalValue = uploadedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

      const { error } = await supabase
        .from("historical_pricing_files")
        .insert([{
          user_id: user.id,
          file_name: uploadedFileName,
          project_name: projectName.trim(),
          project_location: projectLocation || null,
          project_date: projectDate || null,
          currency,
          items: uploadedItems as any,
          items_count: uploadedItems.length,
          total_value: totalValue,
          notes: notes.trim() || null,
          is_verified: isVerified,
        }]);

      if (error) throw error;

      toast({
        title: "✅ تم الحفظ بنجاح",
        description: `تم حفظ ${uploadedItems.length} بند في قاعدة البيانات التاريخية`,
      });

      // Reset form
      setProjectName("");
      setProjectLocation("");
      setProjectDate("");
      setCurrency("SAR");
      setNotes("");
      setIsVerified(false);
      setUploadedItems([]);
      setUploadedHeaders([]);
      setUploadedFileName("");
      setUploadDialogOpen(false);
      
      // Reload files
      loadFiles();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "فشل في حفظ الملف",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from("historical_pricing_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      toast({
        title: "✅ تم الحذف",
        description: "تم حذف الملف بنجاح",
      });

      loadFiles();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "خطأ في الحذف",
        description: error.message || "فشل في حذف الملف",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = (file: HistoricalFile) => {
    setSelectedFile(file);
    setViewDialogOpen(true);
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filterLocation === "all" || file.project_location === filterLocation;
    return matchesSearch && matchesLocation;
  });

  const totalItems = files.reduce((sum, f) => sum + f.items_count, 0);
  const verifiedCount = files.filter(f => f.is_verified).length;

  return (
    <PageLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <ColorLegend type="category" isArabic={isArabic} />
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="w-6 h-6 text-primary" />
                قاعدة البيانات التاريخية للأسعار
              </h1>
              <p className="text-muted-foreground">
                رفع وإدارة ملفات BOQ المسعرة سابقاً لتحسين دقة التحليل
              </p>
            </div>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <div className="flex items-center gap-2">
              <ImportFromSavedProjects 
                onImportComplete={loadFiles}
                existingProjectNames={files.map(f => f.project_name)}
              />
              <HistoricalPricingPDFReport historicalFiles={files} />
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  رفع ملف جديد
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  رفع ملف مسعّر تاريخي
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>ملف Excel أو PDF</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {isUploading ? (
                        <Loader2 className="w-12 h-12 mx-auto mb-2 text-primary animate-spin" />
                      ) : (
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <FileSpreadsheet className="w-10 h-10 text-green-600" />
                          <FileText className="w-10 h-10 text-red-600" />
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {isUploading ? "جاري المعالجة..." : "اضغط لاختيار ملف Excel أو PDF"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        xlsx, xls, csv, pdf
                      </p>
                      {uploadedFileName && (
                        <Badge variant="secondary" className="mt-2">
                          {uploadedFileName} ({uploadedItems.length} بند)
                        </Badge>
                      )}
                    </label>
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المشروع *</Label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="مثال: برج الرياض السكني"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع</Label>
                    <Select value={projectLocation} onValueChange={setProjectLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموقع" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATIONS.map(loc => (
                          <SelectItem key={loc.value} value={loc.value}>
                            {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ المشروع</Label>
                    <Input
                      type="date"
                      value={projectDate}
                      onChange={(e) => setProjectDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>العملة</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                        <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                        <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                        <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية عن المشروع..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Switch
                    checked={isVerified}
                    onCheckedChange={setIsVerified}
                    id="verified"
                  />
                  <Label htmlFor="verified" className="cursor-pointer">
                    تم التحقق من الأسعار (مشروع منفذ فعلياً)
                  </Label>
                </div>

                {/* PDF Page Preview */}
                {showPdfPreview && pdfPagePreviews.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        معاينة صفحات PDF ({pdfPagePreviews.length} صفحات)
                      </Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowPdfPreview(false)}
                      >
                        إخفاء
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      <div className="flex gap-2">
                        {pdfPagePreviews.map((preview, idx) => (
                          <div key={idx} className="flex-shrink-0 border rounded-lg overflow-hidden">
                            <img 
                              src={preview} 
                              alt={`صفحة ${idx + 1}`}
                              className="h-[170px] w-auto object-contain"
                            />
                            <p className="text-xs text-center text-muted-foreground py-1">
                              صفحة {idx + 1}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Preview Items - Normalized BOQ Table */}
                {uploadedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>معاينة وتعديل البنود ({uploadedItems.length} بند)</Label>
                    <HistoricalItemsTable
                      items={uploadedItems}
                      onItemsChange={setUploadedItems}
                      projectName={projectName || uploadedFileName}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">إلغاء</Button>
                </DialogClose>
                <Button onClick={handleSaveFile} disabled={!projectName || uploadedItems.length === 0}>
                  حفظ في قاعدة البيانات
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs for Files and Statistics */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="tabs-navigation-safe">
            <TabsTrigger value="files" className="gap-2">
              <Database className="w-4 h-4" />
              الملفات ({files.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              الإحصائيات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4 mt-4">
            {/* Stats */}
            {(() => {
              const totalValue = files.reduce((s, f) => s + (Number(f.total_value) || 0), 0);
              const locationsCount = new Set(files.map((f) => f.project_location).filter(Boolean)).size;
              const cards = [
                { icon: Database, label: "ملف تاريخي", value: String(files.length), color: "text-primary", bg: "bg-primary/10" },
                { icon: FileText, label: "بند إجمالي", value: totalItems.toLocaleString(), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
                { icon: CheckCircle, label: "ملف موثق", value: String(verifiedCount), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
                { icon: MapPin, label: "موقع مختلف", value: String(locationsCount), color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                { icon: BarChart3, label: "القيمة الإجمالية", value: `${totalValue.toLocaleString()} ريال`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
              ];
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {cards.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <Card key={i} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${s.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                            <p className={`text-base font-bold ${s.color} truncate`}>{s.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}

            {/* Insights row */}
            {files.length > 0 && (() => {
              const locMap = new Map<string, number>();
              files.forEach((f) => {
                const k = f.project_location || (isArabic ? "غير محدد" : "Unspecified");
                locMap.set(k, (locMap.get(k) || 0) + 1);
              });
              const topLocs = Array.from(locMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
              const maxLoc = Math.max(1, ...topLocs.map((l) => l[1]));

              const yearMap = new Map<string, { count: number; value: number }>();
              files.forEach((f) => {
                const y = f.project_date ? new Date(f.project_date).getFullYear().toString() : (isArabic ? "بدون تاريخ" : "Undated");
                const cur = yearMap.get(y) || { count: 0, value: 0 };
                cur.count += 1;
                cur.value += Number(f.total_value) || 0;
                yearMap.set(y, cur);
              });
              const years = Array.from(yearMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
              const maxYearVal = Math.max(1, ...years.map((y) => y[1].value));

              const topProjects = [...files]
                .filter((f) => Number(f.total_value) > 0)
                .sort((a, b) => Number(b.total_value) - Number(a.total_value))
                .slice(0, 5);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {isArabic ? "توزيع جغرافي" : "Location Distribution"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topLocs.map(([name, count]) => {
                        const label = LOCATIONS.find((l) => l.value === name)?.label || name;
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium truncate">{label}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${(count / maxLoc) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {isArabic ? "القيمة عبر السنوات" : "Value Over Years"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {years.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {isArabic ? "لا توجد بيانات" : "No data"}
                        </p>
                      ) : (
                        <div className="flex items-end justify-between gap-2 h-32">
                          {years.map(([y, v]) => (
                            <div key={y} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                              <div className="w-full bg-blue-500 rounded-t transition-all" style={{ height: `${(v.value / maxYearVal) * 100}%`, minHeight: "4px" }} />
                              <span className="text-[10px] text-muted-foreground truncate w-full text-center">{y}</span>
                              <span className="text-[10px] font-bold">{v.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        {isArabic ? "أعلى المشاريع قيمةً" : "Top Projects by Value"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {topProjects.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.project_name}</p>
                            <p className="text-xs text-muted-foreground">{p.items_count} {isArabic ? "بند" : "items"}</p>
                          </div>
                          <div className="text-sm font-bold text-emerald-600 shrink-0">
                            {Number(p.total_value).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الملف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="فلترة بالموقع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المواقع</SelectItem>
              {LOCATIONS.map(loc => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Files List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium">لا توجد ملفات تاريخية</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "لا توجد نتائج مطابقة للبحث" : "ابدأ برفع ملفات BOQ المسعرة لتحسين دقة التحليل"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  رفع أول ملف
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileSpreadsheet className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{file.project_name}</h3>
                          {file.is_verified && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              موثق
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <FileSpreadsheet className="w-3 h-3" />
                            {file.file_name}
                          </span>
                          {file.project_location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {LOCATIONS.find(l => l.value === file.project_location)?.label || file.project_location}
                            </span>
                          )}
                          {file.project_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(file.project_date).toLocaleDateString("ar-SA")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold">{file.items_count}</p>
                        <p className="text-xs text-muted-foreground">بند</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{file.total_value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{file.currency}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleExportSavedToExcel(file)}
                          title="تصدير إلى Excel"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewFile(file)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteFile(file.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <HistoricalPricingStats files={files} />
          </TabsContent>
        </Tabs>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {selectedFile?.project_name}
              </DialogTitle>
            </DialogHeader>

            {selectedFile && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="font-bold">{selectedFile.items_count}</p>
                    <p className="text-xs text-muted-foreground">عدد البنود</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="font-bold">{selectedFile.total_value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">القيمة الإجمالية ({selectedFile.currency})</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="font-bold">
                      {selectedFile.project_date 
                        ? new Date(selectedFile.project_date).toLocaleDateString("ar-SA")
                        : "-"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">تاريخ المشروع</p>
                  </div>
                </div>

                {selectedFile.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{selectedFile.notes}</p>
                  </div>
                )}

                <HistoricalItemsTable
                  items={normalizeHistoricalItems(selectedFile.items)}
                  onItemsChange={(updatedItems) => {
                    setSelectedFile({ ...selectedFile, items: updatedItems, items_count: updatedItems.length });
                  }}
                  fileId={selectedFile.id}
                  projectName={selectedFile.project_name}
                />
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => selectedFile && handleExportSavedToExcel(selectedFile)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير إلى Excel
              </Button>
              <DialogClose asChild>
                <Button variant="outline">إغلاق</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
