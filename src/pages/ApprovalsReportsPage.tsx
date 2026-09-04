import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, Download, RefreshCw, Search, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/claims";
import { rowsCsv } from "@/lib/claims-finance";
import { KpiCard } from "@/components/claims/FinanceUI";

const ENTITY_LABEL: Record<string, { ar: string; en: string }> = {
  procurement_item: { ar: "بند مشتريات", en: "Procurement item" },
  contract: { ar: "عقد", en: "Contract" },
  progress_certificate: { ar: "شهادة إنجاز", en: "Progress certificate" },
  contract_variation: { ar: "تغيير عقد", en: "Variation" },
  risk: { ar: "مخاطرة", en: "Risk" },
  claim: { ar: "مطالبة", en: "Claim" },
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: "معلّق", en: "Pending" },
  in_progress: { ar: "قيد الاعتماد", en: "In progress" },
  approved: { ar: "معتمد", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
};

const statusClass = (s: string) =>
  s === "approved" ? "bg-success/10 text-success border-success/20"
  : s === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
  : s === "cancelled" ? "bg-muted text-muted-foreground border-border"
  : "bg-warning/10 text-warning border-warning/20";

export default function ApprovalsReportsPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [defs, setDefs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const load = async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data: instances } = await supabase
        .from("workflow_instances").select("*")
        .order("started_at", { ascending: false }).limit(500);
      const list = instances ?? [];
      const ids = Array.from(new Set(list.map((i) => i.definition_id)));
      const { data: definitions } = ids.length
        ? await supabase.from("workflow_definitions").select("id,name").in("id", ids)
        : { data: [] as any[] };
      setDefs(new Map((definitions ?? []).map((d: any) => [d.id, d.name])));
      setRows(list);
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const kpis = useMemo(() => {
    const open = rows.filter((r) => ["pending", "in_progress"].includes(r.status)).length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    const overdue = rows.filter((r) => r.due_at && ["pending", "in_progress"].includes(r.status)
      && new Date(r.due_at).getTime() < Date.now()).length;
    const durations = rows
      .filter((r) => r.completed_at && r.started_at)
      .map((r) => (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 86400000);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { total: rows.length, open, approved, rejected, overdue, avg };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "open" && !["pending", "in_progress"].includes(r.status)) return false;
      if (statusFilter !== "all" && statusFilter !== "open" && r.status !== statusFilter) return false;
      if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
      if (!q) return true;
      return [defs.get(r.definition_id), r.entity_type, r.entity_id]
        .some((v) => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter, entityFilter, defs]);

  const entityTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type))), [rows]);

  const exportCsv = () => {
    const data = filtered.map((r) => ({
      [isArabic ? "المسار" : "Workflow"]: defs.get(r.definition_id) ?? r.definition_id,
      [isArabic ? "النوع" : "Entity"]: (ENTITY_LABEL[r.entity_type] ?? { ar: r.entity_type, en: r.entity_type })[isArabic ? "ar" : "en"],
      [isArabic ? "المعرف" : "Entity ID"]: r.entity_id,
      [isArabic ? "الحالة" : "Status"]: (STATUS_LABEL[r.status] ?? { ar: r.status, en: r.status })[isArabic ? "ar" : "en"],
      [isArabic ? "الخطوة الحالية" : "Current step"]: r.current_step_order,
      [isArabic ? "بدأ في" : "Started"]: r.started_at ? new Date(r.started_at).toISOString().slice(0, 10) : "",
      [isArabic ? "الاستحقاق" : "Due"]: r.due_at ? new Date(r.due_at).toISOString().slice(0, 10) : "",
      [isArabic ? "اكتمل في" : "Completed"]: r.completed_at ? new Date(r.completed_at).toISOString().slice(0, 10) : "",
    }));
    downloadCsv(rowsCsv(data), `approvals-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(isArabic ? "تم التصدير" : "Exported");
  };

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            {isArabic ? "تقارير الاعتماد" : "Approvals Reports"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isArabic ? "طلبات الاعتماد المفتوحة والمعتمدة والمُستلمة مع مؤشرات الأداء" : "Open, approved and received approval requests with KPIs"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/approvals"><Inbox className="h-4 w-4 me-1" />{isArabic ? "صندوق الموافقات" : "Inbox"}</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCsv}><Download className="h-4 w-4 me-1" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard label={isArabic ? "إجمالي الطلبات" : "Total requests"} value={String(kpis.total)} tone="primary" />
        <KpiCard label={isArabic ? "مفتوحة" : "Open"} value={String(kpis.open)} tone="warning" />
        <KpiCard label={isArabic ? "معتمدة" : "Approved"} value={String(kpis.approved)} tone="success" />
        <KpiCard label={isArabic ? "مرفوضة" : "Rejected"} value={String(kpis.rejected)} tone="destructive" />
        <KpiCard label={isArabic ? "متأخرة عن SLA" : "Past SLA"} value={String(kpis.overdue)} tone="destructive" />
        <KpiCard label={isArabic ? "متوسط زمن الاعتماد" : "Avg cycle"} value={`${kpis.avg.toFixed(1)} ${isArabic ? "يوم" : "d"}`} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{isArabic ? "طلبات الاعتماد" : "Approval requests"} ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="ps-8 w-52" placeholder={isArabic ? "بحث..." : "Search..."}
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الحالات" : "All statuses"}</SelectItem>
                <SelectItem value="open">{isArabic ? "مفتوحة" : "Open"}</SelectItem>
                {["approved", "rejected", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s][isArabic ? "ar" : "en"]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الأنواع" : "All types"}</SelectItem>
                {entityTypes.map((e) => (
                  <SelectItem key={e} value={e}>
                    {(ENTITY_LABEL[e] ?? { ar: e, en: e })[isArabic ? "ar" : "en"]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "المسار" : "Workflow"}</TableHead>
                  <TableHead>{isArabic ? "النوع" : "Entity"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "الخطوة" : "Step"}</TableHead>
                  <TableHead>{isArabic ? "بدأ" : "Started"}</TableHead>
                  <TableHead>{isArabic ? "الاستحقاق" : "Due"}</TableHead>
                  <TableHead>{isArabic ? "اكتمل" : "Completed"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{defs.get(r.definition_id) ?? "—"}</TableCell>
                    <TableCell>
                      {r.entity_type === "claim" ? (
                        <Link className="text-primary hover:underline" to={`/claims/${r.entity_id}`}>
                          {ENTITY_LABEL.claim[isArabic ? "ar" : "en"]}
                        </Link>
                      ) : (
                        (ENTITY_LABEL[r.entity_type] ?? { ar: r.entity_type, en: r.entity_type })[isArabic ? "ar" : "en"]
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass(r.status)}>
                        {(STATUS_LABEL[r.status] ?? { ar: r.status, en: r.status })[isArabic ? "ar" : "en"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.current_step_order}</TableCell>
                    <TableCell>{r.started_at ? new Date(r.started_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className={r.due_at && new Date(r.due_at).getTime() < Date.now() && ["pending", "in_progress"].includes(r.status) ? "text-destructive" : ""}>
                      {r.due_at ? new Date(r.due_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isArabic ? "لا توجد طلبات" : "No requests"}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
