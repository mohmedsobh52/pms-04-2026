import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quotationText, quotationName, supplierName } = await req.json();

    if (!quotationText || quotationText.trim().length < 20) {
      return new Response(
        JSON.stringify({ 
          error: "النص قصير جداً للتحليل",
          suggestion: "يرجى تقديم محتوى عرض السعر للتحليل"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Analyzing quotation:", quotationName, "from:", supplierName);
    console.log("Text length:", quotationText.length);
    console.log("First 500 chars of text:", quotationText.substring(0, 500));
    console.log("Has Arabic:", /[\u0600-\u06FF]/.test(quotationText));
    console.log("Has numbers:", /\d/.test(quotationText));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت محلل متخصص في عروض الأسعار والمشتريات باللغة العربية. 

⚠️ تعليمات هامة جداً:
- استخرج البيانات من النص المقدم فقط - لا تخترع أو تفترض أي بيانات
- إذا لم تجد معلومة، اتركها فارغة أو null
- حافظ على الأرقام والكميات والأسعار كما هي في النص الأصلي
- اقرأ النص العربي بعناية واستخرج جميع البنود الموجودة
- إذا وجدت جداول، استخرج كل صف كبند منفصل

مهمتك:
1. استخراج معلومات المورد (الاسم، العنوان، الهاتف، البريد الإلكتروني)
2. استخراج معلومات العرض (التاريخ، رقم العرض، مدة الصلاحية، شروط الدفع)
3. استخراج جميع البنود والمواد مع:
   - رقم البند (إن وجد)
   - الوصف الكامل
   - الوحدة (م³، م²، كجم، طن، عدد، إلخ)
   - الكمية (رقم فقط)
   - سعر الوحدة (رقم فقط)
   - الإجمالي (الكمية × سعر الوحدة)
4. حساب الإجماليات (المجموع الفرعي، الضريبة، الخصومات، الإجمالي النهائي)
5. استخراج الملاحظات والشروط

⚠️ هام: استخرج البيانات من النص المعطى فقط. لا تضف بيانات من عندك.

أجب بتنسيق JSON فقط بالهيكل التالي:
{
  "supplier": {
    "name": "اسم المورد",
    "address": "العنوان",
    "phone": "رقم الهاتف",
    "email": "البريد الإلكتروني"
  },
  "quotation_info": {
    "number": "رقم العرض",
    "date": "التاريخ",
    "validity": "مدة الصلاحية",
    "payment_terms": "شروط الدفع"
  },
  "items": [
    {
      "item_number": "رقم البند",
      "description": "الوصف",
      "unit": "الوحدة",
      "quantity": 0,
      "unit_price": 0,
      "total": 0
    }
  ],
  "totals": {
    "subtotal": 0,
    "tax": 0,
    "tax_percentage": 0,
    "discount": 0,
    "grand_total": 0
  },
  "notes": ["ملاحظة 1", "ملاحظة 2"],
  "summary": "ملخص موجز للعرض"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `تحليل عرض السعر:

اسم العرض: ${quotationName || 'غير محدد'}
المورد: ${supplierName || 'غير محدد'}

========================
النص المستخرج من عرض السعر:
========================

${quotationText}

========================

يرجى تحليل النص أعلاه بدقة واستخراج جميع البنود والكميات والأسعار الموجودة فيه.
لا تخترع أي بيانات - استخدم فقط ما هو موجود في النص.` 
          }
        ],
        temperature: 0.1,
        max_tokens: 8000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام التحليل" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Try to parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a structured error with the raw content
      analysisResult = {
        raw_response: content,
        parse_error: true,
        supplier: { name: supplierName || "غير محدد" },
        items: [],
        totals: { grand_total: 0 },
        summary: "تعذر تحليل العرض بشكل كامل"
      };
    }

    console.log("Analysis complete:", {
      itemsCount: analysisResult.items?.length || 0,
      grandTotal: analysisResult.totals?.grand_total || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analyzed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-quotation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "حدث خطأ أثناء التحليل",
        suggestion: "يرجى المحاولة مرة أخرى"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
