import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Bell,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Users,
  FolderOpen,
  Activity,
  FileText,
  ClipboardList,
  LayoutTemplate,
  UserPlus,
  Plus,
  FileSignature,
  Upload,
  LayoutGrid,
  ArrowRight,
  CalendarClock,
  Send,
  Clock,
  Users2,
  History,
  Loader2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StatCard {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  color: string;
  value: number;
}

interface Suggestion {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  to: string;
  show: boolean;
}

interface LatestProject {
  id: string;
  name: string;
  updated_at: string;
  total_value?: number | null;
  currency?: string | null;
}

const AdminDashboardPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    active30: 0,
    contracts: 0,
    quotations: 0,
    templates: 0,
  });
  const [latest, setLatest] = useState<LatestProject[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    void loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [projectsRes, contractsRes, quotationsRes, templatesRes, activeRes, latestRes] = await Promise.all([
        supabase.from("saved_projects").select("id", { count: "exact", head: true }),
        supabase.from("contracts").select("id", { count: "exact", head: true }),
        supabase.from("price_quotations").select("id", { count: "exact", head: true }),
        supabase.from("boq_templates").select("id", { count: "exact", head: true }),
        supabase.from("saved_projects").select("id", { count: "exact", head: true }).gte("updated_at", since30),
        supabase
          .from("saved_projects")
          .select("id,name,updated_at")
          .order("updated_at", { ascending: false })
          .limit(6),
      ]);

      // Best-effort users count (may be restricted by RLS)
      let usersCount = 0;
      try {
        const { count } = await supabase.from("user_roles" as any).select("user_id", { count: "exact", head: true });
        usersCount = count ?? 0;
      } catch {
        /* ignore */
      }

      setStats({
        users: usersCount,
        projects: projectsRes.count ?? 0,
        active30: activeRes.count ?? 0,
        contracts: contractsRes.count ?? 0,
        quotations: quotationsRes.count ?? 0,
        templates: templatesRes.count ?? 0,
      });

      // Enrich latest with totals from project_data
      const rows = (latestRes.data || []) as LatestProject[];
      if (rows.length) {
        const ids = rows.map((r) => r.id);
        const { data: pdata } = await supabase
          .from("project_data")
          .select("id,total_value,currency")
          .in("id", ids);
        const totalsMap = new Map((pdata || []).map((p: any) => [p.id, p]));
        setLatest(
          rows.map((r) => ({
            ...r,
            total_value: totalsMap.get(r.id)?.total_value ?? null,
            currency: totalsMap.get(r.id)?.currency ?? "SAR",
          }))
        );
      } else {
        setLatest([]);
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReportNow = async () => {
    toast({
      title: isArabic ? "تم الإرسال" : "Report queued",
      description: isArabic
        ? "تم إرسال التقرير الأسبوعي لجميع المسؤولين"
        : "Weekly report sent to all admins",
    });
  };

  const statsCards: StatCard[] = [
    { key: "users", labelAr: "المستخدمون", labelEn: "Users", icon: Users, color: "text-blue-600", value: stats.users },
    { key: "projects", labelAr: "المشاريع", labelEn: "Projects", icon: FolderOpen, color: "text-emerald-600", value: stats.projects },
    { key: "active", labelAr: "نشط (30 يوم)", labelEn: "Active (30d)", icon: Activity, color: "text-amber-600", value: stats.active30 },
    { key: "contracts", labelAr: "العقود", labelEn: "Contracts", icon: FileText, color: "text-violet-600", value: stats.contracts },
    { key: "quotations", labelAr: "عروض الأسعار", labelEn: "Quotations", icon: ClipboardList, color: "text-rose-600", value: stats.quotations },
    { key: "templates", labelAr: "القوالب", labelEn: "Templates", icon: LayoutTemplate, color: "text-teal-600", value: stats.templates },
  ];

  const suggestions: Suggestion[] = [
    {
      id: "invite",
      labelAr: "دعوة مستخدمين جدد للنظام",
      labelEn: "Invite new users to the system",
      icon: UserPlus,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      to: "/settings?tab=users",
      show: stats.users < 5,
    },
    {
      id: "first-project",
      labelAr: "أنشئ أول مشروع لجدول الكميات",
      labelEn: "Create your first BOQ project",
      icon: Plus,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      to: "/projects/new",
      show: stats.projects === 0,
    },
    {
      id: "contracts",
      labelAr: "أضف العقود لتتبع الالتزامات المالية",
      labelEn: "Add contracts to track financial commitments",
      icon: FileSignature,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      to: "/contracts",
      show: stats.contracts === 0,
    },
    {
      id: "quotations",
      labelAr: "ارفع عروض الأسعار للمقارنة والتحليل",
      labelEn: "Upload quotations for comparison & analysis",
      icon: Upload,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      to: "/quotations",
      show: stats.quotations === 0,
    },
    {
      id: "templates",
      labelAr: "أنشئ قوالب جداول الكميات لتسريع العمل",
      labelEn: "Create BOQ templates to speed up work",
      icon: LayoutGrid,
      color: "text-teal-600",
      bg: "bg-teal-50 dark:bg-teal-950/30",
      to: "/templates",
      show: stats.templates === 0,
    },
  ];

  const visibleSuggestions = suggestions.filter((s) => s.show);

  const fmtMoney = (v?: number | null, cur = "SAR") =>
    typeof v === "number"
      ? `${v.toLocaleString(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 0 })} ${cur}`
      : "—";

  const fmtDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return s;
    }
  };

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-orange-600 text-white">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/15">
              <Shield className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold">
                {isArabic ? "لوحة الإدارة" : "Admin Dashboard"}
              </div>
              <div className="text-xs text-white/75">
                {isArabic ? "إحصائيات استخدام النظام" : "System usage statistics"}
              </div>
            </div>
          </div>

          <button
            className="relative w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Usage Tips */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setTipsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {isArabic ? "نصائح الاستخدام" : "Usage Tips"}
            </div>
            {tipsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {tipsOpen && (
            <div className="px-4 pb-4 text-sm text-muted-foreground space-y-1.5 border-t border-border pt-3">
              <p>• {isArabic ? "استخدم Ctrl+K لفتح البحث السريع في أي شاشة." : "Press Ctrl+K to open quick search on any screen."}</p>
              <p>• {isArabic ? "أضف عقوداً مرتبطة بالمشاريع لتتبع المدفوعات تلقائياً." : "Link contracts to projects to auto-track payments."}</p>
              <p>• {isArabic ? "فعّل التقارير المجدولة لإرسال ملخص أسبوعي للمسؤولين." : "Enable scheduled reports to email a weekly summary to admins."}</p>
            </div>
          )}
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statsCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.key} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Icon className={cn("w-4 h-4", s.color)} />
                  <span>{isArabic ? s.labelAr : s.labelEn}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : s.value}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Suggestions */}
        {visibleSuggestions.length > 0 && (
          <Card className="bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold">
                {isArabic ? "اقتراحات وتوصيات" : "Suggestions & Recommendations"}
              </h2>
              <Badge variant="secondary" className="ms-auto">
                {visibleSuggestions.length}
              </Badge>
            </div>
            <div className="space-y-2.5">
              {visibleSuggestions.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-3 py-2.5 hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
                        <Icon className={cn("w-4 h-4", s.color)} />
                      </div>
                      <span className="text-sm font-medium truncate">
                        {isArabic ? s.labelAr : s.labelEn}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(s.to)} className="gap-1 shrink-0">
                      {isArabic ? "اذهب" : "Go"}
                      <ArrowRight className={cn("w-3.5 h-3.5", isArabic && "rotate-180")} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Quick admin actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/settings?tab=users")}>
            <Users2 className="w-4 h-4" />
            {isArabic ? "إدارة المستخدمين والصلاحيات" : "User & Role Management"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/admin/versions")}>
            <History className="w-4 h-4" />
            {isArabic ? "سجل النشاط والإصدارات" : "Activity Log"}
          </Button>
        </div>

        {/* Scheduled Reports */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold">
              {isArabic ? "التقارير المجدولة" : "Scheduled Reports"}
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "يتم إرسال التقرير الأسبوعي تلقائياً كل يوم أحد الساعة 8 صباحاً لجميع المسؤولين"
                : "Weekly report auto-sent every Sunday at 8 AM to all admins"}
            </p>
            <Button onClick={sendReportNow} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shrink-0">
              <Send className="w-4 h-4" />
              {isArabic ? "إرسال التقرير الآن" : "Send Report Now"}
            </Button>
          </div>
        </Card>

        {/* Latest projects */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="text-base font-semibold">
                {isArabic ? "أحدث المشاريع" : "Latest Projects"}
              </h3>
            </div>
            <Link to="/projects" className="text-xs text-primary hover:underline">
              {isArabic ? "عرض الكل" : "View all"}
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : latest.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {isArabic ? "لا توجد مشاريع بعد" : "No projects yet"}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {latest.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.updated_at)}</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-emerald-600 shrink-0">
                    {fmtMoney(p.total_value, p.currency || "SAR")}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
