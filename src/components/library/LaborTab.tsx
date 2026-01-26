import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Search, Trash2, Edit2, Users, Info } from "lucide-react";
import { useLaborRates, LABOR_CATEGORIES, LABOR_UNITS, SKILL_LEVELS, CURRENCIES } from "@/hooks/useLaborRates";
import { useLanguage } from "@/hooks/useLanguage";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PriceValidityIndicator, getValidityStatus } from "./PriceValidityIndicator";

interface LaborTabProps {
  validityFilter?: string | null;
}

export const LaborTab = React.forwardRef<HTMLDivElement, LaborTabProps>(
  ({ validityFilter }, ref) => {
  const { isArabic } = useLanguage();
  const { laborRates, loading, addLaborRate, deleteLaborRate, importFromExcel, calculateHourlyRate } = useLaborRates();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    name_ar: "",
    category: "general",
    skill_level: "skilled",
    unit: "day",
    unit_rate: "",
    currency: "SAR",
    working_hours_per_day: "8",
    hourly_rate: "0",
    overtime_percentage: "0",
  });

  // Calculate hourly rate automatically when daily rate or working hours change
  useEffect(() => {
    if (formData.unit === 'day') {
      const dailyRate = parseFloat(formData.unit_rate) || 0;
      const hours = parseFloat(formData.working_hours_per_day) || 8;
      const hourlyRate = calculateHourlyRate(dailyRate, hours);
      setFormData(prev => ({ ...prev, hourly_rate: hourlyRate.toString() }));
    }
  }, [formData.unit_rate, formData.working_hours_per_day, formData.unit, calculateHourlyRate]);

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
      skill_level: formData.skill_level,
      currency: formData.currency,
      working_hours_per_day: parseInt(formData.working_hours_per_day) || 8,
      hourly_rate: parseFloat(formData.hourly_rate) || 0,
    });
    setFormData({ 
      code: "", name: "", name_ar: "", category: "general", skill_level: "skilled",
      unit: "day", unit_rate: "", currency: "SAR", working_hours_per_day: "8", 
      hourly_rate: "0", overtime_percentage: "0" 
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

  // Filter labor based on search and validity
  const filteredLabor = laborRates.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.name_ar && l.name_ar.includes(search)) ||
      l.code.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (validityFilter) {
      const status = getValidityStatus(l.valid_until, l.price_date);
      return status === validityFilter;
    }
    
    return true;
  });

  const getUnitLabel = (unit: string) => {
    const found = LABOR_UNITS.find(u => u.value === unit);
    return found ? (isArabic ? found.label : found.label_en) : unit;
  };

  const getSkillLevelLabel = (level?: string) => {
    if (!level) return "-";
    const found = SKILL_LEVELS.find(s => s.value === level);
    return found ? (isArabic ? found.label : found.label_en) : level;
  };

  const getCurrencyLabel = (currency?: string) => {
    if (!currency) return "ر.س";
    const found = CURRENCIES.find(c => c.value === currency);
    return found ? found.label : currency;
  };

  const getSkillLevelVariant = (level?: string): "default" | "secondary" | "outline" => {
    switch (level) {
      case 'skilled': return 'default';
      case 'semi-skilled': return 'secondary';
      case 'unskilled': return 'outline';
      default: return 'outline';
    }
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{isArabic ? "إضافة عمالة جديدة" : "Add New Labor"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "الحرفة *" : "Job Title *"}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "الحرفة (عربي)" : "Job Title (Arabic)"}</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Row 2: Code, Category, Skill Level */}
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label>{isArabic ? "مستوى المهارة" : "Skill Level"}</Label>
                    <Select value={formData.skill_level} onValueChange={(v) => setFormData(prev => ({ ...prev, skill_level: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {isArabic ? level.label : level.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Row 3: Unit, Daily Rate, Currency */}
                <div className="grid grid-cols-3 gap-4">
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
                    <Label>{isArabic ? "سعر اليوم *" : "Daily Rate *"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_rate: e.target.value }))}
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

                {/* Row 4: Working Hours, Hourly Rate (calculated) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "ساعات العمل/يوم" : "Working Hours/Day"}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={formData.working_hours_per_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, working_hours_per_day: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {isArabic ? "سعر الساعة" : "Hourly Rate"}
                      <span className="text-xs text-muted-foreground">({isArabic ? "محسوب" : "calculated"})</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.hourly_rate}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* Row 5: Overtime */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isArabic ? "نسبة الإضافي %" : "Overtime %"}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.overtime_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, overtime_percentage: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {isArabic 
                      ? "يتم حساب سعر الساعة تلقائياً من السعر اليومي وساعات العمل"
                      : "Hourly rate is calculated automatically from daily rate and working hours"
                    }
                  </span>
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
                <TableHead className="text-center">{isArabic ? "مستوى المهارة" : "Skill Level"}</TableHead>
                <TableHead className="text-center">{isArabic ? "سعر اليوم" : "Daily Rate"}</TableHead>
                <TableHead className="text-center">{isArabic ? "سعر الساعة" : "Hourly Rate"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الصلاحية" : "Validity"}</TableHead>
                <TableHead className="text-center w-24">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLabor.map((labor) => (
                <TableRow key={labor.id}>
                  <TableCell className="font-mono text-sm">{labor.code}</TableCell>
                  <TableCell>{isArabic && labor.name_ar ? labor.name_ar : labor.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getSkillLevelVariant(labor.skill_level)}>
                      {getSkillLevelLabel(labor.skill_level)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {labor.unit_rate.toLocaleString()} {getCurrencyLabel(labor.currency)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {labor.hourly_rate ? `${labor.hourly_rate.toLocaleString()} ${getCurrencyLabel(labor.currency)}` : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <PriceValidityIndicator 
                      priceDate={labor.price_date} 
                      validUntil={labor.valid_until}
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
  }
);

LaborTab.displayName = "LaborTab";
