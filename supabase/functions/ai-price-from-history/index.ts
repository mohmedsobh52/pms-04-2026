// AI-assisted pricing using the user's own historical pricing files AND
// previously analyzed price quotations as the candidate pool.
// Returns a best-match suggestion per BOQ item with confidence + source.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InItem {
  id: string;
  description: string;
  unit?: string | null;
  category?: string | null;
}

type SourceKind = "historical" | "quotation";

interface Candidate {
  id: string; // synthetic id for AI matching
  desc: string;
  unit: string;
  unitPrice: number;
  source: SourceKind;
  sourceLabel: string; // e.g. "Project: Tower X (2024-05-12)" or "Supplier: Acme (2025-01-08)"
  sourceFileId: string; // historical_pricing_files.id OR price_quotations.id
}

interface OutMatch {
  itemId: string;
  candidateId: string | null;
  unitPrice: number | null;
  confidence: number;
  reason: string;
  source: SourceKind | null;
  sourceLabel: string | null;
  sourceFileId: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, isArabic } = (await req.json()) as {
      items: InItem[];
      isArabic?: boolean;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ matches: [], candidatesCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Authenticated client to honor RLS
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Gather candidates from historical_pricing_files
    const candidates: Candidate[] = [];

    const { data: histFiles } = await supabase
      .from("historical_pricing_files")
      .select("id, project_name, project_date, items, currency")
      .order("created_at", { ascending: false })
      .limit(60);

    for (const f of histFiles || []) {
      const arr = Array.isArray(f.items) ? f.items : [];
      for (let i = 0; i < arr.length; i++) {
        const it: any = arr[i];
        const price = Number(it?.unit_price ?? it?.unitPrice ?? 0);
        const desc = String(it?.description ?? it?.desc ?? "").trim();
        if (!desc || price <= 0) continue;
        candidates.push({
          id: `h_${f.id}_${i}`,
          desc,
          unit: String(it?.unit ?? ""),
          unitPrice: price,
          source: "historical",
          sourceLabel: `${f.project_name}${f.project_date ? " (" + f.project_date + ")" : ""}`,
          sourceFileId: f.id,
        });
      }
    }

    // 2) Gather candidates from analyzed price_quotations
    const { data: quotations } = await supabase
      .from("price_quotations")
      .select("id, supplier_name, quotation_date, ai_analysis, status")
      .eq("status", "analyzed")
      .order("created_at", { ascending: false })
      .limit(80);

    for (const q of quotations || []) {
      const analysis: any =
        typeof q.ai_analysis === "string"
          ? safeJson(q.ai_analysis)
          : q.ai_analysis;
      const arr = Array.isArray(analysis?.items) ? analysis.items : [];
      for (let i = 0; i < arr.length; i++) {
        const it: any = arr[i];
        const price = Number(it?.unit_price ?? it?.unitPrice ?? 0);
        const desc = String(it?.description ?? it?.desc ?? "").trim();
        if (!desc || price <= 0) continue;
        candidates.push({
          id: `q_${q.id}_${i}`,
          desc,
          unit: String(it?.unit ?? ""),
          unitPrice: price,
          source: "quotation",
          sourceLabel: `${q.supplier_name || "Supplier"}${q.quotation_date ? " (" + q.quotation_date + ")" : ""}`,
          sourceFileId: q.id,
        });
      }
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], candidatesCount: 0, message: "no_candidates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Trim to most recent 600 candidates to keep prompt bounded.
    const trimmed = candidates.slice(0, 600);
    const candidateMap = new Map(trimmed.map((c) => [c.id, c]));

    // Slim payload for the model
    const aiCandidates = trimmed.map((c) => ({
      id: c.id,
      d: c.desc.slice(0, 220),
      u: c.unit,
      p: c.unitPrice,
      s: c.source === "historical" ? "h" : "q",
    }));

    const systemPrompt = isArabic
      ? `أنت خبير تسعير BOQ. لكل بند، اختر أفضل عنصر مطابق من مكتبة مرشحين مأخوذة من تسعيرات سابقة للمستخدم وعروض موردين سابقة. قيّم الثقة 0-100. ضع ثقة ≥95 فقط عند التطابق شبه المؤكد (نفس المعنى والوحدة). إن لم يوجد تطابق مناسب، أعد candidateId=null وconfidence=0. أعد سبباً مختصراً.`
      : `You are a BOQ pricing expert. For each item, choose the SINGLE best candidate from the user's prior priced projects and supplier quotations. Score confidence 0-100. Only give ≥95 when the match is virtually certain (same meaning + unit). If nothing matches, return candidateId=null and confidence=0. Always give a short reason.`;

    const CHUNK = 30;
    const allMatches: OutMatch[] = [];

    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      const body = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Match each item to ONE candidate. Output one row per item, null if no real match.\n\n" +
              JSON.stringify({
                items: chunk.map((it) => ({
                  id: it.id,
                  d: it.description,
                  u: it.unit || "",
                  c: it.category || "",
                })),
                candidates: aiCandidates,
              }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_matches",
              description: "Submit best candidate per item.",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string" },
                        candidateId: { type: ["string", "null"] },
                        confidence: { type: "number", minimum: 0, maximum: 100 },
                        reason: { type: "string" },
                      },
                      required: ["itemId", "candidateId", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_matches" } },
      };

      const resp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI gateway error", resp.status, t);
        continue;
      }

      const data = await resp.json();
      const call = data?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) continue;
      try {
        const args = JSON.parse(call.function.arguments);
        if (!Array.isArray(args.matches)) continue;
        for (const m of args.matches) {
          const cand = m.candidateId ? candidateMap.get(m.candidateId) : null;
          allMatches.push({
            itemId: m.itemId,
            candidateId: m.candidateId ?? null,
            unitPrice: cand ? cand.unitPrice : null,
            confidence: Number(m.confidence) || 0,
            reason: String(m.reason || ""),
            source: cand ? cand.source : null,
            sourceLabel: cand ? cand.sourceLabel : null,
            sourceFileId: cand ? cand.sourceFileId : null,
          });
        }
      } catch (e) {
        console.error("parse tool args failed", e);
      }
    }

    return new Response(
      JSON.stringify({ matches: allMatches, candidatesCount: trimmed.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-price-from-history error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
