// AI Project Risk Analyzer — analyzes a saved project's BOQ + metadata and
// produces a comprehensive risk register (schedule, cost, technical, external,
// commercial, HSE, procurement, quality) with probability/impact scores and
// mitigation strategies. Uses Lovable AI Gateway with tool-calling.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface InProject {
  projectId: string;
  language?: "ar" | "en";
}

interface OutRisk {
  risk_title: string;
  risk_description: string;
  category:
    | "schedule"
    | "cost"
    | "technical"
    | "external"
    | "commercial"
    | "hse"
    | "procurement"
    | "quality"
    | "resource"
    | "regulatory"
    | "financial"
    | "environmental"
    | "general";
  probability_score: number; // 1..5
  impact_score: number; // 1..5
  mitigation_strategy: string;
  contingency_plan: string;
  risk_owner: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, language } = (await req.json()) as InProject;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Fetch project + items server-side using service role
    const [projRes, itemsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/saved_projects?id=eq.${projectId}&select=id,name,file_name,analysis_data,wbs_data`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/project_items?project_id=eq.${projectId}&select=item_number,description,unit,quantity,unit_price,total_price,category&limit=300`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
      ),
    ]);

    const projArr = await projRes.json();
    const items = await itemsRes.json();
    const project = Array.isArray(projArr) ? projArr[0] : null;
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAr = language !== "en";
    const totalValue = (items ?? []).reduce(
      (s: number, it: any) => s + (Number(it.total_price) || 0),
      0,
    );
    const categories = Array.from(
      new Set((items ?? []).map((i: any) => i.category).filter(Boolean)),
    );

    const riskCategories = [
      "schedule",
      "cost",
      "technical",
      "external",
      "commercial",
      "hse",
      "procurement",
      "quality",
      "resource",
      "regulatory",
      "financial",
      "environmental",
      "general",
    ];

    const systemPrompt = isAr
      ? `أنت خبير إدارة مخاطر مشاريع إنشائية معتمد PMP-RMP. حلّل بيانات المشروع المرفقة (المسمى، البنود، القيمة، التصنيفات، البيانات التحليلية) وأصدر سجل مخاطر شامل ومتوازن يغطي: الجدول الزمني، التكلفة، الفنية، الخارجية، التجارية، السلامة، المشتريات، الجودة، الموارد، التنظيمية، المالية، والبيئية. لكل مخاطرة قدّم: عنوان مختصر، وصف واضح، احتمالية (1-5)، تأثير (1-5)، خطة تخفيف عملية، خطة طوارئ، ومسؤول مقترح (دور وظيفي). أصدر 8 إلى 15 مخاطرة عالية الجودة، مع تنوع الفئات، ولا تكرر نفس المخاطرة بصياغات مختلفة.`
      : `You are a certified PMP-RMP construction risk manager. Analyze the attached project data (name, BOQ items, total value, categories, analysis data) and produce a comprehensive, balanced risk register covering: schedule, cost, technical, external, commercial, HSE, procurement, quality, resource, regulatory, financial, environmental. For each risk provide: concise title, clear description, probability (1-5), impact (1-5), practical mitigation strategy, contingency plan, and suggested owner (functional role). Return 8 to 15 high-quality risks with category diversity — never repeat the same risk with different wording.`;

    const payload = {
      project_name: project.name,
      total_value: totalValue,
      items_count: items?.length ?? 0,
      categories,
      sample_items: (items ?? []).slice(0, 40).map((i: any) => ({
        n: i.item_number,
        d: i.description,
        u: i.unit,
        q: i.quantity,
        p: i.total_price,
        c: i.category,
      })),
      analysis: project.analysis_data ?? null,
    };

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            (isAr ? "حلّل بيانات المشروع التالية وأصدر سجل المخاطر:\n" : "Analyze this project and produce the risk register:\n") +
            JSON.stringify(payload).slice(0, 30000),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_risks",
            description: "Submit the comprehensive project risk register.",
            parameters: {
              type: "object",
              properties: {
                risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      risk_title: { type: "string" },
                      risk_description: { type: "string" },
                      category: { type: "string", enum: riskCategories },
                      probability_score: { type: "integer", minimum: 1, maximum: 5 },
                      impact_score: { type: "integer", minimum: 1, maximum: 5 },
                      mitigation_strategy: { type: "string" },
                      contingency_plan: { type: "string" },
                      risk_owner: { type: "string" },
                    },
                    required: [
                      "risk_title",
                      "risk_description",
                      "category",
                      "probability_score",
                      "impact_score",
                      "mitigation_strategy",
                      "contingency_plan",
                      "risk_owner",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["risks"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_risks" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز حد الطلبات. حاول مجدداً بعد قليل." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "نفد رصيد الذكاء الاصطناعي." }),
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
    let risks: OutRisk[] = [];
    if (call) {
      try {
        const args = JSON.parse(call.function.arguments);
        if (Array.isArray(args.risks)) risks = args.risks;
      } catch (e) {
        console.error("parse error", e);
      }
    }

    // Compute derived risk_score p×i
    const enriched = risks.map((r) => ({
      ...r,
      risk_score: (r.probability_score || 3) * (r.impact_score || 3),
    }));

    return new Response(
      JSON.stringify({
        risks: enriched,
        project: { id: project.id, name: project.name },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-project-risks error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
