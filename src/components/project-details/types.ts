export interface ProjectData {
  id: string;
  name: string;
  file_name: string | null;
  analysis_data: any;
  wbs_data: any;
  total_value: number | null;
  items_count: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  item_number: string;
  description: string | null;
  description_ar: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
  subcategory: string | null;
  specifications: string | null;
  is_section: boolean | null;
  sort_order: number | null;
}

export interface ProjectAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  category: string | null;
}

export interface EditFormData {
  name: string;
  currency: string;
  description: string;
  project_type: string;
  location: string;
  client_name: string;
  status: string;
}

export interface PricingStats {
  totalItems: number;
  pricedItems: number;
  confirmedItems: number;
  unpricedItems: number;
  pricingPercentage: number;
  totalValue: number;
}

export const statusConfig = {
  draft: { 
    label: { ar: "مسودة", en: "Draft" }, 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20" 
  },
  in_progress: { 
    label: { ar: "قيد التنفيذ", en: "In Progress" }, 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20" 
  },
  completed: { 
    label: { ar: "مكتمل", en: "Completed" }, 
    color: "bg-green-500/10 text-green-600 border-green-500/20" 
  },
  suspended: { 
    label: { ar: "معلق", en: "Suspended" }, 
    color: "bg-red-500/10 text-red-600 border-red-500/20" 
  },
};

export const currencies = [
  { value: "SAR", label: "ريال سعودي / SAR" },
  { value: "USD", label: "دولار أمريكي / USD" },
  { value: "EUR", label: "يورو / EUR" },
  { value: "AED", label: "درهم إماراتي / AED" },
  { value: "KWD", label: "دينار كويتي / KWD" },
  { value: "QAR", label: "ريال قطري / QAR" },
  { value: "BHD", label: "دينار بحريني / BHD" },
  { value: "OMR", label: "ريال عماني / OMR" },
  { value: "EGP", label: "جنيه مصري / EGP" },
];

export const projectTypes = [
  { value: "construction", label: { ar: "بناء", en: "Construction" } },
  { value: "infrastructure", label: { ar: "بنية تحتية", en: "Infrastructure" } },
  { value: "renovation", label: { ar: "تجديد", en: "Renovation" } },
  { value: "maintenance", label: { ar: "صيانة", en: "Maintenance" } },
  { value: "other", label: { ar: "أخرى", en: "Other" } },
];

export const CHART_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
