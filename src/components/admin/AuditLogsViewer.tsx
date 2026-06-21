import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const ACTIONS = ["create", "update", "approve", "lock", "unlock", "delete"];

export function AuditLogsViewer() {
  const { isArabic } = useLanguage();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>("all");
  const [entity, setEntity] = useState("");

  const filters: any[] = [];
  if (action !== "all") filters.push({ column: "action", op: "eq", value: action });
  if (entity) filters.push({ column: "entity_type", op: "ilike", value: `%${entity}%` });

  const { data, isLoading } = usePaginatedQuery<any>({
    table: "financial_audit_logs",
    select: "id,action,entity_type,entity_id,user_id,metadata,created_at",
    filters,
    orderBy: { column: "created_at", ascending: false },
    page, pageSize: 25,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{isArabic ? "سجل التدقيق" : "Audit Logs"}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-[220px]" placeholder={isArabic ? "نوع الكيان" : "Entity type"} value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} />
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "كل الإجراءات" : "All actions"}</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/40">
              <th className="text-start p-2">{isArabic ? "التاريخ" : "Date"}</th>
              <th className="text-start p-2">{isArabic ? "الإجراء" : "Action"}</th>
              <th className="text-start p-2">{isArabic ? "الكيان" : "Entity"}</th>
              <th className="text-start p-2">{isArabic ? "المعرّف" : "ID"}</th>
              <th className="text-start p-2">{isArabic ? "المستخدم" : "User"}</th>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-6 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>}
              {(data?.rows ?? []).map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2"><Badge variant="outline">{r.action}</Badge></td>
                  <td className="p-2">{r.entity_type}</td>
                  <td className="p-2 font-mono text-[10px]">{r.entity_id?.slice(0, 8)}…</td>
                  <td className="p-2 font-mono text-[10px]">{r.user_id?.slice(0, 8)}…</td>
                </tr>
              ))}
              {!isLoading && data?.rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{isArabic ? "لا توجد سجلات" : "No logs"}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{isArabic ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`} · {data?.total ?? 0} {isArabic ? "سجل" : "records"}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
