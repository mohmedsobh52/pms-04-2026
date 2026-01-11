import { useState, useEffect } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isBefore, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  AlertTriangle,
  Package,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  Bell,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "contract" | "risk" | "procurement" | "project" | "deadline";
  status?: string;
  description?: string;
  priority?: "high" | "medium" | "low";
}

export function ProjectCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const locale = isArabic ? ar : enUS;

  useEffect(() => {
    if (user) {
      fetchAllEvents();
    }
  }, [user, currentMonth]);

  const fetchAllEvents = async () => {
    setIsLoading(true);
    try {
      const allEvents: CalendarEvent[] = [];

      // Fetch contracts
      const { data: contracts } = await supabase
        .from("contracts")
        .select("*")
        .or(`start_date.gte.${format(startOfMonth(currentMonth), 'yyyy-MM-dd')},end_date.lte.${format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd')}`);

      contracts?.forEach(contract => {
        if (contract.start_date) {
          allEvents.push({
            id: `contract-start-${contract.id}`,
            title: `${isArabic ? 'بداية عقد:' : 'Contract Start:'} ${contract.contract_title}`,
            date: new Date(contract.start_date),
            type: "contract",
            status: contract.status,
            description: contract.scope_of_work || undefined,
            priority: "medium"
          });
        }
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          const isExpiring = isBefore(endDate, addDays(new Date(), 7));
          allEvents.push({
            id: `contract-end-${contract.id}`,
            title: `${isArabic ? 'نهاية عقد:' : 'Contract End:'} ${contract.contract_title}`,
            date: endDate,
            type: "deadline",
            status: contract.status,
            description: contract.scope_of_work || undefined,
            priority: isExpiring ? "high" : "medium"
          });
        }
      });

      // Fetch risks with review dates
      const { data: risks } = await supabase
        .from("risks")
        .select("*")
        .not("review_date", "is", null);

      risks?.forEach(risk => {
        if (risk.review_date) {
          const reviewDate = new Date(risk.review_date);
          const isOverdue = isBefore(reviewDate, new Date());
          allEvents.push({
            id: `risk-${risk.id}`,
            title: `${isArabic ? 'مراجعة خطر:' : 'Risk Review:'} ${risk.risk_title}`,
            date: reviewDate,
            type: "risk",
            status: risk.status,
            description: risk.risk_description || undefined,
            priority: risk.impact === "high" || isOverdue ? "high" : risk.impact === "medium" ? "medium" : "low"
          });
        }
      });

      // Fetch procurement items with delivery dates
      const { data: procurement } = await supabase
        .from("procurement_items")
        .select("*")
        .not("delivery_date", "is", null);

      procurement?.forEach(item => {
        if (item.delivery_date) {
          const deliveryDate = new Date(item.delivery_date);
          const isOverdue = isBefore(deliveryDate, new Date()) && item.status !== "delivered";
          allEvents.push({
            id: `procurement-${item.id}`,
            title: `${isArabic ? 'تسليم:' : 'Delivery:'} ${item.description || item.boq_item_number}`,
            date: deliveryDate,
            type: "procurement",
            status: item.status,
            description: item.description || undefined,
            priority: isOverdue ? "high" : item.priority === "high" ? "high" : "medium"
          });
        }
      });

      // Fetch saved projects
      const { data: projects } = await supabase
        .from("saved_projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      projects?.forEach(project => {
        allEvents.push({
          id: `project-${project.id}`,
          title: `${isArabic ? 'مشروع:' : 'Project:'} ${project.name}`,
          date: new Date(project.created_at),
          type: "project",
          description: project.file_name || undefined,
          priority: "low"
        });
      });

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const handleDayClick = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    setSelectedDate(day);
    setSelectedEvents(dayEvents);
    if (dayEvents.length > 0) {
      setShowEventDialog(true);
    }
  };

  const getEventColor = (type: CalendarEvent["type"], priority?: string) => {
    if (priority === "high") return "bg-red-500";
    
    switch (type) {
      case "contract":
        return "bg-blue-500";
      case "risk":
        return "bg-orange-500";
      case "procurement":
        return "bg-purple-500";
      case "project":
        return "bg-green-500";
      case "deadline":
        return "bg-red-500";
      default:
        return "bg-primary";
    }
  };

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "contract":
        return FileText;
      case "risk":
        return AlertTriangle;
      case "procurement":
        return Package;
      case "project":
        return Building2;
      case "deadline":
        return Clock;
      default:
        return CalendarIcon;
    }
  };

  const days = getDaysInMonth();
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const weekDays = isArabic 
    ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(event => {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      return event.date >= today && event.date <= nextWeek;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {isArabic ? "تقويم المشاريع" : "Project Calendar"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[150px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className="text-center text-sm font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-1" />
              ))}
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const hasHighPriority = dayEvents.some(e => e.priority === "high");
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square p-1 border rounded-lg cursor-pointer transition-all hover:bg-muted/50",
                      isToday(day) && "border-primary bg-primary/5",
                      selectedDate && isSameDay(day, selectedDate) && "ring-2 ring-primary",
                      hasHighPriority && "border-red-500/50"
                    )}
                  >
                    <div className="h-full flex flex-col">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday(day) && "text-primary font-bold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex-1 flex flex-wrap gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getEventColor(event.type, event.priority)
                              )}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{isArabic ? "عقود" : "Contracts"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>{isArabic ? "مخاطر" : "Risks"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>{isArabic ? "مشتريات" : "Procurement"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>{isArabic ? "مشاريع" : "Projects"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{isArabic ? "مواعيد نهائية" : "Deadlines"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {isArabic ? "الأحداث القادمة" : "Upcoming Events"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map(event => {
                    const Icon = getEventIcon(event.type);
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors hover:bg-muted/50",
                          event.priority === "high" && "border-red-500/50 bg-red-500/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              getEventColor(event.type, event.priority)
                            )}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(event.date, "PPP", { locale })}
                            </p>
                            {event.priority === "high" && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                {isArabic ? "عاجل" : "Urgent"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                  <CalendarIcon className="h-10 w-10 mb-2" />
                  <p>{isArabic ? "لا توجد أحداث قادمة" : "No upcoming events"}</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate && format(selectedDate, "PPP", { locale })}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {selectedEvents.map(event => {
                const Icon = getEventIcon(event.type);
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      event.priority === "high" && "border-red-500/50 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          getEventColor(event.type, event.priority)
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {event.status && (
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          )}
                          {event.priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              {isArabic ? "أولوية عالية" : "High Priority"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
