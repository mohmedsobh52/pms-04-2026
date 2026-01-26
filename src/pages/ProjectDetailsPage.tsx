import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { DetailedPriceDialog } from "@/components/pricing/DetailedPriceDialog";
import { EditItemDialog } from "@/components/items/EditItemDialog";

// Import refactored components
import { ProjectHeader } from "@/components/project-details/ProjectHeader";
import { ProjectOverviewTab } from "@/components/project-details/ProjectOverviewTab";
import { ProjectBOQTab } from "@/components/project-details/ProjectBOQTab";
import { ProjectDocumentsTab } from "@/components/project-details/ProjectDocumentsTab";
import { ProjectSettingsTab } from "@/components/project-details/ProjectSettingsTab";
import { 
  ProjectData, 
  ProjectItem, 
  ProjectAttachment, 
  EditFormData 
} from "@/components/project-details/types";

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
  const [editForm, setEditForm] = useState<EditFormData>({ 
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
        // Fetch project - using maybeSingle() to handle missing projects gracefully
        const { data: projectData, error: projectError } = await supabase
          .from("project_data")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (projectError) throw projectError;
        
        // Handle case when project doesn't exist
        if (!projectData) {
          setIsLoading(false);
          setProject(null);
          return;
        }

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

  // Chart data
  const pricingDistributionData = useMemo(() => [
    { name: isArabic ? "بنود مسعرة" : "Priced Items", value: pricingStats.pricedItems, color: "#22c55e" },
    { name: isArabic ? "بنود غير مسعرة" : "Unpriced Items", value: pricingStats.unpricedItems, color: "#f59e0b" }
  ], [pricingStats, isArabic]);

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

  const topValueItems = useMemo(() => {
    return items
      .filter(item => item.total_price && item.total_price > 0)
      .sort((a, b) => (b.total_price || 0) - (a.total_price || 0))
      .slice(0, 5)
      .map(item => ({ name: item.item_number, value: item.total_price || 0 }));
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (itemsSearch) {
      const query = itemsSearch.toLowerCase();
      result = result.filter(item => 
        item.item_number.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    }
    
    if (sortMode === 'item_number') {
      result = [...result].sort((a, b) => {
        return a.item_number.localeCompare(b.item_number, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
    }
    
    return result;
  }, [items, itemsSearch, sortMode]);

  // Pagination
  const effectiveItemsPerPage = itemsPerPage >= filteredItems.length ? filteredItems.length : itemsPerPage;
  const totalPages = Math.ceil(filteredItems.length / effectiveItemsPerPage) || 1;
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const displayedItems = filteredItems.slice(startIndex, startIndex + effectiveItemsPerPage);

  // Zero quantity items count
  const zeroQuantityCount = useMemo(() => {
    return items.filter(item => !item.quantity || item.quantity === 0).length;
  }, [items]);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsSearch]);

  // Handlers
  const handleSortModeChange = (mode: 'file_order' | 'item_number') => {
    setSortMode(mode);
    localStorage.setItem("boq_sort_mode", mode);
    setCurrentPage(1);
  };

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user || !projectId) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

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

  const handleDeleteAttachment = async (attachment: ProjectAttachment) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

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

  const handleAutoPricing = async () => {
    setIsAutoPricing(true);
    try {
      const unpricedItems = items.filter(item => !item.unit_price || item.unit_price === 0);
      
      for (const item of unpricedItems) {
        const estimatedPrice = Math.round(Math.random() * 100 + 10);
        const totalPrice = (item.quantity || 1) * estimatedPrice;
        
        await supabase
          .from("project_items")
          .update({ unit_price: estimatedPrice, total_price: totalPrice })
          .eq("id", item.id);
      }

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

  // Use useCallback for stable handlers to prevent re-render issues with Radix UI
  const handleStartPricing = useCallback(() => {
    if (!project) return;
    navigate(`/projects/${projectId}/pricing`);
  }, [project, projectId, navigate]);

  const handleEditProject = useCallback(() => {
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
  }, [project, isArabic, toast]);

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

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth check
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

  // Project not found
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

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <ProjectHeader
        project={project}
        pricingStats={pricingStats}
        isArabic={isArabic}
        onStartPricing={handleStartPricing}
        onEditProject={handleEditProject}
        formatCurrency={formatCurrency}
      />

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">
              {isArabic ? "نظرة عامة" : "Overview"}
            </TabsTrigger>
            <TabsTrigger value="boq">
              {isArabic ? "جدول الكميات" : "BOQ"}
            </TabsTrigger>
            <TabsTrigger value="documents">
              {isArabic ? "المستندات" : "Documents"}
            </TabsTrigger>
            <TabsTrigger value="settings">
              {isArabic ? "الإعدادات" : "Settings"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewTab
              project={project}
              pricingStats={pricingStats}
              pricingDistributionData={pricingDistributionData}
              categoryDistribution={categoryDistribution}
              topValueItems={topValueItems}
              isArabic={isArabic}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              projectId={projectId || ""}
            />
          </TabsContent>

          <TabsContent value="boq">
            <ProjectBOQTab
              items={items}
              filteredItems={filteredItems}
              displayedItems={displayedItems}
              pricingStats={pricingStats}
              selectedItems={selectedItems}
              itemsSearch={itemsSearch}
              sortMode={sortMode}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalPages={totalPages}
              startIndex={startIndex}
              zeroQuantityCount={zeroQuantityCount}
              isAutoPricing={isAutoPricing}
              isArabic={isArabic}
              currency={project.currency || "SAR"}
              onSearchChange={setItemsSearch}
              onSortModeChange={handleSortModeChange}
              onSelectedItemsChange={setSelectedItems}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              onAutoPricing={handleAutoPricing}
              onAddItem={() => setShowAddItemDialog(true)}
              onQuickPrice={(itemId) => {
                const item = items.find(i => i.id === itemId);
                setShowQuickPriceDialog(itemId);
                setQuickPriceValue(item?.unit_price?.toString() || "");
              }}
              onDetailedPrice={(item) => {
                setSelectedItemForPricing(item);
                setShowDetailedPriceDialog(true);
              }}
              onEditItem={(item) => {
                setSelectedItemForEdit(item);
                setShowEditItemDialog(true);
              }}
              onDeleteItem={handleDeleteItem}
              onUnconfirmItem={handleUnconfirmItem}
              onDeleteZeroQuantityItems={handleDeleteZeroQuantityItems}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="documents">
            <ProjectDocumentsTab
              attachments={attachments}
              isUploading={isUploading}
              isArabic={isArabic}
              onFileUpload={handleFileUpload}
              onDownload={handleDownload}
              onDelete={handleDeleteAttachment}
              formatFileSize={formatFileSize}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="settings">
            <ProjectSettingsTab
              project={project}
              editForm={editForm}
              isEditing={isEditing}
              isSaving={isSaving}
              isArabic={isArabic}
              onEditFormChange={setEditForm}
              onSave={handleSaveSettings}
              onCancel={() => setIsEditing(false)}
              onStartEdit={() => setIsEditing(true)}
              formatDate={formatDate}
            />
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
              {isAddingItem && <Loader2 className="w-4 h-4 animate-spin" />}
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
