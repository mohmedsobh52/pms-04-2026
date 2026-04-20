import { useEffect, useRef, useState } from "react";

/**
 * useInView - يرصد متى يدخل العنصر إلى viewport عبر IntersectionObserver.
 * مفيد لتأجيل تحميل/رسم المكوّنات الثقيلة (charts, heavy tables) حتى تظهر.
 */
export function useInView<T extends Element = HTMLDivElement>(
  options: IntersectionObserverInit = { rootMargin: "200px", threshold: 0.01 },
  once = true,
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      });
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView } as const;
}
