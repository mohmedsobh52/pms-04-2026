import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Breadcrumbs } from "./Breadcrumbs";

interface NavigationBarProps {
  showBreadcrumbs?: boolean;
  className?: string;
}

export function NavigationBar({ showBreadcrumbs = true, className = "" }: NavigationBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isArabic } = useLanguage();
  
  // لا تظهر في الصفحة الرئيسية
  const isHomePage = location.pathname === "/" || location.pathname === "/dashboard";
  if (isHomePage) return null;

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className={`flex items-center gap-2 mb-4 flex-wrap navigation-bar-safe ${className}`} dir={isArabic ? "rtl" : "ltr"}>
      {/* زر الرجوع */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleBack}
        className="gap-1.5 hover:bg-primary/10 relative z-[51] pointer-events-auto"
      >
        {isArabic ? (
          <ChevronLeft className="h-4 w-4 rotate-180" />
        ) : (
          <ArrowLeft className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isArabic ? "رجوع" : "Back"}
        </span>
      </Button>
      
      {/* زر الرئيسية */}
      <Button 
        variant="outline" 
        size="sm" 
        asChild
        className="gap-1.5 relative z-[51] pointer-events-auto"
      >
        <Link to="/">
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isArabic ? "الرئيسية" : "Home"}
          </span>
        </Link>
      </Button>
      
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <div className="flex-1 hidden md:block">
          <Breadcrumbs />
        </div>
      )}
    </div>
  );
}
