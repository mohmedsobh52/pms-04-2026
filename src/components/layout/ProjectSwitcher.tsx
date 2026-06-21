import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, FolderOpen, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useProjectContext, type LiteProject } from "@/hooks/useProjectContext";

interface ProjectSwitcherProps {
  compact?: boolean;
}

export function ProjectSwitcher({ compact }: ProjectSwitcherProps) {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const { currentProject, projects, projectId } = useProjectContext();

  const goTo = (p: LiteProject) => navigate(`/projects/${p.id}`);

  const label = currentProject?.name
    ?? (isArabic ? "اختر مشروعًا" : "Select a project");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          className="w-full justify-between h-auto py-2 px-2 gap-2 bg-sidebar-accent/40 hover:bg-sidebar-accent border border-sidebar-border"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 text-start">
              <div className="text-xs font-semibold truncate">{label}</div>
              {currentProject?.status && (
                <div className="text-[10px] text-muted-foreground truncate">
                  {currentProject.status}
                </div>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-auto">
        <DropdownMenuLabel className="text-xs">
          {isArabic ? "التبديل بين المشاريع" : "Switch project"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            {isArabic ? "لا توجد مشاريع" : "No projects"}
          </div>
        )}
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => goTo(p)} className="gap-2">
            <Check className={`h-3.5 w-3.5 ${p.id === projectId ? "opacity-100" : "opacity-0"}`} />
            <span className="flex-1 truncate text-xs">{p.name}</span>
            {p.status && (
              <Badge variant="outline" className="text-[9px] h-4 px-1">
                {p.status}
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/projects/new")} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">{isArabic ? "مشروع جديد" : "New project"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/projects")} className="gap-2">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="text-xs">{isArabic ? "كل المشاريع" : "All projects"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
