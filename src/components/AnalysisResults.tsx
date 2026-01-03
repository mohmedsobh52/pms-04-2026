import { useState, useMemo, useCallback } from "react";
import { Download, FileJson, ChevronDown, ChevronUp, Package, Layers, DollarSign, BarChart3, CalendarDays, FileSpreadsheet, FileText, FileDown, Link2, Search, Filter, X, SortAsc, SortDesc, Calculator, Wand2, Clock, Trash2, RotateCcw, ArrowDownToLine, Settings, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DataCharts } from "./DataCharts";
import { ProjectTimeline } from "./ProjectTimeline";
import { CostAnalysis } from "./CostAnalysis";
import { ScheduleIntegration } from "./ScheduleIntegration";
import { KPIDashboard } from "./KPIDashboard";
import { MarketRateSuggestions } from "./MarketRateSuggestions";
import { useLanguage } from "@/hooks/useLanguage";
import { PDFCustomization, getSavedCompanyInfo, CompanyInfo } from "./PDFCustomization";
import { ItemCostEditor } from "./ItemCostEditor";
import { BulkApplyCostsDialog } from "./BulkApplyCostsDialog";
import { SaveProjectButton } from "./SaveProjectButton";
import { PriceComparisonReport } from "./PriceComparisonReport";
import { WBSTreeDiagram } from "./WBSTreeDiagram";
import { ComprehensivePDFReport } from "./ComprehensivePDFReport";
import { WBSFlowDiagram } from "./WBSFlowDiagram";
import { CompanyLogoUpload, getStoredLogo } from "./CompanyLogoUpload";
import { useDynamicCostCalculator, CostInputs, defaultCostInputs } from "@/hooks/useDynamicCostCalculator";
import { useItemCodes } from "@/hooks/useItemCodes";
import { EditableItemCode } from "./EditableItemCode";
import { EditableAIRate } from "./EditableAIRate";
import { EditableUnitPrice } from "./EditableUnitPrice";
import { ItemCodeSettings } from "./ItemCodeSettings";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Clean text from corrupted characters
function cleanText(text: string): string {
  if (!text) return '';
  // Remove corrupted/mojibake characters
  return text
    .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[þÿýüûúùøö÷ôõóòñðïîíìëêéèçæåäãâáàßÞÝÜÛÚÙØ×ÖÕÔÓÒÑÐÏÎÍÌËÊÉÈÇÆÅÄÃÂÁÀ]+/g, '')
    .replace(/p[*ˆ˜°´¸¹²³µ¶·ºª¡¿€£¥¢¤®©™±×÷«»‹›""''‚„†‡…‰]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  notes?: string;
}

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

interface AnalysisData {
  analysis_type: string;
  items?: BOQItem[];
  wbs?: WBSItem[];
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
}

interface AnalysisResultsProps {
  data: AnalysisData;
  wbsData?: AnalysisData;
  onApplyRate?: (itemNumber: string, newRate: number) => void;
  fileName?: string;
}

// Cost range definitions
const getCostRange = (price: number): string => {
  if (price < 10000) return "low";
  if (price <= 50000) return "medium";
  return "high";
};

export function AnalysisResults({ data, wbsData, onApplyRate, fileName }: AnalysisResultsProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"items" | "wbs" | "costs" | "summary" | "charts" | "timeline" | "integration">("items");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(getSavedCompanyInfo());
  
  // Dynamic cost calculator hook
  const {
    getItemCostData,
    getItemCalculatedCosts,
    setItemCostData,
    getAllCalculatedCosts,
    getTotalProjectCost,
    exportCostData,
    getItemsWithCosts,
    savedTemplate,
    savedTemplates,
    saveAsTemplate,
    applyTemplateToItem,
    applyTemplateToMultipleItems,
    deleteTemplate,
    exportTemplates,
    importTemplates,
    setMultipleAISuggestedRates,
    applyAIRatesToCalculatedPrice,
    updateAIRate,
    lastSavedAt,
    itemCosts,
    clearAllCosts,
  } = useDynamicCostCalculator();
  
  // Item codes hook with format options
  const { 
    getItemCode, 
    setItemCode, 
    codeFormat, 
    customConfig, 
    updateCodeFormat, 
    updateCustomConfig, 
    getAvailableFormats,
    exportItemCodesToExcel,
  } = useItemCodes();
  
  // State for clear confirmation dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  
  // State for bulk apply dialog
  const [bulkApplyOpen, setBulkApplyOpen] = useState(false);
  
  // State for tracking recently applied AI rates (for visual confirmation)
  const [recentlyAppliedItems, setRecentlyAppliedItems] = useState<Set<string>>(new Set());
  
  // State for manually edited unit prices and totals
  const [editedPrices, setEditedPrices] = useState<Record<string, { unit_price?: number; total_price?: number }>>({});
  
  // Handler for editing unit price
  const handleEditUnitPrice = useCallback((itemNumber: string, newPrice: number) => {
    const item = (data.items || []).find(i => i.item_number === itemNumber);
    if (item) {
      setEditedPrices(prev => ({
        ...prev,
        [itemNumber]: {
          ...prev[itemNumber],
          unit_price: newPrice,
          total_price: newPrice * item.quantity
        }
      }));
      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث سعر الوحدة" : "Unit price updated",
      });
    }
  }, [data.items, isArabic, toast]);
  
  // Handler for editing total price
  const handleEditTotalPrice = useCallback((itemNumber: string, newTotal: number) => {
    const item = (data.items || []).find(i => i.item_number === itemNumber);
    if (item && item.quantity > 0) {
      setEditedPrices(prev => ({
        ...prev,
        [itemNumber]: {
          ...prev[itemNumber],
          total_price: newTotal,
          unit_price: newTotal / item.quantity
        }
      }));
      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث السعر الإجمالي" : "Total price updated",
      });
    }
  }, [data.items, isArabic, toast]);
  
  // Get effective price for an item (edited > original)
  const getEffectivePrice = useCallback((item: BOQItem) => {
    const edited = editedPrices[item.item_number];
    return {
      unit_price: edited?.unit_price ?? item.unit_price ?? 0,
      total_price: edited?.total_price ?? item.total_price ?? (item.unit_price ? item.unit_price * item.quantity : 0)
    };
  }, [editedPrices]);

  // Revert to original prices handler
  const handleRevertToOriginal = useCallback(() => {
    clearAllCosts();
    setShowRevertConfirm(false);
    setRecentlyAppliedItems(new Set());
    toast({
      title: isArabic ? "تم الاسترجاع" : "Reverted to Original",
      description: isArabic ? "تم استعادة الأسعار الأصلية ومسح جميع التعديلات" : "Original BOQ prices restored, all AI rates and calculations cleared",
    });
  }, [clearAllCosts, isArabic, toast]);

  // Handle AI rates from MarketRateSuggestions - stores in aiSuggestedRate field
  const handleApplyAIRates = useCallback((rates: Array<{ itemId: string; rate: number }>) => {
    setMultipleAISuggestedRates(rates);
    
    // Track recently applied items for visual confirmation
    const appliedItemIds = new Set(rates.map(r => r.itemId));
    setRecentlyAppliedItems(appliedItemIds);
    
    // Clear the visual indicator after 3 seconds
    setTimeout(() => {
      setRecentlyAppliedItems(new Set());
    }, 3000);
    
    toast({
      title: isArabic ? "تم تطبيق الأسعار" : "AI Rates Applied",
      description: isArabic 
        ? `تم تطبيق ${rates.length} سعر من AI` 
        : `Applied ${rates.length} AI suggested rates`,
    });
  }, [setMultipleAISuggestedRates, isArabic, toast]);

  // Apply AI rates directly to calculatedUnitPrice
  const handleApplyAIRatesToCalcPrice = useCallback((rates: Array<{ itemId: string; rate: number }>) => {
    applyAIRatesToCalculatedPrice(rates);
    toast({
      title: isArabic ? "تم تطبيق أسعار AI" : "AI Rates Applied to Calc. Price",
      description: isArabic 
        ? `تم تحديث ${rates.length} بند بأسعار السوق` 
        : `Updated ${rates.length} items with market rates`,
    });
  }, [applyAIRatesToCalculatedPrice, isArabic, toast]);

  // Template handlers
  const handleSaveAsTemplate = useCallback((costs: CostInputs, name: string) => {
    const template = saveAsTemplate(costs, name);
    toast({
      title: isArabic ? "تم حفظ القالب بنجاح" : "Template Saved Successfully",
      description: isArabic 
        ? `تم حفظ "${template.name}" - اضغط للتطبيق على البنود` 
        : `"${template.name}" saved - Click to apply to items`,
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setBulkApplyOpen(true)}
          className="gap-1"
        >
          <Layers className="w-3 h-3" />
          {isArabic ? "تطبيق" : "Apply"}
        </Button>
      ),
    });
  }, [saveAsTemplate, isArabic, toast]);

  const handleApplyTemplate = useCallback((templateId?: string): CostInputs | null => {
    const template = templateId 
      ? savedTemplates.find(t => t.id === templateId)
      : savedTemplate;
    if (template) {
      return { ...template.costs };
    }
    return null;
  }, [savedTemplate, savedTemplates]);

  const handleDeleteTemplate = useCallback((templateId: string): boolean => {
    return deleteTemplate(templateId);
  }, [deleteTemplate]);

  // Import cost analysis from CostAnalysisPage
  const COST_ANALYSIS_EXPORT_KEY = 'cost_analysis_export';
  
  const importFromCostAnalysis = useCallback(() => {
    try {
      const stored = localStorage.getItem(COST_ANALYSIS_EXPORT_KEY);
      if (!stored) {
        toast({
          title: isArabic ? "لا توجد بيانات" : "No Data",
          description: isArabic 
            ? "لا توجد بيانات للاستيراد. يرجى تصدير التحليل من شاشة تحليل التكاليف أولاً" 
            : "No data to import. Please export from Cost Analysis page first",
          variant: "destructive",
        });
        return;
      }
      
      const exportedData = JSON.parse(stored);
      if (!exportedData.items || exportedData.items.length === 0) {
        toast({
          title: isArabic ? "لا توجد بنود" : "No Items",
          description: isArabic ? "لا توجد بنود في البيانات المصدرة" : "No items in exported data",
          variant: "destructive",
        });
        return;
      }
      
      // Apply the costs to matching items or show summary
      const matchedItems: string[] = [];
      exportedData.items.forEach((exportedItem: any) => {
        const matchingItem = (data.items || []).find(item => 
          item.description?.toLowerCase().includes(exportedItem.description?.toLowerCase()) ||
          exportedItem.description?.toLowerCase().includes(item.description?.toLowerCase())
        );
        
        if (matchingItem) {
          matchedItems.push(matchingItem.item_number);
          // Update the item cost data if applicable
          if (exportedItem.unit_price) {
            setItemCostData(matchingItem.item_number, {
              calculatedUnitPrice: exportedItem.unit_price,
            } as any);
          }
        }
      });
      
      toast({
        title: isArabic ? "تم الاستيراد" : "Imported Successfully",
        description: isArabic 
          ? `تم استيراد ${exportedData.items.length} بند من تحليل التكاليف${matchedItems.length > 0 ? ` (${matchedItems.length} مطابق)` : ''}`
          : `Imported ${exportedData.items.length} items from Cost Analysis${matchedItems.length > 0 ? ` (${matchedItems.length} matched)` : ''}`,
      });
    } catch (error) {
      console.error("Import from cost analysis error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل استيراد البيانات" : "Failed to import data",
        variant: "destructive",
      });
    }
  }, [data.items, setItemCostData, isArabic, toast]);

  // Export current items to shared storage for CostAnalysisPage
  const SHARED_ITEMS_KEY = 'shared_boq_items';
  
  const exportToCostAnalysis = useCallback(() => {
    try {
      const exportData = {
        items: (data.items || []).map(item => ({
          item_number: item.item_number,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          category: item.category,
        })),
        exported_at: new Date().toISOString(),
      };
      
      localStorage.setItem(SHARED_ITEMS_KEY, JSON.stringify(exportData));
      toast({
        title: isArabic ? "تم التصدير" : "Exported Successfully",
        description: isArabic 
          ? `تم تصدير ${(data.items || []).length} بند. يمكنك الآن استيرادها في شاشة تحليل التكاليف`
          : `Exported ${(data.items || []).length} items. You can now import them in Cost Analysis page`,
      });
    } catch (error) {
      console.error("Export to cost analysis error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تصدير البيانات" : "Failed to export data",
        variant: "destructive",
      });
    }
  }, [data.items, isArabic, toast]);

  // Get available items for copying costs
  const availableItemsForCopy = useMemo(() => {
    const itemsWithCosts = getItemsWithCosts();
    return itemsWithCosts.map(({ itemId, calculated }) => {
      const originalItem = (data.items || []).find(i => i.item_number === itemId);
      return {
        itemId,
        description: originalItem?.description || itemId,
        calculatedUnitPrice: calculated.calculatedUnitPrice,
      };
    });
  }, [getItemsWithCosts, data.items]);

  // Handle copying costs from another item
  const handleCopyFromItem = useCallback((sourceItemId: string): CostInputs | null => {
    const sourceData = getItemCostData(sourceItemId);
    if (sourceData) {
      return {
        generalLabor: sourceData.generalLabor,
        equipmentOperator: sourceData.equipmentOperator,
        overhead: sourceData.overhead,
        admin: sourceData.admin,
        insurance: sourceData.insurance,
        contingency: sourceData.contingency,
        profitMargin: sourceData.profitMargin,
        materials: sourceData.materials,
        equipment: sourceData.equipment,
        subcontractor: sourceData.subcontractor,
      };
    }
    return null;
  }, [getItemCostData]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [costRangeFilter, setCostRangeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  // Get unique units and categories for filters
  const filterOptions = useMemo(() => {
    const items = data.items || [];
    const units = [...new Set(items.map(item => item.unit).filter(Boolean))];
    const categories = [...new Set(items.map(item => item.category || "غير مصنف"))];
    return { units, categories };
  }, [data.items]);

  // Filter and sort items - also filter out items without item_number
  const filteredItems = useMemo(() => {
    // Items should already be normalized, but double-check item_number exists
    let items = (data.items || []).filter(item => !!item.item_number);
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.item_number?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      );
    }
    
    // Unit filter
    if (unitFilter !== "all") {
      items = items.filter(item => item.unit === unitFilter);
    }
    
    // Category filter
    if (categoryFilter !== "all") {
      items = items.filter(item => (item.category || "غير مصنف") === categoryFilter);
    }
    
    // Cost range filter
    if (costRangeFilter !== "all") {
      items = items.filter(item => {
        const range = getCostRange(item.total_price || 0);
        return range === costRangeFilter;
      });
    }
    
    // Sorting
    if (sortField) {
      items = [...items].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortField) {
          case "item_number":
            aVal = a.item_number || "";
            bVal = b.item_number || "";
            break;
          case "quantity":
            aVal = a.quantity || 0;
            bVal = b.quantity || 0;
            break;
          case "unit_price":
            aVal = a.unit_price || 0;
            bVal = b.unit_price || 0;
            break;
          case "total_price":
            aVal = a.total_price || 0;
            bVal = b.total_price || 0;
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === "string") {
          return sortDirection === "asc" 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    
    return items;
  }, [data.items, searchQuery, unitFilter, categoryFilter, costRangeFilter, sortField, sortDirection]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setUnitFilter("all");
    setCategoryFilter("all");
    setCostRangeFilter("all");
    setSortField("");
  }, []);

  const hasActiveFilters = searchQuery || unitFilter !== "all" || categoryFilter !== "all" || costRangeFilter !== "all";

  const groupedItems = data.items?.reduce((acc, item) => {
    const category = item.category || "غير مصنف";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, BOQItem[]>) || {};

  // Calculate KPI data from analysis
  const kpiData = useMemo(() => {
    const items = data.items || [];
    const totalValue = data.summary?.total_value || items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const highRiskItems = items.filter(item => 
      item.notes?.toLowerCase().includes('risk') || 
      item.notes?.toLowerCase().includes('warning') ||
      (item.total_price && item.total_price > totalValue * 0.05)
    );
    const avgUnitPrice = items.length > 0 
      ? items.reduce((sum, item) => sum + (item.unit_price || 0), 0) / items.length 
      : 0;

    return {
      totalValue,
      itemCount: items.length,
      highRiskCount: highRiskItems.length,
      variancePercentage: 0,
      completedItems: items.filter(item => item.total_price && item.total_price > 0).length,
      pendingItems: items.filter(item => !item.total_price || item.total_price === 0).length,
      avgUnitPrice,
      currency: data.summary?.currency || "SAR"
    };
  }, [data]);


  // Handle saving item costs
  const handleSaveItemCost = useCallback((itemId: string, costs: CostInputs) => {
    const item = data.items?.find(i => i.item_number === itemId);
    setItemCostData(itemId, costs, item?.quantity || 1);
  }, [data.items, setItemCostData]);

  // Get calculated unit price for an item
  const getItemCalculatedPrice = useCallback((itemId: string) => {
    const costs = getItemCalculatedCosts(itemId);
    return costs.calculatedUnitPrice;
  }, [getItemCalculatedCosts]);

  const exportToCSV = () => {
    if (!data.items) return;

    const headers = ["رقم البند", "الوصف", "الوحدة", "الكمية", "سعر الوحدة", "السعر المحسوب", "الإجمالي", "الفئة", "ملاحظات"];
    const rows = data.items.map(item => {
      const calculatedPrice = getItemCalculatedPrice(item.item_number);
      const effectivePrice = calculatedPrice > 0 ? calculatedPrice : (item.unit_price || 0);
      return [
        item.item_number,
        item.description,
        item.unit,
        item.quantity.toString(),
        item.unit_price?.toString() || "",
        calculatedPrice > 0 ? calculatedPrice.toString() : "",
        (effectivePrice * item.quantity).toString(),
        item.category || "",
        item.notes || ""
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boq_analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const exportData = {
      analysis_type: data.analysis_type,
      items: data.items || [],
      wbs: wbsData?.wbs || [],
      summary: data.summary || {},
      exported_at: new Date().toISOString(),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boq_analysis.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (!data.items) return;

    // Create BOQ items sheet with calculated prices
    const itemsData = data.items.map(item => {
      const calculatedPrice = getItemCalculatedPrice(item.item_number);
      const effectivePrice = calculatedPrice > 0 ? calculatedPrice : (item.unit_price || 0);
      const costData = getItemCostData(item.item_number);
      const calcCosts = getItemCalculatedCosts(item.item_number);
      
      return {
        "رقم البند": item.item_number,
        "الوصف": item.description,
        "الوحدة": item.unit,
        "الكمية": item.quantity,
        "تكلفة العمالة": calcCosts.totalLabor,
        "التكاليف غير المباشرة": calcCosts.totalIndirect,
        "هامش الربح %": costData.profitMargin,
        "قيمة الربح": calcCosts.profitAmount,
        "سعر الوحدة الأصلي": item.unit_price || 0,
        "سعر الوحدة المحسوب": calculatedPrice > 0 ? calculatedPrice : (item.unit_price || 0),
        "الإجمالي": effectivePrice * item.quantity,
        "الفئة": item.category || "غير مصنف",
        "ملاحظات": item.notes || ""
      };
    });

    // Create summary sheet
    const summaryData = [
      { "البيان": "إجمالي العناصر", "القيمة": data.summary?.total_items || data.items.length },
      { "البيان": "إجمالي القيمة", "القيمة": data.summary?.total_value || 0 },
      { "البيان": "العملة", "القيمة": data.summary?.currency || "ر.س" },
      { "البيان": "عدد الفئات", "القيمة": data.summary?.categories?.length || 0 },
    ];

    // Create WBS sheet if available
    const wbsSheetData = wbsData?.wbs?.map(item => ({
      "الكود": item.code,
      "العنوان": item.title,
      "المستوى": item.level,
      "الكود الأب": item.parent_code || "-",
      "العناصر": item.items.join(", ") || "-"
    })) || [];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets
    const ws1 = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, ws1, "جدول الكميات");
    
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "الملخص");
    
    if (wbsSheetData.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(wbsSheetData);
      XLSX.utils.book_append_sheet(wb, ws3, "هيكل تجزئة العمل");
    }

    // Download
    XLSX.writeFile(wb, "boq_analysis.xlsx");
  };

  const exportToWord = () => {
    if (!data.items) return;

    // Create HTML content for Word
    let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #333; padding: 8px; text-align: right; }
          th { background-color: #f0f0f0; font-weight: bold; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .summary-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .total-row { background-color: #e8f4e8; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>تقرير تحليل جدول الكميات (BOQ)</h1>
        <p>تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}</p>
        
        <div class="summary-box">
          <h2>ملخص المشروع</h2>
          <p><strong>إجمالي العناصر:</strong> ${data.summary?.total_items || data.items.length}</p>
          <p><strong>إجمالي القيمة:</strong> ${(data.summary?.total_value || 0).toLocaleString()} ${data.summary?.currency || 'ر.س'}</p>
          <p><strong>الفئات:</strong> ${data.summary?.categories?.join('، ') || 'غير محدد'}</p>
        </div>

        <h2>جدول الكميات</h2>
        <table>
          <tr>
            <th>رقم البند</th>
            <th>الوصف</th>
            <th>الوحدة</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
            <th>الفئة</th>
          </tr>
          ${data.items.map(item => `
            <tr>
              <td>${item.item_number}</td>
              <td>${item.description}</td>
              <td>${item.unit}</td>
              <td>${item.quantity}</td>
              <td>${item.unit_price?.toLocaleString() || '-'}</td>
              <td>${item.total_price?.toLocaleString() || '-'}</td>
              <td>${item.category || 'غير مصنف'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5">الإجمالي الكلي</td>
            <td colspan="2">${(data.summary?.total_value || 0).toLocaleString()} ${data.summary?.currency || 'ر.س'}</td>
          </tr>
        </table>
    `;

    // Add WBS if available
    if (wbsData?.wbs && wbsData.wbs.length > 0) {
      htmlContent += `
        <h2>هيكل تجزئة العمل (WBS)</h2>
        <table>
          <tr>
            <th>الكود</th>
            <th>العنوان</th>
            <th>المستوى</th>
          </tr>
          ${wbsData.wbs.map(item => `
            <tr>
              <td>${item.code}</td>
              <td style="padding-right: ${item.level * 20}px">${item.title}</td>
              <td>${item.level}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    htmlContent += `</body></html>`;

    // Download as .doc
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boq_report.doc';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!data.items) return;
    
    // Calculate totals with costs
    const itemsWithCosts = data.items.map(item => {
      const costData = getItemCostData(item.item_number);
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const calculatedPrice = calcCosts.calculatedUnitPrice;
      const effectivePrice = calculatedPrice > 0 ? calculatedPrice : (item.unit_price || 0);
      return {
        ...item,
        laborCost: calcCosts.totalLabor,
        indirectCost: calcCosts.totalIndirect,
        profitMargin: costData.profitMargin,
        aiRate: calcCosts.aiSuggestedRate || 0,
        calculatedPrice,
        effectivePrice,
        effectiveTotal: effectivePrice * item.quantity,
        variance: item.unit_price ? ((effectivePrice - item.unit_price) / item.unit_price * 100) : 0,
      };
    });
    
    const totalOriginal = data.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const totalCalculated = itemsWithCosts.reduce((sum, item) => sum + item.effectiveTotal, 0);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Use helvetica font (built-in, supports basic characters)
    doc.setFont("helvetica");
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Helper function to sanitize text for PDF (convert Arabic to readable form)
    const sanitizeText = (text: string | undefined | null): string => {
      if (!text) return '-';
      // Remove or replace problematic Unicode characters
      // Keep ASCII and common punctuation, replace Arabic with transliteration or clean version
      const cleaned = text
        .replace(/[\u0600-\u06FF]/g, '') // Remove Arabic characters (jsPDF doesn't support them natively)
        .replace(/[\u0000-\u001F]/g, '') // Remove control characters
        .trim();
      // If text becomes empty after removing Arabic, return original with note
      if (!cleaned && text.trim()) {
        // Return a simplified version - just keep the basic content
        return text.replace(/[^\x20-\x7E\d.,\-+×%²³]/g, ' ').replace(/\s+/g, ' ').trim() || text.substring(0, 50);
      }
      return cleaned || '-';
    };

    // Get company logo from localStorage
    const storedLogo = getStoredLogo();
    
    // Header with gradient-like background
    doc.setFillColor(59, 130, 246); // Primary blue
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Add company logo if available
    if (storedLogo) {
      try {
        doc.addImage(storedLogo, 'PNG', pageWidth - 40, 5, 30, 30);
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
        // Fallback: draw logo circle
        doc.setFillColor(255, 255, 255);
        doc.circle(pageWidth - 25, 22, 12, 'F');
        doc.setFillColor(59, 130, 246);
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.text("BOQ", pageWidth - 25, 24, { align: 'center' });
      }
    } else {
      // Logo circle fallback
      doc.setFillColor(255, 255, 255);
      doc.circle(pageWidth - 25, 22, 12, 'F');
      doc.setFillColor(59, 130, 246);
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("BOQ", pageWidth - 25, 24, { align: 'center' });
    }

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BOQ Analysis Report", margin, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Bill of Quantities - Professional Report", margin, 30);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, margin, 38);

    // Summary section
    let yPos = 55;
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Project Summary", margin, yPos);
    
    yPos += 8;
    
    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxHeight = 25;
    
    // Box 1: Total Items
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, yPos, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Total Items", margin + 5, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.setFont("helvetica", "bold");
    doc.text(String(data.summary?.total_items || data.items.length), margin + 5, yPos + 20);
    
    // Box 2: Total Value
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Total Value", margin + boxWidth + 10, yPos + 8);
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.setFont("helvetica", "bold");
    const totalValue = totalCalculated > 0 ? totalCalculated : (data.summary?.total_value || totalOriginal);
    doc.text(`${totalValue.toLocaleString()} SAR`, margin + boxWidth + 10, yPos + 20);
    
    // Box 3: Categories
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin + (boxWidth + 5) * 2, yPos, boxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Categories", margin + (boxWidth + 5) * 2 + 5, yPos + 8);
    doc.setFontSize(18);
    doc.setTextColor(202, 138, 4);
    doc.setFont("helvetica", "bold");
    doc.text(String(data.summary?.categories?.length || 0), margin + (boxWidth + 5) * 2 + 5, yPos + 20);

    yPos += boxHeight + 15;

    // BOQ Items Table
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Bill of Quantities", margin, yPos);
    
    yPos += 5;

    // Table data with sanitized text and proper price handling
    const tableData = itemsWithCosts.map((item, index) => {
      const description = sanitizeText(item.description);
      const truncatedDesc = description.length > 45 ? description.substring(0, 45) + '...' : description;
      const unitPrice = item.effectivePrice || item.unit_price || 0;
      const totalPrice = item.effectiveTotal || item.total_price || (unitPrice * item.quantity);
      
      return [
        String(index + 1),
        item.item_number || '-',
        truncatedDesc,
        sanitizeText(item.unit),
        String(item.quantity || 0),
        unitPrice > 0 ? unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
        totalPrice > 0 ? totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Item No.', 'Description', 'Unit', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'left', cellWidth: 55 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        // Footer on each page
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
        doc.text('BOQ Analyzer - Professional Report', margin, pageHeight - 6);
        doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 6, { align: 'right' });
      },
    });

    // Add totals row after table
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100;
    if (finalY < pageHeight - 40) {
      doc.setFillColor(59, 130, 246);
      doc.rect(margin, finalY + 2, pageWidth - margin * 2, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Grand Total:", margin + 5, finalY + 8);
      doc.text(`${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR`, pageWidth - margin - 5, finalY + 8, { align: 'right' });
    }

    // Add WBS section if available
    if (wbsData?.wbs && wbsData.wbs.length > 0) {
      doc.addPage();
      
      // WBS Header
      doc.setFillColor(124, 58, 237); // Purple
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Work Breakdown Structure (WBS)", margin, 18);
      
      const wbsData_ = wbsData.wbs.map(item => [
        item.code,
        '  '.repeat(item.level - 1) + sanitizeText(item.title),
        String(item.level),
        item.parent_code || '-',
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Code', 'Title', 'Level', 'Parent']],
        body: wbsData_,
        theme: 'striped',
        headStyles: {
          fillColor: [124, 58, 237],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 100 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      });
    }

    // Save PDF
    doc.save('boq_professional_report.pdf');
    
    toast({
      title: isArabic ? "تم إنشاء التقرير" : "Report Generated",
      description: isArabic ? "تم تحميل التقرير بنجاح" : "PDF report downloaded successfully",
    });
  };

  const tabs = [
    { id: "items", label: "Items", icon: <Package className="w-4 h-4" /> },
    { id: "wbs", label: "WBS", icon: <Layers className="w-4 h-4" /> },
    { id: "costs", label: "Cost", icon: <DollarSign className="w-4 h-4" /> },
    { id: "summary", label: "Brief", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "charts", label: "Charts", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "timeline", label: "Time Schedule", icon: <CalendarDays className="w-4 h-4" /> },
    { id: "integration", label: "Schedule Integration", icon: <Link2 className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      {/* KPI Dashboard at the top */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <KPIDashboard 
          data={kpiData} 
          title="Project KPIs / مؤشرات المشروع" 
        />
      </div>
      
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Last Saved Indicator */}
            {lastSavedAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <Clock className="w-3 h-3" />
                <span>{isArabic ? 'آخر حفظ:' : 'Auto-saved:'}</span>
                <span className="font-medium">{lastSavedAt.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Primary Actions Group */}
            <SaveProjectButton
              items={data.items || []}
              wbsData={wbsData}
              summary={data.summary}
              getItemCostData={getItemCostData}
              getItemCalculatedCosts={getItemCalculatedCosts}
              fileName={fileName}
            />
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="w-4 h-4" />
                  {isArabic ? "تصدير" : "Export"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={exportToPDF} className="gap-2">
                  <FileDown className="w-4 h-4 text-primary" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToWord} className="gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Word
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToJSON} className="gap-2">
                  <FileJson className="w-4 h-4" />
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                  <Download className="w-4 h-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <div className="p-0">
                    <ComprehensivePDFReport
                      projectName={fileName || "المشروع"}
                      boqItems={data.items || []}
                      timelineItems={wbsData?.wbs?.map((item, idx) => ({
                        code: item.code,
                        title: item.title,
                        level: item.level,
                        startDay: idx * 7,
                        duration: 14 + (item.items?.length || 0) * 2,
                        progress: 0,
                        isCritical: idx < 3,
                      })) || []}
                      currency={data.summary?.currency || "SAR"}
                      analysisData={data}
                    />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  {isArabic ? "أدوات" : "Tools"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <div className="p-0">
                    <MarketRateSuggestions 
                      items={data.items || []} 
                      onApplyRate={onApplyRate} 
                      onApplyAIRates={handleApplyAIRates}
                      onApplyAIRatesToCalcPrice={handleApplyAIRatesToCalcPrice}
                    />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <div className="p-0">
                    <BulkApplyCostsDialog
                      items={data.items || []}
                      savedTemplate={savedTemplate}
                      savedTemplates={savedTemplates}
                      onApplyToItems={applyTemplateToMultipleItems}
                      onDeleteTemplate={handleDeleteTemplate}
                      onExportTemplates={exportTemplates}
                      onImportTemplates={importTemplates}
                      currency={data.summary?.currency || "SAR"}
                      externalOpen={bulkApplyOpen}
                      onExternalOpenChange={setBulkApplyOpen}
                    />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToCostAnalysis} className="gap-2 text-blue-600">
                  <ArrowDownToLine className="w-4 h-4" />
                  {isArabic ? "تصدير لتحليل التكاليف" : "Export to Cost Analysis"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={importFromCostAnalysis} className="gap-2 text-green-600">
                  <Download className="w-4 h-4" />
                  {isArabic ? "استيراد من تحليل التكاليف" : "Import from Cost Analysis"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <div className="p-0">
                    <PDFCustomization companyInfo={companyInfo} onSave={setCompanyInfo} />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <div className="p-0">
                    <ItemCodeSettings
                      codeFormat={codeFormat}
                      customConfig={customConfig}
                      onUpdateFormat={updateCodeFormat}
                      onUpdateCustomConfig={updateCustomConfig}
                      availableFormats={getAvailableFormats()}
                      onExportToExcel={() => exportItemCodesToExcel(data.items || [])}
                      itemCount={data.items?.length || 0}
                    />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Compare Button */}
            <PriceComparisonReport
              items={data.items || []}
              getItemCostData={getItemCostData}
              getItemCalculatedCosts={getItemCalculatedCosts}
              currency={data.summary?.currency || "SAR"}
            />

            {/* Danger Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground hover:text-destructive"
                  disabled={Object.keys(itemCosts).length === 0}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setShowClearConfirm(true)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  {isArabic ? "مسح التكاليف" : "Clear Costs"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowRevertConfirm(true)}
                  className="gap-2 text-warning focus:text-warning"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isArabic ? "استرجاع الأصلي" : "Revert to Original"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Confirmation Dialogs */}
            {showClearConfirm && (
              <div className="flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded-lg border border-destructive/20">
                <span className="text-xs text-destructive">{isArabic ? "تأكيد المسح؟" : "Confirm clear?"}</span>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => {
                    clearAllCosts();
                    setShowClearConfirm(false);
                    toast({
                      title: isArabic ? "تم مسح جميع التكاليف" : "All Costs Cleared",
                      description: isArabic ? "تم إعادة تعيين جميع البنود" : "All item costs have been reset",
                    });
                  }}
                  className="h-7 px-2"
                >
                  {isArabic ? "نعم" : "Yes"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowClearConfirm(false)}
                  className="h-7 px-2"
                >
                  {isArabic ? "لا" : "No"}
                </Button>
              </div>
            )}
            {showRevertConfirm && (
              <div className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-lg border border-warning/20">
                <span className="text-xs text-warning">{isArabic ? "استرجاع الأصلي؟" : "Revert all?"}</span>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleRevertToOriginal}
                  className="h-7 px-2 bg-warning hover:bg-warning/90"
                >
                  {isArabic ? "نعم" : "Yes"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowRevertConfirm(false)}
                  className="h-7 px-2"
                >
                  {isArabic ? "لا" : "No"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {activeTab === "items" && (
          <div className="space-y-4">
            {/* Search and Filter Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={isArabic ? "بحث بالرقم أو الوصف..." : "Search by code or description..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Toggle */}
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  {isArabic ? "تصفية" : "Filter"}
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">!</Badge>
                  )}
                </Button>

                {/* Sort Controls */}
                <div className="flex items-center gap-1">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder={isArabic ? "ترتيب" : "Sort by"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="item_number">{isArabic ? "رقم البند" : "Item No."}</SelectItem>
                      <SelectItem value="quantity">{isArabic ? "الكمية" : "Quantity"}</SelectItem>
                      <SelectItem value="unit_price">{isArabic ? "سعر الوحدة" : "Unit Price"}</SelectItem>
                      <SelectItem value="total_price">{isArabic ? "الإجمالي" : "Total"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                    disabled={!sortField}
                  >
                    {sortDirection === "asc" ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Clear All */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    {isArabic ? "مسح" : "Clear"}
                  </Button>
                )}
              </div>

              {/* Filter Dropdowns */}
              {showFilters && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg animate-fade-in">
                  {/* Unit Filter */}
                  <Select value={unitFilter} onValueChange={setUnitFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder={isArabic ? "الوحدة" : "Unit"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">{isArabic ? "كل الوحدات" : "All Units"}</SelectItem>
                      {filterOptions.units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={isArabic ? "الفئة" : "Category"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">{isArabic ? "كل الفئات" : "All Categories"}</SelectItem>
                      {filterOptions.categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Cost Range Filter */}
                  <Select value={costRangeFilter} onValueChange={setCostRangeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={isArabic ? "نطاق التكلفة" : "Cost Range"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">{isArabic ? "كل الأسعار" : "All Prices"}</SelectItem>
                      <SelectItem value="low">
                        {isArabic ? "منخفض (<10K)" : "Low (<10K SAR)"}
                      </SelectItem>
                      <SelectItem value="medium">
                        {isArabic ? "متوسط (10K-50K)" : "Medium (10K-50K)"}
                      </SelectItem>
                      <SelectItem value="high">
                        {isArabic ? "عالي (>50K)" : "High (>50K SAR)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Items Found Counter */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {filteredItems.length} {isArabic ? "عنصر" : "items"} 
                  {hasActiveFilters && ` (${isArabic ? "من" : "of"} ${data.items?.length || 0})`}
                </span>
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-1">
                    {searchQuery && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        {isArabic ? "بحث" : "Search"}: {searchQuery}
                      </Badge>
                    )}
                    {unitFilter !== "all" && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        {isArabic ? "الوحدة" : "Unit"}: {unitFilter}
                      </Badge>
                    )}
                    {categoryFilter !== "all" && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        {isArabic ? "الفئة" : "Category"}: {categoryFilter}
                      </Badge>
                    )}
                    {costRangeFilter !== "all" && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        {isArabic ? "التكلفة" : "Cost"}: {costRangeFilter}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Export Filtered Results Button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const headers = ["Item #", "Item Code", "Description", "Unit", "Quantity", "Unit Price (SAR)", "Total Price (SAR)"];
                    const rows = filteredItems.map((item, idx) => [
                      String(idx + 1),
                      item.item_number,
                      item.description,
                      item.unit,
                      item.quantity.toString(),
                      item.unit_price?.toString() || "",
                      item.total_price?.toString() || ""
                    ]);
                    const csvContent = [headers, ...rows]
                      .map(row => row.map(cell => `"${cell}"`).join(","))
                      .join("\n");
                    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `boq_filtered_${filteredItems.length}_items.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export Filtered ({filteredItems.length} items)
                </Button>
                <BulkApplyCostsDialog
                  items={filteredItems}
                  savedTemplate={savedTemplate}
                  onApplyToItems={applyTemplateToMultipleItems}
                  currency={data.summary?.currency || "SAR"}
                />
              </div>
            )}

            {/* BOQ Items Table - With Calculated Costs */}
            <div className="overflow-x-auto border border-border rounded-xl shadow-sm w-full">
              <table className="w-full min-w-[1200px]" dir="ltr">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-primary/20">
                    <th className="px-3 py-3 text-center font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      #
                    </th>
                    <th className="px-3 py-3 text-left font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Item No.
                    </th>
                    <th className="px-3 py-3 text-left font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Item Code
                    </th>
                    <th className="px-3 py-3 text-left font-bold text-sm text-slate-700 dark:text-slate-200 min-w-[300px]">
                      Description
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Unit
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Qty
                    </th>
                    <th className="px-3 py-3 text-right font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Unit Price
                    </th>
                    <th className="px-3 py-3 text-right font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Total
                    </th>
                    <th className="px-3 py-3 text-right font-bold text-sm text-purple-700 dark:text-purple-300 whitespace-nowrap bg-purple-500/10">
                      AI Rate
                    </th>
                    <th className="px-3 py-3 text-right font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap bg-primary/10">
                      Calc. Price
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item, idx) => {
                    // Ensure item_number exists
                    if (!item.item_number) {
                      console.error(`⚠️ Item at index ${idx} missing item_number:`, item);
                      return null;
                    }
                    
                    const costData = getItemCostData(item.item_number);
                    const calcCosts = getItemCalculatedCosts(item.item_number);
                    const calculatedPrice = calcCosts.calculatedUnitPrice;
                    const effectivePrice = calculatedPrice > 0 ? calculatedPrice : (item.unit_price || 0);
                    const totalPrice = effectivePrice * item.quantity;
                    
                    // Debug logging for first 3 items
                    if (idx < 3) {
                      console.log(`✅ Item #${idx + 1}:`, {
                        itemNumber: item.item_number,
                        aiSuggestedRate: calcCosts.aiSuggestedRate,
                        calculatedPrice: calculatedPrice,
                        costDataExists: !!itemCosts[item.item_number]
                      });
                    }
                    
                    return (
                      <tr 
                        key={idx} 
                        className={cn(
                          "hover:bg-primary/5 transition-colors",
                          idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"
                        )}
                      >
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono text-sm font-medium text-slate-600 dark:text-slate-300">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-left">
                          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                            {item.item_number}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-left">
                          <EditableItemCode
                            itemNumber={item.item_number}
                            code={getItemCode(item.item_number, idx)}
                            onSave={setItemCode}
                          />
                        </td>
                        <td className="px-3 py-3 text-left min-w-[300px] max-w-[450px]">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed break-words" title={cleanText(item.description)}>
                            {cleanText(item.description)}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.unit}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.quantity.toLocaleString()}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <EditableUnitPrice
                            value={getEffectivePrice(item).unit_price}
                            onSave={(newPrice) => handleEditUnitPrice(item.item_number, newPrice)}
                            className={cn(
                              "text-slate-700 dark:text-slate-200",
                              editedPrices[item.item_number]?.unit_price !== undefined && "text-blue-600 dark:text-blue-400"
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <EditableUnitPrice
                            value={getEffectivePrice(item).total_price}
                            onSave={(newTotal) => handleEditTotalPrice(item.item_number, newTotal)}
                            className={cn(
                              "text-slate-700 dark:text-slate-200",
                              editedPrices[item.item_number]?.total_price !== undefined && "text-blue-600 dark:text-blue-400"
                            )}
                          />
                        </td>
                        <td className="px-3 py-3 text-right bg-purple-500/5">
                          <EditableAIRate
                            itemNumber={item.item_number}
                            currentRate={calcCosts.aiSuggestedRate}
                            onSave={(itemNum, rate) => updateAIRate(itemNum, rate)}
                            isApplied={recentlyAppliedItems.has(item.item_number)}
                          />
                        </td>
                        <td className="px-3 py-3 text-right bg-primary/5">
                          <span className={cn(
                            "text-sm font-bold",
                            calculatedPrice > 0 ? "text-primary" : "text-slate-500"
                          )}>
                            {calculatedPrice > 0 ? calculatedPrice.toLocaleString() : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ItemCostEditor
                            itemId={item.item_number}
                            itemDescription={item.description}
                            quantity={item.quantity}
                            currentCosts={costData}
                            calculatedCosts={calcCosts}
                            onSave={handleSaveItemCost}
                            onCopyFrom={handleCopyFromItem}
                            onSaveAsTemplate={handleSaveAsTemplate}
                            onApplyTemplate={handleApplyTemplate}
                            onDeleteTemplate={handleDeleteTemplate}
                            savedTemplate={savedTemplate}
                            savedTemplates={savedTemplates}
                            availableItems={availableItemsForCopy}
                            currency={data.summary?.currency || "SAR"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/10 border-t-2 border-primary/30">
                    <td colSpan={9} className="px-4 py-4 text-right font-bold text-slate-800 dark:text-slate-100">
                      Grand Total
                    </td>
                    <td colSpan={2} className="px-4 py-4 text-right bg-primary/20">
                      <span className="font-bold text-lg text-primary">
                        {(() => {
                          const calculatedTotal = filteredItems.reduce((sum, item) => {
                            const calcPrice = getItemCalculatedCosts(item.item_number).calculatedUnitPrice;
                            const effectivePrice = calcPrice > 0 ? calcPrice : (item.unit_price || 0);
                            return sum + (effectivePrice * item.quantity);
                          }, 0);
                          return calculatedTotal > 0 ? calculatedTotal.toLocaleString() : 
                            (data.summary?.total_value || data.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0).toLocaleString();
                        })()} {data.summary?.currency || 'SAR'}
                      </span>
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Category Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {Object.entries(groupedItems).map(([category, categoryItems]) => {
                // Calculate total with calculated prices
                const categoryTotal = categoryItems.reduce((sum, item) => {
                  const calcPrice = getItemCalculatedCosts(item.item_number).calculatedUnitPrice;
                  const effectivePrice = calcPrice > 0 ? calcPrice : (item.unit_price || 0);
                  return sum + (effectivePrice * item.quantity);
                }, 0);
                
                return (
                  <div 
                    key={category} 
                    className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{categoryItems.length} items</span>
                      <span className="font-semibold text-primary">
                        {categoryTotal.toLocaleString()} {data.summary?.currency || 'SAR'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "wbs" && wbsData?.wbs && (
          <div className="space-y-6">
            {/* WBS Flow Diagram - New Visual */}
            <WBSFlowDiagram wbsData={wbsData.wbs} />
            
            {/* WBS Tree Diagram */}
            <WBSTreeDiagram wbsData={wbsData.wbs} />
            
            {/* WBS List View */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">{isArabic ? "عرض القائمة" : "List View"}</h4>
              {wbsData.wbs.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-xl border border-border hover:border-primary/30 transition-colors",
                    item.level === 1 && "bg-muted/50",
                    item.level === 2 && "mr-8",
                    item.level === 3 && "mr-16"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                      {item.code}
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  {item.items.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      العناصر: {item.items.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "summary" && data.summary && (
          <div className="space-y-6">
            {/* Company Logo Upload */}
            <CompanyLogoUpload />
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">{isArabic ? "إجمالي العناصر" : "Total Items"}</p>
                <p className="text-3xl font-display font-bold text-primary">
                  {data.summary.total_items}
                </p>
              </div>
              {data.summary.total_value && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                  <p className="text-sm text-muted-foreground mb-1">{isArabic ? "إجمالي القيمة" : "Total Value"}</p>
                  <p className="text-3xl font-display font-bold text-success">
                    {data.summary.total_value.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{data.summary.currency}</p>
                </div>
              )}
              <div className="p-6 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 col-span-1 md:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">{isArabic ? "الفئات" : "Categories"}</p>
                <div className="flex flex-wrap gap-2">
                  {(data.summary.categories || []).map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "costs" && data.items && (
          <CostAnalysis items={data.items} currency={data.summary?.currency} />
        )}

        {activeTab === "charts" && data.items && (
          <DataCharts items={data.items} summary={data.summary} wbsData={wbsData?.wbs} />
        )}

        {activeTab === "timeline" && wbsData?.wbs && (
          <ProjectTimeline wbsData={wbsData.wbs} />
        )}

        {activeTab === "integration" && data.items && (
          <ScheduleIntegration 
            items={data.items} 
            wbsData={wbsData?.wbs} 
            currency={data.summary?.currency} 
          />
        )}
      </div>
    </div>
  );
}
