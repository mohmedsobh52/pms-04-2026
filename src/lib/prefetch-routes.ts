/**
 * Prefetch heavy lazy-loaded routes during browser idle time.
 * Runs after the initial page is interactive, so it never blocks first paint.
 * Subsequent navigations to these routes are then instant.
 */
export function prefetchCommonRoutes() {
  const idle =
    (window as any).requestIdleCallback ||
    ((cb: () => void) => setTimeout(cb, 1500));

  idle(() => {
    // Most-visited routes after the home page
    import("@/pages/SavedProjectsPage");
    import("@/pages/DashboardPage");
    import("@/pages/HistoricalPricingPage");
    import("@/pages/LibraryPage");
  });
}
