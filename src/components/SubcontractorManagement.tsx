import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Users, Plus, Phone, Mail, Star, Building2, FileText, 
  Trash2, Edit, CheckCircle, Clock, AlertTriangle, TrendingUp,
  Scale, BarChart3, FolderOpen, Search, ListChecks, ExternalLink,
  FileCheck, Calculator
} from "lucide-react";
import { FIDICContractTemplates } from "./FIDICContractTemplates";
import { SubcontractorProgressDashboard } from "./SubcontractorProgressDashboard";

interface Subcontractor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  rating: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  subcontractor_id: string;
  project_id: string | null;
  scope_of_work: string | null;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface ProjectItemOption {
  id: string;
  item_number: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  is_section: boolean | null;
}

export function SubcontractorManagement() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Projects & Items for linking
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectItems, setProjectItems] = useState<ProjectItemOption[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);

  // Contracts linked to subcontractors
  const [contracts, setContracts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    license_number: "",
    notes: ""
  });

  const [assignmentData, setAssignmentData] = useState({
    subcontractor_id: "",
    scope_of_work: "",
    contract_value: "",
    start_date: "",
    end_date: "",
    status: "pending"
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, assignRes, projRes, contractRes] = await Promise.all([
        supabase.from("subcontractors").select("*").order("created_at", { ascending: false }),
        supabase.from("subcontractor_assignments").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("project_data").select("id, name").order("created_at", { ascending: false }).limit(500),
        supabase.from("contracts").select("id, contract_number, contract_title, contractor_name, contract_value, status").order("created_at", { ascending: false }).limit(500)
      ]);

      if (subRes.data) setSubcontractors(subRes.data);
      if (assignRes.data) setAssignments(assignRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (contractRes.data) setContracts(contractRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project items when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectItems(selectedProjectId);
    } else {
      setProjectItems([]);
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
      setProjectItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Filtered items based on search
  const filteredItems = useMemo(() => {
    if (!itemSearchTerm) return projectItems.filter(i => !i.is_section);
    const term = itemSearchTerm.toLowerCase();
    return projectItems.filter(i => 
      !i.is_section && (
        i.item_number?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term)
      )
    );
  }, [projectItems, itemSearchTerm]);

  // Calculate selected items value
  const selectedItemsValue = useMemo(() => {
    return projectItems
      .filter(item => selectedItemIds.includes(item.id))
      .reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [projectItems, selectedItemIds]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItemIds(filteredItems.map(i => i.id));
  };

  const handleClearAll = () => {
    setSelectedItemIds([]);
  };

  const handleAddSubcontractor = async () => {
    if (!user || !formData.name) return;

    try {
      const { data, error } = await supabase.from("subcontractors").insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        specialty: formData.specialty || null,
        license_number: formData.license_number || null,
        notes: formData.notes || null,
        status: "active"
      }).select().single();

      if (error) throw error;

      setSubcontractors(prev => [data, ...prev]);
      setShowAddDialog(false);
      resetAddForm();
      
      toast({
        title: isArabic ? "تمت الإضافة" : "Added",
        description: isArabic ? "تم إضافة المقاول الفرعي بنجاح" : "Subcontractor added successfully"
      });
    } catch (error) {
      console.error("Error adding subcontractor:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في إضافة المقاول" : "Failed to add subcontractor",
        variant: "destructive"
      });
    }
  };

  const handleSaveAndCreateContract = async () => {
    if (!user || !formData.name) return;

    try {
      // First save subcontractor
      const { data: subData, error: subError } = await supabase.from("subcontractors").insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        specialty: formData.specialty || null,
        license_number: formData.license_number || null,
        notes: formData.notes || null,
        status: "active"
      }).select().single();

      if (subError) throw subError;

      // Then create a contract linked to this subcontractor
      const contractNumber = `CON-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`;
      const { error: contractError } = await supabase.from("contracts").insert({
        user_id: user.id,
        contract_number: contractNumber,
        contract_title: `${isArabic ? "عقد مقاولة - " : "Subcontract - "}${formData.name}`,
        contractor_name: formData.name,
        contractor_phone: formData.phone || null,
        contractor_email: formData.email || null,
        contractor_license_number: formData.license_number || null,
        contract_value: selectedItemsValue > 0 ? selectedItemsValue : null,
        project_id: selectedProjectId || null,
        status: "draft"
      });

      if (contractError) throw contractError;

      setSubcontractors(prev => [subData, ...prev]);
      setShowAddDialog(false);
      resetAddForm();
      fetchData();
      
      toast({
        title: isArabic ? "تم الحفظ وإنشاء العقد" : "Saved & Contract Created",
        description: isArabic ? "تم إضافة المقاول وإنشاء عقد مرتبط" : "Subcontractor added and linked contract created"
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        variant: "destructive"
      });
    }
  };

  const resetAddForm = () => {
    setFormData({ name: "", email: "", phone: "", specialty: "", license_number: "", notes: "" });
    setSelectedProjectId("");
    setSelectedItemIds([]);
    setItemSearchTerm("");
  };

  const handleUpdateProgress = async (assignmentId: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from("subcontractor_assignments")
        .update({ 
          progress_percentage: newProgress,
          status: newProgress >= 100 ? "completed" : "in_progress"
        })
        .eq("id", assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.map(a => 
        a.id === assignmentId 
          ? { ...a, progress_percentage: newProgress, status: newProgress >= 100 ? "completed" : "in_progress" } 
          : a
      ));

      toast({
        title: isArabic ? "تم التحديث" : "Updated",
        description: isArabic ? "تم تحديث التقدم" : "Progress updated"
      });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleDeleteSubcontractor = async (id: string) => {
    try {
      const { error } = await supabase.from("subcontractors").delete().eq("id", id);
      if (error) throw error;
      
      setSubcontractors(prev => prev.filter(s => s.id !== id));
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم حذف المقاول الفرعي" : "Subcontractor deleted"
      });
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleAddAssignment = async () => {
    if (!assignmentData.subcontractor_id) return;

    try {
      const { data, error } = await supabase.from("subcontractor_assignments").insert({
        subcontractor_id: assignmentData.subcontractor_id,
        scope_of_work: assignmentData.scope_of_work || null,
        contract_value: assignmentData.contract_value ? parseFloat(assignmentData.contract_value) : null,
        start_date: assignmentData.start_date || null,
        end_date: assignmentData.end_date || null,
        status: assignmentData.status,
        progress_percentage: 0,
        payment_status: "pending"
      }).select().single();

      if (error) throw error;

      setAssignments(prev => [data, ...prev]);
      setShowAssignmentDialog(false);
      setAssignmentData({ subcontractor_id: "", scope_of_work: "", contract_value: "", start_date: "", end_date: "", status: "pending" });
      
      toast({
        title: isArabic ? "تم إنشاء المهمة" : "Assignment Created",
        description: isArabic ? "تم إسناد العمل للمقاول" : "Work assigned to subcontractor"
      });
    } catch (error) {
      console.error("Error adding assignment:", error);
    }
  };

  // Find linked contract for a subcontractor
  const getLinkedContract = (sub: Subcontractor) => {
    return contracts.find(c => c.contractor_name === sub.name);
  };

  // Find linked assignment project
  const getLinkedProject = (sub: Subcontractor) => {
    const assignment = assignments.find(a => a.subcontractor_id === sub.id && a.project_id);
    if (assignment?.project_id) {
      return projects.find(p => p.id === assignment.project_id);
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      pending: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
      in_progress: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: TrendingUp },
      completed: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
      delayed: { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle }
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={`gap-1 ${color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  // Stats calculation
  const totalSubcontractors = subcontractors.length;
  const activeAssignments = assignments.filter(a => a.status === "in_progress").length;
  const completedAssignments = assignments.filter(a => a.status === "completed").length;
  const totalContractValue = assignments.reduce((sum, a) => sum + (a.contract_value || 0), 0);

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isArabic ? "يرجى تسجيل الدخول لإدارة المقاولين الفرعيين" : "Please login to manage subcontractors"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSubcontractors}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "مقاولين" : "Subcontractors"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeAssignments}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "جاري التنفيذ" : "In Progress"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedAssignments}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "مكتمل" : "Completed"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalContractValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي العقود" : "Total Value"}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {isArabic ? "لوحة التحكم" : "Dashboard"}
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="gap-2">
              <Users className="w-4 h-4" />
              {isArabic ? "المقاولين" : "Subcontractors"}
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <FileText className="w-4 h-4" />
              {isArabic ? "المهام" : "Assignments"}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Scale className="w-4 h-4" />
              {isArabic ? "قوالب فيديك" : "FIDIC Templates"}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "مهمة جديدة" : "New Assignment"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? "إسناد عمل جديد" : "New Assignment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isArabic ? "المقاول" : "Subcontractor"}</Label>
                    <Select value={assignmentData.subcontractor_id} onValueChange={v => setAssignmentData(p => ({ ...p, subcontractor_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? "اختر المقاول" : "Select subcontractor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subcontractors.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{isArabic ? "نطاق العمل" : "Scope of Work"}</Label>
                    <Textarea 
                      value={assignmentData.scope_of_work}
                      onChange={e => setAssignmentData(p => ({ ...p, scope_of_work: e.target.value }))}
                      placeholder={isArabic ? "وصف العمل المطلوب..." : "Describe the work..."}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "قيمة العقد" : "Contract Value"}</Label>
                      <Input 
                        type="number"
                        value={assignmentData.contract_value}
                        onChange={e => setAssignmentData(p => ({ ...p, contract_value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "الحالة" : "Status"}</Label>
                      <Select value={assignmentData.status} onValueChange={v => setAssignmentData(p => ({ ...p, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{isArabic ? "معلق" : "Pending"}</SelectItem>
                          <SelectItem value="in_progress">{isArabic ? "جاري" : "In Progress"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{isArabic ? "تاريخ البدء" : "Start Date"}</Label>
                      <Input 
                        type="date"
                        value={assignmentData.start_date}
                        onChange={e => setAssignmentData(p => ({ ...p, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? "تاريخ الانتهاء" : "End Date"}</Label>
                      <Input 
                        type="date"
                        value={assignmentData.end_date}
                        onChange={e => setAssignmentData(p => ({ ...p, end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddAssignment} className="w-full">{isArabic ? "إسناد العمل" : "Create Assignment"}</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Enhanced Add Subcontractor Dialog */}
            <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetAddForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "مقاول جديد" : "Add Subcontractor"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onOpenAutoFocus={e => e.preventDefault()}
                onCloseAutoFocus={e => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {isArabic ? "إضافة مقاول فرعي جديد" : "Add New Subcontractor"}
                  </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 px-1">
                  <div className="space-y-6">
                    {/* Section 1: Contractor Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Users className="w-4 h-4" />
                        {isArabic ? "معلومات المقاول" : "Contractor Information"}
                      </div>
                      <Separator />
                      <div>
                        <Label>{isArabic ? "الاسم" : "Name"} *</Label>
                        <Input 
                          value={formData.name}
                          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                          placeholder={isArabic ? "اسم المقاول الفرعي" : "Subcontractor name"}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{isArabic ? "البريد الإلكتروني" : "Email"}</Label>
                          <Input 
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <Label>{isArabic ? "الهاتف" : "Phone"}</Label>
                          <Input 
                            value={formData.phone}
                            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{isArabic ? "التخصص" : "Specialty"}</Label>
                          <Input 
                            value={formData.specialty}
                            onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>{isArabic ? "رقم الرخصة" : "License No."}</Label>
                          <Input 
                            value={formData.license_number}
                            onChange={e => setFormData(p => ({ ...p, license_number: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Project & Items Linking */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <FolderOpen className="w-4 h-4" />
                        {isArabic ? "ربط المشروع والبنود" : "Link Project & Items"}
                      </div>
                      <Separator />
                      
                      <div>
                        <Label className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {isArabic ? "المشروع" : "Project"}
                        </Label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder={isArabic ? "اختر المشروع..." : "Select project..."} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{isArabic ? "بدون مشروع" : "No project"}</SelectItem>
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
                              {isArabic ? "البنود المتعاقد عليها" : "Contracted Items"}
                            </Label>
                          </div>
                          
                          {/* Search & Bulk Actions */}
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                                value={itemSearchTerm}
                                onChange={e => setItemSearchTerm(e.target.value)}
                                className="pl-10 h-9"
                              />
                            </div>
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                              {isArabic ? "تحديد الكل" : "Select All"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearAll}>
                              {isArabic ? "إلغاء الكل" : "Clear"}
                            </Button>
                            {selectedItemIds.length > 0 && (
                              <Badge variant="secondary">{selectedItemIds.length}</Badge>
                            )}
                          </div>

                          {/* Items List */}
                          <ScrollArea className="h-56 border rounded-lg">
                            {loadingItems ? (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                {isArabic ? "جاري التحميل..." : "Loading..."}
                              </div>
                            ) : filteredItems.length === 0 ? (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                {isArabic ? "لا توجد بنود" : "No items found"}
                              </div>
                            ) : (
                              <div className="divide-y">
                                {filteredItems.map(item => {
                                  const isSelected = selectedItemIds.includes(item.id);
                                  return (
                                    <div 
                                      key={item.id}
                                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5 border-r-2 border-r-primary" : ""}`}
                                      onClick={() => handleToggleItem(item.id)}
                                    >
                                      <Checkbox checked={isSelected} />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs shrink-0">{item.item_number}</Badge>
                                          <span className="text-sm truncate">{item.description || "-"}</span>
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-muted-foreground shrink-0">
                                        {(item.total_price || 0).toLocaleString()} SAR
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
                                <span>{isArabic ? "البنود المختارة:" : "Selected items:"} <strong>{selectedItemIds.length}</strong></span>
                              </div>
                              <div className="text-sm font-bold text-primary">
                                {selectedItemsValue.toLocaleString()} SAR
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
                        {isArabic ? "ملاحظات" : "Notes"}
                      </div>
                      <Separator />
                      <Textarea 
                        value={formData.notes}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                        rows={3}
                      />
                    </div>
                  </div>
                </ScrollArea>

                <DialogFooter className="gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    {isArabic ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSaveAndCreateContract}
                    disabled={!formData.name}
                    className="gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    {isArabic ? "حفظ وإنشاء عقد" : "Save & Create Contract"}
                  </Button>
                  <Button 
                    onClick={handleAddSubcontractor} 
                    disabled={!formData.name}
                  >
                    {isArabic ? "حفظ" : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="dashboard">
          <SubcontractorProgressDashboard 
            subcontractors={subcontractors} 
            assignments={assignments} 
          />
        </TabsContent>

        <TabsContent value="subcontractors" className="space-y-4">
          {subcontractors.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{isArabic ? "لا يوجد مقاولين فرعيين" : "No subcontractors yet"}</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subcontractors.map(sub => {
                const linkedContract = getLinkedContract(sub);
                const linkedProject = getLinkedProject(sub);
                const subAssignments = assignments.filter(a => a.subcontractor_id === sub.id);
                const totalValue = subAssignments.reduce((sum, a) => sum + (a.contract_value || 0), 0);

                return (
                  <Card key={sub.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{sub.name}</CardTitle>
                            <CardDescription>{sub.specialty || (isArabic ? "غير محدد" : "Not specified")}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                          {sub.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sub.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>{sub.email}</span>
                        </div>
                      )}
                      {sub.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{sub.phone}</span>
                        </div>
                      )}
                      {sub.license_number && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>{sub.license_number}</span>
                        </div>
                      )}
                      {sub.rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < sub.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Linked Info */}
                      {(linkedContract || linkedProject || totalValue > 0) && (
                        <div className="space-y-1.5 pt-2 border-t">
                          {linkedProject && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>{isArabic ? "المشروع:" : "Project:"} {linkedProject.name}</span>
                            </div>
                          )}
                          {subAssignments.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <ListChecks className="w-3.5 h-3.5" />
                              <span>{isArabic ? "المهام:" : "Tasks:"} {subAssignments.length} ({totalValue.toLocaleString()} SAR)</span>
                            </div>
                          )}
                          {linkedContract && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{isArabic ? "العقد:" : "Contract:"} {linkedContract.contract_number}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick Links */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                        {linkedContract && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => navigate("/contracts")}
                          >
                            <FileCheck className="w-3 h-3" />
                            {isArabic ? "العقد" : "Contract"}
                          </Button>
                        )}
                        {linkedProject && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => navigate(`/projects/${linkedProject.id}`)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            {isArabic ? "المشروع" : "Project"}
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setSelectedSubcontractor(sub);
                            setAssignmentData(p => ({ ...p, subcontractor_id: sub.id }));
                            setShowAssignmentDialog(true);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          {isArabic ? "مهمة" : "Task"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDeleteSubcontractor(sub.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{isArabic ? "لا توجد مهام" : "No assignments yet"}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignments.map(assign => {
                const sub = subcontractors.find(s => s.id === assign.subcontractor_id);
                return (
                  <Card key={assign.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{sub?.name || "Unknown"}</h4>
                          <p className="text-sm text-muted-foreground">{assign.scope_of_work}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(assign.status)}
                          {assign.contract_value && (
                            <Badge variant="outline">{assign.contract_value.toLocaleString()} SAR</Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{isArabic ? "التقدم" : "Progress"}</span>
                          <span className="font-medium">{assign.progress_percentage}%</span>
                        </div>
                        <Progress value={assign.progress_percentage} className="h-2" />
                        <div className="flex gap-2 mt-3">
                          {[25, 50, 75, 100].map(p => (
                            <Button 
                              key={p}
                              variant={assign.progress_percentage >= p ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleUpdateProgress(assign.id, p)}
                            >
                              {p}%
                            </Button>
                          ))}
                        </div>
                      </div>
                      {(assign.start_date || assign.end_date) && (
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          {assign.start_date && <span>{isArabic ? "البدء:" : "Start:"} {assign.start_date}</span>}
                          {assign.end_date && <span>{isArabic ? "الانتهاء:" : "End:"} {assign.end_date}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* FIDIC Templates Tab */}
        <TabsContent value="templates">
          <FIDICContractTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
