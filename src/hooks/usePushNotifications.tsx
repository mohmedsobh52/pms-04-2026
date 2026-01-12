import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const { isArabic } = useLanguage();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: isArabic ? 'غير مدعوم' : 'Not Supported',
        description: isArabic 
          ? 'المتصفح لا يدعم الإشعارات الفورية'
          : 'Your browser does not support push notifications',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsEnabled(result === 'granted');
      
      if (result === 'granted') {
        toast({
          title: isArabic ? '✅ تم تفعيل الإشعارات' : '✅ Notifications Enabled',
          description: isArabic 
            ? 'ستصلك إشعارات عند اكتمال التحليل'
            : 'You will receive notifications when analysis completes',
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: isArabic ? 'تم رفض الإشعارات' : 'Notifications Denied',
          description: isArabic 
            ? 'يمكنك تغيير الإعدادات من إعدادات المتصفح'
            : 'You can change this in browser settings',
          variant: 'destructive',
        });
      }
      return false;
    } catch (e) {
      console.error('Failed to request notification permission:', e);
      return false;
    }
  }, [isSupported, toast, isArabic]);

  // Show notification
  const showNotification = useCallback(async (payload: NotificationPayload): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      // Fall back to toast
      toast({
        title: payload.title,
        description: payload.body,
      });
      return false;
    }

    try {
      // Check if page is visible - only show browser notification if hidden
      if (document.hidden) {
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          tag: payload.tag || 'boq-analysis',
          data: payload.data,
          requireInteraction: false,
          silent: false,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return true;
      } else {
        // Page is visible - use toast instead
        toast({
          title: payload.title,
          description: payload.body,
        });
        return true;
      }
    } catch (e) {
      console.error('Failed to show notification:', e);
      toast({
        title: payload.title,
        description: payload.body,
      });
      return false;
    }
  }, [isSupported, permission, toast]);

  // Analysis complete notification
  const notifyAnalysisComplete = useCallback((
    itemCount: number,
    fileName?: string,
    success = true
  ) => {
    const title = success
      ? (isArabic ? '✅ اكتمل التحليل' : '✅ Analysis Complete')
      : (isArabic ? '❌ فشل التحليل' : '❌ Analysis Failed');
    
    const body = success
      ? (isArabic 
          ? `تم تحليل ${itemCount} بند${fileName ? ` من ${fileName}` : ''}`
          : `Analyzed ${itemCount} items${fileName ? ` from ${fileName}` : ''}`)
      : (isArabic 
          ? `فشل تحليل${fileName ? ` ${fileName}` : ' الملف'}`
          : `Failed to analyze${fileName ? ` ${fileName}` : ' file'}`);

    return showNotification({
      title,
      body,
      tag: 'analysis-complete',
      data: { itemCount, fileName, success },
    });
  }, [showNotification, isArabic]);

  // Job queue notification
  const notifyJobStatus = useCallback((
    status: 'started' | 'progress' | 'completed' | 'failed',
    progress?: number,
    fileName?: string
  ) => {
    const titles: Record<string, string> = {
      started: isArabic ? '🚀 بدء التحليل' : '🚀 Analysis Started',
      progress: isArabic ? '⏳ جاري التحليل' : '⏳ Analysis in Progress',
      completed: isArabic ? '✅ اكتمل التحليل' : '✅ Analysis Complete',
      failed: isArabic ? '❌ فشل التحليل' : '❌ Analysis Failed',
    };

    const bodies: Record<string, string> = {
      started: isArabic 
        ? `بدأ تحليل${fileName ? ` ${fileName}` : ' الملف'} في الخلفية`
        : `Started analyzing${fileName ? ` ${fileName}` : ' file'} in background`,
      progress: isArabic 
        ? `التقدم: ${progress || 0}%`
        : `Progress: ${progress || 0}%`,
      completed: isArabic 
        ? `اكتمل تحليل${fileName ? ` ${fileName}` : ' الملف'}`
        : `Completed analyzing${fileName ? ` ${fileName}` : ' file'}`,
      failed: isArabic 
        ? `فشل تحليل${fileName ? ` ${fileName}` : ' الملف'}`
        : `Failed to analyze${fileName ? ` ${fileName}` : ' file'}`,
    };

    return showNotification({
      title: titles[status],
      body: bodies[status],
      tag: `job-${status}`,
      data: { status, progress, fileName },
    });
  }, [showNotification, isArabic]);

  // Rate limit notification
  const notifyRateLimit = useCallback((retryAfter?: number) => {
    const body = retryAfter
      ? (isArabic 
          ? `يرجى الانتظار ${retryAfter} ثانية قبل المحاولة`
          : `Please wait ${retryAfter} seconds before retrying`)
      : (isArabic 
          ? 'تم تجاوز الحد الأقصى للطلبات'
          : 'Rate limit exceeded');

    return showNotification({
      title: isArabic ? '⚠️ تحذير' : '⚠️ Warning',
      body,
      tag: 'rate-limit',
    });
  }, [showNotification, isArabic]);

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    showNotification,
    notifyAnalysisComplete,
    notifyJobStatus,
    notifyRateLimit,
  };
}
