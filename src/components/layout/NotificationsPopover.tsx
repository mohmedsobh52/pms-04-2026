import { Bell, Check, CheckCheck, X, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useNotifications, type Notification } from "@/hooks/useNotificationsInbox";
import { cn } from "@/lib/utils";

const SEV_ICON: Record<Notification["severity"], React.ComponentType<any>> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
  success: Check,
};

const SEV_COLOR: Record<Notification["severity"], string> = {
  info: "text-sky-500",
  warning: "text-amber-500",
  critical: "text-destructive",
  success: "text-emerald-500",
};

export function NotificationsPopover() {
  const { isArabic } = useLanguage();
  const { data = [], unreadCount, markRead, markAllRead, remove } = useNotifications(50);

  const onItemClick = (n: Notification) => {
    if (!n.read_at) markRead.mutate([n.id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 z-50 bg-popover">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              {isArabic ? "الإشعارات" : "Notifications"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0
                ? isArabic
                  ? `${unreadCount} غير مقروءة`
                  : `${unreadCount} unread`
                : isArabic
                ? "كل شيء على ما يرام"
                : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {isArabic ? "قراءة الكل" : "Mark all"}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          <div className="py-1">
            {data.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                {isArabic ? "لا توجد إشعارات" : "No notifications yet"}
              </div>
            )}
            {data.map((n) => {
              const Icon = SEV_ICON[n.severity] ?? Info;
              const Wrapper: any = n.link ? Link : "div";
              const wrapperProps: any = n.link ? { to: n.link } : {};
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex gap-2 px-3 py-2.5 hover:bg-muted/60 transition-colors border-l-2",
                    n.read_at ? "border-l-transparent opacity-70" : "border-l-primary bg-primary/[0.03]",
                  )}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", SEV_COLOR[n.severity])} />
                  <Wrapper
                    {...wrapperProps}
                    onClick={() => onItemClick(n)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: isArabic ? ar : enUS,
                      })}
                    </p>
                  </Wrapper>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read_at && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => markRead.mutate([n.id])}
                        title={isArabic ? "تعليم كمقروء" : "Mark read"}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => remove.mutate(n.id)}
                      title={isArabic ? "حذف" : "Dismiss"}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
