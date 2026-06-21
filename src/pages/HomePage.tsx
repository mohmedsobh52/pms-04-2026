import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  FolderOpen,
  Layers,
  DollarSign,
  Briefcase,
  Package,
  Users,
  AlertTriangle,
  FileText,
  FileSearch,
  Award,
  BookOpen,
  BarChart3,
  Clock,
  Ruler,
  ListChecks,
  Shield,
  Settings,
  Gauge,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type CountsMap = Record<string, number>;
type RecentItem = { id: string; name: string; updated_at: string };

const tableKeys = [
  "saved_projects",
  "contracts",
  "project_items",
  "material_prices",
  "procurement_items",
  "progress_certificates",
  "cost_analysis",
  "risks",
] as const;

type Section = {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  path: string;
  icon: typeof FolderOpen;
  token: string;
  countKey: string | null;
};

const groups: { titleAr: string; titleEn: string; items: Section[] }[] = [
  {
    titleAr: "نظرة عامة",
    titleEn: "Overview",
    items: [
      { nameAr: "لوحة المعلومات", nameEn: "Dashboard", descAr: "نظرة عامة على الأداء", descEn: "Performance overview", path: "/dashboard", icon: BarChart3, token: "status-active", countKey: null },
      { nameAr: "مراقبة التكاليف", nameEn: "Cost Control", descAr: "EVM وتحليل الأداء", descEn: "EVM & performance analysis", path: "/cost-control-report", icon: Shield, token: "priority-high", countKey: null },
      { nameAr: "EVM المتقدمة", nameEn: "EVM Advanced", descAr: "شاشة EVM شاملة", descEn: "Advanced EVM", path: "/cost-control-evm", icon: Gauge, token: "cat-equipment", countKey: null },
      { nameAr: "التقارير", nameEn: "Reports", descAr: "التقارير والتحليلات", descEn: "Reports & analytics", path: "/projects?tab=reports", icon: FileText, token: "status-completed", countKey: null },
    ],
  },
  {
    titleAr: "إدارة المشاريع",
    titleEn: "Project Management",
    items: [
      { nameAr: "المشاريع", nameEn: "Projects", descAr: "إدارة المشاريع", descEn: "Manage projects", path: "/projects", icon: FolderOpen, token: "status-active", countKey: "saved_projects" },
      { nameAr: "جدول الكميات", nameEn: "BOQ Items", descAr: "بنود الأعمال", descEn: "Work items", path: "/items", icon: Layers, token: "cat-material", countKey: "project_items" },
      { nameAr: "المستخلصات", nameEn: "Certificates", descAr: "الشهادات والمستخلصات", descEn: "Progress certificates", path: "/progress-certificates", icon: Award, token: "status-pending", countKey: "progress_certificates" },
      { nameAr: "تحليل المخططات", nameEn: "Drawings", descAr: "استخراج الكميات", descEn: "Extract quantities", path: "/projects?tab=attachments&mode=extraction", icon: Ruler, token: "priority-medium", countKey: null },
      { nameAr: "خطة التنفيذ", nameEn: "Execution Plan", descAr: "تخطيط بالذكاء الاصطناعي", descEn: "AI execution planning", path: "/p6-export", icon: ListChecks, token: "status-completed", countKey: null },
    ],
  },
  {
    titleAr: "التكاليف والتسعير",
    titleEn: "Costs & Pricing",
    items: [
      { nameAr: "تحليل التكلفة", nameEn: "Cost Analysis", descAr: "تحليل التكاليف", descEn: "Cost analysis", path: "/cost-analysis", icon: DollarSign, token: "priority-medium", countKey: "cost_analysis" },
      { nameAr: "عروض الأسعار", nameEn: "Quotations", descAr: "مقارنة العروض", descEn: "Compare quotes", path: "/quotations", icon: FileSearch, token: "cat-subcontractor", countKey: null },
      { nameAr: "المكتبة", nameEn: "Library", descAr: "مكتبة الأسعار", descEn: "Price library", path: "/library", icon: BookOpen, token: "cat-material", countKey: "material_prices" },
      { nameAr: "البيانات التاريخية", nameEn: "Historical", descAr: "أسعار تاريخية", descEn: "Historical pricing", path: "/historical-pricing", icon: Clock, token: "cat-equipment", countKey: null },
    ],
  },
  {
    titleAr: "المشتريات والعقود",
    titleEn: "Procurement & Contracts",
    items: [
      { nameAr: "المشتريات", nameEn: "Procurement", descAr: "إدارة المشتريات", descEn: "Procurement management", path: "/procurement", icon: Briefcase, token: "cat-subcontractor", countKey: "procurement_items" },
      { nameAr: "العقود", nameEn: "Contracts", descAr: "إدارة العقود", descEn: "Contract management", path: "/contracts", icon: FileText, token: "status-active", countKey: "contracts" },
      { nameAr: "المقاولون", nameEn: "Subcontractors", descAr: "مقاولو الباطن", descEn: "Subcontractors", path: "/subcontractors", icon: Users, token: "cat-subcontractor", countKey: null },
      { nameAr: "المخاطر", nameEn: "Risks", descAr: "إدارة المخاطر", descEn: "Risk management", path: "/risk", icon: AlertTriangle, token: "priority-high", countKey: "risks" },
    ],
  },
  {
    titleAr: "الأدوات والإدارة",
    titleEn: "Tools & Admin",
    items: [
      { nameAr: "الموارد", nameEn: "Resources", descAr: "إدارة الموارد", descEn: "Resource management", path: "/resources", icon: Package, token: "cat-equipment", countKey: null },
      { nameAr: "أسعار المواد", nameEn: "Material Prices", descAr: "أسعار المواد", descEn: "Material prices", path: "/material-prices", icon: Package, token: "cat-material", countKey: "material_prices" },
      { nameAr: "الإعدادات", nameEn: "Settings", descAr: "إعدادات النظام", descEn: "System settings", path: "/settings", icon: Settings, token: "status-pending", countKey: null },
      { nameAr: "إعدادات الشركة", nameEn: "Company", descAr: "إعدادات الشركة", descEn: "Company settings", path: "/company-settings", icon: Settings, token: "status-pending", countKey: null },
    ],
  },
];

export default function HomePage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [counts, setCounts] = useState<CountsMap>({});
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results: CountsMap = {};
      await Promise.all(
        tableKeys.map(async (table) => {
          try {
            const { count } = await (supabase as any)
              .from(table)
              .select("*", { count: "exact", head: true });
            results[table] = count ?? 0;
          } catch {
            results[table] = 0;
          }
        })
      );
      if (!cancelled) {
        setCounts(results);
        setLoadingCounts(false);
      }
    })();
    (async () => {
      try {
        const { data } = await supabase
          .from("saved_projects")
          .select("id,name,updated_at")
          .order("updated_at", { ascending: false })
          .limit(6);
        if (!cancelled) setRecent((data as RecentItem[]) ?? []);
      } catch {
        if (!cancelled) setRecent([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const userName = user?.email?.split("@")[0] ?? "";
  const greetingAr = userName ? `مرحبًا، ${userName}` : "مرحبًا بك";
  const greetingEn = userName ? `Welcome, ${userName}` : "Welcome";

  return (
    <AppShell hideBreadcrumbs fullBleed className="bg-background">
      <div
        className="min-h-[calc(100vh-3.5rem)]"
        dir={isArabic ? "rtl" : "ltr"}
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(ellipse at bottom right, hsl(var(--accent) / 0.06), transparent 55%)",
        }}
      >
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {isArabic ? greetingAr : greetingEn}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic
                  ? "نظرة سريعة على مشاريعك ونشاطاتك"
                  : "Quick overview of your projects and activity"}
              </p>
            </div>
            <QuickActionsBar />
          </header>

          {/* KPI Row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <DashboardKpiCard
              label={isArabic ? "المشاريع النشطة" : "Active Projects"}
              value={counts.saved_projects ?? 0}
              icon={FolderOpen}
              token="status-active"
              to="/projects"
              loading={loadingCounts}
              hint={isArabic ? "إجمالي المشاريع المحفوظة" : "Total saved projects"}
            />
            <DashboardKpiCard
              label={isArabic ? "العقود" : "Contracts"}
              value={counts.contracts ?? 0}
              icon={FileText}
              token="cat-subcontractor"
              to="/contracts"
              loading={loadingCounts}
              hint={isArabic ? "العقود المسجلة" : "Registered contracts"}
            />
            <DashboardKpiCard
              label={isArabic ? "بنود BOQ" : "BOQ Items"}
              value={counts.project_items ?? 0}
              icon={Layers}
              token="cat-material"
              to="/items"
              loading={loadingCounts}
              hint={isArabic ? "جميع بنود الأعمال" : "All work items"}
            />
            <DashboardKpiCard
              label={isArabic ? "المخاطر المفتوحة" : "Open Risks"}
              value={counts.risks ?? 0}
              icon={AlertTriangle}
              token="priority-high"
              to="/risk"
              loading={loadingCounts}
              hint={isArabic ? "تحتاج إلى مراجعة" : "Need review"}
            />
          </section>

          {/* Module groups + Recent activity sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              {groups.map((group) => (
                <div key={group.titleEn}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs md:text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                      {isArabic ? group.titleAr : group.titleEn}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.items.map((section) => {
                      const Icon = section.icon;
                      const count = section.countKey ? counts[section.countKey] : undefined;
                      return (
                        <Link
                          key={section.path}
                          to={section.path}
                          className="group relative flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card/70 backdrop-blur-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `hsl(var(--${section.token}) / 0.12)`,
                              color: `hsl(var(--${section.token}))`,
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {isArabic ? section.nameAr : section.nameEn}
                              </p>
                              {count !== undefined && count > 0 && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: `hsl(var(--${section.token}) / 0.18)`,
                                    color: `hsl(var(--${section.token}))`,
                                  }}
                                >
                                  {count}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {isArabic ? section.descAr : section.descEn}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* Recent activity */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {isArabic ? "آخر النشاط" : "Recent Activity"}
                  </h3>
                  <Link
                    to="/projects"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {isArabic ? "الكل" : "View all"}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-1">
                  {recent.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {isArabic ? "لا يوجد نشاط حديث" : "No recent activity"}
                    </p>
                  )}
                  {recent.map((r) => (
                    <Link
                      key={r.id}
                      to={`/projects/${r.id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FolderOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm text-foreground truncate">{r.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(r.updated_at), {
                          addSuffix: true,
                          locale: isArabic ? ar : enUS,
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/5 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {isArabic ? "بحث سريع" : "Quick Search"}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {isArabic
                    ? "اضغط ⌘K للوصول لأي صفحة أو مشروع"
                    : "Press ⌘K to jump to any page or project"}
                </p>
                <button
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("open-command-palette"))
                  }
                  className="w-full text-start text-xs px-3 py-2 rounded-lg border border-border bg-background/60 hover:bg-background transition-colors text-muted-foreground"
                >
                  {isArabic ? "اكتب للبحث…" : "Type to search…"}
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
