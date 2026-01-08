import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'No PDF data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF BOQ extraction for file: ${fileName}`);

    const systemPrompt = `أنت خبير في استخراج بيانات الجداول من مستندات PDF بدقة تامة.

مهمتك الأساسية:
1. استخرج جميع البيانات من الجدول كما هي بالضبط - بدون أي تعديل أو تفسير
2. حافظ على جميع أعمدة الجدول الأصلية كما هي في المستند
3. استخدم أسماء الأعمدة العربية الأصلية من المستند

قواعد صارمة جداً:
- استخرج البيانات بالضبط كما تظهر في المستند - لا تغير أي قيمة
- استخدم أسماء الأعمدة الأصلية من الجدول (مثل: م، البيان، الوحدة، الكمية، السعر، الإجمالي)
- لا تحسب أي قيم - استخرج فقط ما هو مكتوب
- لا تضف أو تحذف أي أعمدة
- حافظ على ترتيب الأعمدة كما في المستند الأصلي

أعد الاستجابة بهذا التنسيق:
{
  "headers": ["اسم العمود الأول", "اسم العمود الثاني", ...],
  "items": [
    {"اسم العمود الأول": "القيمة1", "اسم العمود الثاني": "القيمة2", ...}
  ],
  "total_items": 10
}`;

    const userPrompt = `هذا ملف PDF. استخرج جميع بيانات الجدول كما هي بالضبط.
اسم الملف: ${fileName}

مهم جداً:
- استخدم أسماء الأعمدة الأصلية من الجدول
- انسخ القيم بالضبط كما تظهر بدون تعديل
- أرجع headers بأسماء الأعمدة الأصلية

البيانات:
${pdfBase64.substring(0, 50000)}

أعد النتائج بتنسيق JSON فقط.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8192,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later', success: false, items: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted', success: false, items: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response received, length:', content.length);
    console.log('AI Response preview:', content.substring(0, 500));

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        console.log('No JSON found, trying to extract from response');
        result = { items: [], total_items: 0 };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', content);
      result = { items: [], total_items: 0 };
    }

    const items = result.items || [];
    const headers = result.headers || [];
    console.log(`Extracted ${items.length} items with ${headers.length} columns`);

    return new Response(
      JSON.stringify({
        success: true,
        items: items,
        headers: headers,
        total_items: items.length,
        currency: result.currency || 'SAR',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF BOQ extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
        items: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
