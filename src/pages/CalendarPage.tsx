import { Link } from "react-router-dom";
import { Calendar, ArrowLeft, Settings2 } from "lucide-react";
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

export default function CalendarPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();

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

      <main className="container mx-auto px-4 py-8">
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
