import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";
import { Bell, CheckCircle, XCircle, FileText } from "lucide-react";

interface AnalysisTask {
  id: string;
  fileName: string;
  status: "pending" | "analyzing" | "success" | "error";
  error?: string;
}

interface UseAnalysisNotificationsOptions {
  enabled?: boolean;
  onComplete?: (fileName: string, success: boolean) => void;
}

export function useAnalysisNotifications(options: UseAnalysisNotificationsOptions = {}) {
  const { enabled = true, onComplete } = options;
  const { isArabic } = useLanguage();
  const tasksRef = useRef<Map<string, AnalysisTask>>(new Map());
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (enabled && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          notificationPermissionRef.current = permission;
        });
      } else {
        notificationPermissionRef.current = Notification.permission;
      }
    }
  }, [enabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string, icon: "success" | "error") => {
    if (notificationPermissionRef.current !== "granted") return;

    try {
      const notification = new Notification(title, {
        body,
        icon: icon === "success" 
          ? "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>"
          : "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'><path d='M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z'/></svg>",
        tag: "analysis-complete",
        requireInteraction: false,
        silent: false
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error("Browser notification error:", error);
    }
  }, []);

  // Show toast notification with custom styling
  const showToastNotification = useCallback((fileName: string, success: boolean, error?: string) => {
    if (success) {
      toast.success(
        isArabic ? `تم تحليل "${fileName}" بنجاح` : `"${fileName}" analyzed successfully`,
        {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          duration: 4000,
          description: isArabic ? "يمكنك الآن عرض النتائج" : "You can now view the results"
        }
      );
    } else {
      toast.error(
        isArabic ? `فشل تحليل "${fileName}"` : `Failed to analyze "${fileName}"`,
        {
          icon: <XCircle className="w-4 h-4 text-red-500" />,
          duration: 5000,
          description: error || (isArabic ? "حدث خطأ أثناء التحليل" : "An error occurred during analysis")
        }
      );
    }
  }, [isArabic]);

  // Start tracking a task
  const startTask = useCallback((id: string, fileName: string) => {
    tasksRef.current.set(id, {
      id,
      fileName,
      status: "analyzing"
    });

    if (enabled) {
      toast.loading(
        isArabic ? `جاري تحليل "${fileName}"...` : `Analyzing "${fileName}"...`,
        {
          id: `analysis-${id}`,
          icon: <FileText className="w-4 h-4 text-blue-500 animate-pulse" />,
        }
      );
    }
  }, [enabled, isArabic]);

  // Complete a task
  const completeTask = useCallback((id: string, success: boolean, error?: string) => {
    const task = tasksRef.current.get(id);
    if (!task) return;

    task.status = success ? "success" : "error";
    task.error = error;

    // Dismiss loading toast
    toast.dismiss(`analysis-${id}`);

    if (enabled) {
      // Show toast notification
      showToastNotification(task.fileName, success, error);

      // Show browser notification if page is in background
      if (document.hidden) {
        const title = success
          ? (isArabic ? "اكتمل التحليل" : "Analysis Complete")
          : (isArabic ? "فشل التحليل" : "Analysis Failed");
        const body = success
          ? (isArabic ? `تم تحليل "${task.fileName}" بنجاح` : `"${task.fileName}" analyzed successfully`)
          : (isArabic ? `فشل تحليل "${task.fileName}"` : `Failed to analyze "${task.fileName}"`);
        
        showBrowserNotification(title, body, success ? "success" : "error");
      }

      // Callback
      onComplete?.(task.fileName, success);
    }

    // Clean up after a delay
    setTimeout(() => {
      tasksRef.current.delete(id);
    }, 1000);
  }, [enabled, isArabic, showToastNotification, showBrowserNotification, onComplete]);

  // Batch completion notification
  const completeBatch = useCallback((successCount: number, errorCount: number, totalCount: number) => {
    if (!enabled) return;

    // Dismiss any remaining loading toasts
    tasksRef.current.forEach((_, id) => {
      toast.dismiss(`analysis-${id}`);
    });

    if (successCount === totalCount) {
      toast.success(
        isArabic 
          ? `تم تحليل جميع الملفات (${totalCount}) بنجاح!` 
          : `All files (${totalCount}) analyzed successfully!`,
        {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          duration: 5000,
        }
      );
    } else if (errorCount === totalCount) {
      toast.error(
        isArabic 
          ? `فشل تحليل جميع الملفات (${totalCount})` 
          : `Failed to analyze all files (${totalCount})`,
        {
          icon: <XCircle className="w-4 h-4 text-red-500" />,
          duration: 5000,
        }
      );
    } else {
      toast.info(
        isArabic 
          ? `تم تحليل ${successCount} من ${totalCount} ملفات` 
          : `${successCount} of ${totalCount} files analyzed`,
        {
          icon: <Bell className="w-4 h-4 text-blue-500" />,
          duration: 5000,
          description: errorCount > 0 
            ? (isArabic ? `${errorCount} ملفات فشلت` : `${errorCount} files failed`)
            : undefined
        }
      );
    }

    // Browser notification for batch
    if (document.hidden) {
      const title = isArabic ? "اكتمل تحليل الملفات" : "Batch Analysis Complete";
      const body = isArabic 
        ? `${successCount}/${totalCount} ملفات تم تحليلها بنجاح`
        : `${successCount}/${totalCount} files analyzed successfully`;
      showBrowserNotification(title, body, successCount > 0 ? "success" : "error");
    }

    // Clear all tasks
    tasksRef.current.clear();
  }, [enabled, isArabic, showBrowserNotification]);

  return {
    startTask,
    completeTask,
    completeBatch
  };
}
