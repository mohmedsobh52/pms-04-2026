import { useState } from "react";
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
  FolderOpen,
  Share2,
  FileText,
  GitCompare,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface ToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const { isArabic } = useLanguage();

  const tools: ToolItem[] = [
    {
      id: "dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "Dashboard",
      labelAr: "لوحة التحكم",
    },
    {
      id: "procurement",
      icon: <Package className="w-5 h-5" />,
      label: "Procurement",
      labelAr: "المشتريات والموارد",
    },
    {
      id: "upload",
      icon: <Receipt className="w-5 h-5" />,
      label: "Quotations",
      labelAr: "عروض الأسعار",
    },
    {
      id: "compare",
      icon: <Scale className="w-5 h-5" />,
      label: "Compare",
      labelAr: "مقارنة العروض",
    },
    {
      id: "boq-compare",
      icon: <FileStack className="w-5 h-5" />,
      label: "BOQ Compare",
      labelAr: "مقارنة BOQ",
    },
    {
      id: "p6-export",
      icon: <Calendar className="w-5 h-5" />,
      label: "P6 Export",
      labelAr: "تصدير P6",
    },
    {
      id: "settings",
      icon: <Bell className="w-5 h-5" />,
      label: "Notifications",
      labelAr: "الإشعارات",
    },
  ];

  const quickActions: ToolItem[] = [
    {
      id: "report",
      icon: <FileText className="w-5 h-5" />,
      label: "Full Report",
      labelAr: "التقرير الشامل",
      onClick: onShowReport,
      disabled: !hasAnalysisData,
    },
    {
      id: "version-compare",
      icon: <GitCompare className="w-5 h-5" />,
      label: "Version Compare",
      labelAr: "مقارنة الإصدارات",
      onClick: onShowBOQComparison,
      disabled: !hasAnalysisData,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full shadow-2xl transition-all duration-300",
          "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          "flex items-center justify-center",
          isArabic ? "left-4 bottom-20" : "right-4 bottom-20",
          isOpen && "rotate-90"
        )}
        size="icon"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Menu className="w-6 h-6 text-primary-foreground" />
        )}
      </Button>

      {/* Floating Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          isArabic ? "left-4" : "right-4",
          "bottom-36",
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden w-72">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">
                {isArabic ? "الأدوات السريعة" : "Quick Tools"}
              </h3>
            </div>
          </div>

          {/* Tools List */}
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                {isArabic ? "التنقل" : "Navigation"}
              </p>
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    onNavigate(tool.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    "hover:bg-primary/10 active:scale-[0.98]",
                    "group",
                    currentTab === tool.id && "bg-primary/15 text-primary"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    currentTab === tool.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted group-hover:bg-primary/20"
                  )}>
                    {tool.icon}
                  </div>
                  <span className="flex-1 text-sm font-medium text-right">
                    {isArabic ? tool.labelAr : tool.label}
                  </span>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isArabic && "rotate-180",
                    currentTab === tool.id && "text-primary"
                  )} />
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-border/50" />

            {/* Quick Actions */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                {isArabic ? "إجراءات سريعة" : "Quick Actions"}
              </p>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onClick?.();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    "hover:bg-accent/10 active:scale-[0.98]",
                    "group",
                    action.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    {action.icon}
                  </div>
                  <span className="flex-1 text-sm font-medium text-right">
                    {isArabic ? action.labelAr : action.label}
                  </span>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground",
                    isArabic && "rotate-180"
                  )} />
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-muted/50 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              {isArabic ? "اضغط للوصول السريع" : "Tap for quick access"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
