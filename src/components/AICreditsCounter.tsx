import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { useAnalysisTracking } from "@/hooks/useAnalysisTracking";
import { getAnalysisSettings } from "@/components/AnalysisSettingsDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

interface AICreditsCounterProps {
  className?: string;
  compact?: boolean;
}

export function AICreditsCounter({ className, compact = false }: AICreditsCounterProps) {
  const { language } = useLanguage();
  const { records } = useAnalysisTracking();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const settings = getAnalysisSettings();
  
  // Update every second for accurate minute tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate requests in the current minute
  const { requestsThisMinute, requestsLastFiveMinutes, averagePerMinute, remainingSeconds } = useMemo(() => {
    const oneMinuteAgo = currentTime - 60 * 1000;
    const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
    
    // Filter records from last minute
    const recentRecords = records.filter(r => {
      const recordTime = new Date(r.startTime).getTime();
      return recordTime >= oneMinuteAgo && r.dataSource === 'ai';
    });
    
    // Filter records from last 5 minutes
    const last5MinRecords = records.filter(r => {
      const recordTime = new Date(r.startTime).getTime();
      return recordTime >= fiveMinutesAgo && r.dataSource === 'ai';
    });
    
    // Calculate remaining seconds in current minute window
    const secondsElapsed = Math.floor((currentTime % 60000) / 1000);
    const remaining = 60 - secondsElapsed;
    
    return {
      requestsThisMinute: recentRecords.length,
      requestsLastFiveMinutes: last5MinRecords.length,
      averagePerMinute: Math.round(last5MinRecords.length / 5 * 10) / 10,
      remainingSeconds: remaining,
    };
  }, [records, currentTime]);

  const maxRequests = settings.maxRequestsPerMinute || 10;
  const usagePercentage = Math.min((requestsThisMinute / maxRequests) * 100, 100);
  const isNearLimit = requestsThisMinute >= maxRequests * 0.8;
  const isAtLimit = requestsThisMinute >= maxRequests;

  const getStatusColor = () => {
    if (isAtLimit) return "text-destructive";
    if (isNearLimit) return "text-warning";
    return "text-primary";
  };

  const getStatusBadge = () => {
    if (isAtLimit) {
      return (
        <Badge variant="destructive" className="text-xs">
          {language === 'ar' ? 'الحد الأقصى' : 'At Limit'}
        </Badge>
      );
    }
    if (isNearLimit) {
      return (
        <Badge variant="outline" className="text-xs border-warning text-warning">
          {language === 'ar' ? 'قريب من الحد' : 'Near Limit'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs border-primary/50 text-primary">
        {language === 'ar' ? 'طبيعي' : 'Normal'}
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border", className)}>
        <Zap className={cn("h-4 w-4", getStatusColor())} />
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {requestsThisMinute}/{maxRequests}
        </span>
        <span className="text-xs text-muted-foreground">
          /{language === 'ar' ? 'د' : 'min'}
        </span>
        {isAtLimit && (
          <Badge variant="destructive" className="text-xs px-1.5 py-0">
            <Clock className="h-3 w-3 mr-1" />
            {remainingSeconds}s
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg",
              isAtLimit ? "bg-destructive/10" : isNearLimit ? "bg-warning/10" : "bg-primary/10"
            )}>
              <Zap className={cn("h-4 w-4", getStatusColor())} />
            </div>
            <span className="font-medium text-sm">
              {language === 'ar' ? 'استهلاك AI Credits' : 'AI Credits Usage'}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Main Counter */}
        <div className="text-center py-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className={cn("text-4xl font-bold tabular-nums", getStatusColor())}>
              {requestsThisMinute}
            </span>
            <span className="text-xl text-muted-foreground">/{maxRequests}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'ar' ? 'طلبات في الدقيقة الحالية' : 'requests this minute'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress 
            value={usagePercentage} 
            className={cn(
              "h-2",
              isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-warning" : ""
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(usagePercentage)}%</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {language === 'ar' ? `إعادة التعيين: ${remainingSeconds}ث` : `Reset: ${remainingSeconds}s`}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">{language === 'ar' ? 'آخر 5 دقائق' : 'Last 5 min'}</span>
            </div>
            <span className="text-lg font-semibold">{requestsLastFiveMinutes}</span>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs">{language === 'ar' ? 'المعدل/د' : 'Avg/min'}</span>
            </div>
            <span className="text-lg font-semibold">{averagePerMinute}</span>
          </div>
        </div>

        {/* Warning Message */}
        {isAtLimit && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {language === 'ar' 
                ? `تم الوصول للحد الأقصى. انتظر ${remainingSeconds} ثانية.`
                : `Rate limit reached. Wait ${remainingSeconds}s.`
              }
            </span>
          </div>
        )}

        {/* Throttle Status */}
        {settings.enableThrottle && (
          <div className="text-xs text-muted-foreground text-center pt-1 border-t">
            {language === 'ar' 
              ? `التقييد مفعل: ${settings.maxRequestsPerMinute} طلب/دقيقة`
              : `Throttle enabled: ${settings.maxRequestsPerMinute} req/min`
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
