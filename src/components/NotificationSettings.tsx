import { useState, useEffect } from "react";
import { Bell, Mail, MessageSquare, AtSign, BarChart2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NotificationPreferences {
  email_on_comments: boolean;
  email_on_mentions: boolean;
  email_on_analysis_complete: boolean;
  email_digest_frequency: 'instant' | 'daily' | 'weekly' | 'never';
}

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_on_comments: true,
    email_on_mentions: true,
    email_on_analysis_complete: true,
    email_digest_frequency: 'instant',
  });

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_on_comments: data.email_on_comments ?? true,
          email_on_mentions: data.email_on_mentions ?? true,
          email_on_analysis_complete: data.email_on_analysis_complete ?? true,
          email_digest_frequency: (data.email_digest_frequency as NotificationPreferences['email_digest_frequency']) ?? 'instant',
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول لحفظ الإعدادات",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الإشعارات بنجاح",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          يرجى تسجيل الدخول لإدارة إعدادات الإشعارات
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          إعدادات الإشعارات
        </CardTitle>
        <CardDescription>
          تحكم في كيفية ومتى تتلقى إشعارات البريد الإلكتروني
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications Section */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            إشعارات البريد الإلكتروني
          </h4>
          
          <div className="space-y-4 pr-6">
            {/* Comments */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  التعليقات الجديدة
                </Label>
                <p className="text-xs text-muted-foreground">
                  استلم إشعاراً عند إضافة تعليق جديد على تحليلاتك المشاركة
                </p>
              </div>
              <Switch
                checked={preferences.email_on_comments}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, email_on_comments: checked }))
                }
              />
            </div>

            {/* Mentions */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  الإشارات (@)
                </Label>
                <p className="text-xs text-muted-foreground">
                  استلم إشعاراً عند ذكر اسمك في تعليق
                </p>
              </div>
              <Switch
                checked={preferences.email_on_mentions}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, email_on_mentions: checked }))
                }
              />
            </div>

            {/* Analysis Complete */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-muted-foreground" />
                  اكتمال التحليل
                </Label>
                <p className="text-xs text-muted-foreground">
                  استلم إشعاراً عند اكتمال تحليل BOQ طويل
                </p>
              </div>
              <Switch
                checked={preferences.email_on_analysis_complete}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, email_on_analysis_complete: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Frequency Section */}
        <div className="space-y-3 pt-4 border-t">
          <Label>تكرار الإشعارات</Label>
          <Select
            value={preferences.email_digest_frequency}
            onValueChange={(value: NotificationPreferences['email_digest_frequency']) => 
              setPreferences(prev => ({ ...prev, email_digest_frequency: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">فوري - استلم الإشعارات مباشرة</SelectItem>
              <SelectItem value="daily">يومي - ملخص يومي للإشعارات</SelectItem>
              <SelectItem value="weekly">أسبوعي - ملخص أسبوعي للإشعارات</SelectItem>
              <SelectItem value="never">إيقاف - لا ترسل إشعارات بريد إلكتروني</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            اختر كيفية استلام إشعارات البريد الإلكتروني
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <Button onClick={savePreferences} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
