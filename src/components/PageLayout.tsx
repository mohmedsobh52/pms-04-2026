import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User } from "lucide-react";
import BackgroundImage from "@/components/BackgroundImage";
import { PageLoadingProgress } from "@/components/PageLoadingProgress";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const { user, signOut } = useAuth();
  const { isArabic } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current tab from path
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "dashboard";
    if (path === "/items") return "analysis";
    if (path === "/analysis-tools") return "analysis-tools";
    if (path === "/procurement") return "procurement";
    if (path === "/quotations") return "upload";
    if (path === "/subcontractors") return "subcontractors";
    if (path === "/contracts") return "contracts";
    if (path === "/risk") return "risk";
    if (path === "/reports") return "reports";
    if (path === "/settings") return "settings";
    if (path === "/attachments") return "attachments";
    if (path === "/templates") return "templates";
    if (path === "/p6-export") return "p6-export";
    if (path === "/compare-versions") return "version-compare";
    return "dashboard";
  };

  const handleNavigate = (tab: string) => {
    const routes: Record<string, string> = {
      "dashboard": "/",
      "home": "/",
      "analysis": "/items",
      "items-menu": "/items",
      "wbs": "/items",
      "cost-brief": "/items",
      "charts": "/items",
      "time-schedule": "/items",
      "schedule-integration": "/items",
      "analysis-tools": "/analysis-tools",
      "cost-analysis": "/analysis-tools",
      "compare": "/quotations",
      "boq-compare": "/analysis-tools",
      "market-rates": "/analysis-tools",
      "procurement": "/procurement",
      "procurement-schedule": "/procurement",
      "resources": "/procurement",
      "upload": "/quotations",
      "reports": "/reports",
      "report": "/reports",
      "version-compare": "/compare-versions",
      "p6-export": "/p6-export",
      "risk": "/risk",
      "contracts": "/contracts",
      "settings": "/settings",
      "preferences": "/settings",
      "help": "/about",
      "attachments": "/attachments",
      "templates": "/templates",
      "subcontractors": "/subcontractors",
    };
    
    const route = routes[tab] || "/";
    navigate(route);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BackgroundImage />
      <PageLoadingProgress />
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BOQ Analyzer
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageToggle />
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate max-w-32">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{isArabic ? "تسجيل الخروج" : "Logout"}</span>
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  {isArabic ? "تسجيل الدخول" : "Login"}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Breadcrumbs />
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Floating Toolbar */}
      {user && (
        <FloatingToolbar 
          onNavigate={handleNavigate}
          currentTab={getCurrentTab()}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{isArabic ? "مدعوم بالذكاء الاصطناعي" : "Powered by AI"}</p>
        </div>
      </footer>
    </div>
  );
}
