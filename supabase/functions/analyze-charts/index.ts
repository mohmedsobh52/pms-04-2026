import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CategoryData {
  name: string;
  count: number;
  value: number;
}

interface AnalysisRequest {
  items: any[];
  summary?: any;
  categoryData: CategoryData[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, summary, categoryData } = await req.json() as AnalysisRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare data summary for AI
    const dataSummary = {
      totalItems: items.length,
      totalValue: summary?.total_value || 0,
      categories: categoryData.map(c => ({
        name: c.name,
        itemCount: c.count,
        totalValue: c.value,
        percentage: ((c.count / items.length) * 100).toFixed(1),
      })),
      topItems: items
        .filter(i => i.total_price)
        .sort((a, b) => (b.total_price || 0) - (a.total_price || 0))
        .slice(0, 5)
        .map(i => ({ description: i.description, value: i.total_price })),
      averageItemValue: summary?.total_value ? (summary.total_value / items.length).toFixed(2) : 0,
    };

    const systemPrompt = `أنت محلل بيانات متخصص في تحليل جداول الكميات (BOQ) للمشاريع الإنشائية.
مهمتك هي تحليل البيانات المقدمة وتقديم رؤى ذكية ومفيدة باللغة العربية.

يجب أن تكون إجاباتك:
1. عملية وقابلة للتنفيذ
2. مركزة على توفير التكاليف وتحسين الكفاءة
3. مبنية على البيانات المقدمة

أعد الإجابة كـ JSON بالتنسيق التالي:
{
  "insights": [
    {
      "title": "عنوان قصير وواضح",
      "description": "وصف تفصيلي للرؤية",
      "type": "info|warning|success",
      "recommendation": "توصية عملية (اختياري)"
    }
  ]
}`;

    const userPrompt = `قم بتحليل بيانات جدول الكميات التالي وأعطني 3-5 رؤى ذكية:

ملخص البيانات:
- إجمالي العناصر: ${dataSummary.totalItems}
- إجمالي القيمة: ${dataSummary.totalValue}
- متوسط قيمة البند: ${dataSummary.averageItemValue}

الفئات:
${dataSummary.categories.map(c => `- ${c.name}: ${c.itemCount} عناصر (${c.percentage}%) - قيمة: ${c.totalValue}`).join('\n')}

أعلى 5 بنود من حيث القيمة:
${dataSummary.topItems.map((item, i) => `${i + 1}. ${item.description}: ${item.value}`).join('\n')}

قدم تحليلات مفيدة حول:
1. توزيع التكاليف والفئات
2. البنود عالية القيمة والاهتمام
3. فرص توفير التكاليف
4. توصيات لتحسين إدارة المشروع`;

    console.log("Calling Gemini for chart analysis...");

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
            insights: getDefaultInsights(dataSummary),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.log("No content in response, using defaults");
      return new Response(
        JSON.stringify({ insights: getDefaultInsights(dataSummary) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Gemini response:", content);

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { insights: getDefaultInsights(dataSummary) };
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-charts:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        insights: [],
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function getDefaultInsights(dataSummary: any) {
  const insights = [];
  
  if (dataSummary.categories.length > 0) {
    const topCategory = dataSummary.categories[0];
    insights.push({
      title: "الفئة الأكبر",
      description: `فئة "${topCategory.name}" تحتوي على ${topCategory.itemCount} عنصر وتمثل ${topCategory.percentage}% من إجمالي العناصر`,
      type: "info",
    });
  }

  if (dataSummary.totalValue > 0) {
    insights.push({
      title: "إجمالي قيمة المشروع",
      description: `القيمة الإجمالية للمشروع ${dataSummary.totalValue.toLocaleString()}`,
      type: "success",
    });
  }

  if (dataSummary.topItems.length > 0) {
    insights.push({
      title: "البنود عالية القيمة",
      description: `أعلى بند من حيث القيمة: ${dataSummary.topItems[0].description}`,
      type: "warning",
      recommendation: "راجع هذه البنود للتأكد من دقة التسعير",
    });
  }

  return insights;
}
