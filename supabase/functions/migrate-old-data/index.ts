// Edge function: Migrates rows from an old Supabase project to the current one
// Uses service_role keys on both sides; only callable by authenticated users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tables that can be safely migrated. Order matters for FK dependencies.
const MIGRATABLE_TABLES = [
  "saved_projects",
  "project_data",
  "project_items",
  "item_costs",
  "item_pricing_details",
  "edited_boq_prices",
  "boq_templates",
  "historical_pricing_files",
  "material_prices",
  "labor_rates",
  "equipment_rates",
  "external_partners",
  "partner_contracts",
  "partner_performance",
  "partner_reviews",
  "contracts",
  "contract_milestones",
  "contract_payments",
  "contract_warranties",
  "contract_alert_settings",
  "maintenance_schedules",
  "cost_analysis",
  "cost_benefit_analysis",
  "comparison_reports",
  "attachment_folders",
  "evm_alert_settings",
  "ocr_extracted_texts",
  "offer_requests",
  "analysis_jobs",
];

const PAGE_SIZE = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const OLD_URL = Deno.env.get("OLD_SUPABASE_URL");
    const OLD_KEY = Deno.env.get("OLD_SUPABASE_SERVICE_ROLE_KEY");
    const NEW_URL = Deno.env.get("SUPABASE_URL");
    const NEW_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: verify caller is signed in
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(NEW_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: userErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse body: { tables?: string[], dryRun?: boolean, remapUserId?: boolean }
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const requested: string[] = Array.isArray(body.tables) && body.tables.length > 0
      ? body.tables.filter((t: string) => MIGRATABLE_TABLES.includes(t))
      : MIGRATABLE_TABLES;
    const dryRun = body.dryRun === true;
    const remapUserId = body.remapUserId !== false; // default true

    const oldClient = createClient(OLD_URL, OLD_KEY, {
      auth: { persistSession: false },
    });
    const newClient = createClient(NEW_URL, NEW_KEY, {
      auth: { persistSession: false },
    });

    const results: Record<string, any> = {};

    for (const table of requested) {
      const tableResult = {
        fetched: 0,
        inserted: 0,
        skipped: 0,
        errors: [] as string[],
      };

      try {
        let from = 0;
        // Paginate through old table
        while (true) {
          const { data: rows, error: fetchErr } = await oldClient
            .from(table)
            .select("*")
            .range(from, from + PAGE_SIZE - 1);

          if (fetchErr) {
            tableResult.errors.push(`fetch: ${fetchErr.message}`);
            break;
          }
          if (!rows || rows.length === 0) break;
          tableResult.fetched += rows.length;

          if (!dryRun) {
            // Optionally remap user_id of all rows to current user
            const prepared = rows.map((r: any) => {
              if (remapUserId && "user_id" in r && r.user_id) {
                return { ...r, user_id: userId };
              }
              return r;
            });

            const { error: insertErr, count } = await newClient
              .from(table)
              .upsert(prepared, { onConflict: "id", ignoreDuplicates: true, count: "exact" });

            if (insertErr) {
              tableResult.errors.push(`insert: ${insertErr.message}`);
            } else {
              tableResult.inserted += count ?? prepared.length;
            }
          }

          if (rows.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
      } catch (e: any) {
        tableResult.errors.push(`exception: ${e?.message ?? String(e)}`);
      }

      results[table] = tableResult;
    }

    return new Response(
      JSON.stringify({ success: true, dryRun, userId, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("migrate-old-data error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
