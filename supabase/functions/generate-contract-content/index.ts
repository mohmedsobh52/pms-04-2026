import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const getContractTypeInfo = (type: string, language: string) => {
  const types: Record<string, { en: string; ar: string; details: { en: string; ar: string } }> = {
    fidic_red: {
      en: "FIDIC Red Book (Construction)",
      ar: "فيديك الكتاب الأحمر (البناء)",
      details: {
        en: "Employer-designed works with monthly progress payments based on measured quantities",
        ar: "أعمال مصممة من قبل صاحب العمل مع مستخلصات شهرية بناءً على الكميات المنفذة"
      }
    },
    fidic_yellow: {
      en: "FIDIC Yellow Book (Design-Build)",
      ar: "فيديك الكتاب الأصفر (التصميم والبناء)",
      details: {
        en: "Contractor-designed works with milestone-based payments",
        ar: "أعمال مصممة من قبل المقاول مع دفعات مرتبطة بالمراحل"
      }
    },
    fidic_silver: {
      en: "FIDIC Silver Book (EPC/Turnkey)",
      ar: "فيديك الكتاب الفضي (تسليم مفتاح)",
      details: {
        en: "EPC/Turnkey projects with lump sum pricing and limited variations",
        ar: "مشاريع تسليم مفتاح بمبلغ مقطوع وتغييرات محدودة"
      }
    },
    fidic_green: {
      en: "FIDIC Green Book (Short Form)",
      ar: "فيديك الكتاب الأخضر (النموذج القصير)",
      details: {
        en: "Short form contract for simple or repetitive works",
        ar: "عقد مختصر للأعمال البسيطة أو المتكررة"
      }
    },
    fixed_price: {
      en: "Fixed Price",
      ar: "سعر ثابت",
      details: {
        en: "Fixed lump sum contract with defined scope",
        ar: "عقد بمبلغ مقطوع ثابت مع نطاق محدد"
      }
    },
    cost_plus: {
      en: "Cost Plus",
      ar: "التكلفة زائد",
      details: {
        en: "Reimbursable costs plus agreed fee/percentage",
        ar: "تكاليف قابلة للسداد زائد أتعاب/نسبة متفق عليها"
      }
    },
    unit_price: {
      en: "Unit Price",
      ar: "سعر الوحدة",
      details: {
        en: "Payment based on unit rates for measured quantities",
        ar: "دفع بناءً على أسعار الوحدات للكميات المقاسة"
      }
    },
    lump_sum: {
      en: "Lump Sum",
      ar: "مبلغ مقطوع",
      details: {
        en: "Single fixed amount for complete works",
        ar: "مبلغ ثابت واحد للأعمال الكاملة"
      }
    },
    time_materials: {
      en: "Time & Materials",
      ar: "الوقت والمواد",
      details: {
        en: "Payment based on actual time spent and materials used",
        ar: "دفع بناءً على الوقت الفعلي والمواد المستخدمة"
      }
    }
  };
  return types[type] || types.fixed_price;
};

const getCategoryInfo = (category: string, language: string) => {
  const categories: Record<string, { en: string; ar: string; scope: { en: string; ar: string } }> = {
    first: {
      en: "First Class Contractor",
      ar: "مقاول الفئة الأولى",
      scope: {
        en: "Unlimited project value, full building and infrastructure works",
        ar: "قيمة مشاريع غير محدودة، أعمال بناء وبنية تحتية كاملة"
      }
    },
    second: {
      en: "Second Class Contractor",
      ar: "مقاول الفئة الثانية",
      scope: {
        en: "Medium to large projects with some limitations",
        ar: "مشاريع متوسطة إلى كبيرة مع بعض القيود"
      }
    },
    third: {
      en: "Third Class Contractor",
      ar: "مقاول الفئة الثالثة",
      scope: {
        en: "Small to medium projects",
        ar: "مشاريع صغيرة إلى متوسطة"
      }
    },
    fourth: {
      en: "Fourth Class Contractor",
      ar: "مقاول الفئة الرابعة",
      scope: {
        en: "Small projects with limited scope",
        ar: "مشاريع صغيرة بنطاق محدود"
      }
    },
    fifth: {
      en: "Fifth Class Contractor",
      ar: "مقاول الفئة الخامسة",
      scope: {
        en: "Very small works and maintenance",
        ar: "أعمال صغيرة جداً وصيانة"
      }
    },
    specialist: {
      en: "Specialist Contractor",
      ar: "مقاول متخصص",
      scope: {
        en: "Specialized trade works (MEP, Steel, etc.)",
        ar: "أعمال تخصصية (كهرو ميكانيكية، حديد، إلخ)"
      }
    }
  };
  return categories[category] || categories.first;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { field, contract_type, contract_title, contractor_category, language } = await req.json();

    if (!field || !contract_type || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contractTypeInfo = getContractTypeInfo(contract_type, language);
    const categoryInfo = getCategoryInfo(contractor_category || 'first', language);
    const isArabic = language === 'ar';

    const fieldLabels: Record<string, { en: string; ar: string }> = {
      payment_terms: { en: "Payment Terms", ar: "شروط الدفع" },
      scope_of_work: { en: "Scope of Work", ar: "نطاق العمل" },
      notes: { en: "Additional Notes/Terms & Conditions", ar: "ملاحظات إضافية/الشروط والأحكام" }
    };

    const systemPrompt = `You are a construction contract specialist with expertise in FIDIC contracts, Saudi Arabian construction law, and international best practices.

Generate professional ${fieldLabels[field]?.[language] || field} content for a construction contract.

Contract Details:
- Type: ${isArabic ? contractTypeInfo.ar : contractTypeInfo.en}
- Type Description: ${isArabic ? contractTypeInfo.details.ar : contractTypeInfo.details.en}
- Title: ${contract_title || 'Construction Contract'}
- Contractor Category: ${isArabic ? categoryInfo.ar : categoryInfo.en}
- Contractor Scope: ${isArabic ? categoryInfo.scope.ar : categoryInfo.scope.en}

Requirements:
1. Output ONLY in ${isArabic ? 'Arabic' : 'English'}
2. Be professional and legally appropriate
3. Tailor content to the specific contract type (FIDIC clauses if applicable)
4. Consider the contractor category requirements
5. Keep content concise but comprehensive
6. Use bullet points or numbered lists where appropriate

${field === 'payment_terms' ? `
For Payment Terms, include:
- Payment schedule (monthly/milestone-based as per contract type)
- Payment period after certification
- Advance payment terms if applicable
- Retention and release conditions
- Currency and method of payment
` : ''}

${field === 'scope_of_work' ? `
For Scope of Work, include:
- General description of works
- Main activities and deliverables
- Quality requirements
- Testing and commissioning
- Documentation requirements
- Exclusions if any
` : ''}

${field === 'notes' ? `
For Additional Notes/Terms, include:
- Insurance requirements
- Safety and compliance requirements  
- Dispute resolution mechanism
- Warranty period
- Variation order procedures
- Any special conditions
` : ''}

Generate the content directly without any introduction or explanation.`;

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
          { role: "user", content: `Generate ${fieldLabels[field]?.[language] || field} for this ${isArabic ? contractTypeInfo.ar : contractTypeInfo.en} contract titled "${contract_title || 'Construction Contract'}".` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: isArabic ? "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" : "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: isArabic ? "يرجى إضافة رصيد للحساب" : "Payment required, please add credits" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("Generated content for", field, "length:", content.length);

    return new Response(
      JSON.stringify({ 
        content: content.trim(),
        field,
        contract_type,
        language
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("generate-contract-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
