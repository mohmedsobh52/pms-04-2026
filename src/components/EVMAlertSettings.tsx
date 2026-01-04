import { useState, useEffect } from "react";
import {
  Bell,
  Save,
  Loader2,
  Mail,
  Settings2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface EVMAlertSettingsData {
  email: string;
  notifications_enabled: boolean;
  spi_warning_threshold: number;
  spi_critical_threshold: number;
  cpi_warning_threshold: number;
  cpi_critical_threshold: number;
  vac_warning_percentage: number;
  vac_critical_percentage: number;
}

export function EVMAlertSettings() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EVMAlertSettingsData>({
    email: "",
    notifications_enabled: true,
    spi_warning_threshold: 0.95,
    spi_critical_threshold: 0.9,
    cpi_warning_threshold: 0.95,
    cpi_critical_threshold: 0.9,
    vac_warning_percentage: 5,
    vac_critical_percentage: 10,
  });

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("evm_alert_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          email: data.email || user.email || "",
          notifications_enabled: data.notifications_enabled ?? true,
          spi_warning_threshold: data.spi_warning_threshold || 0.95,
          spi_critical_threshold: data.spi_critical_threshold || 0.9,
          cpi_warning_threshold: data.cpi_warning_threshold || 0.95,
          cpi_critical_threshold: data.cpi_critical_threshold || 0.9,
          vac_warning_percentage: data.vac_warning_percentage || 5,
          vac_critical_percentage: data.vac_critical_percentage || 10,
        });
      } else if (user.email) {
        setSettings((s) => ({ ...s, email: user.email || "" }));
      }
    } catch (error) {
      console.error("Error fetching EVM settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user || !settings.email) {
      toast({
        title: isArabic ? "البريد الإلكتروني مطلوب" : "Email is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("evm_alert_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const settingsData = {
        user_id: user.id,
        email: settings.email,
        notifications_enabled: settings.notifications_enabled,
        spi_warning_threshold: settings.spi_warning_threshold,
        spi_critical_threshold: settings.spi_critical_threshold,
        cpi_warning_threshold: settings.cpi_warning_threshold,
        cpi_critical_threshold: settings.cpi_critical_threshold,
        vac_warning_percentage: settings.vac_warning_percentage,
        vac_critical_percentage: settings.vac_critical_percentage,
      };

      if (existing) {
        const { error } = await supabase
          .from("evm_alert_settings")
          .update(settingsData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("evm_alert_settings")
          .insert(settingsData);
        if (error) throw error;
      }

      toast({
        title: isArabic ? "تم حفظ الإعدادات" : "Settings saved",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: isArabic ? "خطأ في الحفظ" : "Error saving",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {isArabic ? "يرجى تسجيل الدخول" : "Please log in"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>
              {isArabic ? "إعدادات تنبيهات EVM" : "EVM Alert Settings"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "تخصيص عتبات التنبيهات والبريد الإلكتروني"
                : "Customize alert thresholds and email notifications"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Email & Enable */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label>{isArabic ? "تفعيل التنبيهات" : "Enable Alerts"}</Label>
                    <p className="text-xs text-muted-foreground">
                      {isArabic
                        ? "إرسال تنبيهات بالبريد عند تجاوز العتبات"
                        : "Send email alerts when thresholds are exceeded"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, notifications_enabled: v })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {isArabic ? "البريد الإلكتروني للتنبيهات" : "Alert Email"}
                </Label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* SPI Thresholds */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium">
                  {isArabic ? "عتبات مؤشر الجدول (SPI)" : "Schedule Performance Index (SPI)"}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {isArabic ? "عتبة التحذير" : "Warning Threshold"}
                    </Label>
                    <span className="text-sm font-medium">
                      {(settings.spi_warning_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.spi_warning_threshold * 100]}
                    onValueChange={([v]) =>
                      setSettings({ ...settings, spi_warning_threshold: v / 100 })
                    }
                    min={80}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      {isArabic ? "عتبة الحرج" : "Critical Threshold"}
                    </Label>
                    <span className="text-sm font-medium">
                      {(settings.spi_critical_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.spi_critical_threshold * 100]}
                    onValueChange={([v]) =>
                      setSettings({ ...settings, spi_critical_threshold: v / 100 })
                    }
                    min={70}
                    max={95}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* CPI Thresholds */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-green-600" />
                <h4 className="font-medium">
                  {isArabic ? "عتبات مؤشر التكلفة (CPI)" : "Cost Performance Index (CPI)"}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {isArabic ? "عتبة التحذير" : "Warning Threshold"}
                    </Label>
                    <span className="text-sm font-medium">
                      {(settings.cpi_warning_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.cpi_warning_threshold * 100]}
                    onValueChange={([v]) =>
                      setSettings({ ...settings, cpi_warning_threshold: v / 100 })
                    }
                    min={80}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      {isArabic ? "عتبة الحرج" : "Critical Threshold"}
                    </Label>
                    <span className="text-sm font-medium">
                      {(settings.cpi_critical_threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.cpi_critical_threshold * 100]}
                    onValueChange={([v]) =>
                      setSettings({ ...settings, cpi_critical_threshold: v / 100 })
                    }
                    min={70}
                    max={95}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* VAC Thresholds */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium">
                  {isArabic ? "عتبات الفرق في الاكتمال (VAC)" : "Variance at Completion (VAC)"}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {isArabic ? "عتبة التحذير %" : "Warning Threshold %"}
                    </Label>
                    <span className="text-sm font-medium">
                      {settings.vac_warning_percentage}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.vac_warning_percentage]}
                    onValueChange={([v]) =>
                      setSettings({ ...settings, vac_warning_percentage: v })
                    }
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      {isArabic ? "عتبة الحرج %" : "Critical Threshold %"}
                    </Label>
                    <span className="text-sm font-medium">
                      {settings.vac_critical_percentage}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.vac_critical_percentage]}
                    onValueChange={([v]) =>
                      setSettings({ ...settings, vac_critical_percentage: v })
                    }
                    min={5}
                    max={30}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isArabic ? "حفظ الإعدادات" : "Save Settings"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
