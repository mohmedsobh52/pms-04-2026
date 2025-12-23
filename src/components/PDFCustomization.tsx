import { useState, useRef } from "react";
import { Image, Building2, Phone, Mail, Globe, MapPin, Save, X, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface CompanyInfo {
  name: string;
  nameAr?: string;
  logo?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  addressAr?: string;
  taxNumber?: string;
  crNumber?: string;
}

interface PDFCustomizationProps {
  companyInfo: CompanyInfo;
  onSave: (info: CompanyInfo) => void;
  trigger?: React.ReactNode;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "",
  nameAr: "",
  logo: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  addressAr: "",
  taxNumber: "",
  crNumber: "",
};

export function PDFCustomization({ companyInfo, onSave, trigger }: PDFCustomizationProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<CompanyInfo>(companyInfo || DEFAULT_COMPANY_INFO);
  const [showArabic, setShowArabic] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "يرجى اختيار ملف صورة" : "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حجم الصورة يجب أن يكون أقل من 2 ميجابايت" : "Image size should be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setInfo(prev => ({ ...prev, logo: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setInfo(prev => ({ ...prev, logo: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    // Save to localStorage for persistence
    localStorage.setItem("boq_company_info", JSON.stringify(info));
    onSave(info);
    setOpen(false);
    toast({
      title: isArabic ? "تم الحفظ" : "Saved",
      description: isArabic ? "تم حفظ معلومات الشركة بنجاح" : "Company information saved successfully",
    });
  };

  const handleReset = () => {
    setInfo(DEFAULT_COMPANY_INFO);
    localStorage.removeItem("boq_company_info");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Building2 className="w-4 h-4" />
            {isArabic ? "تخصيص التقرير" : "Customize Report"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isArabic ? "تخصيص تقرير PDF" : "Customize PDF Report"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="w-4 h-4" />
                {isArabic ? "شعار الشركة" : "Company Logo"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {info.logo ? (
                  <div className="relative">
                    <img 
                      src={info.logo} 
                      alt="Company Logo" 
                      className="w-24 h-24 object-contain border rounded-lg bg-white p-2"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs text-center">
                      {isArabic ? "رفع الشعار" : "Upload Logo"}
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="text-sm text-muted-foreground">
                  <p>{isArabic ? "الصيغ المدعومة: PNG, JPG, SVG" : "Supported: PNG, JPG, SVG"}</p>
                  <p>{isArabic ? "الحد الأقصى: 2 ميجابايت" : "Max size: 2MB"}</p>
                  <p>{isArabic ? "الأبعاد الموصى بها: 200×200 بكسل" : "Recommended: 200×200px"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Name */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {isArabic ? "اسم الشركة" : "Company Name"}
              </Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="show-arabic" className="text-sm text-muted-foreground">
                  {isArabic ? "إظهار العربية" : "Show Arabic"}
                </Label>
                <Switch
                  id="show-arabic"
                  checked={showArabic}
                  onCheckedChange={setShowArabic}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                <Input
                  value={info.name}
                  onChange={(e) => setInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Company Name"
                />
              </div>
              {showArabic && (
                <div className="space-y-2">
                  <Label>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                  <Input
                    value={info.nameAr}
                    onChange={(e) => setInfo(prev => ({ ...prev, nameAr: e.target.value }))}
                    placeholder="اسم الشركة"
                    dir="rtl"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isArabic ? "معلومات الاتصال" : "Contact Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {isArabic ? "رقم الهاتف" : "Phone"}
                  </Label>
                  <Input
                    value={info.phone}
                    onChange={(e) => setInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+966 XX XXX XXXX"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    {isArabic ? "البريد الإلكتروني" : "Email"}
                  </Label>
                  <Input
                    type="email"
                    value={info.email}
                    onChange={(e) => setInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@company.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  {isArabic ? "الموقع الإلكتروني" : "Website"}
                </Label>
                <Input
                  value={info.website}
                  onChange={(e) => setInfo(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.company.com"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {isArabic ? "العنوان (إنجليزي)" : "Address (English)"}
                  </Label>
                  <Textarea
                    value={info.address}
                    onChange={(e) => setInfo(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Street, City, Country"
                    rows={2}
                  />
                </div>
                {showArabic && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {isArabic ? "العنوان (عربي)" : "Address (Arabic)"}
                    </Label>
                    <Textarea
                      value={info.addressAr}
                      onChange={(e) => setInfo(prev => ({ ...prev, addressAr: e.target.value }))}
                      placeholder="الشارع، المدينة، الدولة"
                      dir="rtl"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Registration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isArabic ? "معلومات التسجيل" : "Registration Information"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "الرقم الضريبي" : "Tax Number (VAT)"}</Label>
                  <Input
                    value={info.taxNumber}
                    onChange={(e) => setInfo(prev => ({ ...prev, taxNumber: e.target.value }))}
                    placeholder="3XXXXXXXXXX0003"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "رقم السجل التجاري" : "CR Number"}</Label>
                  <Input
                    value={info.crNumber}
                    onChange={(e) => setInfo(prev => ({ ...prev, crNumber: e.target.value }))}
                    placeholder="XXXXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isArabic ? "معاينة الترويسة" : "Header Preview"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {info.logo ? (
                      <img src={info.logo} alt="Logo" className="w-16 h-16 object-contain" />
                    ) : (
                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xl">
                        {info.name?.charAt(0) || "L"}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{info.name || "Company Name"}</h3>
                      {showArabic && info.nameAr && (
                        <p className="text-sm text-muted-foreground" dir="rtl">{info.nameAr}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    {info.phone && <p>{info.phone}</p>}
                    {info.email && <p>{info.email}</p>}
                    {info.website && <p>{info.website}</p>}
                  </div>
                </div>
                {info.address && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between">
                    <span>{info.address}</span>
                    {info.taxNumber && <span>VAT: {info.taxNumber}</span>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={handleReset}>
              {isArabic ? "إعادة تعيين" : "Reset"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                {isArabic ? "حفظ" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get saved company info
export function getSavedCompanyInfo(): CompanyInfo {
  try {
    const saved = localStorage.getItem("boq_company_info");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading company info:", e);
  }
  return DEFAULT_COMPANY_INFO;
}
