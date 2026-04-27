import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Small, non-blank fallback UI suitable for ErrorBoundary `fallback` prop
 * around floating widgets (search, command palette, etc.). Replaces the
 * previous `null` fallback which silently hid failures.
 */
export function InlineErrorFallback({ message, onRetry }: InlineErrorFallbackProps) {
  const handleRetry = (): void => {
    if (onRetry) onRetry();
    else window.location.reload();
  };

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-destructive/30 bg-background/95 backdrop-blur shadow-lg p-3 flex items-start gap-2"
    >
      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground font-medium">
          {message ?? "تعذّر تحميل هذا المكوّن / Component failed to load"}
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRetry}
          className="h-7 px-2 mt-1 text-xs gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          إعادة المحاولة / Retry
        </Button>
      </div>
    </div>
  );
}

export default InlineErrorFallback;
