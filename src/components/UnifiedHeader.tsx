import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { NavigationHistorySidebar } from "@/components/NavigationHistorySidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";

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
  const { isArabic } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsOpen: setSearchOpen } = useGlobalSearch();

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
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
          <nav className="hidden md:flex items-center gap-1">
            {/* Dashboard Link */}
            <Link to="/dashboard">
              <Button 
                variant={isActive("/dashboard") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-1.5 h-9 px-3"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
              </Button>
            </Link>

            {/* Dropdown Menus */}
            {quickNavGroups.map((group) => (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-3">
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
                      className={cn(
                        "cursor-pointer",
                        isActive(item.href) && "bg-muted font-medium"
                      )}
                    >
                      {isArabic ? item.labelAr : item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

            {/* Fast Extraction - Highlighted */}
            <Link to="/fast-extraction">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 h-9 px-3 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden lg:inline">{isArabic ? "استخراج سريع" : "Fast Extract"}</span>
              </Button>
            </Link>

            {/* Reports - Highlighted */}
            <Link to="/projects?tab=reports">
              <Button 
                variant={location.pathname === "/projects" && location.search.includes("reports") ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-1.5 h-9 px-3 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                <FileBarChart className="w-4 h-4" />
                <span className="hidden lg:inline">{isArabic ? "التقارير" : "Reports"}</span>
              </Button>
            </Link>
          </nav>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Global Search Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="gap-1.5 h-9 px-2 sm:px-3 relative z-[55] pointer-events-auto"
            title={isArabic ? "بحث (⌘K)" : "Search (⌘K)"}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-xs text-muted-foreground">⌘K</span>
          </Button>
          
          <NavigationHistorySidebar />
          <ThemeToggle />
          <LanguageToggle />
          
          <Link to="/projects?tab=reports" className="hidden sm:block">
            <Button 
              variant={location.search.includes("reports") ? "secondary" : "ghost"} 
              size="icon" 
              className="h-9 w-9"
              title={isArabic ? "التقارير" : "Reports"}
            >
              <FileBarChart className="h-4 w-4" />
            </Button>
          </Link>
          
          <Link to="/settings" className="hidden sm:block">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings2 className="h-4 w-4" />
            </Button>
          </Link>
          
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
    </header>
  );
}
