import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Search, Loader2, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before_state: any;
  after_state: any;
  created_at: string;
  ip_address?: string | null;
};

const actionTone = (action: string): string => {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("reject") || a.includes("cancel"))
    return "text-destructive bg-destructive/10 border-destructive/40";
  if (a.includes("approve") || a.includes("create"))
    return "text-emerald-600 bg-emerald-500/10 border-emerald-500/40";
  if (a.includes("update") || a.includes("edit"))
    return "text-amber-600 bg-amber-500/10 border-amber-500/40";
  return "text-blue-600 bg-blue-500/10 border-blue-500/40";
};

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("financial_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error("تعذّر تحميل سجل التدقيق");
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const entityTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity_type).filter(Boolean))) as string[],
    [rows],
  );
  const actionTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (entity !== "all" && r.entity_type !== entity) return false;
      if (action !== "all" && r.action !== action) return false;
      if (
        q &&
        !`${r.action} ${r.entity_type ?? ""} ${r.entity_id ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, q, entity, action]);

  const exportCsv = () => {
    const header = ["created_at", "action", "entity_type", "entity_id", "user_id"];
    const csv = [
      "\uFEFF" + header.join(","),
      ...filtered.map((r) =>
        [r.created_at, r.action, r.entity_type ?? "", r.entity_id ?? "", r.user_id ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">سجل التدقيق</h1>
              <p className="text-xs text-muted-foreground">
                {filtered.length.toLocaleString("ar-EG")} حدث من إجمالي{" "}
                {rows.length.toLocaleString("ar-EG")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث"}
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 ml-1" />
              تصدير CSV
            </Button>
          </div>
        </div>

        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في العمليات والكيانات…"
              className="h-8 text-xs pr-7"
            />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الكيانات</SelectItem>
              {entityTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل العمليات</SelectItem>
              {actionTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin ml-2" /> جارٍ التحميل…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              لا توجد أحداث مطابقة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">العملية</TableHead>
                    <TableHead className="text-right">الكيان</TableHead>
                    <TableHead className="text-right">المعرّف</TableHead>
                    <TableHead className="text-right w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 500).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${actionTone(r.action)}`}
                        >
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.entity_type ?? "—"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">
                        {r.entity_id?.slice(0, 8) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelected(r)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 500 && (
                <div className="text-center py-2 text-[11px] text-muted-foreground border-t">
                  عرض أول 500 صف — استخدم التصفية لتضييق النتائج.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={actionTone(selected?.action ?? "")}>
                {selected?.action}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {selected?.entity_type} · {selected?.entity_id?.slice(0, 8)}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-muted-foreground mb-1">التاريخ</div>
                  <div className="font-mono">
                    {format(new Date(selected.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">المستخدم</div>
                  <div className="font-mono">{selected.user_id ?? "—"}</div>
                </div>
              </div>
              {selected.before_state && (
                <div>
                  <div className="text-muted-foreground mb-1">الحالة قبل</div>
                  <pre className="bg-muted/40 p-3 rounded overflow-x-auto text-[10px] leading-relaxed">
                    {JSON.stringify(selected.before_state, null, 2)}
                  </pre>
                </div>
              )}
              {selected.after_state && (
                <div>
                  <div className="text-muted-foreground mb-1">الحالة بعد</div>
                  <pre className="bg-muted/40 p-3 rounded overflow-x-auto text-[10px] leading-relaxed">
                    {JSON.stringify(selected.after_state, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
