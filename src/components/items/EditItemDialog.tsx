import { useState, useEffect } from "react";
// Dialog component for editing BOQ items
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";

interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  description_ar?: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
  subcategory?: string | null;
  specifications?: string | null;
  is_section?: boolean | null;
}

interface EditItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProjectItem | null;
  onSave: (updatedItem: Partial<ProjectItem>) => Promise<void>;
}

const units = [
  { value: "m3", label: { en: "m³ - Cubic Meter", ar: "م³ - متر مكعب" } },
  { value: "m2", label: { en: "m² - Square Meter", ar: "م² - متر مربع" } },
  { value: "m", label: { en: "m - Linear Meter", ar: "م - متر طولي" } },
  { value: "kg", label: { en: "kg - Kilogram", ar: "كجم - كيلوجرام" } },
  { value: "ton", label: { en: "Ton", ar: "طن" } },
  { value: "pcs", label: { en: "pcs - Pieces", ar: "قطعة" } },
  { value: "set", label: { en: "Set", ar: "طقم" } },
  { value: "ls", label: { en: "LS - Lump Sum", ar: "مقطوعية" } },
  { value: "nr", label: { en: "Nr - Number", ar: "عدد" } },
  { value: "l.m", label: { en: "L.M - Linear Meter", ar: "م.ط - متر طولي" } },
  { value: "hr", label: { en: "Hr - Hour", ar: "ساعة" } },
  { value: "day", label: { en: "Day", ar: "يوم" } },
  { value: "week", label: { en: "Week", ar: "أسبوع" } },
  { value: "month", label: { en: "Month", ar: "شهر" } },
  { value: "l", label: { en: "L - Liter", ar: "لتر" } },
  { value: "gal", label: { en: "Gal - Gallon", ar: "جالون" } },
];

const categories = [
  { value: "", label: { en: "No Category", ar: "بدون فئة" } },
  { value: "CIVIL", label: { en: "Civil Works", ar: "الأعمال المدنية" } },
  { value: "STRUCTURAL", label: { en: "Structural", ar: "الأعمال الإنشائية" } },
  { value: "ARCHITECTURAL", label: { en: "Architectural", ar: "الأعمال المعمارية" } },
  { value: "MEP", label: { en: "MEP", ar: "الميكانيكا والكهرباء والسباكة" } },
  { value: "ELECTRICAL", label: { en: "Electrical", ar: "الأعمال الكهربائية" } },
  { value: "MECHANICAL", label: { en: "Mechanical", ar: "الأعمال الميكانيكية" } },
  { value: "PLUMBING", label: { en: "Plumbing", ar: "أعمال السباكة" } },
  { value: "HVAC", label: { en: "HVAC", ar: "التكييف والتهوية" } },
  { value: "FINISHING", label: { en: "Finishing", ar: "أعمال التشطيبات" } },
  { value: "LANDSCAPING", label: { en: "Landscaping", ar: "أعمال اللاندسكيب" } },
  { value: "MISCELLANEOUS", label: { en: "Miscellaneous", ar: "أعمال متنوعة" } },
];

export function EditItemDialog({ isOpen, onClose, item, onSave }: EditItemDialogProps) {
  const { isArabic } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    item_number: "",
    description: "",
    description_ar: "",
    unit: "",
    quantity: "",
    category: "",
    subcategory: "",
    specifications: "",
    is_section: false,
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        item_number: item.item_number || "",
        description: item.description || "",
        description_ar: item.description_ar || "",
        unit: item.unit || "",
        quantity: item.quantity?.toString() || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        specifications: item.specifications || "",
        is_section: item.is_section || false,
      });
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!formData.item_number.trim()) {
      return;
    }
    if (!formData.is_section && !formData.description.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        item_number: formData.item_number,
        description: formData.description,
        description_ar: formData.description_ar || null,
        unit: formData.is_section ? null : formData.unit || null,
        quantity: formData.is_section ? null : (parseFloat(formData.quantity) || null),
        category: formData.category || null,
        subcategory: formData.subcategory || null,
        specifications: formData.specifications || null,
        is_section: formData.is_section,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isArabic ? "تعديل البند" : "Edit Item"}
          </DialogTitle>
          <DialogDescription>
            {isArabic ? "تعديل بيانات البند المحدد" : "Edit the selected item details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Is Section Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                {isArabic ? "عنوان قسم" : "Section Header"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isArabic 
                  ? "هذا البند هو عنوان لقسم وليس بند قابل للتسعير" 
                  : "This item is a section header, not a priceable item"}
              </p>
            </div>
            <Switch
              checked={formData.is_section}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_section: checked }))
              }
            />
          </div>

          {/* Item Number & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_number">
                {isArabic ? "رقم البند" : "Item Number"} *
              </Label>
              <Input
                id="item_number"
                value={formData.item_number}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, item_number: e.target.value }))
                }
                placeholder={isArabic ? "مثال: 31.2.3.1" : "e.g., 31.2.3.1"}
              />
            </div>
            {!formData.is_section && (
              <div className="space-y-2">
                <Label htmlFor="unit">
                  {isArabic ? "الوحدة" : "Unit"} *
                </Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, unit: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? "اختر الوحدة" : "Select unit"} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {isArabic ? unit.label.ar : unit.label.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Description (English) */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {isArabic ? "الوصف (إنجليزي)" : "Description (English)"} *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder={isArabic ? "أدخل وصف البند بالإنجليزية" : "Enter item description in English"}
              rows={3}
            />
          </div>

          {/* Description (Arabic) */}
          <div className="space-y-2">
            <Label htmlFor="description_ar">
              {isArabic ? "الوصف (عربي)" : "Description (Arabic)"}
            </Label>
            <Textarea
              id="description_ar"
              dir="rtl"
              value={formData.description_ar}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, description_ar: e.target.value }))
              }
              placeholder={isArabic ? "أدخل وصف البند بالعربية" : "Enter item description in Arabic"}
              rows={3}
            />
          </div>

          {/* Quantity */}
          {!formData.is_section && (
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {isArabic ? "الكمية" : "Quantity"} *
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, quantity: e.target.value }))
                }
                placeholder={isArabic ? "أدخل الكمية" : "Enter quantity"}
              />
            </div>
          )}

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                {isArabic ? "الفئة" : "Category"}
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر الفئة" : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value || "none"} value={cat.value || "none"}>
                      {isArabic ? cat.label.ar : cat.label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">
                {isArabic ? "الفئة الفرعية" : "Subcategory"}
              </Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, subcategory: e.target.value }))
                }
                placeholder={isArabic ? "أدخل الفئة الفرعية" : "Enter subcategory"}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-2">
            <Label htmlFor="specifications">
              {isArabic ? "المواصفات" : "Specifications"}
            </Label>
            <Textarea
              id="specifications"
              value={formData.specifications}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, specifications: e.target.value }))
              }
              placeholder={isArabic ? "أدخل المواصفات الفنية" : "Enter technical specifications"}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving 
              ? (isArabic ? "جاري الحفظ..." : "Saving...") 
              : (isArabic ? "حفظ التغييرات" : "Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
