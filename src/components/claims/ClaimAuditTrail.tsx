import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Filter } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { CLAIM_STATUSES, ClaimEvent, claimLabel, downloadCsv } from "@/lib/claims";

export interface AuditRow extends ClaimEvent {
  claim_number?: string;
  claim_title?: string;
}

export const EVENT_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  status_change: { ar: "تغيير حالة", en: "Status change" },
  note: { ar: "ملاحظة", en: "Note" },
  assignment: { ar: "إسناد", en: "Assignment" },
  attachment: { ar: "مرفق", en: "Attachment" },
  workflow_decision: { ar: "قرار اعتماد", en: "Approval decision" },
  created: { ar: "إنشاء", en: "Created" },
  updated: { ar: "تعديل", en: "Updated" },
};

export const eventLabel = (t: string, isArabic: boolean) =>
  EVENT_TYPE_LABELS[t] ? EVENT_TYPE_LABELS[t][isArabic ? "ar" : "en"] : t;

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * Audit trail viewer with user / action / time filtering.
 * Used both inside a single claim and on the portfolio-wide audit page.
 */
export function ClaimAuditTrail({
  events,
  showClaim = false,
  userNames = {},
}: {
  events: AuditRow[];
  showClaim?: boolean;
  userNames?: Record<string, string>;
}) {
  const { isArabic } = useLanguage();
  const [type, setType] = useState("all");
  const [userId, setUserId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const userLabel = (id: string) => userNames[id] || `${id.slice(0, 8)}…`;

  const types = useMemo(
    () => Array.from(new Set(events.map((e) => e.event_type))).sort(),
    [events],
  );
  const users = useMemo(
    () => Array.from(new Set(events.map((e) => e.user_id).filter(Boolean))).sort(),
    [events],
  );

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (type !== "all" && e.event_type !== type) return false;
      if (userId !== "all" && e.user_id !== userId) return false;
      const d = e.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (q.trim()) {
        const hay = `${e.body ?? ""} ${e.claim_number ?? ""} ${e.claim_title ?? ""} ${e.event_type}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [events, type, userId, from, to, q]);

  const exportCsv = () => {
    const headers = isArabic
      ? ["التاريخ والوقت", "رقم المطالبة", "الإجراء", "من حالة", "إلى حالة", "المستخدم", "التفاصيل"]
      : ["Timestamp", "Claim", "Action", "From", "To", "User", "Details"];
    const rows = filtered.map((e) => [
      new Date(e.created_at).toISOString(),
      e.claim_number ?? "",
      eventLabel(e.event_type, isArabic),
      e.from_status ? claimLabel(CLAIM_STATUSES, e.from_status, isArabic) : "",
      e.to_status ? claimLabel(CLAIM_STATUSES, e.to_status, isArabic) : "",
      userLabel(e.user_id),
      e.body ?? "",
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    downloadCsv(csv, `claims-audit-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const reset = () => { setType("all"); setUserId("all"); setFrom(""); setTo(""); setQ(""); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {isArabic ? "تصفية" : "Filters"}
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder={isArabic ? "الإجراء" : "Action"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? "كل الإجراءات" : "All actions"}</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{eventLabel(t, isArabic)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder={isArabic ? "المستخدم" : "User"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? "كل المستخدمين" : "All users"}</SelectItem>
            {users.map((u) => (
              <SelectItem key={u} value={u}>{userLabel(u)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 w-[150px]"
          placeholder="yyyy-MM-dd"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 w-[150px]"
          placeholder="yyyy-MM-dd"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isArabic ? "بحث في التفاصيل..." : "Search details..."}
          className="h-9 w-[200px]"
        />
        <Button variant="ghost" size="sm" onClick={reset} className="h-9">
          {isArabic ? "مسح" : "Reset"}
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-9 gap-1.5">
          <Download className="h-4 w-4" />CSV
        </Button>
        <span className="text-xs text-muted-foreground ms-auto">
          {filtered.length} / {events.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {isArabic ? "لا توجد سجلات مطابقة" : "No matching records"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="flex gap-3 border-b border-border/50 pb-2 last:border-0">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{eventLabel(e.event_type, isArabic)}</Badge>
                  {showClaim && e.claim_number && (
                    <Link to={`/claims/${e.claim_id}`} className="text-xs text-primary hover:underline">
                      {e.claim_number}{e.claim_title ? ` — ${e.claim_title}` : ""}
                    </Link>
                  )}
                  {e.from_status && e.to_status && (
                    <span className="text-xs text-muted-foreground">
                      {claimLabel(CLAIM_STATUSES, e.from_status, isArabic)} → {claimLabel(CLAIM_STATUSES, e.to_status, isArabic)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">· {userLabel(e.user_id)}</span>
                  <span className="text-xs text-muted-foreground ms-auto">
                    {new Date(e.created_at).toLocaleString(isArabic ? "ar-SA" : "en-US")}
                  </span>
                </div>
                {e.body && <p className="text-sm mt-1 whitespace-pre-wrap">{e.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
