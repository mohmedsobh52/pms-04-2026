import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft, Settings2, CalendarDays, FileSignature, Clock, AlertCircle, CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PMSLogo } from "@/components/PMSLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { UserMenu } from "@/components/UserMenu";
import { ProjectCalendar } from "@/components/ProjectCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface UpcomingItem {
  type: "project" | "contract" | "milestone";
  title: string;
  date: Date;
  daysLeft: number;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({ projects: 0, contracts: 0, upcoming: 0, overdue: 0, completed: 0 });
  const [upcomingList, setUpcomingList] = useState<UpcomingItem[]>([]);
  const [allUpcoming, setAllUpcoming] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      const in30 = new Date(); in30.setDate(today.getDate() + 30);
      const [proj, contr, miles] = await Promise.all([
        supabase.from('saved_projects').select('id,name,end_date,status').eq('user_id', user.id),
        supabase.from('contracts').select('id,contract_title,end_date,status').eq('user_id', user.id),
        supabase.from('contract_milestones').select('id,milestone_name,due_date,status').eq('user_id', user.id).neq('status', 'completed'),
      ]);
      const all = [...(proj.data || []), ...(contr.data || [])];
      const dates = all.filter((r: any) => r.end_date).map((r: any) => ({ d: new Date(r.end_date), s: r.status }));
      setStats({
        projects: proj.data?.length || 0,
        contracts: contr.data?.length || 0,
        upcoming: dates.filter((x) => x.d >= today && x.d <= in30).length,
        overdue: dates.filter((x) => x.d < today && x.s !== 'completed' && x.s !== 'مكتمل').length,
        completed: all.filter((r: any) => r.status === 'completed' || r.status === 'مكتمل').length,
      });

      const items: UpcomingItem[] = [];
      (proj.data || []).forEach((p: any) => {
        if (p.end_date && p.status !== 'completed') {
          const d = new Date(p.end_date);
          if (d >= today) items.push({ type: 'project', title: p.name, date: d, daysLeft: Math.ceil((d.getTime() - today.getTime()) / 86400000) });
        }
      });
      (contr.data || []).forEach((c: any) => {
        if (c.end_date && c.status !== 'completed') {
          const d = new Date(c.end_date);
          if (d >= today) items.push({ type: 'contract', title: c.contract_title, date: d, daysLeft: Math.ceil((d.getTime() - today.getTime()) / 86400000) });
        }
      });
      (miles.data || []).forEach((m: any) => {
        if (m.due_date) {
          const d = new Date(m.due_date);
          if (d >= today) items.push({ type: 'milestone', title: m.milestone_name, date: d, daysLeft: Math.ceil((d.getTime() - today.getTime()) / 86400000) });
        }
      });
      const sorted = items.sort((a, b) => a.daysLeft - b.daysLeft);
      setUpcomingList(sorted.slice(0, 5));
      setAllUpcoming(sorted);
    })();
  }, [user]);

  const cards = [
    { label: isArabic ? 'المشاريع' : 'Projects', value: stats.projects, icon: CalendarDays, color: 'text-primary', bg: 'bg-primary/10' },
    { label: isArabic ? 'العقود' : 'Contracts', value: stats.contracts, icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: isArabic ? 'قادمة (30 يوم)' : 'Upcoming (30d)', value: stats.upcoming, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: isArabic ? 'متأخرة' : 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
    { label: isArabic ? 'مكتملة' : 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <PMSLogo size="md" />
              <div>
                <h1 className="font-display text-lg font-bold">{isArabic ? "التقويم" : "Calendar"}</h1>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? "مواعيد المشاريع والعقود" : "Project & Contract Dates"}
                </p>
              </div>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {user && <RealtimeNotifications />}
              <LanguageToggle />
              <ThemeToggle />
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </Link>
              {user ? (
                <UserMenu />
              ) : (
                <Link to="/auth">
                  <Button size="sm">{isArabic ? "تسجيل الدخول" : "Sign In"}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {user && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map((c) => (
              <Card key={c.label} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.bg}`}>
                    <c.icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground truncate">{c.label}</div>
                    <div className={`text-lg font-bold ${c.color}`}>{c.value.toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {user && upcomingList.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                {isArabic ? "أقرب 5 مواعيد قادمة" : "Next 5 Upcoming Deadlines"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingList.map((it, i) => {
                const typeMeta: Record<string, { label: string; cls: string; icon: any }> = {
                  project: { label: isArabic ? "مشروع" : "Project", cls: "bg-primary/10 text-primary", icon: CalendarDays },
                  contract: { label: isArabic ? "عقد" : "Contract", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: FileSignature },
                  milestone: { label: isArabic ? "معلم" : "Milestone", cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: Target },
                };
                const meta = typeMeta[it.type];
                const Icon = meta.icon;
                const urgent = it.daysLeft <= 7;
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className={`p-2 rounded-md ${meta.cls}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.date.toLocaleDateString(isArabic ? "ar-SA" : "en-US")} · <Badge variant="outline" className="text-[10px] py-0 px-1 ms-1">{meta.label}</Badge>
                      </p>
                    </div>
                    <Badge className={urgent ? "bg-red-500 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"}>
                      {it.daysLeft} {isArabic ? "يوم" : "d"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {user ? (
          <ProjectCalendar />
        ) : (
          <Card className="max-w-md mx-auto border-dashed">
            <CardContent className="p-8 text-center space-y-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                {isArabic ? "يرجى تسجيل الدخول" : "Please Sign In"}
              </h3>
              <p className="text-muted-foreground">
                {isArabic 
                  ? "سجل دخولك لعرض تقويم المشاريع والمواعيد"
                  : "Sign in to view your project calendar and deadlines"
                }
              </p>
              <Link to="/auth">
                <Button>{isArabic ? "تسجيل الدخول" : "Sign In"}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
