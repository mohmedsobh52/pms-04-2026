import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Percent,
  FileCheck,
  CheckCircle,
  Sparkles,
  Languages,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contractor_license_number: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_address: string | null;
  contractor_category: string | null;
  contract_type: string;
  contract_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  payment_terms: string | null;
  scope_of_work: string | null;
  terms_conditions: string | null;
  notes: string | null;
  retention_percentage: number | null;
  advance_payment_percentage: number | null;
  performance_bond_value: number | null;
  performance_bond_percentage: number | null;
  execution_percentage: number | null;
  variation_limit_percentage: number | null;
  contract_duration_months: number | null;
  created_at: string;
}

interface ContractManagementProps {
  projectId?: string;
}

const WIZARD_STEPS = [
  { id: 1, labelEn: "Basic Info", labelAr: "معلومات أساسية", icon: FileText },
  { id: 2, labelEn: "Contractor", labelAr: "بيانات المقاول", icon: Building2 },
  { id: 3, labelEn: "Values & Dates", labelAr: "القيم والتواريخ", icon: DollarSign },
  { id: 4, labelEn: "Financial Terms", labelAr: "الشروط المالية", icon: Shield },
  { id: 5, labelEn: "Scope & Notes", labelAr: "النطاق والملاحظات", icon: FileCheck },
];

export function ContractManagement({ projectId }: ContractManagementProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // AI generation states
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    contract_number: "",
    contract_title: "",
    contract_type: "fixed_price",
    status: "draft",
    // Step 2: Contractor Data
    contractor_name: "",
    contractor_license_number: "",
    contractor_phone: "",
    contractor_email: "",
    contractor_address: "",
    contractor_category: "first",
    // Step 3: Values & Dates
    contract_value: "",
    currency: "SAR",
    start_date: "",
    end_date: "",
    contract_duration_months: "",
    // Step 4: Financial Terms
    retention_percentage: "10",
    advance_payment_percentage: "20",
    performance_bond_percentage: "5",
    performance_bond_value: "",
    variation_limit_percentage: "15",
    // Step 5: Scope & Notes
    payment_terms: "",
    scope_of_work: "",
    notes: "",
  });

  // Contractor categories
  const contractorCategories = [
    { value: "first", labelEn: "First Class", labelAr: "الفئة الأولى" },
    { value: "second", labelEn: "Second Class", labelAr: "الفئة الثانية" },
    { value: "third", labelEn: "Third Class", labelAr: "الفئة الثالثة" },
    { value: "fourth", labelEn: "Fourth Class", labelAr: "الفئة الرابعة" },
    { value: "fifth", labelEn: "Fifth Class", labelAr: "الفئة الخامسة" },
    { value: "specialist", labelEn: "Specialist", labelAr: "متخصص" },
  ];

  // FIDIC-based contract types with colors
  const contractTypes = [
    { value: "fidic_red", labelEn: "FIDIC Red Book (Construction)", labelAr: "فيديك الكتاب الأحمر (البناء)", color: "bg-red-500" },
    { value: "fidic_yellow", labelEn: "FIDIC Yellow Book (Design-Build)", labelAr: "فيديك الكتاب الأصفر (التصميم والبناء)", color: "bg-yellow-500" },
    { value: "fidic_silver", labelEn: "FIDIC Silver Book (EPC/Turnkey)", labelAr: "فيديك الكتاب الفضي (تسليم مفتاح)", color: "bg-gray-500" },
    { value: "fidic_green", labelEn: "FIDIC Green Book (Short Form)", labelAr: "فيديك الكتاب الأخضر (النموذج القصير)", color: "bg-green-500" },
    { value: "fidic_pink", labelEn: "FIDIC Pink Book (MDB)", labelAr: "فيديك الكتاب الوردي (بنوك التنمية)", color: "bg-pink-500" },
    { value: "fixed_price", labelEn: "Fixed Price", labelAr: "سعر ثابت", color: "bg-blue-500" },
    { value: "cost_plus", labelEn: "Cost Plus", labelAr: "التكلفة زائد", color: "bg-indigo-500" },
    { value: "time_materials", labelEn: "Time & Materials", labelAr: "الوقت والمواد", color: "bg-purple-500" },
    { value: "unit_price", labelEn: "Unit Price", labelAr: "سعر الوحدة", color: "bg-cyan-500" },
    { value: "lump_sum", labelEn: "Lump Sum", labelAr: "مبلغ مقطوع", color: "bg-teal-500" },
  ];

  const statuses = [
    { value: "draft", labelEn: "Draft", labelAr: "مسودة", color: "bg-gray-500" },
    { value: "pending", labelEn: "Pending Approval", labelAr: "بانتظار الموافقة", color: "bg-yellow-500" },
    { value: "active", labelEn: "Active", labelAr: "نشط", color: "bg-green-500" },
    { value: "on_hold", labelEn: "On Hold", labelAr: "معلق", color: "bg-orange-500" },
    { value: "completed", labelEn: "Completed", labelAr: "مكتمل", color: "bg-blue-500" },
    { value: "terminated", labelEn: "Terminated", labelAr: "منتهي", color: "bg-red-500" },
  ];

  const fetchContracts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user, projectId]);

  // Auto-calculate contract duration when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const months = differenceInMonths(end, start);
      setFormData(prev => ({ ...prev, contract_duration_months: months.toString() }));
    }
  }, [formData.start_date, formData.end_date]);

  // Auto-calculate performance bond value when percentage or contract value changes
  useEffect(() => {
    if (formData.contract_value && formData.performance_bond_percentage) {
      const value = parseFloat(formData.contract_value);
      const percentage = parseFloat(formData.performance_bond_percentage);
      if (!isNaN(value) && !isNaN(percentage)) {
        const bondValue = (value * percentage / 100).toFixed(2);
        setFormData(prev => ({ ...prev, performance_bond_value: bondValue }));
      }
    }
  }, [formData.contract_value, formData.performance_bond_percentage]);

  // Filtered contracts based on search and filters
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch = searchTerm === "" || 
        contract.contract_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      const matchesType = typeFilter === "all" || contract.contract_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contracts, searchTerm, statusFilter, typeFilter]);

  const handleSave = async () => {
    if (!user || !formData.contract_number || !formData.contract_title) return;
    setSaving(true);
    try {
      const contractData = {
        user_id: user.id,
        project_id: projectId || null,
        contract_number: formData.contract_number,
        contract_title: formData.contract_title,
        contractor_name: formData.contractor_name || null,
        contractor_license_number: formData.contractor_license_number || null,
        contractor_phone: formData.contractor_phone || null,
        contractor_email: formData.contractor_email || null,
        contractor_address: formData.contractor_address || null,
        contractor_category: formData.contractor_category || null,
        contract_type: formData.contract_type,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        currency: formData.currency,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        retention_percentage: formData.retention_percentage ? parseFloat(formData.retention_percentage) : null,
        advance_payment_percentage: formData.advance_payment_percentage ? parseFloat(formData.advance_payment_percentage) : null,
        performance_bond_percentage: formData.performance_bond_percentage ? parseFloat(formData.performance_bond_percentage) : null,
        performance_bond_value: formData.performance_bond_value ? parseFloat(formData.performance_bond_value) : null,
        variation_limit_percentage: formData.variation_limit_percentage ? parseFloat(formData.variation_limit_percentage) : null,
        contract_duration_months: formData.contract_duration_months ? parseInt(formData.contract_duration_months) : null,
        payment_terms: formData.payment_terms || null,
        scope_of_work: formData.scope_of_work || null,
        notes: formData.notes || null,
      };

      if (editingContract) {
        const { error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", editingContract.id);
        if (error) throw error;
        toast({ title: isArabic ? "تم التحديث" : "Updated" });
      } else {
        const { error } = await supabase.from("contracts").insert(contractData);
        if (error) throw error;
        toast({ title: isArabic ? "تمت الإضافة" : "Added" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContracts();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({ title: isArabic ? "خطأ" : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: isArabic ? "تم الحذف" : "Deleted" });
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      contract_number: "",
      contract_title: "",
      contract_type: "fixed_price",
      status: "draft",
      contractor_name: "",
      contractor_license_number: "",
      contractor_phone: "",
      contractor_email: "",
      contractor_address: "",
      contractor_category: "first",
      contract_value: "",
      currency: "SAR",
      start_date: "",
      end_date: "",
      contract_duration_months: "",
      retention_percentage: "10",
      advance_payment_percentage: "20",
      performance_bond_percentage: "5",
      performance_bond_value: "",
      variation_limit_percentage: "15",
      payment_terms: "",
      scope_of_work: "",
      notes: "",
    });
    setEditingContract(null);
    setCurrentStep(1);
  };

  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      contract_number: contract.contract_number,
      contract_title: contract.contract_title,
      contract_type: contract.contract_type,
      status: contract.status,
      contractor_name: contract.contractor_name || "",
      contractor_license_number: contract.contractor_license_number || "",
      contractor_phone: contract.contractor_phone || "",
      contractor_email: contract.contractor_email || "",
      contractor_address: contract.contractor_address || "",
      contractor_category: contract.contractor_category || "first",
      contract_value: contract.contract_value?.toString() || "",
      currency: contract.currency,
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      contract_duration_months: contract.contract_duration_months?.toString() || "",
      retention_percentage: contract.retention_percentage?.toString() || "10",
      advance_payment_percentage: contract.advance_payment_percentage?.toString() || "20",
      performance_bond_percentage: contract.performance_bond_percentage?.toString() || "5",
      performance_bond_value: contract.performance_bond_value?.toString() || "",
      variation_limit_percentage: contract.variation_limit_percentage?.toString() || "15",
      payment_terms: contract.payment_terms || "",
      scope_of_work: contract.scope_of_work || "",
      notes: contract.notes || "",
    });
    setCurrentStep(1);
    setIsDialogOpen(true);
  };

  const openViewDialog = (contract: Contract) => {
    setViewingContract(contract);
    setIsViewDialogOpen(true);
  };

  const getContractProgress = (contract: Contract) => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getDaysRemaining = (contract: Contract) => {
    if (!contract.end_date) return null;
    return differenceInDays(new Date(contract.end_date), new Date());
  };

  const getContractTypeInfo = (type: string) => {
    return contractTypes.find(t => t.value === type);
  };

  const totalValue = filteredContracts.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const activeContracts = filteredContracts.filter((c) => c.status === "active").length;

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency === "SAR" ? "SAR" : currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return formData.contract_number && formData.contract_title;
      default:
        return true;
    }
  };

  // AI content generation function
  const generateWithAI = async (field: 'payment_terms' | 'scope_of_work' | 'notes') => {
    setGeneratingField(field);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-content', {
        body: {
          field,
          contract_type: formData.contract_type,
          contract_title: formData.contract_title,
          contractor_category: formData.contractor_category,
          language: isArabic ? 'ar' : 'en'
        }
      });
      
      if (error) throw error;
      
      if (data?.content) {
        setFormData(prev => ({
          ...prev,
          [field]: data.content
        }));
        
        toast({
          title: isArabic ? "تم التوليد بنجاح" : "Generated successfully",
          description: isArabic ? "يمكنك تعديل المحتوى حسب الحاجة" : "You can edit the content as needed"
        });
      }
    } catch (err) {
      console.error("AI generation error:", err);
      toast({
        title: isArabic ? "خطأ في التوليد" : "Generation failed",
        description: isArabic ? "حاول مرة أخرى" : "Please try again",
        variant: "destructive"
      });
    } finally {
      setGeneratingField(null);
    }
  };

  // Translate existing content
  const translateContent = async (field: 'payment_terms' | 'scope_of_work' | 'notes') => {
    const currentValue = formData[field];
    if (!currentValue) {
      toast({
        title: isArabic ? "لا يوجد محتوى" : "No content",
        description: isArabic ? "أضف محتوى أولاً" : "Add content first",
        variant: "destructive"
      });
      return;
    }
    
    setGeneratingField(field);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-content', {
        body: {
          field,
          contract_type: formData.contract_type,
          contract_title: formData.contract_title,
          contractor_category: formData.contractor_category,
          language: isArabic ? 'en' : 'ar' // Toggle to opposite language
        }
      });
      
      if (error) throw error;
      
      if (data?.content) {
        setFormData(prev => ({
          ...prev,
          [field]: data.content
        }));
        
        toast({
          title: isArabic ? "تم الترجمة" : "Translated",
          description: isArabic ? "تم تحويل المحتوى للإنجليزية" : "Content converted to Arabic"
        });
      }
    } catch (err) {
      console.error("Translation error:", err);
      toast({
        title: isArabic ? "خطأ" : "Error",
        variant: "destructive"
      });
    } finally {
      setGeneratingField(null);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "رقم العقد *" : "Contract Number *"}</Label>
                <Input
                  value={formData.contract_number}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  placeholder={isArabic ? "مثال: CON-2024-001" : "e.g., CON-2024-001"}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "الحالة" : "Status"}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", s.color)} />
                          {isArabic ? s.labelAr : s.labelEn}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "عنوان العقد *" : "Contract Title *"}</Label>
              <Input
                value={formData.contract_title}
                onChange={(e) => setFormData({ ...formData, contract_title: e.target.value })}
                placeholder={isArabic ? "أدخل عنوان العقد" : "Enter contract title"}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? "نوع العقد" : "Contract Type"}</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", t.color)} />
                        {isArabic ? t.labelAr : t.labelEn}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {isArabic ? "اسم المقاول" : "Contractor Name"}
                </Label>
                <Input
                  value={formData.contractor_name}
                  onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                  placeholder={isArabic ? "اسم المقاول" : "Contractor name"}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {isArabic ? "رقم الترخيص" : "License Number"}
                </Label>
                <Input
                  value={formData.contractor_license_number}
                  onChange={(e) => setFormData({ ...formData, contractor_license_number: e.target.value })}
                  placeholder={isArabic ? "رقم الترخيص" : "License number"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {isArabic ? "رقم الهاتف" : "Phone Number"}
                </Label>
                <Input
                  value={formData.contractor_phone}
                  onChange={(e) => setFormData({ ...formData, contractor_phone: e.target.value })}
                  placeholder={isArabic ? "رقم الهاتف" : "Phone number"}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {isArabic ? "البريد الإلكتروني" : "Email"}
                </Label>
                <Input
                  type="email"
                  value={formData.contractor_email}
                  onChange={(e) => setFormData({ ...formData, contractor_email: e.target.value })}
                  placeholder={isArabic ? "البريد الإلكتروني" : "Email address"}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {isArabic ? "تصنيف المقاول" : "Contractor Category"}
                </Label>
                <Select
                  value={formData.contractor_category}
                  onValueChange={(v) => setFormData({ ...formData, contractor_category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractorCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {isArabic ? c.labelAr : c.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {isArabic ? "العنوان" : "Address"}
                </Label>
                <Input
                  value={formData.contractor_address}
                  onChange={(e) => setFormData({ ...formData, contractor_address: e.target.value })}
                  placeholder={isArabic ? "عنوان المقاول" : "Contractor address"}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {isArabic ? "قيمة العقد" : "Contract Value"}
                </Label>
                <Input
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? "العملة" : "Currency"}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - ريال سعودي</SelectItem>
                    <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                    <SelectItem value="EUR">EUR - يورو</SelectItem>
                    <SelectItem value="AED">AED - درهم إماراتي</SelectItem>
                    <SelectItem value="EGP">EGP - جنيه مصري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {isArabic ? "تاريخ البدء" : "Start Date"}
                </Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {isArabic ? "تاريخ الانتهاء" : "End Date"}
                </Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{isArabic ? "مدة العقد:" : "Contract Duration:"}</span>
                <span className="font-medium">
                  {formData.contract_duration_months 
                    ? `${formData.contract_duration_months} ${isArabic ? "شهر" : "months"}`
                    : isArabic ? "حدد التواريخ" : "Set dates"}
                </span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  {isArabic ? "نسبة المحتجز (%)" : "Retention (%)"}
                </Label>
                <Input
                  type="number"
                  value={formData.retention_percentage}
                  onChange={(e) => setFormData({ ...formData, retention_percentage: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  {isArabic ? "نسبة الدفعة المقدمة (%)" : "Advance Payment (%)"}
                </Label>
                <Input
                  type="number"
                  value={formData.advance_payment_percentage}
                  onChange={(e) => setFormData({ ...formData, advance_payment_percentage: e.target.value })}
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {isArabic ? "نسبة الضمان النهائي (%)" : "Performance Bond (%)"}
                </Label>
                <Input
                  type="number"
                  value={formData.performance_bond_percentage}
                  onChange={(e) => setFormData({ ...formData, performance_bond_percentage: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {isArabic ? "قيمة الضمان (حساب تلقائي)" : "Bond Value (auto)"}
                </Label>
                <Input
                  type="number"
                  value={formData.performance_bond_value}
                  onChange={(e) => setFormData({ ...formData, performance_bond_value: e.target.value })}
                  placeholder="0"
                  className="bg-muted/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                {isArabic ? "حد التغييرات (%)" : "Variation Limit (%)"}
              </Label>
              <Input
                type="number"
                value={formData.variation_limit_percentage}
                onChange={(e) => setFormData({ ...formData, variation_limit_percentage: e.target.value })}
                placeholder="15"
              />
            </div>

            {formData.contract_value && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                <h4 className="font-medium text-sm">{isArabic ? "ملخص الحسابات" : "Calculations Summary"}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? "المحتجز:" : "Retention:"}</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(formData.contract_value) * parseFloat(formData.retention_percentage || "0") / 100, formData.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? "الدفعة المقدمة:" : "Advance:"}</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(formData.contract_value) * parseFloat(formData.advance_payment_percentage || "0") / 100, formData.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Payment Terms */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "شروط الدفع" : "Payment Terms"}</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateWithAI('payment_terms')}
                    disabled={generatingField !== null}
                    className="h-7 gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    {generatingField === 'payment_terms' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isArabic ? "توليد AI" : "AI Generate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => translateContent('payment_terms')}
                    disabled={generatingField !== null || !formData.payment_terms}
                    className="h-7 gap-1 text-xs"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {isArabic ? "EN" : "عربي"}
                  </Button>
                </div>
              </div>
              <Textarea
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                rows={3}
                placeholder={isArabic ? "أدخل شروط الدفع..." : "Enter payment terms..."}
                disabled={generatingField === 'payment_terms'}
              />
            </div>

            {/* Scope of Work */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "نطاق العمل" : "Scope of Work"}</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateWithAI('scope_of_work')}
                    disabled={generatingField !== null}
                    className="h-7 gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    {generatingField === 'scope_of_work' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isArabic ? "توليد AI" : "AI Generate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => translateContent('scope_of_work')}
                    disabled={generatingField !== null || !formData.scope_of_work}
                    className="h-7 gap-1 text-xs"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {isArabic ? "EN" : "عربي"}
                  </Button>
                </div>
              </div>
              <Textarea
                value={formData.scope_of_work}
                onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                rows={4}
                placeholder={isArabic ? "أدخل نطاق العمل..." : "Enter scope of work..."}
                disabled={generatingField === 'scope_of_work'}
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "ملاحظات إضافية" : "Additional Notes"}</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => generateWithAI('notes')}
                    disabled={generatingField !== null}
                    className="h-7 gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    {generatingField === 'notes' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isArabic ? "توليد AI" : "AI Generate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => translateContent('notes')}
                    disabled={generatingField !== null || !formData.notes}
                    className="h-7 gap-1 text-xs"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {isArabic ? "EN" : "عربي"}
                  </Button>
                </div>
              </div>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder={isArabic ? "أي ملاحظات إضافية..." : "Any additional notes..."}
                disabled={generatingField === 'notes'}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>{isArabic ? "إدارة العقود" : "Contract Management"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isArabic ? "إدارة ومتابعة العقود" : "Manage and track contracts"}
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            {isArabic ? "إضافة عقد" : "Add Contract"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث بالاسم أو الرقم..." : "Search by name or number..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={isArabic ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "جميع الحالات" : "All Statuses"}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {isArabic ? s.labelAr : s.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={isArabic ? "النوع" : "Type"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "جميع الأنواع" : "All Types"}</SelectItem>
              {contractTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {isArabic ? t.labelAr : t.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-2xl font-bold">{filteredContracts.length}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "العقود المعروضة" : "Showing"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold text-green-600">{activeContracts}</div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "عقود نشطة" : "Active"}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 col-span-2">
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(totalValue, "SAR")}
            </div>
            <div className="text-xs text-muted-foreground">
              {isArabic ? "إجمالي القيمة" : "Total Value"}
            </div>
          </div>
        </div>

        {/* Contracts List */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد عقود مطابقة" : "No matching contracts"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract) => {
              const status = statuses.find((s) => s.value === contract.status);
              const contractType = getContractTypeInfo(contract.contract_type);
              const progress = getContractProgress(contract);
              const daysRemaining = getDaysRemaining(contract);
              const category = contractorCategories.find(c => c.value === contract.contractor_category);

              return (
                <div key={contract.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {contract.contract_number}
                        </Badge>
                        <Badge className={cn("text-white text-xs", status?.color)}>
                          {isArabic ? status?.labelAr : status?.labelEn}
                        </Badge>
                        {contractType && (
                          <Badge variant="secondary" className={cn("text-xs text-white", contractType.color)}>
                            {contract.contract_type.startsWith("fidic_") ? "FIDIC" : ""}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium">{contract.contract_title}</h4>
                      {contract.contractor_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Building2 className="w-3 h-3" />
                          <span>{contract.contractor_name}</span>
                          {category && (
                            <Badge variant="outline" className="text-xs">
                              {isArabic ? category.labelAr : category.labelEn}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(contract)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(contract)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(contract.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    {contract.contract_value && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(contract.contract_value, contract.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs">
                        {contractType?.[isArabic ? "labelAr" : "labelEn"]}
                      </span>
                    </div>
                    {contract.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {format(new Date(contract.start_date), "PP", { locale: isArabic ? ar : enUS })}
                        </span>
                      </div>
                    )}
                    {daysRemaining !== null && (
                      <div className={cn("flex items-center gap-1", daysRemaining < 0 ? "text-red-600" : daysRemaining < 30 ? "text-orange-600" : "")}>
                        <Clock className="w-4 h-4" />
                        <span>
                          {daysRemaining < 0
                            ? isArabic ? `متأخر ${Math.abs(daysRemaining)} يوم` : `${Math.abs(daysRemaining)} days overdue`
                            : isArabic ? `${daysRemaining} يوم متبقي` : `${daysRemaining} days left`}
                        </span>
                      </div>
                    )}
                  </div>

                  {contract.start_date && contract.end_date && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{isArabic ? "التقدم الزمني" : "Time Progress"}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* View Contract Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {isArabic ? "تفاصيل العقد" : "Contract Details"}
            </DialogTitle>
          </DialogHeader>
          
          {viewingContract && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm">
                    {viewingContract.contract_number}
                  </Badge>
                  <Badge className={cn("text-white", statuses.find(s => s.value === viewingContract.status)?.color)}>
                    {isArabic ? statuses.find(s => s.value === viewingContract.status)?.labelAr : statuses.find(s => s.value === viewingContract.status)?.labelEn}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-semibold">{viewingContract.contract_title}</h3>
                
                <Separator />
                
                {/* Contractor Info */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {isArabic ? "بيانات المقاول" : "Contractor Information"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">{isArabic ? "الاسم" : "Name"}</Label>
                      <p className="font-medium">{viewingContract.contractor_name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{isArabic ? "التصنيف" : "Category"}</Label>
                      <p className="font-medium">
                        {contractorCategories.find(c => c.value === viewingContract.contractor_category)?.[isArabic ? "labelAr" : "labelEn"] || "-"}
                      </p>
                    </div>
                    {viewingContract.contractor_phone && (
                      <div>
                        <Label className="text-muted-foreground">{isArabic ? "الهاتف" : "Phone"}</Label>
                        <p className="font-medium">{viewingContract.contractor_phone}</p>
                      </div>
                    )}
                    {viewingContract.contractor_email && (
                      <div>
                        <Label className="text-muted-foreground">{isArabic ? "البريد" : "Email"}</Label>
                        <p className="font-medium">{viewingContract.contractor_email}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{isArabic ? "نوع العقد" : "Contract Type"}</Label>
                    <p className="font-medium">{getContractTypeInfo(viewingContract.contract_type)?.[isArabic ? "labelAr" : "labelEn"]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{isArabic ? "القيمة" : "Value"}</Label>
                    <p className="font-medium text-lg text-primary">
                      {viewingContract.contract_value ? formatCurrency(viewingContract.contract_value, viewingContract.currency) : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{isArabic ? "تاريخ البدء" : "Start Date"}</Label>
                    <p className="font-medium">
                      {viewingContract.start_date ? format(new Date(viewingContract.start_date), "PPP", { locale: isArabic ? ar : enUS }) : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{isArabic ? "تاريخ الانتهاء" : "End Date"}</Label>
                    <p className="font-medium">
                      {viewingContract.end_date ? format(new Date(viewingContract.end_date), "PPP", { locale: isArabic ? ar : enUS }) : "-"}
                    </p>
                  </div>
                </div>

                {/* Financial Terms */}
                {(viewingContract.retention_percentage || viewingContract.advance_payment_percentage) && (
                  <>
                    <Separator />
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <h4 className="font-medium mb-3">{isArabic ? "الشروط المالية" : "Financial Terms"}</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">{isArabic ? "المحتجز" : "Retention"}</Label>
                          <p className="font-medium">{viewingContract.retention_percentage}%</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{isArabic ? "الدفعة المقدمة" : "Advance"}</Label>
                          <p className="font-medium">{viewingContract.advance_payment_percentage}%</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">{isArabic ? "الضمان" : "Bond"}</Label>
                          <p className="font-medium">{viewingContract.performance_bond_percentage}%</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {viewingContract.start_date && viewingContract.end_date && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{isArabic ? "التقدم الزمني" : "Time Progress"}</Label>
                      <Progress value={getContractProgress(viewingContract)} className="h-3" />
                      <p className="text-sm text-muted-foreground text-center">
                        {getContractProgress(viewingContract).toFixed(0)}%
                      </p>
                    </div>
                  </>
                )}
                
                {viewingContract.scope_of_work && (
                  <div>
                    <Label className="text-muted-foreground">{isArabic ? "نطاق العمل" : "Scope of Work"}</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{viewingContract.scope_of_work}</p>
                  </div>
                )}
                
                {viewingContract.notes && (
                  <div>
                    <Label className="text-muted-foreground">{isArabic ? "ملاحظات" : "Notes"}</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{viewingContract.notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {isArabic ? "إغلاق" : "Close"}
            </Button>
            <Button onClick={() => { setIsViewDialogOpen(false); viewingContract && openEditDialog(viewingContract); }}>
              <Edit className="w-4 h-4 mr-2" />
              {isArabic ? "تعديل" : "Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog - Multi-Step Wizard */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingContract
                ? isArabic ? "تعديل العقد" : "Edit Contract"
                : isArabic ? "إضافة عقد جديد" : "Add New Contract"}
            </DialogTitle>
          </DialogHeader>

          {/* Step Progress */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              {WIZARD_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                        isActive && "border-primary bg-primary text-primary-foreground",
                        isCompleted && "border-green-500 bg-green-500 text-white",
                        !isActive && !isCompleted && "border-muted-foreground/30"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    {index < WIZARD_STEPS.length - 1 && (
                      <div className={cn(
                        "w-full h-1 mx-2 rounded",
                        isCompleted ? "bg-green-500" : "bg-muted"
                      )} style={{ width: '40px' }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {WIZARD_STEPS.map((step) => (
                <span key={step.id} className={cn(
                  "text-center",
                  currentStep === step.id && "text-primary font-medium"
                )}>
                  {isArabic ? step.labelAr : step.labelEn}
                </span>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 px-1">
            {renderStepContent()}
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
            <div className="flex gap-2 w-full sm:w-auto">
              {currentStep > 1 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {isArabic ? "السابق" : "Previous"}
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep < WIZARD_STEPS.length ? (
                <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canGoNext()}>
                  {isArabic ? "التالي" : "Next"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving || !formData.contract_number || !formData.contract_title}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="ml-2">{isArabic ? "حفظ" : "Save"}</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
