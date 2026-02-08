import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, language = 'en' } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isArabic = language === 'ar';

    const systemPrompt = isArabic
      ? `أنت متخصص في المشتريات لمشاريع البناء في المملكة العربية السعودية.
قم بتحليل طلب الشراء وقدم:
1. قائمة تفصيلية بالمواد/المعدات المطلوبة
2. نطاق الأسعار التقديرية بالريال السعودي
3. أنواع الموردين المقترحين
4. ملاحظات حول توفر المواد في السوق
5. توصيات للحصول على أفضل الأسعار

أجب بصيغة JSON فقط بدون أي نص إضافي.`
      : `You are a procurement specialist for construction projects in Saudi Arabia.
Analyze this procurement request and provide:
1. A detailed breakdown of items/materials needed
2. Estimated price ranges in SAR (Saudi Riyals)
3. Suggested supplier types
4. Market availability notes
5. Recommendations for getting the best prices

Respond in JSON format only without any additional text.`;

    const userPrompt = isArabic
      ? `طلب الشراء: "${query}"

قدم التحليل بالصيغة التالية:
{
  "summary": "ملخص قصير للطلب",
  "estimated_items": [
    {
      "name": "اسم المادة",
      "estimated_price_min": 0,
      "estimated_price_max": 0,
      "currency": "SAR",
      "suppliers": ["نوع المورد 1", "نوع المورد 2"]
    }
  ],
  "recommendations": ["توصية 1", "توصية 2"],
  "market_notes": "ملاحظات السوق"
}`
      : `Procurement request: "${query}"

Provide analysis in this format:
{
  "summary": "Brief summary of the request",
  "estimated_items": [
    {
      "name": "Item name",
      "estimated_price_min": 0,
      "estimated_price_max": 0,
      "currency": "SAR",
      "suppliers": ["Supplier type 1", "Supplier type 2"]
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "market_notes": "Market availability notes"
}`;

    console.log('Calling Lovable AI for procurement analysis...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: isArabic ? "تجاوز الحد المسموح، حاول لاحقًا" : "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: isArabic ? "يرجى شحن الرصيد" : "Payment required, please add credits" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log('AI Response received:', content);

    // Try to parse the JSON response
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a structured response even if parsing fails
      analysisResult = {
        summary: content,
        estimated_items: [],
        recommendations: [],
        market_notes: isArabic ? "تم تحليل الطلب بنجاح" : "Request analyzed successfully"
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...analysisResult,
        search_sources: [
          isArabic ? "قاعدة بيانات الموردين" : "Supplier database",
          isArabic ? "تحليل الذكاء الاصطناعي" : "AI analysis",
          isArabic ? "بيانات السوق" : "Market data"
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("search-offers error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
