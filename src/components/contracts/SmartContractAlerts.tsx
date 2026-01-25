import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Target, 
  Settings, 
  CheckCircle,
  Calendar,
  TrendingDown
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Alert {
  id: string;
  type: "expiry" | "payment" | "milestone" | "warranty" | "maintenance";
  severity: "urgent" | "warning" | "reminder" | "info";
  title: string;
  description: string;
  dueDate: string;
  daysRemaining: number;
  contractId: string;
  contractTitle: string;
}

interface AlertSettings {
  expiry_alerts_enabled: boolean;
  expiry_days_before: number[];
  payment_alerts_enabled: boolean;
  payment_days_before: number[];
  milestone_alerts_enabled: boolean;
  milestone_days_before: number[];
  in_app_notifications: boolean;
}

const defaultSettings: AlertSettings = {
  expiry_alerts_enabled: true,
  expiry_days_before: [7, 14, 30, 60],
  payment_alerts_enabled: true,
  payment_days_before: [3, 7, 14],
  milestone_alerts_enabled: true,
  milestone_days_before: [3, 7],
  in_app_notifications: true,
};

export const SmartContractAlerts = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
      generateAlerts();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("contract_alert_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (data) {
        setSettings({
          expiry_alerts_enabled: data.expiry_alerts_enabled ?? true,
          expiry_days_before: data.expiry_days_before ?? [7, 14, 30, 60],
          payment_alerts_enabled: data.payment_alerts_enabled ?? true,
          payment_days_before: data.payment_days_before ?? [3, 7, 14],
          milestone_alerts_enabled: data.milestone_alerts_enabled ?? true,
          milestone_days_before: data.milestone_days_before ?? [3, 7],
          in_app_notifications: data.in_app_notifications ?? true,
        });
      }
    } catch (error) {
      // Settings don't exist yet, use defaults
    }
  };

  const generateAlerts = async () => {
    try {
      const [contractsRes, milestonesRes, paymentsRes, warrantiesRes, maintenanceRes] = await Promise.all([
        supabase
          .from("contracts")
          .select("*")
          .eq("user_id", user?.id)
          .not("status", "in", '("completed","terminated")'),
        supabase
          .from("contract_milestones")
          .select("*, contracts(contract_title)")
          .eq("user_id", user?.id)
          .not("status", "eq", "completed"),
        supabase
          .from("contract_payments")
          .select("*, contracts(contract_title)")
          .eq("user_id", user?.id)
          .not("status", "in", '("paid","cancelled")'),
        supabase
          .from("contract_warranties")
          .select("*, contracts(contract_title)")
          .eq("user_id", user?.id)
          .eq("status", "active"),
        supabase
          .from("maintenance_schedules")
          .select("*, contracts(contract_title)")
          .eq("user_id", user?.id)
          .not("status", "in", '("completed","cancelled")'),
      ]);

      const generatedAlerts: Alert[] = [];
      const now = new Date();

      // Contract expiry alerts
      (contractsRes.data || []).forEach((contract) => {
        if (!contract.end_date) return;
        const daysRemaining = differenceInDays(new Date(contract.end_date), now);

        if (daysRemaining <= 60) {
          generatedAlerts.push({
            id: `expiry-${contract.id}`,
            type: "expiry",
            severity: getSeverity(daysRemaining),
            title: isArabic ? "انتهاء العقد" : "Contract Expiry",
            description: contract.contract_title,
            dueDate: contract.end_date,
            daysRemaining,
            contractId: contract.id,
            contractTitle: contract.contract_title,
          });
        }
      });

      // Milestone alerts
      (milestonesRes.data || []).forEach((milestone: any) => {
        const daysRemaining = differenceInDays(new Date(milestone.due_date), now);

        if (daysRemaining <= 14) {
          generatedAlerts.push({
            id: `milestone-${milestone.id}`,
            type: "milestone",
            severity: getSeverity(daysRemaining),
            title: isArabic ? "موعد معلم" : "Milestone Due",
            description: milestone.milestone_name,
            dueDate: milestone.due_date,
            daysRemaining,
            contractId: milestone.contract_id,
            contractTitle: milestone.contracts?.contract_title || "",
          });
        }
      });

      // Payment alerts
      (paymentsRes.data || []).forEach((payment: any) => {
        const daysRemaining = differenceInDays(new Date(payment.due_date), now);

        if (daysRemaining <= 14) {
          generatedAlerts.push({
            id: `payment-${payment.id}`,
            type: "payment",
            severity: getSeverity(daysRemaining),
            title: isArabic ? "موعد دفعة" : "Payment Due",
            description: payment.description || `${isArabic ? "دفعة" : "Payment"} #${payment.payment_number}`,
            dueDate: payment.due_date,
            daysRemaining,
            contractId: payment.contract_id,
            contractTitle: payment.contracts?.contract_title || "",
          });
        }
      });

      // Warranty expiry alerts
      (warrantiesRes.data || []).forEach((warranty: any) => {
        const daysRemaining = differenceInDays(new Date(warranty.end_date), now);

        if (daysRemaining <= 60) {
          generatedAlerts.push({
            id: `warranty-${warranty.id}`,
            type: "warranty",
            severity: getSeverity(daysRemaining),
            title: isArabic ? "انتهاء الضمان" : "Warranty Expiry",
            description: warranty.warranty_type,
            dueDate: warranty.end_date,
            daysRemaining,
            contractId: warranty.contract_id,
            contractTitle: warranty.contracts?.contract_title || "",
          });
        }
      });

      // Maintenance schedule alerts
      (maintenanceRes.data || []).forEach((schedule: any) => {
        const daysRemaining = differenceInDays(new Date(schedule.scheduled_date), now);

        if (daysRemaining <= 14) {
          generatedAlerts.push({
            id: `maintenance-${schedule.id}`,
            type: "maintenance",
            severity: getSeverity(daysRemaining),
            title: isArabic ? "موعد صيانة" : "Maintenance Due",
            description: schedule.maintenance_type,
            dueDate: schedule.scheduled_date,
            daysRemaining,
            contractId: schedule.contract_id,
            contractTitle: schedule.contracts?.contract_title || "",
          });
        }
      });

      // Sort by severity and days remaining
      generatedAlerts.sort((a, b) => {
        const severityOrder = { urgent: 0, warning: 1, reminder: 2, info: 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.daysRemaining - b.daysRemaining;
      });

      setAlerts(generatedAlerts);
    } catch (error) {
      console.error("Error generating alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = (daysRemaining: number): Alert["severity"] => {
    if (daysRemaining < 0) return "urgent";
    if (daysRemaining <= 7) return "urgent";
    if (daysRemaining <= 14) return "warning";
    if (daysRemaining <= 30) return "reminder";
    return "info";
  };

  const saveSettings = async () => {
    try {
      const { data: existing } = await supabase
        .from("contract_alert_settings")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (existing) {
        await supabase
          .from("contract_alert_settings")
          .update(settings)
          .eq("user_id", user?.id);
      } else {
        await supabase
          .from("contract_alert_settings")
          .insert({ ...settings, user_id: user?.id });
      }

      toast.success(isArabic ? "تم حفظ الإعدادات" : "Settings saved");
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(isArabic ? "خطأ في الحفظ" : "Error saving settings");
    }
  };

  const getSeverityConfig = (severity: Alert["severity"]) => {
    const configs = {
      urgent: { color: "bg-red-500", icon: AlertTriangle, labelEn: "Urgent", labelAr: "عاجل" },
      warning: { color: "bg-orange-500", icon: Clock, labelEn: "Warning", labelAr: "تحذير" },
      reminder: { color: "bg-yellow-500", icon: Bell, labelEn: "Reminder", labelAr: "تذكير" },
      info: { color: "bg-blue-500", icon: Calendar, labelEn: "Info", labelAr: "معلومة" },
    };
    return configs[severity];
  };

  const getTypeIcon = (type: Alert["type"]) => {
    const icons: Record<Alert["type"], typeof Calendar> = {
      expiry: Calendar,
      payment: DollarSign,
      milestone: Target,
      warranty: Clock,
      maintenance: Clock,
    };
    return icons[type];
  };

  const urgentAlerts = alerts.filter(a => a.severity === "urgent");
  const warningAlerts = alerts.filter(a => a.severity === "warning");
  const reminderAlerts = alerts.filter(a => a.severity === "reminder" || a.severity === "info");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isArabic ? "التنبيهات الذكية" : "Smart Alerts"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isArabic ? `${alerts.length} تنبيه نشط` : `${alerts.length} active alerts`}
            </p>
          </div>
        </div>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              {isArabic ? "الإعدادات" : "Settings"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isArabic ? "إعدادات التنبيهات" : "Alert Settings"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "تنبيهات انتهاء العقود" : "Contract Expiry Alerts"}</Label>
                <Switch
                  checked={settings.expiry_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, expiry_alerts_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "تنبيهات الدفعات" : "Payment Alerts"}</Label>
                <Switch
                  checked={settings.payment_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, payment_alerts_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "تنبيهات المعالم" : "Milestone Alerts"}</Label>
                <Switch
                  checked={settings.milestone_alerts_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, milestone_alerts_enabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{isArabic ? "الإشعارات داخل التطبيق" : "In-App Notifications"}</Label>
                <Switch
                  checked={settings.in_app_notifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, in_app_notifications: checked })
                  }
                />
              </div>
              <Button onClick={saveSettings} className="w-full">
                {isArabic ? "حفظ الإعدادات" : "Save Settings"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{urgentAlerts.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "عاجل" : "Urgent"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-orange-600">{warningAlerts.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "تحذير" : "Warning"}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{reminderAlerts.length}</p>
            <p className="text-xs text-muted-foreground">{isArabic ? "تذكير" : "Reminder"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">{isArabic ? "الكل" : "All"}</TabsTrigger>
          <TabsTrigger value="expiry">{isArabic ? "انتهاء" : "Expiry"}</TabsTrigger>
          <TabsTrigger value="payment">{isArabic ? "دفعات" : "Payments"}</TabsTrigger>
          <TabsTrigger value="milestone">{isArabic ? "معالم" : "Milestones"}</TabsTrigger>
          <TabsTrigger value="warranty">{isArabic ? "ضمانات" : "Warranties"}</TabsTrigger>
          <TabsTrigger value="maintenance">{isArabic ? "صيانة" : "Maintenance"}</TabsTrigger>
        </TabsList>

        {["all", "expiry", "payment", "milestone", "warranty", "maintenance"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            {(tab === "all" ? alerts : alerts.filter((a) => a.type === tab)).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">
                    {isArabic ? "لا توجد تنبيهات" : "No alerts"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              (tab === "all" ? alerts : alerts.filter((a) => a.type === tab)).map((alert) => {
                const severityConfig = getSeverityConfig(alert.severity);
                const SeverityIcon = severityConfig.icon;
                const TypeIcon = getTypeIcon(alert.type);

                return (
                  <Card key={alert.id} className={`transition-all hover:shadow-md ${alert.severity === "urgent" ? "border-red-500/50" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${severityConfig.color}/20`}>
                          <SeverityIcon className={`w-5 h-5 ${severityConfig.color.replace("bg-", "text-")}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{alert.title}</span>
                            <Badge variant="outline" className={`${severityConfig.color} text-white text-xs`}>
                              {isArabic ? severityConfig.labelAr : severityConfig.labelEn}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{alert.description}</p>
                          <p className="text-xs text-muted-foreground">{alert.contractTitle}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(alert.dueDate), "dd MMM yyyy", {
                                locale: isArabic ? ar : enUS,
                              })}
                            </span>
                            <span className={`font-medium ${alert.daysRemaining < 0 ? "text-red-600" : alert.daysRemaining <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                              {alert.daysRemaining < 0
                                ? (isArabic ? `متأخر ${Math.abs(alert.daysRemaining)} يوم` : `${Math.abs(alert.daysRemaining)} days overdue`)
                                : alert.daysRemaining === 0
                                ? (isArabic ? "اليوم!" : "Today!")
                                : (isArabic ? `بعد ${alert.daysRemaining} يوم` : `In ${alert.daysRemaining} days`)}
                            </span>
                          </div>
                        </div>
                        <TypeIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
