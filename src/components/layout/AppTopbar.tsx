import { Link, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home, Search, Plus, FolderOpen, FileSignature, Briefcase, Award, ChevronDown, Lightbulb,
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { NotificationsPopover } from "@/components/layout/NotificationsPopover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/useLanguage";
import { useProjectContext } from "@/hooks/useProjectContext";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";

export function AppTopbar() {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const { inProjectMode, currentProject, projectId } = useProjectContext();
  const { unreadCount, criticalCount } = useGlobalSuggestions();

  const scoped = (path: string) =>
    projectId ? `${path}${path.includes("?") ? "&" : "?"}projectId=${projectId}` : path;

  return (
    <header className="h-14 sticky top-0 z-40 flex items-center gap-1.5 px-3 md:px-4 border-b border-border bg-card/80 backdrop-blur-md">
      <SidebarTrigger aria-label={isArabic ? "تبديل الشريط الجانبي" : "Toggle sidebar"} />

      <Link to="/" className="hidden sm:inline-flex">
        <Button variant="ghost" size="sm" className="gap-1.5 h-9">
          <Home className="h-4 w-4" />
          <span className="hidden md:inline">{isArabic ? "الرئيسية" : "Home"}</span>
        </Button>
      </Link>

      {/* Context indicator */}
      {inProjectMode && currentProject && (
        <>
          <span className="text-muted-foreground/40 hidden md:inline">/</span>
          <Link
            to={`/projects/${currentProject.id}`}
            className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/50 text-xs font-medium max-w-[200px]"
          >
            <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{currentProject.name}</span>
            {currentProject.status && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                {currentProject.status}
              </Badge>
            )}
          </Link>
        </>
      )}

      <div className="flex-1" />

      {/* Global search */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 hidden md:inline-flex text-muted-foreground bg-background/50 border-border/60 hover:bg-accent w-56 justify-start"
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        aria-label={isArabic ? "بحث شامل" : "Global search"}
      >
        <Search className="h-4 w-4" />
        <span className="text-xs flex-1 text-start">
          {isArabic ? "ابحث في كل شيء..." : "Search anything..."}
        </span>
        <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/60">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 md:hidden"
        aria-label={isArabic ? "بحث" : "Search"}
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Quick actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1 hidden sm:inline-flex"
            aria-label={isArabic ? "إجراءات سريعة" : "Quick actions"}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline text-xs">{isArabic ? "إجراء" : "New"}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">
            {isArabic ? "إجراءات سريعة" : "Quick actions"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/projects/new")} className="gap-2 text-xs">
            <FolderOpen className="h-4 w-4" />
            {isArabic ? "مشروع جديد" : "New project"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!inProjectMode}
            onClick={() => navigate(scoped("/progress-certificates/new"))}
            className="gap-2 text-xs"
          >
            <Award className="h-4 w-4" />
            {isArabic ? "مستخلص جديد" : "New certificate"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!inProjectMode}
            onClick={() => navigate(scoped("/procurement"))}
            className="gap-2 text-xs"
          >
            <Briefcase className="h-4 w-4" />
            {isArabic ? "طلب مشتريات" : "Procurement request"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!inProjectMode}
            onClick={() => navigate(scoped("/contracts"))}
            className="gap-2 text-xs"
          >
            <FileSignature className="h-4 w-4" />
            {isArabic ? "عقد جديد" : "New contract"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationsPopover />
      <LanguageToggle />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
