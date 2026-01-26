import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, Home, ChevronRight, Edit, Play, MoreVertical,
  Package, Percent, DollarSign, FileText, Building2, Calendar,
  File, Settings, LayoutList, FolderOpen, Loader2, Search,
  Filter, Download, Trash2, CheckCircle, XCircle, Upload, Save, X,
  Plus, Wand2, RefreshCw, ArrowUpDown, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PricingDistributionChart,
  CategoryDistributionChart,
  TopItemsChart,
} from "@/components/charts/ChartJsCharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { DetailedPriceDialog } from "@/components/pricing/DetailedPriceDialog";
import { EditItemDialog } from "@/components/items/EditItemDialog";
import { PricingAccuracyDashboard } from "@/components/PricingAccuracyDashboard";

interface ProjectData {
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

interface ProjectItem {
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

interface ProjectAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  category: string | null;
}

const statusConfig = {
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

const currencies = [
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

const CHART_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [itemsSearch, setItemsSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem("boq_items_per_page");
    return saved ? parseInt(saved, 10) : 100;
  });
  const [sortMode, setSortMode] = useState<'file_order' | 'item_number'>(() => {
    const saved = localStorage.getItem("boq_sort_mode");
    return (saved as 'file_order' | 'item_number') || 'file_order';
  });

  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    currency: "SAR",
    description: "",
    project_type: "construction",
    location: "",
    client_name: "",
    status: "draft"
  });
  const [isSaving, setIsSaving] = useState(false);

  // BOQ pricing state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isAutoPricing, setIsAutoPricing] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showQuickPriceDialog, setShowQuickPriceDialog] = useState<string | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState("");
  const [newItem, setNewItem] = useState({ item_number: "", description: "", unit: "", quantity: "" });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showDetailedPriceDialog, setShowDetailedPriceDialog] = useState(false);
  const [selectedItemForPricing, setSelectedItemForPricing] = useState<ProjectItem | null>(null);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ProjectItem | null>(null);

  // Fetch project data
  useEffect(() => {
    if (!user || !projectId) return;

    const fetchProjectData = async () => {
      setIsLoading(true);
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("project_data")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);
        const analysisData = projectData.analysis_data as any;
        setEditForm({
          name: projectData.name || "",
          currency: projectData.currency || "SAR",
          description: analysisData?.project_info?.description || "",
          project_type: analysisData?.project_info?.type || "construction",
          location: analysisData?.project_info?.location || "",
          client_name: analysisData?.project_info?.client_name || "",
          status: analysisData?.project_info?.status || "draft",
        });

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from("project_items")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });

        if (itemsError) throw itemsError;
        setItems(itemsData || []);

        // Fetch attachments
        await fetchAttachments();
      } catch (error: any) {
        console.error("Error fetching project:", error);
        toast({
          title: isArabic ? "خطأ في تحميل المشروع" : "Error loading project",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [user, projectId]);

  // Fetch attachments
  const fetchAttachments = async () => {
    if (!projectId || !user) return;
    
    const { data, error } = await supabase
      .from("project_attachments")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    if (!error && data) {
      // Filter by project_id if set, otherwise show all user attachments
      const filtered = data.filter(att => 
        att.file_path?.includes(projectId) || !att.file_path
      );
      setAttachments(filtered);
    }
  };

  // Calculate pricing statistics
  const pricingStats = useMemo(() => {
    const totalItems = items.length;
    const pricedItems = items.filter(item => item.unit_price && item.unit_price > 0).length;
    const confirmedItems = items.filter(item => 
      item.unit_price && item.unit_price > 0 && item.total_price && item.total_price > 0
    ).length;
    const unpricedItems = totalItems - pricedItems;
    const pricingPercentage = totalItems > 0 ? Math.round((pricedItems / totalItems) * 100 * 10) / 10 : 0;
    const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    return { totalItems, pricedItems, confirmedItems, unpricedItems, pricingPercentage, totalValue };
  }, [items]);

  // Chart data: Pricing distribution
  const pricingDistributionData = useMemo(() => [
    { 
      name: isArabic ? "بنود مسعرة" : "Priced Items", 
      value: pricingStats.pricedItems, 
      color: "#22c55e" 
    },
    { 
      name: isArabic ? "بنود غير مسعرة" : "Unpriced Items", 
      value: pricingStats.unpricedItems, 
      color: "#f59e0b" 
    }
  ], [pricingStats, isArabic]);

  // Chart data: Category distribution
  const categoryDistribution = useMemo(() => {
    const grouped = items.reduce((acc, item) => {
      const cat = item.category || (isArabic ? "غير مصنف" : "Uncategorized");
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 6);
  }, [items, isArabic]);

  // Chart data: Top items by value
  const topValueItems = useMemo(() => {
    return items
      .filter(item => item.total_price && item.total_price > 0)
      .sort((a, b) => (b.total_price || 0) - (a.total_price || 0))
      .slice(0, 5)
      .map(item => ({
        name: item.item_number,
        value: item.total_price || 0
      }));
  }, [items]);

  // Filter and sort items for BOQ tab
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply search filter
    if (itemsSearch) {
      const query = itemsSearch.toLowerCase();
      result = result.filter(item => 
        item.item_number.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortMode === 'item_number') {
      result = [...result].sort((a, b) => {
        // Natural sort for item numbers (1.1, 1.2, 1.10, 2.1, etc.)
        return a.item_number.localeCompare(b.item_number, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
    }
    // For 'file_order' - data is already sorted by sort_order from database
    
    return result;
  }, [items, itemsSearch, sortMode]);

  // Handler for changing sort mode
  const handleSortModeChange = (mode: 'file_order' | 'item_number') => {
    setSortMode(mode);
    localStorage.setItem("boq_sort_mode", mode);
    setCurrentPage(1);
  };

  // Pagination with configurable items per page
  const effectiveItemsPerPage = itemsPerPage >= filteredItems.length ? filteredItems.length : itemsPerPage;
  const totalPages = Math.ceil(filteredItems.length / effectiveItemsPerPage) || 1;
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const displayedItems = filteredItems.slice(startIndex, startIndex + effectiveItemsPerPage);

  // Handler for changing items per page
  const handleItemsPerPageChange = (value: string) => {
    if (value === "all") {
      setItemsPerPage(filteredItems.length || 1000);
    } else {
      const newValue = parseInt(value, 10);
      setItemsPerPage(newValue);
      localStorage.setItem("boq_items_per_page", value);
    }
    setCurrentPage(1);
  };

  // Zero quantity items count
  const zeroQuantityCount = useMemo(() => {
    return items.filter(item => !item.quantity || item.quantity === 0).length;
  }, [items]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsSearch]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user || !projectId) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from("project_attachments")
          .insert({
            project_id: projectId,
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            category: "general"
          });

        if (dbError) throw dbError;
      }

      await fetchAttachments();

      toast({
        title: isArabic ? "تم رفع الملف بنجاح" : "File uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: isArabic ? "خطأ في رفع الملف" : "Error uploading file",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file download
  const handleDownload = async (attachment: ProjectAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("project-files")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في التحميل" : "Error downloading",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle file delete
  const handleDeleteAttachment = async (attachment: ProjectAttachment) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("project_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      await fetchAttachments();

      toast({
        title: isArabic ? "تم حذف الملف" : "File deleted",
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الحذف" : "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle settings save
  const handleSaveSettings = async () => {
    if (!projectId || !editForm.name.trim()) {
      toast({
        title: isArabic ? "اسم المشروع مطلوب" : "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update analysis_data with additional fields
      const updatedAnalysisData = {
        ...project?.analysis_data,
        project_info: {
          ...(project?.analysis_data as any)?.project_info,
          type: editForm.project_type,
          description: editForm.description,
          location: editForm.location,
          client_name: editForm.client_name,
          status: editForm.status,
        }
      };

      const { error } = await supabase
        .from("project_data")
        .update({
          name: editForm.name.trim(),
          currency: editForm.currency,
          analysis_data: updatedAnalysisData,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      setProject(prev => prev ? {
        ...prev,
        name: editForm.name.trim(),
        currency: editForm.currency,
        analysis_data: updatedAnalysisData,
        updated_at: new Date().toISOString()
      } : null);

      setIsEditing(false);
      toast({
        title: isArabic ? "تم حفظ التغييرات" : "Changes saved",
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الحفظ" : "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle auto pricing for all unpriced items
  const handleAutoPricing = async () => {
    setIsAutoPricing(true);
    try {
      // Get unpriced items
      const unpricedItems = items.filter(item => !item.unit_price || item.unit_price === 0);
      
      // For demo: assign random prices (in production, this would call AI)
      for (const item of unpricedItems) {
        const estimatedPrice = Math.round(Math.random() * 100 + 10);
        const totalPrice = (item.quantity || 1) * estimatedPrice;
        
        await supabase
          .from("project_items")
          .update({ unit_price: estimatedPrice, total_price: totalPrice })
          .eq("id", item.id);
      }

      // Refetch items
      const { data: updatedItems } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", projectId)
        .order("item_number");
      
      if (updatedItems) setItems(updatedItems);

      toast({
        title: isArabic ? "تم التسعير التلقائي" : "Auto pricing complete",
        description: isArabic 
          ? `تم تسعير ${unpricedItems.length} بند` 
          : `Priced ${unpricedItems.length} items`,
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في التسعير" : "Pricing error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAutoPricing(false);
    }
  };

  // Handle add new item
  const handleAddItem = async () => {
    if (!newItem.item_number || !projectId || !user) return;
    
    setIsAddingItem(true);
    try {
      const { data, error } = await supabase
        .from("project_items")
        .insert({
          project_id: projectId,
          item_number: newItem.item_number,
          description: newItem.description || null,
          unit: newItem.unit || null,
          quantity: parseFloat(newItem.quantity) || null,
          unit_price: 0,
          total_price: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setItems(prev => [...prev, data]);
      setShowAddItemDialog(false);
      setNewItem({ item_number: "", description: "", unit: "", quantity: "" });
      
      toast({
        title: isArabic ? "تمت إضافة البند" : "Item added",
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الإضافة" : "Error adding item",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  // Handle quick price
  const handleQuickPrice = async () => {
    if (!showQuickPriceDialog || !quickPriceValue) return;
    
    const item = items.find(i => i.id === showQuickPriceDialog);
    if (!item) return;

    const unitPrice = parseFloat(quickPriceValue);
    const totalPrice = (item.quantity || 0) * unitPrice;

    try {
      await supabase
        .from("project_items")
        .update({ unit_price: unitPrice, total_price: totalPrice })
        .eq("id", item.id);

      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, unit_price: unitPrice, total_price: totalPrice } : i
      ));

      setShowQuickPriceDialog(null);
      setQuickPriceValue("");
      
      toast({
        title: isArabic ? "تم تحديث السعر" : "Price updated",
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في التحديث" : "Error updating",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      await supabase.from("project_items").delete().eq("id", itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      toast({
        title: isArabic ? "تم حذف البند" : "Item deleted",
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الحذف" : "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle unconfirm/clear price
  const handleUnconfirmItem = async (itemId: string) => {
    try {
      await supabase
        .from("project_items")
        .update({ unit_price: 0, total_price: 0 })
        .eq("id", itemId);

      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, unit_price: 0, total_price: 0 } : i
      ));
      
      toast({
        title: isArabic ? "تم إلغاء التسعير" : "Price cleared",
      });
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle delete zero quantity items
  const handleDeleteZeroQuantityItems = async () => {
    const zeroItems = items.filter(item => !item.quantity || item.quantity === 0);
    
    if (zeroItems.length === 0) {
      toast({ 
        title: isArabic ? "لا توجد بنود بكمية صفر" : "No zero quantity items" 
      });
      return;
    }

    const confirmed = window.confirm(
      isArabic 
        ? `هل تريد حذف ${zeroItems.length} بند بكمية صفرية؟`
        : `Delete ${zeroItems.length} items with zero quantity?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("project_items")
        .delete()
        .eq("project_id", projectId)
        .or("quantity.is.null,quantity.eq.0");

      if (error) throw error;

      toast({ 
        title: isArabic ? "تم الحذف بنجاح" : "Deleted successfully",
        description: isArabic 
          ? `تم حذف ${zeroItems.length} بند`
          : `${zeroItems.length} items deleted`
      });

      // Refresh items
      const { data: updatedItems } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      
      if (updatedItems) {
        setItems(updatedItems);
        setCurrentPage(1);
      }
    } catch (error: any) {
      toast({
        title: isArabic ? "خطأ في الحذف" : "Error deleting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStartPricing = () => {
    if (!project) return;
    navigate(`/projects/${projectId}/pricing`);
  };

  const handleEditProject = () => {
    // Navigate to settings tab and enable editing mode
    setActiveTab("settings");
    const analysisData = project?.analysis_data as any;
    setEditForm({
      name: project?.name || "",
      currency: project?.currency || "SAR",
      description: analysisData?.project_info?.description || "",
      project_type: analysisData?.project_info?.type || "construction",
      location: analysisData?.project_info?.location || "",
      client_name: analysisData?.project_info?.client_name || "",
      status: analysisData?.project_info?.status || "draft",
    });
    setIsEditing(true);
    toast({
      title: isArabic ? "وضع التعديل" : "Edit Mode",
      description: isArabic 
        ? "يمكنك الآن تعديل إعدادات المشروع"
        : "You can now edit project settings",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {isArabic ? "يجب تسجيل الدخول لعرض تفاصيل المشروع" : "Please login to view project details"}
          </p>
          <Button onClick={() => navigate('/auth')}>
            {isArabic ? "تسجيل الدخول" : "Sign In"}
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? "المشروع غير موجود" : "Project not found"}
          </h3>
          <Button onClick={() => navigate('/projects')}>
            {isArabic ? "العودة للمشاريع" : "Back to Projects"}
          </Button>
        </div>
      </div>
    );
  }

  const projectStatus = "draft";
  const statusInfo = statusConfig[projectStatus as keyof typeof statusConfig];

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* زر الرجوع */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (window.history.length > 2) {
                    navigate(-1);
                  } else {
                    navigate('/projects');
                  }
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isArabic ? "رجوع" : "Back"}
                </span>
              </Button>
              
              {/* زر الرئيسية */}
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {isArabic ? "الرئيسية" : "Home"}
                  </span>
                </Link>
              </Button>
              
              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center gap-2 text-sm ms-2">
                <Link to="/projects" className="text-muted-foreground hover:text-foreground">
                  {isArabic ? "المشاريع" : "Projects"}
                </Link>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium truncate max-w-[200px]">
                  {project.name}
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge variant="outline" className={statusInfo.color}>
                  {isArabic ? statusInfo.label.ar : statusInfo.label.en}
                </Badge>
              </div>
              {project.file_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="w-4 h-4" />
                  {project.file_name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleStartPricing} className="gap-2">
              <Play className="w-4 h-4" />
              {isArabic ? "بدء التسعير" : "Start Pricing"}
            </Button>
            <Button variant="outline" onClick={handleEditProject} className="gap-2">
              <Edit className="w-4 h-4" />
              {isArabic ? "تعديل المشروع" : "Edit Project"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isArabic ? "start" : "end"}>
                <DropdownMenuItem className="gap-2">
                  <Download className="w-4 h-4" />
                  {isArabic ? "تصدير" : "Export"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  {isArabic ? "حذف المشروع" : "Delete Project"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">{pricingStats.totalItems}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي البنود" : "Total Items"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Percent className="w-5 h-5 text-amber-600" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">{pricingStats.pricingPercentage}%</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "نسبة التسعير" : "Pricing %"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pricingStats.totalValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {project.currency || 'SAR'} - {isArabic ? "القيمة الإجمالية" : "Total Value"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className={`text-${isArabic ? 'left' : 'right'}`}>
                  <p className="text-2xl font-bold">{attachments.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "المستندات" : "Documents"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Outside Tabs to avoid ref conflicts with recharts */}
        {activeTab === "overview" && items.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {isArabic ? "توزيع التسعير" : "Pricing Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PricingDistributionChart 
                  data={pricingDistributionData}
                  isArabic={isArabic}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {isArabic ? "توزيع الفئات" : "Category Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDistributionChart 
                  data={categoryDistribution}
                  isArabic={isArabic}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {isArabic ? "أعلى البنود قيمة" : "Top Items by Value"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topValueItems.length > 0 ? (
                  <TopItemsChart 
                    data={topValueItems}
                    isArabic={isArabic}
                    formatCurrency={formatCurrency}
                  />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    {isArabic ? "لا توجد بيانات" : "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutList className="w-4 h-4" />
              {isArabic ? "نظرة عامة" : "Overview"}
            </TabsTrigger>
            <TabsTrigger value="boq" className="gap-2">
              <Package className="w-4 h-4" />
              {isArabic ? "جدول الكميات" : "BOQ"}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <File className="w-4 h-4" />
              {isArabic ? "المستندات" : "Documents"}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              {isArabic ? "الإعدادات" : "Settings"}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Project Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {isArabic ? "تفاصيل المشروع" : "Project Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {isArabic ? "نوع المشروع" : "Project Type"}
                    </span>
                    <span className="font-medium">Other</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {isArabic ? "تاريخ الإنشاء" : "Created Date"}
                    </span>
                    <span className="font-medium">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {isArabic ? "اسم الملف" : "File Name"}
                    </span>
                    <span className="font-medium truncate max-w-[150px]">{project.file_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {isArabic ? "العملة" : "Currency"}
                    </span>
                    <span className="font-medium">{project.currency || 'SAR'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    {isArabic ? "ملخص التسعير" : "Pricing Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {isArabic ? "البنود المسعرة" : "Priced Items"}
                    </span>
                    <span className="font-medium">{pricingStats.pricedItems} / {pricingStats.totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-500" />
                      {isArabic ? "البنود غير المسعرة" : "Unpriced Items"}
                    </span>
                    <span className="font-medium">{pricingStats.unpricedItems}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2 py-2 border-b border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{isArabic ? "التقدم" : "Progress"}</span>
                      <span className="font-medium">{pricingStats.pricingPercentage}%</span>
                    </div>
                    <Progress value={pricingStats.pricingPercentage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {isArabic ? "القيمة الإجمالية" : "Total Value"}
                    </span>
                    <span className="font-bold text-lg text-green-600">
                      {project.currency || 'SAR'} {formatCurrency(pricingStats.totalValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Accuracy Dashboard */}
            <PricingAccuracyDashboard projectId={projectId} />
          </TabsContent>

          {/* BOQ Tab */}
          <TabsContent value="boq" className="space-y-4">
            {/* Statistics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{pricingStats.totalItems}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي البنود" : "Total Items"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{pricingStats.pricedItems}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "بنود مسعرة" : "Priced Items"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{pricingStats.confirmedItems}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "بنود مؤكدة" : "Confirmed Items"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {project?.currency || 'SAR'} {formatCurrency(pricingStats.totalValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "إجمالي القيمة" : "Total Value"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {isArabic ? "تقدم التسعير" : "Pricing Progress"}
                  </span>
                  <span className="text-sm font-bold">{pricingStats.pricingPercentage}%</span>
                </div>
                <Progress value={pricingStats.pricingPercentage} className="h-3" />
              </CardContent>
            </Card>

            {/* BOQ Table Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {isArabic ? "جدول الكميات" : "Bill of Quantities"}
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                        value={itemsSearch}
                        onChange={(e) => setItemsSearch(e.target.value)}
                        className="pl-9 w-48 md:w-64"
                      />
                    </div>
                    {/* Sort Mode Toggle */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <ArrowUpDown className="w-4 h-4" />
                          {sortMode === 'file_order' 
                            ? (isArabic ? "ترتيب الملف" : "File Order")
                            : (isArabic ? "ترتيب رقمي" : "Numeric Order")
                          }
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isArabic ? "start" : "end"} className="bg-popover">
                        <DropdownMenuItem 
                          onClick={() => handleSortModeChange('file_order')}
                          className="gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {isArabic ? "ترتيب الملف الأصلي" : "Original File Order"}
                          {sortMode === 'file_order' && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSortModeChange('item_number')}
                          className="gap-2"
                        >
                          <Hash className="w-4 h-4" />
                          {isArabic ? "ترتيب حسب رقم البند" : "Sort by Item Number"}
                          {sortMode === 'item_number' && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={handleDeleteZeroQuantityItems}
                      disabled={zeroQuantityCount === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                      {isArabic ? "مسح الكميات الصفرية" : "Delete Zero Qty"}
                      {zeroQuantityCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {zeroQuantityCount}
                        </Badge>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleAutoPricing}
                      disabled={isAutoPricing || pricingStats.unpricedItems === 0}
                    >
                      {isAutoPricing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      {isArabic ? "تسعير تلقائي" : "Auto Price"}
                    </Button>
                    <Button 
                      className="gap-2"
                      onClick={() => setShowAddItemDialog(true)}
                    >
                      <Plus className="w-4 h-4" />
                      {isArabic ? "إضافة بند" : "Add Item"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedItems(new Set(filteredItems.map(i => i.id)));
                              } else {
                                setSelectedItems(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="w-[100px]">{isArabic ? "رقم البند" : "Item No."}</TableHead>
                        <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                        <TableHead className="w-[80px]">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                        <TableHead className="w-[100px] text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                        <TableHead className="w-[120px] text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                        <TableHead className="w-[140px] text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                        <TableHead className="w-[100px]">{isArabic ? "الحالة" : "Status"}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {isArabic ? "لا توجد بنود" : "No items found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedItems);
                                  if (checked) newSet.add(item.id);
                                  else newSet.delete(item.id);
                                  setSelectedItems(newSet);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm whitespace-nowrap">{item.item_number}</TableCell>
                            <TableCell className="min-w-[350px] max-w-[500px] whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description || '-'}</TableCell>
                            <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell className="text-right">{item.quantity?.toLocaleString() || '-'}</TableCell>
                            <TableCell className="text-right">
                              {item.unit_price && item.unit_price > 0 ? formatCurrency(item.unit_price) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total_price && item.total_price > 0 ? formatCurrency(item.total_price) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={item.unit_price && item.unit_price > 0 ? "default" : "secondary"}
                                className={item.unit_price && item.unit_price > 0 
                                  ? "bg-green-500/10 text-green-600 border-green-500/20" 
                                  : ""}
                              >
                                {item.unit_price && item.unit_price > 0 
                                  ? (isArabic ? "مسعر" : "Priced") 
                                  : (isArabic ? "غير مسعر" : "Unpriced")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isArabic ? "start" : "end"}>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setShowQuickPriceDialog(item.id);
                                      setQuickPriceValue(item.unit_price?.toString() || "");
                                    }}
                                    className="gap-2"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                    {isArabic ? "تسعير سريع" : "Quick Price"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedItemForPricing(item as any);
                                      setShowDetailedPriceDialog(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <FileText className="w-4 h-4" />
                                    {isArabic ? "تسعير مفصل" : "Detailed Price"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedItemForEdit(item as ProjectItem);
                                      setShowEditItemDialog(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    {isArabic ? "تعديل" : "Edit"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleUnconfirmItem(item.id)}
                                    className="gap-2"
                                    disabled={!item.unit_price || item.unit_price === 0}
                                  >
                                    <XCircle className="w-4 h-4" />
                                    {isArabic ? "إلغاء التحقق" : "Clear Price"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="gap-2 text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {isArabic ? "حذف" : "Delete"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination Controls */}
                {filteredItems.length > 0 && (
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground">
                        {isArabic 
                          ? `عرض ${startIndex + 1}-${Math.min(startIndex + effectiveItemsPerPage, filteredItems.length)} من ${filteredItems.length} بند` 
                          : `Showing ${startIndex + 1}-${Math.min(startIndex + effectiveItemsPerPage, filteredItems.length)} of ${filteredItems.length} items`}
                      </p>
                      
                      {/* Items Per Page Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {isArabic ? "بنود/صفحة:" : "Per page:"}
                        </span>
                        <Select
                          value={itemsPerPage >= filteredItems.length && itemsPerPage > 200 ? "all" : itemsPerPage.toString()}
                          onValueChange={handleItemsPerPageChange}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          {isArabic ? "الأولى" : "First"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          {isArabic ? "السابق" : "Previous"}
                        </Button>
                        
                        <span className="text-sm px-3 font-medium">
                          {currentPage} / {totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          {isArabic ? "التالي" : "Next"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          {isArabic ? "الأخيرة" : "Last"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <File className="w-5 h-5" />
                    {isArabic ? "المستندات المرفقة" : "Attached Documents"}
                    {attachments.length > 0 && (
                      <Badge variant="secondary">{attachments.length}</Badge>
                    )}
                  </CardTitle>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg,.dxf"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isUploading}
                      className="gap-2"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading 
                        ? (isArabic ? "جاري الرفع..." : "Uploading...") 
                        : (isArabic ? "رفع ملف" : "Upload File")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <div className="text-center py-12">
                    <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">
                      {isArabic ? "لا توجد مستندات" : "No documents"}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {isArabic ? "لم يتم رفع أي مستندات لهذا المشروع" : "No documents have been uploaded for this project"}
                    </p>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {isArabic ? "رفع مستند" : "Upload Document"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{attachment.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.file_size)} • {formatDate(attachment.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDownload(attachment)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteAttachment(attachment)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {isArabic ? "إعدادات المشروع" : "Project Settings"}
                  </CardTitle>
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const analysisData = project.analysis_data as any;
                        setEditForm({
                          name: project.name || "",
                          currency: project.currency || "SAR",
                          description: analysisData?.project_info?.description || "",
                          project_type: analysisData?.project_info?.type || "construction",
                          location: analysisData?.project_info?.location || "",
                          client_name: analysisData?.project_info?.client_name || "",
                          status: analysisData?.project_info?.status || "draft",
                        });
                        setIsEditing(true);
                      }}
                      className="gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      {isArabic ? "تعديل" : "Edit"}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        {isArabic ? "إلغاء" : "Cancel"}
                      </Button>
                      <Button 
                        onClick={handleSaveSettings} 
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {isSaving 
                          ? (isArabic ? "جاري الحفظ..." : "Saving...") 
                          : (isArabic ? "حفظ" : "Save")}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="projectName">
                    {isArabic ? "اسم المشروع" : "Project Name"} *
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="projectName"
                      value={editForm.name} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={isArabic ? "أدخل اسم المشروع" : "Enter project name"}
                    />
                  ) : (
                    <Input value={project.name} readOnly className="bg-muted/50" />
                  )}
                </div>

                {/* Currency and Project Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">
                      {isArabic ? "العملة" : "Currency"}
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editForm.currency}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, currency: val }))}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue placeholder={isArabic ? "اختر العملة" : "Select currency"} />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={project.currency || 'SAR'} readOnly className="bg-muted/50" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectType">
                      {isArabic ? "نوع المشروع" : "Project Type"}
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editForm.project_type}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, project_type: val }))}
                      >
                        <SelectTrigger id="projectType">
                          <SelectValue placeholder={isArabic ? "اختر النوع" : "Select type"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="construction">{isArabic ? "بناء" : "Construction"}</SelectItem>
                          <SelectItem value="infrastructure">{isArabic ? "بنية تحتية" : "Infrastructure"}</SelectItem>
                          <SelectItem value="renovation">{isArabic ? "تجديد" : "Renovation"}</SelectItem>
                          <SelectItem value="maintenance">{isArabic ? "صيانة" : "Maintenance"}</SelectItem>
                          <SelectItem value="other">{isArabic ? "أخرى" : "Other"}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        value={(() => {
                          const types: Record<string, string> = {
                            construction: isArabic ? "بناء" : "Construction",
                            infrastructure: isArabic ? "بنية تحتية" : "Infrastructure",
                            renovation: isArabic ? "تجديد" : "Renovation",
                            maintenance: isArabic ? "صيانة" : "Maintenance",
                            other: isArabic ? "أخرى" : "Other"
                          };
                          return types[editForm.project_type] || editForm.project_type;
                        })()} 
                        readOnly 
                        className="bg-muted/50" 
                      />
                    )}
                  </div>
                </div>

                {/* Project Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">
                    {isArabic ? "حالة المشروع" : "Project Status"}
                  </Label>
                  {isEditing ? (
                    <Select
                      value={editForm.status}
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder={isArabic ? "اختر الحالة" : "Select status"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-500" />
                            {isArabic ? "مسودة" : "Draft"}
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {isArabic ? "قيد التنفيذ" : "In Progress"}
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {isArabic ? "مكتمل" : "Completed"}
                          </div>
                        </SelectItem>
                        <SelectItem value="suspended">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            {isArabic ? "معلق" : "Suspended"}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                      <span className={`w-2 h-2 rounded-full ${
                        editForm.status === 'draft' ? 'bg-gray-500' :
                        editForm.status === 'in_progress' ? 'bg-blue-500' :
                        editForm.status === 'completed' ? 'bg-green-500' :
                        'bg-yellow-500'
                      }`} />
                      <span>
                        {editForm.status === 'draft' ? (isArabic ? "مسودة" : "Draft") :
                         editForm.status === 'in_progress' ? (isArabic ? "قيد التنفيذ" : "In Progress") :
                         editForm.status === 'completed' ? (isArabic ? "مكتمل" : "Completed") :
                         (isArabic ? "معلق" : "Suspended")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {isArabic ? "وصف المشروع" : "Project Description"}
                  </Label>
                  {isEditing ? (
                    <Textarea 
                      id="description"
                      value={editForm.description} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={isArabic ? "أدخل وصف المشروع" : "Enter project description"}
                      rows={3}
                    />
                  ) : (
                    <Textarea 
                      value={editForm.description || (isArabic ? "لا يوجد وصف" : "No description")} 
                      readOnly 
                      className="bg-muted/50 resize-none" 
                      rows={3}
                    />
                  )}
                </div>

                {/* Location and Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">
                      {isArabic ? "موقع المشروع" : "Project Location"}
                    </Label>
                    {isEditing ? (
                      <Input 
                        id="location"
                        value={editForm.location} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder={isArabic ? "أدخل موقع المشروع" : "Enter project location"}
                      />
                    ) : (
                      <Input 
                        value={editForm.location || (isArabic ? "غير محدد" : "Not specified")} 
                        readOnly 
                        className="bg-muted/50" 
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientName">
                      {isArabic ? "اسم العميل" : "Client Name"}
                    </Label>
                    {isEditing ? (
                      <Input 
                        id="clientName"
                        value={editForm.client_name} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, client_name: e.target.value }))}
                        placeholder={isArabic ? "أدخل اسم العميل" : "Enter client name"}
                      />
                    ) : (
                      <Input 
                        value={editForm.client_name || (isArabic ? "غير محدد" : "Not specified")} 
                        readOnly 
                        className="bg-muted/50" 
                      />
                    )}
                  </div>
                </div>
                
                {/* Last Updated - Read Only */}
                <div className="space-y-2">
                  <Label>
                    {isArabic ? "آخر تحديث" : "Last Updated"}
                  </Label>
                  <Input value={formatDate(project.updated_at)} readOnly className="bg-muted/50" />
                </div>
                
                {/* Delete Project */}
                <div className="pt-4 border-t">
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    {isArabic ? "حذف المشروع" : "Delete Project"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Quick Price Dialog */}
      <Dialog open={!!showQuickPriceDialog} onOpenChange={() => setShowQuickPriceDialog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isArabic ? "تسعير سريع" : "Quick Price"}</DialogTitle>
            <DialogDescription>
              {isArabic 
                ? "أدخل سعر الوحدة لهذا البند" 
                : "Enter the unit price for this item"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{isArabic ? "سعر الوحدة" : "Unit Price"}</Label>
              <Input 
                id="unitPrice"
                type="number" 
                step="0.01"
                placeholder={isArabic ? "أدخل السعر" : "Enter price"}
                value={quickPriceValue}
                onChange={(e) => setQuickPriceValue(e.target.value)}
              />
            </div>
            {showQuickPriceDialog && (() => {
              const item = items.find(i => i.id === showQuickPriceDialog);
              const price = parseFloat(quickPriceValue) || 0;
              const total = (item?.quantity || 0) * price;
              return item ? (
                <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
                  <p><span className="text-muted-foreground">{isArabic ? "البند:" : "Item:"}</span> {item.item_number}</p>
                  <p><span className="text-muted-foreground">{isArabic ? "الكمية:" : "Qty:"}</span> {item.quantity?.toLocaleString()}</p>
                  <p><span className="text-muted-foreground">{isArabic ? "الإجمالي:" : "Total:"}</span> <span className="font-bold">{formatCurrency(total)}</span></p>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickPriceDialog(null)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleQuickPrice} disabled={!quickPriceValue}>
              {isArabic ? "تطبيق السعر" : "Apply Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isArabic ? "إضافة بند جديد" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {isArabic 
                ? "أدخل بيانات البند الجديد" 
                : "Enter the details for the new item"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemNumber">{isArabic ? "رقم البند" : "Item Number"} *</Label>
              <Input 
                id="itemNumber"
                placeholder={isArabic ? "مثال: 1.2.3" : "e.g., 1.2.3"}
                value={newItem.item_number}
                onChange={(e) => setNewItem(prev => ({ ...prev, item_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{isArabic ? "الوصف" : "Description"}</Label>
              <Textarea 
                id="description"
                placeholder={isArabic ? "وصف البند" : "Item description"}
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">{isArabic ? "الوحدة" : "Unit"}</Label>
                <Input 
                  id="unit"
                  placeholder={isArabic ? "مثال: م³" : "e.g., m³"}
                  value={newItem.unit}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">{isArabic ? "الكمية" : "Quantity"}</Label>
                <Input 
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              onClick={handleAddItem} 
              disabled={!newItem.item_number || isAddingItem}
              className="gap-2"
            >
              {isAddingItem ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isArabic ? "إضافة" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detailed Price Dialog */}
      <DetailedPriceDialog
        isOpen={showDetailedPriceDialog}
        onClose={() => {
          setShowDetailedPriceDialog(false);
          setSelectedItemForPricing(null);
        }}
        item={selectedItemForPricing}
        currency={project?.currency || "SAR"}
        onSave={async () => {
          // Refresh items after save
          const { data } = await supabase
            .from("project_items")
            .select("*")
            .eq("project_id", projectId)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });
          if (data) setItems(data);
        }}
      />

      {/* Edit Item Dialog */}
      <EditItemDialog
        isOpen={showEditItemDialog}
        onClose={() => {
          setShowEditItemDialog(false);
          setSelectedItemForEdit(null);
        }}
        item={selectedItemForEdit}
        onSave={async (updatedData) => {
          if (!selectedItemForEdit) return;
          
          const { error } = await supabase
            .from("project_items")
            .update({
              item_number: updatedData.item_number,
              description: updatedData.description,
              description_ar: updatedData.description_ar,
              unit: updatedData.unit,
              quantity: updatedData.quantity,
              category: updatedData.category === "none" ? null : updatedData.category,
              subcategory: updatedData.subcategory,
              specifications: updatedData.specifications,
              is_section: updatedData.is_section,
              total_price: updatedData.is_section 
                ? null 
                : (updatedData.quantity || 0) * (selectedItemForEdit.unit_price || 0)
            })
            .eq("id", selectedItemForEdit.id);
            
          if (error) {
            toast({
              title: isArabic ? "خطأ في الحفظ" : "Error saving",
              variant: "destructive",
            });
            throw error;
          }
          
          toast({
            title: isArabic ? "تم حفظ التغييرات" : "Changes saved",
          });
          
          // Refresh items after save
          const { data } = await supabase
            .from("project_items")
            .select("*")
            .eq("project_id", projectId)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });
          if (data) setItems(data);
        }}
      />
    </div>
  );
}
