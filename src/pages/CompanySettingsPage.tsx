import { useLanguage } from "@/hooks/useLanguage";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PageLayout } from "@/components/PageLayout";
import { CompanySettingsPanel } from "@/components/CompanySettingsPanel";
import { Button } from "@/components/ui/button";
import { RotateCcw, Building2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const CompanySettingsPage = () => {
  const { isArabic } = useLanguage();
  const { resetSettings } = useCompanySettings();
  const { toast } = useToast();

  const handleReset = () => {
    resetSettings();
    toast({
      title: isArabic ? "تم إعادة التعيين" : "Settings Reset",
      description: isArabic 
        ? "تمت إعادة تعيين جميع الإعدادات إلى القيم الافتراضية" 
        : "All settings have been reset to default values",
    });
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/settings" className="hover:text-foreground transition-colors">
            {isArabic ? "الإعدادات" : "Settings"}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {isArabic ? "الشركة" : "Company"}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {isArabic ? "إعدادات الشركة" : "Company Settings"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isArabic 
                  ? "إدارة معلومات وإعدادات شركتك" 
                  : "Manage your company information and settings"}
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {isArabic ? "إعادة تعيين الإعدادات" : "Reset Settings"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isArabic ? "إعادة تعيين الإعدادات؟" : "Reset Settings?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isArabic 
                    ? "سيتم إعادة تعيين جميع إعدادات الشركة إلى القيم الافتراضية. لا يمكن التراجع عن هذا الإجراء."
                    : "This will reset all company settings to their default values. This action cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {isArabic ? "إلغاء" : "Cancel"}
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isArabic ? "إعادة التعيين" : "Reset"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Main Content */}
        <CompanySettingsPanel />
      </div>
    </PageLayout>
  );
};

export default CompanySettingsPage;
