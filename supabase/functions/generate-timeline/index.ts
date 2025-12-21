import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WBSItem {
  code: string;
  title: string;
  level: number;
  parent_code?: string;
  items: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wbsData, projectName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating timeline for", wbsData.length, "WBS items");

    const systemPrompt = `أنت مهندس تخطيط مشاريع متخصص في تقدير مدد الأعمال الإنشائية.
مهمتك هي تحليل هيكل تقسيم العمل (WBS) وتقدير مدة كل مهمة بالأيام.

قواعد التقدير:
1. المهام من المستوى 1 (الرئيسية): عادة 20-60 يوم
2. المهام من المستوى 2 (الفرعية): عادة 7-21 يوم
3. المهام من المستوى 3 (التفصيلية): عادة 3-10 أيام
4. خذ بعين الاعتبار التسلسل المنطقي للأعمال
5. بعض المهام يمكن أن تتداخل (تبدأ قبل انتهاء السابقة)

أعد النتيجة كـ JSON بالتنسيق:
{
  "timeline": [
    {
      "code": "كود المهمة",
      "startDay": رقم يوم البداية (يبدأ من 0),
      "duration": المدة بالأيام,
      "dependencies": ["أكواد المهام المعتمد عليها"]
    }
  ],
  "totalDuration": إجمالي مدة المشروع بالأيام,
  "notes": "ملاحظات عامة عن التقدير"
}`;

    const wbsDescription = wbsData.map((item: WBSItem) => 
      `${item.code}: ${item.title} (مستوى ${item.level}) - ${item.items.length} عناصر`
    ).join('\n');

    const userPrompt = `قم بتحليل هيكل تقسيم العمل التالي لمشروع "${projectName}" وتقدير المدد:

${wbsDescription}

أعطني تقديرات واقعية للمدد مع مراعاة:
- التسلسل المنطقي للأعمال
- التداخل الممكن بين المهام
- الموارد المتاحة عادة في مثل هذه المشاريع`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            timeline: generateFallbackTimeline(wbsData),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.log("No content, using fallback");
      return new Response(
        JSON.stringify({ timeline: generateFallbackTimeline(wbsData) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Gemini response:", content);

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { timeline: generateFallbackTimeline(wbsData) };
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-timeline:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        timeline: [],
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function generateFallbackTimeline(wbsData: WBSItem[]) {
  let currentDay = 0;
  return wbsData.map((item) => {
    const baseDuration = item.level === 1 ? 30 : item.level === 2 ? 14 : 7;
    const duration = baseDuration + (item.items.length * 2);
    const startDay = currentDay;
    
    if (item.level === 1) {
      currentDay += Math.max(duration * 0.8, 7);
    } else if (item.level === 2) {
      currentDay += Math.max(duration * 0.5, 5);
    }
    
    return {
      code: item.code,
      startDay: Math.round(startDay),
      duration,
      dependencies: item.parent_code ? [item.parent_code] : [],
    };
  });
}
