import { ReactNode } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { AppShell } from "./layout/AppShell";
import { PageTransition } from "./PageTransition";
import { PageTipsBox } from "./PageTipsBox";
import BackgroundImage from "./BackgroundImage";
import { SuggestionsBox } from "./historical/SuggestionsBox";

interface PageLayoutProps {
  children: ReactNode;
  showBackground?: boolean;
  className?: string;
}

/**
 * Legacy page wrapper — now delegates to the unified AppShell so every screen
 * shares the same sidebar, topbar, breadcrumbs and container width.
 */
export function PageLayout({ children, showBackground = false, className = "" }: PageLayoutProps) {
  const { isArabic } = useLanguage();

  return (
    <AppShell className={className}>
      {showBackground && <BackgroundImage />}

      <PageTipsBox />

      <PageTransition>{children}</PageTransition>

      <footer className="mt-8 border-t border-border pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© 2025 PMS - {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}</span>
          <div className="flex items-center gap-1">
            <span>{isArabic ? "تطوير:" : "Developed by:"}</span>
            <span className="font-medium text-foreground">Dr.Eng. Mohamed Sobh</span>
          </div>
        </div>
      </footer>

      <SuggestionsBox />
    </AppShell>
  );
}
