import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Calculator, Building2, Copy, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface IndirectCost {
  id: string;
  category: string;
  categoryEn: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  costType: "fixed" | "percentage";
  value: number;
  total: number;
  notes: string;
}

const categories = {
  headquarters: { ar: "المكتب الرئيسي", en: "Headquarters" },
  operational: { ar: "مصاريف تشغيلية", en: "Operational Expenses" },
  financial: { ar: "مصاريف مالية", en: "Financial Costs" },
  reserve: { ar: "احتياطي", en: "Reserve" },
  technical: { ar: "مصاريف فنية", en: "Technical Expenses" },
  legal: { ar: "مصاريف قانونية", en: "Legal Expenses" },
  marketing: { ar: "تسويق وعلاقات", en: "Marketing & Relations" },
  training: { ar: "تدريب وتطوير", en: "Training & Development" },
  safety: { ar: "السلامة والصحة", en: "Safety & Health" },
  quality: { ar: "ضبط الجودة", en: "Quality Control" },
  environmental: { ar: "البيئة", en: "Environmental" },
  transport: { ar: "النقل والمواصلات", en: "Transportation" },
  other: { ar: "أخرى", en: "Other" },
};

// Cost presets for quick selection
const COST_PRESETS: Record<string, { nameAr: string; nameEn: string; descAr: string; descEn: string; defaultValue: number; type: "fixed" | "percentage" }[]> = {
  headquarters: [
    { nameAr: "مصاريف إدارية", nameEn: "Administrative Expenses", descAr: "مصاريف الإدارة العامة", descEn: "General administrative costs", defaultValue: 3, type: "percentage" },
    { nameAr: "دعم فني", nameEn: "Technical Support", descAr: "تكاليف الدعم الفني للمشروع", descEn: "Technical support costs", defaultValue: 1.5, type: "percentage" },
    { nameAr: "تنسيق وإشراف", nameEn: "Coordination & Supervision", descAr: "مصاريف التنسيق والإشراف", descEn: "Coordination and supervision costs", defaultValue: 1, type: "percentage" },
  ],
  operational: [
    { nameAr: "اتصالات وإنترنت", nameEn: "Communications & Internet", descAr: "فواتير الهاتف والإنترنت", descEn: "Phone and internet bills", defaultValue: 24000, type: "fixed" },
    { nameAr: "كهرباء ومياه", nameEn: "Electricity & Water", descAr: "فواتير الخدمات", descEn: "Utility bills", defaultValue: 36000, type: "fixed" },
    { nameAr: "قرطاسية ومطبوعات", nameEn: "Stationery & Printing", descAr: "مستلزمات المكتب", descEn: "Office supplies", defaultValue: 12000, type: "fixed" },
    { nameAr: "صيانة المعدات", nameEn: "Equipment Maintenance", descAr: "صيانة معدات المكتب", descEn: "Office equipment maintenance", defaultValue: 18000, type: "fixed" },
    { nameAr: "نظافة وأمن", nameEn: "Cleaning & Security", descAr: "خدمات النظافة والحراسة", descEn: "Cleaning and security services", defaultValue: 30000, type: "fixed" },
  ],
  financial: [
    { nameAr: "عمولات بنكية", nameEn: "Bank Commissions", descAr: "رسوم ضمانات ومعاملات بنكية", descEn: "Bank fees and commissions", defaultValue: 0.5, type: "percentage" },
    { nameAr: "فوائد تمويل", nameEn: "Financing Interest", descAr: "فوائد تمويل المشروع", descEn: "Project financing interest", defaultValue: 2, type: "percentage" },
    { nameAr: "رسوم حكومية", nameEn: "Government Fees", descAr: "رسوم ورخص حكومية", descEn: "Government licenses and fees", defaultValue: 15000, type: "fixed" },
  ],
  reserve: [
    { nameAr: "احتياطي طوارئ", nameEn: "Contingency Reserve", descAr: "احتياطي للظروف الطارئة", descEn: "Reserve for unforeseen circumstances", defaultValue: 2, type: "percentage" },
    { nameAr: "احتياطي مخاطر", nameEn: "Risk Reserve", descAr: "احتياطي لتغطية المخاطر", descEn: "Reserve for risk coverage", defaultValue: 1, type: "percentage" },
    { nameAr: "احتياطي تضخم", nameEn: "Inflation Reserve", descAr: "احتياطي لتغطية ارتفاع الأسعار", descEn: "Reserve for price escalation", defaultValue: 1.5, type: "percentage" },
  ],
  technical: [
    { nameAr: "استشارات هندسية", nameEn: "Engineering Consultancy", descAr: "رسوم الاستشاريين الهندسيين", descEn: "Engineering consultant fees", defaultValue: 1.5, type: "percentage" },
    { nameAr: "مختبرات واختبارات", nameEn: "Labs & Testing", descAr: "فحوصات المواد والتربة", descEn: "Material and soil testing", defaultValue: 25000, type: "fixed" },
    { nameAr: "رسومات تنفيذية", nameEn: "Shop Drawings", descAr: "إعداد الرسومات التفصيلية", descEn: "Detailed drawings preparation", defaultValue: 0.5, type: "percentage" },
    { nameAr: "برامج هندسية", nameEn: "Engineering Software", descAr: "تراخيص برامج التصميم", descEn: "Design software licenses", defaultValue: 15000, type: "fixed" },
  ],
  legal: [
    { nameAr: "استشارات قانونية", nameEn: "Legal Consultancy", descAr: "أتعاب المحامين والمستشارين", descEn: "Lawyer and consultant fees", defaultValue: 20000, type: "fixed" },
    { nameAr: "رسوم عقود", nameEn: "Contract Fees", descAr: "رسوم إعداد ومراجعة العقود", descEn: "Contract preparation and review fees", defaultValue: 0.3, type: "percentage" },
    { nameAr: "تسجيل وتوثيق", nameEn: "Registration & Notarization", descAr: "رسوم التوثيق الرسمي", descEn: "Official notarization fees", defaultValue: 10000, type: "fixed" },
    { nameAr: "تراخيص وتصاريح", nameEn: "Licenses & Permits", descAr: "رسوم التراخيص الحكومية", descEn: "Government license fees", defaultValue: 25000, type: "fixed" },
  ],
  marketing: [
    { nameAr: "علاقات عامة", nameEn: "Public Relations", descAr: "تكاليف العلاقات العامة", descEn: "PR costs", defaultValue: 15000, type: "fixed" },
    { nameAr: "دعاية وإعلان", nameEn: "Advertising", descAr: "حملات إعلانية وتسويقية", descEn: "Advertising campaigns", defaultValue: 10000, type: "fixed" },
    { nameAr: "هدايا وضيافة", nameEn: "Gifts & Hospitality", descAr: "استضافة العملاء والضيوف", descEn: "Client hospitality", defaultValue: 8000, type: "fixed" },
    { nameAr: "مواد تسويقية", nameEn: "Marketing Materials", descAr: "كتيبات وعروض تقديمية", descEn: "Brochures and presentations", defaultValue: 5000, type: "fixed" },
  ],
  training: [
    { nameAr: "تدريب الموظفين", nameEn: "Staff Training", descAr: "برامج تدريبية للعاملين", descEn: "Training programs", defaultValue: 20000, type: "fixed" },
    { nameAr: "شهادات مهنية", nameEn: "Professional Certifications", descAr: "الحصول على الشهادات المهنية", descEn: "Obtaining certifications", defaultValue: 15000, type: "fixed" },
    { nameAr: "ورش عمل", nameEn: "Workshops", descAr: "ورش عمل متخصصة", descEn: "Specialized workshops", defaultValue: 10000, type: "fixed" },
    { nameAr: "مؤتمرات ومعارض", nameEn: "Conferences & Exhibitions", descAr: "المشاركة في الفعاليات", descEn: "Event participation", defaultValue: 12000, type: "fixed" },
  ],
  safety: [
    { nameAr: "معدات السلامة", nameEn: "Safety Equipment", descAr: "معدات الحماية الشخصية", descEn: "PPE equipment", defaultValue: 30000, type: "fixed" },
    { nameAr: "تدريب السلامة", nameEn: "Safety Training", descAr: "دورات السلامة المهنية", descEn: "Safety courses", defaultValue: 15000, type: "fixed" },
    { nameAr: "فحوصات طبية", nameEn: "Medical Checkups", descAr: "الفحص الطبي الدوري للعاملين", descEn: "Periodic medical examination", defaultValue: 12000, type: "fixed" },
    { nameAr: "إسعافات أولية", nameEn: "First Aid", descAr: "مستلزمات وأدوات الإسعاف", descEn: "First aid supplies", defaultValue: 5000, type: "fixed" },
    { nameAr: "مسؤول سلامة", nameEn: "Safety Officer", descAr: "راتب مسؤول السلامة", descEn: "Safety officer salary", defaultValue: 60000, type: "fixed" },
  ],
  quality: [
    { nameAr: "فحوصات الجودة", nameEn: "Quality Inspections", descAr: "اختبارات ضبط الجودة", descEn: "QC testing", defaultValue: 0.5, type: "percentage" },
    { nameAr: "شهادات الأيزو", nameEn: "ISO Certifications", descAr: "الحصول على شهادات الجودة", descEn: "Quality certifications", defaultValue: 20000, type: "fixed" },
    { nameAr: "أدوات القياس", nameEn: "Measuring Tools", descAr: "معدات القياس والمعايرة", descEn: "Calibration equipment", defaultValue: 10000, type: "fixed" },
    { nameAr: "مهندس جودة", nameEn: "Quality Engineer", descAr: "راتب مهندس الجودة", descEn: "Quality engineer salary", defaultValue: 72000, type: "fixed" },
  ],
  environmental: [
    { nameAr: "دراسات بيئية", nameEn: "Environmental Studies", descAr: "تقييم الأثر البيئي", descEn: "Environmental impact assessment", defaultValue: 25000, type: "fixed" },
    { nameAr: "إدارة النفايات", nameEn: "Waste Management", descAr: "التخلص من النفايات", descEn: "Waste disposal", defaultValue: 15000, type: "fixed" },
    { nameAr: "مكافحة التلوث", nameEn: "Pollution Control", descAr: "معالجة التلوث والغبار", descEn: "Pollution treatment", defaultValue: 10000, type: "fixed" },
    { nameAr: "إعادة تأهيل الموقع", nameEn: "Site Rehabilitation", descAr: "تأهيل الموقع بعد الانتهاء", descEn: "Post-completion site restoration", defaultValue: 20000, type: "fixed" },
  ],
  transport: [
    { nameAr: "نقل موظفين", nameEn: "Staff Transportation", descAr: "مواصلات العاملين اليومية", descEn: "Daily worker transportation", defaultValue: 40000, type: "fixed" },
    { nameAr: "وقود ومحروقات", nameEn: "Fuel & Gasoline", descAr: "تكاليف الوقود للمركبات", descEn: "Vehicle fuel costs", defaultValue: 50000, type: "fixed" },
    { nameAr: "صيانة مركبات", nameEn: "Vehicle Maintenance", descAr: "صيانة السيارات والشاحنات", descEn: "Car and truck maintenance", defaultValue: 25000, type: "fixed" },
    { nameAr: "تأمين مركبات", nameEn: "Vehicle Insurance", descAr: "تأمين على المركبات", descEn: "Vehicle insurance", defaultValue: 15000, type: "fixed" },
  ],
  other: [
    { nameAr: "مصاريف متنوعة", nameEn: "Miscellaneous Expenses", descAr: "مصاريف أخرى غير مصنفة", descEn: "Other unclassified expenses", defaultValue: 10000, type: "fixed" },
    { nameAr: "مصاريف طارئة", nameEn: "Emergency Expenses", descAr: "مصاريف غير متوقعة", descEn: "Unexpected expenses", defaultValue: 0.5, type: "percentage" },
  ],
};

interface IndirectCostsTabProps {
  isArabic: boolean;
  contractValue?: number;
  initialData?: IndirectCost[];
  onDataChange?: (data: IndirectCost[]) => void;
  onTotalChange?: (total: number) => void;
}

export function IndirectCostsTab({ 
  isArabic, 
  contractValue = 10000000,
  initialData,
  onDataChange,
  onTotalChange 
}: IndirectCostsTabProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const calculateTotal = (costType: "fixed" | "percentage", value: number) => {
    return costType === "percentage" ? (contractValue * value) / 100 : value;
  };

  const createDefaultCosts = (): IndirectCost[] => [
    {
      id: "1",
      category: "headquarters",
      categoryEn: "Headquarters",
      name: "مصاريف إدارية",
      nameEn: "Administrative Expenses",
      description: "مصاريف الإدارة العامة",
      descriptionEn: "General administrative costs",
      costType: "percentage",
      value: 3,
      total: calculateTotal("percentage", 3),
      notes: "",
    },
    {
      id: "2",
      category: "headquarters",
      categoryEn: "Headquarters",
      name: "دعم فني",
      nameEn: "Technical Support",
      description: "تكاليف الدعم الفني للمشروع",
      descriptionEn: "Technical support costs",
      costType: "percentage",
      value: 1.5,
      total: calculateTotal("percentage", 1.5),
      notes: "",
    },
    {
      id: "3",
      category: "headquarters",
      categoryEn: "Headquarters",
      name: "تنسيق وإشراف",
      nameEn: "Coordination & Supervision",
      description: "مصاريف التنسيق والإشراف",
      descriptionEn: "Coordination and supervision costs",
      costType: "percentage",
      value: 1,
      total: calculateTotal("percentage", 1),
      notes: "",
    },
    {
      id: "4",
      category: "operational",
      categoryEn: "Operational",
      name: "اتصالات وإنترنت",
      nameEn: "Communications & Internet",
      description: "فواتير الهاتف والإنترنت",
      descriptionEn: "Phone and internet bills",
      costType: "fixed",
      value: 24000,
      total: 24000,
      notes: "",
    },
    {
      id: "5",
      category: "operational",
      categoryEn: "Operational",
      name: "كهرباء ومياه",
      nameEn: "Electricity & Water",
      description: "فواتير الخدمات",
      descriptionEn: "Utility bills",
      costType: "fixed",
      value: 36000,
      total: 36000,
      notes: "",
    },
    {
      id: "6",
      category: "operational",
      categoryEn: "Operational",
      name: "قرطاسية ومطبوعات",
      nameEn: "Stationery & Printing",
      description: "مستلزمات المكتب",
      descriptionEn: "Office supplies",
      costType: "fixed",
      value: 12000,
      total: 12000,
      notes: "",
    },
    {
      id: "7",
      category: "financial",
      categoryEn: "Financial",
      name: "عمولات بنكية",
      nameEn: "Bank Commissions",
      description: "رسوم ضمانات ومعاملات بنكية",
      descriptionEn: "Bank fees and commissions",
      costType: "percentage",
      value: 0.5,
      total: calculateTotal("percentage", 0.5),
      notes: "",
    },
    {
      id: "8",
      category: "financial",
      categoryEn: "Financial",
      name: "فوائد تمويل",
      nameEn: "Financing Interest",
      description: "فوائد تمويل المشروع",
      descriptionEn: "Project financing interest",
      costType: "percentage",
      value: 2,
      total: calculateTotal("percentage", 2),
      notes: "",
    },
    {
      id: "9",
      category: "reserve",
      categoryEn: "Reserve",
      name: "احتياطي طوارئ",
      nameEn: "Contingency Reserve",
      description: "احتياطي للظروف الطارئة",
      descriptionEn: "Reserve for unforeseen circumstances",
      costType: "percentage",
      value: 2,
      total: calculateTotal("percentage", 2),
      notes: "",
    },
  ];

  const [costs, setCosts] = useState<IndirectCost[]>(
    initialData && initialData.length > 0 ? initialData : createDefaultCosts()
  );

  // Sync with initial data
  useEffect(() => {
    if (initialData && initialData.length > 0 && !isInitialized) {
      setCosts(initialData);
      setIsInitialized(true);
    } else if (!initialData || initialData.length === 0) {
      setIsInitialized(true);
    }
  }, [initialData]);

  // Notify parent of data changes
  useEffect(() => {
    if (isInitialized) {
      onDataChange?.(costs);
    }
  }, [costs, isInitialized]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<IndirectCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: "headquarters" as keyof typeof categories,
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
    costType: "fixed" as "fixed" | "percentage",
    value: 0,
    notes: "",
    selectedPreset: "",
  });

  // Recalculate totals when contract value changes
  useEffect(() => {
    setCosts(prev => prev.map(cost => ({
      ...cost,
      total: calculateTotal(cost.costType, cost.value),
    })));
  }, [contractValue]);

  const totalCost = costs.reduce((sum, c) => sum + c.total, 0);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange?.(totalCost);
  }, [totalCost, onTotalChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const handleAdd = () => {
    setEditingCost(null);
    setFormData({
      category: "headquarters",
      name: "",
      nameEn: "",
      description: "",
      descriptionEn: "",
      costType: "fixed",
      value: 0,
      notes: "",
      selectedPreset: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (cost: IndirectCost) => {
    setEditingCost(cost);
    setFormData({
      category: cost.category as keyof typeof categories,
      name: cost.name,
      nameEn: cost.nameEn,
      description: cost.description || "",
      descriptionEn: cost.descriptionEn || "",
      costType: cost.costType,
      value: cost.value,
      notes: cost.notes || "",
      selectedPreset: "",
    });
    setShowDialog(true);
  };

  const handleDuplicate = (cost: IndirectCost) => {
    const newCost: IndirectCost = {
      ...cost,
      id: Date.now().toString(),
      name: `${cost.name} (نسخة)`,
      nameEn: `${cost.nameEn} (Copy)`,
    };
    setCosts(prev => [...prev, newCost]);
  };

  const handlePresetSelect = (presetIndex: string) => {
    if (!presetIndex) return;
    
    const presets = COST_PRESETS[formData.category] || [];
    const preset = presets[parseInt(presetIndex)];
    
    if (preset) {
      setFormData(prev => ({
        ...prev,
        name: preset.nameAr,
        nameEn: preset.nameEn,
        description: preset.descAr,
        descriptionEn: preset.descEn,
        costType: preset.type,
        value: preset.defaultValue,
        selectedPreset: presetIndex,
      }));
    }
  };

  const handleSave = () => {
    const total = calculateTotal(formData.costType, formData.value);
    
    if (editingCost) {
      setCosts(prev => prev.map(c =>
        c.id === editingCost.id
          ? {
              ...c,
              category: formData.category,
              categoryEn: categories[formData.category].en,
              name: formData.name,
              nameEn: formData.nameEn,
              description: formData.description,
              descriptionEn: formData.descriptionEn,
              costType: formData.costType,
              value: formData.value,
              total,
              notes: formData.notes,
            }
          : c
      ));
    } else {
      const newCost: IndirectCost = {
        id: Date.now().toString(),
        category: formData.category,
        categoryEn: categories[formData.category].en,
        name: formData.name,
        nameEn: formData.nameEn,
        description: formData.description,
        descriptionEn: formData.descriptionEn,
        costType: formData.costType,
        value: formData.value,
        total,
        notes: formData.notes,
      };
      setCosts(prev => [...prev, newCost]);
    }

    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    setCosts(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "headquarters": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "operational": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "financial": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "reserve": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "technical": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "legal": return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200";
      case "marketing": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "training": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "safety": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "quality": return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "environmental": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "transport": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "other": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  // Filter costs based on selected category
  const filteredCosts = filterCategory === "all" 
    ? costs 
    : costs.filter(c => c.category === filterCategory);

  // Group costs by category
  const groupedCosts = costs.reduce((acc, cost) => {
    if (!acc[cost.category]) {
      acc[cost.category] = [];
    }
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, IndirectCost[]>);

  // Calculate percentage of total for each cost
  const getPercentageOfTotal = (cost: IndirectCost) => {
    if (totalCost === 0) return 0;
    return ((cost.total / totalCost) * 100).toFixed(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {isArabic ? "التكاليف غير المباشرة" : "Indirect Costs"}
        </CardTitle>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {isArabic ? "إضافة بند" : "Add Item"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Contract Value Reference */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Calculator className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "قيمة العقد المرجعية" : "Reference Contract Value"}
              </p>
              <p className="text-xl font-bold">SAR {formatCurrency(contractValue)}</p>
            </div>
          </div>
        </div>

        {/* Filter by Category */}
        <div className="mb-4 flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm">{isArabic ? "فلترة حسب الفئة:" : "Filter by Category:"}</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "جميع الفئات" : "All Categories"}</SelectItem>
              {Object.entries(categories).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {isArabic ? value.ar : value.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{isArabic ? "الفئة" : "Category"}</TableHead>
                <TableHead>{isArabic ? "البند" : "Item"}</TableHead>
                <TableHead className="text-center">{isArabic ? "النوع" : "Type"}</TableHead>
                <TableHead className="text-center">{isArabic ? "القيمة" : "Value"}</TableHead>
                <TableHead className="text-center">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                <TableHead className="text-center">{isArabic ? "%" : "%"}</TableHead>
                <TableHead className="w-28">{isArabic ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCosts.map((cost, index) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryBadgeColor(cost.category)}>
                      {isArabic 
                        ? categories[cost.category as keyof typeof categories]?.ar || cost.category
                        : categories[cost.category as keyof typeof categories]?.en || cost.categoryEn}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{isArabic ? cost.name : cost.nameEn}</p>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? cost.nameEn : cost.name}
                      </p>
                      {(cost.description || cost.descriptionEn) && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {isArabic ? cost.description : cost.descriptionEn}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {cost.costType === "percentage" 
                        ? (isArabic ? "نسبة" : "Percentage") 
                        : (isArabic ? "ثابت" : "Fixed")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {cost.costType === "percentage" 
                      ? `${cost.value}%` 
                      : formatCurrency(cost.value)}
                  </TableCell>
                  <TableCell className="text-center font-medium text-primary">
                    {formatCurrency(cost.total)}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {getPercentageOfTotal(cost)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDuplicate(cost)}
                        title={isArabic ? "نسخ" : "Duplicate"}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cost)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(cost.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Category Summaries */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(categories).map(([key, value]) => {
            const categoryTotal = groupedCosts[key]?.reduce((sum, c) => sum + c.total, 0) || 0;
            const categoryPercent = totalCost > 0 ? ((categoryTotal / totalCost) * 100).toFixed(1) : "0";
            return (
              <div key={key} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {isArabic ? value.ar : value.en}
                </p>
                <p className="font-semibold">SAR {formatCurrency(categoryTotal)}</p>
                <p className="text-xs text-muted-foreground">{categoryPercent}%</p>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-4 flex justify-end">
          <div className="bg-muted rounded-lg px-6 py-3">
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي التكاليف غير المباشرة" : "Total Indirect Costs"}
            </p>
            <p className="text-2xl font-bold text-primary">
              SAR {formatCurrency(totalCost)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isArabic ? "من قيمة العقد" : "of Contract Value"}: {((totalCost / contractValue) * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCost
                  ? (isArabic ? "تعديل بند" : "Edit Item")
                  : (isArabic ? "إضافة بند تكلفة غير مباشرة" : "Add Indirect Cost Item")}
              </DialogTitle>
              <DialogDescription>
                {isArabic 
                  ? "إضافة بند تكلفة غير مباشرة جديد للمشروع"
                  : "Add a new indirect cost item to the project"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Category and Cost Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الفئة *" : "Category *"}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: keyof typeof categories) => {
                      setFormData({ ...formData, category: value, selectedPreset: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categories).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {isArabic ? value.ar : value.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع الحساب *" : "Calculation Type *"}</Label>
                  <RadioGroup
                    value={formData.costType}
                    onValueChange={(value: "fixed" | "percentage") => 
                      setFormData({ ...formData, costType: value })}
                    className="flex gap-4 pt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed" className="cursor-pointer">
                        {isArabic ? "مبلغ ثابت" : "Fixed Amount"}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id="percentage" />
                      <Label htmlFor="percentage" className="cursor-pointer">
                        {isArabic ? "نسبة مئوية" : "Percentage"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Preset Selection */}
              {COST_PRESETS[formData.category]?.length > 0 && (
                <div className="space-y-2">
                  <Label>{isArabic ? "اختيار بند جاهز (اختياري)" : "Select Preset (Optional)"}</Label>
                  <Select
                    value={formData.selectedPreset}
                    onValueChange={handlePresetSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isArabic ? "اختر من القائمة أو أدخل يدوياً" : "Select from list or enter manually"} />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_PRESETS[formData.category]?.map((preset, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {isArabic ? preset.nameAr : preset.nameEn} - {preset.type === "percentage" ? `${preset.defaultValue}%` : `${formatCurrency(preset.defaultValue)} SAR`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Item Names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم البند (عربي) *" : "Item Name (Arabic) *"}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isArabic ? "أدخل الاسم بالعربي" : "Enter Arabic name"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم البند (إنجليزي) *" : "Item Name (English) *"}</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder={isArabic ? "أدخل الاسم بالإنجليزي" : "Enter English name"}
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={isArabic ? "وصف اختياري" : "Optional description"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Input
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    placeholder={isArabic ? "وصف اختياري" : "Optional description"}
                  />
                </div>
              </div>

              {/* Value Input */}
              <div className="space-y-2">
                <Label>
                  {formData.costType === "percentage" 
                    ? (isArabic ? "النسبة المئوية % *" : "Percentage % *")
                    : (isArabic ? "المبلغ الثابت (SAR) *" : "Fixed Amount (SAR) *")}
                </Label>
                <Input
                  type="number"
                  step={formData.costType === "percentage" ? "0.1" : "1"}
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  className="text-lg"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات اختيارية..." : "Optional notes..."}
                  rows={2}
                />
              </div>

              {/* Calculation Summary */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">
                  {isArabic ? "تفاصيل الحساب" : "Calculation Details"}
                </h4>
                {formData.costType === "percentage" ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isArabic ? "قيمة العقد" : "Contract Value"}
                      </span>
                      <span>SAR {formatCurrency(contractValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isArabic ? "النسبة المطبقة" : "Applied Percentage"}
                      </span>
                      <span>{formData.value}%</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>=</span>
                        <span>{formatCurrency(contractValue)} × {formData.value}%</span>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>{isArabic ? "المبلغ المحسوب" : "Calculated Amount"}</span>
                  <span className="text-primary">
                    SAR {formatCurrency(calculateTotal(formData.costType, formData.value))}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={!formData.name || !formData.nameEn}>
                {editingCost 
                  ? (isArabic ? "تحديث" : "Update")
                  : (isArabic ? "إضافة" : "Add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isArabic
                  ? "هل أنت متأكد من حذف هذا البند؟ لا يمكن التراجع عن هذا الإجراء."
                  : "Are you sure you want to delete this item? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
                {isArabic ? "حذف" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
