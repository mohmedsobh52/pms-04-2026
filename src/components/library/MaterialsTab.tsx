import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Search, Trash2, Edit2, Package } from "lucide-react";
import { useMaterialPrices, MATERIAL_CATEGORIES, CURRENCIES } from "@/hooks/useMaterialPrices";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceValidityIndicator, getValidityStatus } from "./PriceValidityIndicator";

interface MaterialsTabProps {
  validityFilter?: string | null;
}

export const MaterialsTab = React.forwardRef<HTMLDivElement, MaterialsTabProps>(
  ({ validityFilter }, ref) => {
  const { isArabic } = useLanguage();
  const { materials, suppliers, loading, addMaterial, deleteMaterial, importFromExcel } = useMaterialPrices();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    code: "",
    category: "other",
    waste_percentage: "0",
    unit: "m3",
    unit_price: "",
    currency: "SAR",
    supplier_name: "",
    brand: "",
    description: "",
    specifications: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMaterial({
      name: formData.name,
      name_ar: formData.name_ar,
      unit: formData.unit,
      unit_price: parseFloat(formData.unit_price) || 0,
      supplier_name: formData.supplier_name,
      category: formData.category,
      currency: formData.currency,
      brand: formData.brand,
      description: formData.description,
      specifications: formData.specifications,
      waste_percentage: parseFloat(formData.waste_percentage) || 0,
      price_date: new Date().toISOString().split('T')[0],
      is_verified: false,
    });
    setFormData({ 
      name: "", name_ar: "", code: "", category: "other", waste_percentage: "0", 
      unit: "m3", unit_price: "", currency: "SAR", supplier_name: "", 
      brand: "", description: "", specifications: "" 
    });
    setIsAddOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    const data: any[] = [];
    const headers: string[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => {
          headers.push(cell.value?.toString() || '');
        });
      } else {
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber - 1]] = cell.value;
        });
        data.push(rowData);
      }
    });

    await importFromExcel(data);
    e.target.value = '';
  };

  // Filter materials based on search and validity
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.name_ar && m.name_ar.includes(search)) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      (m.brand && m.brand.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (validityFilter) {
      const status = getValidityStatus(m.valid_until, m.price_date);
      return status === validityFilter;
    }
    
    return true;
  });

  const getCurrencyLabel = (currency: string) => {
    const found = CURRENCIES.find(c => c.value === currency);
    return found ? found.label : currency;
  };

  if (loading) {
    return (
      <div ref={ref} className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "بحث في المواد..." : "Search materials..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4" />
                {isArabic ? "استيراد" : "Import"}
              </span>
            </Button>
          </label>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                {isArabic ? "إضافة مادة" : "Add Material"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? "إضافة مادة جديدة" : "Add New Material"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "اسم المادة *" : "Material Name *"}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Row 2: Code, Category, Waste */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الكود" : "Code"}</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="M001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
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
                  <div className="space-y-2">
                    <Label>{isArabic ? "نسبة الهدر %" : "Waste %"}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.waste_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, waste_percentage: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* Row 3: Unit, Price, Currency */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m3">م³ / m³</SelectItem>
                        <SelectItem value="m2">م² / m²</SelectItem>
                        <SelectItem value="m">م.ط / m</SelectItem>
                        <SelectItem value="kg">كجم / kg</SelectItem>
                        <SelectItem value="ton">طن / ton</SelectItem>
                        <SelectItem value="unit">وحدة / unit</SelectItem>
                        <SelectItem value="bag">كيس / bag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "سعر الوحدة *" : "Unit Price *"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "العملة" : "Currency"}</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label} ({curr.label_en})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Row 4: Supplier, Brand */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "المورد" : "Supplier"}</Label>
                    <Select value={formData.supplier_name} onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_name: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? "اختر المورد" : "Select supplier"} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "العلامة التجارية" : "Brand"}</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder={isArabic ? "مثال: سافيتو" : "e.g. Saveto"}
                    />
                  </div>
                </div>

                {/* Row 5: Description */}
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف" : "Description"}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={isArabic ? "وصف المادة..." : "Material description..."}
                    rows={2}
                  />
                </div>

                {/* Row 6: Specifications */}
                <div className="space-y-2">
                  <Label>{isArabic ? "المواصفات الفنية" : "Technical Specifications"}</Label>
                  <Textarea
                    value={formData.specifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                    placeholder={isArabic ? "المواصفات الفنية للمادة..." : "Technical specifications..."}
                    rows={2}
                  />
                </div>
                
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    {isArabic ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    {isArabic ? "إنشاء" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p>{isArabic ? "لا توجد مواد. أضف أول مادة للبدء." : "No materials. Add your first material to get started."}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">{isArabic ? "الكود" : "Code"}</TableHead>
                <TableHead className="text-right">{isArabic ? "الاسم" : "Name"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                <TableHead className="text-center">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                <TableHead className="text-right">{isArabic ? "العلامة التجارية" : "Brand"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الصلاحية" : "Validity"}</TableHead>
                <TableHead className="text-center w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material, index) => (
                <TableRow key={material.id}>
                  <TableCell className="font-mono text-sm">{`M${String(index + 1).padStart(3, '0')}`}</TableCell>
                  <TableCell>
                    <div>
                      <div>{isArabic && material.name_ar ? material.name_ar : material.name}</div>
                      {material.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{material.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{material.unit}</TableCell>
                  <TableCell className="text-center font-medium">
                    {material.unit_price.toLocaleString()} {getCurrencyLabel(material.currency)}
                  </TableCell>
                  <TableCell>{material.brand || "-"}</TableCell>
                  <TableCell className="text-center">
                    <PriceValidityIndicator 
                      priceDate={material.price_date} 
                      validUntil={material.valid_until}
                      showLabel={true}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMaterial(material.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
  }
);

MaterialsTab.displayName = "MaterialsTab";
