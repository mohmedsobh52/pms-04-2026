import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { useDebounce } from "@/hooks/useDebounce";
import { useUndoRedo, heatmapClass } from "@/hooks/useEvmTools";
import html2canvas from "html2canvas";
import { ColorLegend } from "@/components/ui/color-code";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";
import { toast } from "sonner";
import { 
  Search, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Target, 
  BarChart3, Activity, ChevronLeft, ChevronRight, ArrowUpDown, Download,
  Building2, Zap, Wrench, PaintBucket, HardHat, Database, Loader2, Edit, Save, RefreshCw,
  Printer, FileText, AlertTriangle, LineChart as LineChartIcon, Check, X,
  Undo2, Redo2, Camera, Bookmark, Layers, Filter, GitCompare, Plus, ArrowLeft, Home, FolderOpen,
  Share2, RotateCcw, Package, Users, Truck, Settings2, Bell, FileSignature, ShieldAlert, Sparkles, Briefcase, ClipboardList,
  Trash2, Copy, ExternalLink
} from "lucide-react";
import { PageSuggestions } from "@/components/PageSuggestions";
import { exportCostControlPDF } from "@/lib/cost-control-pdf";
import { ResourceLevellingDialog } from "@/components/cost-control/ResourceLevellingDialog";
import { CostControlEnhancements } from "@/components/cost-control/CostControlEnhancements";
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
  category?: string;
  itemIds?: string[];
}

interface ResourceTotals {
  materials: number;
  labor: number;
  equipment: number;
  total: number;
  count: number;
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
      category,
      itemIds: categoryItems.map(i => i.id),
    });
    
    sn++;
  });
  
  return activities;
};

export default function CostControlReportPage() {
  const { isArabic } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams<{ projectId?: string }>();
  const urlProjectId = routeParams.projectId || searchParams.get("projectId");
  
  // Project and data state
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    urlProjectId || (typeof window !== "undefined" ? localStorage.getItem("cc:lastProjectId") : null)
  );
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [progressHistory, setProgressHistory] = useState<ProgressHistory | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [useRealData, setUseRealData] = useState(!!urlProjectId);
  
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

  // Inline edit state for table rows (Progress / AC) — with Undo/Redo
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ progress: number; ac: number }>({ progress: 0, ac: 0 });
  const overridesUR = useUndoRedo<Record<number, { progress?: number; ac?: number }>>({});
  const overrides = overridesUR.state;
  const setOverrides = overridesUR.set as (
    next: Record<number, { progress?: number; ac?: number }> | ((prev: Record<number, { progress?: number; ac?: number }>) => Record<number, { progress?: number; ac?: number }>),
    opts?: { silent?: boolean },
  ) => void;
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const kpiSectionRef = useRef<HTMLDivElement>(null);

  // Threshold settings (CPI/SPI/EAC overrun %/TCPI)
  const [thresholds, setThresholds] = useState({
    cpi_warn: 0.95, cpi_critical: 0.85,
    spi_warn: 0.95, spi_critical: 0.85,
    eac_overrun_pct: 10, tcpi_warn: 1.10,
  });
  const [thresholdsDialogOpen, setThresholdsDialogOpen] = useState(false);
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  // Clickable alert filter
  const [alertFilter, setAlertFilter] = useState<null | "cpi-warn" | "cpi-crit" | "spi-warn" | "spi-crit" | "eac" | "tcpi">(null);

  // Quick filters
  const [quickFilter, setQuickFilter] = useState<null | "critical" | "late" | "over-budget" | "completed" | "in-progress">(null);

  // EAC forecast method
  const [eacMethod, setEacMethod] = useState<"pert" | "cpi" | "linear" | "composite">("pert");

  // Baselines (snapshots)
  const [baselines, setBaselines] = useState<Array<{ id: string; name: string; created_at: string; is_active: boolean; snapshot: any }>>([]);
  const [activeBaseline, setActiveBaseline] = useState<{ id: string; name: string; map: Record<number, { pv: number; progress: number; ac: number }> } | null>(null);
  const [baselineDialogOpen, setBaselineDialogOpen] = useState(false);
  const [baselineName, setBaselineName] = useState("");

  // Saved Views
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; config: any }>>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  // Group by discipline (drill-down)
  const [groupByDiscipline, setGroupByDiscipline] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Debounced search inputs
  const debouncedDisciplineSearch = useDebounce(disciplineSearch, 200);
  const debouncedActivitySearch = useDebounce(activitySearch, 200);

  // Edit progress dialog
  const [editProgressDialog, setEditProgressDialog] = useState<{
    open: boolean;
    progress: number;
  }>({ open: false, progress: 60 });

  // Resources (item_pricing_details aggregated per project_item_id)
  const [resourceMap, setResourceMap] = useState<Record<string, ResourceTotals>>({});
  const [resourcesDialogOpen, setResourcesDialogOpen] = useState(false);
  const [resourceLevellingOpen, setResourceLevellingOpen] = useState(false);

  // Export options
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"summary" | "detailed" | "full">("full");
  const [exportScopeDisciplines, setExportScopeDisciplines] = useState<string[]>([]);
  const [exportScopeCategories, setExportScopeCategories] = useState<string[]>([]);
  const [exportIncludeResources, setExportIncludeResources] = useState(true);

  // Baseline rename inline edit
  const [renamingBaselineId, setRenamingBaselineId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingDeleteBaseline, setPendingDeleteBaseline] = useState<{ id: string; name: string } | null>(null);

  // Track whether URL filter state has been applied (one-shot)
  // Parse ?f= synchronously so baseline-id is ready BEFORE the project-data load effect runs.
  const urlFiltersAppliedRef = useRef(false);
  const pendingUrlBaselineIdRef = useRef<string | null>((() => {
    try {
      const f = new URLSearchParams(window.location.search).get("f");
      if (!f) return null;
      const obj = JSON.parse(atob(decodeURIComponent(f)));
      return typeof obj?.activeBaselineId === "string" ? obj.activeBaselineId : null;
    } catch { return null; }
  })());

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        // Merge from both tables so all saved projects appear (some live only in saved_projects)
        const [{ data: pd, error: pdErr }, { data: sp, error: spErr }] = await Promise.all([
          supabase
            .from('project_data')
            .select('id, name, currency, total_value, items_count, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('saved_projects')
            .select('id, name, created_at')
            .order('created_at', { ascending: false }),
        ]);
        if (pdErr) throw pdErr;
        if (spErr) throw spErr;

        const byId = new Map<string, ProjectData>();
        (pd || []).forEach((p: any) => byId.set(p.id, p));
        (sp || []).forEach((p: any) => {
          if (!byId.has(p.id)) {
            byId.set(p.id, {
              id: p.id,
              name: p.name,
              currency: null,
              total_value: null,
              items_count: null,
              created_at: p.created_at,
            });
          }
        });
        const merged = Array.from(byId.values()).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setProjects(merged);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error(isArabic ? 'فشل في تحميل المشاريع' : 'Failed to load projects');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [isArabic]);


  // React to URL projectId changes (deep links from project page)
  useEffect(() => {
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId);
      setUseRealData(true);
    }
  }, [urlProjectId]);

  // Persist last selected project + sync URL query string
  useEffect(() => {
    if (!selectedProjectId) return;
    try { localStorage.setItem("cc:lastProjectId", selectedProjectId); } catch {}
    if (!routeParams.projectId && searchParams.get("projectId") !== selectedProjectId) {
      const next = new URLSearchParams(searchParams);
      next.set("projectId", selectedProjectId);
      setSearchParams(next, { replace: true });
    }
  }, [selectedProjectId]);

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

  // Load saved overrides + thresholds + baselines + views for selected project
  useEffect(() => {
    if (!selectedProjectId) return;
    (async () => {
      try {
        const [{ data: ovs }, { data: th }, { data: bls }, { data: vs }] = await Promise.all([
          supabase.from("cost_control_overrides").select("sn, progress, ac").eq("project_id", selectedProjectId),
          supabase.from("cost_control_thresholds").select("*").eq("project_id", selectedProjectId).maybeSingle(),
          supabase.from("cost_control_baselines").select("id, name, created_at, is_active, snapshot").eq("project_id", selectedProjectId).order("created_at", { ascending: false }),
          supabase.from("cost_control_views").select("id, name, config").eq("project_id", selectedProjectId).order("created_at", { ascending: false }),
        ]);
        if (ovs) {
          const map: Record<number, { progress?: number; ac?: number }> = {};
          ovs.forEach((o: any) => { map[o.sn] = { progress: o.progress ?? undefined, ac: o.ac ?? undefined }; });
          overridesUR.reset(map);
        }
        if (th) setThresholds({
          cpi_warn: Number(th.cpi_warn), cpi_critical: Number(th.cpi_critical),
          spi_warn: Number(th.spi_warn), spi_critical: Number(th.spi_critical),
          eac_overrun_pct: Number(th.eac_overrun_pct), tcpi_warn: Number(th.tcpi_warn),
        });
        if (bls) {
          setBaselines(bls as any);
          const pendingId = pendingUrlBaselineIdRef.current;
          const pick = (pendingId && bls.find((b: any) => b.id === pendingId)) || bls.find((b: any) => b.is_active);
          if (pendingId) pendingUrlBaselineIdRef.current = null;
          if (pick && (pick as any).snapshot && Array.isArray(((pick as any).snapshot as any).activities)) {
            const map: Record<number, { pv: number; progress: number; ac: number }> = {};
            ((pick as any).snapshot as any).activities.forEach((a: any) => { map[a.sn] = { pv: a.pv, progress: a.progress, ac: a.ac }; });
            setActiveBaseline({ id: (pick as any).id, name: (pick as any).name, map });
          }
        }
        if (vs) setSavedViews(vs as any);
      } catch (e) { console.warn("Load cost-control state failed", e); }
    })();
  }, [selectedProjectId]);

  // Keyboard shortcuts (Ctrl/Cmd + B/E/R/P)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); selectedProjectId && setBaselineDialogOpen(true); }
      else if (k === "e") { e.preventDefault(); selectedProjectId && setExportDialogOpen(true); }
      else if (k === "r" && e.shiftKey) { e.preventDefault(); if (selectedProjectId) { setUseRealData(false); setTimeout(() => setUseRealData(true), 50); } }
      else if (k === "k") { e.preventDefault(); document.querySelector<HTMLElement>('[data-cc-project-trigger]')?.click(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedProjectId]);


  // ===== Per-project filter persistence (localStorage + URL) =====
  const filterStorageKey = selectedProjectId ? `cc:filters:${selectedProjectId}` : null;

  // ONE-SHOT: Apply filter state from URL (?f=base64) on first mount — overrides localStorage
  useEffect(() => {
    if (urlFiltersAppliedRef.current) return;
    const fParam = searchParams.get("f");
    if (!fParam) return;
    try {
      const f = JSON.parse(atob(decodeURIComponent(fParam)));
      if (Array.isArray(f.selectedDisciplines)) setSelectedDisciplines(f.selectedDisciplines);
      if (Array.isArray(f.selectedActivities)) setSelectedActivities(f.selectedActivities);
      if (typeof f.disciplineSearch === "string") setDisciplineSearch(f.disciplineSearch);
      if (typeof f.activitySearch === "string") setActivitySearch(f.activitySearch);
      if (typeof f.sortField === "string") setSortField(f.sortField);
      if (f.sortDirection === "asc" || f.sortDirection === "desc") setSortDirection(f.sortDirection);
      if (f.alertFilter === null || typeof f.alertFilter === "string") setAlertFilter(f.alertFilter ?? null);
      if (f.quickFilter === null || typeof f.quickFilter === "string") setQuickFilter(f.quickFilter ?? null);
      if (typeof f.eacMethod === "string") setEacMethod(f.eacMethod);
      if (typeof f.groupByDiscipline === "boolean") setGroupByDiscipline(f.groupByDiscipline);
      if (typeof f.activeBaselineId === "string") pendingUrlBaselineIdRef.current = f.activeBaselineId;
      urlFiltersAppliedRef.current = true;
      toast.success(isArabic ? "تم تحميل الفلاتر من الرابط" : "Filters loaded from link");
    } catch (e) { console.warn("Bad filter URL param", e); }
  }, []);

  // Load saved filters when project changes (skip if URL filters already applied)
  useEffect(() => {
    if (!filterStorageKey) return;
    if (urlFiltersAppliedRef.current) { urlFiltersAppliedRef.current = false; return; }
    try {
      const raw = localStorage.getItem(filterStorageKey);
      if (!raw) return;
      const f = JSON.parse(raw);
      if (Array.isArray(f.selectedDisciplines)) setSelectedDisciplines(f.selectedDisciplines);
      if (Array.isArray(f.selectedActivities)) setSelectedActivities(f.selectedActivities);
      if (typeof f.disciplineSearch === "string") setDisciplineSearch(f.disciplineSearch);
      if (typeof f.activitySearch === "string") setActivitySearch(f.activitySearch);
      if (typeof f.sortField === "string") setSortField(f.sortField);
      if (f.sortDirection === "asc" || f.sortDirection === "desc") setSortDirection(f.sortDirection);
      if (f.alertFilter === null || typeof f.alertFilter === "string") setAlertFilter(f.alertFilter ?? null);
      if (f.quickFilter === null || typeof f.quickFilter === "string") setQuickFilter(f.quickFilter ?? null);
      if (typeof f.eacMethod === "string") setEacMethod(f.eacMethod);
      if (typeof f.groupByDiscipline === "boolean") setGroupByDiscipline(f.groupByDiscipline);
    } catch {}
  }, [filterStorageKey]);
  // Save on changes
  useEffect(() => {
    if (!filterStorageKey) return;
    try {
      localStorage.setItem(filterStorageKey, JSON.stringify({
        selectedDisciplines, selectedActivities, disciplineSearch, activitySearch,
        sortField, sortDirection, alertFilter, quickFilter, eacMethod, groupByDiscipline,
      }));
    } catch {}
  }, [filterStorageKey, selectedDisciplines, selectedActivities, disciplineSearch, activitySearch, sortField, sortDirection, alertFilter, quickFilter, eacMethod, groupByDiscipline]);

  // ===== Resources: Fetch item_pricing_details for project items =====
  useEffect(() => {
    if (!selectedProjectId || !useRealData || projectItems.length === 0) {
      setResourceMap({});
      return;
    }
    (async () => {
      try {
        const ids = projectItems.map(i => i.id);
        const chunkSize = 200;
        const map: Record<string, ResourceTotals> = {};
        for (let i = 0; i < ids.length; i += chunkSize) {
          const slice = ids.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from("item_pricing_details")
            .select("project_item_id, pricing_type, total_cost")
            .in("project_item_id", slice);
          if (error) throw error;
          (data || []).forEach((d: any) => {
            const pid = d.project_item_id as string;
            if (!map[pid]) map[pid] = { materials: 0, labor: 0, equipment: 0, total: 0, count: 0 };
            const cost = Number(d.total_cost) || 0;
            if (d.pricing_type === "material") map[pid].materials += cost;
            else if (d.pricing_type === "labor") map[pid].labor += cost;
            else if (d.pricing_type === "equipment") map[pid].equipment += cost;
            map[pid].total += cost;
            map[pid].count += 1;
          });
        }
        setResourceMap(map);
      } catch (e) { console.warn("Load resources failed", e); }
    })();
  }, [selectedProjectId, useRealData, projectItems]);

  // Get activities based on data source (with inline overrides applied)
  const allActivities = useMemo(() => {
    const base = (useRealData && projectItems.length > 0)
      ? convertItemsToActivities(projectItems, progressHistory)
      : sampleActivities;
    return base.map(a => {
      const ov = overrides[a.sn];
      if (!ov) return a;
      const progress = ov.progress ?? a.progress;
      const ac = ov.ac ?? a.ac;
      const ev = a.pv * (progress / 100);
      const cv = ev - ac;
      const sv = ev - a.pv;
      const cpi = ac > 0 ? ev / ac : 0;
      const spi = a.pv > 0 ? ev / a.pv : 0;
      const bac = a.pv;
      const eac1 = cpi > 0 ? bac / cpi : bac;
      const eac2 = ac + (bac - ev);
      const eac3 = cpi > 0 && spi > 0 ? ac + ((bac - ev) / (cpi * spi)) : bac;
      const eacByPert = (eac1 + 4 * eac2 + eac3) / 6;
      const etc = eacByPert - ac;
      const tcpi = (bac - ev) > 0 ? (bac - ev) / (bac - ac) : 0;
      return { ...a, progress, ev, ac, cv, sv, cpi, spi, eac1, eac2, eac3, eacByPert, etc, tcpi };
    });
  }, [useRealData, projectItems, progressHistory, overrides]);

  // Filter activities based on selections
  const filteredActivities = useMemo(() => {
    let filtered = allActivities;
    
    if (selectedDisciplines.length > 0) {
      filtered = filtered.filter(a => selectedDisciplines.includes(a.discipline));
    }
    
    if (selectedActivities.length > 0) {
      filtered = filtered.filter(a => selectedActivities.includes(a.activityCode));
    }
    
    if (alertFilter) {
      const t = thresholds;
      filtered = filtered.filter(a => {
        switch (alertFilter) {
          case "cpi-crit": return a.cpi > 0 && a.cpi < t.cpi_critical;
          case "cpi-warn": return a.cpi > 0 && a.cpi < t.cpi_warn && a.cpi >= t.cpi_critical;
          case "spi-crit": return a.spi > 0 && a.spi < t.spi_critical;
          case "spi-warn": return a.spi > 0 && a.spi < t.spi_warn && a.spi >= t.spi_critical;
          case "eac": return a.eacByPert > a.pv * (1 + t.eac_overrun_pct / 100);
          case "tcpi": return a.tcpi > t.tcpi_warn;
          default: return true;
        }
      });
    }
    if (quickFilter) {
      const t = thresholds;
      filtered = filtered.filter(a => {
        switch (quickFilter) {
          case "critical": return (a.cpi > 0 && a.cpi < t.cpi_critical) || (a.spi > 0 && a.spi < t.spi_critical);
          case "late": return a.spi > 0 && a.spi < 1;
          case "over-budget": return a.cpi > 0 && a.cpi < 1;
          case "completed": return a.progress >= 100;
          case "in-progress": return a.progress > 0 && a.progress < 100;
          default: return true;
        }
      });
    }
    return filtered;
  }, [allActivities, selectedDisciplines, selectedActivities, alertFilter, thresholds, quickFilter]);

  // Pick effective EAC according to selected method
  const pickEac = useCallback((a: { pv: number; ev: number; ac: number; cpi: number; spi: number; eac1: number; eac2: number; eac3: number; eacByPert: number; }) => {
    switch (eacMethod) {
      case "cpi": return a.eac1;
      case "linear": return a.eac2;
      case "composite": return a.eac3;
      case "pert":
      default: return a.eacByPert;
    }
  }, [eacMethod]);

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

  // ===== Activity-level resources (from item_pricing_details aggregated by activity.itemIds) =====
  const activityResources = useMemo(() => {
    const out: Record<number, ResourceTotals> = {};
    allActivities.forEach(a => {
      const acc: ResourceTotals = { materials: 0, labor: 0, equipment: 0, total: 0, count: 0 };
      (a.itemIds || []).forEach(pid => {
        const r = resourceMap[pid];
        if (!r) return;
        acc.materials += r.materials; acc.labor += r.labor; acc.equipment += r.equipment;
        acc.total += r.total; acc.count += r.count;
      });
      out[a.sn] = acc;
    });
    return out;
  }, [allActivities, resourceMap]);

  const totalResources = useMemo(() => {
    const acc: ResourceTotals = { materials: 0, labor: 0, equipment: 0, total: 0, count: 0 };
    filteredActivities.forEach(a => {
      const r = activityResources[a.sn];
      if (!r) return;
      acc.materials += r.materials; acc.labor += r.labor; acc.equipment += r.equipment;
      acc.total += r.total; acc.count += r.count;
    });
    return acc;
  }, [filteredActivities, activityResources]);

  // ===== Baseline comparison vs current =====
  const baselineComparison = useMemo(() => {
    if (!activeBaseline) return null;
    const map = activeBaseline.map;
    const inScope = filteredActivities.filter(a => map[a.sn]);
    if (inScope.length === 0) return null;
    let bPV = 0, bAC = 0, bEV = 0, bProgSum = 0;
    inScope.forEach(a => {
      const b = map[a.sn];
      bPV += b.pv;
      bAC += b.ac;
      bEV += b.pv * (b.progress / 100);
      bProgSum += b.progress;
    });
    const bProgress = bProgSum / inScope.length;
    const cProgress = inScope.reduce((s, a) => s + a.progress, 0) / inScope.length;
    const cPV = inScope.reduce((s, a) => s + a.pv, 0);
    const cAC = inScope.reduce((s, a) => s + a.ac, 0);
    const cEV = inScope.reduce((s, a) => s + a.ev, 0);
    return {
      name: activeBaseline.name,
      activities: inScope.length,
      baseline: { pv: bPV, ac: bAC, ev: bEV, progress: bProgress },
      current:  { pv: cPV, ac: cAC, ev: cEV, progress: cProgress },
      delta: {
        pv: cPV - bPV, ac: cAC - bAC, ev: cEV - bEV,
        progress: cProgress - bProgress,
      },
    };
  }, [activeBaseline, filteredActivities]);

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

  // ===== Inline edit handlers =====
  const startEditRow = (a: EVMActivity) => {
    setEditingRow(a.sn);
    setEditDraft({ progress: a.progress, ac: a.ac });
  };
  const cancelEditRow = () => setEditingRow(null);
  const saveEditRow = async (sn: number) => {
    const progress = Math.max(0, Math.min(100, editDraft.progress));
    const ac = Math.max(0, editDraft.ac);
    setOverrides(prev => ({ ...prev, [sn]: { progress, ac } }));
    setEditingRow(null);

    if (selectedProjectId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const activity = allActivities.find(a => a.sn === sn);
          const { error } = await supabase.from("cost_control_overrides").upsert({
            user_id: user.id,
            project_id: selectedProjectId,
            sn,
            activity_code: activity?.activityCode ?? null,
            progress, ac,
          }, { onConflict: "user_id,project_id,sn" });
          if (error) throw error;
          toast.success(isArabic ? "تم حفظ التعديل" : "Override saved");
          return;
        }
      } catch (e) {
        console.error(e);
        toast.error(isArabic ? "فشل حفظ التعديل في القاعدة" : "Failed to save override");
        return;
      }
    }
    toast.success(isArabic ? "تم تحديث الصف" : "Row updated");
  };

  const resetOverrides = async () => {
    setOverrides({});
    if (selectedProjectId) {
      try { await supabase.from("cost_control_overrides").delete().eq("project_id", selectedProjectId); } catch {}
    }
    toast.success(isArabic ? "تم إعادة التعيين" : "Reset");
  };

  // ===== Reset filters to defaults (per project) =====
  const resetFilters = () => {
    setSelectedDisciplines([]);
    setSelectedActivities([]);
    setDisciplineSearch("");
    setActivitySearch("");
    setSortField("sn");
    setSortDirection("asc");
    setAlertFilter(null);
    setQuickFilter(null);
    setEacMethod("pert");
    setGroupByDiscipline(false);
    setCurrentPage(1);
    if (filterStorageKey) {
      try { localStorage.removeItem(filterStorageKey); } catch {}
    }
    toast.success(isArabic ? "تمت إعادة ضبط الفلاتر" : "Filters reset");
  };

  // ===== Share link: encode current filter state into URL and copy =====
  const buildShareUrl = () => {
    const state = {
      selectedDisciplines, selectedActivities, disciplineSearch, activitySearch,
      sortField, sortDirection, alertFilter, quickFilter, eacMethod, groupByDiscipline,
      activeBaselineId: activeBaseline?.id ?? null,
    };
    const f = encodeURIComponent(btoa(JSON.stringify(state)));
    const url = new URL(window.location.href);
    if (selectedProjectId) url.searchParams.set("projectId", selectedProjectId);
    url.searchParams.set("f", f);
    return url.toString();
  };
  const copyShareLink = async () => {
    try {
      const url = buildShareUrl();
      await navigator.clipboard.writeText(url);
      toast.success(isArabic ? "تم نسخ رابط المشاركة" : "Share link copied");
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "فشل نسخ الرابط" : "Failed to copy link");
    }
  };

  // ===== Rename baseline =====
  const renameBaseline = async (id: string) => {
    const name = renameDraft.trim();
    if (!name) { toast.error(isArabic ? "أدخل اسماً" : "Enter a name"); return; }
    try {
      const { error } = await supabase.from("cost_control_baselines").update({ name }).eq("id", id);
      if (error) throw error;
      setBaselines(prev => prev.map(b => b.id === id ? { ...b, name } : b));
      if (activeBaseline?.id === id) setActiveBaseline({ ...activeBaseline, name });
      setRenamingBaselineId(null); setRenameDraft("");
      toast.success((isArabic ? "تم تغيير اسم خط الأساس إلى: " : "Baseline renamed to: ") + name);
    } catch (e) { console.error(e); toast.error(isArabic ? "فشل التغيير" : "Rename failed"); }
  };

  const saveThresholds = async () => {
    if (!selectedProjectId) { toast.error(isArabic ? "اختر مشروع" : "Select a project"); return; }
    setIsSavingThresholds(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("cost_control_thresholds").upsert({
        user_id: user.id, project_id: selectedProjectId, ...thresholds,
      }, { onConflict: "user_id,project_id" });
      if (error) throw error;
      toast.success(isArabic ? "تم حفظ الإعدادات" : "Thresholds saved");
      setThresholdsDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "فشل الحفظ" : "Save failed");
    } finally { setIsSavingThresholds(false); }
  };

  // ===== Baselines: save / load / activate / delete =====
  const saveBaseline = async () => {
    if (!selectedProjectId) { toast.error(isArabic ? "اختر مشروع" : "Select a project"); return; }
    const name = baselineName.trim() || `Baseline ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");
      const snapshot = {
        captured_at: new Date().toISOString(),
        totals,
        activities: allActivities.map(a => ({ sn: a.sn, activityCode: a.activityCode, pv: a.pv, ev: a.ev, ac: a.ac, progress: a.progress })),
      };
      const { data, error } = await supabase.from("cost_control_baselines")
        .insert({ user_id: user.id, project_id: selectedProjectId, name, snapshot, is_active: baselines.length === 0 })
        .select("id, name, created_at, is_active, snapshot").single();
      if (error) throw error;
      setBaselines(prev => [data as any, ...prev]);
      setBaselineDialogOpen(false);
      setBaselineName("");
      toast.success(isArabic ? "تم حفظ خط الأساس" : "Baseline saved");
    } catch (e: any) {
      console.error(e);
      toast.error((isArabic ? "فشل الحفظ: " : "Save failed: ") + (e?.message || ""));
    }
  };

  const activateBaseline = async (b: { id: string; name: string; snapshot: any }) => {
    try {
      await supabase.from("cost_control_baselines").update({ is_active: false }).eq("project_id", selectedProjectId);
      await supabase.from("cost_control_baselines").update({ is_active: true }).eq("id", b.id);
      setBaselines(prev => prev.map(x => ({ ...x, is_active: x.id === b.id })));
      const map: Record<number, { pv: number; progress: number; ac: number }> = {};
      (b.snapshot?.activities || []).forEach((a: any) => { map[a.sn] = { pv: a.pv, progress: a.progress, ac: a.ac }; });
      setActiveBaseline({ id: b.id, name: b.name, map });
      toast.success((isArabic ? "تم تفعيل خط الأساس: " : "Baseline activated: ") + b.name);
    } catch (e) { console.error(e); toast.error(isArabic ? "فشل التفعيل" : "Activation failed"); }
  };

  const clearBaseline = () => setActiveBaseline(null);

  const deleteBaseline = async (id: string) => {
    const target = baselines.find(b => b.id === id);
    try {
      await supabase.from("cost_control_baselines").delete().eq("id", id);
      setBaselines(prev => prev.filter(b => b.id !== id));
      if (activeBaseline?.id === id) setActiveBaseline(null);
      toast.success((isArabic ? "تم حذف خط الأساس: " : "Baseline deleted: ") + (target?.name || id));
    } catch (e) { console.error(e); toast.error(isArabic ? "فشل الحذف" : "Delete failed"); }
  };

  // ===== Saved Views =====
  const saveCurrentView = async () => {
    if (!selectedProjectId) { toast.error(isArabic ? "اختر مشروع" : "Select a project"); return; }
    const name = viewName.trim();
    if (!name) { toast.error(isArabic ? "أدخل اسماً" : "Enter a name"); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");
      const config = { selectedDisciplines, selectedActivities, sortField, sortDirection, alertFilter, quickFilter, eacMethod, groupByDiscipline };
      const { data, error } = await supabase.from("cost_control_views")
        .insert({ user_id: user.id, project_id: selectedProjectId, name, config })
        .select("id, name, config").single();
      if (error) throw error;
      setSavedViews(prev => [data as any, ...prev]);
      setViewDialogOpen(false);
      setViewName("");
      toast.success(isArabic ? "تم حفظ العرض" : "View saved");
    } catch (e: any) { console.error(e); toast.error(isArabic ? "فشل" : "Failed"); }
  };

  const applyView = (cfg: any) => {
    setSelectedDisciplines(cfg.selectedDisciplines || []);
    setSelectedActivities(cfg.selectedActivities || []);
    setSortField(cfg.sortField || "sn");
    setSortDirection(cfg.sortDirection || "asc");
    setAlertFilter(cfg.alertFilter ?? null);
    setQuickFilter(cfg.quickFilter ?? null);
    setEacMethod(cfg.eacMethod || "pert");
    setGroupByDiscipline(!!cfg.groupByDiscipline);
    setCurrentPage(1);
  };

  const deleteView = async (id: string) => {
    try {
      await supabase.from("cost_control_views").delete().eq("id", id);
      setSavedViews(prev => prev.filter(v => v.id !== id));
    } catch (e) { console.error(e); }
  };

  // ===== KPI Dashboard PNG export =====
  const handleExportKpiPng = useCallback(async () => {
    if (!kpiSectionRef.current) return;
    setIsExportingPNG(true);
    try {
      const canvas = await html2canvas(kpiSectionRef.current, { scale: 2, backgroundColor: null, useCORS: true });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `cost-control-kpi-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      toast.success(isArabic ? "تم حفظ صورة KPI" : "KPI image saved");
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "فشل حفظ الصورة" : "Image export failed");
    } finally { setIsExportingPNG(false); }
  }, [isArabic]);

  // ===== Undo/Redo keyboard shortcuts =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); overridesUR.undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); overridesUR.redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overridesUR]);

  // ===== Alerts (Forecast/Variance) — uses configurable thresholds =====
  type AlertKey = "cpi-warn"|"cpi-crit"|"spi-warn"|"spi-crit"|"eac"|"tcpi";
  const alerts = useMemo(() => {
    const list: { level: "warn" | "danger"; msg: string; key: AlertKey }[] = [];
    if (totals.cpi > 0 && totals.cpi < thresholds.cpi_critical) list.push({ key: "cpi-crit", level: "danger", msg: isArabic ? `CPI حرج (${totals.cpi.toFixed(2)}) — تجاوز كبير في التكلفة` : `Critical CPI (${totals.cpi.toFixed(2)}) — major cost overrun` });
    else if (totals.cpi > 0 && totals.cpi < thresholds.cpi_warn) list.push({ key: "cpi-warn", level: "warn", msg: isArabic ? `CPI منخفض (${totals.cpi.toFixed(2)})` : `Low CPI (${totals.cpi.toFixed(2)})` });
    if (totals.spi > 0 && totals.spi < thresholds.spi_critical) list.push({ key: "spi-crit", level: "danger", msg: isArabic ? `SPI حرج (${totals.spi.toFixed(2)}) — تأخر كبير عن الجدول` : `Critical SPI (${totals.spi.toFixed(2)}) — major schedule slip` });
    else if (totals.spi > 0 && totals.spi < thresholds.spi_warn) list.push({ key: "spi-warn", level: "warn", msg: isArabic ? `SPI منخفض (${totals.spi.toFixed(2)})` : `Low SPI (${totals.spi.toFixed(2)})` });
    if (totals.eacByPert > totals.pv * (1 + thresholds.eac_overrun_pct / 100)) list.push({ key: "eac", level: "danger", msg: isArabic ? `EAC يتجاوز الميزانية بأكثر من ${thresholds.eac_overrun_pct}%` : `EAC exceeds budget by more than ${thresholds.eac_overrun_pct}%` });
    if (totals.tcpi > thresholds.tcpi_warn) list.push({ key: "tcpi", level: "warn", msg: isArabic ? `TCPI=${totals.tcpi.toFixed(2)} يتطلب أداءً صعبًا` : `TCPI=${totals.tcpi.toFixed(2)} — challenging recovery required` });
    return list;
  }, [totals, isArabic, thresholds]);

  // ===== Cashflow data (cumulative inflow vs outflow per period) =====
  const cashflowData = useMemo(() => {
    const sorted = [...filteredActivities].sort((a, b) => a.sn - b.sn);
    const buckets = 12;
    const size = Math.max(1, Math.ceil(sorted.length / buckets));
    const labels: string[] = [];
    const planned: number[] = [];
    const actual: number[] = [];
    const earned: number[] = [];
    let cumP = 0, cumA = 0, cumE = 0;
    for (let i = 0; i < buckets; i++) {
      const slice = sorted.slice(i * size, (i + 1) * size);
      if (slice.length === 0) break;
      cumP += slice.reduce((s, x) => s + x.pv, 0);
      cumA += slice.reduce((s, x) => s + x.ac, 0);
      cumE += slice.reduce((s, x) => s + x.ev, 0);
      labels.push(`M${i + 1}`);
      planned.push(cumP / 1e6); actual.push(cumA / 1e6); earned.push(cumE / 1e6);
    }
    return {
      labels,
      datasets: [
        { type: "bar" as const, label: isArabic ? "صرف فعلي (AC)" : "Outflow AC", data: actual, backgroundColor: "hsla(25,95%,53%,0.6)", borderColor: "hsl(25,95%,53%)", borderWidth: 1, yAxisID: "y" },
        { type: "bar" as const, label: isArabic ? "صرف مخطط (PV)" : "Outflow PV", data: planned, backgroundColor: "hsla(217,91%,60%,0.5)", borderColor: "hsl(217,91%,60%)", borderWidth: 1, yAxisID: "y" },
        { type: "line" as const, label: isArabic ? "تدفق مكتسب (EV)" : "Earned EV", data: earned, borderColor: "hsl(160,84%,39%)", backgroundColor: "hsla(160,84%,39%,0.15)", borderWidth: 2.5, tension: 0.35, fill: true, pointRadius: 0, yAxisID: "y" },
      ],
    };
  }, [filteredActivities, isArabic]);


  // ===== S-Curve & Trend data =====
  const sCurveData = useMemo(() => {
    const sorted = [...filteredActivities].sort((a, b) => a.sn - b.sn);
    let cumPV = 0, cumEV = 0, cumAC = 0;
    const labels: string[] = [];
    const pvArr: number[] = [], evArr: number[] = [], acArr: number[] = [];
    sorted.forEach((a, idx) => {
      cumPV += a.pv; cumEV += a.ev; cumAC += a.ac;
      labels.push(`P${idx + 1}`);
      pvArr.push(cumPV / 1e6); evArr.push(cumEV / 1e6); acArr.push(cumAC / 1e6);
    });
    return {
      labels,
      datasets: [
        { type: "line" as const, label: "PV (cum)", data: pvArr, borderColor: "hsl(217,91%,60%)", backgroundColor: "hsla(217,91%,60%,0.1)", borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0 },
        { type: "line" as const, label: "EV (cum)", data: evArr, borderColor: "hsl(160,84%,39%)", backgroundColor: "hsla(160,84%,39%,0.1)", borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0 },
        { type: "line" as const, label: "AC (cum)", data: acArr, borderColor: "hsl(25,95%,53%)", backgroundColor: "hsla(25,95%,53%,0.1)", borderWidth: 2, tension: 0.35, fill: true, pointRadius: 0 },
      ],
    };
  }, [filteredActivities]);

  const cpiSpiTrendData = useMemo(() => {
    const sorted = [...filteredActivities].sort((a, b) => a.sn - b.sn);
    return {
      labels: sorted.map(a => a.activityCode),
      datasets: [
        { type: "line" as const, label: "CPI", data: sorted.map(a => a.cpi), borderColor: "hsl(217,91%,60%)", borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { type: "line" as const, label: "SPI", data: sorted.map(a => a.spi), borderColor: "hsl(280,80%,55%)", borderWidth: 2, pointRadius: 2, tension: 0.3 },
        { type: "line" as const, label: "Target (1.0)", data: sorted.map(() => 1), borderColor: "hsl(0,0%,55%)", borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
      ],
    };
  }, [filteredActivities]);

  const handlePrint = () => window.print();

  const handleExportPDF = useCallback(async () => {
    setIsExportingPDF(true);
    try {
      exportCostControlPDF({
        isArabic,
        projectName: projects.find(p => p.id === selectedProjectId)?.name,
        totals,
        activities: filteredActivities,
        alerts: alerts.map(a => a.msg),
      });
      toast.success(isArabic ? "تم تصدير PDF" : "PDF exported");
    } catch (e) {
      console.error(e);
      toast.error(isArabic ? "فشل تصدير PDF" : "PDF export failed");
    } finally {
      setIsExportingPDF(false);
    }
  }, [isArabic, totals, filteredActivities, alerts, projects, selectedProjectId]);

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const workbook = createWorkbook();
      const proj = projects.find(p => p.id === selectedProjectId);
      const projName = proj?.name || (isArabic ? "بدون مشروع" : "No project");
      const safeName = projName.replace(/[^\w\u0600-\u06FF\-]+/g, "_").slice(0, 60);
      const sanitizeSheet = (s: string) => s.replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 28);

      // Apply export scope on top of current filters (visible activities only)
      let scoped = filteredActivities;
      if (exportScopeDisciplines.length > 0) scoped = scoped.filter(a => exportScopeDisciplines.includes(a.discipline));
      if (exportScopeCategories.length > 0) scoped = scoped.filter(a => a.category ? exportScopeCategories.includes(a.category) : false);

      // Recompute totals for the scoped slice
      const sPV = scoped.reduce((s, a) => s + a.pv, 0);
      const sEV = scoped.reduce((s, a) => s + a.ev, 0);
      const sAC = scoped.reduce((s, a) => s + a.ac, 0);
      const sCV = sEV - sAC, sSV = sEV - sPV;
      const sCPI = sAC > 0 ? sEV / sAC : 0;
      const sSPI = sPV > 0 ? sEV / sPV : 0;
      const sEAC = sCPI > 0 ? sPV / sCPI : sPV;
      const sETC = sEAC - sAC;
      const sProgress = sPV > 0 ? (sEV / sPV) * 100 : 0;

      // Context / Filters sheet
      addJsonSheet(workbook, [
        { Field: 'Project', Value: projName },
        { Field: 'Project ID', Value: selectedProjectId || '-' },
        { Field: 'Generated', Value: new Date().toISOString() },
        { Field: 'Data Source', Value: useRealData ? 'Database (real)' : 'Sample' },
        { Field: 'Export Mode', Value: exportMode },
        { Field: 'EAC Method', Value: eacMethod },
        { Field: 'Disciplines Filter', Value: selectedDisciplines.join(", ") || 'All' },
        { Field: 'Activities Filter', Value: selectedActivities.join(", ") || 'All' },
        { Field: 'Export Scope (Disciplines)', Value: exportScopeDisciplines.join(", ") || 'All visible' },
        { Field: 'Export Scope (Categories)', Value: exportScopeCategories.join(", ") || 'All visible' },
        { Field: 'Alert Filter', Value: alertFilter || 'None' },
        { Field: 'Quick Filter', Value: quickFilter || 'None' },
        { Field: 'Discipline Search', Value: disciplineSearch || '-' },
        { Field: 'Activity Search', Value: activitySearch || '-' },
        { Field: 'Sort', Value: `${sortField} ${sortDirection}` },
        { Field: 'Active Baseline', Value: activeBaseline?.name || 'None' },
        { Field: 'Manual Overrides', Value: Object.keys(overrides).length },
        { Field: 'Scoped Activities', Value: scoped.length },
        { Field: 'Filtered Activities', Value: filteredActivities.length },
        { Field: 'Total Activities', Value: allActivities.length },
      ], sanitizeSheet('Context'));

      // Summary Sheet (scoped + overrides)
      if (exportMode === "summary" || exportMode === "full") {
        addJsonSheet(workbook, [
          { Metric: 'PV (Planned Value)', Value: sPV, Formatted: formatValue(sPV) },
          { Metric: 'EV (Earned Value)', Value: sEV, Formatted: formatValue(sEV) },
          { Metric: 'AC (Actual Cost)', Value: sAC, Formatted: formatValue(sAC) },
          { Metric: 'CV (Cost Variance)', Value: sCV, Formatted: formatValue(sCV) },
          { Metric: 'SV (Schedule Variance)', Value: sSV, Formatted: formatValue(sSV) },
          { Metric: 'CPI', Value: sCPI.toFixed(2) },
          { Metric: 'SPI', Value: sSPI.toFixed(2) },
          { Metric: 'EAC', Value: sEAC, Formatted: formatValue(sEAC) },
          { Metric: 'ETC', Value: sETC, Formatted: formatValue(sETC) },
          { Metric: 'Progress %', Value: sProgress.toFixed(1) + '%' },
        ], sanitizeSheet('Summary'));
      }

      // Detailed activities (post-overrides + filtered + scoped)
      if (exportMode === "detailed" || exportMode === "full") {
        addJsonSheet(workbook, scoped.map(a => {
          const ov = overrides[a.sn];
          const baseline = activeBaseline?.map?.[a.sn];
          const r = activityResources[a.sn];
          return {
            'SN': a.sn,
            'Activity Code': a.activityCode,
            'Activity': a.activity,
            'Activity (AR)': a.activityAr,
            'Discipline': a.discipline,
            'Category': a.category || '-',
            'Progress %': a.progress,
            'PV': a.pv, 'EV': a.ev, 'AC': a.ac, 'CV': a.cv, 'SV': a.sv,
            'CPI': Number(a.cpi.toFixed(3)), 'SPI': Number(a.spi.toFixed(3)),
            'EAC BY PERT': Math.round(a.eacByPert), 'ETC': Math.round(a.etc),
            'TCPI': Number(a.tcpi.toFixed(3)),
            'Items Count': a.itemsCount || '-',
            'Override?': ov ? 'YES' : '',
            'Override Progress': ov?.progress ?? '',
            'Override AC': ov?.ac ?? '',
            'Baseline PV': baseline?.pv ?? '',
            'Baseline Progress': baseline?.progress ?? '',
            'Baseline AC': baseline?.ac ?? '',
            'Resources Total': r ? Math.round(r.total) : '',
            'Materials': r ? Math.round(r.materials) : '',
            'Labor': r ? Math.round(r.labor) : '',
            'Equipment': r ? Math.round(r.equipment) : '',
          };
        }), sanitizeSheet('Activities'));
      }

      // Resources sheet
      if (exportIncludeResources && useRealData) {
        addJsonSheet(workbook, scoped.map(a => {
          const r = activityResources[a.sn] || { materials: 0, labor: 0, equipment: 0, total: 0, count: 0 };
          return {
            'SN': a.sn,
            'Activity Code': a.activityCode,
            'Activity': a.activity,
            'Discipline': a.discipline,
            'Category': a.category || '-',
            'Resource Lines': r.count,
            'Materials Cost': Math.round(r.materials),
            'Labor Cost': Math.round(r.labor),
            'Equipment Cost': Math.round(r.equipment),
            'Total Resources Cost': Math.round(r.total),
          };
        }), sanitizeSheet('Resources'));

        // Resources totals row
        const tR = scoped.reduce((acc, a) => {
          const r = activityResources[a.sn]; if (!r) return acc;
          acc.materials += r.materials; acc.labor += r.labor; acc.equipment += r.equipment;
          acc.total += r.total; acc.count += r.count;
          return acc;
        }, { materials: 0, labor: 0, equipment: 0, total: 0, count: 0 });
        addJsonSheet(workbook, [
          { Metric: 'Total Resource Lines', Value: tR.count },
          { Metric: 'Total Materials', Value: Math.round(tR.materials), Formatted: formatValue(tR.materials) },
          { Metric: 'Total Labor', Value: Math.round(tR.labor), Formatted: formatValue(tR.labor) },
          { Metric: 'Total Equipment', Value: Math.round(tR.equipment), Formatted: formatValue(tR.equipment) },
          { Metric: 'Total Resources Cost', Value: Math.round(tR.total), Formatted: formatValue(tR.total) },
        ], sanitizeSheet('Resources_Totals'));
      }

      // Baseline comparison sheet
      if (baselineComparison) {
        addJsonSheet(workbook, [
          { Metric: 'Baseline Name', Baseline: baselineComparison.name, Current: '-', Delta: '-' },
          { Metric: 'Activities (in scope)', Baseline: baselineComparison.activities, Current: baselineComparison.activities, Delta: 0 },
          { Metric: 'PV', Baseline: Math.round(baselineComparison.baseline.pv), Current: Math.round(baselineComparison.current.pv), Delta: Math.round(baselineComparison.delta.pv) },
          { Metric: 'EV', Baseline: Math.round(baselineComparison.baseline.ev), Current: Math.round(baselineComparison.current.ev), Delta: Math.round(baselineComparison.delta.ev) },
          { Metric: 'AC', Baseline: Math.round(baselineComparison.baseline.ac), Current: Math.round(baselineComparison.current.ac), Delta: Math.round(baselineComparison.delta.ac) },
          { Metric: 'Progress %', Baseline: baselineComparison.baseline.progress.toFixed(1), Current: baselineComparison.current.progress.toFixed(1), Delta: baselineComparison.delta.progress.toFixed(1) },
        ], sanitizeSheet('Baseline_vs_Current'));
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadWorkbook(workbook, `CostControl_${safeName}_${dateStr}.xlsx`);
      toast.success(isArabic ? 'تم التصدير بنجاح' : 'Export successful');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(isArabic ? 'فشل التصدير' : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [filteredActivities, allActivities, totals, isArabic, projects, selectedProjectId, useRealData, eacMethod, selectedDisciplines, selectedActivities, alertFilter, quickFilter, disciplineSearch, activitySearch, sortField, sortDirection, activeBaseline, overrides, baselineComparison, exportMode, exportScopeDisciplines, exportScopeCategories, exportIncludeResources, activityResources]);

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
      <ColorLegend type="status" isArabic={isArabic} className="mb-4" />
      {/* Breadcrumb / Back nav */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/"><Home className="h-3.5 w-3.5" />{isArabic ? "الرئيسية" : "Home"}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link to="/projects"><FolderOpen className="h-3.5 w-3.5" />{isArabic ? "المشاريع" : "Projects"}</Link>
        </Button>
        {selectedProjectId && selectedProject && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" />
            <Button variant="ghost" size="sm" asChild className="gap-1.5 max-w-[260px]">
              <Link to={`/projects/${selectedProjectId}`}>
                <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                <span className="truncate">{selectedProject.name}</span>
              </Link>
            </Button>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" />
        <span className="text-sm font-medium text-foreground">
          {isArabic ? "مراقبة التكاليف" : "Cost Control"}
        </span>
      </div>

      <PageSuggestions
        pageKey="cost-control-report"
        suggestions={[
          { id: "pick-project", labelAr: "اختر مشروعاً محفوظاً", labelEn: "Pick a saved project", icon: FolderOpen, tone: "emerald", to: "/projects", show: !selectedProjectId },
          { id: "set-baseline", labelAr: "حفظ خط أساس جديد", labelEn: "Save new baseline", icon: Bookmark, tone: "violet", onClick: () => setBaselineDialogOpen?.(true), show: !!selectedProjectId },
          { id: "thresholds", labelAr: "ضبط حدود التنبيه (CPI/SPI)", labelEn: "Tune CPI/SPI thresholds", icon: Settings2, tone: "amber", onClick: () => setThresholdsDialogOpen?.(true), show: !!selectedProjectId },
          { id: "resource-levelling", labelAr: "موازنة الموارد", labelEn: "Resource levelling", icon: Layers, tone: "teal", onClick: () => setResourceLevellingOpen(true), show: !!selectedProjectId },
          { id: "export-pdf", labelAr: "تصدير تقرير PDF", labelEn: "Export PDF report", icon: Printer, tone: "sky", onClick: () => setExportDialogOpen(true), show: !!selectedProjectId },
          { id: "certificates", labelAr: "ربط بشهادات الإنجاز", labelEn: "Open progress certificates", icon: FileSignature, tone: "emerald", to: `/progress-certificates${selectedProjectId ? `?projectId=${selectedProjectId}`:""}` },
          { id: "risks", labelAr: "سجل المخاطر", labelEn: "Risk register", icon: ShieldAlert, tone: "rose", to: `/risk${selectedProjectId ? `?projectId=${selectedProjectId}`:""}` },
          { id: "executive", labelAr: "الملخص التنفيذي", labelEn: "Executive summary", icon: Sparkles, tone: "violet", to: "/executive-summary" },
          { id: "compare", labelAr: "مقارنة المشاريع", labelEn: "Compare projects", icon: GitCompare, tone: "sky", to: "/projects/compare" },
        ]}
      />

      {!selectedProjectId && !isLoadingProjects && (
        <Card className="mb-4 border-amber-300/50 bg-gradient-to-br from-amber-50/60 to-emerald-50/60 dark:from-amber-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-full bg-amber-400/15 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="font-semibold text-sm">
                {isArabic ? "لم يتم اختيار مشروع" : "No project selected"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isArabic
                  ? "اختر مشروعاً محفوظاً لعرض بيانات EVM الحقيقية، أو تابع باستخدام بيانات العينة."
                  : "Pick a saved project to load real EVM data, or continue with sample data."}
              </div>
            </div>
            <Button size="sm" asChild className="gap-1.5">
              <Link to="/projects"><FolderOpen className="h-3.5 w-3.5" />{isArabic ? "تصفح المشاريع" : "Browse projects"}</Link>
            </Button>
            {projects.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => { setSelectedProjectId(projects[0].id); setUseRealData(true); }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isArabic ? `فتح: ${projects[0].name}` : `Open: ${projects[0].name}`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
                  <Select value={selectedProjectId || ''} onValueChange={(v) => { setSelectedProjectId(v); setUseRealData(true); }}>
                    <SelectTrigger data-cc-project-trigger className="w-[280px] bg-white/10 border-white/20 text-white">
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

                {/* Quick refresh */}
                {selectedProjectId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-white hover:bg-white/10 gap-1"
                    onClick={() => { setUseRealData(false); setTimeout(() => setUseRealData(true), 50); }}
                    title={isArabic ? "تحديث البيانات" : "Refresh data"}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isArabic ? "تحديث" : "Refresh"}
                  </Button>
                )}
              </div>

              {/* Recent projects quick-pick */}
              {!isLoadingProjects && projects.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/70 shrink-0">
                    {isArabic ? "مشاريع حديثة:" : "Recent:"}
                  </span>
                  {projects.slice(0, 5).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProjectId(p.id); setUseRealData(true); }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        selectedProjectId === p.id
                          ? "bg-white text-primary border-white font-medium"
                          : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <span className="max-w-[140px] truncate inline-block align-middle">{p.name}</span>
                    </button>
                  ))}
                  {projects.length > 5 && (
                    <span className="text-xs text-white/60">+{projects.length - 5}</span>
                  )}
                </div>
              )}

            </div>
          </div>


          {/* KPI Section (capturable for PNG export) */}
          <div ref={kpiSectionRef} className="space-y-4 bg-background rounded-2xl">
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
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isArabic ? "تصدير Excel" : "Export Excel"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleExportPDF} disabled={isExportingPDF}>
                    {isExportingPDF ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handlePrint}>
                    <Printer className="h-3 w-3" />
                    {isArabic ? "طباعة" : "Print"}
                  </Button>
                </div>
                {useRealData && selectedProjectId && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1"
                      onClick={() => setEditProgressDialog({ open: true, progress: progressHistory?.actual_progress || 60 })}>
                      <Edit className="h-3 w-3" />
                      {isArabic ? "تحديث" : "Edit"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleSaveReport} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      {isArabic ? "حفظ" : "Save"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>{/* /KPI capture wrapper */}

          {/* Pro Toolbar: Baseline + Views + EAC method + Quick filters + Undo/Redo + PNG */}
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-md">
            <CardContent className="p-3 flex flex-wrap items-center gap-2">
              {/* Quick Filters */}
              <div className="flex items-center gap-1 mr-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{isArabic ? "فلاتر سريعة:" : "Quick:"}</span>
              </div>
              {([
                ["critical", isArabic ? "حرج" : "Critical", "bg-rose-500/15 text-rose-700 dark:text-rose-300"],
                ["late", isArabic ? "متأخر" : "Late", "bg-amber-500/15 text-amber-700 dark:text-amber-300"],
                ["over-budget", isArabic ? "تجاوز ميزانية" : "Over Budget", "bg-orange-500/15 text-orange-700 dark:text-orange-300"],
                ["in-progress", isArabic ? "قيد التنفيذ" : "In Progress", "bg-blue-500/15 text-blue-700 dark:text-blue-300"],
                ["completed", isArabic ? "مكتمل" : "Completed", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"],
              ] as const).map(([k, lbl, cls]) => {
                const active = quickFilter === k;
                return (
                  <button key={k} onClick={() => { setQuickFilter(active ? null : k); setCurrentPage(1); }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${cls} ${active ? "ring-2 ring-primary/40 font-semibold" : "opacity-80 hover:opacity-100"}`}>
                    {lbl}
                  </button>
                );
              })}
              {quickFilter && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setQuickFilter(null)}>
                  <X className="h-3 w-3" />{isArabic ? "مسح" : "clear"}
                </Button>
              )}

              <div className="h-6 border-l mx-2" />

              {/* EAC method */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">EAC:</span>
                <Select value={eacMethod} onValueChange={(v) => setEacMethod(v as any)}>
                  <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pert">PERT (BAC/CPI/SPI)</SelectItem>
                    <SelectItem value="cpi">{isArabic ? "حسب CPI" : "CPI-based"}</SelectItem>
                    <SelectItem value="linear">{isArabic ? "خطي (AC+BAC-EV)" : "Linear (AC+BAC-EV)"}</SelectItem>
                    <SelectItem value="composite">{isArabic ? "مركّب (CPI×SPI)" : "Composite (CPI×SPI)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-6 border-l mx-2" />

              {/* Group by */}
              <Button size="sm" variant={groupByDiscipline ? "default" : "outline"} className="h-7 text-xs gap-1"
                onClick={() => setGroupByDiscipline(g => !g)}>
                <Layers className="h-3 w-3" />{isArabic ? "تجميع حسب التخصص" : "Group by Discipline"}
              </Button>

              <div className="ml-auto flex items-center gap-1.5">
                {/* Undo / Redo */}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={overridesUR.undo} disabled={!overridesUR.canUndo} title="Ctrl+Z">
                  <Undo2 className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={overridesUR.redo} disabled={!overridesUR.canRedo} title="Ctrl+Shift+Z">
                  <Redo2 className="h-3 w-3" />
                </Button>

                {/* PNG export */}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleExportKpiPng} disabled={isExportingPNG}>
                  {isExportingPNG ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  PNG
                </Button>

                {/* Saved Views */}
                <Select onValueChange={(id) => { const v = savedViews.find(x => x.id === id); if (v) applyView(v.config); }}>
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue placeholder={isArabic ? "عرض محفوظ" : "Saved view"} />
                  </SelectTrigger>
                  <SelectContent>
                    {savedViews.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">{isArabic ? "لا يوجد" : "None"}</div>}
                    {savedViews.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="flex items-center gap-2">
                          <Bookmark className="h-3 w-3" />{v.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setViewDialogOpen(true)}>
                  <Plus className="h-3 w-3" />{isArabic ? "حفظ عرض" : "Save view"}
                </Button>

                {/* Reset Filters */}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={resetFilters} title={isArabic ? "إعادة ضبط الفلاتر" : "Reset filters"}>
                  <RotateCcw className="h-3 w-3" />{isArabic ? "إعادة ضبط" : "Reset"}
                </Button>

                {/* Share Link */}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copyShareLink} title={isArabic ? "مشاركة الرابط مع الفلاتر" : "Share link with filters"}>
                  <Share2 className="h-3 w-3" />{isArabic ? "مشاركة" : "Share"}
                </Button>

                {/* Resources */}
                {useRealData && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setResourcesDialogOpen(true)}>
                    <Package className="h-3 w-3" />{isArabic ? "الموارد" : "Resources"}
                    {totalResources.count > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1 ml-1">{totalResources.count}</Badge>}
                  </Button>
                )}

                {/* Resource Levelling */}
                {useRealData && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setResourceLevellingOpen(true)} title={isArabic ? "تسوية الموارد" : "Resource Levelling"}>
                    <Activity className="h-3 w-3" />{isArabic ? "تسوية الموارد" : "Levelling"}
                  </Button>
                )}

                {/* Baseline */}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setBaselineDialogOpen(true)}>
                  <Bookmark className="h-3 w-3" />{isArabic ? "خط أساس" : "Baseline"}
                </Button>
                {activeBaseline && (
                  <Badge variant="secondary" className="h-7 text-xs gap-1 px-2">
                    <GitCompare className="h-3 w-3" />
                    <span className="max-w-[100px] truncate">{activeBaseline.name}</span>
                    <button onClick={clearBaseline} className="hover:text-destructive ml-1"><X className="h-3 w-3" /></button>
                  </Badge>
                )}

                {/* Export Options */}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setExportDialogOpen(true)}>
                  <Settings2 className="h-3 w-3" />{isArabic ? "خيارات التصدير" : "Export options"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Baseline vs Current comparison */}
          {baselineComparison && (
            <Card className="bg-card/95 backdrop-blur border-border/50 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCompare className="h-4 w-4 text-primary" />
                  {isArabic ? "مقارنة بخط الأساس" : "Baseline vs Current"}
                  <Badge variant="outline" className="ml-2 max-w-[200px] truncate">{baselineComparison.name}</Badge>
                  <Badge variant="secondary" className="ml-1">
                    {baselineComparison.activities} {isArabic ? "نشاط" : "act."}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([
                    ["PV", baselineComparison.baseline.pv, baselineComparison.current.pv, baselineComparison.delta.pv, "money"],
                    ["EV", baselineComparison.baseline.ev, baselineComparison.current.ev, baselineComparison.delta.ev, "money"],
                    ["AC", baselineComparison.baseline.ac, baselineComparison.current.ac, baselineComparison.delta.ac, "money-rev"],
                    [isArabic ? "الإنجاز %" : "Progress %", baselineComparison.baseline.progress, baselineComparison.current.progress, baselineComparison.delta.progress, "pct"],
                  ] as const).map(([label, b, c, d, kind]) => {
                    const fmt = (v: number) => kind === "pct" ? `${v.toFixed(1)}%` : formatValue(v);
                    // For AC, positive delta is bad (costs more); for PV/EV/Progress positive is good
                    const good = kind === "money-rev" ? d <= 0 : d >= 0;
                    const cls = Math.abs(d) < (kind === "pct" ? 0.5 : 1)
                      ? "text-muted-foreground"
                      : good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
                    const sign = d > 0 ? "+" : "";
                    return (
                      <div key={label} className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-[11px] uppercase text-muted-foreground tracking-wide">{label}</div>
                        <div className="mt-1 text-base font-bold">{fmt(c)}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {isArabic ? "أساس:" : "Base:"} {fmt(b)}
                        </div>
                        <div className={`text-xs font-semibold ${cls}`}>
                          Δ {sign}{kind === "pct" ? `${d.toFixed(1)}%` : formatValue(d)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts Banner — clickable to filter table */}
          {alerts.length > 0 && (
            <Card className="border-amber-300/50 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  {isArabic ? "تنبيهات الأداء والتنبؤات" : "Performance & Forecast Alerts"}
                  <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
                  <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs gap-1" onClick={() => setThresholdsDialogOpen(true)}>
                    <Edit className="h-3 w-3" />
                    {isArabic ? "إعدادات العتبات" : "Thresholds"}
                  </Button>
                  {alertFilter && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setAlertFilter(null); setCurrentPage(1); }}>
                      <X className="h-3 w-3" />
                      {isArabic ? "إلغاء فلتر التنبيه" : "Clear alert filter"}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {alerts.map((a) => {
                    const active = alertFilter === a.key;
                    return (
                      <li key={a.key}>
                        <button
                          type="button"
                          onClick={() => { setAlertFilter(active ? null : a.key); setCurrentPage(1); }}
                          className={`w-full text-left flex items-start gap-2 text-sm rounded-md px-2 py-1.5 transition-colors hover:bg-white/40 dark:hover:bg-black/20 ${active ? "ring-2 ring-primary/40 bg-white/60 dark:bg-black/30" : ""} ${a.level === "danger" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"}`}
                        >
                          <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.level === "danger" ? "bg-rose-500" : "bg-amber-500"}`} />
                          <span className="flex-1">{a.msg}</span>
                          <span className="text-[10px] opacity-70 shrink-0">
                            {active ? (isArabic ? "مُفعّل" : "filtered") : (isArabic ? "اضغط للفلترة" : "click to filter")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

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

          {/* S-Curve & CPI/SPI Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChartIcon className="h-4 w-4 text-primary" />
                  {isArabic ? "منحنى S التراكمي (PV/EV/AC)" : "Cumulative S-Curve (PV/EV/AC)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <Chart type="line" data={sCurveData} options={createChartOptions(isArabic)} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  {isArabic ? "اتجاه CPI / SPI" : "CPI / SPI Trend"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <Chart type="line" data={cpiSpiTrendData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: "top" as const, labels: { usePointStyle: true, font: { size: 11 } } } },
                    scales: { y: { suggestedMin: 0, suggestedMax: 1.4 }, x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } } },
                  }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cashflow Chart */}
          <Card className="bg-card/95 backdrop-blur border-border/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-primary" />
                {isArabic ? "التدفق النقدي التراكمي (PV / AC / EV)" : "Cumulative Cashflow (PV / AC / EV)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Chart type="bar" data={cashflowData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: "top" as const, labels: { usePointStyle: true, font: { size: 11 } } } },
                  scales: { y: { beginAtZero: true, title: { display: true, text: isArabic ? "مليون" : "Millions" } } },
                }} />
              </div>
            </CardContent>
          </Card>

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
                      <TableHead className="w-20 text-center">{isArabic ? "إجراء" : "Action"}</TableHead>
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
                          {editingRow === activity.sn ? (
                            <Input
                              type="number" min={0} max={100}
                              value={editDraft.progress}
                              onChange={(e) => setEditDraft(d => ({ ...d, progress: Number(e.target.value) }))}
                              className="h-7 w-20 text-xs"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1"><Progress value={activity.progress} className="h-2" /></div>
                              <span className={`text-xs font-bold w-10 text-right ${getProgressTextColor(activity.progress)}`}>
                                {activity.progress}%
                              </span>
                              {overrides[activity.sn] && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{isArabic ? "معدّل" : "edit"}</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatValue(activity.pv)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatValue(activity.ev)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {editingRow === activity.sn ? (
                            <Input
                              type="number" min={0}
                              value={editDraft.ac}
                              onChange={(e) => setEditDraft(d => ({ ...d, ac: Number(e.target.value) }))}
                              className="h-7 w-24 text-xs ml-auto"
                            />
                          ) : (
                            formatValue(activity.ac)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatValue(activity.eacByPert)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatValue(activity.etc)}</TableCell>
                        <TableCell className="text-center">
                          {editingRow === activity.sn ? (
                            <div className="flex gap-1 justify-center">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEditRow(activity.sn)}>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditRow}>
                                <X className="h-3.5 w-3.5 text-rose-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditRow(activity)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
                      <TableCell className="text-center">
                        {Object.keys(overrides).length > 0 && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" title={isArabic ? "إعادة تعيين التعديلات" : "Reset overrides"} onClick={resetOverrides}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
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

      {/* Thresholds Settings Dialog */}
      <Dialog open={thresholdsDialogOpen} onOpenChange={setThresholdsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isArabic ? "إعدادات عتبات التنبيه" : "Alert Threshold Settings"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              ["cpi_warn", isArabic ? "CPI تحذير" : "CPI warn", 0.01],
              ["cpi_critical", isArabic ? "CPI حرج" : "CPI critical", 0.01],
              ["spi_warn", isArabic ? "SPI تحذير" : "SPI warn", 0.01],
              ["spi_critical", isArabic ? "SPI حرج" : "SPI critical", 0.01],
              ["eac_overrun_pct", isArabic ? "EAC تجاوز %" : "EAC overrun %", 1],
              ["tcpi_warn", isArabic ? "TCPI تحذير" : "TCPI warn", 0.01],
            ] as const).map(([k, label, step]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number" step={step}
                  value={(thresholds as any)[k]}
                  onChange={(e) => setThresholds(t => ({ ...t, [k]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdsDialogOpen(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={saveThresholds} disabled={isSavingThresholds}>
              {isSavingThresholds ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isArabic ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baseline Manager Dialog */}
      <Dialog open={baselineDialogOpen} onOpenChange={setBaselineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              {isArabic ? "إدارة خطوط الأساس (Baselines)" : "Baseline Manager"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{isArabic ? "اسم خط الأساس الجديد" : "New baseline name"}</Label>
                <Input value={baselineName} onChange={(e) => setBaselineName(e.target.value)} placeholder={isArabic ? "مثال: خطة Q2 2026" : "e.g. Q2 2026 Plan"} />
              </div>
              <Button onClick={saveBaseline} className="gap-2"><Save className="h-4 w-4" />{isArabic ? "حفظ لقطة حالية" : "Snapshot now"}</Button>
            </div>
            <div className="border rounded-lg max-h-[320px] overflow-y-auto">
              {baselines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{isArabic ? "لا توجد خطوط أساس محفوظة" : "No baselines saved yet"}</p>
              ) : baselines.map(b => (
                 <div key={b.id} className={`flex items-center gap-2 p-3 border-b last:border-0 ${b.is_active ? "bg-primary/5" : ""}`}>
                   <Bookmark className={`h-4 w-4 shrink-0 ${b.is_active ? "text-primary fill-primary/30" : "text-muted-foreground"}`} />
                   <div className="flex-1 min-w-0">
                     {renamingBaselineId === b.id ? (
                       <div className="flex items-center gap-1">
                         <Input
                           autoFocus
                           value={renameDraft}
                           onChange={(e) => setRenameDraft(e.target.value)}
                           onKeyDown={(e) => { if (e.key === "Enter") renameBaseline(b.id); if (e.key === "Escape") { setRenamingBaselineId(null); setRenameDraft(""); } }}
                           className="h-7 text-xs"
                         />
                         <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => renameBaseline(b.id)}>
                           <Check className="h-4 w-4" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRenamingBaselineId(null); setRenameDraft(""); }}>
                           <X className="h-4 w-4" />
                         </Button>
                       </div>
                     ) : (
                       <>
                         <p className="text-sm font-medium truncate">{b.name}</p>
                         <p className="text-[11px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                       </>
                     )}
                   </div>
                   {renamingBaselineId !== b.id && (
                     <>
                       <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setRenamingBaselineId(b.id); setRenameDraft(b.name); }} title={isArabic ? "إعادة تسمية" : "Rename"}>
                         <Edit className="h-3.5 w-3.5" />
                       </Button>
                       <Button size="sm" variant={activeBaseline?.id === b.id ? "default" : "outline"} onClick={() => activateBaseline(b)}>
                         {activeBaseline?.id === b.id ? (isArabic ? "مفعّل" : "Active") : (isArabic ? "تفعيل" : "Activate")}
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setPendingDeleteBaseline({ id: b.id, name: b.name })}>
                         <X className="h-4 w-4" />
                       </Button>
                     </>
                   )}
                 </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Baseline Confirmation */}
      <AlertDialog open={!!pendingDeleteBaseline} onOpenChange={(o) => { if (!o) setPendingDeleteBaseline(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArabic ? "تأكيد حذف خط الأساس" : "Delete Baseline?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? `سيتم حذف خط الأساس "${pendingDeleteBaseline?.name}" نهائيًا. لا يمكن التراجع.`
                : `Baseline "${pendingDeleteBaseline?.name}" will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (pendingDeleteBaseline) await deleteBaseline(pendingDeleteBaseline.id);
                setPendingDeleteBaseline(null);
              }}
            >
              {isArabic ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resource Levelling Dialog */}
      <ResourceLevellingDialog
        open={resourceLevellingOpen}
        onOpenChange={setResourceLevellingOpen}
        projectId={selectedProjectId}
        filteredActivities={filteredActivities.map(a => ({ sn: a.sn, activity: a.activity, activityAr: a.activityAr, itemIds: a.itemIds }))}
        isArabic={isArabic}
      />

      {/* Resources Manager Dialog */}
      <Dialog open={resourcesDialogOpen} onOpenChange={setResourcesDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              {isArabic ? "ملخص الموارد المستخدمة" : "Resources Usage Summary"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Aggregated totals */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: isArabic ? "مواد" : "Materials", value: totalResources.materials, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
                { label: isArabic ? "عمالة" : "Labor", value: totalResources.labor, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
                { label: isArabic ? "معدات" : "Equipment", value: totalResources.equipment, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
                { label: isArabic ? "الإجمالي" : "Total", value: totalResources.total, color: "text-primary", bg: "bg-primary/5" },
              ].map((s, i) => (
                <div key={i} className={`rounded-lg p-3 border ${s.bg}`}>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              ))}
            </div>
            {/* Per-activity breakdown */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="text-xs">{isArabic ? "النشاط" : "Activity"}</TableHead>
                    <TableHead className="text-xs text-right">{isArabic ? "مواد" : "Materials"}</TableHead>
                    <TableHead className="text-xs text-right">{isArabic ? "عمالة" : "Labor"}</TableHead>
                    <TableHead className="text-xs text-right">{isArabic ? "معدات" : "Equipment"}</TableHead>
                    <TableHead className="text-xs text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map(a => {
                    const r = activityResources[a.sn];
                    if (!r || r.count === 0) return null;
                    return (
                      <TableRow key={a.sn}>
                        <TableCell className="text-xs max-w-[280px] truncate" title={isArabic ? a.activityAr : a.activity}>{isArabic ? a.activityAr : a.activity}</TableCell>
                        <TableCell className="text-xs text-right text-blue-600">{r.materials.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-xs text-right text-green-600">{r.labor.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-xs text-right text-amber-600">{r.equipment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">{r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      </TableRow>
                    );
                  })}
                  {totalResources.count === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                      {isArabic ? "لا توجد بيانات موارد لهذه الأنشطة" : "No resource data for these activities"}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourcesDialogOpen(false)}>{isArabic ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Options Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              {isArabic ? "خيارات تصدير Excel" : "Excel Export Options"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{isArabic ? "نوع التقرير" : "Report Type"}</Label>
              <Select value={exportMode} onValueChange={(v: any) => setExportMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">{isArabic ? "ملخص فقط (KPIs)" : "Summary only (KPIs)"}</SelectItem>
                  <SelectItem value="detailed">{isArabic ? "أنشطة مفصّلة" : "Detailed activities"}</SelectItem>
                  <SelectItem value="full">{isArabic ? "كامل (ملخص + أنشطة + موارد + مقارنة)" : "Full (summary + activities + resources + comparison)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">{isArabic ? "نطاق Disciplines" : "Disciplines Scope"}</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-[120px] overflow-y-auto">
                {disciplines.map(d => {
                  const checked = exportScopeDisciplines.includes(d.id);
                  return (
                    <label key={d.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={(c) => {
                        setExportScopeDisciplines(prev => c ? [...prev, d.id] : prev.filter(x => x !== d.id));
                      }} />
                      {isArabic ? d.labelAr : d.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">{isArabic ? "اتركها فارغة لتطبيق الفلاتر الحالية فقط" : "Leave empty to use current filters only"}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">{isArabic ? "نطاق Categories (مفصول بفواصل)" : "Categories Scope (comma-separated)"}</Label>
              <Input
                value={exportScopeCategories.join(", ")}
                onChange={(e) => setExportScopeCategories(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                placeholder={isArabic ? "مثال: concrete, steel" : "e.g. concrete, steel"}
              />
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
              <Checkbox
                id="inc-res"
                checked={exportIncludeResources}
                onCheckedChange={(c) => setExportIncludeResources(!!c)}
              />
              <Label htmlFor="inc-res" className="text-xs cursor-pointer">
                {isArabic ? "إضافة ورقة الموارد (مواد/عمالة/معدات) للتصدير" : "Include Resources sheet (materials/labor/equipment)"}
              </Label>
            </div>

            <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
              <p className="font-semibold">{isArabic ? "ملاحظات:" : "Notes:"}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>{isArabic ? "التصدير يطبق الـ Overrides والفلاتر الحالية" : "Export applies current overrides & filters"}</li>
                <li>{isArabic ? "يتم تضمين مقارنة خط الأساس إن وُجد نشط" : "Baseline comparison included if active baseline exists"}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => { setExportDialogOpen(false); handleExportExcel(); }} className="gap-2">
              <Download className="h-4 w-4" />{isArabic ? "تصدير الآن" : "Export Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              {isArabic ? "حفظ عرض مخصص" : "Save Custom View"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">{isArabic ? "اسم العرض" : "View name"}</Label>
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder={isArabic ? "مثال: المتأخرات الحرجة" : "e.g. Critical Late"} />
            </div>
            {savedViews.length > 0 && (
              <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                {savedViews.map(v => (
                  <div key={v.id} className="flex items-center gap-2 p-2 border-b last:border-0">
                    <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{v.name}</span>
                    <Button size="sm" variant="outline" onClick={() => { applyView(v.config); setViewDialogOpen(false); }}>
                      {isArabic ? "تطبيق" : "Apply"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteView(v.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={saveCurrentView} className="gap-2"><Save className="h-4 w-4" />{isArabic ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Advanced insights, recommendations, drivers & burn-rate ===== */}
      <CostControlEnhancements
        activities={filteredActivities}
        totals={{
          pv: totals.pv,
          ev: totals.ev,
          ac: totals.ac,
          cv: totals.cv,
          sv: totals.sv,
          cpi: totals.cpi,
          spi: totals.spi,
          bac: totals.pv,
          eac: totals.eacByPert,
        }}
        isArabic={isArabic}
      />
    </PageLayout>
  );
}
