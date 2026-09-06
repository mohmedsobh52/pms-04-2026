import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function toCsv(headers: string[], rows: unknown[][]) {
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

function nextRun(type: string, day: number, hour: number): string {
  const next = new Date();
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(hour);
  if (type === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (type === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1, Math.min(day || 1, 28));
  return next.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  try {
    let onlyId: string | null = null;
    try {
      const body = await req.json();
      onlyId = body?.report_id ?? null;
    } catch { /* cron calls with no body */ }

    let q = supabase.from("scheduled_reports").select("*").eq("is_active", true);
    if (onlyId) q = q.eq("id", onlyId);
    else q = q.or(`next_scheduled_at.is.null,next_scheduled_at.lte.${new Date().toISOString()}`);

    const { data: reports, error } = await q.limit(50);
    if (error) throw error;

    const results: Record<string, string> = {};

    for (const r of reports ?? []) {
      try {
        // Build CSV payload
        let headers: string[] = [];
        let rows: unknown[][] = [];
        let scopeName = "";

        if (r.project_id) {
          const { data: proj } = await supabase
            .from("saved_projects").select("name").eq("id", r.project_id).maybeSingle();
          scopeName = proj?.name ?? "";
          const { data: items } = await supabase
            .from("project_items")
            .select("item_number, description, unit, quantity, unit_price, total_price, category")
            .eq("project_id", r.project_id).limit(5000);
          headers = ["Item", "Description", "Unit", "Quantity", "Unit price", "Total price", "Category"];
          rows = (items ?? []).map((i: any) => [
            i.item_number, i.description, i.unit, i.quantity, i.unit_price, i.total_price, i.category,
          ]);
        } else {
          const { data: claims } = await supabase
            .from("claims")
            .select("claim_number, title, status, priority, claimed_amount, approved_amount, response_due_date")
            .eq("user_id", r.user_id).limit(5000);
          headers = ["Claim", "Title", "Status", "Priority", "Claimed", "Approved", "Due"];
          rows = (claims ?? []).map((c: any) => [
            c.claim_number, c.title, c.status, c.priority, c.claimed_amount, c.approved_amount, c.response_due_date,
          ]);
        }

        const csv = toCsv(headers, rows);
        const fileName = `${r.report_name.replace(/[^\w\u0600-\u06FF-]+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
        const channel = r.delivery_channel ?? "email";
        const sentTo: string[] = [];

        if ((channel === "email" || channel === "both") && RESEND_API_KEY && (r.recipient_emails ?? []).length) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Reports <onboarding@resend.dev>",
              to: r.recipient_emails,
              subject: `📊 ${r.report_name}${scopeName ? ` — ${scopeName}` : ""}`,
              html: `<div style="font-family:Arial,sans-serif"><h2>${r.report_name}</h2>
                <p>${scopeName ? `Project: ${scopeName}<br/>` : ""}Rows: ${rows.length}</p>
                <p>The full report is attached as CSV.</p></div>`,
              attachments: [{ filename: fileName, content: btoa(unescape(encodeURIComponent(csv))) }],
            }),
          });
          if (!res.ok) throw new Error(`Resend: ${await res.text()}`);
          sentTo.push(...r.recipient_emails);
        }

        if (channel === "in_app" || channel === "both") {
          await supabase.from("notifications").insert({
            recipient_id: r.user_id,
            type: "report.scheduled",
            severity: "info",
            title: `تقرير مجدول: ${r.report_name}`,
            body: `${rows.length} سجل${scopeName ? ` — ${scopeName}` : ""}`,
            link: r.project_id ? `/projects/${r.project_id}` : "/claims/reports",
            related_entity_type: "scheduled_report",
            related_entity_id: r.id,
            project_id: r.project_id,
            dedup_key: `sched_report:${r.id}:${new Date().toISOString().slice(0, 13)}`,
          });
        }

        await supabase.from("scheduled_reports").update({
          last_sent_at: new Date().toISOString(),
          next_scheduled_at: nextRun(r.schedule_type, r.schedule_day, r.schedule_hour ?? 9),
          last_run_status: `ok:${rows.length} rows${sentTo.length ? `, email x${sentTo.length}` : ""}`,
        }).eq("id", r.id);

        results[r.id] = "ok";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("scheduled report failed", r.id, msg);
        await supabase.from("scheduled_reports")
          .update({ last_run_status: `error: ${msg.slice(0, 200)}` }).eq("id", r.id);
        results[r.id] = `error: ${msg}`;
      }
    }

    return new Response(JSON.stringify({ processed: (reports ?? []).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
