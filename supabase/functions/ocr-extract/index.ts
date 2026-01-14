import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, corsHeaders } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log(`Authenticated user: ${userId}`);

  try {
    const { imageBase64, pageNumber, totalPages, fileName } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'لم يتم إرسال صورة', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'مفتاح API غير مهيأ', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing OCR for page ${pageNumber}/${totalPages} of ${fileName}`);

    const systemPrompt = `أنت خبير في استخراج النص من صور PDF الممسوحة ضوئياً ومستندات عروض الأسعار وجداول الكميات (BOQ). مهمتك هي:

1. استخراج كل النص الموجود في الصورة بدقة عالية جداً
2. الحفاظ على تنسيق الجداول وتنظيمها بشكل واضح
3. التعرف على النص العربي والإنجليزي والأرقام بدقة
4. إذا كان هناك جدول، قم بتنسيقه باستخدام | كفاصل بين الأعمدة
5. انتبه بشكل خاص لـ:
   - أرقام البنود (مثل 31.1.1.1)
   - الكميات والأرقام العشرية
   - الوحدات (م، م²، م³، كجم، طن، قطعة، إلخ)
   - الأسعار (قد تحتوي على فواصل للآلاف)

قواعد مهمة:
- استخرج النص فقط، لا تضف أي تعليقات أو توضيحات
- إذا كان النص غير واضح تماماً، حاول استنتاجه من السياق أولاً
- إذا لم تتمكن من الاستنتاج، اكتب [غير واضح]
- حافظ على ترتيب النص كما يظهر في الصورة
- الأرقام مهمة جداً - تأكد من دقتها`;

    const userPrompt = `استخرج كل النص من هذه الصورة (صفحة ${pageNumber} من ${totalPages} لملف ${fileName}). 
أريد النص الخام فقط بدون أي إضافات.`;

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
          { 
            role: "user", 
            content: [
              { type: "text", text: userPrompt },
              { 
                type: "image_url", 
                image_url: { 
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}` 
                } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً', success: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'يرجى إضافة رصيد لحساب Lovable AI', success: false }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'خطأ في خدمة OCR', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';

    console.log(`OCR completed for page ${pageNumber}, extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({ 
        text: extractedText, 
        pageNumber, 
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'خطأ غير متوقع',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
