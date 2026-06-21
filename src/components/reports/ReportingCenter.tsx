import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReportExportBar } from "./ReportExportBar";
import {
  BarChart3, FileText, DollarSign, ShoppingCart, ShieldAlert,
} from "lucide-react";

type DomainKey = "evm" | "project" | "cost" | "procurement" | "risk";

const DOMAINS: { key: DomainKey; icon: any; en: string; ar: string; desc: { en: string; ar: string } }[] = [
  { key: "evm", icon: BarChart3, en: "EVM Reports", ar: "تقارير القيمة المكتسبة",
    desc: { en: "CPI, SPI, EAC across projects", ar: "مؤشرات الأداء عبر المشاريع" } },
  { key: "project", icon: FileText, en: "Project Reports", ar: "تقارير المشاريع",
    desc: { en: "Status, progress, KPIs", ar: "الحالة والتقدم والمؤشرات" } },
  { key: "cost", icon: DollarSign, en: "Cost Reports", ar: "تقارير التكاليف",
    desc: { en: "BOQ totals & cost breakdowns", ar: "إجماليات الكميات وتحليل التكلفة" } },
  { key: "procurement", icon: ShoppingCart, en: "Procurement Reports", ar: "تقارير المشتريات",
    desc: { en: "Workflow stages & open POs", ar: "مراحل العمل وأوامر الشراء المفتوحة" } },
  { key: "risk", icon: ShieldAlert, en: "Risk Reports", ar: "تقارير المخاطر",
    desc: { en: "Heatmap & critical risks", ar: "خريطة المخاطر والمخاطر الحرجة" } },
];

export function ReportingCenter() {
  const { isArabic } = useLanguage();
  const [open, setOpen] = useState<DomainKey | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isArabic ? "مركز التقارير" : "Reporting Center"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {DOMAINS.map((d) => (
              <button
                key={d.key}
                onClick={() => setOpen(d.key)}
                className="text-start rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent/40 transition p-4 flex flex-col gap-2"
              >
                <d.icon className="h-5 w-5 text-primary" />
                <div className="font-semibold text-sm">{isArabic ? d.ar : d.en}</div>
                <div className="text-xs text-muted-foreground">{isArabic ? d.desc.ar : d.desc.en}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {open && (isArabic ? DOMAINS.find((d) => d.key === open)!.ar : DOMAINS.find((d) => d.key === open)!.en)}
            </DialogTitle>
          </DialogHeader>
          {open === "evm" && <EvmReport />}
          {open === "project" && <ProjectReport />}
          {open === "cost" && <CostReport />}
          {open === "procurement" && <ProcurementReport />}
          {open === "risk" && <RiskReport />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Builders ----------

function useUserProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["report-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_data")
        .select("id,name,total_value,currency,items_count,updated_at,status")
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
}

function EvmReport() {
  const { isArabic } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { data: projects = [] } = useUserProjects();

  const { data: snapshots = [] } = useQuery({
    queryKey: ["report-evm", projects.map((p: any) => p.id)],
    enabled: projects.length > 0,
    queryFn: async () => {
      const ids = projects.map((p: any) => p.id);
      const { data: items } = await supabase.from("project_items")
        .select("project_id,total_price").in("project_id", ids);
      const { data: hist } = await supabase.from("project_progress_history")
        .select("project_id,actual_cost,actual_progress,planned_progress,record_date")
        .in("project_id", ids).order("record_date", { ascending: false });
      return projects.map((p: any) => {
        const bac = (items ?? []).filter((i: any) => i.project_id === p.id)
          .reduce((s: number, i: any) => s + Number(i.total_price || 0), 0);
        const latest = (hist ?? []).find((h: any) => h.project_id === p.id);
        const ap = Number(latest?.actual_progress || 0) / 100;
        const pp = Number(latest?.planned_progress || 0) / 100;
        const ev = bac * ap;
        const pv = bac * pp;
        const ac = Number(latest?.actual_cost || 0);
        const cpi = ac > 0 ? ev / ac : 0;
        const spi = pv > 0 ? ev / pv : 0;
        const eac = cpi > 0 ? bac / cpi : bac;
        return { project: p.name, bac, pv, ev, ac, cpi, spi, eac, vac: bac - eac };
      });
    },
  });

  const rows = snapshots.map((s: any) => ({
    Project: s.project, BAC: s.bac, PV: s.pv, EV: s.ev, AC: s.ac,
    CPI: s.cpi.toFixed(2), SPI: s.spi.toFixed(2), EAC: s.eac, VAC: s.vac,
  }));

  return (
    <div className="space-y-4">
      <ReportExportBar targetRef={ref} rows={rows} title={isArabic ? "تقرير EVM" : "EVM Report"} fileSlug="evm-report" />
      <div ref={ref} className="bg-card p-4 rounded-md border">
        <table className="w-full text-xs">
          <thead><tr className="border-b">
            {["Project", "BAC", "PV", "EV", "AC", "CPI", "SPI", "EAC", "VAC"].map((h) => (
              <th key={h} className="text-start p-2">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {snapshots.map((s: any, i: number) => (
              <tr key={i} className="border-b">
                <td className="p-2 font-medium">{s.project}</td>
                <td className="p-2 tabular-nums">{s.bac.toLocaleString()}</td>
                <td className="p-2 tabular-nums">{s.pv.toLocaleString()}</td>
                <td className="p-2 tabular-nums">{s.ev.toLocaleString()}</td>
                <td className="p-2 tabular-nums">{s.ac.toLocaleString()}</td>
                <td className={`p-2 tabular-nums ${s.cpi < 1 ? "text-destructive" : "text-emerald-600"}`}>{s.cpi.toFixed(2)}</td>
                <td className={`p-2 tabular-nums ${s.spi < 1 ? "text-destructive" : "text-emerald-600"}`}>{s.spi.toFixed(2)}</td>
                <td className="p-2 tabular-nums">{s.eac.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className={`p-2 tabular-nums ${s.vac < 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {s.vac.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
            {snapshots.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">
                {isArabic ? "لا توجد بيانات" : "No data"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectReport() {
  const { isArabic } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { data: projects = [] } = useUserProjects();
  const rows = projects.map((p: any) => ({
    Name: p.name, Status: p.status ?? "—", Items: p.items_count ?? 0,
    "Total Value": p.total_value ?? 0, Currency: p.currency ?? "SAR",
    Updated: new Date(p.updated_at).toLocaleDateString(),
  }));
  return (
    <div className="space-y-4">
      <ReportExportBar targetRef={ref} rows={rows} title={isArabic ? "تقرير المشاريع" : "Project Report"} fileSlug="project-report" />
      <div ref={ref} className="bg-card p-4 rounded-md border">
        <SimpleTable rows={rows} />
      </div>
    </div>
  );
}

function CostReport() {
  const { isArabic } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { data: projects = [] } = useUserProjects();
  const { data: costs = [] } = useQuery({
    queryKey: ["report-costs", projects.map((p: any) => p.id)],
    enabled: projects.length > 0,
    queryFn: async () => {
      const ids = projects.map((p: any) => p.id);
      const { data } = await supabase.from("project_items")
        .select("project_id,total_price,category").in("project_id", ids);
      const byProject = new Map<string, { total: number; byCat: Record<string, number> }>();
      (data ?? []).forEach((r: any) => {
        const e = byProject.get(r.project_id) ?? { total: 0, byCat: {} };
        const v = Number(r.total_price || 0);
        e.total += v;
        const c = r.category ?? "—";
        e.byCat[c] = (e.byCat[c] ?? 0) + v;
        byProject.set(r.project_id, e);
      });
      return projects.map((p: any) => ({
        Project: p.name,
        Total: byProject.get(p.id)?.total ?? 0,
        Categories: Object.entries(byProject.get(p.id)?.byCat ?? {})
          .map(([k, v]) => `${k}: ${(v as number).toLocaleString()}`).join(" | "),
      }));
    },
  });
  return (
    <div className="space-y-4">
      <ReportExportBar targetRef={ref} rows={costs} title={isArabic ? "تقرير التكاليف" : "Cost Report"} fileSlug="cost-report" />
      <div ref={ref} className="bg-card p-4 rounded-md border"><SimpleTable rows={costs as any[]} /></div>
    </div>
  );
}

function ProcurementReport() {
  const { isArabic } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["report-procurement"],
    queryFn: async () => {
      const { data } = await supabase.from("procurement_items")
        .select("description,boq_item_number,status,quantity,estimated_cost,delivery_date,suggested_suppliers,priority")
        .order("delivery_date", { ascending: true }).limit(200);
      return (data ?? []).map((r: any) => ({
        Item: r.description ?? r.boq_item_number, Status: r.status ?? "—", Priority: r.priority ?? "—",
        Qty: r.quantity ?? 0, "Estimated Cost": r.estimated_cost ?? 0,
        Supplier: Array.isArray(r.suggested_suppliers) ? (r.suggested_suppliers[0] ?? "—") : "—",
        Delivery: r.delivery_date ? new Date(r.delivery_date).toLocaleDateString() : "—",
      }));
    },
  });
  return (
    <div className="space-y-4">
      <ReportExportBar targetRef={ref} rows={rows} title={isArabic ? "تقرير المشتريات" : "Procurement Report"} fileSlug="procurement-report" />
      <div ref={ref} className="bg-card p-4 rounded-md border"><SimpleTable rows={rows} /></div>
    </div>
  );
}

function RiskReport() {
  const { isArabic } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["report-risks"],
    queryFn: async () => {
      const { data } = await supabase.from("risks")
        .select("risk_title,probability,impact,probability_score,impact_score,risk_score,status,mitigation_strategy,created_at")
        .order("created_at", { ascending: false }).limit(200);
      return (data ?? []).map((r: any) => ({
        Title: r.risk_title,
        Probability: r.probability ?? "—",
        Impact: r.impact ?? "—",
        Score: r.risk_score ?? (Number(r.probability_score ?? 0) * Number(r.impact_score ?? 0)),
        Status: r.status ?? "—",
        Mitigation: r.mitigation_strategy ?? "—",
      }));
    },
  });
  return (
    <div className="space-y-4">
      <ReportExportBar targetRef={ref} rows={rows} title={isArabic ? "تقرير المخاطر" : "Risk Report"} fileSlug="risk-report" />
      <div ref={ref} className="bg-card p-4 rounded-md border"><SimpleTable rows={rows} /></div>
    </div>
  );
}

function SimpleTable({ rows }: { rows: Record<string, any>[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-8">No data</p>;
  const cols = Object.keys(rows[0]);
  return (
    <table className="w-full text-xs">
      <thead><tr className="border-b">
        {cols.map((c) => <th key={c} className="text-start p-2 font-semibold">{c}</th>)}
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b">
            {cols.map((c) => (
              <td key={c} className="p-2 tabular-nums">
                {typeof r[c] === "number" ? r[c].toLocaleString() : String(r[c] ?? "—")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
