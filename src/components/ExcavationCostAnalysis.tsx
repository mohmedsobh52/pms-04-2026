import { useState, useMemo, useCallback } from "react";
import { Calculator, Save, Plus, Trash2, X, Download, FileSpreadsheet, FileText, Copy, Upload, PieChart as PieChartIcon, Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Zap, GripVertical, Edit2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExcavationItem {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerCubicMeter: number;
  isEditable: boolean;
  aiSuggestedProductivity?: number;
  aiSuggestedRent?: number;
  isLoadingAI?: boolean;
}

interface CostTemplate {
  id: string;
  name: string;
  items: Omit<ExcavationItem, 'id'>[];
  wastePercentage: number;
  adminPercentage: number;
  createdAt: string;
}

interface ExcavationCostAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  itemDescription: string;
  onSave: (totalCost: number, breakdown: ExcavationItem[]) => void;
  currency?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE'];

const STORAGE_KEY = 'excavation_cost_templates';

const defaultExcavationItems: Omit<ExcavationItem, 'id'>[] = [
  { name: "رص السيقق+الباتر+الانارة+المولد", dailyProductivity: 10, dailyRent: 100, costPerCubicMeter: 10.00, isEditable: true },
  { name: "بوكلين", dailyProductivity: 1300, dailyRent: 150, costPerCubicMeter: 8.67, isEditable: true },
  { name: "ترحيل (تربلا) (25% ترحيل)", dailyProductivity: 75, dailyRent: 20, costPerCubicMeter: 3.75, isEditable: true },
  { name: "قلاب ترحيل داخلي", dailyProductivity: 600, dailyRent: 60, costPerCubicMeter: 10.00, isEditable: true },
  { name: "نزح المياه الجوفية", dailyProductivity: 2, dailyRent: 10, costPerCubicMeter: 5.00, isEditable: true },
  { name: "سند جوانب الحفر", dailyProductivity: 1300, dailyRent: 150, costPerCubicMeter: 8.67, isEditable: true },
  { name: "بوكلين دقاق", dailyProductivity: 300, dailyRent: 50, costPerCubicMeter: 6.00, isEditable: true },
  { name: "تفتيت 30%", dailyProductivity: 0, dailyRent: 0, costPerCubicMeter: 0, isEditable: true },
];

// Sortable Row Component
interface SortableRowProps {
  item: ExcavationItem;
  handleItemChange: (id: string, field: keyof ExcavationItem, value: string | number) => void;
  handleRemoveItem: (id: string) => void;
  handleCopyItem: (id: string) => void;
  analyzeWithAI: (id: string, name: string) => void;
  applyAISuggestion: (id: string, field: 'productivity' | 'rent') => void;
  calculateDifference: (manual: number, ai: number | undefined) => { value: number; type: 'up' | 'down' | 'same' } | null;
  formatNumber: (num: number) => string;
}

function SortableRow({
  item,
  handleItemChange,
  handleRemoveItem,
  handleCopyItem,
  analyzeWithAI,
  applyAISuggestion,
  calculateDifference,
  formatNumber,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="hover:bg-muted/50">
      <TableCell className="cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </TableCell>
      <TableCell className="text-right font-medium">
        <Input
          value={item.name}
          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
          className="text-right h-7 text-sm border-0 bg-transparent focus:bg-background"
        />
      </TableCell>
      <TableCell className="text-center">
        <Input
          type="number"
          value={item.dailyProductivity || ""}
          onChange={(e) => handleItemChange(item.id, 'dailyProductivity', parseFloat(e.target.value) || 0)}
          className="text-center h-7 w-16 mx-auto text-sm"
          placeholder="0"
        />
      </TableCell>
      <TableCell className="text-center">
        {item.isLoadingAI ? (
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
        ) : item.aiSuggestedProductivity ? (
          <div className="flex flex-col items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyAISuggestion(item.id, 'productivity')}
              className="h-5 px-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700"
            >
              {item.aiSuggestedProductivity}
            </Button>
            {(() => {
              const diff = calculateDifference(item.dailyProductivity, item.aiSuggestedProductivity);
              if (!diff) return null;
              return (
                <Badge 
                  variant="outline" 
                  className={`text-[9px] px-1 py-0 h-4 ${
                    diff.type === 'up' ? 'text-green-600 border-green-300 bg-green-50' : 
                    diff.type === 'down' ? 'text-red-600 border-red-300 bg-red-50' : 
                    'text-muted-foreground'
                  }`}
                >
                  {diff.type === 'up' && <TrendingUp className="w-2 h-2 mr-0.5" />}
                  {diff.type === 'down' && <TrendingDown className="w-2 h-2 mr-0.5" />}
                  {diff.type === 'same' && <Minus className="w-2 h-2 mr-0.5" />}
                  {diff.value.toFixed(0)}%
                </Badge>
              );
            })()}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => analyzeWithAI(item.id, item.name)}
            className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
          >
            <Sparkles className="w-3 h-3" />
          </Button>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Input
          type="number"
          value={item.dailyRent || ""}
          onChange={(e) => handleItemChange(item.id, 'dailyRent', parseFloat(e.target.value) || 0)}
          className="text-center h-7 w-14 mx-auto text-sm"
          placeholder="0"
        />
      </TableCell>
      <TableCell className="text-center">
        {item.isLoadingAI ? (
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
        ) : item.aiSuggestedRent ? (
          <div className="flex flex-col items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyAISuggestion(item.id, 'rent')}
              className="h-5 px-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700"
            >
              {item.aiSuggestedRent}
            </Button>
            {(() => {
              const diff = calculateDifference(item.dailyRent, item.aiSuggestedRent);
              if (!diff) return null;
              return (
                <Badge 
                  variant="outline" 
                  className={`text-[9px] px-1 py-0 h-4 ${
                    diff.type === 'up' ? 'text-red-600 border-red-300 bg-red-50' : 
                    diff.type === 'down' ? 'text-green-600 border-green-300 bg-green-50' : 
                    'text-muted-foreground'
                  }`}
                >
                  {diff.type === 'up' && <TrendingUp className="w-2 h-2 mr-0.5" />}
                  {diff.type === 'down' && <TrendingDown className="w-2 h-2 mr-0.5" />}
                  {diff.type === 'same' && <Minus className="w-2 h-2 mr-0.5" />}
                  {diff.value.toFixed(0)}%
                </Badge>
              );
            })()}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => analyzeWithAI(item.id, item.name)}
            className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
            disabled={item.aiSuggestedProductivity !== undefined}
          >
            <Sparkles className="w-3 h-3" />
          </Button>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
          {formatNumber(item.costPerCubicMeter)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyItem(item.id)}
            className="h-6 w-6 p-0 text-primary hover:text-primary hover:bg-primary/10"
            title="نسخ الصف"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveItem(item.id)}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="حذف الصف"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ExcavationCostAnalysis({
  isOpen,
  onClose,
  itemDescription,
  onSave,
  currency = "ريال",
}: ExcavationCostAnalysisProps) {
  const [items, setItems] = useState<ExcavationItem[]>(() =>
    defaultExcavationItems.map((item, index) => ({
      ...item,
      id: `item-${index}`,
    }))
  );
  const [wastePercentage, setWastePercentage] = useState(5);
  const [adminPercentage, setAdminPercentage] = useState(10);
  const [newItemName, setNewItemName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<CostTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [editingHeaders, setEditingHeaders] = useState(false);
  const [headers, setHeaders] = useState({
    workItem: "اعمال الحفر",
    productivity: "الانتاجية (م3)",
    aiProductivity: "AI إنتاجية",
    dailyRent: "ايجار/يوم",
    aiRent: "AI إيجار",
    costPerM3: "تكلفة/م3",
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleCopyItem = useCallback((id: string) => {
    const itemToCopy = items.find(item => item.id === id);
    if (!itemToCopy) return;
    
    const newItem: ExcavationItem = {
      ...itemToCopy,
      id: `item-${Date.now()}`,
      name: `${itemToCopy.name} (نسخة)`,
    };
    
    setItems(prev => {
      const index = prev.findIndex(item => item.id === id);
      const newItems = [...prev];
      newItems.splice(index + 1, 0, newItem);
      return newItems;
    });
    toast.success("تم نسخ البند بنجاح");
  }, [items]);

  const handleAddNewItem = useCallback(() => {
    const newItem: ExcavationItem = {
      id: `item-${Date.now()}`,
      name: "بند جديد",
      dailyProductivity: 0,
      dailyRent: 0,
      costPerCubicMeter: 0,
      isEditable: true,
    };
    setItems(prev => [...prev, newItem]);
    toast.success("تم إضافة صف جديد");
  }, []);

  // Calculate difference percentage between manual and AI values
  const calculateDifference = useCallback((manual: number, ai: number | undefined): { value: number; type: 'up' | 'down' | 'same' } | null => {
    if (!ai || ai === 0) return null;
    if (manual === 0) return { value: 100, type: 'up' };
    const diff = ((ai - manual) / manual) * 100;
    if (Math.abs(diff) < 0.1) return { value: 0, type: 'same' };
    return { value: Math.abs(diff), type: diff > 0 ? 'up' : 'down' };
  }, []);

  // AI Analysis for productivity and rent
  const analyzeWithAI = useCallback(async (itemId: string, itemName: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, isLoadingAI: true } : item
    ));

    try {
      const { data, error } = await supabase.functions.invoke('analyze-costs', {
        body: {
          itemName,
          type: 'excavation_productivity'
        }
      });

      if (error) throw error;

      setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          aiSuggestedProductivity: data?.suggestedProductivity || 0,
          aiSuggestedRent: data?.suggestedRent || 0,
          isLoadingAI: false
        };
      }));

      toast.success("تم تحليل البند بواسطة AI");
    } catch (error) {
      console.error('AI analysis error:', error);
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, isLoadingAI: false } : item
      ));
      toast.error("فشل تحليل AI، يرجى المحاولة مرة أخرى");
    }
  }, []);

  // Analyze all items with AI at once
  const analyzeAllWithAI = useCallback(async () => {
    setIsAnalyzingAll(true);
    const itemsToAnalyze = items.filter(item => !item.aiSuggestedProductivity && !item.aiSuggestedRent && item.name.trim());
    
    if (itemsToAnalyze.length === 0) {
      toast.info("جميع البنود تم تحليلها بالفعل");
      setIsAnalyzingAll(false);
      return;
    }

    // Set all items to loading
    setItems(prev => prev.map(item => 
      itemsToAnalyze.some(i => i.id === item.id) ? { ...item, isLoadingAI: true } : item
    ));

    let successCount = 0;
    let failCount = 0;

    // Process items sequentially to avoid rate limiting
    for (const item of itemsToAnalyze) {
      try {
        const { data, error } = await supabase.functions.invoke('analyze-costs', {
          body: {
            itemName: item.name,
            type: 'excavation_productivity'
          }
        });

        if (error) throw error;

        setItems(prev => prev.map(i => {
          if (i.id !== item.id) return i;
          return {
            ...i,
            aiSuggestedProductivity: data?.suggestedProductivity || 0,
            aiSuggestedRent: data?.suggestedRent || 0,
            isLoadingAI: false
          };
        }));
        successCount++;
      } catch (error) {
        console.error(`AI analysis error for ${item.name}:`, error);
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, isLoadingAI: false } : i
        ));
        failCount++;
      }
    }

    setIsAnalyzingAll(false);
    if (successCount > 0) {
      toast.success(`تم تحليل ${successCount} بند بنجاح${failCount > 0 ? ` (فشل ${failCount})` : ''}`);
    } else {
      toast.error("فشل تحليل جميع البنود");
    }
  }, [items]);

  const applyAISuggestion = useCallback((itemId: string, field: 'productivity' | 'rent') => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const newProductivity = field === 'productivity' && item.aiSuggestedProductivity 
        ? item.aiSuggestedProductivity 
        : item.dailyProductivity;
      const newRent = field === 'rent' && item.aiSuggestedRent 
        ? item.aiSuggestedRent 
        : item.dailyRent;
      
      return {
        ...item,
        dailyProductivity: newProductivity,
        dailyRent: newRent,
        costPerCubicMeter: newRent > 0 && newProductivity > 0 ? newRent / newProductivity : 0
      };
    }));
    toast.success("تم تطبيق اقتراح AI");
  }, []);

  // Apply all AI suggestions at once
  const applyAllAISuggestions = useCallback(() => {
    setItems(prev => prev.map(item => {
      if (!item.aiSuggestedProductivity && !item.aiSuggestedRent) return item;
      
      const newProductivity = item.aiSuggestedProductivity || item.dailyProductivity;
      const newRent = item.aiSuggestedRent || item.dailyRent;
      
      return {
        ...item,
        dailyProductivity: newProductivity,
        dailyRent: newRent,
        costPerCubicMeter: newRent > 0 && newProductivity > 0 ? newRent / newProductivity : 0
      };
    }));
    toast.success("تم تطبيق جميع اقتراحات AI");
  }, []);

  // Calculate cost per cubic meter based on productivity and rent
  const calculateCostPerCubicMeter = useCallback((dailyProductivity: number, dailyRent: number): number => {
    if (dailyProductivity <= 0) return 0;
    return dailyRent / dailyProductivity;
  }, []);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.costPerCubicMeter, 0);
    const wasteAmount = subtotal * (wastePercentage / 100);
    const adminAmount = subtotal * (adminPercentage / 100);
    const grandTotal = subtotal + wasteAmount + adminAmount;
    
    return {
      subtotal,
      wasteAmount,
      adminAmount,
      grandTotal,
    };
  }, [items, wastePercentage, adminPercentage]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const data = items
      .filter(item => item.costPerCubicMeter > 0)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        fullName: item.name,
        value: item.costPerCubicMeter,
        percentage: (item.costPerCubicMeter / calculations.subtotal * 100).toFixed(1)
      }));
    
    // Add waste and admin
    if (calculations.wasteAmount > 0) {
      data.push({
        name: 'نسبة هالك',
        fullName: 'نسبة هالك',
        value: calculations.wasteAmount,
        percentage: (calculations.wasteAmount / calculations.grandTotal * 100).toFixed(1)
      });
    }
    if (calculations.adminAmount > 0) {
      data.push({
        name: 'مصاريف إدارية',
        fullName: 'مصاريف إدارية',
        value: calculations.adminAmount,
        percentage: (calculations.adminAmount / calculations.grandTotal * 100).toFixed(1)
      });
    }
    
    return data;
  }, [items, calculations]);

  const handleItemChange = useCallback((id: string, field: keyof ExcavationItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      if (field === 'dailyProductivity' || field === 'dailyRent') {
        updatedItem.costPerCubicMeter = calculateCostPerCubicMeter(
          field === 'dailyProductivity' ? Number(value) : updatedItem.dailyProductivity,
          field === 'dailyRent' ? Number(value) : updatedItem.dailyRent
        );
      }
      
      return updatedItem;
    }));
  }, [calculateCostPerCubicMeter]);

  const handleAddItem = useCallback(() => {
    if (!newItemName.trim()) {
      toast.error("يرجى إدخال اسم البند");
      return;
    }
    
    const newItem: ExcavationItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      dailyProductivity: 0,
      dailyRent: 0,
      costPerCubicMeter: 0,
      isEditable: true,
    };
    
    setItems(prev => [...prev, newItem]);
    setNewItemName("");
    toast.success("تم إضافة البند بنجاح");
  }, [newItemName]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success("تم حذف البند");
  }, []);

  // Template management - now saves AI results too
  const saveTemplate = useCallback(() => {
    if (!newTemplateName.trim()) {
      toast.error("يرجى إدخال اسم القالب");
      return;
    }

    const template: CostTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      items: items.map(({ id, ...rest }) => rest), // This now includes aiSuggestedProductivity and aiSuggestedRent
      wastePercentage,
      adminPercentage,
      createdAt: new Date().toISOString(),
    };

    const updatedTemplates = [...savedTemplates, template];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
    setNewTemplateName("");
    setShowTemplateInput(false);
    toast.success("تم حفظ القالب مع نتائج AI بنجاح");
  }, [newTemplateName, items, wastePercentage, adminPercentage, savedTemplates]);

  const loadTemplate = useCallback((templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (!template) return;

    setItems(template.items.map((item, index) => ({
      ...item,
      id: `item-${index}`,
    })));
    setWastePercentage(template.wastePercentage);
    setAdminPercentage(template.adminPercentage);
    toast.success("تم تحميل القالب بنجاح");
  }, [savedTemplates]);

  const deleteTemplate = useCallback((templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
    toast.success("تم حذف القالب");
  }, [savedTemplates]);

  // Export functions
  const exportToExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    
    // Items sheet
    const itemsData = items.map(item => ({
      'اعمال الحفر': item.name,
      'الانتاجية اليومية (م3)': item.dailyProductivity,
      'ايجار/يوم': item.dailyRent,
      'تكلفة المتر المكعب': item.costPerCubicMeter.toFixed(2),
    }));
    
    // Add summary rows
    itemsData.push(
      { 'اعمال الحفر': 'الإجمالي', 'الانتاجية اليومية (م3)': 0, 'ايجار/يوم': 0, 'تكلفة المتر المكعب': calculations.subtotal.toFixed(2) },
      { 'اعمال الحفر': `نسبة هالك (${wastePercentage}%)`, 'الانتاجية اليومية (م3)': 0, 'ايجار/يوم': 0, 'تكلفة المتر المكعب': calculations.wasteAmount.toFixed(2) },
      { 'اعمال الحفر': `مصاريف إدارية (${adminPercentage}%)`, 'الانتاجية اليومية (م3)': 0, 'ايجار/يوم': 0, 'تكلفة المتر المكعب': calculations.adminAmount.toFixed(2) },
      { 'اعمال الحفر': 'إجمال التكلفة', 'الانتاجية اليومية (م3)': 0, 'ايجار/يوم': 0, 'تكلفة المتر المكعب': calculations.grandTotal.toFixed(2) }
    );

    const ws = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'تحليل التكاليف');

    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    XLSX.writeFile(workbook, `تحليل_تكاليف_الحفر_${currentDate}.xlsx`);
    toast.success("تم تصدير Excel بنجاح");
  }, [items, calculations, wastePercentage, adminPercentage]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const currentDate = new Date().toLocaleDateString('ar-SA');

    // Header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Cost Analysis Report', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(currentDate, pageWidth / 2, 20, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);

    // Description
    let yPos = 35;
    doc.setFontSize(12);
    doc.text(`Item: ${itemDescription}`, 14, yPos);

    // Table
    yPos += 10;
    const tableData = items.map(item => [
      item.name,
      item.dailyProductivity.toString(),
      item.dailyRent.toString(),
      item.costPerCubicMeter.toFixed(2)
    ]);

    // Add summary rows
    tableData.push(
      ['Subtotal', '', '', calculations.subtotal.toFixed(2)],
      [`Waste (${wastePercentage}%)`, '', '', calculations.wasteAmount.toFixed(2)],
      [`Admin (${adminPercentage}%)`, '', '', calculations.adminAmount.toFixed(2)],
      ['Grand Total', '', '', calculations.grandTotal.toFixed(2)]
    );

    autoTable(doc, {
      startY: yPos,
      head: [['Work Item', 'Daily Productivity (m3)', 'Daily Rent', `Cost/m3 (${currency})`]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
      },
      didParseCell: (data) => {
        // Highlight summary rows
        if (data.row.index >= items.length) {
          data.cell.styles.fontStyle = 'bold';
          if (data.row.index === items.length + 3) {
            data.cell.styles.fillColor = [124, 58, 237];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    doc.save(`تحليل_تكاليف_الحفر_${currentDate.replace(/\//g, '-')}.pdf`);
    toast.success("تم تصدير PDF بنجاح");
  }, [items, calculations, wastePercentage, adminPercentage, currency, itemDescription]);

  const handleSave = useCallback(() => {
    onSave(calculations.grandTotal, items);
    toast.success("تم حفظ التحليل بنجاح");
    onClose();
  }, [calculations.grandTotal, items, onSave, onClose]);

  const formatNumber = (num: number) => num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="font-medium text-sm">{payload[0].payload.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {formatNumber(payload[0].value)} {currency} ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Calculator className="w-5 h-5 text-primary" />
            <span>تحليل تكاليف أعمال الحفر</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-right">{itemDescription}</p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Table - 2/3 width */}
            <div className="lg:col-span-2 space-y-4">
              {/* Template Management */}
              <Card className="border-dashed border-accent/50 bg-accent/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-accent-foreground" />
                      <h4 className="font-semibold text-sm">قوالب التحليل</h4>
                    </div>
                    <Badge variant="secondary" className="text-xs">{savedTemplates.length} قالب</Badge>
                  </div>

                  {savedTemplates.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <Select onValueChange={loadTemplate}>
                        <SelectTrigger className="w-48 h-8">
                          <SelectValue placeholder="تحميل قالب..." />
                        </SelectTrigger>
                        <SelectContent>
                          {savedTemplates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center justify-between gap-2">
                                <span>{template.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {savedTemplates.length > 0 && (
                        <Select onValueChange={deleteTemplate}>
                          <SelectTrigger className="w-32 h-8 border-destructive/50 text-destructive">
                            <SelectValue placeholder="حذف قالب" />
                          </SelectTrigger>
                          <SelectContent>
                            {savedTemplates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {showTemplateInput ? (
                    <div className="flex gap-2">
                      <Input
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="اسم القالب..."
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
                      />
                      <Button variant="default" size="sm" onClick={saveTemplate} className="h-8">
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowTemplateInput(false)} className="h-8">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowTemplateInput(true)} className="w-full gap-1">
                      <Plus className="w-3 h-3" />
                      حفظ كقالب جديد
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* AI Bulk Actions */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h4 className="font-semibold text-sm">تحليل AI السريع</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={analyzeAllWithAI}
                        disabled={isAnalyzingAll}
                        className="gap-1 h-8 text-xs bg-amber-50 hover:bg-amber-100 border-amber-300"
                      >
                        {isAnalyzingAll ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            جاري التحليل...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            تحليل جميع البنود
                          </>
                        )}
                      </Button>
                      {items.some(i => i.aiSuggestedProductivity || i.aiSuggestedRent) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={applyAllAISuggestions}
                          className="gap-1 h-8 text-xs"
                        >
                          <TrendingUp className="w-3 h-3" />
                          تطبيق جميع الاقتراحات
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Table */}
              <Card className="border-primary/20">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewItem}
                      className="gap-1 h-7 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة صف جديد
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHeaders(!editingHeaders)}
                      className="gap-1 h-7 text-xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      {editingHeaders ? "إنهاء تعديل الهيدر" : "تعديل الهيدر"}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary/10">
                          <TableHead className="w-[30px]"></TableHead>
                          <TableHead className="text-right font-bold text-primary w-[160px]">
                            {editingHeaders ? (
                              <Input
                                value={headers.workItem}
                                onChange={(e) => setHeaders(prev => ({ ...prev, workItem: e.target.value }))}
                                className="h-6 text-xs text-right"
                              />
                            ) : headers.workItem}
                          </TableHead>
                          <TableHead className="text-center font-bold text-primary w-[80px]">
                            {editingHeaders ? (
                              <Input
                                value={headers.productivity}
                                onChange={(e) => setHeaders(prev => ({ ...prev, productivity: e.target.value }))}
                                className="h-6 text-xs text-center"
                              />
                            ) : headers.productivity}
                          </TableHead>
                          <TableHead className="text-center font-bold text-primary w-[100px]">
                            {editingHeaders ? (
                              <Input
                                value={headers.aiProductivity}
                                onChange={(e) => setHeaders(prev => ({ ...prev, aiProductivity: e.target.value }))}
                                className="h-6 text-xs text-center"
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                {headers.aiProductivity}
                              </div>
                            )}
                          </TableHead>
                          <TableHead className="text-center font-bold text-primary w-[60px]">
                            {editingHeaders ? (
                              <Input
                                value={headers.dailyRent}
                                onChange={(e) => setHeaders(prev => ({ ...prev, dailyRent: e.target.value }))}
                                className="h-6 text-xs text-center"
                              />
                            ) : headers.dailyRent}
                          </TableHead>
                          <TableHead className="text-center font-bold text-primary w-[100px]">
                            {editingHeaders ? (
                              <Input
                                value={headers.aiRent}
                                onChange={(e) => setHeaders(prev => ({ ...prev, aiRent: e.target.value }))}
                                className="h-6 text-xs text-center"
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                {headers.aiRent}
                              </div>
                            )}
                          </TableHead>
                          <TableHead className="text-center font-bold text-primary w-[80px]">
                            {editingHeaders ? (
                              <Input
                                value={headers.costPerM3}
                                onChange={(e) => setHeaders(prev => ({ ...prev, costPerM3: e.target.value }))}
                                className="h-6 text-xs text-center"
                              />
                            ) : headers.costPerM3}
                          </TableHead>
                          <TableHead className="w-[80px]">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <TableBody>
                          <SortableContext
                            items={items.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {items.map((item) => (
                              <SortableRow
                                key={item.id}
                                item={item}
                                handleItemChange={handleItemChange}
                                handleRemoveItem={handleRemoveItem}
                                handleCopyItem={handleCopyItem}
                                analyzeWithAI={analyzeWithAI}
                                applyAISuggestion={applyAISuggestion}
                                calculateDifference={calculateDifference}
                                formatNumber={formatNumber}
                              />
                            ))}
                          </SortableContext>
                        </TableBody>
                      </DndContext>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Summary Section */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-4">
                  <Table>
                    <TableBody>
                      <TableRow className="border-b-2 border-primary/20">
                        <TableCell className="text-right font-bold text-primary">الإجمالي</TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell className="text-center">
                          <Badge className="px-3 py-1 bg-primary text-primary-foreground">
                            {formatNumber(calculations.subtotal)} {currency}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      
                      <TableRow>
                        <TableCell className="text-right font-medium">نسبة هالك</TableCell>
                        <TableCell colSpan={2} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              value={wastePercentage}
                              onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)}
                              className="w-16 h-7 text-center text-sm"
                              min="0"
                              max="100"
                            />
                            <span className="text-muted-foreground text-sm">%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatNumber(calculations.wasteAmount)} {currency}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      
                      <TableRow>
                        <TableCell className="text-right font-medium">مصاريف ادارية (تصاريح)</TableCell>
                        <TableCell colSpan={2} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              value={adminPercentage}
                              onChange={(e) => setAdminPercentage(parseFloat(e.target.value) || 0)}
                              className="w-16 h-7 text-center text-sm"
                              min="0"
                              max="100"
                            />
                            <span className="text-muted-foreground text-sm">%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatNumber(calculations.adminAmount)} {currency}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      
                      <TableRow className="bg-primary/10 border-t-2 border-primary">
                        <TableCell className="text-right font-bold text-lg text-primary">إجمال التكلفة</TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell className="text-center">
                          <Badge className="text-lg px-4 py-2 bg-green-600 text-white">
                            {formatNumber(calculations.grandTotal)} {currency}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Chart - 1/3 width */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <PieChartIcon className="w-4 h-4 text-primary" />
                    توزيع التكاليف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          formatter={(value) => <span className="text-xs">{value}</span>}
                          wrapperStyle={{ fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Export Buttons */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4 text-primary" />
                    تصدير التقرير
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={exportToExcel}
                    variant="outline"
                    className="w-full gap-2 justify-start"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    تصدير إلى Excel
                  </Button>
                  <Button
                    onClick={exportToPDF}
                    variant="outline"
                    className="w-full gap-2 justify-start"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    تصدير إلى PDF
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            إلغاء
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ التحليل
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
