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
  FolderOpen,
  Share2,
  FileText,
  GitCompare,
  ChevronRight,
  Sparkles,
  GripVertical,
  Settings,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const STORAGE_KEY = "floating-toolbar-order";

const defaultToolsOrder = [
  "dashboard",
  "procurement", 
  "upload",
  "compare",
  "boq-compare",
  "p6-export",
  "settings",
];

// Sortable Tool Item Component
function SortableToolItem({ 
  tool, 
  isActive, 
  isArabic, 
  onSelect,
  isEditMode
}: { 
  tool: ToolItem; 
  isActive: boolean; 
  isArabic: boolean; 
  onSelect: () => void;
  isEditMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)",
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "opacity-90 scale-105"
      )}
    >
      <button
        onClick={onSelect}
        disabled={isEditMode}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
          "transition-all duration-300 ease-out",
          "hover:bg-primary/10 active:scale-[0.98]",
          "transform-gpu",
          isActive && "bg-primary/15 text-primary shadow-sm",
          isEditMode && "cursor-grab active:cursor-grabbing",
          isDragging && "shadow-lg bg-background ring-2 ring-primary/30"
        )}
      >
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-md",
              "hover:bg-muted cursor-grab active:cursor-grabbing",
              "transition-all duration-200",
              isDragging && "scale-110"
            )}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          "transition-all duration-300 ease-out transform-gpu",
          isActive 
            ? "bg-primary text-primary-foreground scale-105 shadow-md" 
            : "bg-muted group-hover:bg-primary/20 group-hover:scale-105"
        )}>
          {tool.icon}
        </div>
        <span className={cn(
          "flex-1 text-sm font-medium",
          isArabic ? "text-right" : "text-left",
          "transition-colors duration-200"
        )}>
          {isArabic ? tool.labelAr : tool.label}
        </span>
        {!isEditMode && (
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground",
            "transition-all duration-300 ease-out",
            "group-hover:translate-x-1",
            isArabic && "rotate-180 group-hover:-translate-x-1",
            isActive && "text-primary"
          )} />
        )}
      </button>
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
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toolsOrder, setToolsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultToolsOrder;
  });
  const { isArabic } = useLanguage();

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

  const allTools: Record<string, ToolItem> = {
    dashboard: {
      id: "dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "Dashboard",
      labelAr: "لوحة التحكم",
    },
    procurement: {
      id: "procurement",
      icon: <Package className="w-5 h-5" />,
      label: "Procurement",
      labelAr: "المشتريات والموارد",
    },
    upload: {
      id: "upload",
      icon: <Receipt className="w-5 h-5" />,
      label: "Quotations",
      labelAr: "عروض الأسعار",
    },
    compare: {
      id: "compare",
      icon: <Scale className="w-5 h-5" />,
      label: "Compare",
      labelAr: "مقارنة العروض",
    },
    "boq-compare": {
      id: "boq-compare",
      icon: <FileStack className="w-5 h-5" />,
      label: "BOQ Compare",
      labelAr: "مقارنة BOQ",
    },
    "p6-export": {
      id: "p6-export",
      icon: <Calendar className="w-5 h-5" />,
      label: "P6 Export",
      labelAr: "تصدير P6",
    },
    settings: {
      id: "settings",
      icon: <Bell className="w-5 h-5" />,
      label: "Notifications",
      labelAr: "الإشعارات",
    },
  };

  const tools = toolsOrder.map(id => allTools[id]).filter(Boolean);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setToolsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  const resetOrder = useCallback(() => {
    setToolsOrder(defaultToolsOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultToolsOrder));
  }, []);

  return (
    <>
      {/* Backdrop with smooth animation */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40",
          "transition-all duration-500 ease-out",
          isOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => {
          setIsOpen(false);
          setIsEditMode(false);
        }}
      />

      {/* Floating Button with enhanced animation */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setIsEditMode(false);
        }}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full shadow-2xl",
          "transition-all duration-500 ease-out transform-gpu",
          "bg-gradient-to-br from-primary to-primary/80",
          "hover:from-primary/90 hover:to-primary/70",
          "hover:scale-110 hover:shadow-primary/30 hover:shadow-xl",
          "active:scale-95",
          "flex items-center justify-center",
          isArabic ? "left-4 bottom-20" : "right-4 bottom-20",
          isOpen && "rotate-180 scale-105"
        )}
        size="icon"
      >
        <div className={cn(
          "transition-all duration-500 ease-out transform-gpu",
          isOpen ? "rotate-180" : "rotate-0"
        )}>
          {isOpen ? (
            <X className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Menu className="w-6 h-6 text-primary-foreground" />
          )}
        </div>
      </Button>

      {/* Floating Panel with stagger animations */}
      <div
        className={cn(
          "fixed z-50",
          "transition-all duration-500 ease-out transform-gpu",
          isArabic ? "left-4" : "right-4",
          "bottom-36",
          isOpen 
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
            : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        )}
      >
        <div className={cn(
          "bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden w-72",
          "transition-all duration-500 ease-out",
          isOpen && "animate-in fade-in-0 slide-in-from-bottom-4"
        )}>
          {/* Header with edit mode toggle */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={cn(
                  "w-5 h-5 text-primary",
                  "transition-transform duration-500",
                  isOpen && "animate-pulse"
                )} />
                <h3 className="font-semibold text-sm">
                  {isArabic ? "الأدوات السريعة" : "Quick Tools"}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={resetOrder}
                    title={isArabic ? "إعادة الترتيب الافتراضي" : "Reset order"}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 transition-all duration-300",
                    isEditMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setIsEditMode(!isEditMode)}
                  title={isArabic ? "تخصيص الترتيب" : "Customize order"}
                >
                  <Settings className={cn(
                    "w-3.5 h-3.5 transition-transform duration-500",
                    isEditMode && "rotate-90"
                  )} />
                </Button>
              </div>
            </div>
            {isEditMode && (
              <p className={cn(
                "text-xs text-primary mt-1",
                "animate-in fade-in-0 slide-in-from-top-2 duration-300"
              )}>
                {isArabic ? "اسحب لإعادة الترتيب" : "Drag to reorder"}
              </p>
            )}
          </div>

          {/* Tools List with DnD */}
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                {isArabic ? "التنقل" : "Navigation"}
              </p>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={toolsOrder}
                  strategy={verticalListSortingStrategy}
                >
                  {tools.map((tool, index) => (
                    <div
                      key={tool.id}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                      className={cn(
                        isOpen && "animate-in fade-in-0 slide-in-from-bottom-2"
                      )}
                    >
                      <SortableToolItem
                        tool={tool}
                        isActive={currentTab === tool.id}
                        isArabic={isArabic}
                        isEditMode={isEditMode}
                        onSelect={() => {
                          onNavigate(tool.id);
                          setIsOpen(false);
                        }}
                      />
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-border/50" />

            {/* Quick Actions */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
                {isArabic ? "إجراءات سريعة" : "Quick Actions"}
              </p>
              {quickActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.onClick?.();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  style={{
                    animationDelay: `${(tools.length + index) * 50}ms`,
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "transition-all duration-300 ease-out transform-gpu",
                    "hover:bg-accent/10 active:scale-[0.98]",
                    "group",
                    action.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                    isOpen && "animate-in fade-in-0 slide-in-from-bottom-2"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center",
                    "transition-all duration-300 ease-out transform-gpu",
                    "group-hover:bg-accent/20 group-hover:scale-105"
                  )}>
                    {action.icon}
                  </div>
                  <span className={cn(
                    "flex-1 text-sm font-medium",
                    isArabic ? "text-right" : "text-left"
                  )}>
                    {isArabic ? action.labelAr : action.label}
                  </span>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground",
                    "transition-all duration-300 ease-out",
                    "group-hover:translate-x-1",
                    isArabic && "rotate-180 group-hover:-translate-x-1"
                  )} />
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={cn(
            "px-4 py-2 bg-muted/50 border-t border-border/50",
            "transition-all duration-300"
          )}>
            <p className="text-xs text-muted-foreground text-center">
              {isEditMode 
                ? (isArabic ? "اضغط ⚙️ للحفظ" : "Tap ⚙️ to save") 
                : (isArabic ? "اضغط للوصول السريع" : "Tap for quick access")
              }
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
