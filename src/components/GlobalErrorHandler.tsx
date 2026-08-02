import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";
import { logRlsError } from "@/lib/rls-error-log";

/**
 * App-wide runtime error safety net:
 *  - catches uncaught errors & unhandled promise rejections and surfaces
 *    a friendly Arabic toast with a support reference id
 *  - shows an offline/online banner so users understand failed requests
 *  - reloads once when a lazy-chunk load fails after a new deploy
 */
export function GlobalErrorHandler() {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const isChunkError = (msg: string) =>
      /dynamically imported module|Loading chunk|Importing a module script failed/i.test(msg);

    const report = (message: string, context?: Record<string, unknown>) => {
      if (isChunkError(message)) {
        if (!sessionStorage.getItem("chunk-reloaded")) {
          sessionStorage.setItem("chunk-reloaded", "1");
          window.location.reload();
        }
        return;
      }
      const entry = logRlsError({ message, context });
      toast.error("حدث خطأ غير متوقع", {
        description: `الرقم المرجعي: ${entry.ref}`,
      });
    };

    const onError = (e: ErrorEvent) => {
      if (!e.message) return;
      report(e.message, { source: e.filename, line: e.lineno });
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unhandled rejection";
      report(message, { kind: "unhandledrejection" });
    };

    const goOffline = () => {
      setOffline(true);
      toast.warning("انقطع الاتصال بالإنترنت — سيتم تعطيل الحفظ التلقائي");
    };
    const goOnline = () => {
      setOffline(false);
      toast.success("عاد الاتصال بالإنترنت");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[60] bg-destructive text-destructive-foreground text-xs md:text-sm py-1.5 px-3 flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4" />
      أنت غير متصل بالإنترنت — بعض البيانات قد لا تُحفظ
      <Wifi className="w-4 h-4 opacity-0" aria-hidden />
    </div>
  );
}

export default GlobalErrorHandler;
