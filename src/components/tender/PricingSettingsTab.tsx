import { useState, useEffect } from "react";
import { Settings, Calculator, Calendar, DollarSign, Save } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export interface PricingSettings {
  contractValue: number;
  profitMargin: number;
  contingency: number;
  projectDuration: number;
  currency: string;
  startDate?: string;
  endDate?: string;
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

export function PricingSettingsTab({ 
  isArabic, 
  settings, 
  onSettingsChange 
}: PricingSettingsTabProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<PricingSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
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

        {/* Pricing Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">
              {isArabic ? "نسب التسعير" : "Pricing Rates"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
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
          </div>
        </div>

        <Separator />

        {/* Quick Summary */}
        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {isArabic ? "ملخص سريع" : "Quick Summary"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isArabic ? "قيمة العقد" : "Contract Value"}
              </p>
              <p className="text-xl font-bold">
                {localSettings.currency} {formatCurrency(localSettings.contractValue)}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isArabic ? `الربح المتوقع (${localSettings.profitMargin}%)` : `Expected Profit (${localSettings.profitMargin}%)`}
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {localSettings.currency} {formatCurrency(profitAmount)}
              </p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isArabic ? `الاحتياطي (${localSettings.contingency}%)` : `Contingency (${localSettings.contingency}%)`}
              </p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {localSettings.currency} {formatCurrency(contingencyAmount)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-semibold">
              {isArabic ? "المدة" : "Duration"}
            </span>
            <span className="text-lg">
              {localSettings.projectDuration} {isArabic ? "شهر" : "months"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
