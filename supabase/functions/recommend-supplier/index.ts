// Recommends the best supplier for a given item from a list of offers,
// using Lovable AI Gateway with Gemini.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Offer {
  supplier: string;
  unitPrice: number;
  unit?: string;
  date?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { itemDescription, offers, isArabic } = (await req.json()) as {
      itemDescription: string;
      offers: Offer[];
      isArabic?: boolean;
    };

    if (!itemDescription || !Array.isArray(offers) || offers.length === 0) {
      return new Response(JSON.stringify({ error: "missing_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sorted = [...offers].sort((a, b) => a.unitPrice - b.unitPrice);
    const best = sorted[0];
    const avg = sorted.reduce((s, o) => s + o.unitPrice, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)].unitPrice;

    const systemPrompt = isArabic
      ? `أنت خبير مشتريات. حلّل عروض الموردين للبند المعطى وأوصِ بأفضل اختيار. خذ في الاعتبار: السعر، تاريخ العرض (الأحدث أفضل)، اتساق السعر مع المتوسط (مشكوك فيه إذا كان أقل من 50% من المتوسط — قد يكون خطأ)، وملاحظات المورد. اكتب التوصية بالعربية في فقرة موجزة (3-4 جمل).`
      : `You are a procurement expert. Analyze supplier offers for the given item and recommend the best choice. Consider: price, offer date (newer is better), price consistency with the average (suspicious if <50% of average — possible error), and supplier notes. Write the recommendation in a brief paragraph (3-4 sentences).`;

    const userPayload = {
      item: itemDescription,
      stats: { lowest: best.unitPrice, average: Math.round(avg), median },
      offers: sorted.slice(0, 10),
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
    });

    if (resp.status === 429)
      return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      throw new Error("AI error");
    }

    const data = await resp.json();
    const recommendation = data?.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        recommendation,
        bestSupplier: best.supplier,
        bestPrice: best.unitPrice,
        avgPrice: Math.round(avg),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recommend-supplier error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
