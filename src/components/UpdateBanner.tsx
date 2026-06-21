import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, RefreshCw, Sparkles, History, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';

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
const NOTIFICATION_PERMISSION_KEY = 'boq_notification_permission_asked';

export const UpdateBanner = () => {
  const { language, isArabic } = useLanguage();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const [isVisible, setIsVisible] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    const askedBefore = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    if (askedBefore) return Notification.permission === 'granted';
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Show push notification
  const showPushNotification = useCallback((version: string, changes: string[]) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    const title = isArabic ? `تحديث جديد: ${version}` : `New Update: ${version}`;
    const body = changes.slice(0, 2).join('\n');
    
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'update-notification',
        requireInteraction: true,
      });
    } catch (error) {
      console.log('Notification not supported in this context');
    }
  }, [isArabic]);

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

  const handleVersionCheck = useCallback(async (version: VersionInfo) => {
    setLatestVersion(version);
    
    const dismissedVersion = localStorage.getItem(UPDATE_DISMISSED_KEY);
    
    // Compare versions - show banner if server version is newer than local
    if (isNewerVersion(version.version, CURRENT_LOCAL_VERSION) && 
        dismissedVersion !== version.version) {
      setIsVisible(true);
      
      // Show push notification if first time seeing this version
      const notifiedKey = `boq_notified_${version.version}`;
      const lastNotified = localStorage.getItem(notifiedKey);
      if (!lastNotified) {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          const changes = isArabic ? version.changes_ar : version.changes_en;
          showPushNotification(version.version, changes);
          localStorage.setItem(notifiedKey, 'true');
        }
      }
    }
  }, [isArabic, requestNotificationPermission, showPushNotification]);

  const checkForUpdates = useCallback(async () => {
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
        .maybeSingle();

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
  }, [handleVersionCheck]);

  useEffect(() => {
    checkForUpdates();
    
    // Set up periodic check
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

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
    <div className="bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5 bg-primary-foreground/20 rounded-full px-2.5 py-0.5">
              <Bell className="h-3.5 w-3.5 animate-pulse" />
              <span className="font-semibold text-xs">
                {language === 'ar' ? 'جديد' : 'New'} {latestVersion.version}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChanges(!showChanges)}
              className="text-primary-foreground hover:bg-primary-foreground/20 text-xs h-7 px-2"
            >
              {showChanges 
                ? (language === 'ar' ? 'إخفاء' : 'Hide')
                : (language === 'ar' ? 'التفاصيل' : 'Details')
              }
            </Button>

            <Link to="/changelog">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20 text-xs gap-1 h-7 px-2"
              >
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {language === 'ar' ? 'السجل' : 'Log'}
                </span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Link to="/admin/versions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-7 w-7 p-0"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="secondary"
              className="gap-1.5 h-7 text-xs px-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'تحديث' : 'Update'}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-7 w-7"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Changes List */}
        {showChanges && (
          <div className="mt-2 pt-2 border-t border-primary-foreground/20 animate-in fade-in duration-200">
            <ul className={`space-y-0.5 text-xs ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              {changes.map((change, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="text-primary-foreground/70">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
