import { useState, useEffect, useCallback } from "react";
import { format, isBefore, addDays, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Bell,
  AlertTriangle,
  FileText,
  Clock,
  X,
  Check,
  Eye,
  Volume2,
  VolumeX,
  Settings,
  ChevronDown,
  Package,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "warning" | "danger" | "info" | "success";
  category: "contract" | "risk" | "procurement" | "deadline";
  timestamp: Date;
  read: boolean;
  link?: string;
  data?: any;
}

export function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoCheck, setAutoCheck] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const locale = isArabic ? ar : enUS;

  // Check for deadlines and generate notifications
  const checkForNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    const newNotifications: Notification[] = [];
    const today = new Date();
    const warningDays = 7;
    const criticalDays = 3;

    try {
      // Check expiring contracts
      const { data: contracts } = await supabase
        .from("contracts")
        .select("*")
        .not("end_date", "is", null)
        .neq("status", "completed")
        .neq("status", "cancelled");

      contracts?.forEach(contract => {
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          const daysUntilEnd = differenceInDays(endDate, today);

          if (daysUntilEnd <= 0) {
            newNotifications.push({
              id: `contract-expired-${contract.id}`,
              title: isArabic ? "عقد منتهي الصلاحية" : "Contract Expired",
              message: isArabic 
                ? `انتهت صلاحية عقد "${contract.contract_title}"`
                : `Contract "${contract.contract_title}" has expired`,
              type: "danger",
              category: "contract",
              timestamp: new Date(),
              read: false,
              data: contract
            });
          } else if (daysUntilEnd <= criticalDays) {
            newNotifications.push({
              id: `contract-critical-${contract.id}`,
              title: isArabic ? "عقد ينتهي قريباً!" : "Contract Expiring Soon!",
              message: isArabic 
                ? `عقد "${contract.contract_title}" ينتهي خلال ${daysUntilEnd} أيام`
                : `Contract "${contract.contract_title}" expires in ${daysUntilEnd} days`,
              type: "danger",
              category: "contract",
              timestamp: new Date(),
              read: false,
              data: contract
            });
          } else if (daysUntilEnd <= warningDays) {
            newNotifications.push({
              id: `contract-warning-${contract.id}`,
              title: isArabic ? "تنبيه: عقد يقترب من الانتهاء" : "Warning: Contract Ending Soon",
              message: isArabic 
                ? `عقد "${contract.contract_title}" ينتهي خلال ${daysUntilEnd} أيام`
                : `Contract "${contract.contract_title}" ends in ${daysUntilEnd} days`,
              type: "warning",
              category: "contract",
              timestamp: new Date(),
              read: false,
              data: contract
            });
          }
        }
      });

      // Check high-priority active risks
      const { data: risks } = await supabase
        .from("risks")
        .select("*")
        .in("status", ["active", "identified"])
        .eq("impact", "high");

      risks?.forEach(risk => {
        newNotifications.push({
          id: `risk-high-${risk.id}`,
          title: isArabic ? "خطر عالي التأثير نشط" : "High-Impact Risk Active",
          message: isArabic 
            ? `خطر "${risk.risk_title}" يتطلب اهتماماً فورياً`
            : `Risk "${risk.risk_title}" requires immediate attention`,
          type: "danger",
          category: "risk",
          timestamp: new Date(),
          read: false,
          data: risk
        });

        // Check overdue risk reviews
        if (risk.review_date) {
          const reviewDate = new Date(risk.review_date);
          if (isBefore(reviewDate, today)) {
            newNotifications.push({
              id: `risk-overdue-${risk.id}`,
              title: isArabic ? "مراجعة خطر متأخرة" : "Overdue Risk Review",
              message: isArabic 
                ? `مراجعة خطر "${risk.risk_title}" متأخرة`
                : `Review for risk "${risk.risk_title}" is overdue`,
              type: "warning",
              category: "risk",
              timestamp: new Date(),
              read: false,
              data: risk
            });
          }
        }
      });

      // Check overdue procurement items
      const { data: procurement } = await supabase
        .from("procurement_items")
        .select("*")
        .not("delivery_date", "is", null)
        .neq("status", "delivered")
        .neq("status", "cancelled");

      procurement?.forEach(item => {
        if (item.delivery_date) {
          const deliveryDate = new Date(item.delivery_date);
          const daysUntilDelivery = differenceInDays(deliveryDate, today);

          if (daysUntilDelivery < 0) {
            newNotifications.push({
              id: `procurement-overdue-${item.id}`,
              title: isArabic ? "تسليم متأخر" : "Overdue Delivery",
              message: isArabic 
                ? `تسليم "${item.description || item.boq_item_number}" متأخر`
                : `Delivery of "${item.description || item.boq_item_number}" is overdue`,
              type: "danger",
              category: "procurement",
              timestamp: new Date(),
              read: false,
              data: item
            });
          } else if (daysUntilDelivery <= criticalDays) {
            newNotifications.push({
              id: `procurement-critical-${item.id}`,
              title: isArabic ? "تسليم قريب جداً" : "Delivery Due Soon",
              message: isArabic 
                ? `تسليم "${item.description || item.boq_item_number}" خلال ${daysUntilDelivery} أيام`
                : `"${item.description || item.boq_item_number}" delivery in ${daysUntilDelivery} days`,
              type: "warning",
              category: "procurement",
              timestamp: new Date(),
              read: false,
              data: item
            });
          }
        }
      });

      // Sort by type (danger first) and timestamp
      newNotifications.sort((a, b) => {
        const typeOrder = { danger: 0, warning: 1, info: 2, success: 3 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type];
        }
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);

      // Show toast for critical notifications
      const criticalCount = newNotifications.filter(n => n.type === "danger").length;
      if (criticalCount > 0 && soundEnabled) {
        toast({
          title: isArabic ? "تنبيهات حرجة" : "Critical Alerts",
          description: isArabic 
            ? `لديك ${criticalCount} تنبيهات تحتاج اهتماماً فورياً`
            : `You have ${criticalCount} alerts requiring immediate attention`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isArabic, toast, soundEnabled]);

  // Initial check and setup realtime subscription
  useEffect(() => {
    if (user) {
      checkForNotifications();

      // Setup realtime subscriptions
      const contractsChannel = supabase
        .channel('contracts-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contracts' },
          () => checkForNotifications()
        )
        .subscribe();

      const risksChannel = supabase
        .channel('risks-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'risks' },
          () => checkForNotifications()
        )
        .subscribe();

      const procurementChannel = supabase
        .channel('procurement-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'procurement_items' },
          () => checkForNotifications()
        )
        .subscribe();

      // Auto-check every 5 minutes if enabled
      let intervalId: NodeJS.Timeout | null = null;
      if (autoCheck) {
        intervalId = setInterval(checkForNotifications, 5 * 60 * 1000);
      }

      return () => {
        supabase.removeChannel(contractsChannel);
        supabase.removeChannel(risksChannel);
        supabase.removeChannel(procurementChannel);
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [user, autoCheck, checkForNotifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.read ? prev - 1 : prev;
    });
  };

  const getNotificationIcon = (category: Notification["category"]) => {
    switch (category) {
      case "contract":
        return FileText;
      case "risk":
        return Shield;
      case "procurement":
        return Package;
      case "deadline":
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "danger":
        return "bg-red-500 text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      case "success":
        return "bg-green-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">
              {isArabic ? "الإشعارات" : "Notifications"}
            </h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={checkForNotifications}
              disabled={isLoading}
            >
              <Bell className={cn("h-4 w-4", isLoading && "animate-pulse")} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={markAllAsRead}
              >
                <Check className="h-3 w-3 me-1" />
                {isArabic ? "قراءة الكل" : "Read All"}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = getNotificationIcon(notification.category);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          getNotificationColor(notification.type)
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "font-medium text-sm",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 -mt-1 -me-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(notification.timestamp, "PPp", { locale })}
                        </p>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute top-4 start-2 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">
                {isArabic ? "لا توجد إشعارات" : "No notifications"}
              </p>
              <p className="text-sm">
                {isArabic ? "أنت على اطلاع بكل شيء!" : "You're all caught up!"}
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-check"
                checked={autoCheck}
                onCheckedChange={setAutoCheck}
                className="h-4 w-7"
              />
              <label htmlFor="auto-check" className="text-xs text-muted-foreground cursor-pointer">
                {isArabic ? "تحديث تلقائي" : "Auto refresh"}
              </label>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
              <a href="/settings">
                <Settings className="h-3 w-3 me-1" />
                {isArabic ? "الإعدادات" : "Settings"}
              </a>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
