import { useState, useEffect } from 'react';
import { X, RefreshCw, Sparkles, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface VersionInfo {
  version: string;
  release_date: string;
  changes_ar: string[];
  changes_en: string[];
  is_latest: boolean;
}

// Current app version stored locally
const CURRENT_LOCAL_VERSION = '2.4.0';
const UPDATE_DISMISSED_KEY = 'boq_update_dismissed_version';
const LAST_CHECK_KEY = 'boq_last_update_check';
const CHECK_INTERVAL = 1000 * 60 * 30; // Check every 30 minutes

export const UpdateBanner = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkForUpdates();
    
    // Set up periodic check
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      // Check if we've checked recently
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();
      
      if (lastCheck && now - parseInt(lastCheck) < CHECK_INTERVAL) {
        // Use cached result if checked recently
        const cachedVersion = localStorage.getItem('boq_cached_version');
        if (cachedVersion) {
          const version = JSON.parse(cachedVersion);
          handleVersionCheck(version);
          setIsLoading(false);
          return;
        }
      }

      // Fetch latest version from database
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_latest', true)
        .single();

      if (error) {
        console.error('Error fetching version:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        localStorage.setItem(LAST_CHECK_KEY, now.toString());
        localStorage.setItem('boq_cached_version', JSON.stringify(data));
        handleVersionCheck(data);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionCheck = (version: VersionInfo) => {
    setLatestVersion(version);
    
    const dismissedVersion = localStorage.getItem(UPDATE_DISMISSED_KEY);
    
    // Compare versions - show banner if server version is newer than local
    if (isNewerVersion(version.version, CURRENT_LOCAL_VERSION) && 
        dismissedVersion !== version.version) {
      setIsVisible(true);
    }
  };

  const isNewerVersion = (serverVersion: string, localVersion: string): boolean => {
    const server = serverVersion.split('.').map(Number);
    const local = localVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(server.length, local.length); i++) {
      const s = server[i] || 0;
      const l = local[i] || 0;
      if (s > l) return true;
      if (s < l) return false;
    }
    return false;
  };

  const handleDismiss = () => {
    if (latestVersion) {
      localStorage.setItem(UPDATE_DISMISSED_KEY, latestVersion.version);
    }
    setIsVisible(false);
  };

  const handleRefresh = () => {
    if (latestVersion) {
      localStorage.setItem(UPDATE_DISMISSED_KEY, latestVersion.version);
    }
    window.location.reload();
  };

  if (isLoading || !isVisible || !latestVersion) return null;

  const changes = language === 'ar' ? latestVersion.changes_ar : latestVersion.changes_en;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-full px-3 py-1">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold text-sm">
                {language === 'ar' ? 'إصدار جديد' : 'New Version'} {latestVersion.version}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChanges(!showChanges)}
              className="text-primary-foreground hover:bg-primary-foreground/20 text-sm"
            >
              {showChanges 
                ? (language === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details')
                : (language === 'ar' ? 'عرض التغييرات' : 'View Changes')
              }
            </Button>

            <Link to="/changelog">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20 text-sm gap-1"
              >
                <History className="h-4 w-4" />
                {language === 'ar' ? 'سجل التحديثات' : 'Changelog'}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="secondary"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {language === 'ar' ? 'تحديث الآن' : 'Update Now'}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Changes List */}
        {showChanges && (
          <div className="mt-3 pt-3 border-t border-primary-foreground/20 animate-in fade-in duration-200">
            <h4 className="font-semibold mb-2 text-sm">
              {language === 'ar' ? 'ما الجديد في هذا الإصدار:' : "What's new in this version:"}
            </h4>
            <ul className={`space-y-1 text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              {changes.map((change, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary-foreground/70">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-primary-foreground/70 mt-2">
              {language === 'ar' ? 'تاريخ الإصدار:' : 'Release Date:'} {latestVersion.release_date}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
