import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import BackgroundImage from "@/components/BackgroundImage";
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
  path: string; icon: typeof FolderOpen; color: string; iconColor: string;
  countKey: string | null;
};

const groups: { titleAr: string; titleEn: string; items: Section[] }[] = [
  {
    titleAr: "نظرة عامة", titleEn: "Overview",
    items: [
      { nameAr: "لوحة المعلومات", nameEn: "Dashboard", descAr: "نظرة عامة على الأداء", descEn: "Performance overview", path: "/dashboard", icon: BarChart3, color: "from-sky-500/30 to-sky-700/20", iconColor: "text-sky-300", countKey: null },
      { nameAr: "التقارير", nameEn: "Reports", descAr: "التقارير والتحليلات", descEn: "Reports & analytics", path: "/projects?tab=reports", icon: FileText, color: "from-indigo-500/30 to-indigo-700/20", iconColor: "text-indigo-300", countKey: null },
    ],
  },
  {
    titleAr: "إدارة المشاريع", titleEn: "Project Management",
    items: [
      { nameAr: "المشاريع", nameEn: "Projects", descAr: "إدارة ومتابعة المشاريع", descEn: "Manage & track projects", path: "/projects", icon: FolderOpen, color: "from-blue-500/30 to-blue-700/20", iconColor: "text-blue-300", countKey: "saved_projects" },
      { nameAr: "جدول الكميات", nameEn: "BOQ Items", descAr: "بنود الأعمال والكميات", descEn: "Work items & quantities", path: "/items", icon: Layers, color: "from-emerald-500/30 to-emerald-700/20", iconColor: "text-emerald-300", countKey: "project_items" },
      { nameAr: "المستخلصات", nameEn: "Certificates", descAr: "الشهادات والمستخلصات", descEn: "Progress certificates", path: "/progress-certificates", icon: Award, color: "from-yellow-500/30 to-yellow-700/20", iconColor: "text-yellow-300", countKey: "progress_certificates" },
    ],
  },
  {
    titleAr: "التكاليف والتسعير", titleEn: "Costs & Pricing",
    items: [
      { nameAr: "التسعير والتحليل", nameEn: "Cost Analysis", descAr: "تحليل التكاليف والأسعار", descEn: "Cost & price analysis", path: "/cost-analysis", icon: DollarSign, color: "from-amber-500/30 to-amber-700/20", iconColor: "text-amber-300", countKey: "cost_analysis" },
      { nameAr: "عروض الاسعار", nameEn: "Quotations", descAr: "مقارنة ورفع العروض", descEn: "Upload & compare quotes", path: "/quotations", icon: FileSearch, color: "from-pink-500/30 to-pink-700/20", iconColor: "text-pink-300", countKey: null },
      { nameAr: "المكتبة", nameEn: "Library", descAr: "مكتبة الأسعار والمواد", descEn: "Price & material library", path: "/library", icon: BookOpen, color: "from-teal-500/30 to-teal-700/20", iconColor: "text-teal-300", countKey: "material_prices" },
    ],
  },
  {
    titleAr: "العمليات والموارد", titleEn: "Operations & Resources",
    items: [
      { nameAr: "العقود", nameEn: "Contracts", descAr: "إدارة العقود والضمانات", descEn: "Contracts & warranties", path: "/contracts", icon: Briefcase, color: "from-purple-500/30 to-purple-700/20", iconColor: "text-purple-300", countKey: "contracts" },
      { nameAr: "المشتريات", nameEn: "Procurement", descAr: "طلبات الشراء والموردين", descEn: "Procurement & suppliers", path: "/procurement", icon: Package, color: "from-cyan-500/30 to-cyan-700/20", iconColor: "text-cyan-300", countKey: "external_partners" },
      { nameAr: "مقاولي الباطن", nameEn: "Subcontractors", descAr: "إدارة مقاولي الباطن", descEn: "Subcontractor management", path: "/subcontractors", icon: Users, color: "from-orange-500/30 to-orange-700/20", iconColor: "text-orange-300", countKey: "subcontractors" },
      { nameAr: "المخاطر", nameEn: "Risk", descAr: "تقييم وإدارة المخاطر", descEn: "Risk assessment", path: "/risk", icon: AlertTriangle, color: "from-red-500/30 to-red-700/20", iconColor: "text-red-300", countKey: "risks" },
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
    { label: isArabic ? "المشاريع" : "Projects", value: counts.saved_projects ?? 0, icon: FolderOpen, color: "text-blue-300", bg: "bg-blue-500/15" },
    { label: isArabic ? "العقود" : "Contracts", value: counts.contracts ?? 0, icon: Briefcase, color: "text-emerald-300", bg: "bg-emerald-500/15" },
    { label: isArabic ? "البنود" : "Items", value: counts.project_items ?? 0, icon: Layers, color: "text-purple-300", bg: "bg-purple-500/15" },
    { label: isArabic ? "المواد" : "Materials", value: counts.material_prices ?? 0, icon: Package, color: "text-orange-300", bg: "bg-orange-500/15" },
  ];

  return (
    <div className="min-h-screen flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <BackgroundImage />
      <UnifiedHeader />

      <main className="flex-1 flex flex-col items-center px-3 md:px-4 py-6 md:py-8">
        {/* Hero Stats Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 max-w-3xl w-full mb-4">
          {heroStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${s.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-lg md:text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-white/60 text-[10px] md:text-xs mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        {recent.length > 0 && (
          <div className="max-w-3xl w-full mb-6 md:mb-8 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-white/70" />
              <h3 className="text-white text-sm font-semibold">
                {isArabic ? "آخر النشاط" : "Recent Activity"}
              </h3>
            </div>
            <div className="space-y-1.5">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  to={`/projects/${r.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-3.5 h-3.5 text-blue-300" />
                    </div>
                    <span className="text-white text-sm truncate">{r.name}</span>
                  </div>
                  <span className="text-white/50 text-xs shrink-0">
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
            <h1 className="text-xl md:text-3xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {isArabic ? "نظام إدارة المشاريع" : "Project Management System"}
            </h1>
            <p className="text-white/70 text-xs md:text-sm mt-1">
              {isArabic ? "اختر القسم للبدء" : "Select a section to begin"}
            </p>
          </div>
          <img src={alimtyazLogo} alt="Alimtyaz Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain bg-white/10 p-1" />
        </div>

        {/* Grouped Navigation */}
        <div className="max-w-5xl w-full space-y-6">
          {groups.map((group, gIdx) => (
            <div key={group.titleEn}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                <h2 className="text-amber-300/90 text-xs md:text-sm font-semibold tracking-wide uppercase">
                  {isArabic ? group.titleAr : group.titleEn}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {group.items.map((section, index) => {
                  const Icon = section.icon;
                  const count = section.countKey ? counts[section.countKey] : undefined;
                  return (
                    <Link
                      key={section.path}
                      to={section.path}
                      className={`group relative flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6 rounded-xl
                        bg-black/40 border border-white/15
                        hover:border-white/30 hover:scale-[1.08]
                        transition-transform transition-colors duration-200 transform-gpu will-change-transform
                        cursor-pointer shadow-lg
                        bg-gradient-to-br ${section.color}`}
                      style={{
                        animation: 'card-enter 0.4s ease-out forwards',
                        animationDelay: `${(gIdx * 100) + (index * 50)}ms`,
                        opacity: 0,
                      }}
                    >
                      {count !== undefined && count > 0 && (
                        <span className="absolute top-2 end-2 bg-white/20 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {count}
                        </span>
                      )}
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white/10 group-hover:bg-white/20 group-hover:ring-2 group-hover:ring-white/20 flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1">
                        <Icon className={`w-6 h-6 md:w-8 md:h-8 ${section.iconColor} drop-shadow`} />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold text-xs md:text-sm">{section.nameAr}</p>
                        <p className="text-white/75 text-[10px] md:text-xs mt-0.5">{section.nameEn}</p>
                        <p className="text-white/50 text-[9px] md:text-[10px] mt-1 hidden sm:block">
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
      <footer className="bg-black/50 backdrop-blur-md border-t border-white/10 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={developerPhoto}
                alt="Dr.Eng. Mohamed Sobh"
                className="w-12 h-12 rounded-full ring-2 ring-primary/30 object-cover"
              />
              <div>
                <p className="text-white font-semibold text-sm">Dr.Eng. Mohamed Sobh</p>
                <p className="text-white/60 text-xs">
                  {isArabic ? "مدير المشاريع" : "Projects Director"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-white/70 text-xs">
              <a href="tel:+966548000243" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" />
                <span>+966 54 800 0243</span>
              </a>
              <a href="mailto:moh.sobh@imtyaz.sa" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5" />
                <span>moh.sobh@imtyaz.sa</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <img src={alimtyazLogo} alt="AL IMTYAZ" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
              <span className="text-white/60 text-xs">AL IMTYAZ ALWATANIYA CONT.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
