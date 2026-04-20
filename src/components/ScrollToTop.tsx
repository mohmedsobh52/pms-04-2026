import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Automatically scroll to top when the route changes.
 * Avoids the common SPA issue of landing in the middle of a new page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
