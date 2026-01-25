import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Building2,
  Layers,
  Network,
  PieChart,
  Clock,
  Link2,
  GripVertical,
  Database,
  Briefcase,
  Calculator,
  FolderOpen,
  Zap,
  History,
  Wrench
} from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onNavigate?: (tab: string) => void;
  currentTab?: string;
  hasAnalysisData?: boolean;
  onShowBOQComparison?: () => void;
  onShowP6Export?: () => void;
  onShowReport?: () => void;
}

const MENU_ORDER_KEY = "boq-menu-order";

// Sortable menu item component
function SortableMenuItem({ 
  item, 
  level = 0,
  isExpanded,
  currentTab,
  isArabic,
  onItemClick,
  onToggleExpand,
  filterItems,
  renderChildren
}: {
  item: MenuItem;
  level?: number;
  isExpanded: boolean;
  currentTab?: string;
  isArabic: boolean;
  onItemClick: (item: MenuItem) => void;
  onToggleExpand: (id: string) => void;
  filterItems: (items: MenuItem[]) => MenuItem[];
  renderChildren: (children: MenuItem[], level: number) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const hasChildren = item.children && item.children.length > 0;
  const isActive = currentTab === item.id;
  const filteredChildren = item.children ? filterItems(item.children) : [];

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-1">
        {/* Drag Handle - only for top level items */}
        {level === 0 && (
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "flex-shrink-0 w-6 h-6 rounded flex items-center justify-center",
              "text-white/30 hover:text-white/60 hover:bg-white/10",
              "cursor-grab active:cursor-grabbing transition-colors",
              isDragging && "cursor-grabbing"
            )}
          >
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        
        <button
          onClick={() => onItemClick(item)}
          disabled={item.disabled}
          className={cn(
            "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "transition-all duration-200 ease-out",
            "hover:bg-white/10",
            "group relative",
            level === 0 ? "text-white/90" : "text-white/70",
            isActive && "bg-white/15 text-white",
            item.disabled && "opacity-50 cursor-not-allowed",
            level > 0 && "pr-3",
            isDragging && "bg-white/20 shadow-lg"
          )}
          style={{ 
            paddingRight: isArabic ? `${12 + level * 12}px` : undefined, 
            paddingLeft: !isArabic ? `${level > 0 ? 12 + level * 12 : 12}px` : undefined 
          }}
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
      </div>

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
            {renderChildren(filteredChildren, level + 1)}
          </div>
        </div>
      )}
    </div>
  );
}

export function FloatingToolbar({ 
  onNavigate, 
  currentTab,
  hasAnalysisData,
  onShowBOQComparison,
  onShowP6Export,
  onShowReport
}: FloatingToolbarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["items-menu"]);
  const { isArabic } = useLanguage();
  const navigate = useNavigate();

  // Route mapping for navigation - all go to separate pages
  const routeMap: Record<string, string> = {
    "dashboard": "/",
    "home": "/",
    // Projects section
    "projects-menu": "/projects",
    "saved-projects": "/projects",
    "new-project": "/",
    "templates": "/templates",
    // BOQ Items section
    "analysis": "/items",
    "wbs": "/items",
    "cost-brief": "/items",
    "charts": "/items",
    "time-schedule": "/items",
    "schedule-integration": "/items",
    "items-menu": "/items",
    // Analysis section
    "analysis-tools": "/analysis-tools",
    "cost-analysis": "/analysis-tools",
    "compare": "/quotations",
    "boq-compare": "/analysis-tools",
    "market-rates": "/analysis-tools",
    // Estimating section
    "estimating-menu": "/quotations",
    "quotations": "/quotations",
    "historical-pricing": "/historical-pricing",
    "fast-extraction": "/fast-extraction",
    // Library
    "library": "/library",
    // Procurement section
    "procurement": "/procurement",
    "procurement-schedule": "/procurement",
    "material-prices": "/material-prices",
    "resources": "/procurement",
    // Other sections
    "reports": "/reports",
    "report": "/reports",
    "version-compare": "/compare-versions",
    "p6-export": "/p6-export",
    "risk": "/risk",
    "contracts": "/contracts",
    "subcontractors": "/subcontractors",
    "attachments": "/attachments",
    "calendar": "/calendar",
    // Settings
    "settings": "/settings",
    "preferences": "/settings",
    "notifications": "/settings",
    "help": "/about",
  };

  const defaultMenuItems: MenuItem[] = [
    // 1. Dashboard - نقطة البداية
    {
      id: "dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      label: "Dashboard",
      labelAr: "لوحة التحكم",
    },
    // 2. Projects - الوصول السريع للمشاريع
    {
      id: "projects-menu",
      icon: <Briefcase className="w-4 h-4" />,
      label: "Projects",
      labelAr: "المشاريع",
      children: [
        {
          id: "saved-projects",
          icon: <FolderOpen className="w-4 h-4" />,
          label: "Saved Projects",
          labelAr: "المشاريع المحفوظة",
        },
        {
          id: "new-project",
          icon: <FileStack className="w-4 h-4" />,
          label: "New Project",
          labelAr: "مشروع جديد",
        },
        {
          id: "templates",
          icon: <Layers className="w-4 h-4" />,
          label: "Templates",
          labelAr: "القوالب",
        },
      ],
    },
    // 3. BOQ Items - العمل الأساسي
    {
      id: "items-menu",
      icon: <Layers className="w-4 h-4" />,
      label: "BOQ Items",
      labelAr: "جدول الكميات",
      badge: String(6),
      children: [
        {
          id: "analysis",
          icon: <FileStack className="w-4 h-4" />,
          label: "Items",
          labelAr: "البنود",
        },
        {
          id: "wbs",
          icon: <Network className="w-4 h-4" />,
          label: "WBS",
          labelAr: "هيكل تقسيم العمل",
        },
        {
          id: "cost-brief",
          icon: <DollarSign className="w-4 h-4" />,
          label: "Cost Brief",
          labelAr: "ملخص التكاليف",
        },
        {
          id: "charts",
          icon: <PieChart className="w-4 h-4" />,
          label: "Charts",
          labelAr: "الرسوم البيانية",
        },
        {
          id: "time-schedule",
          icon: <Clock className="w-4 h-4" />,
          label: "Time Schedule",
          labelAr: "الجدول الزمني",
        },
        {
          id: "schedule-integration",
          icon: <Link2 className="w-4 h-4" />,
          label: "Schedule Integration",
          labelAr: "تكامل الجدولة",
        },
      ],
    },
    // 4. Analysis & Estimating - دمج التحليل والتسعير
    {
      id: "analysis-estimating",
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Analysis & Estimating",
      labelAr: "التحليل والتسعير",
      badge: String(7),
      children: [
        {
          id: "cost-analysis",
          icon: <DollarSign className="w-4 h-4" />,
          label: "Cost Analysis",
          labelAr: "تحليل التكاليف",
        },
        {
          id: "quotations",
          icon: <Receipt className="w-4 h-4" />,
          label: "Quotations",
          labelAr: "عروض الأسعار",
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
        },
        {
          id: "historical-pricing",
          icon: <History className="w-4 h-4" />,
          label: "Historical Pricing",
          labelAr: "الأسعار التاريخية",
        },
        {
          id: "market-rates",
          icon: <TrendingUp className="w-4 h-4" />,
          label: "Market Rates",
          labelAr: "أسعار السوق",
        },
        {
          id: "fast-extraction",
          icon: <Zap className="w-4 h-4" />,
          label: "Fast Extraction",
          labelAr: "الاستخراج السريع",
          badge: "New",
          badgeVariant: "destructive",
        },
      ],
    },
    // 5. Library & Procurement - دمج المكتبة والمشتريات
    {
      id: "library-procurement",
      icon: <Database className="w-4 h-4" />,
      label: "Library & Procurement",
      labelAr: "المكتبة والمشتريات",
      badge: "New",
      badgeVariant: "destructive",
      children: [
        {
          id: "library",
          icon: <Database className="w-4 h-4" />,
          label: "Library",
          labelAr: "المكتبة",
        },
        {
          id: "material-prices",
          icon: <Database className="w-4 h-4" />,
          label: "Material Prices",
          labelAr: "أسعار المواد",
        },
        {
          id: "procurement-schedule",
          icon: <ClipboardList className="w-4 h-4" />,
          label: "Procurement Schedule",
          labelAr: "جدولة المشتريات",
        },
        {
          id: "resources",
          icon: <Users className="w-4 h-4" />,
          label: "Resources",
          labelAr: "الموارد",
        },
      ],
    },
    // 6. Stakeholders - دمج المقاولين والعقود
    {
      id: "stakeholders",
      icon: <Users className="w-4 h-4" />,
      label: "Stakeholders",
      labelAr: "الأطراف المعنية",
      children: [
        {
          id: "subcontractors",
          icon: <Users className="w-4 h-4" />,
          label: "Subcontractors",
          labelAr: "المقاولين من الباطن",
        },
        {
          id: "contracts",
          icon: <Building2 className="w-4 h-4" />,
          label: "Contracts",
          labelAr: "العقود",
        },
      ],
    },
    // 7. Scheduling - الجدولة
    {
      id: "calendar",
      icon: <Calendar className="w-4 h-4" />,
      label: "Calendar",
      labelAr: "التقويم",
    },
    // 8. Risk Management - إدارة المخاطر
    {
      id: "risk",
      icon: <Shield className="w-4 h-4" />,
      label: "Risk Management",
      labelAr: "إدارة المخاطر",
    },
    // 9. Reports - التقارير
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
        },
        {
          id: "version-compare",
          icon: <GitCompare className="w-4 h-4" />,
          label: "Version Compare",
          labelAr: "مقارنة الإصدارات",
        },
        {
          id: "p6-export",
          icon: <Calendar className="w-4 h-4" />,
          label: "P6 Export",
          labelAr: "تصدير P6",
        },
      ],
    },
    // 10. Attachments - المرفقات
    {
      id: "attachments",
      icon: <FileStack className="w-4 h-4" />,
      label: "Attachments",
      labelAr: "المرفقات",
    },
  ];

  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);

  // Load saved order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem(MENU_ORDER_KEY);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const reordered = orderIds
          .map(id => defaultMenuItems.find(item => item.id === id))
          .filter((item): item is MenuItem => item !== undefined);
        
        // Add any new items that weren't in the saved order
        const newItems = defaultMenuItems.filter(
          item => !orderIds.includes(item.id)
        );
        
        setMenuItems([...reordered, ...newItems]);
      } catch (e) {
        console.error("Failed to parse saved menu order:", e);
      }
    }
  }, []);

  const settingsItems: MenuItem[] = [
    {
      id: "notifications",
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
      labelAr: "المساعدة والدعم",
    },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        localStorage.setItem(
          MENU_ORDER_KEY,
          JSON.stringify(newItems.map((item) => item.id))
        );
        
        return newItems;
      });
    }
  };

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
      // Use route navigation if onNavigate is not provided
      if (onNavigate) {
        onNavigate(item.id);
      } else {
        const route = routeMap[item.id] || "/";
        navigate(route);
      }
      setIsOpen(false);
    }
  };

  const filterItems = useCallback((items: MenuItem[]): MenuItem[] => {
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
  }, [searchQuery]);

  const renderChildren = (children: MenuItem[], level: number) => {
    return children.map(child => (
      <div key={child.id}>
        <div className="flex items-center">
          <button
            onClick={() => handleItemClick(child)}
            disabled={child.disabled}
            className={cn(
              "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg",
              "transition-all duration-200 ease-out",
              "hover:bg-white/10",
              "group relative text-white/70",
              currentTab === child.id && "bg-white/15 text-white",
              child.disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ 
              paddingRight: isArabic ? `${12 + level * 12}px` : undefined, 
              paddingLeft: !isArabic ? `${12 + level * 12}px` : undefined 
            }}
          >
            <span className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
              "transition-all duration-200",
              currentTab === child.id 
                ? "bg-white/20 text-white" 
                : "bg-white/5 text-white/70 group-hover:bg-white/15 group-hover:text-white"
            )}>
              {child.icon}
            </span>
            
            <span className={cn(
              "flex-1 text-sm font-medium truncate",
              isArabic ? "text-right" : "text-left"
            )}>
              {isArabic ? child.labelAr : child.label}
            </span>

            {child.badge && (
              <Badge 
                variant={child.badgeVariant || "default"}
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5",
                  child.badgeVariant === "destructive" 
                    ? "bg-red-500 text-white border-0" 
                    : "bg-primary/80 text-white border-0"
                )}
              >
                {child.badge}
              </Badge>
            )}
          </button>
        </div>
      </div>
    ));
  };

  const filteredMenuItems = filterItems(menuItems);
  const filteredSettingsItems = filterItems(settingsItems);

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
                  {isArabic ? "نظام إدارة المشاريع" : "PMS"}
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
          {/* Drag hint */}
          <p className={cn(
            "px-3 py-1 text-[10px] text-white/30",
            isArabic ? "text-right" : "text-left"
          )}>
            {isArabic ? "اسحب لإعادة الترتيب" : "Drag to reorder"}
          </p>

          {/* Main Menu with DnD */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredMenuItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredMenuItems.map(item => (
                <SortableMenuItem
                  key={item.id}
                  item={item}
                  level={0}
                  isExpanded={expandedMenus.includes(item.id)}
                  currentTab={currentTab}
                  isArabic={isArabic}
                  onItemClick={handleItemClick}
                  onToggleExpand={toggleExpand}
                  filterItems={filterItems}
                  renderChildren={renderChildren}
                />
              ))}
            </SortableContext>
          </DndContext>

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

          {/* Settings Menu (not draggable) */}
          {filteredSettingsItems.map(item => (
            <div key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                  "transition-all duration-200 ease-out",
                  "hover:bg-white/10",
                  "group relative text-white/90",
                  currentTab === item.id && "bg-white/15 text-white",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  "transition-all duration-200",
                  currentTab === item.id 
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
              </button>
            </div>
          ))}
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