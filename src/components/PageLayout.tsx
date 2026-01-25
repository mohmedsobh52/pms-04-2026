import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import BackgroundImage from "@/components/BackgroundImage";
import { PageLoadingProgress } from "@/components/PageLoadingProgress";
import { PageTransition } from "@/components/PageTransition";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BackToHomeButton } from "@/components/BackToHomeButton";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { useLanguage } from "@/hooks/useLanguage";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current tab from path
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "dashboard";
    if (path === "/items") return "analysis";
    if (path === "/analysis-tools") return "analysis-tools";
    if (path === "/cost-analysis") return "cost-analysis";
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
    if (path === "/material-prices") return "material-prices";
    if (path === "/library") return "library";
    if (path === "/historical-pricing") return "historical-pricing";
    if (path === "/fast-extraction") return "fast-extraction";
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
      "cost-analysis": "/cost-analysis",
      "compare": "/quotations",
      "boq-compare": "/analysis-tools",
      "market-rates": "/analysis-tools",
      "procurement": "/procurement",
      "procurement-schedule": "/procurement",
      "material-prices": "/material-prices",
      "resources": "/resources",
      "upload": "/quotations",
      "reports": "/reports",
      "report": "/reports",
      "version-compare": "/compare-versions",
      "p6-export": "/p6-export",
      "risk": "/risk",
      "contracts": "/contracts",
      "subcontractors": "/subcontractors",
      "settings": "/settings",
      "preferences": "/settings",
      "help": "/about",
      "attachments": "/attachments",
      "templates": "/templates",
      
      "library": "/library",
      "historical-pricing": "/historical-pricing",
      "fast-extraction": "/fast-extraction",
      "quotations": "/quotations",
      // Merged menu routes
      "analysis-estimating": "/analysis-tools",
      "library-procurement": "/library",
      "stakeholders": "/contracts",
    };
    
    const route = routes[tab] || "/";
    navigate(route);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BackgroundImage />
      <PageLoadingProgress />
      
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-4 mb-4">
          <BackToHomeButton />
          <div className="flex-1">
            <Breadcrumbs />
          </div>
        </div>
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
      <footer className="border-t border-border py-4 md:py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{isArabic ? "مدعوم بالذكاء الاصطناعي" : "Powered by AI"}</p>
        </div>
      </footer>
    </div>
  );
}
