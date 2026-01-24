import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, FolderOpen, User, LogOut, ChevronDown, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { isArabic } = useLanguage();

  if (!user) return null;

  const userInitial = user.email?.charAt(0).toUpperCase() || "U";
  const userName = user.email?.split("@")[0] || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 h-9 px-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm max-w-24 truncate">
            {userName}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/projects" className="flex items-center gap-2 cursor-pointer">
            <FolderOpen className="h-4 w-4" />
            {isArabic ? "المشاريع المحفوظة" : "Saved Projects"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/reports" className="flex items-center gap-2 cursor-pointer">
            <BarChart3 className="h-4 w-4" />
            {isArabic ? "التقارير" : "Reports"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            {isArabic ? "الإعدادات" : "Settings"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            {isArabic ? "الملف الشخصي" : "Profile"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={signOut} 
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isArabic ? "تسجيل الخروج" : "Sign Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
