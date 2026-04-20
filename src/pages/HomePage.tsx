import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { UnifiedHeader } from "@/components/UnifiedHeader";
// BackgroundImage replaced with semantic theme background
import { PMSLogo } from "@/components/PMSLogo";
import { supabase } from "@/integrations/supabase/client";
import developerPhoto from "@/assets/developer/mohamed-sobh.jpg";
import alimtyazLogo from "@/assets/company/alimtyaz-logo.jpg";
import { useEffect, useState } from "react";
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
  Phone,
  Mail,
  BarChart3,
  Clock,
  Ruler,
  ListChecks,
  Shield,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

type Section = {
  nameAr: string; nameEn: string; descAr: string; descEn: string;
  path: string; icon: typeof FolderOpen; token: string;
  countKey: string | null;
};

const groups: { titleAr: string; titleEn: string; items: Section[] }[] = [
  {
    titleAr: "نظرة عامة", titleEn: "Overview",
    items: [
      { nameAr: "لوحة المعلومات", nameEn: "Dashboard", descAr: "نظرة عامة على الأداء", descEn: "Performance overview", path: "/dashboard", icon: BarChart3, token: "status-active", countKey: null },
      { nameAr: "التقارير", nameEn: "Reports", descAr: "التقارير والتحليلات", descEn: "Reports & analytics", path: "/projects?tab=reports", icon: FileText, token: "status-completed", countKey: null },
    ],
  },
  {
    titleAr: "إدارة المشاريع", titleEn: "Project Management",
    items: [
      { nameAr: "المشاريع", nameEn: "Projects", descAr: "إدارة ومتابعة المشاريع", descEn: "Manage & track projects", path: "/projects", icon: FolderOpen, token: "status-active", countKey: "saved_projects" },
      { nameAr: "جدول الكميات", nameEn: "BOQ Items", descAr: "بنود الأعمال والكميات", descEn: "Work items & quantities", path: "/items", icon: Layers, token: "cat-material", countKey: "project_items" },
      { nameAr: "المستخلصات", nameEn: "Certificates", descAr: "الشهادات والمستخلصات", descEn: "Progress certificates", path: "/progress-certificates", icon: Award, token: "status-pending", countKey: "progress_certificates" },
      { nameAr: "تحليل المخططات", nameEn: "Drawing Analysis", descAr: "استخراج الكميات من المخططات", descEn: "Extract quantities from drawings", path: "/projects?tab=attachments&mode=extraction", icon: Ruler, token: "priority-medium", countKey: null },
      { nameAr: "خطة التنفيذ", nameEn: "Execution Plan", descAr: "تخطيط التنفيذ بالذكاء الاصطناعي", descEn: "AI-powered execution planning", path: "/p6-export", icon: ListChecks, token: "status-completed", countKey: null },
    ],
  },
  {
    titleAr: "التكاليف والتسعير", titleEn: "Costs & Pricing",
    items: [
      { nameAr: "التسعير والتحليل", nameEn: "Cost Analysis", descAr: "تحليل التكاليف والأسعار", descEn: "Cost & price analysis", path: "/cost-analysis", icon: DollarSign, token: "priority-medium", countKey: "cost_analysis" },
      { nameAr: "عروض الاسعار", nameEn: "Quotations", descAr: "مقارنة ورفع العروض", descEn: "Upload & compare quotes", path: "/quotations", icon: FileSearch, token: "cat-subcontractor", countKey: null },
      { nameAr: "المكتبة", nameEn: "Library", descAr: "مكتبة الأسعار والمواد", descEn: "Price & material library", path: "/library", icon: BookOpen, token: "cat-material", countKey: "material_prices" },
    ],
  },
  {
    titleAr: "العمليات والموارد", titleEn: "Operations & Resources",
    items: [
      { nameAr: "العقود", nameEn: "Contracts", descAr: "إدارة العقود والضمانات", descEn: "Contracts & warranties", path: "/contracts", icon: Briefcase, token: "cat-subcontractor", countKey: "contracts" },
      { nameAr: "المشتريات", nameEn: "Procurement", descAr: "طلبات الشراء والموردين", descEn: "Procurement & suppliers", path: "/procurement", icon: Package, token: "cat-equipment", countKey: "external_partners" },
      { nameAr: "مقاولي الباطن", nameEn: "Subcontractors", descAr: "إدارة مقاولي الباطن", descEn: "Subcontractor management", path: "/subcontractors", icon: Users, token: "cat-labor", countKey: "subcontractors" },
      { nameAr: "المخاطر", nameEn: "Risk", descAr: "تقييم وإدارة المخاطر", descEn: "Risk assessment", path: "/risk", icon: AlertTriangle, token: "priority-high", countKey: "risks" },
    ],
  },
  {
    titleAr: "الإدارة", titleEn: "Administration",
    items: [
      { nameAr: "إدارة الصلاحيات", nameEn: "User Permissions", descAr: "إدارة المستخدمين والأدوار", descEn: "Manage users & roles", path: "/settings", icon: Shield, token: "cat-other", countKey: null },
      { nameAr: "لوحة الإدارة", nameEn: "Admin Dashboard", descAr: "إحصائيات وإدارة النظام", descEn: "System stats & management", path: "/admin/versions", icon: Settings, token: "cat-other", countKey: null },
    ],
  },
];

type CountsMap = Record<string, number>;

const tableKeys = [
  "saved_projects", "project_items", "cost_analysis", "contracts",
  "external_partners", "subcontractors", "risks", "progress_certificates", "material_prices",
] as const;

interface RecentItem {
  id: string;
  name: string;
  updated_at: string;
}

export default function HomePage() {
  const { isArabic } = useLanguage();
  const [counts, setCounts] = useState<CountsMap>({});
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      const results: CountsMap = {};
      const promises = tableKeys.map(async (table) => {
        try {
          const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
          results[table] = count ?? 0;
        } catch {
          results[table] = 0;
        }
      });
      await Promise.all(promises);
      setCounts(results);
    };
    const fetchRecent = async () => {
      try {
        const { data } = await supabase
          .from("saved_projects")
          .select("id,name,updated_at")
          .order("updated_at", { ascending: false })
          .limit(3);
        setRecent((data as RecentItem[]) ?? []);
      } catch {
        setRecent([]);
      }
    };
    fetchCounts();
    fetchRecent();
  }, []);

  const heroStats = [
    { label: isArabic ? "المشاريع" : "Projects", value: counts.saved_projects ?? 0, icon: FolderOpen, token: "status-active" },
    { label: isArabic ? "العقود" : "Contracts", value: counts.contracts ?? 0, icon: Briefcase, token: "cat-subcontractor" },
    { label: isArabic ? "البنود" : "Items", value: counts.project_items ?? 0, icon: Layers, token: "cat-material" },
    { label: isArabic ? "المواد" : "Materials", value: counts.material_prices ?? 0, icon: Package, token: "cat-equipment" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(ellipse at bottom right, hsl(var(--accent) / 0.08), transparent 55%)",
      }}
    >
      <style>{`
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <UnifiedHeader />

      <main className="flex-1 flex flex-col items-center px-3 md:px-4 py-6 md:py-8">
        {/* Hero Stats Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 max-w-3xl w-full mb-4">
          {heroStats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-2xl bg-card/60 border border-border backdrop-blur-sm"
              >
                <div
                  className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `hsl(var(--${s.token}) / 0.15)` }}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: `hsl(var(--${s.token}))` }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-lg md:text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-muted-foreground text-[10px] md:text-xs mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        {recent.length > 0 && (
          <div className="max-w-3xl w-full mb-6 md:mb-8 rounded-2xl bg-card/60 border border-border backdrop-blur-sm p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-foreground text-sm font-semibold">
                {isArabic ? "آخر النشاط" : "Recent Activity"}
              </h3>
            </div>
            <div className="space-y-1.5">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  to={`/projects/${r.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `hsl(var(--status-active) / 0.15)` }}
                    >
                      <BarChart3 className="w-3.5 h-3.5" style={{ color: `hsl(var(--status-active))` }} />
                    </div>
                    <span className="text-foreground text-sm truncate">{r.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {formatDistanceToNow(new Date(r.updated_at), {
                      addSuffix: true,
                      locale: isArabic ? ar : enUS,
                    })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <PMSLogo size="lg" />
          <div className="text-center">
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              {isArabic ? "اختر القسم للبدء" : "Select a section to begin"}
            </p>
          </div>
          <img src={alimtyazLogo} alt="Alimtyaz Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain bg-muted p-1" />
        </div>

        {/* Grouped Navigation */}
        <div className="max-w-5xl w-full space-y-6">
          {groups.map((group, gIdx) => (
            <div key={group.titleEn}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <h2 className="text-primary text-xs md:text-sm font-semibold tracking-wide uppercase">
                  {isArabic ? group.titleAr : group.titleEn}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {group.items.map((section, index) => {
                  const Icon = section.icon;
                  const count = section.countKey ? counts[section.countKey] : undefined;
                  return (
                    <Link
                      key={section.path}
                      to={section.path}
                      className="group relative flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6 rounded-xl
                        bg-card/70 border border-border
                        hover:scale-[1.06] hover:shadow-xl
                        transition-all duration-200 transform-gpu will-change-transform
                        cursor-pointer shadow-md backdrop-blur-sm"
                      style={{
                        animation: 'card-enter 0.4s ease-out forwards',
                        animationDelay: `${(gIdx * 100) + (index * 50)}ms`,
                        opacity: 0,
                        backgroundImage: `linear-gradient(135deg, hsl(var(--${section.token}) / 0.18), hsl(var(--${section.token}) / 0.04))`,
                        borderColor: `hsl(var(--${section.token}) / 0.35)`,
                      }}
                    >
                      {count !== undefined && count > 0 && (
                        <span
                          className="absolute top-2 end-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                          style={{
                            backgroundColor: `hsl(var(--${section.token}) / 0.25)`,
                            color: `hsl(var(--${section.token}))`,
                          }}
                        >
                          {count}
                        </span>
                      )}
                      <div
                        className="w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1 group-hover:ring-2"
                        style={{
                          backgroundColor: `hsl(var(--${section.token}) / 0.15)`,
                        }}
                      >
                        <Icon className="w-6 h-6 md:w-8 md:h-8 drop-shadow" style={{ color: `hsl(var(--${section.token}))` }} />
                      </div>
                      <div className="text-center">
                        <p className="text-foreground font-semibold text-xs md:text-sm">{section.nameAr}</p>
                        <p className="text-muted-foreground text-[10px] md:text-xs mt-0.5">{section.nameEn}</p>
                        <p className="text-muted-foreground/80 text-[9px] md:text-[10px] mt-1 hidden sm:block">
                          {isArabic ? section.descAr : section.descEn}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Designer Footer */}
      <footer className="bg-card/70 backdrop-blur-md border-t border-border py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={developerPhoto}
                alt="Dr.Eng. Mohamed Sobh"
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-full ring-2 ring-primary/30 object-cover"
              />
              <div>
                <p className="text-foreground font-semibold text-sm">Dr.Eng. Mohamed Sobh</p>
                <p className="text-muted-foreground text-xs">
                  {isArabic ? "مدير المشاريع" : "Projects Director"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground text-xs">
              <a href="tel:+966548000243" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Phone className="w-3.5 h-3.5" />
                <span>+966 54 800 0243</span>
              </a>
              <a href="mailto:moh.sobh@imtyaz.sa" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" />
                <span>moh.sobh@imtyaz.sa</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <img src={alimtyazLogo} alt="AL IMTYAZ" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-contain bg-muted p-1" />
              <span className="text-muted-foreground text-xs">AL IMTYAZ ALWATANIYA CONT.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
