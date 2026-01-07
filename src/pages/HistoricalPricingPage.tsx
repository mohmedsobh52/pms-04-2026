import { useState, useEffect } from "react";
import { Database, Upload, FileSpreadsheet, Trash2, Eye, Calendar, MapPin, CheckCircle, XCircle, Plus, Search, Filter, ArrowLeft } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { extractDataFromExcel } from "@/lib/excel-utils";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";

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

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  
  // Upload form state
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectDate, setProjectDate] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [notes, setNotes] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<BOQItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");

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
        .order("created_at", { ascending: false });

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

      const result = await extractDataFromExcel(file);
      
      if (result.items && result.items.length > 0) {
        const items: BOQItem[] = result.items.map((item: any) => ({
          item_number: item.item_number || "",
          description: item.description || "",
          unit: item.unit || "",
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || 0,
        }));
        setUploadedItems(items);
        
        toast({
          title: "✅ تم قراءة الملف",
          description: `تم استخراج ${items.length} بند من الملف`,
        });
      } else {
        toast({
          title: "لا توجد بنود",
          description: "لم يتم العثور على بنود في الملف",
          variant: "destructive",
        });
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
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                رفع ملف جديد
              </Button>
            </DialogTrigger>
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
                  <Label>ملف Excel</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {isUploading ? "جاري القراءة..." : "اضغط لاختيار ملف Excel"}
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

                {/* Preview Items */}
                {uploadedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>معاينة البنود ({uploadedItems.length})</Label>
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>رقم البند</TableHead>
                            <TableHead>الوصف</TableHead>
                            <TableHead>الوحدة</TableHead>
                            <TableHead>سعر الوحدة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadedItems.slice(0, 20).map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{item.item_number}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs">{item.description}</TableCell>
                              <TableCell className="text-xs">{item.unit}</TableCell>
                              <TableCell className="text-xs">{item.unit_price.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {uploadedItems.length > 20 && (
                        <p className="text-center text-xs text-muted-foreground py-2">
                          ... و {uploadedItems.length - 20} بند آخر
                        </p>
                      )}
                    </ScrollArea>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{files.length}</p>
              <p className="text-sm text-muted-foreground">ملف تاريخي</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{totalItems.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">بند إجمالي</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
              <p className="text-sm text-muted-foreground">ملف موثق</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">
                {new Set(files.map(f => f.project_location).filter(Boolean)).size}
              </p>
              <p className="text-sm text-muted-foreground">موقع مختلف</p>
            </CardContent>
          </Card>
        </div>

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

                <ScrollArea className="h-[400px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم البند</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الوحدة</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>سعر الوحدة</TableHead>
                        <TableHead>الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFile.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.item_number}</TableCell>
                          <TableCell className="max-w-[250px] truncate text-xs">{item.description}</TableCell>
                          <TableCell className="text-xs">{item.unit}</TableCell>
                          <TableCell className="text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-xs">{(item.unit_price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs font-medium">{(item.total_price || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
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
