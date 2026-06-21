import { Link } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useLanguage } from "@/hooks/useLanguage";

export function AppTopbar() {
  const { isArabic } = useLanguage();
  return (
    <header className="h-14 sticky top-0 z-40 flex items-center gap-2 px-3 md:px-4 border-b border-border bg-card/80 backdrop-blur-md">
      <SidebarTrigger />
      <Link to="/" className="hidden sm:inline-flex">
        <Button variant="ghost" size="sm" className="gap-1.5 h-9">
          <Home className="h-4 w-4" />
          <span className="hidden md:inline">{isArabic ? "الرئيسية" : "Home"}</span>
        </Button>
      </Link>
      <div className="flex-1" />
      <Button
        variant="ghost" size="icon" className="h-9 w-9" aria-label="Search"
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      >
        <Search className="h-4 w-4" />
      </Button>
      <LanguageToggle />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
