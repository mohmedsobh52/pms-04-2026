import { useState, useCallback, useEffect, useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorizontalScrollBarProps {
  containerRef: React.RefObject<HTMLElement>;
}

export function HorizontalScrollBar({ containerRef }: HorizontalScrollBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Update scroll percentage when container scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        setScrollPercentage((container.scrollLeft / maxScroll) * 100);
      }
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !trackRef.current || !containerRef.current) return;

      const track = trackRef.current;
      const container = containerRef.current;
      const rect = track.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollLeft = (percentage / 100) * maxScroll;
    },
    [isDragging, containerRef]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current || !containerRef.current) return;
      
      const track = trackRef.current;
      const container = containerRef.current;
      const rect = track.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      
      const maxScroll = container.scrollWidth - container.clientWidth;
      container.scrollTo({
        left: (percentage / 100) * maxScroll,
        behavior: "smooth"
      });
    },
    [containerRef]
  );

  // Don't show if there's no overflow
  const container = containerRef.current;
  const hasOverflow = container ? container.scrollWidth > container.clientWidth : false;

  if (!hasOverflow) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-80 max-w-[90vw]">
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="h-3 bg-muted/80 backdrop-blur-sm rounded-full shadow-lg border border-border cursor-pointer relative"
      >
        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-5 w-12 rounded-full cursor-grab transition-colors",
            "bg-primary/80 hover:bg-primary shadow-md flex items-center justify-center",
            isDragging && "bg-primary cursor-grabbing scale-110"
          )}
          style={{ left: `calc(${scrollPercentage}% - 24px)` }}
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="w-3 h-3 text-primary-foreground" />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
        <span>←</span>
        <span>اسحب للتمرير</span>
        <span>→</span>
      </div>
    </div>
  );
}
