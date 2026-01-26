import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Home, ChevronRight, Edit, Play, MoreVertical,
  Package, Percent, DollarSign, Building2, FolderOpen,
  FileText, Download, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { ProjectData, PricingStats, statusConfig } from "./types";

interface ProjectHeaderProps {
  project: ProjectData;
  pricingStats: PricingStats;
  isArabic: boolean;
  onStartPricing: () => void;
  onEditProject: () => void;
  formatCurrency: (value: number) => string;
}

export function ProjectHeader({
  project,
  pricingStats,
  isArabic,
  onStartPricing,
  onEditProject,
  formatCurrency,
}: ProjectHeaderProps) {
  const navigate = useNavigate();
  const projectStatus = "draft";
  const statusInfo = statusConfig[projectStatus as keyof typeof statusConfig];

  return (
    <>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (window.history.length > 2) {
                    navigate(-1);
                  } else {
                    navigate('/projects');
                  }
                }}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isArabic ? "رجوع" : "Back"}
                </span>
              </Button>
              
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {isArabic ? "الرئيسية" : "Home"}
                  </span>
                </Link>
              </Button>
              
              <nav className="hidden md:flex items-center gap-2 text-sm ms-2">
                <Link to="/projects" className="text-muted-foreground hover:text-foreground">
                  {isArabic ? "المشاريع" : "Projects"}
                </Link>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium truncate max-w-[200px]">
                  {project.name}
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Project Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="outline" className={statusInfo.color}>
                {isArabic ? statusInfo.label.ar : statusInfo.label.en}
              </Badge>
            </div>
            {project.file_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <FileText className="w-4 h-4" />
                {project.file_name}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={onStartPricing} className="gap-2">
            <Play className="w-4 h-4" />
            {isArabic ? "بدء التسعير" : "Start Pricing"}
          </Button>
          <Button variant="outline" onClick={onEditProject} className="gap-2">
            <Edit className="w-4 h-4" />
            {isArabic ? "تعديل المشروع" : "Edit Project"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isArabic ? "start" : "end"}>
              <DropdownMenuItem className="gap-2">
                <Download className="w-4 h-4" />
                {isArabic ? "تصدير" : "Export"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                {isArabic ? "حذف المشروع" : "Delete Project"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className={`text-${isArabic ? 'left' : 'right'}`}>
                <p className="text-2xl font-bold">{pricingStats.totalItems}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "إجمالي البنود" : "Total Items"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Percent className="w-5 h-5 text-amber-600" />
              </div>
              <div className={`text-${isArabic ? 'left' : 'right'}`}>
                <p className="text-2xl font-bold">{pricingStats.pricingPercentage}%</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "نسبة التسعير" : "Pricing %"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className={`text-${isArabic ? 'left' : 'right'}`}>
                <p className="text-2xl font-bold">{formatCurrency(pricingStats.totalValue)}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "إجمالي القيمة" : "Total Value"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className={`text-${isArabic ? 'left' : 'right'}`}>
                <p className="text-2xl font-bold">{project.currency || 'SAR'}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? "العملة" : "Currency"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
