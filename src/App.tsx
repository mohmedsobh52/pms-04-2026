import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AnalysisProvider } from "@/hooks/useAnalysisData";
import { UpdateBanner } from "@/components/UpdateBanner";
import BackgroundImage from "@/components/BackgroundImage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SharedView from "./pages/SharedView";
import SavedProjectsPage from "./pages/SavedProjectsPage";
import About from "./pages/About";
import CostAnalysisPage from "./pages/CostAnalysisPage";
import Changelog from "./pages/Changelog";
import AdminVersions from "./pages/AdminVersions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalysisProvider>
          <TooltipProvider>
            <BackgroundImage />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <UpdateBanner />
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/shared/:shareCode" element={<SharedView />} />
              <Route path="/projects" element={<SavedProjectsPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/cost-analysis" element={<CostAnalysisPage />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/admin/versions" element={<AdminVersions />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AnalysisProvider>
      </AuthProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
