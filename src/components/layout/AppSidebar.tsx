import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  Home, FolderOpen, ListChecks, DollarSign, Gauge, Briefcase, Package, FileSignature,
  Users, AlertTriangle, FileBarChart, BookOpen, Calendar, Settings, Shield, FileText,
  Layers, Truck, Award,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

type NavItem = { titleEn: string; titleAr: string; url: string; icon: typeof Home };
type NavGroup = { labelEn: string; labelAr: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    labelEn: "Workspace", labelAr: "مساحة العمل",
    items: [
      { titleEn: "Home",      titleAr: "الرئيسية",   url: "/",          icon: Home },
      { titleEn: "Dashboard", titleAr: "لوحة التحكم", url: "/dashboard", icon: Gauge },
      { titleEn: "Projects",  titleAr: "المشاريع",    url: "/projects",  icon: FolderOpen },
      { titleEn: "BOQ Items", titleAr: "بنود BOQ",   url: "/items",     icon: ListChecks },
    ],
  },
  {
    labelEn: "Pricing & Cost", labelAr: "التسعير والتكلفة",
    items: [
      { titleEn: "Cost Analysis",      titleAr: "تحليل التكلفة",   url: "/cost-analysis",       icon: DollarSign },
      { titleEn: "Cost Control",       titleAr: "متابعة التكلفة",  url: "/cost-control-report", icon: Gauge },
      { titleEn: "EVM Standalone",     titleAr: "EVM مستقل",      url: "/cost-control-evm",    icon: FileBarChart },
      { titleEn: "Historical Pricing", titleAr: "أسعار تاريخية",   url: "/historical-pricing",  icon: BookOpen },
      { titleEn: "Material Prices",    titleAr: "أسعار المواد",    url: "/material-prices",     icon: Package },
      { titleEn: "Pricing Accuracy",   titleAr: "دقة التسعير",     url: "/pricing-accuracy",    icon: Award },
    ],
  },
  {
    labelEn: "Procurement", labelAr: "المشتريات",
    items: [
      { titleEn: "Procurement",    titleAr: "المشتريات",    url: "/procurement",    icon: Briefcase },
      { titleEn: "Quotations",     titleAr: "عروض الأسعار", url: "/quotations",     icon: FileText },
      { titleEn: "Subcontractors", titleAr: "المقاولون",    url: "/subcontractors", icon: Users },
      { titleEn: "Resources",      titleAr: "الموارد",      url: "/resources",      icon: Layers },
    ],
  },
  {
    labelEn: "Contracts & Risk", labelAr: "العقود والمخاطر",
    items: [
      { titleEn: "Contracts",             titleAr: "العقود",   url: "/contracts",             icon: FileSignature },
      { titleEn: "Progress Certificates", titleAr: "مستخلصات", url: "/progress-certificates", icon: FileText },
      { titleEn: "Risks",                 titleAr: "المخاطر",  url: "/risk",                  icon: AlertTriangle },
    ],
  },
  {
    labelEn: "Reports & Tools", labelAr: "التقارير والأدوات",
    items: [
      { titleEn: "Reports",           titleAr: "التقارير",         url: "/projects?tab=reports", icon: FileBarChart },
      { titleEn: "Executive Summary", titleAr: "الملخص التنفيذي", url: "/executive-summary",    icon: FileBarChart },
      { titleEn: "Compare Versions",  titleAr: "مقارنة الإصدارات", url: "/compare-versions",     icon: Layers },
      { titleEn: "Templates",         titleAr: "القوالب",          url: "/templates",            icon: Layers },
      { titleEn: "P6 Export",         titleAr: "تصدير P6",         url: "/p6-export",            icon: Truck },
      { titleEn: "Calendar",          titleAr: "التقويم",          url: "/calendar",             icon: Calendar },
      { titleEn: "Library",           titleAr: "المكتبة",          url: "/library",              icon: BookOpen },
    ],
  },
  {
    labelEn: "Admin", labelAr: "الإدارة",
    items: [
      { titleEn: "Admin",    titleAr: "لوحة المدير",   url: "/admin",            icon: Shield },
      { titleEn: "Company",  titleAr: "إعدادات الشركة", url: "/company-settings", icon: Settings },
      { titleEn: "Settings", titleAr: "الإعدادات",      url: "/settings",         icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { isArabic } = useLanguage();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (url: string) => {
    const target = url.split("?")[0];
    return target === "/" ? pathname === "/" : pathname === target || pathname.startsWith(target + "/");
  };

  return (
    <Sidebar collapsible="icon" side={isArabic ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold shrink-0">
            P
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-sidebar-foreground truncate">PMS</div>
              <div className="text-[10px] text-sidebar-foreground/70 truncate">
                {isArabic ? "نظام إدارة المشاريع" : "Project Management"}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => {
          return (
            <SidebarGroup key={g.labelEn}>
              {!collapsed && (
                <SidebarGroupLabel>{isArabic ? g.labelAr : g.labelEn}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={isArabic ? item.titleAr : item.titleEn}>
                        <NavLink to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{isArabic ? item.titleAr : item.titleEn}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-2 text-[10px] text-sidebar-foreground/60">
        {!collapsed && <span>© 2025 PMS</span>}
      </SidebarFooter>
    </Sidebar>
  );
}
