import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  Save,
  Trash2,
  Star,
  Loader2
} from "lucide-react";

interface AnalysisPreference {
  id: string;
  preference_name: string;
  default_analysis_type: string;
  auto_analyze_on_upload: boolean;
  analysis_language: string;
  include_market_comparison: boolean;
  include_recommendations: boolean;
  email_notifications: boolean;
  is_default: boolean;
}

interface AnalysisPreferencesDialogProps {
  onPreferenceSelect?: (preference: AnalysisPreference) => void;
}

const ANALYSIS_TYPES = [
  { value: "extract_data", labelEn: "Extract Data", labelAr: "استخراج البيانات" },
  { value: "extract_boq", labelEn: "Extract BOQ", labelAr: "استخراج جدول الكميات" },
  { value: "cost_analysis", labelEn: "Cost Analysis", labelAr: "تحليل التكاليف" },
  { value: "summarize", labelEn: "Summarize", labelAr: "تلخيص" },
];

export function AnalysisPreferencesDialog({ onPreferenceSelect }: AnalysisPreferencesDialogProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<AnalysisPreference[]>([]);
  
  // Form state
  const [preferenceName, setPreferenceName] = useState("");
  const [analysisType, setAnalysisType] = useState("extract_data");
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [analysisLanguage, setAnalysisLanguage] = useState("ar");
  const [includeMarket, setIncludeMarket] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchPreferences();
    }
  }, [isOpen, user]);

  const fetchPreferences = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_analysis_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      setPreferences(data || []);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !preferenceName.trim()) {
      toast.error(isArabic ? "يرجى إدخال اسم الإعداد" : "Please enter preference name");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_analysis_preferences")
        .insert({
          user_id: user.id,
          preference_name: preferenceName,
          default_analysis_type: analysisType,
          auto_analyze_on_upload: autoAnalyze,
          analysis_language: analysisLanguage,
          include_market_comparison: includeMarket,
          include_recommendations: includeRecommendations,
          email_notifications: emailNotifications,
          is_default: preferences.length === 0
        });

      if (error) throw error;

      toast.success(isArabic ? "تم حفظ الإعداد بنجاح" : "Preference saved successfully");
      setPreferenceName("");
      fetchPreferences();
    } catch (error: any) {
      console.error("Error saving preference:", error);
      toast.error(isArabic ? "خطأ في الحفظ" : "Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      // Remove default from all
      await supabase
        .from("user_analysis_preferences")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      await supabase
        .from("user_analysis_preferences")
        .update({ is_default: true })
        .eq("id", id);

      toast.success(isArabic ? "تم تعيين الإعداد الافتراضي" : "Default preference set");
      fetchPreferences();
    } catch (error) {
      console.error("Error setting default:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_analysis_preferences")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success(isArabic ? "تم الحذف" : "Deleted");
      fetchPreferences();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleUsePreference = (pref: AnalysisPreference) => {
    if (onPreferenceSelect) {
      onPreferenceSelect(pref);
    }
    setIsOpen(false);
    toast.success(isArabic ? "تم تطبيق الإعداد" : "Preference applied");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          {isArabic ? "إعدادات التحليل" : "Analysis Settings"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            {isArabic ? "إعدادات التحليل المفضلة" : "Analysis Preferences"}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? "احفظ إعداداتك المفضلة لاستخدامها تلقائياً"
              : "Save your preferred settings for automatic use"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Preference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isArabic ? "إنشاء إعداد جديد" : "Create New Preference"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "اسم الإعداد" : "Preference Name"}</Label>
                  <Input
                    value={preferenceName}
                    onChange={(e) => setPreferenceName(e.target.value)}
                    placeholder={isArabic ? "مثال: تحليل سريع" : "e.g., Quick Analysis"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isArabic ? "نوع التحليل" : "Analysis Type"}</Label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYSIS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {isArabic ? type.labelAr : type.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isArabic ? "لغة التحليل" : "Analysis Language"}</Label>
                  <Select value={analysisLanguage} onValueChange={setAnalysisLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{isArabic ? "تحليل تلقائي عند الرفع" : "Auto-analyze on upload"}</Label>
                  <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{isArabic ? "تضمين مقارنة السوق" : "Include market comparison"}</Label>
                  <Switch checked={includeMarket} onCheckedChange={setIncludeMarket} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{isArabic ? "تضمين التوصيات" : "Include recommendations"}</Label>
                  <Switch checked={includeRecommendations} onCheckedChange={setIncludeRecommendations} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{isArabic ? "إشعارات البريد" : "Email notifications"}</Label>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isArabic ? "حفظ الإعداد" : "Save Preference"}
              </Button>
            </CardContent>
          </Card>

          {/* Saved Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isArabic ? "الإعدادات المحفوظة" : "Saved Preferences"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : preferences.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {isArabic ? "لا توجد إعدادات محفوظة" : "No saved preferences"}
                </p>
              ) : (
                <div className="space-y-3">
                  {preferences.map(pref => (
                    <div 
                      key={pref.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {pref.is_default && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">{pref.preference_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {ANALYSIS_TYPES.find(t => t.value === pref.default_analysis_type)?.[isArabic ? 'labelAr' : 'labelEn']}
                            </Badge>
                            {pref.auto_analyze_on_upload && (
                              <Badge variant="secondary" className="text-xs">
                                {isArabic ? "تلقائي" : "Auto"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUsePreference(pref)}
                        >
                          {isArabic ? "استخدام" : "Use"}
                        </Button>
                        {!pref.is_default && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleSetDefault(pref.id)}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(pref.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
