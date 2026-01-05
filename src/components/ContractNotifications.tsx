import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  Bell, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Settings,
  FileText,
  Shield,
  Trash2,
  Plus,
  Mail
} from "lucide-react";

interface Contract {
  id: string;
  contract_title: string;
  contract_number: string;
  end_date: string | null;
  status: string | null;
  contractor_name: string | null;
}

interface Reminder {
  id: string;
  contract_id: string;
  contract_title: string;
  type: "expiry" | "warranty" | "milestone";
  days_before: number;
  date: string;
  is_active: boolean;
  email_notify: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  defaultDaysBefore: number;
  emailNotifications: boolean;
  reminderDays: number[];
}

export function ContractNotifications() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const locale = isArabic ? ar : enUS;
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem("contract_notification_settings");
    return saved ? JSON.parse(saved) : {
      enabled: true,
      defaultDaysBefore: 30,
      emailNotifications: false,
      reminderDays: [7, 14, 30, 60]
    };
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("contract_notification_settings", JSON.stringify(settings));
  }, [settings]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: contractsData } = await supabase
        .from("contracts")
        .select("id, contract_title, contract_number, end_date, status, contractor_name")
        .order("end_date", { ascending: true });
      
      if (contractsData) {
        setContracts(contractsData);
        generateReminders(contractsData);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReminders = (contractsList: Contract[]) => {
    const today = new Date();
    const generatedReminders: Reminder[] = [];
    
    contractsList.forEach(contract => {
      if (!contract.end_date) return;
      
      const endDate = new Date(contract.end_date);
      const daysUntilExpiry = differenceInDays(endDate, today);
      
      // Generate reminders for different time periods
      settings.reminderDays.forEach(days => {
        if (daysUntilExpiry <= days && daysUntilExpiry > 0) {
          generatedReminders.push({
            id: `${contract.id}_expiry_${days}`,
            contract_id: contract.id,
            contract_title: contract.contract_title,
            type: "expiry",
            days_before: daysUntilExpiry,
            date: contract.end_date,
            is_active: true,
            email_notify: settings.emailNotifications
          });
        }
      });
      
      // Warranty reminder (assuming 1 year warranty after contract end)
      const warrantyEnd = addDays(endDate, 365);
      const daysUntilWarrantyEnd = differenceInDays(warrantyEnd, today);
      
      if (daysUntilWarrantyEnd <= 60 && daysUntilWarrantyEnd > 0) {
        generatedReminders.push({
          id: `${contract.id}_warranty`,
          contract_id: contract.id,
          contract_title: contract.contract_title,
          type: "warranty",
          days_before: daysUntilWarrantyEnd,
          date: warrantyEnd.toISOString(),
          is_active: true,
          email_notify: settings.emailNotifications
        });
      }
    });
    
    // Sort by days remaining
    generatedReminders.sort((a, b) => a.days_before - b.days_before);
    setReminders(generatedReminders);
  };

  const getUrgencyLevel = (days: number) => {
    if (days <= 7) return { color: "destructive", icon: AlertTriangle, label: isArabic ? "عاجل" : "Urgent" };
    if (days <= 14) return { color: "warning", icon: Clock, label: isArabic ? "قريب" : "Soon" };
    if (days <= 30) return { color: "secondary", icon: Calendar, label: isArabic ? "تنبيه" : "Notice" };
    return { color: "outline", icon: Bell, label: isArabic ? "تذكير" : "Reminder" };
  };

  const getTypeLabel = (type: Reminder["type"]) => {
    const labels = {
      expiry: isArabic ? "انتهاء العقد" : "Contract Expiry",
      warranty: isArabic ? "انتهاء الضمان" : "Warranty End",
      milestone: isArabic ? "موعد تسليم" : "Milestone"
    };
    return labels[type];
  };

  const dismissReminder = (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    toast({
      title: isArabic ? "تم التجاهل" : "Dismissed",
      description: isArabic ? "تم تجاهل التذكير" : "Reminder dismissed"
    });
  };

  const urgentCount = reminders.filter(r => r.days_before <= 7).length;
  const warningCount = reminders.filter(r => r.days_before > 7 && r.days_before <= 30).length;

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isArabic ? "يرجى تسجيل الدخول لعرض الإشعارات" : "Please login to view notifications"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {isArabic ? "إشعارات العقود" : "Contract Notifications"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "تذكيرات انتهاء العقود وفترات الضمان" : "Contract expiry and warranty reminders"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch 
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
            />
            <Label>{isArabic ? "تفعيل" : "Enable"}</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            {isArabic ? "إعدادات" : "Settings"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-3xl font-bold text-destructive">{urgentCount}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "عاجل" : "Urgent"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-warning/20 bg-warning/5">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-warning" />
            <div>
              <p className="text-3xl font-bold text-warning">{warningCount}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "تحذير" : "Warning"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-3xl font-bold">{contracts.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "عقود" : "Contracts"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-3xl font-bold">{reminders.filter(r => r.type === "warranty").length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "ضمانات" : "Warranties"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">{isArabic ? "إعدادات التذكيرات" : "Reminder Settings"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isArabic ? "أيام التذكير الافتراضية" : "Default Reminder Days"}</Label>
                <Input
                  type="number"
                  value={settings.defaultDaysBefore}
                  onChange={(e) => setSettings(s => ({ ...s, defaultDaysBefore: parseInt(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailNotifications: checked }))}
                />
                <div>
                  <Label>{isArabic ? "إشعارات البريد" : "Email Notifications"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? "إرسال تذكير للبريد" : "Send email reminders"}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label>{isArabic ? "فترات التذكير (بالأيام)" : "Reminder Intervals (days)"}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.reminderDays.map(day => (
                  <Badge key={day} variant="secondary" className="gap-1">
                    {day} {isArabic ? "يوم" : "days"}
                    <button
                      onClick={() => setSettings(s => ({
                        ...s,
                        reminderDays: s.reminderDays.filter(d => d !== day)
                      }))}
                      className="ml-1 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDay = prompt(isArabic ? "أدخل عدد الأيام" : "Enter days");
                    if (newDay && !isNaN(parseInt(newDay))) {
                      setSettings(s => ({
                        ...s,
                        reminderDays: [...s.reminderDays, parseInt(newDay)].sort((a, b) => a - b)
                      }));
                    }
                  }}
                  className="h-6 gap-1"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {isArabic ? "التذكيرات النشطة" : "Active Reminders"}
            <Badge variant="secondary">{reminders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {reminders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>{isArabic ? "لا توجد تذكيرات حالياً" : "No active reminders"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map(reminder => {
                  const urgency = getUrgencyLevel(reminder.days_before);
                  const UrgencyIcon = urgency.icon;
                  
                  return (
                    <div 
                      key={reminder.id}
                      className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                        reminder.days_before <= 7 ? 'border-destructive/30 bg-destructive/5' :
                        reminder.days_before <= 14 ? 'border-warning/30 bg-warning/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            reminder.days_before <= 7 ? 'bg-destructive/10' :
                            reminder.days_before <= 14 ? 'bg-warning/10' : 'bg-muted'
                          }`}>
                            <UrgencyIcon className={`w-5 h-5 ${
                              reminder.days_before <= 7 ? 'text-destructive' :
                              reminder.days_before <= 14 ? 'text-warning' : 'text-muted-foreground'
                            }`} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={urgency.color as any}>{urgency.label}</Badge>
                              <Badge variant="outline">{getTypeLabel(reminder.type)}</Badge>
                            </div>
                            <h4 className="font-medium">{reminder.contract_title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {isArabic ? "متبقي" : "Remaining"}: {" "}
                              <span className="font-medium">
                                {reminder.days_before} {isArabic ? "يوم" : "days"}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(reminder.date), "PPP", { locale })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {reminder.email_notify && (
                            <Mail className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => dismissReminder(reminder.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
