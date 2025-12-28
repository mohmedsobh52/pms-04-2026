import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Sparkles, CheckCircle2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

interface VersionInfo {
  id: string;
  version: string;
  release_date: string;
  changes_ar: string[];
  changes_en: string[];
  is_latest: boolean;
  created_at: string;
}

const Changelog = () => {
  const { language } = useLanguage();
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) {
        console.error('Error fetching versions:', error);
        return;
      }

      setVersions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getVersionType = (version: string): 'major' | 'minor' | 'patch' => {
    const parts = version.split('.');
    if (parts[2] !== '0') return 'patch';
    if (parts[1] !== '0') return 'minor';
    return 'major';
  };

  const getVersionBadge = (type: 'major' | 'minor' | 'patch') => {
    switch (type) {
      case 'major':
        return <Badge variant="default" className="bg-red-500">{language === 'ar' ? 'رئيسي' : 'Major'}</Badge>;
      case 'minor':
        return <Badge variant="default" className="bg-blue-500">{language === 'ar' ? 'فرعي' : 'Minor'}</Badge>;
      case 'patch':
        return <Badge variant="secondary">{language === 'ar' ? 'تصحيحي' : 'Patch'}</Badge>;
    }
  };

  return (
    <div className={`min-h-screen bg-background ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {language === 'ar' ? 'سجل التحديثات' : 'Changelog'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {language === 'ar' 
                    ? 'تاريخ جميع الإصدارات والتغييرات' 
                    : 'History of all versions and changes'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

            <div className="space-y-6">
              {versions.map((version, index) => {
                const versionType = getVersionType(version.version);
                const changes = language === 'ar' ? version.changes_ar : version.changes_en;

                return (
                  <div key={version.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute left-6 top-6 w-4 h-4 rounded-full bg-primary border-4 border-background hidden md:block" />

                    <Card className={`md:ml-16 transition-all hover:shadow-lg ${version.is_latest ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                              {version.is_latest && <Sparkles className="h-5 w-5 text-primary" />}
                              v{version.version}
                            </CardTitle>
                            {version.is_latest && (
                              <Badge variant="default" className="bg-primary">
                                {language === 'ar' ? 'الإصدار الحالي' : 'Current'}
                              </Badge>
                            )}
                            {getVersionBadge(versionType)}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Calendar className="h-4 w-4" />
                            {formatDate(version.release_date)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {changes.map((change, changeIndex) => (
                            <li key={changeIndex} className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-foreground">{change}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to top */}
        {versions.length > 3 && (
          <div className="fixed bottom-8 right-8">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-lg"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Changelog;
