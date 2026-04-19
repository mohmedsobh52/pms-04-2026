import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, ArrowLeft, Settings2, CalendarDays, FileSignature, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { PMSLogo } from "@/components/PMSLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { UserMenu } from "@/components/UserMenu";
import { ProjectCalendar } from "@/components/ProjectCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function CalendarPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [stats, setStats] = useState({ projects: 0, contracts: 0, upcoming: 0, overdue: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      const in30 = new Date(); in30.setDate(today.getDate() + 30);
      const [proj, contr] = await Promise.all([
        supabase.from('saved_projects').select('end_date,status').eq('user_id', user.id),
        supabase.from('contracts').select('end_date,status').eq('user_id', user.id),
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
