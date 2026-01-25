import { Link, useLocation } from "react-router-dom";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/useLanguage";
import { 
  Menu, 
  LayoutDashboard, 
  Briefcase, 
  Layers, 
  BarChart3, 
  Database, 
  Users, 
  Calendar, 
  Shield, 
  FileText, 
  FileStack,
  Settings,
  HelpCircle,
  ChevronRight,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  href?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    id: "home",
    icon: <Home className="w-5 h-5" />,
    label: "Home",
    labelAr: "الرئيسية",
    href: "/",
  },
  {
    id: "dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    label: "Dashboard",
    labelAr: "لوحة التحكم",
    href: "/dashboard",
  },
  {
    id: "projects",
    icon: <Briefcase className="w-5 h-5" />,
    label: "Projects",
    labelAr: "المشاريع",
    href: "/projects",
  },
  {
    id: "boq-items",
    icon: <Layers className="w-5 h-5" />,
    label: "BOQ Items",
    labelAr: "جدول الكميات",
    href: "/items",
  },
  {
    id: "analysis-estimating",
    icon: <BarChart3 className="w-5 h-5" />,
    label: "Analysis & Estimating",
    labelAr: "التحليل والتسعير",
    children: [
      { id: "cost-analysis", icon: <BarChart3 className="w-4 h-4" />, label: "Cost Analysis", labelAr: "تحليل التكاليف", href: "/cost-analysis" },
      { id: "quotations", icon: <FileText className="w-4 h-4" />, label: "Quotations", labelAr: "عروض الأسعار", href: "/quotations" },
      { id: "historical", icon: <FileText className="w-4 h-4" />, label: "Historical Pricing", labelAr: "الأسعار التاريخية", href: "/historical-pricing" },
      { id: "fast-extraction", icon: <FileText className="w-4 h-4" />, label: "Fast Extraction", labelAr: "الاستخراج السريع", href: "/fast-extraction" },
    ],
  },
  {
    id: "library-procurement",
    icon: <Database className="w-5 h-5" />,
    label: "Library & Procurement",
    labelAr: "المكتبة والمشتريات",
    children: [
      { id: "library", icon: <Database className="w-4 h-4" />, label: "Library", labelAr: "المكتبة", href: "/library" },
      { id: "procurement", icon: <Database className="w-4 h-4" />, label: "Procurement", labelAr: "المشتريات", href: "/procurement" },
      { id: "material-prices", icon: <Database className="w-4 h-4" />, label: "Material Prices", labelAr: "أسعار المواد", href: "/material-prices" },
    ],
  },
  {
    id: "contracts",
    icon: <FileText className="w-5 h-5" />,
    label: "Contracts",
    labelAr: "العقود",
    href: "/contracts",
  },
  {
    id: "subcontractors",
    icon: <Users className="w-5 h-5" />,
    label: "Subcontractors",
    labelAr: "مقاولي الباطن",
    href: "/subcontractors",
  },
  {
    id: "calendar",
    icon: <Calendar className="w-5 h-5" />,
    label: "Calendar",
    labelAr: "التقويم",
    href: "/calendar",
  },
  {
    id: "risk",
    icon: <Shield className="w-5 h-5" />,
    label: "Risk Management",
    labelAr: "إدارة المخاطر",
    href: "/risk",
  },
  {
    id: "reports",
    icon: <FileText className="w-5 h-5" />,
    label: "Reports",
    labelAr: "التقارير",
    href: "/reports",
  },
  {
    id: "attachments",
    icon: <FileStack className="w-5 h-5" />,
    label: "Attachments",
    labelAr: "المرفقات",
    href: "/attachments",
  },
];

const bottomItems: NavItem[] = [
  {
    id: "settings",
    icon: <Settings className="w-5 h-5" />,
    label: "Settings",
    labelAr: "الإعدادات",
    href: "/settings",
  },
  {
    id: "help",
    icon: <HelpCircle className="w-5 h-5" />,
    label: "Help",
    labelAr: "المساعدة",
    href: "/about",
  },
];

export function MobileNavDrawer() {
  const { isArabic } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return location.pathname === href;
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.href);

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpand(item.id)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg",
              "transition-colors hover:bg-muted/50",
              level > 0 && "px-6"
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-medium">
                {isArabic ? item.labelAr : item.label}
              </span>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              isExpanded && "rotate-90"
            )} />
          </button>
          {isExpanded && (
            <div className="py-1 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        to={item.href || "/"}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg",
          "transition-colors hover:bg-muted/50",
          active && "bg-primary/10 text-primary font-medium",
          level > 0 && "px-8 py-2.5 text-sm"
        )}
      >
        {item.icon}
        <span>{isArabic ? item.labelAr : item.label}</span>
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side={isArabic ? "right" : "left"} 
        className="w-[300px] p-0"
      >
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BOQ Analyzer
            </span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-140px)]">
          <nav className="p-4 space-y-1">
            {navItems.map(item => renderNavItem(item))}
          </nav>
        </ScrollArea>
        
        <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4 space-y-1">
          {bottomItems.map(item => renderNavItem(item))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
