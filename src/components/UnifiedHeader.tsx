import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { UserMenu } from "@/components/UserMenu";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LogIn, 
  Settings2, 
  ChevronDown,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Database,
  Zap,
  Loader2,
  FileBarChart,
  Search,
  Sun,
  Moon,
  Languages,
  History,
  Clock,
  ChevronRight,
  Trash2,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";
import { useNavigationHistory, iconMap } from "@/hooks/useNavigationHistory";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface QuickNavItem {
  label: string;
  labelAr: string;
  href: string;
}

interface QuickNavGroup {
  label: string;
  labelAr: string;
  items: QuickNavItem[];
}

const quickNavGroups: QuickNavGroup[] = [
  {
    label: "Projects",
    labelAr: "المشاريع",
    items: [
      { label: "Saved Projects", labelAr: "المشاريع المحفوظة", href: "/projects" },
      { label: "New Project", labelAr: "مشروع جديد", href: "/" },
      { label: "Templates", labelAr: "القوالب", href: "/templates" },
    ],
  },
  {
    label: "Analysis",
    labelAr: "التحليل",
    items: [
      { label: "Cost Analysis", labelAr: "تحليل التكاليف", href: "/cost-analysis" },
      { label: "BOQ Items", labelAr: "جدول الكميات", href: "/items" },
      { label: "Quotations", labelAr: "عروض الأسعار", href: "/quotations" },
      { label: "Historical Pricing", labelAr: "الأسعار التاريخية", href: "/historical-pricing" },
    ],
  },
  {
    label: "Library",
    labelAr: "المكتبة",
    items: [
      { label: "Materials", labelAr: "المواد", href: "/library" },
      { label: "Material Prices", labelAr: "أسعار المواد", href: "/material-prices" },
      { label: "Procurement", labelAr: "المشتريات", href: "/procurement" },
    ],
  },
];

interface UnifiedHeaderProps {
  showQuickNav?: boolean;
}

export function UnifiedHeader({ showQuickNav = true }: UnifiedHeaderProps) {
  const { user, loading: authLoading } = useAuth();
  const { isArabic, language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsOpen: setSearchOpen } = useGlobalSearch();
  const { getHistoryExcludingCurrent, clearHistory } = useNavigationHistory();
  const [historyOpen, setHistoryOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const navHistory = getHistoryExcludingCurrent();
  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-gradient-to-r from-background/90 via-background/85 to-background/90 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between gap-2">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-2">
          <MobileNavDrawer />
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm md:text-lg">B</span>
            </div>
            <span className="hidden sm:inline font-display text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BOQ Analyzer
            </span>
          </Link>
        </div>

        {/* Center: Quick Navigation (Desktop only) */}
        {showQuickNav && (
          <nav className="hidden md:flex items-center gap-0.5">
            <Link to="/dashboard">
              <Button 
                variant={isActive("/dashboard") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-1.5 h-9 px-2.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden xl:inline">{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
              </Button>
            </Link>

            {quickNavGroups.map((group) => (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 h-9 px-2.5">
                    {group.label === "Projects" && <Briefcase className="w-4 h-4" />}
                    {group.label === "Analysis" && <BarChart3 className="w-4 h-4" />}
                    {group.label === "Library" && <Database className="w-4 h-4" />}
                    <span className="hidden lg:inline">{isArabic ? group.labelAr : group.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={cn("cursor-pointer", isActive(item.href) && "bg-muted font-medium")}
                    >
                      {isArabic ? item.labelAr : item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

            <Link to="/fast-extraction">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 h-9 px-2.5 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden xl:inline">{isArabic ? "استخراج سريع" : "Fast Extract"}</span>
              </Button>
            </Link>

            <Link to="/projects?tab=reports">
              <Button 
                variant={location.pathname === "/projects" && location.search.includes("reports") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-1 h-9 px-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                <FileBarChart className="w-4 h-4" />
                <span className="hidden xl:inline">{isArabic ? "التقارير" : "Reports"}</span>
              </Button>
            </Link>
          </nav>
        )}

        {/* Right: Search + Settings Dropdown + User */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="gap-1.5 h-9 px-2 relative z-[55] pointer-events-auto"
            title={isArabic ? "بحث (⌘K)" : "Search (⌘K)"}
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline text-xs text-muted-foreground">⌘K</span>
          </Button>
          
          {/* Consolidated Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Settings2 className="h-4 w-4" />
                {navHistory.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-medium text-primary-foreground flex items-center justify-center">
                    {navHistory.length > 9 ? "9+" : navHistory.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" 
                  ? (isArabic ? "الوضع الفاتح" : "Light Mode")
                  : (isArabic ? "الوضع الداكن" : "Dark Mode")
                }
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} 
                className="cursor-pointer gap-2"
              >
                <Languages className="h-4 w-4" />
                {language === 'ar' ? '🇺🇸 English' : '🇸🇦 العربية'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setHistoryOpen(true)} className="cursor-pointer gap-2">
                <History className="h-4 w-4" />
                {isArabic ? "سجل التنقل" : "Navigation History"}
                {navHistory.length > 0 && (
                  <span className="ms-auto text-xs text-muted-foreground">{navHistory.length}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer gap-2">
                <Settings2 className="h-4 w-4" />
                {isArabic ? "الإعدادات" : "Settings"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {authLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : user ? (
            <UserMenu />
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gap-2 h-9">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? "تسجيل الدخول" : "Login"}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Navigation History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side={isArabic ? "right" : "left"} className="w-80 sm:w-96">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {isArabic ? "الصفحات الأخيرة" : "Recent Pages"}
            </SheetTitle>
          </SheetHeader>
          {navHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">
                {isArabic ? "لا توجد صفحات في السجل بعد" : "No pages in history yet"}
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[calc(100vh-180px)] mt-4">
                <div className="space-y-1 pr-3">
                  {navHistory.map((entry, index) => {
                    const IconComp = iconMap[entry.icon] || FileText;
                    return (
                      <button
                        key={`${entry.path}-${index}`}
                        onClick={() => { navigate(entry.path); setHistoryOpen(false); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/80 text-start transition-all group border border-transparent hover:border-border"
                      >
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <IconComp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{isArabic ? entry.labelAr : entry.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: isArabic ? ar : enUS })}
                          </p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all", isArabic && "rotate-180")} />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="absolute bottom-4 left-4 right-4">
                <Button variant="ghost" size="sm" onClick={clearHistory} className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isArabic ? "مسح السجل" : "Clear History"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
