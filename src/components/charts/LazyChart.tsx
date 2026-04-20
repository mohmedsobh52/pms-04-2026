import { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyChartProps {
  children: ReactNode;
  /** ارتفاع placeholder قبل التحميل (px) */
  minHeight?: number;
  /** نص اختياري داخل الـ placeholder */
  fallbackLabel?: string;
}

/**
 * LazyChart — يؤجّل render الرسم البياني حتى يقترب من viewport.
 * يقلّل الـ JS التنفيذي وأوقات الـ paint للصفحات التي تحوي عدّة charts.
 */
export function LazyChart({ children, minHeight = 240, fallbackLabel }: LazyChartProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} style={{ minHeight }} className="w-full">
      {inView ? (
        children
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ minHeight }}
          aria-busy="true"
          aria-label={fallbackLabel ?? "Loading chart"}
        >
          <Skeleton className="h-full w-full rounded-md" style={{ minHeight }} />
        </div>
      )}
    </div>
  );
}
