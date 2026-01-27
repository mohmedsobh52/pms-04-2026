import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    // Only trigger animation when pathname changes
    if (previousPathname.current !== location.pathname) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsVisible(true);
        previousPathname.current = location.pathname;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div
      className={cn(
        "transition-opacity duration-150 ease-out",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {children}
    </div>
  );
}
