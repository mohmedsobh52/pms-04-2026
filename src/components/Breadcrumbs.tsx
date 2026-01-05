import { useLocation, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ChevronRight, Home } from "lucide-react";
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
}

const routeConfigs: RouteConfig[] = [
  { path: "/", labelEn: "Home", labelAr: "الرئيسية" },
  { path: "/dashboard", labelEn: "Dashboard", labelAr: "لوحة التحكم", parent: "/" },
  { path: "/items", labelEn: "BOQ Items", labelAr: "بنود الكميات", parent: "/" },
  { path: "/analysis-tools", labelEn: "Analysis Tools", labelAr: "أدوات التحليل", parent: "/" },
  { path: "/procurement", labelEn: "Procurement", labelAr: "المشتريات", parent: "/" },
  { path: "/quotations", labelEn: "Quotations", labelAr: "عروض الأسعار", parent: "/" },
  { path: "/subcontractors", labelEn: "Subcontractors", labelAr: "المقاولين", parent: "/" },
  { path: "/contracts", labelEn: "Contracts", labelAr: "العقود", parent: "/" },
  { path: "/risk", labelEn: "Risk Management", labelAr: "إدارة المخاطر", parent: "/" },
  { path: "/reports", labelEn: "Reports", labelAr: "التقارير", parent: "/" },
  { path: "/settings", labelEn: "Settings", labelAr: "الإعدادات", parent: "/" },
  { path: "/attachments", labelEn: "Attachments", labelAr: "المرفقات", parent: "/" },
  { path: "/templates", labelEn: "Templates", labelAr: "القوالب", parent: "/" },
  { path: "/p6-export", labelEn: "P6 Export", labelAr: "تصدير P6", parent: "/reports" },
  { path: "/compare-versions", labelEn: "Version Compare", labelAr: "مقارنة الإصدارات", parent: "/reports" },
  { path: "/projects", labelEn: "Saved Projects", labelAr: "المشاريع المحفوظة", parent: "/" },
  { path: "/cost-analysis", labelEn: "Cost Analysis", labelAr: "تحليل التكاليف", parent: "/" },
  { path: "/about", labelEn: "About", labelAr: "عن التطبيق", parent: "/" },
  { path: "/changelog", labelEn: "Changelog", labelAr: "سجل التغييرات", parent: "/" },
  { path: "/auth", labelEn: "Login", labelAr: "تسجيل الدخول", parent: "/" },
];

export function Breadcrumbs() {
  const location = useLocation();
  const { isArabic } = useLanguage();
  
  // Don't show breadcrumbs on home page
  if (location.pathname === "/") return null;
  
  // Find current route config
  const currentRoute = routeConfigs.find(r => r.path === location.pathname);
  if (!currentRoute) return null;

  // Build breadcrumb trail
  const trail: RouteConfig[] = [];
  let current: RouteConfig | undefined = currentRoute;
  
  while (current) {
    trail.unshift(current);
    current = current.parent 
      ? routeConfigs.find(r => r.path === current!.parent) 
      : undefined;
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {trail.map((route, index) => {
          const isLast = index === trail.length - 1;
          const label = isArabic ? route.labelAr : route.labelEn;
          
          return (
            <BreadcrumbItem key={route.path}>
              {index > 0 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
              
              {isLast ? (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  {route.path === "/" && <Home className="h-3.5 w-3.5" />}
                  {label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    to={route.path} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    {route.path === "/" && <Home className="h-3.5 w-3.5" />}
                    {label}
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
