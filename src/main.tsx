import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Foundation typography: Tajawal (display + body Latin-friendly) + Cairo (Arabic)
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";

import { prefetchCommonRoutes } from "./lib/prefetch-routes";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

if (typeof window !== "undefined") {
  prefetchCommonRoutes();
}
