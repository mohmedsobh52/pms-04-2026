import { forwardRef, useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, Trash2, Edit, Building2, FileText, DollarSign, Percent, Search, FolderOpen, ListChecks, FileCheck, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenderSubcontractor {
  id: string;
  subcontractorId: string;
  subcontractorName: string;
  linkedItems: string[];
  scope: string;
  contractValue: number;
  paymentTerms: string;
  retentionPercentage: number;
  status: 'draft' | 'negotiating' | 'confirmed' | 'signed';
}

interface ProjectItem {
  itemNumber: string;
  description: string;
  totalPrice: number;
}

interface TenderSubcontractorsTabProps {
  projectId: string;
  initialData?: TenderSubcontractor[];
  projectItems?: ProjectItem[];
  contractValue: number;
  currency?: string;
  onDataChange: (data: TenderSubcontractor[], total: number) => void;
}

const TenderSubcontractorsTab = forwardRef<HTMLDivElement, TenderSubcontractorsTabProps>(
  ({
    projectId,
    initialData = [],
    projectItems = [],
    contractValue,
    currency = "SAR",
    onDataChange
  }, ref) => {
    const { isArabic: isRTL } = useLanguage();
  const [subcontractors, setSubcontractors] = useState<TenderSubcontractor[]>(initialData);
  const [availableSubcontractors, setAvailableSubcontractors] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TenderSubcontractor | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<TenderSubcontractor>>({
    subcontractorId: "",
    subcontractorName: "",
    linkedItems: [],
    scope: "",
    contractValue: 0,
    paymentTerms: "",
    retentionPercentage: 5,
    status: 'draft'
  });

  // Enhanced form data for unified dialog
  const [enhancedFormData, setEnhancedFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    license_number: "",
    notes: ""
  });

  // Projects & Items for linking
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dbProjectItems, setDbProjectItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [dbItemSearchTerm, setDbItemSearchTerm] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setSubcontractors(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    loadAvailableSubcontractors();
    loadProjectsAndContracts();
  }, []);

  const loadAvailableSubcontractors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, name, specialty, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setAvailableSubcontractors(data || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
    }
  };

  const loadProjectsAndContracts = async () => {
    try {
      const [projRes, contractRes] = await Promise.all([
        supabase.from("project_data").select("id, name").order("created_at", { ascending: false }),
        supabase.from("contracts").select("id, contract_number, contract_title, contractor_name, contract_value, status").order("created_at", { ascending: false })
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (contractRes.data) setContracts(contractRes.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Fetch project items when project is selected
  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== "none") {
      fetchProjectItems(selectedProjectId);
    } else {
      setDbProjectItems([]);
      setSelectedItemIds([]);
    }
  }, [selectedProjectId]);

  const fetchProjectItems = async (projectId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from("project_items")
        .select("id, item_number, description, unit, quantity, unit_price, total_price, is_section")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setDbProjectItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Filtered DB items based on search
  const filteredDbItems = useMemo(() => {
    const items = dbProjectItems.filter(i => !i.is_section);
    if (!dbItemSearchTerm) return items;
    const term = dbItemSearchTerm.toLowerCase();
    return items.filter(i =>
      i.item_number?.toLowerCase().includes(term) ||
      i.description?.toLowerCase().includes(term)
    );
  }, [dbProjectItems, dbItemSearchTerm]);

  // Calculate selected DB items value
  const selectedDbItemsValue = useMemo(() => {
    return dbProjectItems
      .filter(item => selectedItemIds.includes(item.id))
      .reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [dbProjectItems, selectedItemIds]);

  const handleToggleDbItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDbSelectAll = () => {
    setSelectedItemIds(filteredDbItems.map(i => i.id));
  };

  const handleDbClearAll = () => {
    setSelectedItemIds([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalSubcontractorsCost = subcontractors.reduce((sum, s) => sum + (s.contractValue || 0), 0);
  const subcontractorsPercentage = contractValue > 0 ? (totalSubcontractorsCost / contractValue) * 100 : 0;
  const linkedItemsCount = new Set(subcontractors.flatMap(s => s.linkedItems)).size;

  // Enhanced save - saves to DB with all fields
  const handleEnhancedSave = async (createContract = false) => {
    if (!enhancedFormData.name) {
      toast.error(isRTL ? "يرجى إدخال اسم المقاول" : "Please enter subcontractor name");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save to subcontractors table with all fields
      const { data: subData, error: subError } = await supabase.from('subcontractors').insert({
        user_id: user.id,
        name: enhancedFormData.name,
        email: enhancedFormData.email || null,
        phone: enhancedFormData.phone || null,
        specialty: enhancedFormData.specialty || null,
        license_number: enhancedFormData.license_number || null,
        notes: enhancedFormData.notes || null,
        status: 'active'
      }).select().single();

      if (subError) throw subError;

      // Create contract if requested
      if (createContract) {
        const contractNumber = `CON-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`;
        const { error: contractError } = await supabase.from("contracts").insert({
          user_id: user.id,
          contract_number: contractNumber,
          contract_title: `${isRTL ? "عقد مقاولة - " : "Subcontract - "}${enhancedFormData.name}`,
          contractor_name: enhancedFormData.name,
          contractor_phone: enhancedFormData.phone || null,
          contractor_email: enhancedFormData.email || null,
          contractor_license_number: enhancedFormData.license_number || null,
          contract_value: selectedDbItemsValue > 0 ? selectedDbItemsValue : null,
          project_id: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : null,
          status: "draft"
        });
        if (contractError) throw contractError;
      }

      // Also add to local tender subcontractors list
      const newItem: TenderSubcontractor = {
        id: subData?.id || `sub-${Date.now()}`,
        subcontractorId: subData?.id || "",
        subcontractorName: enhancedFormData.name,
        linkedItems: [],
        scope: enhancedFormData.specialty || "",
        contractValue: selectedDbItemsValue || 0,
        paymentTerms: "",
        retentionPercentage: 5,
        status: 'draft'
      };
      const updatedList = [...subcontractors, newItem];
      setSubcontractors(updatedList);
      const total = updatedList.reduce((sum, s) => sum + (s.contractValue || 0), 0);
      onDataChange(updatedList, total);

      loadAvailableSubcontractors();
      loadProjectsAndContracts();
      setShowAddDialog(false);
      resetEnhancedForm();
      
      toast.success(
        createContract
          ? (isRTL ? "تم الحفظ وإنشاء العقد بنجاح" : "Saved & Contract created successfully")
          : (isRTL ? "تم الحفظ بنجاح" : "Saved successfully")
      );
    } catch (error) {
      console.error('Error saving subcontractor:', error);
      toast.error(isRTL ? "حدث خطأ أثناء الحفظ" : "Error saving subcontractor");
    }
  };

  const handleSave = async () => {
    if (!formData.subcontractorName || !formData.contractValue) {
      toast.error(isRTL ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    let updatedList: TenderSubcontractor[];

    if (editingItem) {
      updatedList = subcontractors.map(s => 
        s.id === editingItem.id ? { ...s, ...formData } as TenderSubcontractor : s
      );
    } else {
      if (!formData.subcontractorId && formData.subcontractorName) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from('subcontractors').insert({
              user_id: user.id,
              name: formData.subcontractorName,
              specialty: formData.scope || null,
              status: 'active'
            });
            if (!error) {
              loadAvailableSubcontractors();
            }
          }
        } catch (e) {
          console.error('Error syncing subcontractor to DB:', e);
        }
      }

      const newItem: TenderSubcontractor = {
        id: `sub-${Date.now()}`,
        subcontractorId: formData.subcontractorId || "",
        subcontractorName: formData.subcontractorName || "",
        linkedItems: formData.linkedItems || [],
        scope: formData.scope || "",
        contractValue: formData.contractValue || 0,
        paymentTerms: formData.paymentTerms || "",
        retentionPercentage: formData.retentionPercentage || 5,
        status: formData.status || 'draft'
      };
      updatedList = [...subcontractors, newItem];
    }

    setSubcontractors(updatedList);
    const total = updatedList.reduce((sum, s) => sum + (s.contractValue || 0), 0);
    onDataChange(updatedList, total);
    
    setShowAddDialog(false);
    setEditingItem(null);
    resetForm();
    toast.success(isRTL ? "تم الحفظ بنجاح" : "Saved successfully");
  };

  const handleDelete = (id: string) => {
    const updatedList = subcontractors.filter(s => s.id !== id);
    setSubcontractors(updatedList);
    const total = updatedList.reduce((sum, s) => sum + (s.contractValue || 0), 0);
    onDataChange(updatedList, total);
    toast.success(isRTL ? "تم الحذف بنجاح" : "Deleted successfully");
  };

  const handleEdit = (item: TenderSubcontractor) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      subcontractorId: "",
      subcontractorName: "",
      linkedItems: [],
      scope: "",
      contractValue: 0,
      paymentTerms: "",
      retentionPercentage: 5,
      status: 'draft'
    });
  };

  const resetEnhancedForm = () => {
    setEnhancedFormData({ name: "", email: "", phone: "", specialty: "", license_number: "", notes: "" });
    setSelectedProjectId("");
    setSelectedItemIds([]);
    setDbItemSearchTerm("");
  };

  const handleSubcontractorSelect = (id: string) => {
    const selected = availableSubcontractors.find(s => s.id === id);
    if (selected) {
      setFormData({
        ...formData,
        subcontractorId: id,
        subcontractorName: selected.name
      });
    }
  };

  const handleItemToggle = (itemNumber: string, checked: boolean) => {
    const currentItems = formData.linkedItems || [];
    if (checked) {
      setFormData({ ...formData, linkedItems: [...currentItems, itemNumber] });
    } else {
      setFormData({ ...formData, linkedItems: currentItems.filter(i => i !== itemNumber) });
    }
  };

  const filteredProjectItems = useMemo(() => {
    if (!itemSearchTerm.trim()) return projectItems;
    const term = itemSearchTerm.toLowerCase();
    return projectItems.filter(item => 
      item.itemNumber.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  }, [projectItems, itemSearchTerm]);

  const handleSelectAll = () => {
    setFormData({ ...formData, linkedItems: projectItems.map(i => i.itemNumber) });
  };

  const handleDeselectAll = () => {
    setFormData({ ...formData, linkedItems: [] });
  };

  const selectedItemsTotal = useMemo(() => {
    return (formData.linkedItems || []).reduce((sum, itemNo) => {
      const item = projectItems.find(i => i.itemNumber === itemNo);
      return sum + (item?.totalPrice || 0);
    }, 0);
  }, [formData.linkedItems, projectItems]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: isRTL ? "مسودة" : "Draft", variant: "secondary" as const },
      negotiating: { label: isRTL ? "تفاوض" : "Negotiating", variant: "outline" as const },
      confirmed: { label: isRTL ? "مؤكد" : "Confirmed", variant: "default" as const },
      signed: { label: isRTL ? "موقع" : "Signed", variant: "default" as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "عدد المقاولين" : "Subcontractors"}</p>
                <p className="text-2xl font-bold">{subcontractors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "البنود المرتبطة" : "Linked Items"}</p>
                <p className="text-2xl font-bold">{linkedItemsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي التكاليف" : "Total Costs"}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSubcontractorsCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "من قيمة العقد" : "Of Contract Value"}</p>
                <p className="text-2xl font-bold">{subcontractorsPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="tender-card-safe">
        <CardHeader className="tender-card-header">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isRTL ? "مقاولو الباطن" : "Subcontractors"}
            </CardTitle>
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              setShowAddDialog(open);
              if (!open) {
                setEditingItem(null);
                resetForm();
                resetEnhancedForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="relative z-[65] pointer-events-auto">
                  <Plus className="h-4 w-4 mr-1" />
                  {isRTL ? "إضافة مقاول" : "Add Subcontractor"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onOpenAutoFocus={e => e.preventDefault()}
                onCloseAutoFocus={e => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {editingItem 
                      ? (isRTL ? "تعديل مقاول الباطن" : "Edit Subcontractor")
                      : (isRTL ? "إضافة مقاول فرعي جديد" : "Add New Subcontractor")
                    }
                  </DialogTitle>
                </DialogHeader>
                
                {editingItem ? (
                  /* Keep existing edit form for editing */
                  <div className="space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{isRTL ? "اختر من القائمة" : "Select from List"}</Label>
                        <Select value={formData.subcontractorId} onValueChange={handleSubcontractorSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder={isRTL ? "اختر مقاول" : "Select subcontractor"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubcontractors.map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>{sub.name} - {sub.specialty}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{isRTL ? "أو أدخل اسم جديد" : "Or Enter New Name"}</Label>
                        <Input
                          value={formData.subcontractorName}
                          onChange={(e) => setFormData({ ...formData, subcontractorName: e.target.value })}
                          placeholder={isRTL ? "اسم المقاول" : "Subcontractor name"}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{isRTL ? "نطاق العمل" : "Scope of Work"}</Label>
                      <Textarea
                        value={formData.scope}
                        onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                        placeholder={isRTL ? "وصف نطاق العمل..." : "Describe scope of work..."}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>{isRTL ? "قيمة العقد" : "Contract Value"}</Label>
                        <Input type="number" value={formData.contractValue} onChange={(e) => setFormData({ ...formData, contractValue: parseFloat(e.target.value) || 0 })} placeholder="0" />
                      </div>
                      <div>
                        <Label>{isRTL ? "نسبة الضمان المحتجز" : "Retention %"}</Label>
                        <Input type="number" value={formData.retentionPercentage} onChange={(e) => setFormData({ ...formData, retentionPercentage: parseFloat(e.target.value) || 0 })} placeholder="5" />
                      </div>
                      <div>
                        <Label>{isRTL ? "الحالة" : "Status"}</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">{isRTL ? "مسودة" : "Draft"}</SelectItem>
                            <SelectItem value="negotiating">{isRTL ? "تفاوض" : "Negotiating"}</SelectItem>
                            <SelectItem value="confirmed">{isRTL ? "مؤكد" : "Confirmed"}</SelectItem>
                            <SelectItem value="signed">{isRTL ? "موقع" : "Signed"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleSave} className="w-full">{isRTL ? "تحديث" : "Update"}</Button>
                  </div>
                ) : (
                  /* New unified add form matching SubcontractorManagement */
                  <ScrollArea className="flex-1 px-1">
                    <div className="space-y-6">
                      {/* Section 1: Contractor Info */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Users className="w-4 h-4" />
                          {isRTL ? "معلومات المقاول" : "Contractor Information"}
                        </div>
                        <Separator />
                        <div>
                          <Label>{isRTL ? "الاسم" : "Name"} *</Label>
                          <Input 
                            value={enhancedFormData.name}
                            onChange={e => setEnhancedFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder={isRTL ? "اسم المقاول الفرعي" : "Subcontractor name"}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                            <Input 
                              type="email"
                              value={enhancedFormData.email}
                              onChange={e => setEnhancedFormData(p => ({ ...p, email: e.target.value }))}
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <Label>{isRTL ? "الهاتف" : "Phone"}</Label>
                            <Input 
                              value={enhancedFormData.phone}
                              onChange={e => setEnhancedFormData(p => ({ ...p, phone: e.target.value }))}
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{isRTL ? "التخصص" : "Specialty"}</Label>
                            <Input 
                              value={enhancedFormData.specialty}
                              onChange={e => setEnhancedFormData(p => ({ ...p, specialty: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>{isRTL ? "رقم الرخصة" : "License No."}</Label>
                            <Input 
                              value={enhancedFormData.license_number}
                              onChange={e => setEnhancedFormData(p => ({ ...p, license_number: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Project & Items Linking */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <FolderOpen className="w-4 h-4" />
                          {isRTL ? "ربط المشروع والبنود" : "Link Project & Items"}
                        </div>
                        <Separator />
                        
                        <div>
                          <Label className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            {isRTL ? "المشروع" : "Project"}
                          </Label>
                          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger>
                              <SelectValue placeholder={isRTL ? "اختر المشروع..." : "Select project..."} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{isRTL ? "بدون مشروع" : "No project"}</SelectItem>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedProjectId && selectedProjectId !== "none" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Label className="flex items-center gap-2">
                                <ListChecks className="w-4 h-4" />
                                {isRTL ? "البنود المتعاقد عليها" : "Contracted Items"}
                              </Label>
                            </div>
                            
                            {/* Search & Bulk Actions */}
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  placeholder={isRTL ? "بحث في البنود..." : "Search items..."}
                                  value={dbItemSearchTerm}
                                  onChange={e => setDbItemSearchTerm(e.target.value)}
                                  className="pl-10 h-9"
                                />
                              </div>
                              <Button variant="outline" size="sm" onClick={handleDbSelectAll}>
                                {isRTL ? "تحديد الكل" : "Select All"}
                              </Button>
                              <Button variant="outline" size="sm" onClick={handleDbClearAll}>
                                {isRTL ? "إلغاء الكل" : "Clear"}
                              </Button>
                              {selectedItemIds.length > 0 && (
                                <Badge variant="secondary">{selectedItemIds.length}</Badge>
                              )}
                            </div>

                            {/* Items List */}
                            <ScrollArea className="h-56 border rounded-lg">
                              {loadingItems ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                  {isRTL ? "جاري التحميل..." : "Loading..."}
                                </div>
                              ) : filteredDbItems.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                  {isRTL ? "لا توجد بنود" : "No items found"}
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {filteredDbItems.map(item => {
                                    const isSelected = selectedItemIds.includes(item.id);
                                    return (
                                      <div 
                                        key={item.id}
                                        className={cn(
                                          "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                                          isSelected ? "bg-primary/5 border-r-2 border-r-primary" : ""
                                        )}
                                        onClick={() => handleToggleDbItem(item.id)}
                                      >
                                        <Checkbox checked={isSelected} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs shrink-0">{item.item_number}</Badge>
                                            <span className="text-sm truncate">{item.description || "-"}</span>
                                          </div>
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground shrink-0">
                                          {(item.total_price || 0).toLocaleString()} {currency}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </ScrollArea>

                            {/* Selection Summary */}
                            {selectedItemIds.length > 0 && (
                              <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calculator className="w-4 h-4 text-primary" />
                                  <span>{isRTL ? "البنود المختارة:" : "Selected items:"} <strong>{selectedItemIds.length}</strong></span>
                                </div>
                                <div className="text-sm font-bold text-primary">
                                  {selectedDbItemsValue.toLocaleString()} {currency}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Notes */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <FileText className="w-4 h-4" />
                          {isRTL ? "ملاحظات" : "Notes"}
                        </div>
                        <Separator />
                        <Textarea 
                          value={enhancedFormData.notes}
                          onChange={e => setEnhancedFormData(p => ({ ...p, notes: e.target.value }))}
                          placeholder={isRTL ? "ملاحظات إضافية..." : "Additional notes..."}
                          rows={3}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                )}

                {!editingItem && (
                  <DialogFooter className="gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      {isRTL ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleEnhancedSave(true)}
                      disabled={!enhancedFormData.name}
                      className="gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      {isRTL ? "حفظ وإنشاء عقد" : "Save & Create Contract"}
                    </Button>
                    <Button 
                      onClick={() => handleEnhancedSave(false)} 
                      disabled={!enhancedFormData.name}
                    >
                      {isRTL ? "حفظ" : "Save"}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {subcontractors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{isRTL ? "لم يتم إضافة مقاولين بعد" : "No subcontractors added yet"}</p>
              <p className="text-sm">{isRTL ? "اضغط على زر الإضافة للبدء" : "Click add button to start"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "المقاول" : "Subcontractor"}</TableHead>
                  <TableHead>{isRTL ? "البنود المرتبطة" : "Linked Items"}</TableHead>
                  <TableHead>{isRTL ? "قيمة العقد" : "Contract Value"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontractors.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.subcontractorName}</p>
                        {sub.scope && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{sub.scope}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.linkedItems.slice(0, 3).map((item) => (
                          <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
                        ))}
                        {sub.linkedItems.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{sub.linkedItems.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(sub.contractValue)} {currency}
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sub)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {subcontractors.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{isRTL ? "إجمالي تكاليف مقاولي الباطن" : "Total Subcontractor Costs"}</p>
                <p className="text-xl font-bold">{formatCurrency(totalSubcontractorsCost)} {currency}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{isRTL ? "نسبة من قيمة العقد" : "Percentage of Contract"}</p>
                <p className="text-xl font-bold">{subcontractorsPercentage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">{isRTL ? "البنود المغطاة" : "Items Covered"}</p>
                <p className="text-xl font-bold">
                  {linkedItemsCount} {isRTL ? "من" : "of"} {projectItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

TenderSubcontractorsTab.displayName = "TenderSubcontractorsTab";

export default TenderSubcontractorsTab;
