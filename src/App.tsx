import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AnalysisProvider } from "@/hooks/useAnalysisData";
import { AnalysisTrackingProvider } from "@/hooks/useAnalysisTracking";
import { UpdateBanner } from "@/components/UpdateBanner";
import BackgroundImage from "@/components/BackgroundImage";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import Auth from "./pages/Auth";
import SharedView from "./pages/SharedView";
import SavedProjectsPage from "./pages/SavedProjectsPage";
import About from "./pages/About";
import CostAnalysisPage from "./pages/CostAnalysisPage";
import Changelog from "./pages/Changelog";
import AdminVersions from "./pages/AdminVersions";
import NotFound from "./pages/NotFound";
import DashboardPage from "./pages/DashboardPage";
import ProcurementPage from "./pages/ProcurementPage";
import SubcontractorsPage from "./pages/SubcontractorsPage";
import QuotationsPage from "./pages/QuotationsPage";
import ContractsPage from "./pages/ContractsPage";
import RiskPage from "./pages/RiskPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import AnalysisToolsPage from "./pages/AnalysisToolsPage";
import BOQItemsPage from "./pages/BOQItemsPage";
import AttachmentsPage from "./pages/AttachmentsPage";
import TemplatesPage from "./pages/TemplatesPage";
import P6ExportPage from "./pages/P6ExportPage";
import CompareVersionsPage from "./pages/CompareVersionsPage";
import HistoricalPricingPage from "./pages/HistoricalPricingPage";
import ResourcesPage from "./pages/ResourcesPage";
import MaterialPricesPage from "./pages/MaterialPricesPage";
import CalendarPage from "./pages/CalendarPage";
import FastExtractionPage from "./pages/FastExtractionPage";
import LibraryPage from "./pages/LibraryPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import NewProjectPage from "./pages/NewProjectPage";
import TenderSummaryPage from "./pages/TenderSummaryPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalysisProvider>
          <AnalysisTrackingProvider>
            <TooltipProvider>
              <BackgroundImage />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <UpdateBanner />
                <FloatingBackButton />
                <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/analyze" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/shared/:shareCode" element={<SharedView />} />
                <Route path="/projects" element={<SavedProjectsPage />} />
                <Route path="/projects/new" element={<NewProjectPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                <Route path="/projects/:projectId/pricing" element={<TenderSummaryPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/cost-analysis" element={<CostAnalysisPage />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/admin/versions" element={<AdminVersions />} />
                {/* Separate pages for each section */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/items" element={<BOQItemsPage />} />
                <Route path="/analysis-tools" element={<AnalysisToolsPage />} />
                <Route path="/procurement" element={<ProcurementPage />} />
                <Route path="/quotations" element={<QuotationsPage />} />
                {/* Separate routes for contracts and subcontractors */}
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/subcontractors" element={<SubcontractorsPage />} />
                <Route path="/risk" element={<RiskPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/company-settings" element={<CompanySettingsPage />} />
                <Route path="/attachments" element={<AttachmentsPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/p6-export" element={<P6ExportPage />} />
                <Route path="/compare-versions" element={<CompareVersionsPage />} />
                <Route path="/historical-pricing" element={<HistoricalPricingPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/material-prices" element={<MaterialPricesPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/fast-extraction" element={<FastExtractionPage />} />
                <Route path="/library" element={<LibraryPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AnalysisTrackingProvider>
        </AnalysisProvider>
      </AuthProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
