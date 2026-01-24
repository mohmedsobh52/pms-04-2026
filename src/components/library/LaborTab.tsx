import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Search, Trash2, Edit2, Users } from "lucide-react";
import { useLaborRates, LABOR_CATEGORIES, LABOR_UNITS } from "@/hooks/useLaborRates";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";

export const LaborTab = () => {
  const { isArabic } = useLanguage();
  const { laborRates, loading, addLaborRate, deleteLaborRate, importFromExcel } = useLaborRates();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    name_ar: "",
    unit: "day",
    unit_rate: "",
    overtime_percentage: "0",
    category: "general",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLaborRate({
      code: formData.code || `L${Date.now()}`,
      name: formData.name,
      name_ar: formData.name_ar,
      unit: formData.unit,
      unit_rate: parseFloat(formData.unit_rate) || 0,
      overtime_percentage: parseFloat(formData.overtime_percentage) || 0,
      category: formData.category,
    });
    setFormData({ code: "", name: "", name_ar: "", unit: "day", unit_rate: "", overtime_percentage: "0", category: "general" });
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

  const filteredLabor = laborRates.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.name_ar && l.name_ar.includes(search)) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const getUnitLabel = (unit: string) => {
    const found = LABOR_UNITS.find(u => u.value === unit);
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
            placeholder={isArabic ? "بحث في العمالة..." : "Search labor..."}
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
                {isArabic ? "إضافة عمالة" : "Add Labor"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isArabic ? "إضافة عمالة جديدة" : "Add New Labor"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الكود" : "Code"}</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="L001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LABOR_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {isArabic ? cat.label : cat.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{isArabic ? "المسمى الوظيفي" : "Job Title"}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{isArabic ? "المسمى بالعربي" : "Arabic Title"}</Label>
                  <Input
                    value={formData.name_ar}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الوحدة" : "Unit"}</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LABOR_UNITS.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {isArabic ? unit.label : unit.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "سعر الوحدة (ر.س)" : "Unit Rate (SAR)"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_rate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{isArabic ? "نسبة الإضافي %" : "Overtime %"}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.overtime_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, overtime_percentage: e.target.value }))}
                  />
                </div>
                
                <Button type="submit" className="w-full">{isArabic ? "إضافة" : "Add"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {filteredLabor.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p>{isArabic ? "لا توجد عمالة. أضف أول عمالة للبدء." : "No labor. Add your first labor to get started."}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">{isArabic ? "الكود" : "Code"}</TableHead>
                <TableHead className="text-right">{isArabic ? "المسمى الوظيفي" : "Job Title"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                <TableHead className="text-center">{isArabic ? "سعر الوحدة" : "Unit Rate"}</TableHead>
                <TableHead className="text-center">{isArabic ? "نسبة الإضافي %" : "Overtime %"}</TableHead>
                <TableHead className="text-center w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabor.map((labor) => (
                <TableRow key={labor.id}>
                  <TableCell className="font-mono text-sm">{labor.code}</TableCell>
                  <TableCell>{isArabic && labor.name_ar ? labor.name_ar : labor.name}</TableCell>
                  <TableCell className="text-center">{getUnitLabel(labor.unit)}</TableCell>
                  <TableCell className="text-center font-medium">{labor.unit_rate.toLocaleString()} ر.س</TableCell>
                  <TableCell className="text-center">{labor.overtime_percentage}%</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteLaborRate(labor.id)}
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
