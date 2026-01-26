import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { 
  Home, LayoutDashboard, FolderOpen, FileText, BarChart3, 
  DollarSign, FileBarChart, Settings, Calendar, Zap, Library,
  ShoppingCart, FileStack, Clock, Scale, AlertTriangle,
  Users, Building2, Paperclip, Plus
} from "lucide-react";

interface NavigationEntry {
  path: string;
  label: string;
  labelAr: string;
  icon: string;
  timestamp: number;
}

interface RouteInfo {
  labelEn: string;
  labelAr: string;
  icon: string;
}

const STORAGE_KEY = "nav_history";
const MAX_HISTORY = 15;

// Route configurations for labels and icons
const routeMap: Record<string, RouteInfo> = {
  "/": { labelEn: "Home", labelAr: "الرئيسية", icon: "Home" },
  "/dashboard": { labelEn: "Dashboard", labelAr: "لوحة التحكم", icon: "LayoutDashboard" },
  "/projects": { labelEn: "Projects", labelAr: "المشاريع", icon: "FolderOpen" },
  "/projects/new": { labelEn: "New Project", labelAr: "مشروع جديد", icon: "Plus" },
  "/analyze": { labelEn: "BOQ Analyzer", labelAr: "محلل الكميات", icon: "FileText" },
  "/items": { labelEn: "BOQ Items", labelAr: "بنود الكميات", icon: "FileText" },
  "/cost-analysis": { labelEn: "Cost Analysis", labelAr: "تحليل التكاليف", icon: "BarChart3" },
  "/quotations": { labelEn: "Quotations", labelAr: "عروض الأسعار", icon: "DollarSign" },
  "/reports": { labelEn: "Reports", labelAr: "التقارير", icon: "FileBarChart" },
  "/settings": { labelEn: "Settings", labelAr: "الإعدادات", icon: "Settings" },
  "/calendar": { labelEn: "Calendar", labelAr: "التقويم", icon: "Calendar" },
  "/fast-extraction": { labelEn: "Fast Extraction", labelAr: "استخراج سريع", icon: "Zap" },
  "/library": { labelEn: "Library", labelAr: "المكتبة", icon: "Library" },
  "/material-prices": { labelEn: "Material Prices", labelAr: "أسعار المواد", icon: "DollarSign" },
  "/procurement": { labelEn: "Procurement", labelAr: "المشتريات", icon: "ShoppingCart" },
  "/templates": { labelEn: "Templates", labelAr: "القوالب", icon: "FileStack" },
  "/historical-pricing": { labelEn: "Historical Pricing", labelAr: "الأسعار التاريخية", icon: "Clock" },
  "/compare-versions": { labelEn: "Compare Versions", labelAr: "مقارنة الإصدارات", icon: "Scale" },
  "/risk": { labelEn: "Risk Management", labelAr: "إدارة المخاطر", icon: "AlertTriangle" },
  "/contracts": { labelEn: "Contracts", labelAr: "العقود", icon: "FileText" },
  "/subcontractors": { labelEn: "Subcontractors", labelAr: "المقاولين", icon: "Users" },
  "/company-settings": { labelEn: "Company Settings", labelAr: "إعدادات الشركة", icon: "Building2" },
  "/attachments": { labelEn: "Attachments", labelAr: "المرفقات", icon: "Paperclip" },
  "/resources": { labelEn: "Resources", labelAr: "الموارد", icon: "Users" },
  "/p6-export": { labelEn: "P6 Export", labelAr: "تصدير P6", icon: "FileBarChart" },
  "/analysis-tools": { labelEn: "Analysis Tools", labelAr: "أدوات التحليل", icon: "BarChart3" },
  "/about": { labelEn: "About", labelAr: "حول", icon: "FileText" },
  "/changelog": { labelEn: "Changelog", labelAr: "سجل التغييرات", icon: "Clock" },
};

// Get route info for a path (handles dynamic routes)
const getRouteInfo = (pathname: string): RouteInfo | null => {
  // Check exact match first
  if (routeMap[pathname]) {
    return routeMap[pathname];
  }

  // Check for dynamic project routes
  if (pathname.match(/^\/projects\/[^/]+\/pricing$/)) {
    return { labelEn: "Tender Pricing", labelAr: "تسعير العطاء", icon: "DollarSign" };
  }
  
  if (pathname.match(/^\/projects\/[^/]+$/)) {
    return { labelEn: "Project Details", labelAr: "تفاصيل المشروع", icon: "FolderOpen" };
  }

  // Check for shared view
  if (pathname.startsWith("/shared/")) {
    return { labelEn: "Shared View", labelAr: "عرض مشترك", icon: "FileText" };
  }

  return null;
};

export function useNavigationHistory() {
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const location = useLocation();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load navigation history:", e);
    }
  }, []);

  // Track navigation changes
  useEffect(() => {
    const routeInfo = getRouteInfo(location.pathname);
    if (!routeInfo) return;

    setHistory(prev => {
      // Don't add duplicate consecutive entries
      if (prev.length > 0 && prev[0].path === location.pathname) {
        return prev;
      }

      // Remove any existing entry for this path
      const filtered = prev.filter(h => h.path !== location.pathname);

      // Create new entry
      const newEntry: NavigationEntry = {
        path: location.pathname,
        label: routeInfo.labelEn,
        labelAr: routeInfo.labelAr,
        icon: routeInfo.icon,
        timestamp: Date.now(),
      };

      // Add to start and limit to MAX_HISTORY
      const newHistory = [newEntry, ...filtered].slice(0, MAX_HISTORY);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error("Failed to save navigation history:", e);
      }

      return newHistory;
    });
  }, [location.pathname]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear navigation history:", e);
    }
  }, []);

  // Get history excluding current page
  const getHistoryExcludingCurrent = useCallback(() => {
    return history.filter(h => h.path !== location.pathname);
  }, [history, location.pathname]);

  return { 
    history, 
    clearHistory, 
    getHistoryExcludingCurrent,
    currentPath: location.pathname 
  };
}

// Icon mapping helper for the sidebar component
export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  LayoutDashboard,
  FolderOpen,
  FileText,
  BarChart3,
  DollarSign,
  FileBarChart,
  Settings,
  Calendar,
  Zap,
  Library,
  ShoppingCart,
  FileStack,
  Clock,
  Scale,
  AlertTriangle,
  Users,
  Building2,
  Paperclip,
  Plus,
};
