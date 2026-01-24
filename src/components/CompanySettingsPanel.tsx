import { useCompanySettings, CURRENCIES } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CompanyLogoUpload } from "./CompanyLogoUpload";
import { Building2, Settings2, Percent, DollarSign, Phone, Mail, Globe, MapPin, Save } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export const CompanySettingsPanel = () => {
  const { isArabic } = useLanguage();
  const { settings, updateSettings, lastSavedAt, getTotalMarkup } = useCompanySettings();

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Auto-save indicator */}
      {lastSavedAt && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Save className="h-4 w-4" />
          <span>
            {isArabic ? "آخر حفظ: " : "Last saved: "}
            {format(lastSavedAt, "HH:mm:ss", { locale: isArabic ? ar : undefined })}
          </span>
        </div>
      )}

      {/* Main Grid - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right Column - Company Data (RTL first) */}
        <Card className="order-1 lg:order-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {isArabic ? "بيانات الشركة" : "Company Data"}
              </CardTitle>
            </div>
            <CardDescription>
              {isArabic 
                ? "أدخل بيانات شركتك لتظهر في التقارير والفواتير"
                : "Enter your company details to appear in reports and invoices"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Names - Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyNameAr">
                  {isArabic ? "اسم الشركة (عربي)" : "Company Name (Arabic)"}
                </Label>
                <Input
                  id="companyNameAr"
                  value={settings.companyNameAr}
                  onChange={(e) => updateSettings({ companyNameAr: e.target.value })}
                  placeholder={isArabic ? "شركة المقاولات" : "Construction Company"}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyNameEn">
                  {isArabic ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}
                </Label>
                <Input
                  id="companyNameEn"
                  value={settings.companyNameEn}
                  onChange={(e) => updateSettings({ companyNameEn: e.target.value })}
                  placeholder="Construction Co."
                  dir="ltr"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {isArabic ? "الوصف" : "Description"}
              </Label>
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) => updateSettings({ description: e.target.value })}
                placeholder={isArabic ? "وصف مختصر للشركة..." : "Brief company description..."}
                rows={2}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  {isArabic ? "الهاتف" : "Phone"}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => updateSettings({ phone: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {isArabic ? "البريد الإلكتروني" : "Email"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateSettings({ email: e.target.value })}
                  placeholder="info@company.com"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                {isArabic ? "الموقع الإلكتروني" : "Website"}
              </Label>
              <Input
                id="website"
                type="url"
                value={settings.website}
                onChange={(e) => updateSettings({ website: e.target.value })}
                placeholder="https://www.company.com"
                dir="ltr"
              />
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {isArabic ? "المدينة" : "City"}
                </Label>
                <Input
                  id="city"
                  value={settings.city}
                  onChange={(e) => updateSettings({ city: e.target.value })}
                  placeholder={isArabic ? "الرياض" : "Riyadh"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">
                  {isArabic ? "الدولة" : "Country"}
                </Label>
                <Input
                  id="country"
                  value={settings.country}
                  onChange={(e) => updateSettings({ country: e.target.value })}
                  placeholder={isArabic ? "السعودية" : "Saudi Arabia"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Left Column - Default Pricing Settings */}
        <Card className="order-2 lg:order-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {isArabic ? "إعدادات التسعير الافتراضية" : "Default Pricing Settings"}
              </CardTitle>
            </div>
            <CardDescription>
              {isArabic 
                ? "حدد القيم الافتراضية للنسب والهوامش المستخدمة في التسعير"
                : "Set default values for pricing margins and percentages"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Currency */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" />
                {isArabic ? "العملة الافتراضية" : "Default Currency"}
              </Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(value) => updateSettings({ defaultCurrency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {isArabic ? currency.labelAr : currency.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profit Margin Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5" />
                  {isArabic ? "هامش الربح الافتراضي" : "Default Profit Margin"}
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {formatPercentage(settings.defaultProfitMargin)}
                </Badge>
              </div>
              <Slider
                value={[settings.defaultProfitMargin]}
                onValueChange={([value]) => updateSettings({ defaultProfitMargin: value })}
                min={0}
                max={50}
                step={0.5}
                className="cursor-pointer"
              />
            </div>

            {/* Overhead Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5" />
                  {isArabic ? "المصاريف العامة الافتراضية" : "Default Overhead"}
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {formatPercentage(settings.defaultOverhead)}
                </Badge>
              </div>
              <Slider
                value={[settings.defaultOverhead]}
                onValueChange={([value]) => updateSettings({ defaultOverhead: value })}
                min={0}
                max={30}
                step={0.5}
                className="cursor-pointer"
              />
            </div>

            {/* Contingency Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5" />
                  {isArabic ? "احتياطي الطوارئ الافتراضي" : "Default Contingency"}
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {formatPercentage(settings.defaultContingency)}
                </Badge>
              </div>
              <Slider
                value={[settings.defaultContingency]}
                onValueChange={([value]) => updateSettings({ defaultContingency: value })}
                min={0}
                max={20}
                step={0.5}
                className="cursor-pointer"
              />
            </div>

            {/* Insurance Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5" />
                  {isArabic ? "التأمين الافتراضي" : "Default Insurance"}
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {formatPercentage(settings.defaultInsurance)}
                </Badge>
              </div>
              <Slider
                value={[settings.defaultInsurance]}
                onValueChange={([value]) => updateSettings({ defaultInsurance: value })}
                min={0}
                max={10}
                step={0.25}
                className="cursor-pointer"
              />
            </div>

            {/* Admin Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5" />
                  {isArabic ? "المصاريف الإدارية الافتراضية" : "Default Admin Costs"}
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {formatPercentage(settings.defaultAdmin)}
                </Badge>
              </div>
              <Slider
                value={[settings.defaultAdmin]}
                onValueChange={([value]) => updateSettings({ defaultAdmin: value })}
                min={0}
                max={15}
                step={0.25}
                className="cursor-pointer"
              />
            </div>

            <Separator />

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {isArabic ? "ملخص النسب الافتراضية" : "Default Percentages Summary"}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">
                  {isArabic ? "هامش الربح:" : "Profit Margin:"}
                </span>
                <span className="font-mono text-end">{formatPercentage(settings.defaultProfitMargin)}</span>
                
                <span className="text-muted-foreground">
                  {isArabic ? "المصاريف العامة:" : "Overhead:"}
                </span>
                <span className="font-mono text-end">{formatPercentage(settings.defaultOverhead)}</span>
                
                <span className="text-muted-foreground">
                  {isArabic ? "الطوارئ:" : "Contingency:"}
                </span>
                <span className="font-mono text-end">{formatPercentage(settings.defaultContingency)}</span>
                
                <span className="text-muted-foreground">
                  {isArabic ? "التأمين:" : "Insurance:"}
                </span>
                <span className="font-mono text-end">{formatPercentage(settings.defaultInsurance)}</span>
                
                <span className="text-muted-foreground">
                  {isArabic ? "إداري:" : "Admin:"}
                </span>
                <span className="font-mono text-end">{formatPercentage(settings.defaultAdmin)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>{isArabic ? "إجمالي الإضافات:" : "Total Markup:"}</span>
                <Badge variant="default" className="font-mono">
                  {formatPercentage(getTotalMarkup())}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Logo Section */}
      <CompanyLogoUpload />
    </div>
  );
};
