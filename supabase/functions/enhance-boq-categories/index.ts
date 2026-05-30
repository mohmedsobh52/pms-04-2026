// Edge function: bulk-enhance BOQ item categories using Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BOQItem {
  item_number?: string;
  description?: string;
  unit?: string;
  category?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, isArabic } = await req.json() as { items: BOQItem[]; isArabic?: boolean };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = isArabic
      ? `أنت خبير تصنيف بنود جداول الكميات الإنشائية. صنّف كل بند ضمن فئة واحدة دقيقة (مثل: أعمال ترابية، خرسانة، حدادة، عزل، تشطيبات، كهرباء، صحية، ميكانيكا، تكييف، طرق، أعمال خشبية، ألمنيوم، دهانات، أعمال خارجية، احتياطي، ... إلخ). أعد JSON فقط بهذا الشكل: {"items":[{"item_number":"...","category":"..."}]}`
      : `You are an expert in construction BOQ classification. Assign each item a single precise category (e.g. Earthworks, Concrete, Rebar, Insulation, Finishes, Electrical, Plumbing, Mechanical, HVAC, Roads, Carpentry, Aluminum, Painting, External Works, Provisional, etc.). Return ONLY JSON: {"items":[{"item_number":"...","category":"..."}]}`;

    // Chunk items to keep the prompt small (max ~80 per call)
    const CHUNK = 80;
    const updates: Record<string, string> = {};

    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK).map((it, idx) => ({
        item_number: it.item_number || `__${i + idx}`,
        description: (it.description || "").slice(0, 240),
        unit: it.unit || "",
      }));

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify({ items: chunk }) },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${errText}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content || "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { parsed = {}; }
      const resultItems: any[] = Array.isArray(parsed.items) ? parsed.items : [];
      for (const r of resultItems) {
        if (r?.item_number && r?.category) {
          updates[String(r.item_number)] = String(r.category);
        }
      }
    }

    const enhanced = items.map((it) => {
      const key = String(it.item_number || "");
      return { ...it, category: updates[key] || it.category || (isArabic ? "غير مصنف" : "Uncategorized") };
    });

    // Distinct categories summary
    const categoryCounts: Record<string, number> = {};
    for (const it of enhanced) {
      const c = it.category || "";
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    }

    return new Response(JSON.stringify({ items: enhanced, categoryCounts, updatedCount: Object.keys(updates).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
