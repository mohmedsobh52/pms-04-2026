import { useEffect, useState, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid,
  Cpu,
  Lightbulb,
  Sparkles,
  AlertTriangle,
  Table as TableIcon,
  Link2,
  History,
  Users,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/**
 * Corporate Ocean Grid shell for the Cost Analysis screen.
 * - Permanent RTL sidebar with anchor navigation to on-page sections.
 * - Sticky top KPI bar (compact) + primary actions.
 * - Slots for the KPI cluster and main content.
 */
export interface CostAnalysisShellProps {
  title?: string;
  subtitle?: string;
  currency?: string;
  kpiSlot?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}

interface NavSection {
  id: string;
  label: string;
  icon: typeof LayoutGrid;
}

const SECTIONS: NavSection[] = [
  { id: "section-overview", label: "نظرة عامة", icon: LayoutGrid },
  { id: "section-engine", label: "محرك التحليل الذكي", icon: Cpu },
  { id: "section-suggestions", label: "الاقتراحات (AI)", icon: Sparkles },
  { id: "section-market", label: "المقارنة مع السوق", icon: LineChart },
  { id: "section-sensitivity", label: "تحليل الحساسية", icon: Lightbulb },
  { id: "section-anomalies", label: "كاشف الشذوذ", icon: AlertTriangle },
  { id: "section-table", label: "جدول البنود", icon: TableIcon },
  { id: "section-integrations", label: "الربط والتقارير", icon: Link2 },
  { id: "section-versions", label: "الإصدارات", icon: History },
  { id: "section-collab", label: "التعاون والاعتماد", icon: Users },
];

export function CostAnalysisShell({
  title = "تحليل تكاليف البنود",
  subtitle,
  kpiSlot,
  headerActions,
  children,
}: CostAnalysisShellProps) {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Scroll-spy: highlight the section closest to the top.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 96; // account for sticky header
    window.scrollTo({ top: y, behavior: "smooth" });
    setActive(id);
  };

  return (
    <div dir="rtl" className="min-h-screen w-full bg-muted/30 text-foreground flex overflow-hidden">
      {/* Sidebar (right in RTL — visually on the right, first in DOM) */}
      <aside
        className={cn(
          "shrink-0 bg-primary text-primary-foreground flex flex-col border-l border-primary/40 sticky top-0 h-screen z-30 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-primary-foreground/10">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-accent/30 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">
                  Core Analytics
                </div>
                <div className="text-sm font-bold truncate">تكاليف البنود</div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground h-8 w-8"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "توسيع" : "طي"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-right",
                  isActive
                    ? "bg-primary-foreground/15 text-primary-foreground font-semibold"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
                title={s.label}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-accent")} />
                {!collapsed && <span className="truncate">{s.label}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-primary-foreground/10">
            <Link to="/" className="block">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <ArrowRight className="w-4 h-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border">
          <div className="px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <ThemeToggle />
            </div>
          </div>
          {kpiSlot && <div className="px-6 pb-3">{kpiSlot}</div>}
        </header>

        {/* Content */}
        <main className="flex-1 px-4 md:px-6 py-6 space-y-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Section wrapper: gives each anchor target a scroll-margin and consistent title row. */
export function CostSection({
  id,
  title,
  icon: Icon,
  actions,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  icon?: typeof LayoutGrid;
  actions?: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-32 rounded-2xl bg-card border border-border shadow-sm", className)}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/70">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-6 bg-accent rounded-full shrink-0" />
          {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />}
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{title}</h2>
            {description && (
              <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
