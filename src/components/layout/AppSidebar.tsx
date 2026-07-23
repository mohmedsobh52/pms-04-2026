import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  Home, FolderOpen, ListChecks, DollarSign, Gauge, Briefcase, Package, FileSignature,
  Users, AlertTriangle, FileBarChart, BookOpen, Calendar, Settings, Shield, FileText,
  Layers, Truck, Award, Inbox, Search, LayoutDashboard, ClipboardList, GitCompare,
  HardHat, Boxes, ScrollText, Building2, Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";
import { useProjectContext } from "@/hooks/useProjectContext";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  titleEn: string; titleAr: string; url: string; icon: typeof Home;
  /** Roles allowed to see; undefined = visible to everyone signed in. */
  roles?: AppRole[];
  /** Append ?projectId= when in project mode. */
  projectScoped?: boolean;
};
type NavGroup = { labelEn: string; labelAr: string; items: NavItem[] };

/* ------------------------------------------------------------------ */
/* SYSTEM-LEVEL NAVIGATION (always visible)                            */
/* ------------------------------------------------------------------ */
const systemGroups: NavGroup[] = [
  {
    labelEn: "Workspace", labelAr: "مساحة العمل",
    items: [
      { titleEn: "Home",      titleAr: "الرئيسية",    url: "/",          icon: Home },
      { titleEn: "Dashboard", titleAr: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard },
      { titleEn: "Projects",  titleAr: "المشاريع",     url: "/projects",  icon: FolderOpen },
      { titleEn: "Approvals", titleAr: "الموافقات",    url: "/approvals", icon: Inbox },
    ],
  },
  {
    labelEn: "Insights", labelAr: "رؤى وتقارير",
    items: [
      { titleEn: "Reports",           titleAr: "التقارير",         url: "/projects?tab=reports", icon: FileBarChart },
      { titleEn: "Executive Summary", titleAr: "الملخص التنفيذي",  url: "/executive-summary",    icon: Sparkles },
      { titleEn: "Compare Projects",  titleAr: "مقارنة المشاريع",  url: "/projects/compare",     icon: GitCompare },
      { titleEn: "Library",           titleAr: "المكتبة",          url: "/library",              icon: BookOpen },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* PROJECT-LEVEL NAVIGATION (visible only when inside a project)       */
/* ------------------------------------------------------------------ */
const projectGroups: NavGroup[] = [
  {
    labelEn: "Project Management", labelAr: "إدارة المشروع",
    items: [
      { titleEn: "Overview",       titleAr: "نظرة عامة",   url: "__PROJECT_BASE__",                    icon: LayoutDashboard },
      { titleEn: "Schedule",       titleAr: "الجدول الزمني", url: "/calendar",                          icon: Calendar, projectScoped: true },
      { titleEn: "Execution Plan", titleAr: "خطة التنفيذ", url: "__PROJECT_BASE__?tab=execution",     icon: ClipboardList },
    ],
  },
  {
    labelEn: "Engineering", labelAr: "الهندسة",
    items: [
      { titleEn: "BOQ Items", titleAr: "بنود BOQ", url: "/items",         icon: ListChecks, projectScoped: true },
      { titleEn: "Pricing",   titleAr: "التسعير",  url: "__PROJECT_BASE__/pricing", icon: DollarSign },
      { titleEn: "Drawings",  titleAr: "المخططات", url: "__PROJECT_BASE__?tab=attachments", icon: Layers },
    ],
  },
  {
    labelEn: "Financial", labelAr: "المالية",
    items: [
      { titleEn: "Cost Control",   titleAr: "متابعة التكلفة", url: "__PROJECT_BASE__/cost-control", icon: Gauge },
      { titleEn: "EVM",            titleAr: "EVM",            url: "/cost-control-evm",              icon: FileBarChart, projectScoped: true },
      { titleEn: "Certificates",   titleAr: "المستخلصات",     url: "/progress-certificates",         icon: Award,        projectScoped: true },
      { titleEn: "Pricing Accuracy", titleAr: "دقة التسعير", url: "/pricing-accuracy",              icon: Award,        projectScoped: true },
    ],
  },
  {
    labelEn: "Procurement", labelAr: "المشتريات",
    items: [
      { titleEn: "Procurement", titleAr: "المشتريات",    url: "/procurement",    icon: Briefcase, projectScoped: true, roles: ["admin", "pm", "procurement", "cost_engineer"] },
      { titleEn: "Quotations",  titleAr: "عروض الأسعار", url: "/quotations",     icon: FileText,  projectScoped: true, roles: ["admin", "pm", "procurement"] },
      { titleEn: "Suppliers",   titleAr: "الموردون",     url: "/resources",      icon: Boxes,     projectScoped: true, roles: ["admin", "pm", "procurement"] },
      { titleEn: "Materials",   titleAr: "أسعار المواد", url: "/material-prices", icon: Package,  projectScoped: true },
    ],
  },
  {
    labelEn: "Control", labelAr: "الرقابة",
    items: [
      { titleEn: "Contracts",      titleAr: "العقود",     url: "/contracts",      icon: FileSignature, projectScoped: true },
      { titleEn: "Subcontractors", titleAr: "المقاولون",  url: "/subcontractors", icon: HardHat,       projectScoped: true },
      { titleEn: "Risks",          titleAr: "المخاطر",    url: "/risk",           icon: AlertTriangle, projectScoped: true },
    ],
  },
  {
    labelEn: "Documentation", labelAr: "التوثيق",
    items: [
      { titleEn: "Documents",    titleAr: "المستندات",       url: "__PROJECT_BASE__?tab=attachments", icon: FileText },
      { titleEn: "Activity Log", titleAr: "سجل النشاط",      url: "__PROJECT_BASE__?tab=activity",    icon: ScrollText },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* ADMIN GROUP                                                         */
/* ------------------------------------------------------------------ */
const adminGroup: NavGroup = {
  labelEn: "Administration", labelAr: "الإدارة",
  items: [
    { titleEn: "Admin Dashboard", titleAr: "لوحة المدير",     url: "/admin",            icon: Shield,   roles: ["admin"] },
    { titleEn: "Team",            titleAr: "الفريق",          url: "/team",             icon: Users,     roles: ["admin"] },
    { titleEn: "Audit Logs",      titleAr: "سجل التدقيق",     url: "/audit-logs",       icon: ScrollText, roles: ["admin"] },
    { titleEn: "Notifications",   titleAr: "التنبيهات",       url: "/notifications",    icon: Inbox },
    { titleEn: "Company",         titleAr: "إعدادات الشركة", url: "/company-settings", icon: Building2, roles: ["admin"] },
    { titleEn: "Settings",        titleAr: "الإعدادات",       url: "/settings",         icon: Settings },
    { titleEn: "Versions",        titleAr: "الإصدارات",       url: "/admin/versions",   icon: Layers,    roles: ["admin"] },
  ],
};

function resolveUrl(url: string, projectId?: string, projectScoped?: boolean): string {
  let out = url;
  if (out.includes("__PROJECT_BASE__")) {
    out = projectId ? out.replace("__PROJECT_BASE__", `/projects/${projectId}`) : "/projects";
  }
  if (projectScoped && projectId) {
    const sep = out.includes("?") ? "&" : "?";
    out = `${out}${sep}projectId=${projectId}`;
  }
  return out;
}

export function AppSidebar() {
  const { isArabic } = useLanguage();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { roles, isAdmin } = useUserRoles();
  const { projectId, inProjectMode, currentProject } = useProjectContext();

  const canSee = (item: NavItem) =>
    !item.roles || isAdmin || item.roles.some((r) => roles.includes(r));

  const isActive = (raw: string) => {
    const url = resolveUrl(raw, projectId);
    const target = url.split("?")[0];
    if (target === "/") return pathname === "/";
    return pathname === target || pathname.startsWith(target + "/");
  };

  const renderGroup = (g: NavGroup) => {
    const visible = g.items.filter(canSee);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup key={g.labelEn}>
        {!collapsed && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/60">
            {isArabic ? g.labelAr : g.labelEn}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const url = resolveUrl(item.url, projectId, item.projectScoped);
              return (
                <SidebarMenuItem key={`${g.labelEn}-${item.titleEn}`}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={isArabic ? item.titleAr : item.titleEn}
                  >
                    <NavLink to={url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="truncate text-[13px]">
                          {isArabic ? item.titleAr : item.titleEn}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const modeBadge = useMemo(() => {
    if (collapsed) return null;
    return (
      <Badge
        variant={inProjectMode ? "default" : "secondary"}
        className="text-[9px] px-1.5 py-0 h-4"
      >
        {inProjectMode
          ? (isArabic ? "مشروع" : "Project")
          : (isArabic ? "نظام" : "System")}
      </Badge>
    );
  }, [collapsed, inProjectMode, isArabic]);

  return (
    <Sidebar collapsible="icon" side={isArabic ? "right" : "left"}>
      {/* SECTION 1 — Brand */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm">
            P
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-sidebar-foreground truncate">PMS</span>
                {modeBadge}
              </div>
              <div className="text-[10px] text-sidebar-foreground/70 truncate">
                {isArabic ? "نظام إدارة المشاريع" : "Project Management"}
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* SECTION 2 — Global */}
        {systemGroups.map(renderGroup)}

        {/* SECTION 3 — Project workspace context */}
        {inProjectMode && !collapsed && (
          <div className="px-2 pt-2 pb-1">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/60 px-2 mb-1.5">
              {isArabic ? "المشروع الحالي" : "Current Project"}
            </div>
            <ProjectSwitcher compact />
            {currentProject?.client_ref && (
              <div className="text-[10px] text-sidebar-foreground/60 px-2 mt-1 truncate">
                {currentProject.client_ref}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4 — Project modules */}
        {inProjectMode && projectGroups.map(renderGroup)}

        {/* Quick access — only when NOT in project (collapse clutter) */}
        {!inProjectMode && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/60">
                {isArabic ? "وصول سريع" : "Quick Access"}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                    tooltip={isArabic ? "بحث شامل" : "Global Search"}
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="truncate text-[13px]">
                        {isArabic ? "بحث شامل" : "Global Search"}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECTION 5 — Admin (role-gated) */}
        {renderGroup(adminGroup)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-2 text-[10px] text-sidebar-foreground/60">
        {!collapsed && <span>© 2025 PMS · Enterprise</span>}
      </SidebarFooter>
    </Sidebar>
  );
}
