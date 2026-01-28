import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, ArrowLeft, Briefcase, Building2, DollarSign, FileText, Loader2, Home, MapPin, Users, CalendarIcon, Clock, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const currencies = [
  { value: "SAR", label: { ar: "ريال سعودي (SAR)", en: "Saudi Riyal (SAR)" } },
  { value: "USD", label: { ar: "دولار أمريكي (USD)", en: "US Dollar (USD)" } },
  { value: "EUR", label: { ar: "يورو (EUR)", en: "Euro (EUR)" } },
  { value: "AED", label: { ar: "درهم إماراتي (AED)", en: "UAE Dirham (AED)" } },
  { value: "EGP", label: { ar: "جنيه مصري (EGP)", en: "Egyptian Pound (EGP)" } },
  { value: "QAR", label: { ar: "ريال قطري (QAR)", en: "Qatari Riyal (QAR)" } },
  { value: "KWD", label: { ar: "دينار كويتي (KWD)", en: "Kuwaiti Dinar (KWD)" } },
  { value: "BHD", label: { ar: "دينار بحريني (BHD)", en: "Bahraini Dinar (BHD)" } },
  { value: "OMR", label: { ar: "ريال عماني (OMR)", en: "Omani Rial (OMR)" } },
];

const projectTypes = [
  { value: "construction", label: { ar: "إنشاءات", en: "Construction" } },
  { value: "infrastructure", label: { ar: "بنية تحتية", en: "Infrastructure" } },
  { value: "residential", label: { ar: "سكني", en: "Residential" } },
  { value: "commercial", label: { ar: "تجاري", en: "Commercial" } },
  { value: "industrial", label: { ar: "صناعي", en: "Industrial" } },
  { value: "renovation", label: { ar: "تجديد", en: "Renovation" } },
  { value: "other", label: { ar: "أخرى", en: "Other" } },
];

const projectStatuses = [
  { value: "draft", label: { ar: "مسودة", en: "Draft" } },
  { value: "planning", label: { ar: "تخطيط", en: "Planning" } },
  { value: "in_progress", label: { ar: "قيد التنفيذ", en: "In Progress" } },
  { value: "on_hold", label: { ar: "معلق", en: "On Hold" } },
];

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "SAR",
    projectType: "construction",
    location: "",
    clientName: "",
    estimatedValue: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    status: "draft",
  });

  const handleInputChange = (field: string, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate duration in days
  const durationDays = formData.startDate && formData.endDate 
    ? Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: isArabic ? "يرجى تسجيل الدخول" : "Please sign in",
        description: isArabic 
          ? "يجب تسجيل الدخول لإنشاء مشروع جديد"
          : "You must be signed in to create a project",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    if (!formData.name.trim()) {
      toast({
        title: isArabic ? "اسم المشروع مطلوب" : "Project name required",
        description: isArabic 
          ? "يرجى إدخال اسم للمشروع"
          : "Please enter a project name",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const projectData = {
        name: formData.name.trim(),
        user_id: user.id,
        status: formData.status,
        analysis_data: {
          items: [],
          summary: {
            total_items: 0,
            total_value: 0,
            currency: formData.currency,
            categories: [],
          },
          project_info: {
            type: formData.projectType,
            location: formData.location,
            client_name: formData.clientName,
            description: formData.description,
            estimated_value: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
            start_date: formData.startDate?.toISOString() || null,
            end_date: formData.endDate?.toISOString() || null,
          },
          created_at: new Date().toISOString(),
        },
        wbs_data: null,
      };
      
      const { data, error } = await supabase
        .from("saved_projects")
        .insert(projectData)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: isArabic ? "تم إنشاء المشروع" : "Project Created",
        description: isArabic 
          ? "تم إنشاء المشروع بنجاح، يمكنك الآن إضافة بنود BOQ"
          : "Project created successfully, you can now add BOQ items",
      });
      
      navigate(`/projects/${data.id}`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: isArabic ? "خطأ في إنشاء المشروع" : "Error creating project",
        description: error.message || (isArabic ? "حدث خطأ غير متوقع" : "An unexpected error occurred"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb className="breadcrumb-safe">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1 relative z-[46] pointer-events-auto">
                  <Home className="w-4 h-4" />
                  {isArabic ? "الرئيسية" : "Home"}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/projects" className="relative z-[46] pointer-events-auto">{isArabic ? "المشاريع" : "Projects"}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{isArabic ? "مشروع جديد" : "New Project"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Page Header - Enhanced */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/projects")} 
            className="relative z-[51] pointer-events-auto bg-background/80 hover:bg-background"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              {isArabic ? "إنشاء مشروع جديد" : "Create New Project"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArabic 
                ? "قم بإنشاء مشروع فارغ وأضف بنود BOQ لاحقاً"
                : "Create an empty project and add BOQ items later"}
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card className="form-card-safe border-2 hover:border-primary/30 transition-colors shadow-lg">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-primary/10 rounded">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                {isArabic ? "معلومات المشروع" : "Project Information"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isArabic 
                  ? "أدخل المعلومات الأساسية للمشروع"
                  : "Enter basic project information"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 pt-6">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
                  <FileText className="w-4 h-4" />
                  {isArabic ? "المعلومات الأساسية" : "Basic Information"}
                </h3>
                
                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1 font-medium">
                    <FileText className="w-4 h-4 text-primary" />
                    {isArabic ? "اسم المشروع *" : "Project Name *"}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder={isArabic ? "مثال: مشروع بناء مجمع سكني" : "e.g., Residential Complex Construction"}
                    required
                    className="h-11 text-base"
                  />
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-medium">
                    {isArabic ? "وصف المشروع" : "Project Description"}
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder={isArabic ? "وصف مختصر للمشروع..." : "Brief project description..."}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              
              {/* Section 2: Classification & Currency */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
                  <Building2 className="w-4 h-4" />
                  {isArabic ? "التصنيف والعملة" : "Classification & Currency"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Currency */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 font-medium">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      {isArabic ? "العملة" : "Currency"}
                    </Label>
                    <Select value={formData.currency} onValueChange={(v) => handleInputChange("currency", v)}>
                      <SelectTrigger className="relative z-[55] pointer-events-auto h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            {isArabic ? c.label.ar : c.label.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Project Type */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 font-medium">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      {isArabic ? "نوع المشروع" : "Project Type"}
                    </Label>
                    <Select value={formData.projectType} onValueChange={(v) => handleInputChange("projectType", v)}>
                      <SelectTrigger className="relative z-[55] pointer-events-auto h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {isArabic ? t.label.ar : t.label.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Section 3: Dates & Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
                  <CalendarIcon className="w-4 h-4" />
                  {isArabic ? "التواريخ والجدول الزمني" : "Dates & Timeline"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 font-medium">
                      <CalendarIcon className="w-4 h-4 text-blue-500" />
                      {isArabic ? "تاريخ البدء" : "Start Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 relative z-[55] pointer-events-auto",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(formData.startDate, "PPP", { locale: isArabic ? ar : enUS })
                          ) : (
                            <span>{isArabic ? "اختر تاريخ البدء" : "Pick start date"}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => handleInputChange("startDate", date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* End Date */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 font-medium">
                      <CalendarIcon className="w-4 h-4 text-red-500" />
                      {isArabic ? "تاريخ الانتهاء المتوقع" : "Expected End Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "w-full justify-start text-left font-normal h-11 relative z-[55] pointer-events-auto",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {formData.endDate ? (
                            format(formData.endDate, "PPP", { locale: isArabic ? ar : enUS })
                          ) : (
                            <span>{isArabic ? "اختر تاريخ الانتهاء" : "Pick end date"}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => handleInputChange("endDate", date)}
                          disabled={(date) => formData.startDate ? date < formData.startDate : false}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Duration Indicator */}
                {durationDays !== null && durationDays > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {isArabic ? "المدة المتوقعة:" : "Expected Duration:"}
                    </span>
                    <span className="text-primary font-semibold">
                      {durationDays} {isArabic ? "يوم" : "days"}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Section 4: Location & Client */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-4 h-4" />
                  {isArabic ? "الموقع والعميل" : "Location & Client"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 font-medium">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      {isArabic ? "موقع المشروع" : "Project Location"}
                    </Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder={isArabic ? "المدينة، المنطقة" : "City, Region"}
                      className="h-11"
                    />
                  </div>
                  
                  {/* Client Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 font-medium">
                      <Users className="w-4 h-4 text-purple-500" />
                      {isArabic ? "اسم العميل" : "Client Name"}
                    </Label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => handleInputChange("clientName", e.target.value)}
                      placeholder={isArabic ? "اسم العميل أو الشركة" : "Client or company name"}
                      className="h-11"
                    />
                  </div>
                </div>
                
                {/* Project Status */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 font-medium">
                    <Flag className="w-4 h-4 text-indigo-500" />
                    {isArabic ? "حالة المشروع" : "Project Status"}
                  </Label>
                  <Select value={formData.status} onValueChange={(v) => handleInputChange("status", v)}>
                    <SelectTrigger className="relative z-[55] pointer-events-auto h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStatuses.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {isArabic ? s.label.ar : s.label.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Section 5: Financial Value */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 border-b pb-2">
                  <DollarSign className="w-4 h-4" />
                  {isArabic ? "القيمة المالية" : "Financial Value"}
                </h3>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 font-medium">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    {isArabic ? "القيمة التقديرية" : "Estimated Value"}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => handleInputChange("estimatedValue", e.target.value)}
                      placeholder="0"
                      className="pe-20 h-11 text-lg font-medium"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm font-medium px-2 py-1 bg-muted rounded text-muted-foreground">
                      {formData.currency}
                    </span>
                  </div>
                  {formData.estimatedValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ {Number(formData.estimatedValue).toLocaleString(isArabic ? 'ar-SA' : 'en-US')} {formData.currency}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions - Enhanced with protection */}
          <div className="flex justify-end gap-4 mt-6 form-actions-safe">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/projects")}
              disabled={isLoading}
              className="relative z-[65] pointer-events-auto min-w-[100px]"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="gap-2 relative z-[65] pointer-events-auto min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? "جاري الإنشاء..." : "Creating..."}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {isArabic ? "إنشاء المشروع" : "Create Project"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
