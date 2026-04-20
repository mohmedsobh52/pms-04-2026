import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { prefetchCommonRoutes } from "./lib/prefetch-routes";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

// Warm up the cache for frequently-visited routes during browser idle time
if (typeof window !== "undefined") {
  prefetchCommonRoutes();
}
