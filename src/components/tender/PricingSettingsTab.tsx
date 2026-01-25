import { useState, useEffect } from "react";
import { 
  Settings, 
  Calculator, 
  Calendar, 
  DollarSign, 
  Save, 
  AlertTriangle, 
  Tag, 
  Percent,
  Shield,
  TrendingDown,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export interface PricingSettings {
  contractValue: number;
  profitMargin: number;
  contingency: number;
  projectDuration: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  // Risk Management
  riskLevel: "low" | "medium" | "high" | "very_high";
  riskPercentage: number;
  emergencyPercentage: number;
  // Company Overhead
  companyOverhead: number;
  // Discounts
  discountPercentage: number;
  discountReason: string;
  // Default Rates
  defaultOverhead: number;
  defaultProfit: number;
  defaultWaste: number;
}

interface PricingSettingsTabProps {
  isArabic: boolean;
  settings: PricingSettings;
  onSettingsChange: (settings: PricingSettings) => void;
}

const currencies = [
  { code: "SAR", name: "Saudi Riyal", nameAr: "ريال سعودي" },
  { code: "USD", name: "US Dollar", nameAr: "دولار أمريكي" },
  { code: "EUR", name: "Euro", nameAr: "يورو" },
  { code: "AED", name: "UAE Dirham", nameAr: "درهم إماراتي" },
  { code: "KWD", name: "Kuwaiti Dinar", nameAr: "دينار كويتي" },
  { code: "QAR", name: "Qatari Riyal", nameAr: "ريال قطري" },
  { code: "BHD", name: "Bahraini Dinar", nameAr: "دينار بحريني" },
  { code: "OMR", name: "Omani Rial", nameAr: "ريال عماني" },
  { code: "EGP", name: "Egyptian Pound", nameAr: "جنيه مصري" },
  { code: "JOD", name: "Jordanian Dinar", nameAr: "دينار أردني" },
];

const RISK_LEVELS = [
  { value: "low", labelAr: "مخاطر منخفضة", labelEn: "Low Risk", defaultPercentage: 2, color: "bg-emerald-500" },
  { value: "medium", labelAr: "مخاطر متوسطة", labelEn: "Medium Risk", defaultPercentage: 5, color: "bg-yellow-500" },
  { value: "high", labelAr: "مخاطر عالية", labelEn: "High Risk", defaultPercentage: 8, color: "bg-orange-500" },
  { value: "very_high", labelAr: "مخاطر عالية جداً", labelEn: "Very High Risk", defaultPercentage: 12, color: "bg-red-500" },
];

const getDefaultSettings = (): PricingSettings => ({
  contractValue: 0,
  profitMargin: 10,
  contingency: 5,
  projectDuration: 12,
  currency: "SAR",
  startDate: "",
  endDate: "",
  riskLevel: "medium",
  riskPercentage: 5,
  emergencyPercentage: 3,
  companyOverhead: 5,
  discountPercentage: 0,
  discountReason: "",
  defaultOverhead: 10,
  defaultProfit: 15,
  defaultWaste: 5,
});

export function PricingSettingsTab({ 
  isArabic, 
  settings, 
  onSettingsChange 
}: PricingSettingsTabProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<PricingSettings>({
    ...getDefaultSettings(),
    ...settings,
  });

  useEffect(() => {
    setLocalSettings(prev => ({
      ...getDefaultSettings(),
      ...settings,
    }));
  }, [settings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US").format(value);
  };

  const handleChange = (field: keyof PricingSettings, value: string | number) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRiskLevelChange = (level: string) => {
    const riskLevel = RISK_LEVELS.find(r => r.value === level);
    setLocalSettings(prev => ({
      ...prev,
      riskLevel: level as PricingSettings["riskLevel"],
      riskPercentage: riskLevel?.defaultPercentage || 5,
    }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    toast({
      title: isArabic ? "تم الحفظ" : "Settings Saved",
      description: isArabic 
        ? "تم حفظ إعدادات التسعير بنجاح" 
        : "Pricing settings have been saved successfully",
    });
  };

  // Calculate derived values
  const profitAmount = localSettings.contractValue * (localSettings.profitMargin / 100);
  const contingencyAmount = localSettings.contractValue * (localSettings.contingency / 100);
  const riskAmount = localSettings.contractValue * (localSettings.riskPercentage / 100);
  const emergencyAmount = localSettings.contractValue * (localSettings.emergencyPercentage / 100);
  const overheadAmount = localSettings.contractValue * (localSettings.companyOverhead / 100);
  const discountAmount = profitAmount * (localSettings.discountPercentage / 100);
  const netProfit = profitAmount - discountAmount;
  const totalAdditions = profitAmount + contingencyAmount + riskAmount + emergencyAmount + overheadAmount;
  const finalValue = localSettings.contractValue + totalAdditions - discountAmount;

  const currentRiskLevel = RISK_LEVELS.find(r => r.value === localSettings.riskLevel);
  const riskProgress = RISK_LEVELS.findIndex(r => r.value === localSettings.riskLevel) * 33.33 + 16.67;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {isArabic ? "إعدادات التسعير" : "Pricing Settings"}
        </CardTitle>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          {isArabic ? "حفظ الإعدادات" : "Save Settings"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "معلومات العقد" : "Contract Information"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
            <div className="space-y-2">
              <Label>{isArabic ? "قيمة العقد الإجمالية" : "Total Contract Value"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={localSettings.contractValue}
                  onChange={(e) => handleChange("contractValue", parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">{localSettings.currency}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "العملة" : "Currency"}</Label>
              <Select
                value={localSettings.currency}
                onValueChange={(value) => handleChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {isArabic ? currency.nameAr : currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Project Duration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "مدة المشروع" : "Project Duration"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
            <div className="space-y-2">
              <Label>{isArabic ? "المدة (بالأشهر)" : "Duration (months)"}</Label>
              <Input
                type="number"
                min="1"
                value={localSettings.projectDuration}
                onChange={(e) => handleChange("projectDuration", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "تاريخ البداية" : "Start Date"}</Label>
              <Input
                type="date"
                value={localSettings.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "تاريخ النهاية" : "End Date"}</Label>
              <Input
                type="date"
                value={localSettings.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Risk Management - NEW */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "إدارة المخاطر" : "Risk Management"}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {isArabic ? "جديد" : "New"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
            <div className="space-y-2">
              <Label>{isArabic ? "مستوى المخاطر" : "Risk Level"}</Label>
              <Select
                value={localSettings.riskLevel}
                onValueChange={handleRiskLevelChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${level.color}`} />
                        {isArabic ? level.labelAr : level.labelEn} ({level.defaultPercentage}%)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Risk Progress Bar */}
              <div className="space-y-1">
                <Progress value={riskProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{isArabic ? "منخفض" : "Low"}</span>
                  <span>{isArabic ? "عالي جداً" : "Very High"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة المخاطر %" : "Risk Percentage %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localSettings.riskPercentage}
                  onChange={(e) => handleChange("riskPercentage", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                = {localSettings.currency} {formatCurrency(riskAmount)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة الطوارئ %" : "Emergency %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localSettings.emergencyPercentage}
                  onChange={(e) => handleChange("emergencyPercentage", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                = {localSettings.currency} {formatCurrency(emergencyAmount)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Pricing Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "نسب التسعير" : "Pricing Rates"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة الربح %" : "Profit Margin %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={localSettings.profitMargin}
                  onChange={(e) => handleChange("profitMargin", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة الاحتياطي %" : "Contingency %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={localSettings.contingency}
                  onChange={(e) => handleChange("contingency", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "مصاريف الشركة العامة %" : "Company Overhead %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localSettings.companyOverhead}
                  onChange={(e) => handleChange("companyOverhead", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                = {localSettings.currency} {formatCurrency(overheadAmount)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Discounts - NEW */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "الخصومات" : "Discounts"}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {isArabic ? "جديد" : "New"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة الخصم (من الربح) %" : "Discount (from Profit) %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localSettings.discountPercentage}
                  onChange={(e) => handleChange("discountPercentage", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                = {localSettings.currency} {formatCurrency(discountAmount)} {isArabic ? "خصم من الربح" : "off profit"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "سبب الخصم" : "Discount Reason"}</Label>
              <Textarea
                placeholder={isArabic ? "أدخل سبب الخصم (إن وجد)..." : "Enter discount reason (if any)..."}
                value={localSettings.discountReason}
                onChange={(e) => handleChange("discountReason", e.target.value)}
                rows={2}
              />
            </div>
          </div>
          {/* High Discount Alert */}
          {localSettings.discountPercentage > 10 && (
            <Alert variant="destructive" className="ml-7">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isArabic 
                  ? `تحذير: نسبة الخصم عالية (${localSettings.discountPercentage}%). هذا سيقلل الربح الصافي بشكل كبير.`
                  : `Warning: High discount rate (${localSettings.discountPercentage}%). This will significantly reduce net profit.`
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Default Rates - NEW */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "النسب الافتراضية للبنود" : "Default Item Rates"}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {isArabic ? "جديد" : "New"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pl-7">
            {isArabic 
              ? "هذه النسب تُطبق تلقائياً عند إضافة بنود جديدة في جدول الكميات"
              : "These rates are automatically applied when adding new BOQ items"
            }
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
            <div className="space-y-2">
              <Label>{isArabic ? "المصاريف العامة الافتراضية %" : "Default Overhead %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localSettings.defaultOverhead}
                  onChange={(e) => handleChange("defaultOverhead", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "الربح الافتراضي %" : "Default Profit %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localSettings.defaultProfit}
                  onChange={(e) => handleChange("defaultProfit", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "نسبة الهدر الافتراضية %" : "Default Waste %"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={localSettings.defaultWaste}
                  onChange={(e) => handleChange("defaultWaste", parseFloat(e.target.value) || 0)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Enhanced Quick Summary */}
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {isArabic ? "الملخص الشامل" : "Comprehensive Summary"}
          </h3>
          
          {/* Contract Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background rounded-lg p-4 text-center border">
              <p className="text-sm text-muted-foreground">
                {isArabic ? "قيمة العقد" : "Contract Value"}
              </p>
              <p className="text-xl font-bold">
                {localSettings.currency} {formatCurrency(localSettings.contractValue)}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center border border-emerald-500/30">
              <p className="text-sm text-muted-foreground">
                {isArabic ? `الربح (${localSettings.profitMargin}%)` : `Profit (${localSettings.profitMargin}%)`}
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {localSettings.currency} {formatCurrency(profitAmount)}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center border border-orange-500/30">
              <p className="text-sm text-muted-foreground">
                {isArabic ? `الاحتياطي (${localSettings.contingency}%)` : `Contingency (${localSettings.contingency}%)`}
              </p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {localSettings.currency} {formatCurrency(contingencyAmount)}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center border border-amber-500/30">
              <p className="text-sm text-muted-foreground">
                {isArabic ? `المخاطر (${localSettings.riskPercentage}%)` : `Risk (${localSettings.riskPercentage}%)`}
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {localSettings.currency} {formatCurrency(riskAmount)}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-background rounded-lg p-4 space-y-3 border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="w-4 h-4" />
              {isArabic ? "تفاصيل الحساب" : "Calculation Details"}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isArabic ? "قيمة العقد الأساسية" : "Base Contract Value"}</span>
                <span>{localSettings.currency} {formatCurrency(localSettings.contractValue)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>+ {isArabic ? `الربح (${localSettings.profitMargin}%)` : `Profit (${localSettings.profitMargin}%)`}</span>
                <span>{localSettings.currency} {formatCurrency(profitAmount)}</span>
              </div>
              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                <span>+ {isArabic ? `الاحتياطي (${localSettings.contingency}%)` : `Contingency (${localSettings.contingency}%)`}</span>
                <span>{localSettings.currency} {formatCurrency(contingencyAmount)}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>+ {isArabic ? `المخاطر (${localSettings.riskPercentage}%)` : `Risk (${localSettings.riskPercentage}%)`}</span>
                <span>{localSettings.currency} {formatCurrency(riskAmount)}</span>
              </div>
              <div className="flex justify-between text-blue-600 dark:text-blue-400">
                <span>+ {isArabic ? `الطوارئ (${localSettings.emergencyPercentage}%)` : `Emergency (${localSettings.emergencyPercentage}%)`}</span>
                <span>{localSettings.currency} {formatCurrency(emergencyAmount)}</span>
              </div>
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span>+ {isArabic ? `مصاريف عامة (${localSettings.companyOverhead}%)` : `Overhead (${localSettings.companyOverhead}%)`}</span>
                <span>{localSettings.currency} {formatCurrency(overheadAmount)}</span>
              </div>
              {localSettings.discountPercentage > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>- {isArabic ? `خصم (${localSettings.discountPercentage}%)` : `Discount (${localSettings.discountPercentage}%)`}</span>
                  <span>{localSettings.currency} {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>{isArabic ? "القيمة النهائية" : "Final Value"}</span>
                <span className="text-primary">{localSettings.currency} {formatCurrency(finalValue)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center justify-between bg-background rounded-lg p-3 border">
              <span className="text-sm text-muted-foreground">
                {isArabic ? "صافي الربح" : "Net Profit"}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {localSettings.currency} {formatCurrency(netProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-background rounded-lg p-3 border">
              <span className="text-sm text-muted-foreground">
                {isArabic ? "المدة" : "Duration"}
              </span>
              <span className="font-bold">
                {localSettings.projectDuration} {isArabic ? "شهر" : "months"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-background rounded-lg p-3 border">
              <span className="text-sm text-muted-foreground">
                {isArabic ? "مستوى المخاطر" : "Risk Level"}
              </span>
              <Badge className={`${currentRiskLevel?.color} text-white`}>
                {isArabic ? currentRiskLevel?.labelAr : currentRiskLevel?.labelEn}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
