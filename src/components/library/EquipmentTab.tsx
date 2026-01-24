import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Search, Trash2, Edit2, Truck } from "lucide-react";
import { useEquipmentRates, EQUIPMENT_CATEGORIES, EQUIPMENT_UNITS } from "@/hooks/useEquipmentRates";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";

export const EquipmentTab = () => {
  const { isArabic } = useLanguage();
  const { equipmentRates, loading, addEquipmentRate, deleteEquipmentRate, importFromExcel } = useEquipmentRates();
  const { suppliers } = useMaterialPrices();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    name_ar: "",
    unit: "day",
    rental_rate: "",
    operation_rate: "",
    supplier_name: "",
    category: "other",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addEquipmentRate({
      code: formData.code || `E${Date.now()}`,
      name: formData.name,
      name_ar: formData.name_ar,
      unit: formData.unit,
      rental_rate: parseFloat(formData.rental_rate) || 0,
      operation_rate: parseFloat(formData.operation_rate) || 0,
      supplier_name: formData.supplier_name,
      category: formData.category,
    });
    setFormData({ code: "", name: "", name_ar: "", unit: "day", rental_rate: "", operation_rate: "", supplier_name: "", category: "other" });
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

  const filteredEquipment = equipmentRates.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.name_ar && e.name_ar.includes(search)) ||
    e.code.toLowerCase().includes(search.toLowerCase())
  );

  const getUnitLabel = (unit: string) => {
    const found = EQUIPMENT_UNITS.find(u => u.value === unit);
    return found ? (isArabic ? found.label : found.label_en) : unit;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "بحث في المعدات..." : "Search equipment..."}
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
                {isArabic ? "إضافة معدة" : "Add Equipment"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isArabic ? "إضافة معدة جديدة" : "Add New Equipment"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الكود" : "Code"}</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="E001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {isArabic ? cat.label : cat.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم المعدة" : "Equipment Name"}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{isArabic ? "الاسم بالعربي" : "Arabic Name"}</Label>
                  <Input
                    value={formData.name_ar}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_UNITS.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {isArabic ? unit.label : unit.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "سعر الإيجار" : "Rental Rate"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.rental_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rental_rate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "سعر التشغيل" : "Operating Rate"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.operation_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, operation_rate: e.target.value }))}
                    />
                  </div>
                </div>
                
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
                
                <Button type="submit" className="w-full">{isArabic ? "إضافة" : "Add"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {filteredEquipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Truck className="h-12 w-12 mb-4 opacity-50" />
          <p>{isArabic ? "لا توجد معدات. أضف أول معدة للبدء." : "No equipment. Add your first equipment to get started."}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">{isArabic ? "الكود" : "Code"}</TableHead>
                <TableHead className="text-right">{isArabic ? "اسم المعدة" : "Equipment Name"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                <TableHead className="text-center">{isArabic ? "سعر الإيجار" : "Rental Rate"}</TableHead>
                <TableHead className="text-center">{isArabic ? "سعر التشغيل" : "Operating Rate"}</TableHead>
                <TableHead className="text-right">{isArabic ? "المورد" : "Supplier"}</TableHead>
                <TableHead className="text-center w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((equipment) => (
                <TableRow key={equipment.id}>
                  <TableCell className="font-mono text-sm">{equipment.code}</TableCell>
                  <TableCell>{isArabic && equipment.name_ar ? equipment.name_ar : equipment.name}</TableCell>
                  <TableCell className="text-center">{getUnitLabel(equipment.unit)}</TableCell>
                  <TableCell className="text-center font-medium">{equipment.rental_rate.toLocaleString()} ر.س</TableCell>
                  <TableCell className="text-center font-medium">{equipment.operation_rate.toLocaleString()} ر.س</TableCell>
                  <TableCell>{equipment.supplier_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteEquipmentRate(equipment.id)}
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
};
