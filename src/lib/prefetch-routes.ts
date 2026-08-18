/**
 * Prefetch heavy lazy-loaded routes during browser idle time.
 * Runs after the initial page is interactive, so it never blocks first paint.
 * Subsequent navigations to these routes are then instant.
 */

type RouteLoader = () => Promise<unknown>;

const routeLoaders: Record<string, RouteLoader> = {
  "/projects": () => import("@/pages/SavedProjectsPage"),
  "/saved-projects": () => import("@/pages/SavedProjectsPage"),
  "/dashboard": () => import("@/pages/DashboardPage"),
  "/historical-pricing": () => import("@/pages/HistoricalPricingPage"),
  "/library": () => import("@/pages/LibraryPage"),
  "/reports": () => import("@/pages/ReportsPage"),
  "/contracts": () => import("@/pages/ContractsPage"),
  "/quotations": () => import("@/pages/QuotationsPage"),
  "/settings": () => import("@/pages/SettingsPage"),
  "/project-details": () => import("@/pages/ProjectDetailsPage"),
  "/procurement": () => import("@/pages/ProcurementPage"),
  "/subcontractors": () => import("@/pages/SubcontractorsPage"),
  "/risk": () => import("@/pages/RiskPage"),
  "/items": () => import("@/pages/BOQItemsPage"),
  "/analysis-tools": () => import("@/pages/AnalysisToolsPage"),
  "/material-prices": () => import("@/pages/MaterialPricesPage"),
  "/resources": () => import("@/pages/ResourcesPage"),
  "/resources-dashboard": () => import("@/pages/ResourcesDashboardPage"),
  "/calendar": () => import("@/pages/CalendarPage"),
  "/templates": () => import("@/pages/TemplatesPage"),
  "/notifications": () => import("@/pages/NotificationsPage"),
  "/approvals": () => import("@/pages/ApprovalsInboxPage"),
  "/executive-summary": () => import("@/pages/ExecutiveSummaryPage"),
  "/technical-proposal": () => import("@/pages/TechnicalProposalGeneratorPage"),
  "/progress-certificates": () => import("@/pages/ProgressCertificatesPage"),
  "/cost-control-evm": () => import("@/pages/CostControlEvmStandalone"),
  "/help": () => import("@/pages/HelpPage"),
  "/profile": () => import("@/pages/ProfilePage"),
  "/team": () => import("@/pages/TeamPage"),
};

const prefetched = new Set<string>();

function safeLoad(path: string) {
  if (prefetched.has(path)) return;
  // Never prefetch on slow links or data-saver mode.
  const conn = (navigator as any).connection;
  if (conn?.saveData || /2g/i.test(String(conn?.effectiveType || ""))) return;
  prefetched.add(path);
  const loader = routeLoaders[path];
  if (loader) loader().catch(() => prefetched.delete(path));
}

export function prefetchCommonRoutes() {
  const idle =
    (window as any).requestIdleCallback ||
    ((cb: () => void) => setTimeout(cb, 1500));

  idle(() => {
    safeLoad("/projects");
    safeLoad("/dashboard");
    safeLoad("/historical-pricing");
    safeLoad("/library");
  });
}

/**
 * Prefetch on hover/focus — call from <Link> wrappers or onMouseEnter handlers.
 * Makes navigation feel instantaneous even for routes not in the idle preload set.
 */
export function prefetchRoute(path: string) {
  safeLoad(path);
}
