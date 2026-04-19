import { ReactNode } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { UnifiedHeader } from "./UnifiedHeader";
import { NavigationBar } from "./NavigationBar";
import { PageTransition } from "./PageTransition";
import { PageTipsBox } from "./PageTipsBox";
import BackgroundImage from "./BackgroundImage";
import { ErrorBoundary } from "./ErrorBoundary";

interface PageLayoutProps {
  children: ReactNode;
  showBackground?: boolean;
  className?: string;
}

export function PageLayout({ children, showBackground = false, className = "" }: PageLayoutProps) {
  const { isArabic } = useLanguage();

  return (
    <div
      className="min-h-screen flex flex-col bg-background relative"
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 0% 0%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(900px 500px at 100% 0%, hsl(var(--accent) / 0.08), transparent 60%)",
      }}
    >
      {showBackground && <BackgroundImage />}

      <UnifiedHeader />
      
      <main className={`flex-1 container mx-auto px-4 py-6 md:py-8 ${className}`}>
        <NavigationBar />
        <PageTipsBox />
        
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Footer with Developer Credit */}
      <footer className="border-t border-border py-4 md:py-6 bg-muted/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© 2025 PMS - {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}</span>
            <div className="flex items-center gap-1">
              <span>{isArabic ? "تطوير:" : "Developed by:"}</span>
              <span className="font-medium text-foreground">Dr.Eng. Mohamed Sobh</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
