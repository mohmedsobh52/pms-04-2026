import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingBackButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isArabic } = useLanguage();

  // Don't show on home page or dashboard
  const isHomePage = location.pathname === "/" || location.pathname === "/dashboard";

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 300);
      setShowScrollTop(scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Check initial scroll position
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isHomePage) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 z-50 flex flex-col gap-2 transition-all duration-300",
        isArabic ? "left-6" : "right-6",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      {/* Scroll to Top Button */}
      <Button
        size="icon"
        variant="secondary"
        onClick={scrollToTop}
        className={cn(
          "h-11 w-11 rounded-full shadow-lg transition-all duration-300",
          "bg-background/90 backdrop-blur-sm border border-border",
          "hover:bg-muted hover:scale-105",
          showScrollTop 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-2 pointer-events-none"
        )}
        title={isArabic ? "للأعلى" : "Scroll to top"}
      >
        <ArrowUp className="h-5 w-5" />
      </Button>

      {/* Back Button */}
      <Button
        size="icon"
        onClick={handleBack}
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
          "bg-primary hover:bg-primary/90 hover:scale-105",
          "ring-4 ring-primary/20"
        )}
        title={isArabic ? "رجوع" : "Go back"}
      >
        <ArrowLeft className={cn("h-5 w-5", isArabic && "rotate-180")} />
      </Button>
    </div>
  );
}
