import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Upload, Trash2, Edit, Globe, Database, Building2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useMaterialPrices, MaterialPrice, MATERIAL_CATEGORIES } from "@/hooks/useMaterialPrices";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { toast } from 'sonner';
import { XLSX } from '@/lib/exceljs-utils';

export const MaterialPriceDatabase = () => {
  const { isArabic } = useLanguage();
  const { materials, suppliers, loading, addMaterial, updateMaterial, deleteMaterial, addSupplier, deleteSupplier, importFromExcel } = useMaterialPrices();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [webSearching, setWebSearching] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webSearchResults, setWebSearchResults] = useState<any[]>([]);

  const [newMaterial, setNewMaterial] = useState({
    name: '',
    name_ar: '',
    category: 'other',
    unit: '',
    unit_price: 0,
    supplier_name: '',
    city: '',
    notes: '',
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    name_ar: '',
    category: '',
    phone: '',
    email: '',
    website: '',
    city: '',
  });

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.name_ar && m.name_ar.includes(searchTerm)) ||
      (m.supplier_name && m.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddMaterial = async () => {
    if (!newMaterial.name || !newMaterial.unit || newMaterial.unit_price <= 0) {
      toast.error(isArabic ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    const result = await addMaterial({
      ...newMaterial,
      currency: 'SAR',
      source: 'manual',
      price_date: new Date().toISOString().split('T')[0],
      is_verified: false,
    } as any);

    if (result) {
      setAddDialogOpen(false);
      setNewMaterial({ name: '', name_ar: '', category: 'other', unit: '', unit_price: 0, supplier_name: '', city: '', notes: '' });
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name) {
      toast.error(isArabic ? 'يرجى إدخال اسم المورد' : 'Please enter supplier name');
      return;
    }

    const result = await addSupplier({
      ...newSupplier,
      is_verified: false,
    } as any);

    if (result) {
      setSupplierDialogOpen(false);
      setNewSupplier({ name: '', name_ar: '', category: '', phone: '', email: '', website: '', city: '' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      await importFromExcel(jsonData);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error(isArabic ? 'فشل في قراءة الملف' : 'Failed to read file');
    }
    
    event.target.value = '';
  };

  const handleWebSearch = async () => {
    if (!webSearchQuery.trim()) {
      toast.error(isArabic ? 'يرجى إدخال كلمة البحث' : 'Please enter search query');
      return;
    }

    setWebSearching(true);
    try {
      const searchQuery = `أسعار ${webSearchQuery} مواد بناء السعودية ${new Date().getFullYear()}`;
      const result = await firecrawlApi.search(searchQuery, {
        limit: 10,
        lang: 'ar',
        country: 'SA',
      });

      if (result.success && result.data) {
        setWebSearchResults(result.data);
        toast.success(isArabic ? `تم العثور على ${result.data.length} نتيجة` : `Found ${result.data.length} results`);
      } else {
        toast.error(result.error || (isArabic ? 'فشل البحث' : 'Search failed'));
      }
    } catch (error) {
      console.error('Web search error:', error);
      toast.error(isArabic ? 'فشل البحث في الإنترنت' : 'Web search failed');
    } finally {
      setWebSearching(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    const cat = MATERIAL_CATEGORIES.find(c => c.value === value);
    return isArabic ? cat?.label : cat?.label_en;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="prices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {isArabic ? "قاعدة الأسعار" : "Price Database"}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {isArabic ? "الموردين" : "Suppliers"}
          </TabsTrigger>
          <TabsTrigger value="web-search" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {isArabic ? "بحث الإنترنت" : "Web Search"}
          </TabsTrigger>
        </TabsList>

        {/* Prices Tab */}
        <TabsContent value="prices" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isArabic ? "قاعدة بيانات أسعار المواد" : "Material Price Database"}</CardTitle>
              <div className="flex gap-2">
                <Label htmlFor="excel-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {isArabic ? "استيراد Excel" : "Import Excel"}
                    </span>
                  </Button>
                </Label>
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {isArabic ? "إضافة سعر" : "Add Price"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{isArabic ? "إضافة سعر مادة جديد" : "Add New Material Price"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{isArabic ? "اسم المادة (English)" : "Material Name"}</Label>
                          <Input 
                            value={newMaterial.name}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Steel Rebar"
                          />
                        </div>
                        <div>
                          <Label>{isArabic ? "الاسم بالعربي" : "Arabic Name"}</Label>
                          <Input 
                            value={newMaterial.name_ar}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, name_ar: e.target.value }))}
                            placeholder="مثال: حديد تسليح"
                            dir="rtl"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>{isArabic ? "الفئة" : "Category"}</Label>
                        <Select value={newMaterial.category} onValueChange={(v) => setNewMaterial(prev => ({ ...prev, category: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {isArabic ? cat.label : cat.label_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                          <Input 
                            value={newMaterial.unit}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                            placeholder="طن، م3، م2..."
                          />
                        </div>
                        <div>
                          <Label>{isArabic ? "السعر (ر.س)" : "Price (SAR)"}</Label>
                          <Input 
                            type="number"
                            value={newMaterial.unit_price || ''}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{isArabic ? "المورد" : "Supplier"}</Label>
                          <Input 
                            value={newMaterial.supplier_name}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, supplier_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>{isArabic ? "المدينة" : "City"}</Label>
                          <Input 
                            value={newMaterial.city}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                      </div>

                      <Button onClick={handleAddMaterial} className="w-full">
                        {isArabic ? "إضافة" : "Add"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={isArabic ? "بحث عن مادة..." : "Search materials..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={isArabic ? "جميع الفئات" : "All Categories"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "جميع الفئات" : "All Categories"}</SelectItem>
                    {MATERIAL_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {isArabic ? cat.label : cat.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "المادة" : "Material"}</TableHead>
                      <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                      <TableHead>{isArabic ? "الوحدة" : "Unit"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "السعر" : "Price"}</TableHead>
                      <TableHead>{isArabic ? "المورد" : "Supplier"}</TableHead>
                      <TableHead>{isArabic ? "المصدر" : "Source"}</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {isArabic ? "لا توجد أسعار مسجلة" : "No prices recorded"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMaterials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{material.name_ar || material.name}</div>
                              {material.name_ar && (
                                <div className="text-xs text-muted-foreground">{material.name}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryLabel(material.category)}</Badge>
                          </TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell className="text-right font-medium">
                            {material.unit_price.toLocaleString()} {material.currency}
                          </TableCell>
                          <TableCell>{material.supplier_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={material.source === 'web_search' ? 'secondary' : 'outline'}>
                              {material.source === 'manual' ? (isArabic ? 'يدوي' : 'Manual') :
                               material.source === 'import' ? (isArabic ? 'استيراد' : 'Import') :
                               material.source === 'web_search' ? (isArabic ? 'إنترنت' : 'Web') : material.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteMaterial(material.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                {isArabic ? `إجمالي: ${filteredMaterials.length} سعر` : `Total: ${filteredMaterials.length} prices`}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isArabic ? "قاعدة بيانات الموردين" : "Supplier Database"}</CardTitle>
              <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {isArabic ? "إضافة مورد" : "Add Supplier"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{isArabic ? "إضافة مورد جديد" : "Add New Supplier"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{isArabic ? "الاسم" : "Name"}</Label>
                        <Input 
                          value={newSupplier.name}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>{isArabic ? "الاسم بالعربي" : "Arabic Name"}</Label>
                        <Input 
                          value={newSupplier.name_ar}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, name_ar: e.target.value }))}
                          dir="rtl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{isArabic ? "الهاتف" : "Phone"}</Label>
                        <Input 
                          value={newSupplier.phone}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>{isArabic ? "المدينة" : "City"}</Label>
                        <Input 
                          value={newSupplier.city}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{isArabic ? "الموقع الإلكتروني" : "Website"}</Label>
                      <Input 
                        value={newSupplier.website}
                        onChange={(e) => setNewSupplier(prev => ({ ...prev, website: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleAddSupplier} className="w-full">
                      {isArabic ? "إضافة" : "Add"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "المورد" : "Supplier"}</TableHead>
                      <TableHead>{isArabic ? "الهاتف" : "Phone"}</TableHead>
                      <TableHead>{isArabic ? "المدينة" : "City"}</TableHead>
                      <TableHead>{isArabic ? "الموقع" : "Website"}</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {isArabic ? "لا يوجد موردين مسجلين" : "No suppliers recorded"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <div className="font-medium">{supplier.name_ar || supplier.name}</div>
                          </TableCell>
                          <TableCell>{supplier.phone || '-'}</TableCell>
                          <TableCell>{supplier.city || '-'}</TableCell>
                          <TableCell>
                            {supplier.website ? (
                              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {isArabic ? "زيارة" : "Visit"}
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteSupplier(supplier.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Search Tab */}
        <TabsContent value="web-search" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {isArabic ? "بحث ذكي عن أسعار المواد" : "Smart Material Price Search"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={isArabic ? "ابحث عن مادة... (مثال: حديد تسليح، أسمنت، سيراميك)" : "Search for material... (e.g., steel rebar, cement, tiles)"}
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                  />
                </div>
                <Button onClick={handleWebSearch} disabled={webSearching}>
                  {webSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {isArabic ? "بحث" : "Search"}
                </Button>
              </div>

              {webSearchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">{isArabic ? "نتائج البحث:" : "Search Results:"}</h3>
                  {webSearchResults.map((result, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {result.title}
                          </a>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {result.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">{result.url}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setNewMaterial(prev => ({ 
                              ...prev, 
                              name: webSearchQuery,
                              source: 'web_search',
                            }));
                            setAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {isArabic ? "إضافة" : "Add"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{isArabic ? "💡 نصائح البحث:" : "💡 Search Tips:"}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {isArabic ? "استخدم أسماء المواد بالعربي للحصول على نتائج محلية" : "Use Arabic material names for local results"}</li>
                  <li>• {isArabic ? "أضف اسم المدينة للحصول على أسعار محددة (مثال: حديد تسليح الرياض)" : "Add city name for specific prices"}</li>
                  <li>• {isArabic ? "البحث يشمل مواقع الموردين السعوديين" : "Search includes Saudi supplier websites"}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
