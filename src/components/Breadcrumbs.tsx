import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ChevronLeft, Home, FileText, Settings, BarChart3, FolderOpen, Calendar, Database, Building2, AlertTriangle, Package, Users, FileCheck, History, Zap, Info, ClipboardList, DollarSign, Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface RouteConfig {
  path: string;
  labelEn: string;
  labelAr: string;
  parent?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isDynamic?: boolean;
}

const routeConfigs: RouteConfig[] = [
  { path: "/", labelEn: "Home", labelAr: "الرئيسية", icon: Home },
  { path: "/dashboard", labelEn: "Dashboard", labelAr: "لوحة التحكم", parent: "/", icon: BarChart3 },
  { path: "/analyze", labelEn: "New Analysis", labelAr: "تحليل جديد", parent: "/", icon: FileText },
  { path: "/items", labelEn: "BOQ Items", labelAr: "بنود الكميات", parent: "/", icon: ClipboardList },
  { path: "/analysis-tools", labelEn: "Analysis Tools", labelAr: "أدوات التحليل", parent: "/", icon: Settings },
  { path: "/procurement", labelEn: "Procurement", labelAr: "المشتريات", parent: "/", icon: Package },
  { path: "/quotations", labelEn: "Quotations", labelAr: "عروض الأسعار", parent: "/", icon: FileCheck },
  { path: "/subcontractors", labelEn: "Subcontractors", labelAr: "مقاولي الباطن", parent: "/", icon: Users },
  { path: "/contracts", labelEn: "Contracts", labelAr: "العقود", parent: "/", icon: FileCheck },
  { path: "/risk", labelEn: "Risk Management", labelAr: "إدارة المخاطر", parent: "/", icon: AlertTriangle },
  { path: "/reports", labelEn: "Reports", labelAr: "التقارير", parent: "/", icon: BarChart3 },
  { path: "/settings", labelEn: "Settings", labelAr: "الإعدادات", parent: "/", icon: Settings },
  { path: "/company-settings", labelEn: "Company Settings", labelAr: "إعدادات الشركة", parent: "/settings", icon: Building2 },
  { path: "/attachments", labelEn: "Attachments", labelAr: "المرفقات", parent: "/", icon: FolderOpen },
  { path: "/templates", labelEn: "Templates", labelAr: "القوالب", parent: "/", icon: FileText },
  { path: "/p6-export", labelEn: "P6 Export", labelAr: "تصدير P6", parent: "/reports", icon: FileText },
  { path: "/compare-versions", labelEn: "Version Compare", labelAr: "مقارنة الإصدارات", parent: "/reports", icon: History },
  { path: "/projects", labelEn: "Saved Projects", labelAr: "المشاريع المحفوظة", parent: "/", icon: FolderOpen },
  { path: "/projects/new", labelEn: "New Project", labelAr: "مشروع جديد", parent: "/projects", icon: Plus },
  { path: "/saved-projects", labelEn: "Saved Projects", labelAr: "المشاريع المحفوظة", parent: "/", icon: FolderOpen },
  { path: "/cost-analysis", labelEn: "Cost Analysis", labelAr: "تحليل التكاليف", parent: "/", icon: BarChart3 },
  { path: "/library", labelEn: "Library", labelAr: "المكتبة", parent: "/", icon: Database },
  { path: "/material-prices", labelEn: "Material Prices", labelAr: "أسعار المواد", parent: "/library", icon: Package },
  { path: "/resources", labelEn: "Resources", labelAr: "الموارد", parent: "/", icon: Users },
  { path: "/calendar", labelEn: "Calendar", labelAr: "التقويم", parent: "/", icon: Calendar },
  { path: "/historical-pricing", labelEn: "Historical Pricing", labelAr: "الأسعار التاريخية", parent: "/", icon: History },
  { path: "/fast-extraction", labelEn: "Fast Extraction", labelAr: "الاستخراج السريع", parent: "/", icon: Zap },
  { path: "/about", labelEn: "About", labelAr: "عن التطبيق", parent: "/", icon: Info },
  { path: "/changelog", labelEn: "Changelog", labelAr: "سجل التغييرات", parent: "/about", icon: History },
  { path: "/auth", labelEn: "Login", labelAr: "تسجيل الدخول", parent: "/" },
  // Dynamic routes
  { path: "/projects/:projectId", labelEn: "Project Details", labelAr: "تفاصيل المشروع", parent: "/projects", icon: FolderOpen, isDynamic: true },
  { path: "/projects/:projectId/pricing", labelEn: "Tender Pricing", labelAr: "تسعير العطاء", parent: "/projects/:projectId", icon: DollarSign, isDynamic: true },
  { path: "/shared/:shareCode", labelEn: "Shared View", labelAr: "عرض مشترك", parent: "/", icon: FileText, isDynamic: true },
];

// Find route config that matches the current pathname
const findRouteConfig = (pathname: string): RouteConfig | null => {
  // Try exact match first
  const exactMatch = routeConfigs.find(r => r.path === pathname);
  if (exactMatch) return exactMatch;
  
  // Try pattern matching for dynamic routes
  for (const config of routeConfigs) {
    if (config.path.includes(":")) {
      const pattern = config.path.replace(/:[^/]+/g, "[^/]+");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) {
        return { ...config, path: pathname };
      }
    }
  }
  
  return null;
};

// Build breadcrumb trail
const buildTrail = (pathname: string): RouteConfig[] => {
  const trail: RouteConfig[] = [];
  let current = findRouteConfig(pathname);
  
  while (current) {
    trail.unshift(current);
    
    if (current.parent) {
      // Handle dynamic parent paths
      if (current.parent.includes(":")) {
        // Extract the actual ID from current path and use it in parent
        const segments = pathname.split("/");
        const parentPattern = current.parent.split("/");
        let parentPath = current.parent;
        
        parentPattern.forEach((segment, index) => {
          if (segment.startsWith(":") && segments[index]) {
            parentPath = parentPath.replace(segment, segments[index]);
          }
        });
        
        current = findRouteConfig(parentPath);
      } else {
        current = routeConfigs.find(r => r.path === current!.parent);
      }
    } else {
      current = undefined;
    }
  }
  
  return trail;
};

// Extract project ID from pathname
const extractProjectId = (pathname: string): string | null => {
  const match = pathname.match(/\/projects\/([^/]+)/);
  if (match && match[1] && match[1] !== "new") {
    return match[1];
  }
  return null;
};

export function Breadcrumbs() {
  const location = useLocation();
  const { isArabic } = useLanguage();
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  
  // Get pathname without query params
  const pathname = location.pathname;
  
  // Fetch dynamic labels (project names)
  useEffect(() => {
    const fetchProjectName = async () => {
      const projectId = extractProjectId(pathname);
      if (!projectId) return;
      
      // Check if we already have this label
      const projectPath = `/projects/${projectId}`;
      if (dynamicLabels[projectPath]) return;
      
      try {
        // Try project_data first
        let { data } = await supabase
          .from("project_data")
          .select("name")
          .eq("id", projectId)
          .single();
        
        // If not found, try saved_projects
        if (!data) {
          const savedResult = await supabase
            .from("saved_projects")
            .select("name")
            .eq("id", projectId)
            .single();
          data = savedResult.data;
        }
        
        if (data?.name) {
          setDynamicLabels(prev => ({
            ...prev,
            [projectPath]: data.name
          }));
        }
      } catch (error) {
        console.error("Failed to fetch project name:", error);
      }
    };
    
    fetchProjectName();
  }, [pathname]);
  
  // Don't show breadcrumbs on home page
  if (pathname === "/") return null;
  
  const trail = buildTrail(pathname);
  
  // If we couldn't build a trail, don't show anything
  if (trail.length === 0) return null;

  const SeparatorIcon = isArabic ? ChevronLeft : ChevronRight;

  // Get label for a route (with dynamic label support)
  const getLabel = (route: RouteConfig): string => {
    // Check for dynamic label (project name)
    if (route.isDynamic) {
      // For project details page, use project name
      const projectPath = route.path.replace(/\/pricing$/, "");
      if (dynamicLabels[projectPath] && !route.path.endsWith("/pricing")) {
        return dynamicLabels[projectPath];
      }
    }
    return isArabic ? route.labelAr : route.labelEn;
  };

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-wrap">
        {trail.map((route, index) => {
          const isLast = index === trail.length - 1;
          const label = getLabel(route);
          const IconComponent = route.icon;
          
          return (
            <BreadcrumbItem key={`${route.path}-${index}`}>
              {index > 0 && (
                <BreadcrumbSeparator>
                  <SeparatorIcon className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
              )}
              
              {isLast ? (
                <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
                  {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline max-w-[150px] truncate" title={label}>{label}</span>
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    to={route.path} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground"
                  >
                    {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline max-w-[120px] truncate" title={label}>{label}</span>
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
