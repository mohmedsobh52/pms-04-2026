import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: [
      {
        find: /^@\/integrations\/supabase\/client$/,
        replacement: path.resolve(__dirname, "./src/integrations/supabase/client.runtime.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  build: {
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    // Strip console.log/debugger in production for smaller bundles & cleaner runtime
    ...(mode === 'production' && {
      esbuildOptions: { drop: ['console', 'debugger'] },
    }),
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate chunks for better caching & parallel loading
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'chart-vendor': ['recharts'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
}));
