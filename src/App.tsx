import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AnalysisProvider } from "@/hooks/useAnalysisData";
import { AnalysisTrackingProvider } from "@/hooks/useAnalysisTracking";
import { GlobalSearchProvider } from "@/contexts/GlobalSearchContext";
import { GlobalSuggestionsProvider } from "@/contexts/GlobalSuggestionsContext";
import { UpdateBanner } from "@/components/UpdateBanner";
import BackgroundImage from "@/components/BackgroundImage";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InlineErrorFallback } from "@/components/InlineErrorFallback";
import { GlobalSearch } from "@/components/GlobalSearch";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RequireRole } from "@/components/auth/RequireRole";
import { Loader2 } from "lucide-react";

// Lazy loaded pages for better initial load performance
const Index = lazy(() => import("./pages/Index"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Auth = lazy(() => import("./pages/Auth"));
const SharedView = lazy(() => import("./pages/SharedView"));
const SavedProjectsPage = lazy(() => import("./pages/SavedProjectsPage"));
const About = lazy(() => import("./pages/About"));
const CostAnalysisPage = lazy(() => import("./pages/CostAnalysisPage"));
const Changelog = lazy(() => import("./pages/Changelog"));
const AdminVersions = lazy(() => import("./pages/AdminVersions"));
const SuggestionsCenterPage = lazy(() => import("./pages/SuggestionsCenterPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const ApprovalsInboxPage = lazy(() => import("./pages/ApprovalsInboxPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsentPage = lazy(() => import("./pages/OAuthConsentPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProcurementPage = lazy(() => import("./pages/ProcurementPage"));
const SubcontractorsPage = lazy(() => import("./pages/SubcontractorsPage"));
const QuotationsPage = lazy(() => import("./pages/QuotationsPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const RiskPage = lazy(() => import("./pages/RiskPage"));
// ReportsPage lazy import removed - now integrated in SavedProjectsPage
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AnalysisToolsPage = lazy(() => import("./pages/AnalysisToolsPage"));
const BOQItemsPage = lazy(() => import("./pages/BOQItemsPage"));
const AttachmentsPage = lazy(() => import("./pages/AttachmentsPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const P6ExportPage = lazy(() => import("./pages/P6ExportPage"));
const CompareVersionsPage = lazy(() => import("./pages/CompareVersionsPage"));
const HistoricalPricingPage = lazy(() => import("./pages/HistoricalPricingPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const MaterialPricesPage = lazy(() => import("./pages/MaterialPricesPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
// FastExtractionPage removed - now integrated in AttachmentsTab
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const ProjectDetailsPage = lazy(() => import("./pages/ProjectDetailsPage"));
const NewProjectPage = lazy(() => import("./pages/NewProjectPage"));
const TenderSummaryPage = lazy(() => import("./pages/TenderSummaryPage"));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage"));
const CostControlReportPage = lazy(() => import("./pages/CostControlReportPage"));
const CostControlEvmStandalone = lazy(() => import("./pages/CostControlEvmStandalone"));
const PricingAccuracyPage = lazy(() => import("./pages/PricingAccuracyPage"));
const PartnerDetailsPage = lazy(() => import("./pages/PartnerDetailsPage"));
const ProgressCertificatesPage = lazy(() => import("./pages/ProgressCertificatesPage"));
const NewCertificatePage = lazy(() => import("./pages/NewCertificatePage"));
const CertificatesComparePage = lazy(() => import("./pages/CertificatesComparePage"));
const ResourcesDashboardPage = lazy(() => import("./pages/ResourcesDashboardPage"));
const DebugBreadcrumbsPage = lazy(() => import("./pages/DebugBreadcrumbsPage"));
const ExecutiveSummaryPage = lazy(() => import("./pages/ExecutiveSummaryPage"));
const ProjectsComparePage = lazy(() => import("./pages/ProjectsComparePage"));
const TechnicalProposalGeneratorPage = lazy(() => import("./pages/TechnicalProposalGeneratorPage"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnReconnect: 'always',
      retry: 1, // Only retry once on failure
    },
  },
});

// Page loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">جاري التحميل...</p>
    </div>
  </div>
);

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
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <GlobalSearchProvider>
                  <GlobalSuggestionsProvider>
                  <ScrollToTop />
                  <ErrorBoundary fallback={<InlineErrorFallback message="Search unavailable" />}>
                    <GlobalSearch />
                  </ErrorBoundary>
                  <ErrorBoundary fallback={<InlineErrorFallback message="Command palette unavailable" />}>
                    <CommandPalette />
                  </ErrorBoundary>
                  <UpdateBanner />
                  <FloatingBackButton />
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/analyze" element={<Navigate to="/projects" replace />} />
                       <Route path="/suggestions" element={<SuggestionsCenterPage />} />
                       <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/shared/:shareCode" element={<SharedView />} />
                        <Route path="/projects" element={<SavedProjectsPage />} />
                        <Route path="/projects/new" element={<NewProjectPage />} />
                        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                        <Route path="/projects/:projectId/pricing" element={<TenderSummaryPage />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/cost-analysis" element={<CostAnalysisPage />} />
                        <Route path="/changelog" element={<Changelog />} />
                        <Route path="/admin/versions" element={<RequireRole roles={["admin"]}><AdminVersions /></RequireRole>} />
                        <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminDashboardPage /></RequireRole>} />
                        {/* Separate pages for each section */}
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/items" element={<BOQItemsPage />} />
                        <Route path="/analysis-tools" element={<AnalysisToolsPage />} />
                        <Route path="/procurement" element={<ProcurementPage />} />
                        <Route path="/procurement/partner/:partnerId" element={<PartnerDetailsPage />} />
                        <Route path="/quotations" element={<QuotationsPage />} />
                        {/* Separate routes for contracts and subcontractors */}
                        <Route path="/contracts" element={<ContractsPage />} />
                        <Route path="/subcontractors" element={<SubcontractorsPage />} />
                        <Route path="/risk" element={<RiskPage />} />
                        <Route path="/approvals" element={<ApprovalsInboxPage />} />
                        <Route path="/reports" element={<Navigate to="/projects?tab=reports" replace />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/company-settings" element={<CompanySettingsPage />} />
                        <Route path="/attachments" element={<Navigate to="/projects?tab=attachments" replace />} />
                        <Route path="/templates" element={<TemplatesPage />} />
                        <Route path="/p6-export" element={<P6ExportPage />} />
                        <Route path="/compare-versions" element={<CompareVersionsPage />} />
                        <Route path="/historical-pricing" element={<HistoricalPricingPage />} />
                        <Route path="/resources" element={<ResourcesPage />} />
                        <Route path="/resources-dashboard" element={<ResourcesDashboardPage />} />
                        <Route path="/material-prices" element={<MaterialPricesPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/fast-extraction" element={<Navigate to="/projects?tab=attachments&mode=extraction" replace />} />
                        <Route path="/library" element={<LibraryPage />} />
                        <Route path="/cost-control-report" element={<CostControlReportPage />} />
                        <Route path="/cost-control-evm" element={<CostControlEvmStandalone />} />
                        <Route path="/projects/:projectId/cost-control" element={<CostControlReportPage />} />
                        <Route path="/pricing-accuracy" element={<PricingAccuracyPage />} />
                        <Route path="/progress-certificates" element={<ProgressCertificatesPage />} />
                        <Route path="/progress-certificates/new" element={<NewCertificatePage />} />
                        <Route path="/progress-certificates/compare" element={<CertificatesComparePage />} />
                        <Route path="/debug/breadcrumbs" element={<DebugBreadcrumbsPage />} />
                        <Route path="/executive-summary" element={<ExecutiveSummaryPage />} />
                        <Route path="/projects/compare" element={<ProjectsComparePage />} />
                        <Route path="/technical-proposal" element={<TechnicalProposalGeneratorPage />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                  </GlobalSuggestionsProvider>
                </GlobalSearchProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AnalysisTrackingProvider>
        </AnalysisProvider>
      </AuthProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
