import { useState, useEffect } from 'react';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  changes: {
    ar: string[];
    en: string[];
  };
}

// Current app version - update this when releasing new versions
const CURRENT_VERSION = '2.5.0';

// Latest update info - update this when releasing new versions
const LATEST_UPDATE: UpdateInfo = {
  version: '2.5.0',
  releaseDate: '2024-12-28',
  changes: {
    ar: [
      'إضافة نظام الربط ثنائي الاتجاه بين تحليل التكاليف والبنود',
      'تحسين عرض جدول تحليل التكاليف ليستوعب 29 صفاً',
      'إضافة خاصية التحكم في عرض الأعمدة مع حفظ التغييرات',
      'تحسينات في الأداء والاستقرار'
    ],
    en: [
      'Added bidirectional linking between cost analysis and items',
      'Improved cost analysis table to display 29 rows',
      'Added column visibility control with save functionality',
      'Performance and stability improvements'
    ]
  }
};

const UPDATE_DISMISSED_KEY = 'boq_update_dismissed_version';

export const UpdateBanner = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  useEffect(() => {
    const dismissedVersion = localStorage.getItem(UPDATE_DISMISSED_KEY);
    
    // Show banner if the latest version hasn't been dismissed
    if (dismissedVersion !== LATEST_UPDATE.version) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(UPDATE_DISMISSED_KEY, LATEST_UPDATE.version);
    setIsVisible(false);
  };

  const handleRefresh = () => {
    // Mark as seen and refresh the page
    localStorage.setItem(UPDATE_DISMISSED_KEY, LATEST_UPDATE.version);
    window.location.reload();
  };

  if (!isVisible) return null;

  const changes = language === 'ar' ? LATEST_UPDATE.changes.ar : LATEST_UPDATE.changes.en;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 bg-primary-foreground/20 rounded-full px-3 py-1">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold text-sm">
                {language === 'ar' ? 'إصدار جديد' : 'New Version'} {LATEST_UPDATE.version}
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
              {language === 'ar' ? 'تاريخ الإصدار:' : 'Release Date:'} {LATEST_UPDATE.releaseDate}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
