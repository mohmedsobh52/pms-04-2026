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
};

const prefetched = new Set<string>();

function safeLoad(path: string) {
  if (prefetched.has(path)) return;
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
