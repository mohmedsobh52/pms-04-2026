import { supabase } from "@/integrations/supabase/client";

export interface Claim {
  id: string;
  claim_number: string;
  title: string;
  description: string | null;
  claim_type: string;
  status: string;
  priority: string;
  claimed_amount: number;
  approved_amount: number;
  time_extension_days: number;
  currency: string;
  submitted_date: string | null;
  response_due_date: string | null;
  resolved_date: string | null;
  counterparty: string | null;
  notice_reference: string | null;
  contract_clause: string | null;
  root_cause: string | null;
  evidence_notes: string | null;
  contract_id: string | null;
  project_id: string | null;
  assignee: string | null;
  decision_notes: string | null;
  decided_at: string | null;
  tags: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClaimEvent {
  id: string;
  claim_id: string;
  user_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ClaimAttachment {
  id: string;
  claim_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  created_at: string;
}

export const CLAIM_STATUSES = [
  { value: "draft", ar: "مسودة", en: "Draft" },
  { value: "submitted", ar: "مقدمة", en: "Submitted" },
  { value: "under_review", ar: "قيد المراجعة", en: "Under review" },
  { value: "negotiation", ar: "تفاوض", en: "Negotiation" },
  { value: "approved", ar: "معتمدة", en: "Approved" },
  { value: "partially_approved", ar: "معتمدة جزئياً", en: "Partially approved" },
  { value: "rejected", ar: "مرفوضة", en: "Rejected" },
  { value: "closed", ar: "مغلقة", en: "Closed" },
];

export const CLAIM_TYPES = [
  { value: "cost", ar: "مطالبة مالية", en: "Cost" },
  { value: "eot", ar: "تمديد مدة", en: "Time extension (EOT)" },
  { value: "variation", ar: "أمر تغييري", en: "Variation" },
  { value: "acceleration", ar: "تسريع الأعمال", en: "Acceleration" },
  { value: "disruption", ar: "تعطيل الأعمال", en: "Disruption" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export const CLAIM_PRIORITIES = [
  { value: "low", ar: "منخفضة", en: "Low" },
  { value: "medium", ar: "متوسطة", en: "Medium" },
  { value: "high", ar: "عالية", en: "High" },
  { value: "critical", ar: "حرجة", en: "Critical" },
];

export const CLOSED_STATUSES = ["approved", "partially_approved", "rejected", "closed"];

/** Allowed forward transitions per status. */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["negotiation", "approved", "partially_approved", "rejected"],
  negotiation: ["approved", "partially_approved", "rejected"],
  approved: ["closed"],
  partially_approved: ["closed"],
  rejected: ["closed", "negotiation"],
  closed: [],
};

export const claimLabel = (
  list: { value: string; ar: string; en: string }[],
  v: string,
  isArabic: boolean,
) => (list.find((x) => x.value === v) || { ar: v, en: v })[isArabic ? "ar" : "en"];

export const claimStatusClass = (s: string) => {
  if (s === "approved" || s === "closed") return "bg-success/10 text-success border-success/20";
  if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "partially_approved") return "bg-accent/10 text-accent border-accent/20";
  if (s === "draft") return "bg-muted text-muted-foreground border-border";
  return "bg-warning/10 text-warning border-warning/20";
};

export type SlaLevel = "overdue" | "due_soon" | "on_track" | "missing" | "settled";

export interface SlaInfo {
  level: SlaLevel;
  days: number | null; // days remaining (negative = overdue)
}

export const DUE_SOON_DAYS = 7;

export function claimSla(c: Pick<Claim, "status" | "response_due_date">): SlaInfo {
  if (CLOSED_STATUSES.includes(c.status)) return { level: "settled", days: null };
  if (!c.response_due_date) return { level: "missing", days: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${c.response_due_date}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { level: "overdue", days };
  if (days <= DUE_SOON_DAYS) return { level: "due_soon", days };
  return { level: "on_track", days };
}

export const slaClass = (level: SlaLevel) => {
  switch (level) {
    case "overdue": return "bg-destructive/10 text-destructive border-destructive/20";
    case "due_soon": return "bg-warning/10 text-warning border-warning/20";
    case "missing": return "bg-muted text-muted-foreground border-border";
    case "settled": return "bg-success/10 text-success border-success/20";
    default: return "bg-primary/10 text-primary border-primary/20";
  }
};

export const slaText = (info: SlaInfo, isArabic: boolean) => {
  switch (info.level) {
    case "overdue":
      return isArabic ? `متأخرة ${Math.abs(info.days!)} يوم` : `Overdue ${Math.abs(info.days!)}d`;
    case "due_soon":
      return isArabic ? `تستحق خلال ${info.days} يوم` : `Due in ${info.days}d`;
    case "missing":
      return isArabic ? "بدون موعد رد" : "No due date";
    case "settled":
      return isArabic ? "مغلقة" : "Settled";
    default:
      return isArabic ? `متبقٍ ${info.days} يوم` : `${info.days}d left`;
  }
};

/** Days since submission (age) */
export function claimAgeDays(c: Pick<Claim, "submitted_date" | "created_at">): number | null {
  const base = c.submitted_date || c.created_at;
  if (!base) return null;
  const d = new Date(base.length <= 10 ? `${base}T00:00:00` : base);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

export async function logClaimEvent(input: {
  claim_id: string;
  user_id: string;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  body?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await (supabase.from("claim_events") as any).insert({
    claim_id: input.claim_id,
    user_id: input.user_id,
    event_type: input.event_type,
    from_status: input.from_status ?? null,
    to_status: input.to_status ?? null,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  });
  return error;
}

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Full CSV export with key fields, computed metrics and related project/contract info. */
export function buildClaimsCsv(
  claims: Claim[],
  opts: {
    isArabic: boolean;
    projectName: (id: string | null) => string;
    contractLabel?: (id: string | null) => string;
    variationsCount?: (claimId: string) => number;
  },
) {
  const { isArabic } = opts;
  const headers: [string, string][] = [
    ["claim_number", isArabic ? "رقم المطالبة" : "Claim number"],
    ["title", isArabic ? "العنوان" : "Title"],
    ["claim_type", isArabic ? "النوع" : "Type"],
    ["status", isArabic ? "الحالة" : "Status"],
    ["priority", isArabic ? "الأولوية" : "Priority"],
    ["assignee", isArabic ? "المسؤول" : "Assignee"],
    ["counterparty", isArabic ? "الطرف الآخر" : "Counterparty"],
    ["project", isArabic ? "المشروع" : "Project"],
    ["contract", isArabic ? "العقد / أمر التغيير" : "Contract / change order"],
    ["currency", isArabic ? "العملة" : "Currency"],
    ["claimed_amount", isArabic ? "المبلغ المطالب به" : "Claimed amount"],
    ["approved_amount", isArabic ? "المبلغ المعتمد" : "Approved amount"],
    ["variance_amount", isArabic ? "الفرق" : "Variance"],
    ["recovery_pct", isArabic ? "نسبة التحصيل %" : "Recovery %"],
    ["time_extension_days", isArabic ? "تمديد المدة (يوم)" : "EOT days"],
    ["submitted_date", isArabic ? "تاريخ التقديم" : "Submitted date"],
    ["response_due_date", isArabic ? "موعد الرد" : "Response due"],
    ["resolved_date", isArabic ? "تاريخ الإغلاق" : "Resolved date"],
    ["age_days", isArabic ? "عمر المطالبة (يوم)" : "Age (days)"],
    ["days_to_due", isArabic ? "الأيام حتى الاستحقاق" : "Days to due"],
    ["sla_status", isArabic ? "حالة الاستحقاق" : "SLA status"],
    ["cycle_time_days", isArabic ? "زمن الدورة (يوم)" : "Cycle time (days)"],
    ["notice_reference", isArabic ? "مرجع الإشعار" : "Notice reference"],
    ["contract_clause", isArabic ? "بند العقد" : "Contract clause"],
    ["root_cause", isArabic ? "السبب الجذري" : "Root cause"],
    ["tags", isArabic ? "الوسوم" : "Tags"],
    ["decision_notes", isArabic ? "ملاحظات القرار" : "Decision notes"],
    ["description", isArabic ? "الوصف" : "Description"],
    ["evidence_notes", isArabic ? "المستندات والأدلة" : "Evidence notes"],
    ["created_at", isArabic ? "تاريخ الإنشاء" : "Created at"],
    ["updated_at", isArabic ? "آخر تحديث" : "Updated at"],
  ];

  const rows = claims.map((c) => {
    const claimed = Number(c.claimed_amount || 0);
    const approved = Number(c.approved_amount || 0);
    const sla = claimSla(c);
    const cycle = c.submitted_date && c.resolved_date
      ? Math.round(
        (new Date(`${c.resolved_date}T00:00:00`).getTime()
          - new Date(`${c.submitted_date}T00:00:00`).getTime()) / 86400000,
      )
      : "";
    const values: Record<string, unknown> = {
      claim_number: c.claim_number,
      title: c.title,
      claim_type: claimLabel(CLAIM_TYPES, c.claim_type, isArabic),
      status: claimLabel(CLAIM_STATUSES, c.status, isArabic),
      priority: claimLabel(CLAIM_PRIORITIES, c.priority, isArabic),
      assignee: c.assignee || "",
      counterparty: c.counterparty || "",
      project: opts.projectName(c.project_id),
      contract: opts.contractLabel ? opts.contractLabel(c.contract_id) : (c.contract_id || ""),
      currency: c.currency,
      claimed_amount: claimed,
      approved_amount: approved,
      variance_amount: approved - claimed,
      recovery_pct: claimed ? ((approved / claimed) * 100).toFixed(1) : "",
      time_extension_days: c.time_extension_days || 0,
      submitted_date: c.submitted_date || "",
      response_due_date: c.response_due_date || "",
      resolved_date: c.resolved_date || "",
      age_days: claimAgeDays(c) ?? "",
      days_to_due: sla.days ?? "",
      sla_status: slaText(sla, isArabic),
      cycle_time_days: cycle,
      notice_reference: c.notice_reference || "",
      contract_clause: c.contract_clause || "",
      root_cause: c.root_cause || "",
      tags: (c.tags || []).join(" | "),
      decision_notes: c.decision_notes || "",
      description: c.description || "",
      evidence_notes: c.evidence_notes || "",
      created_at: c.created_at || "",
      updated_at: c.updated_at || "",
    };
    return headers.map(([k]) => esc(values[k])).join(",");
  });

  return "\uFEFF" + [headers.map(([, l]) => esc(l)).join(","), ...rows].join("\n");
}

export function downloadCsv(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
