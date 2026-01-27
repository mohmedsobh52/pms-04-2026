import { useState, useMemo, useCallback, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";
import { toast } from "sonner";
import { 
  Search, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Target, 
  BarChart3, Activity, ChevronLeft, ChevronRight, ArrowUpDown, Download,
  Building2, Zap, Wrench, PaintBucket, HardHat, Database, Loader2, Edit, Save, RefreshCw
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// ============= INTERFACES =============
interface EVMActivity {
  sn: number;
  controlPoint: string;
  activity: string;
  activityAr: string;
  discipline: string;
  activityCode: string;
  pv: number;
  progress: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number;
  spi: number;
  eac1: number;
  eac2: number;
  eac3: number;
  eacByPert: number;
  etc: number;
  tcpi: number;
  itemsCount?: number;
  isFromDB?: boolean;
}

interface ProjectData {
  id: string;
  name: string;
  currency: string | null;
  total_value: number | null;
  items_count: number | null;
  created_at: string;
}

interface ProjectItem {
  id: string;
  project_id: string;
  item_number: string;
  description: string | null;
  description_ar: string | null;
  category: string | null;
  subcategory: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

interface ProgressHistory {
  id: string;
  project_id: string | null;
  actual_progress: number | null;
  planned_progress: number | null;
  actual_cost: number | null;
  record_date: string;
}

// ============= DISCIPLINES =============
const disciplines = [
  { id: "GENERAL", label: "GENERAL", labelAr: "عام", icon: Building2, color: "text-slate-600" },
  { id: "CIVIL", label: "CIVIL", labelAr: "مدني", icon: HardHat, color: "text-amber-600" },
  { id: "MECHANICAL", label: "MECHANICAL", labelAr: "ميكانيكي", icon: Wrench, color: "text-blue-600" },
  { id: "ELECTRICAL", label: "ELECTRICAL", labelAr: "كهربائي", icon: Zap, color: "text-yellow-600" },
  { id: "ARCHITECTURAL", label: "ARCHITECTURAL", labelAr: "معماري", icon: PaintBucket, color: "text-purple-600" },
];

// ============= CATEGORY TO DISCIPLINE MAPPING =============
const CATEGORY_TO_DISCIPLINE: Record<string, string> = {
  // CIVIL
  'excavation': 'CIVIL', 'حفر': 'CIVIL',
  'concrete': 'CIVIL', 'خرسانة': 'CIVIL',
  'reinforcement': 'CIVIL', 'تسليح': 'CIVIL',
  'foundations': 'CIVIL', 'أساسات': 'CIVIL',
  'structural': 'CIVIL', 'إنشائي': 'CIVIL',
  'masonry': 'CIVIL', 'بناء': 'CIVIL',
  'waterproofing': 'CIVIL', 'عزل': 'CIVIL',
  'earthwork': 'CIVIL', 'أعمال ترابية': 'CIVIL',
  'piling': 'CIVIL', 'خوازيق': 'CIVIL',
  'shoring': 'CIVIL', 'سند': 'CIVIL',
  
  // MECHANICAL
  'plumbing': 'MECHANICAL', 'سباكة': 'MECHANICAL',
  'hvac': 'MECHANICAL', 'تكييف': 'MECHANICAL',
  'firefighting': 'MECHANICAL', 'إطفاء': 'MECHANICAL',
  'drainage': 'MECHANICAL', 'صرف': 'MECHANICAL',
  'mechanical': 'MECHANICAL', 'ميكانيكي': 'MECHANICAL',
  'elevator': 'MECHANICAL', 'مصاعد': 'MECHANICAL',
  'pumps': 'MECHANICAL', 'مضخات': 'MECHANICAL',
  
  // ELECTRICAL
  'electrical': 'ELECTRICAL', 'كهرباء': 'ELECTRICAL',
  'lighting': 'ELECTRICAL', 'إضاءة': 'ELECTRICAL',
  'low_current': 'ELECTRICAL', 'تيار خفيف': 'ELECTRICAL',
  'power': 'ELECTRICAL', 'طاقة': 'ELECTRICAL',
  'cables': 'ELECTRICAL', 'كابلات': 'ELECTRICAL',
  'generator': 'ELECTRICAL', 'مولد': 'ELECTRICAL',
  
  // ARCHITECTURAL
  'finishing': 'ARCHITECTURAL', 'تشطيبات': 'ARCHITECTURAL',
  'doors': 'ARCHITECTURAL', 'أبواب': 'ARCHITECTURAL',
  'windows': 'ARCHITECTURAL', 'نوافذ': 'ARCHITECTURAL',
  'cladding': 'ARCHITECTURAL', 'تكسية': 'ARCHITECTURAL',
  'flooring': 'ARCHITECTURAL', 'أرضيات': 'ARCHITECTURAL',
  'painting': 'ARCHITECTURAL', 'دهانات': 'ARCHITECTURAL',
  'ceiling': 'ARCHITECTURAL', 'أسقف': 'ARCHITECTURAL',
  'tiles': 'ARCHITECTURAL', 'بلاط': 'ARCHITECTURAL',
  'marble': 'ARCHITECTURAL', 'رخام': 'ARCHITECTURAL',
  'aluminum': 'ARCHITECTURAL', 'ألومنيوم': 'ARCHITECTURAL',
  
  // GENERAL
  'general': 'GENERAL', 'عام': 'GENERAL',
  'preliminaries': 'GENERAL', 'تمهيدي': 'GENERAL',
  'mobilization': 'GENERAL', 'تجهيزات': 'GENERAL',
  'temporary': 'GENERAL', 'مؤقت': 'GENERAL',
  'insurance': 'GENERAL', 'تأمين': 'GENERAL',
  'safety': 'GENERAL', 'سلامة': 'GENERAL',
};

const mapCategoryToDiscipline = (category: string | null): string => {
  if (!category) return 'GENERAL';
  const normalized = category.toLowerCase().replace(/[\s-_]/g, '');
  for (const [key, discipline] of Object.entries(CATEGORY_TO_DISCIPLINE)) {
    if (normalized.includes(key.toLowerCase().replace(/[\s-_]/g, ''))) {
      return discipline;
    }
  }
  return 'GENERAL';
};

const getCategoryLabel = (category: string | null): string => {
  if (!category) return 'General Items';
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/[_-]/g, ' ');
};

const getCategoryLabelAr = (category: string | null): string => {
  if (!category) return 'بنود عامة';
  const categoryMap: Record<string, string> = {
    'excavation': 'الحفر',
    'concrete': 'الخرسانة',
    'reinforcement': 'التسليح',
    'plumbing': 'السباكة',
    'electrical': 'الكهرباء',
    'finishing': 'التشطيبات',
    'hvac': 'التكييف',
    'general': 'عام',
  };
  return categoryMap[category.toLowerCase()] || category;
};

// ============= SAMPLE DATA (82 Activities) =============
const sampleActivities: EVMActivity[] = [
  // GENERAL (12 activities)
  { sn: 1, controlPoint: "CP01", activity: "Staff Salaries", activityAr: "رواتب الموظفين", discipline: "GENERAL", activityCode: "GEN-001", pv: 1700000, progress: 80, ev: 1360000, ac: 1380000, cv: -20000, sv: -340000, cpi: 0.99, spi: 0.80, eac1: 1720000, eac2: 1750000, eac3: 1710000, eacByPert: 1726667, etc: 346667, tcpi: 0.95 },
  { sn: 2, controlPoint: "CP02", activity: "Site Overhead", activityAr: "مصاريف الموقع العامة", discipline: "GENERAL", activityCode: "GEN-002", pv: 8400000, progress: 100, ev: 8400000, ac: 8500000, cv: -100000, sv: 0, cpi: 0.99, spi: 1.00, eac1: 8585859, eac2: 8600000, eac3: 8570000, eacByPert: 8585286, etc: 85286, tcpi: 0.00 },
  { sn: 3, controlPoint: "CP03", activity: "Safety and Environmental", activityAr: "السلامة والبيئة", discipline: "GENERAL", activityCode: "GEN-003", pv: 2100000, progress: 85, ev: 1785000, ac: 1800000, cv: -15000, sv: -315000, cpi: 0.99, spi: 0.85, eac1: 2121212, eac2: 2150000, eac3: 2100000, eacByPert: 2123737, etc: 323737, tcpi: 0.93 },
  { sn: 4, controlPoint: "CP04", activity: "Quality Control", activityAr: "ضبط الجودة", discipline: "GENERAL", activityCode: "GEN-004", pv: 1400000, progress: 75, ev: 1050000, ac: 1070000, cv: -20000, sv: -350000, cpi: 0.98, spi: 0.75, eac1: 1428571, eac2: 1450000, eac3: 1420000, eacByPert: 1432857, etc: 362857, tcpi: 0.92 },
  { sn: 5, controlPoint: "CP05", activity: "Transportation", activityAr: "النقل والمواصلات", discipline: "GENERAL", activityCode: "GEN-005", pv: 3500000, progress: 90, ev: 3150000, ac: 3200000, cv: -50000, sv: -350000, cpi: 0.98, spi: 0.90, eac1: 3571429, eac2: 3600000, eac3: 3550000, eacByPert: 3573810, etc: 373810, tcpi: 0.88 },
  { sn: 6, controlPoint: "CP06", activity: "Temporary Facilities", activityAr: "المنشآت المؤقتة", discipline: "GENERAL", activityCode: "GEN-006", pv: 4200000, progress: 95, ev: 3990000, ac: 4050000, cv: -60000, sv: -210000, cpi: 0.99, spi: 0.95, eac1: 4242424, eac2: 4280000, eac3: 4220000, eacByPert: 4247475, etc: 197475, tcpi: 0.71 },
  { sn: 7, controlPoint: "CP07", activity: "Insurance", activityAr: "التأمين", discipline: "GENERAL", activityCode: "GEN-007", pv: 2800000, progress: 100, ev: 2800000, ac: 2850000, cv: -50000, sv: 0, cpi: 0.98, spi: 1.00, eac1: 2857143, eac2: 2880000, eac3: 2840000, eacByPert: 2859048, etc: 9048, tcpi: 0.00 },
  { sn: 8, controlPoint: "CP08", activity: "Scaffolding", activityAr: "السقالات", discipline: "GENERAL", activityCode: "GEN-008", pv: 5600000, progress: 70, ev: 3920000, ac: 4000000, cv: -80000, sv: -1680000, cpi: 0.98, spi: 0.70, eac1: 5714286, eac2: 5800000, eac3: 5680000, eacByPert: 5731429, etc: 1731429, tcpi: 0.95 },
  { sn: 9, controlPoint: "CP09", activity: "Office Expenses", activityAr: "مصروفات المكتب", discipline: "GENERAL", activityCode: "GEN-009", pv: 980000, progress: 88, ev: 862400, ac: 875000, cv: -12600, sv: -117600, cpi: 0.99, spi: 0.88, eac1: 989899, eac2: 1000000, eac3: 985000, eacByPert: 991633, etc: 116633, tcpi: 0.89 },
  { sn: 10, controlPoint: "CP10", activity: "Communication", activityAr: "الاتصالات", discipline: "GENERAL", activityCode: "GEN-010", pv: 420000, progress: 92, ev: 386400, ac: 392000, cv: -5600, sv: -33600, cpi: 0.99, spi: 0.92, eac1: 424242, eac2: 430000, eac3: 422000, eacByPert: 425414, etc: 33414, tcpi: 0.82 },
  { sn: 11, controlPoint: "CP11", activity: "Engineering & 3rd Party", activityAr: "الهندسة والأطراف الثالثة", discipline: "GENERAL", activityCode: "GEN-011", pv: 7000000, progress: 65, ev: 4550000, ac: 4650000, cv: -100000, sv: -2450000, cpi: 0.98, spi: 0.65, eac1: 7142857, eac2: 7250000, eac3: 7100000, eacByPert: 7164286, etc: 2514286, tcpi: 0.96 },
  { sn: 12, controlPoint: "CP12", activity: "Miscellaneous", activityAr: "متفرقات", discipline: "GENERAL", activityCode: "GEN-012", pv: 1400000, progress: 78, ev: 1092000, ac: 1110000, cv: -18000, sv: -308000, cpi: 0.98, spi: 0.78, eac1: 1428571, eac2: 1450000, eac3: 1420000, eacByPert: 1432857, etc: 322857, tcpi: 0.93 },
  
  // CIVIL (25 activities)
  { sn: 13, controlPoint: "CP13", activity: "Excavation", activityAr: "الحفر", discipline: "CIVIL", activityCode: "CIV-001", pv: 4200000, progress: 100, ev: 4200000, ac: 4250000, cv: -50000, sv: 0, cpi: 0.99, spi: 1.00, eac1: 4242424, eac2: 4280000, eac3: 4220000, eacByPert: 4247475, etc: -2525, tcpi: 0.00 },
  { sn: 14, controlPoint: "CP14", activity: "Backfilling", activityAr: "الردم", discipline: "CIVIL", activityCode: "CIV-002", pv: 2800000, progress: 98, ev: 2744000, ac: 2780000, cv: -36000, sv: -56000, cpi: 0.99, spi: 0.98, eac1: 2828283, eac2: 2860000, eac3: 2810000, eacByPert: 2832761, etc: 52761, tcpi: 0.72 },
  { sn: 15, controlPoint: "CP15", activity: "Plain/Lean Concrete", activityAr: "الخرسانة العادية", discipline: "CIVIL", activityCode: "CIV-003", pv: 3500000, progress: 95, ev: 3325000, ac: 3380000, cv: -55000, sv: -175000, cpi: 0.98, spi: 0.95, eac1: 3571429, eac2: 3620000, eac3: 3550000, eacByPert: 3580476, etc: 200476, tcpi: 0.85 },
  { sn: 16, controlPoint: "CP16", activity: "Reinforced Concrete Foundations", activityAr: "أساسات خرسانية مسلحة", discipline: "CIVIL", activityCode: "CIV-004", pv: 12600000, progress: 88, ev: 11088000, ac: 11280000, cv: -192000, sv: -1512000, cpi: 0.98, spi: 0.88, eac1: 12857143, eac2: 13050000, eac3: 12750000, eacByPert: 12885714, etc: 1605714, tcpi: 0.94 },
  { sn: 17, controlPoint: "CP17", activity: "Reinforced Concrete Columns", activityAr: "أعمدة خرسانية مسلحة", discipline: "CIVIL", activityCode: "CIV-005", pv: 8400000, progress: 82, ev: 6888000, ac: 7020000, cv: -132000, sv: -1512000, cpi: 0.98, spi: 0.82, eac1: 8571429, eac2: 8700000, eac3: 8500000, eacByPert: 8590476, etc: 1570476, tcpi: 0.95 },
  { sn: 18, controlPoint: "CP18", activity: "Reinforced Concrete Beams", activityAr: "كمرات خرسانية مسلحة", discipline: "CIVIL", activityCode: "CIV-006", pv: 7000000, progress: 78, ev: 5460000, ac: 5570000, cv: -110000, sv: -1540000, cpi: 0.98, spi: 0.78, eac1: 7142857, eac2: 7260000, eac3: 7080000, eacByPert: 7160952, etc: 1590952, tcpi: 0.96 },
  { sn: 19, controlPoint: "CP19", activity: "Reinforced Concrete Slabs", activityAr: "بلاطات خرسانية مسلحة", discipline: "CIVIL", activityCode: "CIV-007", pv: 14000000, progress: 72, ev: 10080000, ac: 10300000, cv: -220000, sv: -3920000, cpi: 0.98, spi: 0.72, eac1: 14285714, eac2: 14520000, eac3: 14180000, eacByPert: 14328571, etc: 4028571, tcpi: 0.97 },
  { sn: 20, controlPoint: "CP20", activity: "Reinforced Concrete Stairs", activityAr: "سلالم خرسانية مسلحة", discipline: "CIVIL", activityCode: "CIV-008", pv: 2100000, progress: 68, ev: 1428000, ac: 1460000, cv: -32000, sv: -672000, cpi: 0.98, spi: 0.68, eac1: 2142857, eac2: 2180000, eac3: 2120000, eacByPert: 2147619, etc: 687619, tcpi: 0.97 },
  { sn: 21, controlPoint: "CP21", activity: "Reinforced Concrete Walls", activityAr: "جدران خرسانية مسلحة", discipline: "CIVIL", activityCode: "CIV-009", pv: 5600000, progress: 65, ev: 3640000, ac: 3720000, cv: -80000, sv: -1960000, cpi: 0.98, spi: 0.65, eac1: 5714286, eac2: 5820000, eac3: 5680000, eacByPert: 5738095, etc: 2018095, tcpi: 0.97 },
  { sn: 22, controlPoint: "CP22", activity: "Steel Structure", activityAr: "المنشآت الحديدية", discipline: "CIVIL", activityCode: "CIV-010", pv: 9800000, progress: 55, ev: 5390000, ac: 5510000, cv: -120000, sv: -4410000, cpi: 0.98, spi: 0.55, eac1: 10000000, eac2: 10180000, eac3: 9920000, eacByPert: 10033333, etc: 4523333, tcpi: 0.98 },
  { sn: 23, controlPoint: "CP23", activity: "Waterproofing", activityAr: "العزل المائي", discipline: "CIVIL", activityCode: "CIV-011", pv: 3500000, progress: 62, ev: 2170000, ac: 2220000, cv: -50000, sv: -1330000, cpi: 0.98, spi: 0.62, eac1: 3571429, eac2: 3640000, eac3: 3540000, eacByPert: 3583810, etc: 1363810, tcpi: 0.97 },
  { sn: 24, controlPoint: "CP24", activity: "Thermal Insulation", activityAr: "العزل الحراري", discipline: "CIVIL", activityCode: "CIV-012", pv: 2800000, progress: 58, ev: 1624000, ac: 1660000, cv: -36000, sv: -1176000, cpi: 0.98, spi: 0.58, eac1: 2857143, eac2: 2910000, eac3: 2830000, eacByPert: 2865714, etc: 1205714, tcpi: 0.98 },
  { sn: 25, controlPoint: "CP25", activity: "Masonry Works", activityAr: "أعمال البناء", discipline: "CIVIL", activityCode: "CIV-013", pv: 4900000, progress: 52, ev: 2548000, ac: 2600000, cv: -52000, sv: -2352000, cpi: 0.98, spi: 0.52, eac1: 5000000, eac2: 5090000, eac3: 4960000, eacByPert: 5016667, etc: 2416667, tcpi: 0.98 },
  { sn: 26, controlPoint: "CP26", activity: "Precast Elements", activityAr: "العناصر سابقة الصب", discipline: "CIVIL", activityCode: "CIV-014", pv: 6300000, progress: 48, ev: 3024000, ac: 3090000, cv: -66000, sv: -3276000, cpi: 0.98, spi: 0.48, eac1: 6428571, eac2: 6550000, eac3: 6380000, eacByPert: 6452857, etc: 3362857, tcpi: 0.99 },
  { sn: 27, controlPoint: "CP27", activity: "Pile Foundation", activityAr: "أساسات الخوازيق", discipline: "CIVIL", activityCode: "CIV-015", pv: 8400000, progress: 100, ev: 8400000, ac: 8520000, cv: -120000, sv: 0, cpi: 0.99, spi: 1.00, eac1: 8484848, eac2: 8560000, eac3: 8440000, eacByPert: 8494949, etc: -25051, tcpi: 0.00 },
  { sn: 28, controlPoint: "CP28", activity: "Raft Foundation", activityAr: "أساسات لبشة", discipline: "CIVIL", activityCode: "CIV-016", pv: 5600000, progress: 95, ev: 5320000, ac: 5400000, cv: -80000, sv: -280000, cpi: 0.99, spi: 0.95, eac1: 5656566, eac2: 5720000, eac3: 5620000, eacByPert: 5665657, etc: 265657, tcpi: 0.85 },
  { sn: 29, controlPoint: "CP29", activity: "Ground Improvement", activityAr: "تحسين التربة", discipline: "CIVIL", activityCode: "CIV-017", pv: 3500000, progress: 100, ev: 3500000, ac: 3550000, cv: -50000, sv: 0, cpi: 0.99, spi: 1.00, eac1: 3535354, eac2: 3580000, eac3: 3520000, eacByPert: 3545118, etc: -4882, tcpi: 0.00 },
  { sn: 30, controlPoint: "CP30", activity: "Dewatering", activityAr: "نزح المياه", discipline: "CIVIL", activityCode: "CIV-018", pv: 1400000, progress: 100, ev: 1400000, ac: 1420000, cv: -20000, sv: 0, cpi: 0.99, spi: 1.00, eac1: 1414141, eac2: 1440000, eac3: 1410000, eacByPert: 1421380, etc: 1380, tcpi: 0.00 },
  { sn: 31, controlPoint: "CP31", activity: "Shoring Works", activityAr: "أعمال السند", discipline: "CIVIL", activityCode: "CIV-019", pv: 2800000, progress: 100, ev: 2800000, ac: 2840000, cv: -40000, sv: 0, cpi: 0.99, spi: 1.00, eac1: 2828283, eac2: 2880000, eac3: 2820000, eacByPert: 2842761, etc: 2761, tcpi: 0.00 },
  { sn: 32, controlPoint: "CP32", activity: "Concrete Curbs", activityAr: "حواجز خرسانية", discipline: "CIVIL", activityCode: "CIV-020", pv: 980000, progress: 45, ev: 441000, ac: 450000, cv: -9000, sv: -539000, cpi: 0.98, spi: 0.45, eac1: 1000000, eac2: 1020000, eac3: 990000, eacByPert: 1003333, etc: 553333, tcpi: 0.99 },
  { sn: 33, controlPoint: "CP33", activity: "Retaining Walls", activityAr: "جدران استنادية", discipline: "CIVIL", activityCode: "CIV-021", pv: 4200000, progress: 42, ev: 1764000, ac: 1800000, cv: -36000, sv: -2436000, cpi: 0.98, spi: 0.42, eac1: 4285714, eac2: 4360000, eac3: 4240000, eacByPert: 4295238, etc: 2495238, tcpi: 0.99 },
  { sn: 34, controlPoint: "CP34", activity: "External Paving", activityAr: "الرصف الخارجي", discipline: "CIVIL", activityCode: "CIV-022", pv: 3500000, progress: 38, ev: 1330000, ac: 1360000, cv: -30000, sv: -2170000, cpi: 0.98, spi: 0.38, eac1: 3571429, eac2: 3640000, eac3: 3540000, eacByPert: 3583810, etc: 2223810, tcpi: 0.99 },
  { sn: 35, controlPoint: "CP35", activity: "Boundary Walls", activityAr: "أسوار محيطة", discipline: "CIVIL", activityCode: "CIV-023", pv: 2100000, progress: 35, ev: 735000, ac: 750000, cv: -15000, sv: -1365000, cpi: 0.98, spi: 0.35, eac1: 2142857, eac2: 2180000, eac3: 2120000, eacByPert: 2147619, etc: 1397619, tcpi: 0.99 },
  { sn: 36, controlPoint: "CP36", activity: "Concrete Manholes", activityAr: "غرف تفتيش خرسانية", discipline: "CIVIL", activityCode: "CIV-024", pv: 1680000, progress: 32, ev: 537600, ac: 548000, cv: -10400, sv: -1142400, cpi: 0.98, spi: 0.32, eac1: 1714286, eac2: 1745000, eac3: 1700000, eacByPert: 1719762, etc: 1171762, tcpi: 0.99 },
  { sn: 37, controlPoint: "CP37", activity: "Concrete Channels", activityAr: "قنوات خرسانية", discipline: "CIVIL", activityCode: "CIV-025", pv: 1120000, progress: 28, ev: 313600, ac: 320000, cv: -6400, sv: -806400, cpi: 0.98, spi: 0.28, eac1: 1142857, eac2: 1165000, eac3: 1135000, eacByPert: 1147619, etc: 827619, tcpi: 0.99 },
  
  // MECHANICAL (16 activities)
  { sn: 38, controlPoint: "CP38", activity: "Water Supply System", activityAr: "شبكة إمداد المياه", discipline: "MECHANICAL", activityCode: "MEC-001", pv: 5600000, progress: 58, ev: 3248000, ac: 3320000, cv: -72000, sv: -2352000, cpi: 0.98, spi: 0.58, eac1: 5714286, eac2: 5820000, eac3: 5680000, eacByPert: 5738095, etc: 2418095, tcpi: 0.98 },
  { sn: 39, controlPoint: "CP39", activity: "Drainage System", activityAr: "شبكة الصرف الصحي", discipline: "MECHANICAL", activityCode: "MEC-002", pv: 4200000, progress: 55, ev: 2310000, ac: 2360000, cv: -50000, sv: -1890000, cpi: 0.98, spi: 0.55, eac1: 4285714, eac2: 4370000, eac3: 4250000, eacByPert: 4301905, etc: 1941905, tcpi: 0.98 },
  { sn: 40, controlPoint: "CP40", activity: "HVAC Systems", activityAr: "أنظمة التكييف والتهوية", discipline: "MECHANICAL", activityCode: "MEC-003", pv: 14000000, progress: 48, ev: 6720000, ac: 6860000, cv: -140000, sv: -7280000, cpi: 0.98, spi: 0.48, eac1: 14285714, eac2: 14560000, eac3: 14180000, eacByPert: 14341905, etc: 7481905, tcpi: 0.99 },
  { sn: 41, controlPoint: "CP41", activity: "Fire Fighting System", activityAr: "نظام مكافحة الحرائق", discipline: "MECHANICAL", activityCode: "MEC-004", pv: 7000000, progress: 52, ev: 3640000, ac: 3720000, cv: -80000, sv: -3360000, cpi: 0.98, spi: 0.52, eac1: 7142857, eac2: 7280000, eac3: 7100000, eacByPert: 7174286, etc: 3454286, tcpi: 0.98 },
  { sn: 42, controlPoint: "CP42", activity: "Plumbing Fixtures", activityAr: "تركيبات السباكة", discipline: "MECHANICAL", activityCode: "MEC-005", pv: 2800000, progress: 42, ev: 1176000, ac: 1200000, cv: -24000, sv: -1624000, cpi: 0.98, spi: 0.42, eac1: 2857143, eac2: 2910000, eac3: 2830000, eacByPert: 2865714, etc: 1665714, tcpi: 0.99 },
  { sn: 43, controlPoint: "CP43", activity: "Gas System", activityAr: "نظام الغاز", discipline: "MECHANICAL", activityCode: "MEC-006", pv: 1400000, progress: 38, ev: 532000, ac: 543000, cv: -11000, sv: -868000, cpi: 0.98, spi: 0.38, eac1: 1428571, eac2: 1455000, eac3: 1420000, eacByPert: 1434524, etc: 891524, tcpi: 0.99 },
  { sn: 44, controlPoint: "CP44", activity: "Elevator Systems", activityAr: "أنظمة المصاعد", discipline: "MECHANICAL", activityCode: "MEC-007", pv: 8400000, progress: 35, ev: 2940000, ac: 3000000, cv: -60000, sv: -5460000, cpi: 0.98, spi: 0.35, eac1: 8571429, eac2: 8730000, eac3: 8500000, eacByPert: 8600476, etc: 5600476, tcpi: 0.99 },
  { sn: 45, controlPoint: "CP45", activity: "Escalator Systems", activityAr: "أنظمة السلالم الكهربائية", discipline: "MECHANICAL", activityCode: "MEC-008", pv: 4200000, progress: 32, ev: 1344000, ac: 1370000, cv: -26000, sv: -2856000, cpi: 0.98, spi: 0.32, eac1: 4285714, eac2: 4365000, eac3: 4250000, eacByPert: 4300238, etc: 2930238, tcpi: 0.99 },
  { sn: 46, controlPoint: "CP46", activity: "Kitchen Equipment", activityAr: "معدات المطبخ", discipline: "MECHANICAL", activityCode: "MEC-009", pv: 2100000, progress: 28, ev: 588000, ac: 600000, cv: -12000, sv: -1512000, cpi: 0.98, spi: 0.28, eac1: 2142857, eac2: 2180000, eac3: 2120000, eacByPert: 2147619, etc: 1547619, tcpi: 0.99 },
  { sn: 47, controlPoint: "CP47", activity: "Laundry Equipment", activityAr: "معدات الغسيل", discipline: "MECHANICAL", activityCode: "MEC-010", pv: 1400000, progress: 25, ev: 350000, ac: 357000, cv: -7000, sv: -1050000, cpi: 0.98, spi: 0.25, eac1: 1428571, eac2: 1455000, eac3: 1420000, eacByPert: 1434524, etc: 1077524, tcpi: 0.99 },
  { sn: 48, controlPoint: "CP48", activity: "Fuel System", activityAr: "نظام الوقود", discipline: "MECHANICAL", activityCode: "MEC-011", pv: 980000, progress: 22, ev: 215600, ac: 220000, cv: -4400, sv: -764400, cpi: 0.98, spi: 0.22, eac1: 1000000, eac2: 1020000, eac3: 990000, eacByPert: 1003333, etc: 783333, tcpi: 0.99 },
  { sn: 49, controlPoint: "CP49", activity: "Compressed Air System", activityAr: "نظام الهواء المضغوط", discipline: "MECHANICAL", activityCode: "MEC-012", pv: 700000, progress: 18, ev: 126000, ac: 128500, cv: -2500, sv: -574000, cpi: 0.98, spi: 0.18, eac1: 714286, eac2: 728000, eac3: 710000, eacByPert: 717429, etc: 588929, tcpi: 1.00 },
  { sn: 50, controlPoint: "CP50", activity: "Steam System", activityAr: "نظام البخار", discipline: "MECHANICAL", activityCode: "MEC-013", pv: 1120000, progress: 15, ev: 168000, ac: 171500, cv: -3500, sv: -952000, cpi: 0.98, spi: 0.15, eac1: 1142857, eac2: 1165000, eac3: 1135000, eacByPert: 1147619, etc: 976119, tcpi: 1.00 },
  { sn: 51, controlPoint: "CP51", activity: "Pool Mechanical", activityAr: "ميكانيكا حمام السباحة", discipline: "MECHANICAL", activityCode: "MEC-014", pv: 2100000, progress: 12, ev: 252000, ac: 257000, cv: -5000, sv: -1848000, cpi: 0.98, spi: 0.12, eac1: 2142857, eac2: 2180000, eac3: 2120000, eacByPert: 2147619, etc: 1890619, tcpi: 1.00 },
  { sn: 52, controlPoint: "CP52", activity: "BMS Controls", activityAr: "نظام إدارة المباني", discipline: "MECHANICAL", activityCode: "MEC-015", pv: 3500000, progress: 18, ev: 630000, ac: 643000, cv: -13000, sv: -2870000, cpi: 0.98, spi: 0.18, eac1: 3571429, eac2: 3640000, eac3: 3540000, eacByPert: 3583810, etc: 2940810, tcpi: 1.00 },
  { sn: 53, controlPoint: "CP53", activity: "Pumping Stations", activityAr: "محطات الضخ", discipline: "MECHANICAL", activityCode: "MEC-016", pv: 2800000, progress: 22, ev: 616000, ac: 628500, cv: -12500, sv: -2184000, cpi: 0.98, spi: 0.22, eac1: 2857143, eac2: 2910000, eac3: 2830000, eacByPert: 2865714, etc: 2237214, tcpi: 0.99 },
  
  // ELECTRICAL (15 activities)
  { sn: 54, controlPoint: "CP54", activity: "Lighting Fixtures", activityAr: "تركيبات الإضاءة", discipline: "ELECTRICAL", activityCode: "ELE-001", pv: 4200000, progress: 48, ev: 2016000, ac: 2060000, cv: -44000, sv: -2184000, cpi: 0.98, spi: 0.48, eac1: 4285714, eac2: 4370000, eac3: 4250000, eacByPert: 4301905, etc: 2241905, tcpi: 0.99 },
  { sn: 55, controlPoint: "CP55", activity: "Wiring Devices", activityAr: "أجهزة التوصيل الكهربائي", discipline: "ELECTRICAL", activityCode: "ELE-002", pv: 2100000, progress: 45, ev: 945000, ac: 965000, cv: -20000, sv: -1155000, cpi: 0.98, spi: 0.45, eac1: 2142857, eac2: 2185000, eac3: 2125000, eacByPert: 2150952, etc: 1185952, tcpi: 0.99 },
  { sn: 56, controlPoint: "CP56", activity: "Distribution Panels", activityAr: "لوحات التوزيع", discipline: "ELECTRICAL", activityCode: "ELE-003", pv: 5600000, progress: 52, ev: 2912000, ac: 2975000, cv: -63000, sv: -2688000, cpi: 0.98, spi: 0.52, eac1: 5714286, eac2: 5825000, eac3: 5680000, eacByPert: 5739762, etc: 2764762, tcpi: 0.98 },
  { sn: 57, controlPoint: "CP57", activity: "Power Cables", activityAr: "كابلات الطاقة", discipline: "ELECTRICAL", activityCode: "ELE-004", pv: 7000000, progress: 58, ev: 4060000, ac: 4145000, cv: -85000, sv: -2940000, cpi: 0.98, spi: 0.58, eac1: 7142857, eac2: 7280000, eac3: 7100000, eacByPert: 7174286, etc: 3029286, tcpi: 0.98 },
  { sn: 58, controlPoint: "CP58", activity: "Control Cables", activityAr: "كابلات التحكم", discipline: "ELECTRICAL", activityCode: "ELE-005", pv: 2800000, progress: 55, ev: 1540000, ac: 1572000, cv: -32000, sv: -1260000, cpi: 0.98, spi: 0.55, eac1: 2857143, eac2: 2915000, eac3: 2835000, eacByPert: 2869048, etc: 1297048, tcpi: 0.98 },
  { sn: 59, controlPoint: "CP59", activity: "Earthing System", activityAr: "نظام التأريض", discipline: "ELECTRICAL", activityCode: "ELE-006", pv: 1400000, progress: 62, ev: 868000, ac: 886000, cv: -18000, sv: -532000, cpi: 0.98, spi: 0.62, eac1: 1428571, eac2: 1457000, eac3: 1420000, eacByPert: 1435190, etc: 549190, tcpi: 0.97 },
  { sn: 60, controlPoint: "CP60", activity: "Lightning Protection", activityAr: "الحماية من الصواعق", discipline: "ELECTRICAL", activityCode: "ELE-007", pv: 700000, progress: 58, ev: 406000, ac: 414500, cv: -8500, sv: -294000, cpi: 0.98, spi: 0.58, eac1: 714286, eac2: 728500, eac3: 710000, eacByPert: 717595, etc: 303095, tcpi: 0.98 },
  { sn: 61, controlPoint: "CP61", activity: "Substation Equipment", activityAr: "معدات المحطة الفرعية", discipline: "ELECTRICAL", activityCode: "ELE-008", pv: 9800000, progress: 42, ev: 4116000, ac: 4200000, cv: -84000, sv: -5684000, cpi: 0.98, spi: 0.42, eac1: 10000000, eac2: 10190000, eac3: 9930000, eacByPert: 10040000, etc: 5840000, tcpi: 0.99 },
  { sn: 62, controlPoint: "CP62", activity: "Generator Systems", activityAr: "أنظمة المولدات", discipline: "ELECTRICAL", activityCode: "ELE-009", pv: 5600000, progress: 38, ev: 2128000, ac: 2172000, cv: -44000, sv: -3472000, cpi: 0.98, spi: 0.38, eac1: 5714286, eac2: 5825000, eac3: 5680000, eacByPert: 5739762, etc: 3567762, tcpi: 0.99 },
  { sn: 63, controlPoint: "CP63", activity: "UPS Systems", activityAr: "أنظمة الطاقة الاحتياطية", discipline: "ELECTRICAL", activityCode: "ELE-010", pv: 2800000, progress: 35, ev: 980000, ac: 1000000, cv: -20000, sv: -1820000, cpi: 0.98, spi: 0.35, eac1: 2857143, eac2: 2912000, eac3: 2835000, eacByPert: 2868048, etc: 1868048, tcpi: 0.99 },
  { sn: 64, controlPoint: "CP64", activity: "Fire Alarm System", activityAr: "نظام إنذار الحريق", discipline: "ELECTRICAL", activityCode: "ELE-011", pv: 3500000, progress: 42, ev: 1470000, ac: 1500000, cv: -30000, sv: -2030000, cpi: 0.98, spi: 0.42, eac1: 3571429, eac2: 3640000, eac3: 3540000, eacByPert: 3583810, etc: 2083810, tcpi: 0.99 },
  { sn: 65, controlPoint: "CP65", activity: "CCTV System", activityAr: "نظام المراقبة التلفزيونية", discipline: "ELECTRICAL", activityCode: "ELE-012", pv: 2100000, progress: 38, ev: 798000, ac: 814000, cv: -16000, sv: -1302000, cpi: 0.98, spi: 0.38, eac1: 2142857, eac2: 2185000, eac3: 2125000, eacByPert: 2150952, etc: 1336952, tcpi: 0.99 },
  { sn: 66, controlPoint: "CP66", activity: "Access Control", activityAr: "نظام التحكم في الدخول", discipline: "ELECTRICAL", activityCode: "ELE-013", pv: 1400000, progress: 32, ev: 448000, ac: 457000, cv: -9000, sv: -952000, cpi: 0.98, spi: 0.32, eac1: 1428571, eac2: 1457000, eac3: 1420000, eacByPert: 1435190, etc: 978190, tcpi: 0.99 },
  { sn: 67, controlPoint: "CP67", activity: "Public Address System", activityAr: "نظام الإذاعة العامة", discipline: "ELECTRICAL", activityCode: "ELE-014", pv: 980000, progress: 28, ev: 274400, ac: 280000, cv: -5600, sv: -705600, cpi: 0.98, spi: 0.28, eac1: 1000000, eac2: 1020000, eac3: 990000, eacByPert: 1003333, etc: 723333, tcpi: 0.99 },
  { sn: 68, controlPoint: "CP68", activity: "Telephone System", activityAr: "نظام الهاتف", discipline: "ELECTRICAL", activityCode: "ELE-015", pv: 1680000, progress: 25, ev: 420000, ac: 428500, cv: -8500, sv: -1260000, cpi: 0.98, spi: 0.25, eac1: 1714286, eac2: 1748000, eac3: 1705000, eacByPert: 1722429, etc: 1293929, tcpi: 0.99 },
  
  // ARCHITECTURAL (14 activities)
  { sn: 69, controlPoint: "CP69", activity: "Wooden Doors", activityAr: "الأبواب الخشبية", discipline: "ARCHITECTURAL", activityCode: "ARC-001", pv: 3500000, progress: 42, ev: 1470000, ac: 1500000, cv: -30000, sv: -2030000, cpi: 0.98, spi: 0.42, eac1: 3571429, eac2: 3640000, eac3: 3540000, eacByPert: 3583810, etc: 2083810, tcpi: 0.99 },
  { sn: 70, controlPoint: "CP70", activity: "Metal Doors", activityAr: "الأبواب المعدنية", discipline: "ARCHITECTURAL", activityCode: "ARC-002", pv: 2100000, progress: 38, ev: 798000, ac: 814000, cv: -16000, sv: -1302000, cpi: 0.98, spi: 0.38, eac1: 2142857, eac2: 2185000, eac3: 2125000, eacByPert: 2150952, etc: 1336952, tcpi: 0.99 },
  { sn: 71, controlPoint: "CP71", activity: "Aluminum Windows", activityAr: "النوافذ الألومنيوم", discipline: "ARCHITECTURAL", activityCode: "ARC-003", pv: 4900000, progress: 35, ev: 1715000, ac: 1750000, cv: -35000, sv: -3185000, cpi: 0.98, spi: 0.35, eac1: 5000000, eac2: 5095000, eac3: 4965000, eacByPert: 5020000, etc: 3270000, tcpi: 0.99 },
  { sn: 72, controlPoint: "CP72", activity: "Curtain Wall", activityAr: "الحوائط الستائرية", discipline: "ARCHITECTURAL", activityCode: "ARC-004", pv: 9800000, progress: 28, ev: 2744000, ac: 2800000, cv: -56000, sv: -7056000, cpi: 0.98, spi: 0.28, eac1: 10000000, eac2: 10195000, eac3: 9935000, eacByPert: 10043333, etc: 7243333, tcpi: 0.99 },
  { sn: 73, controlPoint: "CP73", activity: "False Ceiling", activityAr: "الأسقف المستعارة", discipline: "ARCHITECTURAL", activityCode: "ARC-005", pv: 4200000, progress: 32, ev: 1344000, ac: 1372000, cv: -28000, sv: -2856000, cpi: 0.98, spi: 0.32, eac1: 4285714, eac2: 4370000, eac3: 4250000, eacByPert: 4301905, etc: 2929905, tcpi: 0.99 },
  { sn: 74, controlPoint: "CP74", activity: "Floor Finishes", activityAr: "تشطيبات الأرضيات", discipline: "ARCHITECTURAL", activityCode: "ARC-006", pv: 5600000, progress: 25, ev: 1400000, ac: 1428000, cv: -28000, sv: -4200000, cpi: 0.98, spi: 0.25, eac1: 5714286, eac2: 5825000, eac3: 5680000, eacByPert: 5739762, etc: 4311762, tcpi: 0.99 },
  { sn: 75, controlPoint: "CP75", activity: "Wall Finishes", activityAr: "تشطيبات الجدران", discipline: "ARCHITECTURAL", activityCode: "ARC-007", pv: 4200000, progress: 22, ev: 924000, ac: 943000, cv: -19000, sv: -3276000, cpi: 0.98, spi: 0.22, eac1: 4285714, eac2: 4368000, eac3: 4248000, eacByPert: 4300571, etc: 3357571, tcpi: 0.99 },
  { sn: 76, controlPoint: "CP76", activity: "Painting Works", activityAr: "أعمال الدهانات", discipline: "ARCHITECTURAL", activityCode: "ARC-008", pv: 2800000, progress: 18, ev: 504000, ac: 514000, cv: -10000, sv: -2296000, cpi: 0.98, spi: 0.18, eac1: 2857143, eac2: 2912000, eac3: 2835000, eacByPert: 2868048, etc: 2354048, tcpi: 1.00 },
  { sn: 77, controlPoint: "CP77", activity: "Stone Cladding", activityAr: "تكسية الحجر", discipline: "ARCHITECTURAL", activityCode: "ARC-009", pv: 7000000, progress: 15, ev: 1050000, ac: 1071000, cv: -21000, sv: -5950000, cpi: 0.98, spi: 0.15, eac1: 7142857, eac2: 7280000, eac3: 7100000, eacByPert: 7174286, etc: 6103286, tcpi: 1.00 },
  { sn: 78, controlPoint: "CP78", activity: "Ceramic Tiles", activityAr: "البلاط السيراميك", discipline: "ARCHITECTURAL", activityCode: "ARC-010", pv: 3500000, progress: 28, ev: 980000, ac: 1000000, cv: -20000, sv: -2520000, cpi: 0.98, spi: 0.28, eac1: 3571429, eac2: 3640000, eac3: 3540000, eacByPert: 3583810, etc: 2583810, tcpi: 0.99 },
  { sn: 79, controlPoint: "CP79", activity: "Marble Works", activityAr: "أعمال الرخام", discipline: "ARCHITECTURAL", activityCode: "ARC-011", pv: 4200000, progress: 22, ev: 924000, ac: 943000, cv: -19000, sv: -3276000, cpi: 0.98, spi: 0.22, eac1: 4285714, eac2: 4368000, eac3: 4248000, eacByPert: 4300571, etc: 3357571, tcpi: 0.99 },
  { sn: 80, controlPoint: "CP80", activity: "Kitchen Cabinets", activityAr: "خزائن المطبخ", discipline: "ARCHITECTURAL", activityCode: "ARC-012", pv: 2100000, progress: 18, ev: 378000, ac: 386000, cv: -8000, sv: -1722000, cpi: 0.98, spi: 0.18, eac1: 2142857, eac2: 2185000, eac3: 2125000, eacByPert: 2150952, etc: 1764952, tcpi: 1.00 },
  { sn: 81, controlPoint: "CP81", activity: "Bathroom Accessories", activityAr: "إكسسوارات الحمام", discipline: "ARCHITECTURAL", activityCode: "ARC-013", pv: 1400000, progress: 15, ev: 210000, ac: 214000, cv: -4000, sv: -1190000, cpi: 0.98, spi: 0.15, eac1: 1428571, eac2: 1457000, eac3: 1420000, eacByPert: 1435190, etc: 1221190, tcpi: 1.00 },
  { sn: 82, controlPoint: "CP82", activity: "Signage Works", activityAr: "أعمال اللافتات", discipline: "ARCHITECTURAL", activityCode: "ARC-014", pv: 700000, progress: 12, ev: 84000, ac: 86000, cv: -2000, sv: -616000, cpi: 0.98, spi: 0.12, eac1: 714286, eac2: 728000, eac3: 710000, eacByPert: 717429, etc: 631429, tcpi: 1.00 },
];

// ============= CHART OPTIONS =============
const createChartOptions = (isArabic: boolean) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'center' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: { size: 12, weight: 500 },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1f2937',
      bodyColor: '#4b5563',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const value = context.parsed.y;
          return `${context.dataset.label}: ${formatValue(value * 1000000)}`;
        }
      }
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: {
        callback: function(value: any) {
          return formatValue(value * 1000000);
        },
      },
    },
  },
});

// ============= HELPER FUNCTIONS =============
const formatValue = (value: number): string => {
  if (Math.abs(value) >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  }
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
};

const getProgressColor = (progress: number) => {
  if (progress >= 75) return "bg-emerald-500";
  if (progress >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const getProgressTextColor = (progress: number) => {
  if (progress >= 75) return "text-emerald-600";
  if (progress >= 50) return "text-amber-600";
  return "text-rose-600";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "success": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "warning": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "danger": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const getIndexStatus = (value: number) => {
  if (value >= 1.0) return "success";
  if (value >= 0.9) return "warning";
  return "danger";
};

// ============= EVM CALCULATION FUNCTION =============
const calculateEVMFromItems = (items: ProjectItem[], progressPercent: number) => {
  const pv = items.reduce((sum, i) => sum + (i.total_price || 0), 0);
  const ev = pv * (progressPercent / 100);
  const costVarianceFactor = 1.015; // 1.5% cost overrun assumption
  const ac = ev * costVarianceFactor;
  
  const cv = ev - ac;
  const sv = ev - pv;
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 0;
  
  const bac = pv;
  const eac1 = cpi > 0 ? bac / cpi : bac;
  const eac2 = ac + (bac - ev);
  const eac3 = cpi > 0 && spi > 0 ? ac + ((bac - ev) / (cpi * spi)) : bac;
  const eacByPert = (eac1 + 4 * eac2 + eac3) / 6;
  const etc = eacByPert - ac;
  const tcpi = (bac - ev) > 0 ? (bac - ev) / (bac - ac) : 0;
  
  return { pv, ev, ac, cv, sv, cpi, spi, eac1, eac2, eac3, eacByPert, etc, tcpi };
};

// ============= CONVERT PROJECT ITEMS TO EVM ACTIVITIES =============
const convertItemsToActivities = (items: ProjectItem[], progressData: ProgressHistory | null): EVMActivity[] => {
  // Group items by category
  const groupedByCategory: Record<string, ProjectItem[]> = {};
  
  items.forEach(item => {
    const category = item.category || 'general';
    if (!groupedByCategory[category]) {
      groupedByCategory[category] = [];
    }
    groupedByCategory[category].push(item);
  });
  
  // Convert each category group to an EVM activity
  const activities: EVMActivity[] = [];
  let sn = 1;
  
  Object.entries(groupedByCategory).forEach(([category, categoryItems]) => {
    const discipline = mapCategoryToDiscipline(category);
    
    // Calculate progress based on priced items or use progress history
    let progressPercent = 60; // Default progress
    if (progressData?.actual_progress) {
      progressPercent = progressData.actual_progress;
    } else {
      // Estimate progress based on priced items
      const pricedItems = categoryItems.filter(i => i.unit_price && i.unit_price > 0);
      progressPercent = categoryItems.length > 0 
        ? (pricedItems.length / categoryItems.length) * 100 * 0.6 
        : 60;
    }
    
    const evmMetrics = calculateEVMFromItems(categoryItems, progressPercent);
    
    activities.push({
      sn,
      controlPoint: `CP${String(sn).padStart(2, '0')}`,
      activity: getCategoryLabel(category),
      activityAr: getCategoryLabelAr(category),
      discipline,
      activityCode: `${discipline.substring(0, 3)}-${String(sn).padStart(3, '0')}`,
      pv: evmMetrics.pv,
      progress: Math.round(progressPercent),
      ev: evmMetrics.ev,
      ac: evmMetrics.ac,
      cv: evmMetrics.cv,
      sv: evmMetrics.sv,
      cpi: evmMetrics.cpi,
      spi: evmMetrics.spi,
      eac1: evmMetrics.eac1,
      eac2: evmMetrics.eac2,
      eac3: evmMetrics.eac3,
      eacByPert: evmMetrics.eacByPert,
      etc: evmMetrics.etc,
      tcpi: evmMetrics.tcpi,
      itemsCount: categoryItems.length,
      isFromDB: true,
    });
    
    sn++;
  });
  
  return activities;
};

export default function CostControlReportPage() {
  const { isArabic } = useLanguage();
  
  // Project and data state
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [progressHistory, setProgressHistory] = useState<ProgressHistory | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [useRealData, setUseRealData] = useState(false);
  
  // UI state
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof EVMActivity>("sn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const itemsPerPage = 15;

  // Edit progress dialog
  const [editProgressDialog, setEditProgressDialog] = useState<{
    open: boolean;
    progress: number;
  }>({ open: false, progress: 60 });

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('project_data')
          .select('id, name, currency, total_value, items_count, created_at')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error(isArabic ? 'فشل في تحميل المشاريع' : 'Failed to load projects');
      } finally {
        setIsLoadingProjects(false);
      }
    };
    
    fetchProjects();
  }, [isArabic]);

  // Fetch project items when project is selected
  useEffect(() => {
    if (!selectedProjectId || !useRealData) return;
    
    const fetchProjectData = async () => {
      setIsLoadingItems(true);
      try {
        // Fetch project items
        const { data: items, error: itemsError } = await supabase
          .from('project_items')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('sort_order');
        
        if (itemsError) throw itemsError;
        setProjectItems(items || []);
        
        // Fetch latest progress history
        const { data: progress, error: progressError } = await supabase
          .from('project_progress_history')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('record_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (progressError) throw progressError;
        setProgressHistory(progress);
        
        toast.success(isArabic 
          ? `تم تحميل ${items?.length || 0} بند من المشروع` 
          : `Loaded ${items?.length || 0} items from project`
        );
      } catch (error) {
        console.error('Error fetching project data:', error);
        toast.error(isArabic ? 'فشل في تحميل بيانات المشروع' : 'Failed to load project data');
      } finally {
        setIsLoadingItems(false);
      }
    };
    
    fetchProjectData();
  }, [selectedProjectId, useRealData, isArabic]);

  // Get activities based on data source
  const allActivities = useMemo(() => {
    if (useRealData && projectItems.length > 0) {
      return convertItemsToActivities(projectItems, progressHistory);
    }
    return sampleActivities;
  }, [useRealData, projectItems, progressHistory]);

  // Filter activities based on selections
  const filteredActivities = useMemo(() => {
    let filtered = allActivities;
    
    if (selectedDisciplines.length > 0) {
      filtered = filtered.filter(a => selectedDisciplines.includes(a.discipline));
    }
    
    if (selectedActivities.length > 0) {
      filtered = filtered.filter(a => selectedActivities.includes(a.activityCode));
    }
    
    return filtered;
  }, [allActivities, selectedDisciplines, selectedActivities]);

  // Calculate totals from filtered activities
  const totals = useMemo(() => {
    const pv = filteredActivities.reduce((sum, a) => sum + a.pv, 0);
    const ev = filteredActivities.reduce((sum, a) => sum + a.ev, 0);
    const ac = filteredActivities.reduce((sum, a) => sum + a.ac, 0);
    const cv = ev - ac;
    const sv = ev - pv;
    const cpi = ac > 0 ? ev / ac : 0;
    const spi = pv > 0 ? ev / pv : 0;
    const bac = pv;
    const eac1 = cpi > 0 ? bac / cpi : bac;
    const eac2 = ac + (bac - ev);
    const eac3 = cpi > 0 && spi > 0 ? ac + ((bac - ev) / (cpi * spi)) : bac;
    const eacByPert = (eac1 + 4 * eac2 + eac3) / 6;
    const etc = eacByPert - ac;
    const tcpi = (bac - ev) > 0 ? (bac - ev) / (bac - ac) : 0;
    const progress = pv > 0 ? (ev / pv) * 100 : 0;

    return { pv, ev, ac, cv, sv, cpi, spi, eacByPert, etc, tcpi, progress };
  }, [filteredActivities]);

  // Calculate discipline progress
  const disciplineProgress = useMemo(() => {
    return disciplines.map(d => {
      const discActivities = allActivities.filter(a => a.discipline === d.id);
      const avgProgress = discActivities.length > 0 
        ? discActivities.reduce((sum, a) => sum + a.progress, 0) / discActivities.length 
        : 0;
      return { ...d, progress: Math.round(avgProgress) };
    });
  }, [allActivities]);

  // Sort and paginate activities
  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredActivities, sortField, sortDirection]);

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedActivities.slice(start, start + itemsPerPage);
  }, [sortedActivities, currentPage]);

  const totalPages = Math.ceil(sortedActivities.length / itemsPerPage);

  // Chart data preparation
  const chartData = useMemo(() => {
    const disciplineData = disciplines.map(d => {
      const discActivities = filteredActivities.filter(a => a.discipline === d.id);
      return {
        label: d.label,
        pv: discActivities.reduce((sum, a) => sum + a.pv, 0) / 1000000,
        ev: discActivities.reduce((sum, a) => sum + a.ev, 0) / 1000000,
        ac: discActivities.reduce((sum, a) => sum + a.ac, 0) / 1000000,
        eacByPert: discActivities.reduce((sum, a) => sum + a.eacByPert, 0) / 1000000,
      };
    });

    return {
      labels: disciplineData.map(d => d.label),
      datasets: [
        {
          type: 'bar' as const,
          label: 'PV',
          data: disciplineData.map(d => d.pv),
          backgroundColor: 'hsl(32, 36%, 44%)',
          borderColor: 'hsl(32, 36%, 34%)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
        {
          type: 'bar' as const,
          label: 'EV',
          data: disciplineData.map(d => d.ev),
          backgroundColor: 'hsl(35, 30%, 58%)',
          borderColor: 'hsl(35, 30%, 48%)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
        {
          type: 'bar' as const,
          label: 'AC',
          data: disciplineData.map(d => d.ac),
          backgroundColor: 'hsl(38, 25%, 65%)',
          borderColor: 'hsl(38, 25%, 55%)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        },
        {
          type: 'line' as const,
          label: 'EAC BY PERT',
          data: disciplineData.map(d => d.eacByPert),
          borderColor: 'hsl(45, 93%, 47%)',
          backgroundColor: 'hsla(45, 93%, 47%, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: 'hsl(45, 93%, 47%)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.3,
          fill: false,
        },
      ],
    };
  }, [filteredActivities]);

  // Handlers
  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    setCurrentPage(1);
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
    setCurrentPage(1);
  };

  const handleSort = (field: keyof EVMActivity) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedProjectId) {
      toast.error(isArabic ? 'اختر مشروع أولاً' : 'Select a project first');
      return;
    }
    
    try {
      const { error } = await supabase.from('project_progress_history').insert({
        project_id: selectedProjectId,
        actual_progress: editProgressDialog.progress,
        record_date: new Date().toISOString(),
        user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
      });
      
      if (error) throw error;
      
      setProgressHistory({
        id: 'new',
        project_id: selectedProjectId,
        actual_progress: editProgressDialog.progress,
        planned_progress: null,
        actual_cost: null,
        record_date: new Date().toISOString(),
      });
      
      setEditProgressDialog({ open: false, progress: 60 });
      toast.success(isArabic ? 'تم تحديث التقدم' : 'Progress updated');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error(isArabic ? 'فشل في تحديث التقدم' : 'Failed to update progress');
    }
  };

  const handleSaveReport = async () => {
    if (!selectedProjectId) {
      toast.error(isArabic ? 'اختر مشروع أولاً' : 'Select a project first');
      return;
    }
    
    setIsSaving(true);
    try {
      // Convert activities to JSON-compatible format
      const activitiesForJson = filteredActivities.map(a => ({
        sn: a.sn,
        activity: a.activity,
        activityAr: a.activityAr,
        discipline: a.discipline,
        activityCode: a.activityCode,
        pv: a.pv,
        ev: a.ev,
        ac: a.ac,
        progress: a.progress,
        cpi: a.cpi,
        spi: a.spi,
        eacByPert: a.eacByPert,
        etc: a.etc,
        tcpi: a.tcpi,
      }));
      
      const { error } = await supabase
        .from('project_data')
        .update({
          analysis_data: JSON.parse(JSON.stringify({
            evm_report: {
              generated_at: new Date().toISOString(),
              totals: {
                pv: totals.pv,
                ev: totals.ev,
                ac: totals.ac,
                cv: totals.cv,
                sv: totals.sv,
                cpi: totals.cpi,
                spi: totals.spi,
                eacByPert: totals.eacByPert,
                etc: totals.etc,
                tcpi: totals.tcpi,
                progress: totals.progress,
              },
              activities: activitiesForJson,
            }
          }))
        })
        .eq('id', selectedProjectId);
      
      if (error) throw error;
      toast.success(isArabic ? 'تم حفظ التقرير' : 'Report saved');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error(isArabic ? 'فشل في حفظ التقرير' : 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const workbook = createWorkbook();
      
      // Summary Sheet
      addJsonSheet(workbook, [
        { Metric: 'PV (Planned Value)', Value: totals.pv, Formatted: formatValue(totals.pv) },
        { Metric: 'EV (Earned Value)', Value: totals.ev, Formatted: formatValue(totals.ev) },
        { Metric: 'AC (Actual Cost)', Value: totals.ac, Formatted: formatValue(totals.ac) },
        { Metric: 'CV (Cost Variance)', Value: totals.cv, Formatted: formatValue(totals.cv) },
        { Metric: 'SV (Schedule Variance)', Value: totals.sv, Formatted: formatValue(totals.sv) },
        { Metric: 'CPI (Cost Performance Index)', Value: totals.cpi.toFixed(2) },
        { Metric: 'SPI (Schedule Performance Index)', Value: totals.spi.toFixed(2) },
        { Metric: 'EAC BY PERT', Value: totals.eacByPert, Formatted: formatValue(totals.eacByPert) },
        { Metric: 'ETC (Estimate to Complete)', Value: totals.etc, Formatted: formatValue(totals.etc) },
        { Metric: 'TCPI', Value: totals.tcpi.toFixed(2) },
        { Metric: 'Progress %', Value: totals.progress.toFixed(1) + '%' },
      ], 'Summary');
      
      // Activities Sheet
      addJsonSheet(workbook, filteredActivities.map(a => ({
        'SN': a.sn,
        'Activity Code': a.activityCode,
        'Activity': a.activity,
        'Activity (AR)': a.activityAr,
        'Discipline': a.discipline,
        'Progress %': a.progress,
        'PV': a.pv,
        'EV': a.ev,
        'AC': a.ac,
        'CV': a.cv,
        'SV': a.sv,
        'CPI': a.cpi.toFixed(2),
        'SPI': a.spi.toFixed(2),
        'EAC BY PERT': a.eacByPert.toFixed(0),
        'ETC': a.etc.toFixed(0),
        'TCPI': a.tcpi.toFixed(2),
        'Items Count': a.itemsCount || '-',
      })), 'Activities');
      
      await downloadWorkbook(workbook, 'Cost_Control_Report.xlsx');
      toast.success(isArabic ? 'تم التصدير بنجاح' : 'Export successful');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(isArabic ? 'فشل التصدير' : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [filteredActivities, totals, isArabic]);

  // Filter sidebar lists
  const filteredDisciplineList = disciplineProgress.filter(d =>
    d.label.toLowerCase().includes(disciplineSearch.toLowerCase()) ||
    d.labelAr.includes(disciplineSearch)
  );

  const filteredActivityList = useMemo(() => {
    const activityList = allActivities.map(a => ({
      id: a.activityCode,
      label: a.activity,
      labelAr: a.activityAr,
      progress: a.progress,
    }));
    
    return activityList.filter(a =>
      a.label.toLowerCase().includes(activitySearch.toLowerCase()) ||
      a.labelAr.includes(activitySearch)
    );
  }, [allActivities, activitySearch]);

  // KPI Cards data
  const kpiRow1 = [
    { label: "PV", labelAr: "القيمة المخططة", value: formatValue(totals.pv), icon: Target, color: "from-blue-500 to-blue-600" },
    { label: "EV", labelAr: "القيمة المكتسبة", value: formatValue(totals.ev), icon: TrendingUp, color: "from-emerald-500 to-emerald-600" },
    { label: "AC", labelAr: "التكلفة الفعلية", value: formatValue(totals.ac), icon: DollarSign, color: "from-amber-500 to-orange-500" },
    { label: "EAC BY PERT", labelAr: "التقدير عند الإنتهاء", value: formatValue(totals.eacByPert), icon: BarChart3, color: "from-purple-500 to-purple-600" },
    { label: "ETC", labelAr: "التقدير للإنتهاء", value: formatValue(totals.etc), icon: Activity, color: "from-rose-500 to-rose-600" },
  ];

  const kpiRow2 = [
    { label: "SPI", labelAr: "مؤشر الجدول", value: totals.spi.toFixed(2), status: getIndexStatus(totals.spi) },
    { label: "Progress %", labelAr: "نسبة الإنجاز", value: totals.progress.toFixed(0) + "%", status: "neutral" },
    { label: "CPI", labelAr: "مؤشر التكلفة", value: totals.cpi.toFixed(2), status: getIndexStatus(totals.cpi) },
    { label: "TCPI", labelAr: "مؤشر الأداء", value: totals.tcpi.toFixed(2), status: totals.tcpi <= 1.0 ? "success" : "warning" },
  ];

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <PageLayout>
      <div className="flex gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Sidebar */}
        <aside className="w-72 shrink-0 space-y-4">
          {/* Discipline Filter */}
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {isArabic ? "التخصصات" : "Discipline"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث..." : "Search..."}
                  value={disciplineSearch}
                  onChange={(e) => setDisciplineSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredDisciplineList.map((discipline) => (
                  <label
                    key={discipline.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-all group"
                  >
                    <Checkbox
                      checked={selectedDisciplines.includes(discipline.id)}
                      onCheckedChange={() => toggleDiscipline(discipline.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">
                          {isArabic ? discipline.labelAr : discipline.label}
                        </span>
                        <span className={`text-xs font-bold ${getProgressTextColor(discipline.progress)}`}>
                          {discipline.progress}%
                        </span>
                      </div>
                      <Progress value={discipline.progress} className="h-1.5" />
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Filter */}
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {isArabic ? "الأنشطة" : "Activity"}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {filteredActivityList.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث..." : "Search..."}
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {filteredActivityList.slice(0, 20).map((activity) => (
                  <label
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                  >
                    <Checkbox
                      checked={selectedActivities.includes(activity.id)}
                      onCheckedChange={() => toggleActivity(activity.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block">
                        {isArabic ? activity.labelAr : activity.label}
                      </span>
                    </div>
                    <div className={`w-8 h-1.5 rounded-full ${getProgressColor(activity.progress)}`} />
                  </label>
                ))}
                {filteredActivityList.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{filteredActivityList.length - 20} {isArabic ? "أخرى" : "more"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-5">
          {/* Header Banner with Project Selector */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {isArabic ? "تقرير مراقبة التكاليف" : "Cost Control Report"}
                  </h1>
                  <p className="mt-1 text-blue-100/90 text-sm">
                    {isArabic 
                      ? "تحليل شامل للقيمة المكتسبة وأداء التكلفة"
                      : "Comprehensive earned value and cost performance analysis"
                    }
                  </p>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-sm py-1.5 px-4">
                  {filteredActivities.length} {isArabic ? "نشاط" : "Activities"}
                </Badge>
              </div>
              
              {/* Project Selector Row */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-[280px] bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder={isArabic ? "اختر مشروع..." : "Select Project..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingProjects ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : projects.length > 0 ? (
                        projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.items_count && (
                                <Badge variant="secondary" className="text-xs">
                                  {p.items_count} {isArabic ? "بند" : "items"}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          {isArabic ? "لا توجد مشاريع" : "No projects found"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Real Data Toggle */}
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                  <Switch 
                    checked={useRealData} 
                    onCheckedChange={setUseRealData}
                    disabled={!selectedProjectId}
                  />
                  <span className="text-white/90 text-sm">
                    {isArabic ? "بيانات حقيقية" : "Real Data"}
                  </span>
                </div>
                
                {/* Loading indicator */}
                {isLoadingItems && (
                  <div className="flex items-center gap-2 text-white/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{isArabic ? "جاري التحميل..." : "Loading..."}</span>
                  </div>
                )}
                
                {/* Data source indicator */}
                {useRealData && projectItems.length > 0 && (
                  <Badge className="bg-emerald-500/20 text-white border-emerald-400/30">
                    <Database className="h-3 w-3 mr-1" />
                    {projectItems.length} {isArabic ? "بند من المشروع" : "BOQ Items"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* KPI Grid Row 1 */}
          <div className="grid grid-cols-5 gap-4">
            {kpiRow1.map((kpi) => (
              <Card key={kpi.label} className="bg-card/95 backdrop-blur border-border/50 hover:shadow-lg transition-all overflow-hidden group">
                <CardContent className="p-4 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {isArabic ? kpi.labelAr : kpi.label}
                    </span>
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.color}`}>
                      <kpi.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KPI Grid Row 2 */}
          <div className="grid grid-cols-5 gap-4">
            {kpiRow2.map((kpi) => (
              <Card key={kpi.label} className="bg-card/95 backdrop-blur border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {isArabic ? kpi.labelAr : kpi.label}
                  </span>
                  <div className="mt-2">
                    <Badge className={`text-lg font-bold px-3 py-1 ${getStatusColor(kpi.status)}`}>
                      {kpi.value}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-card/95 backdrop-blur border-border/50 flex items-center justify-center hover:shadow-lg transition-shadow">
              <CardContent className="p-4 w-full space-y-2">
                <Button 
                  className="w-full gap-2" 
                  variant="default"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  size="sm"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isArabic ? "تصدير Excel" : "Export Excel"}
                </Button>
                {useRealData && selectedProjectId && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => setEditProgressDialog({ open: true, progress: progressHistory?.actual_progress || 60 })}
                    >
                      <Edit className="h-3 w-3" />
                      {isArabic ? "تحديث" : "Edit"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={handleSaveReport}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      {isArabic ? "حفظ" : "Save"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                {isArabic ? "تحليل القيمة المكتسبة حسب التخصص" : "Earned Value Analysis by Discipline"}
                {useRealData && selectedProject && (
                  <Badge variant="outline" className="ml-2">
                    {selectedProject.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <Chart type="bar" data={chartData} options={createChartOptions(isArabic)} />
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  {isArabic ? "جدول البيانات التفصيلي" : "Detailed Data Table"}
                  {useRealData && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      {isArabic ? "من قاعدة البيانات" : "From Database"}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedActivities.length)} / {sortedActivities.length}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-12 text-center cursor-pointer hover:bg-muted/80" onClick={() => handleSort('sn')}>
                        # <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="min-w-[200px] cursor-pointer hover:bg-muted/80" onClick={() => handleSort('activity')}>
                        {isArabic ? "النشاط" : "Activity"} <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="w-24 text-center cursor-pointer hover:bg-muted/80" onClick={() => handleSort('discipline')}>
                        {isArabic ? "التخصص" : "Discipline"}
                      </TableHead>
                      {useRealData && (
                        <TableHead className="w-20 text-center">
                          {isArabic ? "البنود" : "Items"}
                        </TableHead>
                      )}
                      <TableHead className="w-28 text-center cursor-pointer hover:bg-muted/80" onClick={() => handleSort('progress')}>
                        {isArabic ? "الإنجاز %" : "Progress %"} <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('pv')}>
                        PV <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('ev')}>
                        EV <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('ac')}>
                        AC <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="w-28 text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('eacByPert')}>
                        EAC PERT <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                      <TableHead className="w-24 text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('etc')}>
                        ETC <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedActivities.map((activity) => (
                      <TableRow key={activity.sn} className="hover:bg-muted/30">
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {activity.sn}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{isArabic ? activity.activityAr : activity.activity}</p>
                            <p className="text-xs text-muted-foreground">{activity.activityCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {activity.discipline}
                          </Badge>
                        </TableCell>
                        {useRealData && (
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">
                              {activity.itemsCount || '-'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Progress value={activity.progress} className="h-2" />
                            </div>
                            <span className={`text-xs font-bold w-10 text-right ${getProgressTextColor(activity.progress)}`}>
                              {activity.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatValue(activity.pv)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatValue(activity.ev)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatValue(activity.ac)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatValue(activity.eacByPert)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatValue(activity.etc)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Grand Total Row */}
                    <TableRow className="bg-primary/5 font-bold border-t-2">
                      <TableCell className="text-center">-</TableCell>
                      <TableCell>
                        <span className="text-primary">{isArabic ? "الإجمالي" : "GRAND TOTAL"}</span>
                      </TableCell>
                      <TableCell className="text-center">-</TableCell>
                      {useRealData && (
                        <TableCell className="text-center">
                          <Badge variant="secondary">{projectItems.length}</Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress value={totals.progress} className="h-2" />
                          </div>
                          <span className="text-xs font-bold w-10 text-right text-primary">
                            {totals.progress.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatValue(totals.pv)}</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(totals.ev)}</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(totals.ac)}</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(totals.eacByPert)}</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(totals.etc)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                      if (page > totalPages) return null;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Progress Dialog */}
      <Dialog open={editProgressDialog.open} onOpenChange={(open) => setEditProgressDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArabic ? "تحديث نسبة الإنجاز" : "Update Progress"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة الإنجاز (%)" : "Progress (%)"}</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editProgressDialog.progress}
                  onChange={(e) => setEditProgressDialog(prev => ({ 
                    ...prev, 
                    progress: Math.min(100, Math.max(0, Number(e.target.value))) 
                  }))}
                  className="w-24"
                />
                <div className="flex-1">
                  <Progress value={editProgressDialog.progress} className="h-3" />
                </div>
                <span className="font-bold">{editProgressDialog.progress}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProgressDialog({ open: false, progress: 60 })}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleUpdateProgress}>
              <Save className="h-4 w-4 mr-2" />
              {isArabic ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
