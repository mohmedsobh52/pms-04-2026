import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Bell, Activity, Building2, Info, Database } from "lucide-react";

// Lazy-load heavy settings panels to keep first paint fast
const CompanySettingsPanel = lazy(() =>
  import("@/components/CompanySettingsPanel").then((m) => ({ default: m.CompanySettingsPanel }))
);
const AIModelSelector = lazy(() =>
  import("@/components/AIModelSelector").then((m) => ({ default: m.AIModelSelector }))
);
const AnalysisStatusDashboard = lazy(() =>
  import("@/components/AnalysisStatusDashboard").then((m) => ({ default: m.AnalysisStatusDashboard }))
);
const NotificationSettings = lazy(() =>
  import("@/components/NotificationSettings").then((m) => ({ default: m.NotificationSettings }))
);
const DataMigrationPanel = lazy(() =>
  import("@/components/DataMigrationPanel").then((m) => ({ default: m.DataMigrationPanel }))
);
const DeveloperInfo = lazy(() =>
  import("@/components/DeveloperInfo").then((m) => ({ default: m.DeveloperInfo }))
);

const TabFallback = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="w-6 h-6 animate-spin me-2" />
    <span>Loading…</span>
  </div>
);

const SettingsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          {isArabic ? "الإعدادات" : "Settings"}
        </h2>
        
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-6 tabs-navigation-safe">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "الشركة" : "Company"}</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "نموذج AI" : "AI Model"}</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "التتبع" : "Tracking"}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "الإشعارات" : "Notifications"}</span>
            </TabsTrigger>
            <TabsTrigger value="migration" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "نقل البيانات" : "Migration"}</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "حول" : "About"}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <CompanySettingsPanel />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="ai" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <AIModelSelector />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="tracking" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <AnalysisStatusDashboard />
            </Suspense>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <NotificationSettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="migration" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <DataMigrationPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="max-w-xl">
              <h3 className="text-lg font-semibold mb-4">
                {isArabic ? "مصمم ومطور البرنامج" : "Program Designer & Developer"}
              </h3>
              <Suspense fallback={<TabFallback />}>
                <DeveloperInfo />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
