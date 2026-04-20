import { ReactNode, useRef, useState, useEffect, useCallback } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  /** ارتفاع كل صف بالـ px (ثابت) */
  itemHeight: number;
  /** ارتفاع الحاوية */
  height: number;
  /** عدد العناصر الإضافية أعلى/أسفل النافذة لتجنّب الفراغات أثناء التمرير */
  overscan?: number;
  /** دالة render للصف */
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

/**
 * VirtualizedList — قائمة افتراضية بسيطة بدون مكتبات خارجية.
 * تعرض فقط الصفوف الظاهرة، مما يجعل عرض آلاف العناصر سريعاً وسلساً.
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  overscan = 6,
  renderItem,
  className,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + overscan,
  );
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, overflowY: "auto", position: "relative" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
