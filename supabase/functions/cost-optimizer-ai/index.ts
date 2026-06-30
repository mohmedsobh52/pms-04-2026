// AI Cost Optimizer — produces structured optimization suggestions for
// a list of cost analysis items. Uses Lovable AI Gateway with tool-calling
// to return strict JSON.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InItem {
  id: string;
  name: string;
  dailyProductivity: number;
  dailyRent: number;
  costPerUnit: number;
}

interface OutSuggestion {
  itemId: string;
  category: "productivity" | "rent" | "waste" | "scope" | "risk" | "other";
  severity: "low" | "medium" | "high";
  title: string;
  rationale: string;
  suggestedProductivity?: number | null;
  suggestedRent?: number | null;
  estimatedSavingPct?: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, currency, wastePct, adminPct, language } =
      (await req.json()) as {
        items: InItem[];
        currency?: string;
        wastePct?: number;
        adminPct?: number;
        language?: "ar" | "en";
      };

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const isAr = language !== "en";
    const systemPrompt = isAr
      ? `أنت خبير تحليل تكاليف إنشاءات. حلّل بنود التكلفة المُعطاة واقترح فرص تحسين عملية. لكل بند ذو قيمة، أعد اقتراحاً واحداً على الأكثر مع تصنيف وشدة وسبب مختصر باللغة العربية. عند الاقتراح لإنتاجية أو إيجار جديد، أعد قيماً رقمية معقولة (±30% كحد أقصى عن الحالي). لا تخترع بنوداً غير موجودة.`
      : `You are a senior construction cost analyst. Review the given items and propose actionable optimizations. Return at most ONE suggestion per item, with a clear category, severity, and concise rationale. When recommending new productivity or rent, stay within ±30% of current values. Never invent items.`;

    const payload = {
      currency: currency || "SAR",
      wastePct: wastePct ?? 0,
      adminPct: adminPct ?? 0,
      items: items.slice(0, 80).map((it) => ({
        id: it.id,
        name: it.name,
        productivity: it.dailyProductivity,
        rent: it.dailyRent,
        costPerUnit: it.costPerUnit,
      })),
    };

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Analyze these cost items and submit suggestions:\n" +
            JSON.stringify(payload),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_suggestions",
            description: "Submit cost optimization suggestions.",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      itemId: { type: "string" },
                      category: {
                        type: "string",
                        enum: ["productivity", "rent", "waste", "scope", "risk", "other"],
                      },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      title: { type: "string" },
                      rationale: { type: "string" },
                      suggestedProductivity: { type: ["number", "null"] },
                      suggestedRent: { type: ["number", "null"] },
                      estimatedSavingPct: { type: ["number", "null"] },
                    },
                    required: ["itemId", "category", "severity", "title", "rationale"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_suggestions" } },
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
        JSON.stringify({ error: "تم تجاوز حد الطلبات. حاول مجدداً بعد قليل." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "نفد رصيد الذكاء الاصطناعي. يرجى إعادة الشحن." }),
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
    let suggestions: OutSuggestion[] = [];
    if (call) {
      try {
        const args = JSON.parse(call.function.arguments);
        if (Array.isArray(args.suggestions)) suggestions = args.suggestions;
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cost-optimizer-ai error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
