import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogOut, KeyRound, UserRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, ROLE_LABELS } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { roles, isAdmin } = useUserRoles();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      setFullName(typeof meta.full_name === "string" ? meta.full_name : "");
    }
  }, [user]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      if (error) throw error;
      toast.success("تم حفظ بيانات الحساب");
    } catch (err) {
      toast.error("تعذّر حفظ البيانات", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("تم إرسال رابط تغيير كلمة المرور إلى بريدك");
    } catch (err) {
      toast.error("تعذّر إرسال الرابط", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserRound className="w-6 h-6 text-primary" />
            الملف الشخصي
          </h1>
          <p className="text-sm text-muted-foreground">بيانات حسابك، الأدوار، وإعدادات الأمان</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">بيانات الحساب</CardTitle>
            <CardDescription>الاسم المعروض والبريد الإلكتروني</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">البريد الإلكتروني</Label>
              <Input id="profile-email" value={user.email ?? ""} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">الاسم الكامل</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="اكتب اسمك"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              حفظ التغييرات
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              الأدوار والصلاحيات
            </CardTitle>
            <CardDescription>الأدوار تُدار بواسطة مدير النظام</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {isAdmin && <Badge>{ROLE_LABELS.admin.ar}</Badge>}
            {roles.filter((r) => r !== "admin").map((r) => (
              <Badge key={r} variant="secondary">
                {ROLE_LABELS[r]?.ar ?? r}
              </Badge>
            ))}
            {roles.length === 0 && (
              <span className="text-sm text-muted-foreground">لا توجد أدوار مسندة لهذا الحساب</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الأمان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={handleResetPassword} disabled={sendingReset} className="gap-2">
              {sendingReset ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              إرسال رابط تغيير كلمة المرور
            </Button>
            <Separator />
            <Button variant="destructive" onClick={() => void signOut()} className="gap-2">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
