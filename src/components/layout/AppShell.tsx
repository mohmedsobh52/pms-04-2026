import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalSuggestionsInbox } from "@/components/GlobalSuggestionsInbox";
import { useLanguage } from "@/hooks/useLanguage";

interface AppShellProps {
  children: ReactNode;
  className?: string;
  /** Hide the breadcrumb row (e.g. on Home). */
  hideBreadcrumbs?: boolean;
  /** Render children full-bleed without the inner container. */
  fullBleed?: boolean;
}

/**
 * Unified application shell — persistent collapsible sidebar + sticky topbar
 * + breadcrumbs. Opt-in per page; preserves all page content unchanged.
 */
export function AppShell({ children, className = "", hideBreadcrumbs, fullBleed }: AppShellProps) {
  const { isArabic } = useLanguage();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background" dir={isArabic ? "rtl" : "ltr"}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar />
          <main
            className={`flex-1 ${fullBleed ? "" : "container mx-auto px-3 md:px-4 py-4 md:py-6"} ${className}`}
          >
            {!hideBreadcrumbs && (
              <div className="mb-3 md:mb-4">
                <Breadcrumbs />
              </div>
            )}
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
        <GlobalSuggestionsInbox />
      </div>
    </SidebarProvider>
  );
}

export default AppShell;
