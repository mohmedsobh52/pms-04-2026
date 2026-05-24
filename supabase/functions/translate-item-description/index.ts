// Edge function: translate one or many BOQ item texts using Lovable AI Gateway
// Backwards compatible:
//   - Single mode:  { description, targetLanguage } -> { translated }
//   - Batch mode:   { items: [{ id, fields: { description, notes, category } }], targetLanguage } -> { results: [{ id, fields: {...} }] }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function translateOne(text: string, target: "Arabic" | "English"): Promise<string> {
  const systemPrompt = `You are a professional translator specialized in construction BOQ (Bill of Quantities) and civil engineering terminology. Translate the user's text into ${target}. Preserve technical terms, numbers, units, and meaning. Return ONLY the translated text — no quotes, no explanations, no prefixes.`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err: any = new Error(`AI gateway error: ${errText}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || "").toString().trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const targetLanguage = body?.targetLanguage === "ar" ? "Arabic" : "English";

    // ---------- BATCH MODE ----------
    if (Array.isArray(body?.items)) {
      const items: Array<{ id: string; fields: Record<string, string> }> = body.items;
      const results: Array<{ id: string; fields: Record<string, string>; error?: string }> = [];

      // Sequential to avoid burst-rate limits on large BOQs
      for (const it of items) {
        const outFields: Record<string, string> = {};
        try {
          for (const [fieldName, original] of Object.entries(it.fields || {})) {
            const text = (original || "").toString().trim();
            if (!text) {
              outFields[fieldName] = "";
              continue;
            }
            outFields[fieldName] = await translateOne(text, targetLanguage);
          }
          results.push({ id: it.id, fields: outFields });
        } catch (e: any) {
          if (e?.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again later.", partial: results }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          if (e?.status === 402) {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted. Please add credits.", partial: results }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          results.push({ id: it.id, fields: outFields, error: e?.message || String(e) });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- SINGLE MODE (legacy) ----------
    const description: string = body?.description;
    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "Missing description" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const translated = await translateOne(description, targetLanguage);
      return new Response(JSON.stringify({ translated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      if (e?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (e?.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
