import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AppVersion {
  id: string;
  version: string;
  release_date: string;
  is_latest: boolean;
  changes_en: string[];
  changes_ar: string[];
  created_at: string;
}

const ADMIN_EMAILS = ['mohmedsobh@gmail.com', 'admin@boqanalyzer.com'];

const AdminVersions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isArabic, t } = useLanguage();
  const { toast } = useToast();
  
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New version form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version: '',
    changes_en: '',
    changes_ar: '',
    is_latest: true,
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    version: '',
    changes_en: '',
    changes_ar: '',
    is_latest: false,
  });

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!authLoading && user && !isAdmin) {
      navigate('/');
      toast({
        title: isArabic ? 'غير مصرح' : 'Unauthorized',
        description: isArabic ? 'ليس لديك صلاحية الوصول لهذه الصفحة' : 'You do not have access to this page',
        variant: 'destructive',
      });
      return;
    }
    
    if (isAdmin) {
      fetchVersions();
    }
  }, [user, authLoading, isAdmin, navigate]);

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل تحميل الإصدارات' : 'Failed to load versions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVersion = async () => {
    if (!newVersion.version.trim()) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'رقم الإصدار مطلوب' : 'Version number is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // If marking as latest, unmark all others first
      if (newVersion.is_latest) {
        await supabase
          .from('app_versions')
          .update({ is_latest: false })
          .eq('is_latest', true);
      }

      const { error } = await supabase
        .from('app_versions')
        .insert({
          version: newVersion.version.trim(),
          changes_en: newVersion.changes_en.split('\n').filter(c => c.trim()),
          changes_ar: newVersion.changes_ar.split('\n').filter(c => c.trim()),
          is_latest: newVersion.is_latest,
          release_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: isArabic ? 'تم الإضافة' : 'Added',
        description: isArabic ? 'تم إضافة الإصدار بنجاح' : 'Version added successfully',
      });

      setNewVersion({ version: '', changes_en: '', changes_ar: '', is_latest: true });
      setShowNewForm(false);
      fetchVersions();
    } catch (error) {
      console.error('Error adding version:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل إضافة الإصدار' : 'Failed to add version',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (version: AppVersion) => {
    setEditingId(version.id);
    setEditForm({
      version: version.version,
      changes_en: version.changes_en.join('\n'),
      changes_ar: version.changes_ar.join('\n'),
      is_latest: version.is_latest,
    });
  };

  const handleUpdateVersion = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      // If marking as latest, unmark all others first
      if (editForm.is_latest) {
        await supabase
          .from('app_versions')
          .update({ is_latest: false })
          .neq('id', editingId);
      }

      const { error } = await supabase
        .from('app_versions')
        .update({
          version: editForm.version.trim(),
          changes_en: editForm.changes_en.split('\n').filter(c => c.trim()),
          changes_ar: editForm.changes_ar.split('\n').filter(c => c.trim()),
          is_latest: editForm.is_latest,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: isArabic ? 'تم التحديث' : 'Updated',
        description: isArabic ? 'تم تحديث الإصدار بنجاح' : 'Version updated successfully',
      });

      setEditingId(null);
      fetchVersions();
    } catch (error) {
      console.error('Error updating version:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل تحديث الإصدار' : 'Failed to update version',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVersion = async (id: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا الإصدار؟' : 'Are you sure you want to delete this version?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('app_versions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isArabic ? 'تم الحذف' : 'Deleted',
        description: isArabic ? 'تم حذف الإصدار' : 'Version deleted',
      });

      fetchVersions();
    } catch (error) {
      console.error('Error deleting version:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل حذف الإصدار' : 'Failed to delete version',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isArabic ? 'ليس لديك صلاحية الوصول لهذه الصفحة' : 'You do not have access to this page'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h1 className="font-display text-xl font-bold">
                  {isArabic ? 'إدارة التحديثات' : 'Version Management'}
                </h1>
              </div>
            </div>
            <Button onClick={() => setShowNewForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {isArabic ? 'إصدار جديد' : 'New Version'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* New Version Form */}
        {showNewForm && (
          <Card className="mb-6 border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {isArabic ? 'إضافة إصدار جديد' : 'Add New Version'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{isArabic ? 'رقم الإصدار' : 'Version Number'}</Label>
                <Input
                  placeholder="e.g., 2.5.0"
                  value={newVersion.version}
                  onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                />
              </div>
              <div>
                <Label>{isArabic ? 'التغييرات (بالإنجليزية) - سطر لكل تغيير' : 'Changes (English) - one per line'}</Label>
                <Textarea
                  placeholder="Added new feature&#10;Fixed bug&#10;Improved performance"
                  value={newVersion.changes_en}
                  onChange={(e) => setNewVersion({ ...newVersion, changes_en: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label>{isArabic ? 'التغييرات (بالعربية) - سطر لكل تغيير' : 'Changes (Arabic) - one per line'}</Label>
                <Textarea
                  placeholder="تمت إضافة ميزة جديدة&#10;تم إصلاح خطأ&#10;تحسين الأداء"
                  value={newVersion.changes_ar}
                  onChange={(e) => setNewVersion({ ...newVersion, changes_ar: e.target.value })}
                  rows={4}
                  dir="rtl"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newVersion.is_latest}
                  onCheckedChange={(checked) => setNewVersion({ ...newVersion, is_latest: checked })}
                />
                <Label>{isArabic ? 'تحديد كأحدث إصدار' : 'Mark as latest version'}</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddVersion} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isArabic ? 'إضافة' : 'Add'}
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Versions List */}
        <div className="space-y-4">
          {versions.map((version) => (
            <Card key={version.id} className={version.is_latest ? 'border-primary' : ''}>
              <CardContent className="pt-6">
                {editingId === version.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label>{isArabic ? 'رقم الإصدار' : 'Version Number'}</Label>
                      <Input
                        value={editForm.version}
                        onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? 'التغييرات (بالإنجليزية)' : 'Changes (English)'}</Label>
                      <Textarea
                        value={editForm.changes_en}
                        onChange={(e) => setEditForm({ ...editForm, changes_en: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>{isArabic ? 'التغييرات (بالعربية)' : 'Changes (Arabic)'}</Label>
                      <Textarea
                        value={editForm.changes_ar}
                        onChange={(e) => setEditForm({ ...editForm, changes_ar: e.target.value })}
                        rows={4}
                        dir="rtl"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editForm.is_latest}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, is_latest: checked })}
                      />
                      <Label>{isArabic ? 'أحدث إصدار' : 'Latest version'}</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateVersion} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold">{version.version}</span>
                        {version.is_latest && (
                          <Badge variant="default">{isArabic ? 'الأحدث' : 'Latest'}</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(version.release_date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">English</p>
                          <ul className="text-sm space-y-1">
                            {version.changes_en.map((change, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-primary">•</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div dir="rtl">
                          <p className="text-xs font-medium text-muted-foreground mb-1">العربية</p>
                          <ul className="text-sm space-y-1">
                            {version.changes_ar.map((change, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-primary">•</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEditing(version)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteVersion(version.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {versions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {isArabic ? 'لا توجد إصدارات بعد' : 'No versions yet'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminVersions;
