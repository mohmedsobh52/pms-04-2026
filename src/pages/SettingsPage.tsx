import { NotificationSettings } from "@/components/NotificationSettings";
import { AIModelSelector } from "@/components/AIModelSelector";
import { AnalysisStatusDashboard } from "@/components/AnalysisStatusDashboard";
import { CompanySettingsPanel } from "@/components/CompanySettingsPanel";
import { DeveloperInfo } from "@/components/DeveloperInfo";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Bell, Activity, Building2, Info } from "lucide-react";

const SettingsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          {isArabic ? "الإعدادات" : "Settings"}
        </h2>
        
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? "حول" : "About"}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="mt-6">
            <CompanySettingsPanel />
          </TabsContent>
          
          <TabsContent value="ai" className="mt-6">
            <AIModelSelector />
          </TabsContent>
          
          <TabsContent value="tracking" className="mt-6">
            <AnalysisStatusDashboard />
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="max-w-xl">
              <h3 className="text-lg font-semibold mb-4">
                {isArabic ? "مصمم ومطور البرنامج" : "Program Designer & Developer"}
              </h3>
              <DeveloperInfo />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
