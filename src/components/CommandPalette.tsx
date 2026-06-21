import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLanguage } from "@/hooks/useLanguage";
import { searchEntities, GROUP_LABELS, EntityHit } from "@/lib/global-search";
import {
  Home, FolderOpen, FileText, Package, Users, Building2, BarChart3,
  Calendar, Library, DollarSign, Settings, ShieldAlert, Sparkles,
  Calculator, FileSpreadsheet, Target, Search,
} from "lucide-react";

interface NavItem {
  ar: string;
  en: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "main" | "projects" | "data" | "system";
}

const ITEMS: NavItem[] = [
  { ar: "الرئيسية", en: "Home", path: "/", icon: Home, group: "main" },
  { ar: "لوحة التحكم", en: "Dashboard", path: "/dashboard", icon: BarChart3, group: "main" },
  { ar: "المشاريع", en: "Projects", path: "/projects", icon: FolderOpen, group: "projects" },
  { ar: "مشروع جديد", en: "New Project", path: "/projects/new", icon: Sparkles, group: "projects" },
  { ar: "بنود BOQ", en: "BOQ Items", path: "/items", icon: FileSpreadsheet, group: "projects" },
  { ar: "أدوات التحليل", en: "Analysis Tools", path: "/analysis-tools", icon: Calculator, group: "projects" },
  { ar: "تحليل التكاليف", en: "Cost Analysis", path: "/cost-analysis", icon: DollarSign, group: "projects" },
  { ar: "العقود", en: "Contracts", path: "/contracts", icon: FileText, group: "projects" },
  { ar: "المشتريات", en: "Procurement", path: "/procurement", icon: Building2, group: "projects" },
  { ar: "العروض", en: "Quotations", path: "/quotations", icon: FileText, group: "projects" },
  { ar: "مقاولو الباطن", en: "Subcontractors", path: "/subcontractors", icon: Users, group: "projects" },
  { ar: "المخاطر", en: "Risk", path: "/risk", icon: ShieldAlert, group: "projects" },
  { ar: "التقويم", en: "Calendar", path: "/calendar", icon: Calendar, group: "projects" },
  { ar: "شهادات الإنجاز", en: "Progress Certificates", path: "/progress-certificates", icon: Target, group: "projects" },
  { ar: "المكتبة", en: "Library", path: "/library", icon: Library, group: "data" },
  { ar: "أسعار المواد", en: "Material Prices", path: "/material-prices", icon: Package, group: "data" },
  { ar: "الموارد", en: "Resources", path: "/resources", icon: Package, group: "data" },
  { ar: "الأسعار التاريخية", en: "Historical Pricing", path: "/historical-pricing", icon: BarChart3, group: "data" },
  { ar: "دقة التسعير", en: "Pricing Accuracy", path: "/pricing-accuracy", icon: Target, group: "data" },
  { ar: "القوالب", en: "Templates", path: "/templates", icon: FileText, group: "data" },
  { ar: "الإعدادات", en: "Settings", path: "/settings", icon: Settings, group: "system" },
  { ar: "إعدادات الشركة", en: "Company Settings", path: "/company-settings", icon: Building2, group: "system" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Entity search across modules (permission-aware via RLS)
  const { data: hits = [] } = useQuery({
    queryKey: ["global-search", q],
    enabled: open && q.trim().length >= 2,
    staleTime: 30_000,
    queryFn: () => searchEntities(q, 5),
  });

  const grouped = hits.reduce<Record<string, EntityHit[]>>((acc, h) => {
    (acc[h.group] ??= []).push(h);
    return acc;
  }, {});

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };

  const groups = {
    main: isArabic ? "الأساسي" : "Main",
    projects: isArabic ? "المشاريع" : "Projects",
    data: isArabic ? "البيانات والمكتبات" : "Data & Library",
    system: isArabic ? "النظام" : "System",
  } as const;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder={isArabic ? "ابحث في كل الوحدات..." : "Search across all modules..."}
      />
      <CommandList>
        <CommandEmpty>{isArabic ? "لا توجد نتائج" : "No results."}</CommandEmpty>

        {Object.entries(grouped).map(([group, items]) => (
          <CommandGroup
            key={group}
            heading={`${isArabic ? GROUP_LABELS[group as keyof typeof GROUP_LABELS].ar : GROUP_LABELS[group as keyof typeof GROUP_LABELS].en} (${items.length})`}
          >
            {items.map((h) => (
              <CommandItem key={`${h.group}-${h.id}`} value={`${h.label} ${h.description ?? ""}`} onSelect={() => go(h.route)}>
                <Search className="me-2 h-4 w-4 text-muted-foreground" />
                <span className="truncate">{h.label}</span>
                {h.description && <span className="ms-auto text-xs text-muted-foreground truncate max-w-[140px]">{h.description}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {hits.length > 0 && <CommandSeparator />}

        {(Object.keys(groups) as Array<keyof typeof groups>).map((g, idx) => {
          const items = ITEMS.filter((i) => i.group === g);
          return (
            <div key={g}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={groups[g]}>
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <CommandItem
                      key={it.path}
                      value={`${it.ar} ${it.en} ${it.path}`}
                      onSelect={() => go(it.path)}
                    >
                      <Icon className="me-2 h-4 w-4" />
                      <span>{isArabic ? it.ar : it.en}</span>
                      <span className="ms-auto text-xs text-muted-foreground">{it.path}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
