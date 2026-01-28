import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, ArrowLeft, Briefcase, Building2, DollarSign, FileText, Loader2, Home } from "lucide-react";
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
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        status: "draft",
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
      <div className="max-w-2xl mx-auto space-y-6">
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
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="relative z-[51] pointer-events-auto">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" />
              {isArabic ? "إنشاء مشروع جديد" : "Create New Project"}
            </h1>
            <p className="text-muted-foreground">
              {isArabic 
                ? "قم بإنشاء مشروع فارغ وأضف بنود BOQ لاحقاً"
                : "Create an empty project and add BOQ items later"}
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card className="form-card-safe">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                {isArabic ? "معلومات المشروع" : "Project Information"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? "أدخل المعلومات الأساسية للمشروع"
                  : "Enter basic project information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {isArabic ? "اسم المشروع *" : "Project Name *"}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder={isArabic ? "مثال: مشروع بناء مجمع سكني" : "e.g., Residential Complex Construction"}
                  required
                />
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {isArabic ? "وصف المشروع" : "Project Description"}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder={isArabic ? "وصف مختصر للمشروع..." : "Brief project description..."}
                  rows={3}
                />
              </div>
              
              {/* Currency & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {isArabic ? "العملة" : "Currency"}
                  </Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => handleInputChange("currency", v)}
                  >
                    <SelectTrigger className="relative z-[55] pointer-events-auto">
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
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {isArabic ? "نوع المشروع" : "Project Type"}
                  </Label>
                  <Select 
                    value={formData.projectType} 
                    onValueChange={(v) => handleInputChange("projectType", v)}
                  >
                    <SelectTrigger className="relative z-[55] pointer-events-auto">
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
              
              {/* Location & Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "موقع المشروع" : "Project Location"}</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder={isArabic ? "المدينة، المنطقة" : "City, Region"}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم العميل" : "Client Name"}</Label>
                  <Input
                    value={formData.clientName}
                    onChange={(e) => handleInputChange("clientName", e.target.value)}
                    placeholder={isArabic ? "اسم العميل أو الشركة" : "Client or company name"}
                  />
                </div>
              </div>
              
              {/* Estimated Value */}
              <div className="space-y-2">
                <Label>{isArabic ? "القيمة التقديرية" : "Estimated Value"}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => handleInputChange("estimatedValue", e.target.value)}
                    placeholder="0"
                    className="pe-16"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {formData.currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex justify-end gap-4 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/projects")}
              disabled={isLoading}
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
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
