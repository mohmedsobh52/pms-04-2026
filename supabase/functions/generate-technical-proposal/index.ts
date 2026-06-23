import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface Body {
  title?: string;
  client_name?: string;
  project_scope?: string;
  duration_months?: number;
  budget?: number;
  currency?: string;
  language?: 'ar' | 'en';
  sections?: string[];
  extra_context?: string;
  boq_summary?: string;
  model?: string;
}

const SECTION_LABELS_AR: Record<string, string> = {
  cover: 'صفحة الغلاف ونبذة تنفيذية',
  introduction: 'المقدمة وفهم المشروع',
  scope: 'نطاق الأعمال',
  methodology: 'منهجية التنفيذ',
  timeline: 'الجدول الزمني والمراحل',
  team: 'فريق العمل والكوادر',
  quality: 'إدارة الجودة',
  hse: 'الصحة والسلامة والبيئة (HSE)',
  risk: 'إدارة المخاطر',
  resources: 'الموارد والمعدات',
  procurement: 'خطة المشتريات (المواد طويلة التوريد، المورّدين، الجدولة)',
  subcontracting: 'خطة المقاولين من الباطن — معايير الاختيار، التأهيل، نطاقات الإسناد، الإشراف',
  mobilization: 'خطة التعبئة والتجهيز للموقع — المكاتب، المخازن، المرافق المؤقتة، جدول التعبئة',
  communication: 'خطة الاتصال (Communication Plan) — قنوات التواصل، تكرار الاجتماعات، مصفوفة RACI، التقارير، إدارة الوثائق',
  stakeholders: 'خطة إدارة أصحاب المصلحة (Stakeholder Plan) — الأطراف، تحليل التأثير/الاهتمام، استراتيجيات الإشراك',
  change: 'إدارة التغيير والمطالبات — إجراءات أوامر التغيير، التسعير، التوثيق، إدارة المطالبات',
  sustainability: 'الاستدامة والبيئة — تقليل البصمة الكربونية، إدارة النفايات، الالتزام بـ LEED/Estidama إن وُجد',
  bim: 'الحلول الرقمية و BIM — مستوى التطوير (LOD)، التنسيق، اكتشاف التعارضات، أدوات الإدارة الرقمية',
  training: 'التدريب ونقل المعرفة — تدريب فريق العميل، أدلة التشغيل، فترة الدعم بعد التسليم',
  pricing: 'الملخص المالي والتسعير',
  warranty: 'الضمانات وما بعد التسليم',
  references: 'الخبرات والمشاريع المرجعية',
  compliance: 'الامتثال والاشتراطات النظامية — الأكواد السعودية/المحلية، شهادات الجودة (ISO)، اشتراطات الجهات الحكومية',
  assumptions: 'الافتراضات والاستثناءات — قائمة واضحة بما تم استبعاده من نطاق العمل والافتراضات المبنية عليها العرض',
};
const SECTION_LABELS_EN: Record<string, string> = {
  cover: 'Cover & Executive Summary',
  introduction: 'Introduction & Project Understanding',
  scope: 'Scope of Work',
  methodology: 'Execution Methodology',
  timeline: 'Schedule & Milestones',
  team: 'Project Team & Key Personnel',
  quality: 'Quality Management',
  hse: 'Health, Safety & Environment (HSE)',
  risk: 'Risk Management',
  resources: 'Resources & Equipment',
  procurement: 'Procurement Plan',
  communication: 'Communication Plan — channels, meeting cadence, RACI matrix, reporting, document control',
  stakeholders: 'Stakeholder Management Plan — identification, power/interest analysis, engagement strategies, expectations',
  pricing: 'Financial Summary & Pricing',
  warranty: 'Warranty & After-Handover Support',
  references: 'Experience & Reference Projects',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const b = (await req.json()) as Body;
    const lang = b.language === 'en' ? 'en' : 'ar';
    const isAr = lang === 'ar';
    const labels = isAr ? SECTION_LABELS_AR : SECTION_LABELS_EN;
    const sections = (b.sections && b.sections.length ? b.sections : Object.keys(labels))
      .filter((s) => labels[s]);

    const sysAr = `أنت استشاري أول في إعداد العروض الفنية للمشاريع الإنشائية والبنية التحتية. تكتب عروضاً فنية احترافية باللغة العربية الفصحى بأسلوب رسمي مناسب لتقديمها للجهات الحكومية والشركات الكبرى. اتبع المعايير الدولية (FIDIC, PMI) واستخدم تنسيق Markdown مع عناوين واضحة وقوائم وجداول عند الحاجة.`;
    const sysEn = `You are a senior consultant preparing technical proposals for construction and infrastructure projects. Write a professional, formal English proposal suitable for government tenders and large enterprises. Follow international standards (FIDIC, PMI) and use Markdown with clear headings, lists, and tables where useful.`;

    const sectionList = sections.map((s, i) => `${i + 1}. ${labels[s]}`).join('\n');

    const userPrompt = isAr
      ? `أنشئ عرضاً فنياً متكاملاً بصيغة Markdown يتضمن الأقسام التالية بالترتيب:
${sectionList}

# بيانات المشروع
- العنوان: ${b.title || 'غير محدد'}
- العميل / الجهة: ${b.client_name || 'غير محدد'}
- نطاق المشروع: ${b.project_scope || 'غير محدد'}
- المدة المقترحة: ${b.duration_months ? b.duration_months + ' شهر' : 'غير محدد'}
- الميزانية التقديرية: ${b.budget ? b.budget.toLocaleString('en-US') + ' ' + (b.currency || 'SAR') : 'غير محدد'}
${b.boq_summary ? `\n# ملخص جدول الكميات\n${b.boq_summary}` : ''}
${b.extra_context ? `\n# سياق إضافي\n${b.extra_context}` : ''}

تعليمات:
- ابدأ كل قسم بعنوان من المستوى الثاني (##).
- اكتب محتوى تفصيلياً وعملياً لكل قسم (لا تكتفِ بعناوين فرعية).
- استخدم جداول Markdown للجدول الزمني وفريق العمل والمخاطر.
- اجعل اللغة احترافية وخالية من الحشو.
- لا تضف مقدمات أو ملاحظات خارج المستند.`
      : `Produce a complete technical proposal in Markdown including the following sections in order:
${sectionList}

# Project Data
- Title: ${b.title || 'N/A'}
- Client: ${b.client_name || 'N/A'}
- Scope: ${b.project_scope || 'N/A'}
- Duration: ${b.duration_months ? b.duration_months + ' months' : 'N/A'}
- Budget: ${b.budget ? b.budget.toLocaleString('en-US') + ' ' + (b.currency || 'SAR') : 'N/A'}
${b.boq_summary ? `\n# BOQ Summary\n${b.boq_summary}` : ''}
${b.extra_context ? `\n# Extra Context\n${b.extra_context}` : ''}

Instructions:
- Start every section with a level-2 heading (##).
- Provide concrete, detailed content per section (not just sub-headings).
- Use Markdown tables for schedule, team, and risks.
- Keep language professional and concise.
- Output only the proposal — no preamble.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: b.model || 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: isAr ? sysAr : sysEn },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: isAr ? 'تم تجاوز الحد المسموح، حاول لاحقاً' : 'Rate limit exceeded, try again later' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: isAr ? 'الرصيد غير كافٍ. الرجاء إضافة رصيد في Lovable AI' : 'Insufficient credits. Please add credits in Lovable AI' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content, model: b.model || 'google/gemini-2.5-pro' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
