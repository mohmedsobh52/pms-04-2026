// AI-assisted Auto Pricing matcher
// Uses Lovable AI Gateway to match unpriced BOQ items against a price library
// with high accuracy (target ≥95% confidence). Tool-calling is used to get
// strict structured output.

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

interface InCandidate {
  id: string;
  name: string;
  name_ar?: string | null;
  unit?: string | null;
  category?: string | null;
  price: number;
  source: "library" | "labor" | "equipment";
}

interface OutMatch {
  itemId: string;
  candidateId: string | null;
  confidence: number; // 0-100
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, candidates, isArabic } = (await req.json()) as {
      items: InItem[];
      candidates: InCandidate[];
      isArabic?: boolean;
    };

    if (!Array.isArray(items) || !Array.isArray(candidates)) {
      return new Response(
        JSON.stringify({ error: "items[] and candidates[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    if (items.length === 0 || candidates.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trim candidate pool to keep prompt manageable (top 250 by description length).
    const trimmedCandidates = candidates.slice(0, 400).map((c) => ({
      id: c.id,
      n: c.name,
      a: c.name_ar || "",
      u: c.unit || "",
      cat: c.category || "",
      s: c.source,
    }));

    // Process items in chunks of 40 to keep each request small.
    const CHUNK = 40;
    const allMatches: OutMatch[] = [];

    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);

      const systemPrompt = isArabic
        ? `أنت خبير تسعير لبنود جداول الكميات (BOQ) في قطاع البناء. مهمتك مطابقة كل بند بأفضل عنصر من مكتبة الأسعار مع تقييم دقيق للثقة (0-100). راعِ: تطابق المعنى، الوحدة، الفئة، الأبعاد، نوع المادة. أعطِ ثقة ≥95 فقط عندما يكون التطابق شبه مؤكد. إذا لم يوجد تطابق مناسب، أعد candidateId=null وconfidence=0.`
        : `You are an expert construction BOQ pricing analyst. For each item, pick the SINGLE best matching candidate from the library and grade your confidence (0-100). Consider: semantic meaning, unit, category, dimensions, material type. Give confidence ≥95 ONLY when the match is virtually certain. If no candidate is a real match, return candidateId=null and confidence=0.`;

      const userPayload = {
        items: chunk.map((it) => ({
          id: it.id,
          desc: it.description,
          unit: it.unit || "",
          cat: it.category || "",
        })),
        candidates: trimmedCandidates,
      };

      const body = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Match each item to the best candidate. Return ONE result per item, even if no good match (use null + 0).\n\n" +
              JSON.stringify(userPayload),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_matches",
              description: "Submit best match per item with confidence.",
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
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI gateway error", resp.status, t);
        return new Response(
          JSON.stringify({ error: "AI gateway failed", detail: t }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await resp.json();
      const call = data?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) {
        console.error("No tool call in AI response", JSON.stringify(data).slice(0, 500));
        continue;
      }
      try {
        const args = JSON.parse(call.function.arguments);
        if (Array.isArray(args.matches)) allMatches.push(...args.matches);
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    return new Response(JSON.stringify({ matches: allMatches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-auto-price error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
