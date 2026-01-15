import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Loader2, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";

interface SignedUrlExpiryProps {
  expiresAt: Date | null;
  onRefresh: () => Promise<void>;
  loading?: boolean;
  warningThreshold?: number; // seconds before expiry to show warning (default: 300 = 5 min)
  criticalThreshold?: number; // seconds before expiry to show critical (default: 60 = 1 min)
}

export function SignedUrlExpiry({ 
  expiresAt, 
  onRefresh, 
  loading = false,
  warningThreshold = 300,
  criticalThreshold = 60
}: SignedUrlExpiryProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [hasShownCriticalToast, setHasShownCriticalToast] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(null);
      setShowWarning(false);
      setIsCritical(false);
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.floor((expiresAt.getTime() - now) / 1000);
      
      setTimeRemaining(remaining);
      setShowWarning(remaining > 0 && remaining <= warningThreshold);
      setIsCritical(remaining > 0 && remaining <= criticalThreshold);

      // Show toast when becoming critical
      if (remaining > 0 && remaining <= criticalThreshold && !hasShownCriticalToast) {
        setHasShownCriticalToast(true);
        toast({
          title: isArabic ? "⚠️ تنبيه" : "⚠️ Warning",
          description: isArabic 
            ? "رابط الملف سينتهي خلال أقل من دقيقة. انقر لتجديده."
            : "File link expires in less than a minute. Click to refresh.",
          duration: 10000,
        });
      }

      // Auto-refresh when expired
      if (remaining <= 0) {
        handleRefresh();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, warningThreshold, criticalThreshold, hasShownCriticalToast, isArabic, toast]);

  // Reset critical toast flag when expiresAt changes
  useEffect(() => {
    setHasShownCriticalToast(false);
  }, [expiresAt]);

  const handleRefresh = async () => {
    try {
      await onRefresh();
      setHasShownCriticalToast(false);
      toast({
        title: isArabic ? "✓ تم التجديد" : "✓ Refreshed",
        description: isArabic ? "تم تجديد رابط الملف بنجاح" : "File link refreshed successfully",
      });
    } catch (error) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل تجديد الرابط" : "Failed to refresh link",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return isArabic ? "منتهي" : "Expired";
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return isArabic 
        ? `${minutes} دقيقة ${secs > 0 ? `و ${secs} ثانية` : ''}`
        : `${minutes}m ${secs > 0 ? `${secs}s` : ''}`;
    }
    return isArabic ? `${secs} ثانية` : `${secs}s`;
  };

  if (!expiresAt || !showWarning || timeRemaining === null) return null;

  return (
    <Alert 
      variant={isCritical ? "destructive" : "default"} 
      className={`mb-4 ${isCritical ? 'animate-pulse border-destructive' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'}`}
    >
      <AlertCircle className={`w-4 h-4 ${isCritical ? '' : 'text-amber-600'}`} />
      <AlertDescription className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isCritical ? '' : 'text-amber-600'}`} />
          <span className={isCritical ? '' : 'text-amber-800 dark:text-amber-200'}>
            {isArabic 
              ? `ينتهي الرابط خلال ${formatTime(timeRemaining)}` 
              : `Link expires in ${formatTime(timeRemaining)}`}
          </span>
        </div>
        <Button 
          size="sm" 
          variant={isCritical ? "destructive" : "outline"}
          onClick={handleRefresh} 
          disabled={loading}
          className={isCritical ? '' : 'border-amber-600 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900'}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          {isArabic ? "تجديد" : "Refresh"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
