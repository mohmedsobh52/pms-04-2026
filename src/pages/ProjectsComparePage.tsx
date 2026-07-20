import { useEffect, useMemo, useState } from "react";
import { AppShell as PageLayout } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { GitCompare, Briefcase } from "lucide-react";

interface ProjectRow {
  id: string;
  name: string;
  total_value: number | null;
  items_count: number | null;
  currency: string | null;
  created_at: string;
}

const fmt = (n: number | null | undefined, c = "USD") =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Number(n));

export default function ProjectsComparePage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("project_data")
        .select("id,name,total_value,items_count,currency,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setProjects(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const compared = useMemo(() => projects.filter((p) => selected.has(p.id)), [projects, selected]);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 4) next.add(id);
    setSelected(next);
  };

  const maxValue = Math.max(...compared.map((p) => Number(p.total_value ?? 0)), 1);

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          {isArabic ? "مقارنة المشاريع" : "Compare Projects"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isArabic ? "اختر حتى 4 مشاريع للمقارنة جنباً إلى جنب" : "Select up to 4 projects to compare side by side"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1">
          <h3 className="font-semibold mb-3 text-sm">
            {isArabic ? "المشاريع المتاحة" : "Available Projects"} ({projects.length})
          </h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : projects.length === 0 ? (
            <EmptyState icon={Briefcase} title={isArabic ? "لا توجد مشاريع" : "No projects"} />
          ) : (
            <ul className="space-y-1 max-h-[500px] overflow-auto pe-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                      disabled={!selected.has(p.id) && selected.size >= 4}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{fmt(p.total_value, p.currency ?? "USD")}</p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-2">
          {compared.length < 2 ? (
            <EmptyState
              icon={GitCompare}
              title={isArabic ? "اختر مشروعين على الأقل" : "Select at least 2 projects"}
              description={isArabic ? "ستظهر مقارنة تفصيلية هنا" : "Detailed comparison will appear here"}
            />
          ) : (
            <Card className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start p-2 text-muted-foreground font-medium">{isArabic ? "المقياس" : "Metric"}</th>
                    {compared.map((p) => (
                      <th key={p.id} className="text-start p-2 font-semibold">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 text-muted-foreground">{isArabic ? "القيمة الإجمالية" : "Total Value"}</td>
                    {compared.map((p) => (
                      <td key={p.id} className="p-2 font-semibold tabular-nums">{fmt(p.total_value, p.currency ?? "USD")}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 text-muted-foreground">{isArabic ? "عدد البنود" : "Items"}</td>
                    {compared.map((p) => (
                      <td key={p.id} className="p-2 tabular-nums">{p.items_count ?? 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 text-muted-foreground">{isArabic ? "العملة" : "Currency"}</td>
                    {compared.map((p) => (
                      <td key={p.id} className="p-2"><Badge variant="outline">{p.currency ?? "USD"}</Badge></td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 text-muted-foreground">{isArabic ? "تاريخ الإنشاء" : "Created"}</td>
                    {compared.map((p) => (
                      <td key={p.id} className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 text-muted-foreground">{isArabic ? "حجم نسبي" : "Relative size"}</td>
                    {compared.map((p) => {
                      const pct = (Number(p.total_value ?? 0) / maxValue) * 100;
                      return (
                        <td key={p.id} className="p-2">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
