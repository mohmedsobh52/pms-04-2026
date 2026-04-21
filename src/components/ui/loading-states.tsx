import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SuspenseFallbackProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
}

/**
 * Unified Suspense fallback. Use as `fallback` for `<Suspense>` boundaries
 * across the app to keep loading UX consistent.
 */
export function SuspenseFallback({
  label,
  size = "md",
  fullPage = false,
}: SuspenseFallbackProps) {
  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const padding = size === "sm" ? "py-6" : size === "lg" ? "py-20" : "py-12";

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 text-muted-foreground ${padding}`}>
      <Loader2 className={`${iconSize} animate-spin text-primary`} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="min-h-screen bg-background flex items-center justify-center">{content}</div>;
  }
  return content;
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  isArabic?: boolean;
}

/**
 * Unified error state shown when a data fetch / async operation fails.
 * Pair with try/catch + setError(...) in the calling component.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  isArabic = false,
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-base">
            {title || (isArabic ? "تعذر تحميل البيانات" : "Failed to load data")}
          </h3>
          {message && (
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{message}</p>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {retryLabel || (isArabic ? "إعادة المحاولة" : "Try again")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 flex flex-col items-center text-center gap-3">
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
        <h3 className="font-semibold text-base">{title}</h3>
        {message && <p className="text-sm text-muted-foreground max-w-md">{message}</p>}
        {action}
      </CardContent>
    </Card>
  );
}
