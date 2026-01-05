import { useState, useCallback, useEffect, useRef } from "react";
import { GripHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DualHorizontalScrollBarProps {
  containerRef: React.RefObject<HTMLElement>;
  position: "top" | "bottom";
  showArrows?: boolean;
}

export function DualHorizontalScrollBar({ 
  containerRef, 
  position,
  showArrows = true 
}: DualHorizontalScrollBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Check for overflow and update scroll percentage
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      setHasOverflow(container.scrollWidth > container.clientWidth);
    };

    const handleScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        setScrollPercentage((container.scrollLeft / maxScroll) * 100);
      }
    };

    // Initial check
    checkOverflow();
    handleScroll();

    // Observe size changes
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
      handleScroll();
    });
    resizeObserver.observe(container);

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
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

  const scrollBy = useCallback((direction: "left" | "right") => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollAmount = container.clientWidth * 0.5;
    container.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth"
    });
  }, [containerRef]);

  if (!hasOverflow) return null;

  const positionClasses = position === "top" 
    ? "fixed top-20 left-1/2 -translate-x-1/2 z-50" 
    : "fixed bottom-4 left-1/2 -translate-x-1/2 z-50";

  return (
    <div className={cn(positionClasses, "flex items-center gap-2")}>
      {showArrows && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background"
          onClick={() => scrollBy("left")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}
      
      <div className="w-64 max-w-[60vw]">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="h-2.5 bg-muted/80 backdrop-blur-sm rounded-full shadow-lg border border-border cursor-pointer relative"
        >
          {/* Progress indicator */}
          <div 
            className="absolute top-0 left-0 h-full bg-primary/20 rounded-full transition-all"
            style={{ width: `${scrollPercentage}%` }}
          />
          
          {/* Thumb */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-5 w-10 rounded-full cursor-grab transition-all",
              "bg-primary/90 hover:bg-primary shadow-md flex items-center justify-center",
              isDragging && "bg-primary cursor-grabbing scale-110 shadow-lg"
            )}
            style={{ left: `calc(${Math.min(Math.max(scrollPercentage, 5), 95)}% - 20px)` }}
            onMouseDown={handleMouseDown}
          >
            <GripHorizontal className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
        
        {position === "bottom" && (
          <div className="flex justify-center text-[9px] text-muted-foreground mt-1">
            <span>اسحب للتنقل يميناً ويساراً</span>
          </div>
        )}
      </div>
      
      {showArrows && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background"
          onClick={() => scrollBy("right")}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
