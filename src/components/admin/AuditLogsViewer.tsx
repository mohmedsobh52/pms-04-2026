import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/data-table/DataTable";

const ACTIONS = ["create", "update", "approve", "lock", "unlock", "delete", "advance",
  "workflow_approved", "workflow_rejected", "workflow_cancelled"];

type Log = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  metadata: any;
  created_at: string;
};

export function AuditLogsViewer() {
  const { isArabic } = useLanguage();
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", action, entity, from, to],
    queryFn: async (): Promise<Log[]> => {
      let q = supabase
        .from("financial_audit_logs")
        .select("id,action,entity_type,entity_id,user_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (action !== "all") q = q.eq("action", action);
      if (entity) q = q.ilike("entity_type", `%${entity}%`);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", new Date(new Date(to).getTime() + 864e5).toISOString());
      const { data } = await q;
      return (data ?? []) as Log[];
    },
  });

  const columns = useMemo<ColumnDef<Log, unknown>[]>(() => [
    {
      accessorKey: "created_at",
      header: isArabic ? "التاريخ" : "Date",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
      size: 170,
    },
    {
      accessorKey: "action",
      header: isArabic ? "الإجراء" : "Action",
      cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
      size: 140,
    },
    {
      accessorKey: "entity_type",
      header: isArabic ? "الكيان" : "Entity",
      size: 160,
    },
    {
      accessorKey: "entity_id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-[10px]" title={row.original.entity_id ?? ""}>
          {row.original.entity_id?.slice(0, 8) ?? "—"}…
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: "user_id",
      header: isArabic ? "المستخدم" : "User",
      cell: ({ row }) => (
        <span className="font-mono text-[10px]" title={row.original.user_id ?? ""}>
          {row.original.user_id?.slice(0, 8) ?? "—"}…
        </span>
      ),
      size: 90,
    },
    {
      id: "metadata",
      header: isArabic ? "تفاصيل" : "Details",
      cell: ({ row }) => (
        <code className="text-[10px] text-muted-foreground line-clamp-1 block max-w-[280px]">
          {row.original.metadata ? JSON.stringify(row.original.metadata) : "—"}
        </code>
      ),
    },
  ], [isArabic]);

  const onExport = (rows: Log[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Date: new Date(r.created_at).toISOString(),
      Action: r.action,
      Entity: r.entity_type,
      EntityID: r.entity_id,
      UserID: r.user_id,
      Metadata: r.metadata ? JSON.stringify(r.metadata) : "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Audit");
    XLSX.writeFile(wb, `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{isArabic ? "سجل التدقيق" : "Audit Logs"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-[200px]" placeholder={isArabic ? "نوع الكيان" : "Entity type"}
            value={entity} onChange={(e) => setEntity(e.target.value)} />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل الإجراءات" : "All actions"}</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="max-w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)}
            placeholder={isArabic ? "من" : "From"} />
          <Input type="date" className="max-w-[160px]" value={to} onChange={(e) => setTo(e.target.value)}
            placeholder={isArabic ? "إلى" : "To"} />
        </div>

        <DataTable<Log, unknown>
          columns={columns}
          data={data ?? []}
          storageKey="audit-logs"
          searchPlaceholder={isArabic ? "بحث…" : "Search…"}
          onExport={onExport}
          pagination={false}
          virtualizeThreshold={50}
          emptyState={isLoading ? (isArabic ? "جارٍ التحميل…" : "Loading…")
            : (isArabic ? "لا توجد سجلات" : "No logs")}
        />
      </CardContent>
    </Card>
  );
}
