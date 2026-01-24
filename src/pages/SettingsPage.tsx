import { NotificationSettings } from "@/components/NotificationSettings";
import { AIModelSelector } from "@/components/AIModelSelector";
import { AnalysisStatusDashboard } from "@/components/AnalysisStatusDashboard";
import { CompanySettingsPanel } from "@/components/CompanySettingsPanel";
import { useLanguage } from "@/hooks/useLanguage";
import { PageLayout } from "@/components/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Bell, Activity, Building2 } from "lucide-react";

const SettingsPage = () => {
  const { isArabic } = useLanguage();

  return (
    <PageLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          {isArabic ? "الإعدادات" : "Settings"}
        </h2>
        
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {isArabic ? "الشركة" : "Company"}
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              {isArabic ? "نموذج AI" : "AI Model"}
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {isArabic ? "تتبع التحليلات" : "Analysis Tracking"}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {isArabic ? "الإشعارات" : "Notifications"}
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
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
