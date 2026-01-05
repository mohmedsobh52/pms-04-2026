import { useState, useEffect, useCallback } from "react";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Scale, 
  FileStack, 
  Calendar, 
  Bell, 
  FileText,
  GitCompare,
  ChevronRight,
  ChevronDown,
  Search,
  TrendingUp,
  Shield,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  FileSpreadsheet,
  DollarSign,
  ClipboardList,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  badge?: string;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
  children?: MenuItem[];
  onClick?: () => void;
  disabled?: boolean;
}

interface FloatingToolbarProps {
  onNavigate: (tab: string) => void;
  currentTab?: string;
  hasAnalysisData?: boolean;
  onShowBOQComparison?: () => void;
  onShowP6Export?: () => void;
  onShowReport?: () => void;
}

export function FloatingToolbar({ 
  onNavigate, 
  currentTab,
  hasAnalysisData,
  onShowBOQComparison,
  onShowP6Export,
  onShowReport
}: FloatingToolbarProps) {
  const [isOpen, setIsOpen] = useState(true); // Start open by default
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["analysis"]);
  const { isArabic } = useLanguage();

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      label: "Dashboard",
      labelAr: "لوحة التحكم",
    },
    {
      id: "analysis",
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Analysis Tools",
      labelAr: "أدوات التحليل",
      badge: String(4),
      children: [
        {
          id: "cost-analysis",
          icon: <DollarSign className="w-4 h-4" />,
          label: "Cost Analysis",
          labelAr: "تحليل التكاليف",
        },
        {
          id: "compare",
          icon: <Scale className="w-4 h-4" />,
          label: "Quote Compare",
          labelAr: "مقارنة العروض",
        },
        {
          id: "boq-compare",
          icon: <FileStack className="w-4 h-4" />,
          label: "BOQ Compare",
          labelAr: "مقارنة BOQ",
          badge: "New",
          badgeVariant: "destructive",
        },
        {
          id: "market-rates",
          icon: <TrendingUp className="w-4 h-4" />,
          label: "Market Rates",
          labelAr: "أسعار السوق",
        },
      ],
    },
    {
      id: "procurement",
      icon: <Package className="w-4 h-4" />,
      label: "Procurement",
      labelAr: "المشتريات",
      children: [
        {
          id: "procurement-schedule",
          icon: <ClipboardList className="w-4 h-4" />,
          label: "Schedule",
          labelAr: "الجدولة",
        },
        {
          id: "resources",
          icon: <Users className="w-4 h-4" />,
          label: "Resources",
          labelAr: "الموارد",
        },
      ],
    },
    {
      id: "upload",
      icon: <Receipt className="w-4 h-4" />,
      label: "Quotations",
      labelAr: "عروض الأسعار",
    },
    {
      id: "reports",
      icon: <FileText className="w-4 h-4" />,
      label: "Reports",
      labelAr: "التقارير",
      children: [
        {
          id: "report",
          icon: <FileSpreadsheet className="w-4 h-4" />,
          label: "Full Report",
          labelAr: "التقرير الشامل",
          onClick: onShowReport,
          disabled: !hasAnalysisData,
        },
        {
          id: "version-compare",
          icon: <GitCompare className="w-4 h-4" />,
          label: "Version Compare",
          labelAr: "مقارنة الإصدارات",
          onClick: onShowBOQComparison,
          disabled: !hasAnalysisData,
        },
        {
          id: "p6-export",
          icon: <Calendar className="w-4 h-4" />,
          label: "P6 Export",
          labelAr: "تصدير P6",
        },
      ],
    },
    {
      id: "risk",
      icon: <Shield className="w-4 h-4" />,
      label: "Risk Management",
      labelAr: "إدارة المخاطر",
      badge: "New",
      badgeVariant: "destructive",
    },
    {
      id: "contracts",
      icon: <Building2 className="w-4 h-4" />,
      label: "Contracts",
      labelAr: "العقود",
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      id: "settings",
      icon: <Bell className="w-4 h-4" />,
      label: "Notifications",
      labelAr: "الإشعارات",
    },
    {
      id: "preferences",
      icon: <Settings className="w-4 h-4" />,
      label: "Settings",
      labelAr: "الإعدادات",
    },
    {
      id: "help",
      icon: <HelpCircle className="w-4 h-4" />,
      label: "Help & Support",
      labelAr: "المساعدة",
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedMenus(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.children) {
      toggleExpand(item.id);
    } else if (item.onClick) {
      item.onClick();
      setIsOpen(false);
    } else {
      onNavigate(item.id);
      setIsOpen(false);
    }
  };

  const filterItems = (items: MenuItem[]): MenuItem[] => {
    if (!searchQuery) return items;
    
    return items.filter(item => {
      const matchesSearch = 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.labelAr.includes(searchQuery);
      
      if (item.children) {
        const filteredChildren = filterItems(item.children);
        return matchesSearch || filteredChildren.length > 0;
      }
      
      return matchesSearch;
    });
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isExpanded = expandedMenus.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = currentTab === item.id;
    const filteredChildren = item.children ? filterItems(item.children) : [];

    return (
      <div key={item.id}>
        <button
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "transition-all duration-200 ease-out",
            "hover:bg-white/10",
            "group relative",
            level === 0 ? "text-white/90" : "text-white/70",
            isActive && "bg-white/15 text-white",
            item.disabled && "opacity-50 cursor-not-allowed",
            level > 0 && "pr-3"
          )}
          style={{ paddingRight: isArabic ? `${12 + level * 12}px` : undefined, paddingLeft: !isArabic ? `${12 + level * 12}px` : undefined }}
        >
          <span className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            "transition-all duration-200",
            isActive 
              ? "bg-white/20 text-white" 
              : "bg-white/5 text-white/70 group-hover:bg-white/15 group-hover:text-white"
          )}>
            {item.icon}
          </span>
          
          <span className={cn(
            "flex-1 text-sm font-medium truncate",
            isArabic ? "text-right" : "text-left"
          )}>
            {isArabic ? item.labelAr : item.label}
          </span>

          {item.badge && (
            <Badge 
              variant={item.badgeVariant || "default"}
              className={cn(
                "text-[10px] px-1.5 py-0 h-5",
                item.badgeVariant === "destructive" 
                  ? "bg-red-500 text-white border-0" 
                  : "bg-primary/80 text-white border-0"
              )}
            >
              {item.badge}
            </Badge>
          )}

          {hasChildren && (
            <ChevronDown 
              className={cn(
                "w-4 h-4 text-white/50 transition-transform duration-300",
                isExpanded && "rotate-180"
              )} 
            />
          )}
        </button>

        {/* Submenu */}
        {hasChildren && (
          <div 
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out",
              isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className={cn(
              "py-1 space-y-0.5",
              isArabic ? "border-r-2 border-white/20 mr-6" : "border-l-2 border-white/20 ml-6"
            )}>
              {filteredChildren.map(child => renderMenuItem(child, level + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40",
          "transition-all duration-400 ease-out",
          isOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 w-12 h-12 rounded-xl shadow-lg",
          "transition-all duration-300 ease-out transform-gpu",
          "bg-[#3a4a6b] hover:bg-[#4a5a7b]",
          "border border-white/10",
          "flex items-center justify-center",
          isArabic ? "left-4 bottom-20" : "right-4 bottom-20",
          isOpen && "opacity-0 pointer-events-none"
        )}
        size="icon"
      >
        <Menu className="w-5 h-5 text-white" />
      </Button>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed z-50 top-0 h-full w-72",
          "transition-all duration-400 ease-out transform-gpu",
          "bg-gradient-to-b from-[#3a4a6b] to-[#2d3a54]",
          "shadow-2xl",
          isArabic ? "right-0" : "left-0",
          isOpen 
            ? "translate-x-0" 
            : isArabic ? "translate-x-full" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">
                  {isArabic ? "تحليل BOQ" : "BOQ Analyzer"}
                </h2>
                <p className="text-white/50 text-xs">
                  {isArabic ? "الإصدار 2.0" : "Version 2.0"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-white/40",
              isArabic ? "right-3" : "left-3"
            )} />
            <Input
              placeholder={isArabic ? "بحث..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "bg-white/10 border-white/10 text-white placeholder:text-white/40",
                "focus:bg-white/15 focus:border-white/20",
                "h-9 text-sm",
                isArabic ? "pr-9 text-right" : "pl-9"
              )}
            />
          </div>
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 max-h-[calc(100vh-200px)]">
          {/* Main Menu */}
          {filterItems(menuItems).map(item => renderMenuItem(item))}

          {/* Divider */}
          <div className="py-3">
            <div className="border-t border-white/10" />
          </div>

          {/* Section Label */}
          <p className={cn(
            "px-3 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider",
            isArabic ? "text-right" : "text-left"
          )}>
            {isArabic ? "الإعدادات" : "Settings"}
          </p>

          {/* Settings Menu */}
          {filterItems(settingsItems).map(item => renderMenuItem(item))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#2d3a54]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {isArabic ? "مستخدم" : "Admin User"}
              </p>
              <p className="text-white/50 text-xs truncate">
                admin@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
